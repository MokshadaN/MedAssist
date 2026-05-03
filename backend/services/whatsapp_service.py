"""WhatsApp service for sending medicine reminders via Twilio."""

import logging
import re

from core.config import settings

logger = logging.getLogger(__name__)

# Lazy-loaded Twilio client
_twilio_client = None


def _get_twilio_client():
    """Get or create the Twilio client. Returns None if not configured."""
    global _twilio_client
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        return None
    if _twilio_client is None:
        try:
            from twilio.rest import Client
            _twilio_client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        except Exception as exc:
            logger.warning("Could not initialise Twilio client: %s", exc)
            return None
    return _twilio_client


def normalize_phone(phone: str | None) -> str | None:
    """Normalize a phone number to Indian E.164 format (+91...).

    Handles: 9876543210, 09876543210, +919876543210, 919876543210
    """
    if not phone:
        return None
    digits = re.sub(r"[^0-9]", "", phone)
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 11 and digits.startswith("0"):
        return f"+91{digits[1:]}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    if len(digits) == 13 and digits.startswith("91"):
        return f"+{digits}"
    # Fallback: return as-is with + prefix
    if not phone.startswith("+"):
        return f"+{digits}"
    return phone


def _build_reminder_message(medicine_name: str, dosage: str | None, time_label: str) -> str:
    """Build a friendly WhatsApp reminder message."""
    parts = [f"💊 *MedAssist Medicine Reminder*\n"]
    parts.append(f"It's time to take your medicine!\n")
    parts.append(f"*Medicine:* {medicine_name}")
    if dosage:
        parts.append(f"*Dosage:* {dosage}")
    parts.append(f"*Scheduled:* {time_label}")
    parts.append(f"\nStay healthy! 🩺 — MedAssist")
    return "\n".join(parts)


def send_whatsapp_reminder(
    phone: str,
    medicine_name: str,
    dosage: str | None = None,
    time_label: str = "",
) -> str:
    """Send a WhatsApp medicine reminder.

    Returns: 'sent', 'simulated', or 'failed'.
    """
    normalized = normalize_phone(phone)
    if not normalized:
        logger.warning("Cannot send WhatsApp: no valid phone number")
        return "failed"

    body = _build_reminder_message(medicine_name, dosage, time_label)
    client = _get_twilio_client()

    if client and settings.twilio_whatsapp_from:
        try:
            message = client.messages.create(
                from_=settings.twilio_whatsapp_from,
                to=f"whatsapp:{normalized}",
                body=body,
            )
            logger.info(
                "WhatsApp sent to %s for %s (SID: %s)",
                normalized, medicine_name, message.sid,
            )
            return "sent"
        except Exception as exc:
            logger.error("Twilio WhatsApp failed for %s: %s", normalized, exc)
            return "failed"
    else:
        # Simulation mode — log the message
        logger.info(
            "[SIMULATED WhatsApp] To: %s\n%s",
            normalized, body,
        )
        return "simulated"
