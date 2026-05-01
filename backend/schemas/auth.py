"""Pydantic auth schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


BCRYPT_MAX_PASSWORD_BYTES = 72


class BaseRegister(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: Optional[str] = Field(default=None, max_length=30)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > BCRYPT_MAX_PASSWORD_BYTES:
            raise ValueError("Password must be 72 bytes or fewer.")
        return value


class DoctorRegister(BaseRegister):
    specialization: str = Field(min_length=1, max_length=100)
    license_number: str = Field(min_length=1, max_length=100)
    experience_years: int = Field(ge=0, le=100)
    hospital_affiliation: Optional[str] = Field(default=None, max_length=150)


class PatientRegister(BaseRegister):
    age: Optional[int] = Field(default=None, ge=0, le=150)
    gender: Optional[str] = Field(default=None, max_length=30)
    allergies: Optional[str] = Field(default=None, max_length=255)
    chronic_conditions: Optional[str] = Field(default=None, max_length=255)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > BCRYPT_MAX_PASSWORD_BYTES:
            raise ValueError("Password must be 72 bytes or fewer.")
        return value


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    phone: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DoctorProfileOut(BaseModel):
    id: str
    user_id: str
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = None
    hospital_affiliation: Optional[str] = None

    model_config = {"from_attributes": True}


class PatientProfileOut(BaseModel):
    id: str
    user_id: str
    age: Optional[int] = None
    gender: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=30)
    # Patient fields
    age: Optional[int] = Field(default=None, ge=0, le=150)
    gender: Optional[str] = Field(default=None, max_length=30)
    allergies: Optional[str] = Field(default=None, max_length=255)
    chronic_conditions: Optional[str] = Field(default=None, max_length=255)
    # Doctor fields
    specialization: Optional[str] = Field(default=None, max_length=100)
    license_number: Optional[str] = Field(default=None, max_length=100)
    experience_years: Optional[int] = Field(default=None, ge=0, le=100)
    hospital_affiliation: Optional[str] = Field(default=None, max_length=150)


class RegisterResponse(BaseModel):
    user: UserOut
    doctor_profile: Optional[DoctorProfileOut] = None
    patient_profile: Optional[PatientProfileOut] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    doctor_profile: Optional[DoctorProfileOut] = None
    patient_profile: Optional[PatientProfileOut] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
