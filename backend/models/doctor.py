"""SQLAlchemy doctor model."""

from sqlalchemy import Column, String, Integer, ForeignKey
from core.database import Base
import uuid

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    specialization = Column(String)
    license_number = Column(String)
    experience_years = Column(Integer)
    hospital_affiliation = Column(String)