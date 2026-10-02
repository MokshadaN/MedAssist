"""SQLAlchemy sent reminder model for deduplication tracking."""

from datetime import datetime, date
import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint

from core.database import Base


class SentReminder(Base):
    __tablename__ = "sent_reminders"
    __table_args__ = (
        UniqueConstraint(
            "schedule_id",
            "reminder_time",
            "sent_date",
            name="uq_sent_reminder_delivery",
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    schedule_id = Column(String, ForeignKey("medicine_schedules.id"), nullable=False)
    reminder_time = Column(String, nullable=False)  # e.g. "08:00"
    sent_date = Column(Date, nullable=False, default=date.today)
    status = Column(String, nullable=False, default="processing")
    attempts = Column(Integer, nullable=False, default=0)
    error = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
