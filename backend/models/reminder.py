"""SQLAlchemy reminder model."""

from datetime import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text

from core.database import Base


class Reminder(Base):
    __tablename__ = "reminders"
    __table_args__ = (
        Index(
            "uq_reminders_user_id_idempotency_key",
            "user_id",
            "idempotency_key",
            unique=True,
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    time = Column(DateTime, nullable=False)
    idempotency_key = Column(String(255), nullable=True)
    is_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    email_sent_24h = Column(Boolean, default=False, nullable=False)
    email_sent_1h = Column(Boolean, default=False, nullable=False)
    email_24h_status = Column(String, default="pending", nullable=False)
    email_24h_error = Column(String(255), nullable=True)
    email_24h_status_updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    email_1h_status = Column(String, default="pending", nullable=False)
    email_1h_error = Column(String(255), nullable=True)
    email_1h_status_updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

