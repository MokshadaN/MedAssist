"""SQLAlchemy report model."""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from datetime import datetime
import uuid
from core.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("users.id"))
    file_url = Column(String)
    parsed_data = Column(Text)
    uploaded_at = Column(DateTime, default=datetime.utcnow)