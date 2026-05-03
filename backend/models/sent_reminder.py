"""SQLAlchemy sent reminder model for deduplication tracking."""

from datetime import datetime, date
import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, String

from core.database import Base


class SentReminder(Base):
    __tablename__ = "sent_reminders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    schedule_id = Column(String, ForeignKey("medicine_schedules.id"), nullable=False)
    reminder_time = Column(String, nullable=False)  # e.g. "08:00"
    sent_date = Column(Date, nullable=False, default=date.today)
    status = Column(String, nullable=False, default="sent")  # sent | failed | simulated
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
