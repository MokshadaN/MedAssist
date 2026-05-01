"""SQLAlchemy patient model."""

from sqlalchemy import Column, String, Integer, ForeignKey
from core.database import Base
import uuid

class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    age = Column(Integer)
    gender = Column(String)
    allergies = Column(String)
    chronic_conditions = Column(String)
    address = Column(String)