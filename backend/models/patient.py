"""SQLAlchemy patient model."""

from sqlalchemy import Boolean, Column, DateTime, String, Integer, ForeignKey
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

    # Emergency QR profile (P0): explicit patient consent + opaque, expiring access token.
    # The public profile endpoint refuses to serve data unless enabled=True AND the
    # request presents the current, unexpired access token (else 404 — no existence leak).
    emergency_profile_enabled = Column(Boolean, default=False, nullable=False)
    emergency_access_token = Column(String, nullable=True)
    emergency_token_expires_at = Column(DateTime, nullable=True)