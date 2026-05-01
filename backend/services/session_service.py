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
        "S": "subjective",
        "O": "objective",
        "A": "assessment",
        "P": "plan",
    }

    active_key: str | None = None
    for raw_line in summary.splitlines():
        line = raw_line.strip()
        marker = line[:1].upper()
        if marker in section_markers and (
            line[1:2] in {":", ")", "."} or line.upper().startswith(f"{marker} (")
        ):
            active_key = section_markers[marker]
            separator = ":" if ":" in line else line[1:2]
            sections[active_key] = line.split(separator, 1)[1].strip()
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


def process_intake_answer(
    db,
    session: ChatSession,
    message: str,
    input_mode: str,
    previous_structured: dict[str, Any] | None = None,
) -> dict[str, Any]:
    create_message(db, session.id, message, "patient")
    messages = get_session_messages(db, session.id)
    transcript = build_transcript(messages)
    patient_answer_count = _patient_answer_count(messages)

    triage_result = detect_urgent_red_flags(transcript, session.patient_id, db)
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
        }

    if patient_answer_count < len(INTAKE_QUESTIONS):
        next_question = INTAKE_QUESTIONS[patient_answer_count]
        create_message(db, session.id, next_question, "ai")
        return {
            "session_id": session.id,
            "status": "questionnaire_in_progress",
            "message": "Answer recorded.",
            "input_mode": input_mode,
            "next_question": next_question,
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
    }
