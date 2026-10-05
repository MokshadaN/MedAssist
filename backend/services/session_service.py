"""Session service."""

from typing import Any

from models.session import ChatSession
from models.ai_summary import AISummary
from models.message import ChatMessage
from services.ai_service import (
    compare_with_previous_visit,
    extract_and_summarize,
    find_missing_fields,
    generate_combined_followup,
)
from services.message_service import create_message
from services.triage_service import detect_urgent_red_flags
from services import soap_classifier


INTAKE_QUESTIONS = [
    "What symptoms are you experiencing, and when did they start?",
    "What makes it worse, and is there anything that helps relieve it?",
]

MAX_FOLLOW_UP_QUESTIONS = 2


def create_session(db, patient_id: str):
    new_session = ChatSession(
        patient_id=patient_id,
        status="active"
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return new_session


def start_intake_session(db, patient_id: str) -> tuple[ChatSession, str]:
    session = create_session(db, patient_id)
    first_question = INTAKE_QUESTIONS[0]
    create_message(db, session.id, first_question, "ai")
    return session, first_question


def get_session(db, session_id: str) -> ChatSession | None:
    return db.query(ChatSession).filter(ChatSession.id == session_id).first()


def get_session_messages(db, session_id: str) -> list[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp.asc())
        .all()
    )


def build_transcript(messages: list[ChatMessage]) -> str:
    lines: list[str] = []

    pending_question: str | None = None
    for msg in messages:
        if msg.sender == "ai":
            pending_question = msg.message
        elif msg.sender == "patient":
            question = pending_question or "Patient intake response"
            lines.append(f"Q: {question}\nA: {msg.message}")
            pending_question = None

    return "\n\n".join(lines)


def build_patient_triage_text(messages: list[ChatMessage]) -> str:
    """Return only patient-authored text for safety-critical triage."""
    return "\n".join(
        msg.message
        for msg in messages
        if msg.sender == "patient"
    )


def _patient_answer_count(messages: list[ChatMessage]) -> int:
    return sum(1 for msg in messages if msg.sender == "patient")


def _parse_soap_summary(summary: str) -> dict[str, str]:
    sections = {
        "subjective": "",
        "objective": "",
        "assessment": "",
        "plan": "",
    }
    section_markers = {
        "SUBJECTIVE": "subjective",
        "OBJECTIVE": "objective",
        "ASSESSMENT": "assessment",
        "PLAN": "plan",
    }

    active_key: str | None = None
    for raw_line in summary.splitlines():
        line = raw_line.strip()
        upper_line = line.upper()
        matched_header = False
        for marker, key in section_markers.items():
            if upper_line.startswith(marker):
                remainder = line[len(marker):].lstrip(" :).-")
                active_key = key
                sections[active_key] = remainder.strip()
                matched_header = True
                break
        else:
            if line[:1].upper() in {"S", "O", "A", "P"} and line[1:2] in {":", ")", "."}:
                active_key = {
                    "S": "subjective",
                    "O": "objective",
                    "A": "assessment",
                    "P": "plan",
                }[line[:1].upper()]
                sections[active_key] = line[2:].lstrip(" :).-").strip()
                matched_header = True
        if matched_header:
            continue

        if active_key and line:
            sections[active_key] = f"{sections[active_key]}\n{line}".strip()

    if not any(sections.values()):
        sections["subjective"] = summary

    return sections


