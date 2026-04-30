"""SQLAlchemy risk model."""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from datetime import datetime
import uuid
from core.database import Base

class RiskCheck(Base):
    __tablename__ = "risk_checks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    prescription_id = Column(String, ForeignKey("prescriptions.id"))
    issues = Column(Text)
    severity = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)