"""SQLAlchemy message model."""

from sqlalchemy import Column, Float, String, Text, DateTime, ForeignKey
from datetime import datetime
import uuid
from core.database import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("chat_sessions.id"))
    sender = Column(String)
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # SOAP classification — populated for patient messages by the classifier service.
    # NULL for AI/system messages.
    soap_label = Column(String, nullable=True)          # "Subjective" / "Objective" / "Assessment" / "Plan" / "Unclear"
    soap_confidence = Column(Float, nullable=True)      # 0.0 – 1.0