def save_ai_summary(db, session_id: str, clinical_summary: str) -> AISummary:
    soap = _parse_soap_summary(clinical_summary)
    summary = AISummary(
        session_id=session_id,
        subjective=soap["subjective"],
        objective=soap["objective"],
        assessment=soap["assessment"],
        plan=soap["plan"],
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary


def _classify_and_store(db, message_obj: ChatMessage) -> dict:
    """Run PubMedBERT classifier on a patient message and persist the label.

    Always returns a classification dict — errors are caught so intake is
    never interrupted by a classifier failure.
    """
    try:
        result = soap_classifier.classify_soap(message_obj.message)
        message_obj.soap_label = result["label"]
        message_obj.soap_confidence = result["confidence"]
        db.commit()
        return result
    except Exception:  # noqa: BLE001
        return {"label": "Unavailable", "label_id": -1, "confidence": 0.0, "available": False}


def process_intake_answer(
    db,
    session: ChatSession,
    message: str,
    input_mode: str,
    previous_structured: dict[str, Any] | None = None,
) -> dict[str, Any]:
    patient_msg = create_message(db, session.id, message, "patient")
    soap_result = _classify_and_store(db, patient_msg)
    messages = get_session_messages(db, session.id)
    transcript = build_transcript(messages)
    patient_triage_text = build_patient_triage_text(messages)
    patient_answer_count = _patient_answer_count(messages)

    triage_result = detect_urgent_red_flags(
        patient_triage_text,
        session.patient_id,
        db,
    )
    if triage_result["urgent"]:
        session.status = "urgent"
        db.commit()
        reply = "Immediate medical evaluation recommended."
        create_message(db, session.id, reply, "ai")
        return {
            "session_id": session.id,
            "status": "urgent",
            "message": reply,
            "input_mode": input_mode,
            "matched_terms": triage_result["matched_terms"],
            "nearest_hospitals": triage_result.get("nearest_hospitals", []),
            "emergency_message": triage_result.get("emergency_message"),
            "triage_level": "emergency",
            "review_required": False,
            "soap_classification": soap_result,
        }

    # 24-hour tier: not life-threatening, but worth telling the patient to
    # see a doctor soon. The intake CONTINUES — only the emergency level
    # above stops it.
    advisory = None
    if triage_result.get("level") == "urgent_care":
        advisory = (
            "Your symptoms suggest you should see a doctor within 24 hours — "
            "this is not a medical emergency. Your intake continues below."
        )
    elif triage_result.get("level") == "abstain":
        advisory = (
            "We could not determine urgency automatically. Please seek review "
            "from a qualified healthcare professional. If symptoms are severe, "
            "worsening, or feel life-threatening, contact emergency services now."
        )

    if advisory and not any(
        msg.sender == "ai" and msg.message == advisory
        for msg in messages
    ):
        create_message(db, session.id, advisory, "ai")

    if patient_answer_count < len(INTAKE_QUESTIONS):
        next_question = INTAKE_QUESTIONS[patient_answer_count]
        create_message(db, session.id, next_question, "ai")
        return {
            "session_id": session.id,
            "status": "questionnaire_in_progress",
            "message": "Answer recorded.",
            "input_mode": input_mode,
            "next_question": next_question,
            "advisory": advisory,
            "triage_level": triage_result.get("level"),
            "review_required": bool(triage_result.get("review_required")),
            "soap_classification": soap_result,
        }

    result = extract_and_summarize(transcript)
    data = result.structured_data
    missing = find_missing_fields(data)
    follow_up_count = max(patient_answer_count - len(INTAKE_QUESTIONS), 0)

    if missing and follow_up_count < MAX_FOLLOW_UP_QUESTIONS:
        followup_q = generate_combined_followup(missing, transcript, data)
        create_message(db, session.id, followup_q, "ai")
        return {
            "session_id": session.id,
            "status": "needs_clarification",
            "message": "More intake detail is needed.",
            "input_mode": input_mode,
            "next_question": followup_q,
            "missing_fields": missing,
            "advisory": advisory,
            "triage_level": triage_result.get("level"),
            "review_required": bool(triage_result.get("review_required")),
            "soap_classification": soap_result,
        }

    structured_data = data.model_dump()
    comparison = compare_with_previous_visit(structured_data, previous_structured)
    summary = save_ai_summary(db, session.id, result.clinical_summary)
    session.status = "complete"
    db.commit()

    final_message = (
        f"{result.clinical_summary}\n\n"
        f"Previous visit comparison: {comparison['summary']}"
    )
    create_message(db, session.id, final_message, "ai")

    return {
        "session_id": session.id,
        "status": "complete",
        "message": "Intake complete.",
        "input_mode": input_mode,
        "clinical_summary": result.clinical_summary,
        "structured_data": structured_data,
        "comparison": comparison,
        "summary_id": summary.id,
        "missing_fields": missing,
        "advisory": advisory,
        "triage_level": triage_result.get("level"),
        "review_required": bool(triage_result.get("review_required")),
        "soap_classification": soap_result,
    }
