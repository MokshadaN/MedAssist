"""AI endpoints.

P0: all routes require authentication. SOAP generation and reads are scoped
to a stored session, so callers cannot submit or retrieve another patient's
PHI without ownership or an explicit care relationship.

/ai/transcribe: backend speech-to-text (Groq Whisper). Audio never touches
disk; it is streamed to the provider from memory and discarded.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, require_roles
from core.limiter import limiter
from models.ai_summary import AISummary
from models.session import ChatSession
from schemas.ai import AISummaryOut, GenerateSummaryOut
from services.access_control import require_session_access
from services.ai_service import analyze_patient_transcript
from services.message_service import get_messages
from services.session_service import build_transcript
from services.voice_service import ALLOWED_AUDIO_TYPES, MAX_AUDIO_BYTES, transcribe_audio

router = APIRouter()


class AIRequest(BaseModel):
    session_id: str


class TranscriptionOut(BaseModel):
    text: str


@router.post("/generate-summary", response_model=GenerateSummaryOut)
@limiter.limit("10/hour")
def generate_summary(
    request: Request,
    req: AIRequest,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(ChatSession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    require_session_access(db, current_user, session)
    transcript = build_transcript(get_messages(db, session.id))
    if not transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The session does not contain enough intake data to summarize",
        )
    return analyze_patient_transcript(transcript)


@router.post("/transcribe", response_model=TranscriptionOut)
@limiter.limit("10/minute")
async def transcribe(
    request: Request,
    file: UploadFile,
    current_user=Depends(get_current_user),
):
    """
    Transcribe a voice recording with Groq Whisper (browser MediaRecorder
    audio). Returns the text so the frontend can drop it into the intake
    input box. Patients speak PHI here — audio is processed in memory and
    never persisted.
    """
    # Validate at the boundary — reject bad types before reading the body,
    # independently of the service layer (defense in depth).
    if (file.content_type or "").lower() not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio type: {file.content_type or 'unknown'}",
        )

    data = await file.read()
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file too large (15 MB limit)",
        )

    try:
        text = transcribe_audio(data, file.content_type or "")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No speech detected in the recording — please try again",
        )

    return TranscriptionOut(text=text)


@router.get("/summary/{session_id}", response_model=AISummaryOut)
def get_summary(
    session_id: str,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Owner patient, or a doctor with an active care relationship.
    require_session_access(db, current_user, session)

    summary = (
        db.query(AISummary)
        .filter(AISummary.session_id == session_id)
        .order_by(AISummary.created_at.desc())
        .first()
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOAP summary not found for this session",
        )

    return summary