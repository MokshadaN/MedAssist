"""SQLAlchemy feedback model."""

from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from datetime import datetime
import uuid
from core.database import Base

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    visit_id = Column(String, ForeignKey("visits.id"))
    doctor_id = Column(String, ForeignKey("users.id"))
    ai_accuracy_rating = Column(Integer)
    comments = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)