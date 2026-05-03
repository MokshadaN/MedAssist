"""Schedule service for managing recurring medicine reminders."""

import json
import logging
import re
from datetime import date, datetime, timedelta
from typing import List

from sqlalchemy.orm import Session

from models.medicine_schedule import MedicineSchedule
from models.sent_reminder import SentReminder
from models.user import User
from services.whatsapp_service import send_whatsapp_reminder

from models.reminder import Reminder
from services.email_service import send_followup_email

logger = logging.getLogger(__name__)

# Default reminder times based on frequency
REMINDER_TIMES = {
    1: ["09:00"],
    2: ["14:00", "20:00"],
    3: ["08:00", "14:00", "20:00"],
}


def _parse_frequency(frequency: str) -> int:
    """Parse frequency string to number of times per day.

    Handles: '1 time/day', '2 times/day', '3 times/day', 'once', 'twice', 'thrice'
    """
    freq_lower = frequency.lower().strip()
    if "once" in freq_lower or "1 time" in freq_lower:
        return 1
    if "twice" in freq_lower or "2 time" in freq_lower:
        return 2
    if "thrice" in freq_lower or "3 time" in freq_lower:
        return 3
    # Try to extract a number
    match = re.search(r"(\d+)", freq_lower)
    if match:
        return min(int(match.group(1)), 3)
    return 1


def _parse_duration(duration: str) -> int:
    """Parse duration string to number of days.

    Handles: '7 days', '2 weeks', '1 month', '14', 'week', etc.
    """
    dur_lower = duration.lower().strip()

    match = re.search(r"(\d+)\s*(day|week|month)", dur_lower)
    if match:
        num = int(match.group(1))
        unit = match.group(2)
        if "week" in unit:
            return num * 7
        if "month" in unit:
            return num * 30
        return num

    # Just a number — assume days
    match = re.search(r"(\d+)", dur_lower)
    if match:
        return int(match.group(1))

    # Keyword fallback
    if "week" in dur_lower:
        return 7
    if "month" in dur_lower:
        return 30

    return 7  # default 7 days


