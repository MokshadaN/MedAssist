"""SQLAlchemy visit model."""

from sqlalchemy import Column, String, DateTime, ForeignKey
from datetime import datetime
import uuid
from core.database import Base

class Visit(Base):
    __tablename__ = "visits"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("users.id"))
    doctor_id = Column(String, ForeignKey("users.id"))
    session_id = Column(String, ForeignKey("chat_sessions.id"))
    summary_id = Column(String, ForeignKey("ai_summaries.id"))
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)