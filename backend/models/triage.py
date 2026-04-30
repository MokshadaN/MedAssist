"""SQLAlchemy triage model."""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from datetime import datetime
import uuid
from core.database import Base

class TriageResult(Base):
    __tablename__ = "triage_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("chat_sessions.id"))
    severity = Column(String)
    flags = Column(String)
    recommendation = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)