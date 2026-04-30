"""Auth endpoints."""

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db
from schemas.auth import (
    DoctorRegister,
    LoginResponse,
    PatientRegister,
    RegisterResponse,
    UserOut,
)
from services.auth_service import (
    authenticate_user,
    get_user_context,
    register_doctor,
    register_patient,
)

router = APIRouter(tags=["auth"])


@router.post("/register/doctor", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register_doctor_endpoint(doctor: DoctorRegister, db: Session = Depends(get_db)):
    return register_doctor(db, doctor)


@router.post("/register/patient", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register_patient_endpoint(patient: PatientRegister, db: Session = Depends(get_db)):
    return register_patient(db, patient)


@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Swagger shows username/password here; we use username as the user's email.
    auth_result = authenticate_user(db, form_data.username, form_data.password)
    return auth_result


@router.get("/me", response_model=RegisterResponse)
def get_me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_user_context(db, current_user)
