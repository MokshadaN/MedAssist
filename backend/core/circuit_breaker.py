"""
Circuit breaker instances for external AI service calls.

Uses the 'circuitbreaker' library which implements the classic
three-state pattern: CLOSED → OPEN → HALF-OPEN → CLOSED.

States:
  CLOSED    — Normal operation; calls pass through.
  OPEN      — Failure threshold exceeded; calls immediately raise
               CircuitBreakerError without hitting the external API.
  HALF-OPEN — Recovery window; one probe call is allowed. If it
               succeeds, the breaker resets to CLOSED. If it fails,
               it returns to OPEN.

Usage:
  from core.circuit_breaker import gemini_breaker, groq_breaker

  @gemini_breaker
  def my_gemini_call():
      ...

  # Or check state before calling:
  if gemini_breaker.closed:
      result = my_gemini_call()
"""

import logging
from circuitbreaker import CircuitBreaker, CircuitBreakerError  # noqa: F401 (re-export)

logger = logging.getLogger(__name__)


def _on_open(cb: CircuitBreaker) -> None:
    logger.error(
        "Circuit breaker OPENED: %s — failing fast for %ds. "
        "External service appears to be down.",
        cb.name,
        cb.recovery_timeout,
    )


def _on_close(cb: CircuitBreaker) -> None:
    logger.info("Circuit breaker CLOSED: %s — service recovered.", cb.name)


def _on_half_open(cb: CircuitBreaker) -> None:
    logger.warning("Circuit breaker HALF-OPEN: %s — probing recovery.", cb.name)


# ── Gemini (Google) Circuit Breaker ───────────────────────────────────────────
# NOTE: ai_service.py creates one breaker PER API KEY (see
# services/ai_service.py::_breaker_for_key) so an exhausted key does not
# block healthy keys. This shared instance is kept for backward compatibility.
gemini_breaker = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=60,
    name="Gemini",
    expected_exception=Exception,
)

# ── Groq Circuit Breaker ──────────────────────────────────────────────────────
# Faster recovery for triage (critical path — falls back to regex anyway)
groq_breaker = CircuitBreaker(
    failure_threshold=3,
    recovery_timeout=30,
    name="Groq",
    expected_exception=Exception,
)

# ── Groq Speech-to-Text Circuit Breaker ───────────────────────────────────────
# SEPARATE from groq_breaker: malformed/empty user recordings are common and
# must never trip the breaker protecting triage + the AI provider fallback.
groq_stt_breaker = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=60,
    name="Groq-STT",
    expected_exception=Exception,
)

# ── HuggingFace (PubMedBERT) Circuit Breaker ──────────────────────────────────
# Lower threshold — risk engine degrades gracefully (returns empty issues list)
hf_breaker = CircuitBreaker(
    failure_threshold=3,
    recovery_timeout=120,
    name="HuggingFace",
    expected_exception=Exception,
)