def create_medicine_schedule(
    db: Session,
    prescription_item_id: str,
    patient_id: str,
    patient_phone: str | None,
    medicine_name: str,
    dosage: str | None,
    frequency: str,
    duration: str,
) -> MedicineSchedule:
    """Create a recurring medicine reminder schedule."""
    times_per_day = _parse_frequency(frequency)
    days = _parse_duration(duration)
    reminder_times = REMINDER_TIMES.get(times_per_day, REMINDER_TIMES[1])
    today = date.today()
    end = today + timedelta(days=days)

    schedule = MedicineSchedule(
        prescription_item_id=prescription_item_id,
        patient_id=patient_id,
        patient_phone=patient_phone,
        medicine_name=medicine_name,
        dosage=dosage or "",
        frequency=frequency,
        reminder_times=json.dumps(reminder_times),
        start_date=today,
        end_date=end,
        is_active=True,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    logger.info(
        "Created medicine schedule: %s for patient %s, times=%s, until %s",
        medicine_name, patient_id, reminder_times, end,
    )
    return schedule


def get_active_schedules(db: Session, patient_id: str) -> List[MedicineSchedule]:
    """Get all active medicine schedules for a patient."""
    return (
        db.query(MedicineSchedule)
        .filter(
            MedicineSchedule.patient_id == patient_id,
            MedicineSchedule.is_active == True,  # noqa: E712
        )
        .order_by(MedicineSchedule.created_at.desc())
        .all()
    )


def get_all_schedules(db: Session, patient_id: str) -> List[MedicineSchedule]:
    """Get all medicine schedules for a patient (active + inactive)."""
    return (
        db.query(MedicineSchedule)
        .filter(MedicineSchedule.patient_id == patient_id)
        .order_by(MedicineSchedule.is_active.desc(), MedicineSchedule.created_at.desc())
        .all()
    )


def deactivate_expired_schedules(db: Session) -> int:
    """Mark schedules past their end_date as inactive. Returns count deactivated."""
    today = date.today()
    expired = (
        db.query(MedicineSchedule)
        .filter(
            MedicineSchedule.is_active == True,  # noqa: E712
            MedicineSchedule.end_date < today,
        )
        .all()
    )
    for schedule in expired:
        schedule.is_active = False
    if expired:
        db.commit()
        logger.info("Deactivated %d expired medicine schedules", len(expired))
    return len(expired)


def deactivate_schedule(db: Session, schedule_id: str) -> MedicineSchedule | None:
    """Manually deactivate a schedule."""
    schedule = db.query(MedicineSchedule).filter(MedicineSchedule.id == schedule_id).first()
    if schedule:
        schedule.is_active = False
        db.commit()
        db.refresh(schedule)
    return schedule


def get_due_reminders(db: Session) -> list[tuple[MedicineSchedule, str]]:
    """Find all active schedules where a reminder is due right now.

    Returns a list of (schedule, time_slot) tuples.
    A reminder is 'due' if:
      - The schedule is active
      - Today is within [start_date, end_date]
      - Current time is within ±5 minutes of a reminder_time
      - No sent_reminder exists for this schedule + time_slot + today
    """
    today = date.today()
    now = datetime.now()
    current_minutes = now.hour * 60 + now.minute

    active_schedules = (
        db.query(MedicineSchedule)
        .filter(
            MedicineSchedule.is_active == True,  # noqa: E712
            MedicineSchedule.start_date <= today,
            MedicineSchedule.end_date >= today,
        )
        .all()
    )

    due: list[tuple[MedicineSchedule, str]] = []

    for schedule in active_schedules:
        try:
            times = json.loads(schedule.reminder_times)
        except (json.JSONDecodeError, TypeError):
            continue

        for time_slot in times:
            try:
                parts = time_slot.split(":")
                slot_minutes = int(parts[0]) * 60 + int(parts[1])
            except (ValueError, IndexError):
                continue

            # Check if within ±5 minute window
            if abs(current_minutes - slot_minutes) > 5:
                continue

            # Check if already sent today for this time slot
            already_sent = (
                db.query(SentReminder)
                .filter(
                    SentReminder.schedule_id == schedule.id,
                    SentReminder.reminder_time == time_slot,
                    SentReminder.sent_date == today,
                )
                .first()
            )
            if already_sent:
                continue

            due.append((schedule, time_slot))

    return due


def process_due_reminders(db: Session) -> int:
    """Process all due reminders: send WhatsApp messages and record them.

    Returns the number of reminders processed.
    """
    # First, clean up expired schedules
    deactivate_expired_schedules(db)

    due = get_due_reminders(db)
    if not due:
        return 0

    count = 0
    for schedule, time_slot in due:
        status = send_whatsapp_reminder(
            phone=schedule.patient_phone or "",
            medicine_name=schedule.medicine_name,
            dosage=schedule.dosage,
            time_label=time_slot,
        )

        sent = SentReminder(
            schedule_id=schedule.id,
            reminder_time=time_slot,
            sent_date=date.today(),
            status=status,
        )
        db.add(sent)
        count += 1
        logger.info(
            "Processed reminder: %s at %s for patient %s → %s",
            schedule.medicine_name, time_slot, schedule.patient_id, status,
        )

    if count:
        db.commit()

    return count


def process_due_followups(db: Session) -> int:
    """Process follow-up reminders: send emails 24h and 1h before the appointment.
    
    Returns the number of emails sent.
    """
    now = datetime.now()
    
    # Get all incomplete reminders
    reminders = (
        db.query(Reminder)
        .filter(Reminder.is_completed == False)  # noqa: E712
        .all()
    )
    
    emails_sent = 0
    for reminder in reminders:
        time_diff = reminder.time - now
        hours_diff = time_diff.total_seconds() / 3600.0
        
        should_update = False
        
        # Check 24-hour window (between 23.9 and 24.1 hours to allow for scheduler ticks)
        if 23.9 <= hours_diff <= 24.1 and not reminder.email_sent_24h:
            user = db.query(User).filter(User.id == reminder.user_id).first()
            if user and user.email:
                success = send_followup_email(
                    to_email=user.email,
                    patient_name=user.name or "Patient",
                    message=f"[24H REMINDER] {reminder.message}",
                    followup_time=reminder.time.isoformat()
                )
                if success:
                    reminder.email_sent_24h = True
                    should_update = True
                    emails_sent += 1
        
        # Check 1-hour window (between 0.9 and 1.1 hours to allow for scheduler ticks)
        elif 0.9 <= hours_diff <= 1.1 and not reminder.email_sent_1h:
            user = db.query(User).filter(User.id == reminder.user_id).first()
            if user and user.email:
                success = send_followup_email(
                    to_email=user.email,
                    patient_name=user.name or "Patient",
                    message=f"[1H URGENT REMINDER] {reminder.message}",
                    followup_time=reminder.time.isoformat()
                )
                if success:
                    reminder.email_sent_1h = True
                    should_update = True
                    emails_sent += 1
                    
        if should_update:
            db.commit()
            
    return emails_sent
