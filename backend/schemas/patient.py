"""Patient schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PatientProfileBase(BaseModel):
    user_id: str = Field(description="User ID this profile belongs to")
    age: Optional[int] = Field(default=None, description="Patient age")
    gender: Optional[str] = Field(default=None, description="Patient gender")
    allergies: Optional[str] = Field(default=None, description="Patient allergies")
    chronic_conditions: Optional[str] = Field(default=None, description="Chronic conditions")
    address: Optional[str] = Field(default=None, description="Patient address")


class PatientProfileCreate(PatientProfileBase):
    pass


class PatientProfileUpdate(PatientProfileBase):
    pass


class PatientProfileOut(PatientProfileBase):
    id: str = Field(description="Patient profile ID")
    emergency_profile_enabled: bool = False
    emergency_access_token: Optional[str] = None

    class Config:
        from_attributes = True


class EmergencyAccessOut(BaseModel):
    enabled: bool
    access_token: str
    expires_at: datetime
    public_path: str


class MedicationPublic(BaseModel):
    medicine_name: str
    dosage: str
    duration: str
    frequency: str
    prescribed_on: str


class PatientProfilePublic(BaseModel):
    name: str
    age: Optional[int]
    gender: Optional[str]
    allergies: Optional[str]
    chronic_conditions: Optional[str]
    medications: list[MedicationPublic] = []

    class Config:
        from_attributes = True