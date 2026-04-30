"""SQLAlchemy notification model."""

from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from datetime import datetime
import uuid
from core.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    message = Column(Text)
    type = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)