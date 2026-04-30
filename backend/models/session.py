"""SQLAlchemy session model."""

from sqlalchemy import Column, String, DateTime, ForeignKey
from datetime import datetime
import uuid
from core.database import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("users.id"))
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)