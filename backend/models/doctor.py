"""SQLAlchemy doctor model."""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
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
    
    # Verification metadata (Indian Medical Registry / NMC / State Councils)
    is_verified = Column(Boolean, default=False, nullable=False)
    state_council = Column(String, nullable=True)
    qualification = Column(String, nullable=True)
    registration_year = Column(Integer, nullable=True)
    verification_source = Column(String, nullable=True)
    verified_at = Column(DateTime, nullable=True)