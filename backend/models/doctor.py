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
    # A doctor is NEVER verified automatically at registration. Verification only
    # happens through the controlled manual approval workflow (admin review) or an
    # authoritative registry integration. `is_verified` is derived from
    # `verification_status == "approved"` and is kept as a column for compatibility.
    is_verified = Column(Boolean, default=False, nullable=False)
    state_council = Column(String, nullable=True)
    qualification = Column(String, nullable=True)
    registration_year = Column(Integer, nullable=True)
    verification_source = Column(String, nullable=True)
    verified_at = Column(DateTime, nullable=True)

    # Manual approval workflow (P0): pending | approved | rejected
    verification_status = Column(String, default="pending", nullable=False)
    submitted_at = Column(DateTime, nullable=True)      # when the doctor last submitted/re-submitted
    verified_by = Column(String, nullable=True)         # admin user id that approved/rejected
    verification_note = Column(String, nullable=True)   # reviewer note / evidence reference