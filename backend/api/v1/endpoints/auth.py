"""Auth endpoints."""

from fastapi import APIRouter, Depends
from schemas.auth import UserCreate, UserOut

router = APIRouter()

@router.post("/register", response_model=UserOut)
def register(user: UserCreate):
    return {
        "id": "uuid",
        "name": user.name,
        "email": user.email,
        "role": user.role
    }

@router.post("/login")
def login(email: str, password: str):
    return {"access_token": "jwt_token"}

@router.get("/me")
def get_me():
    return {"id": "uuid", "name": "User", "role": "patient"}