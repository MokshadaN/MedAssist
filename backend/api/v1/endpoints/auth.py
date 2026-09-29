"""Auth endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db
from core.limiter import limiter
from schemas.auth import (
    DoctorRegister,
    LoginResponse,
    PatientRegister,
    ProfileUpdate,
    RegisterResponse,
    Token,
    UserOut,
)
from services.auth_service import (
    authenticate_user,
    get_user_context,
    register_doctor,
    register_patient,
    update_user_context,
)
from utils.security import create_access_token, create_refresh_token, decode_refresh_token

router = APIRouter(tags=["auth"])


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post(
    "/register/doctor",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("3/minute")
def register_doctor_endpoint(request: Request, doctor: DoctorRegister, db: Session = Depends(get_db)):
    return register_doctor(db, doctor)


@router.post(
    "/register/patient",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("3/minute")
def register_patient_endpoint(request: Request, patient: PatientRegister, db: Session = Depends(get_db)):
    return register_patient(db, patient)


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Swagger shows username/password here; we use username as the user's email.
    auth_result = authenticate_user(db, form_data.username, form_data.password)

    # Issue a refresh token alongside the access token
    token_data = {
        "sub": auth_result["user"].id,
        "email": auth_result["user"].email,
        "role": auth_result["user"].role,
    }
    auth_result["refresh_token"] = create_refresh_token(token_data)
    return auth_result


@router.post("/refresh", response_model=Token)
@limiter.limit("10/minute")
def refresh_access_token(request: Request, body: RefreshRequest):
    """Exchange a valid refresh token for a new access token."""
    payload = decode_refresh_token(body.refresh_token)
    token_data = {
        "sub": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
    }
    if not token_data["sub"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload.",
        )
    new_access_token = create_access_token(token_data)
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    """
    Client-side logout: discard the access and refresh tokens.
    Server-side token blacklisting requires Redis — implement in Phase 5.
    """
    return


@router.get("/me", response_model=RegisterResponse)
def get_me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_user_context(db, current_user)


@router.patch("/me", response_model=RegisterResponse)
def update_me(
    data: ProfileUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_user_context(db, current_user, data)

