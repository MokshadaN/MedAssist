"""Speech-to-text service — Groq Whisper (free tier).

Voice intake records audio in the browser (MediaRecorder) and sends it here
for transcription. Using the backend instead of the browser Web Speech API
means it works in Firefox too, and Whisper is markedly more accurate for
medical/accented speech than Chrome's built-in recognizer.

Shares GROQ_API_KEY with the triage service and the AI provider fallback;
each failure domain is isolated by its own circuit breaker state so a bad
audio file cannot trip the LLM path.
"""

import logging
import os

from dotenv import load_dotenv
from groq import Groq
from pathlib import Path

from core.circuit_breaker import groq_stt_breaker, CircuitBreakerError

# Reliably load .env from the backend directory.
BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

logger = logging.getLogger(__name__)

# whisper-large-v3-turbo: near-identical accuracy to whisper-large-v3,
# roughly 2x faster — cheaper on the free-tier token budget.
STT_MODEL = os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo")

# Keep uploads small — Whisper is fast, and this caps request memory.
MAX_AUDIO_BYTES = 15 * 1024 * 1024  # 15 MB

# MIME types MediaRecorder may emit across Chrome/Firefox/Edge.
ALLOWED_AUDIO_TYPES = {
    "audio/webm": ".webm",
    "audio/webm;codecs=opus": ".webm",
    "audio/ogg": ".ogg",
    "audio/ogg;codecs=opus": ".ogg",
    "audio/mp4": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-m4a": ".m4a",
    "audio/x-wav": ".wav",
    "": ".webm",  # MediaRecorder sometimes reports an empty type
}


def transcribe_audio(data: bytes, mime_type: str) -> str:
    """
    Transcribe in-memory audio bytes via Groq Whisper.

    Raises RuntimeError with a user-safe message when the provider is
    unavailable (no key / breaker open / upstream error) — callers map
    that to a 503 so the frontend can tell the user to type instead.
    """
    if len(data) > MAX_AUDIO_BYTES:
        raise ValueError("Audio file too large (15 MB limit)")
    if len(data) == 0:
        raise ValueError("Empty audio recording")

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Voice transcription is not configured (GROQ_API_KEY missing)")
    if groq_stt_breaker.opened:
        logger.warning("Groq STT circuit breaker OPEN — voice transcription unavailable.")
        raise RuntimeError("Voice transcription is temporarily unavailable — please type your answer")

    extension = ALLOWED_AUDIO_TYPES.get((mime_type or "").lower())
    if extension is None:
        raise ValueError(f"Unsupported audio type: {mime_type or 'unknown'}")

    client = Groq(api_key=api_key)

    try:
        @groq_stt_breaker
        def _call():
            return client.audio.transcriptions.create(
                model=STT_MODEL,
                # (filename, bytes, content-type) tuple — Groq accepts
                # in-memory files without touching disk.
                file=(f"speech{extension}", data, mime_type or "audio/webm"),
                response_format="json",
                temperature=0.0,
            )

        result = _call()
        return (result.text or "").strip()

    except CircuitBreakerError:
        logger.error("Groq circuit breaker OPEN — voice transcription failed.")
        raise RuntimeError("Voice transcription is temporarily unavailable — please type your answer")
    except RuntimeError:
        raise
    except Exception as exc:
        logger.warning("Groq Whisper transcription error: %s", exc)
        raise RuntimeError("Voice transcription failed — please type your answer")