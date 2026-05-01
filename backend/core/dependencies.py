"""Authentication dependencies and role guards."""

from typing import Callable, Iterable

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import SessionLocal
from schemas.auth import TokenData
from services.auth_service import get_current_user as get_user_by_id
from utils.security import decode_access_token, oauth2_scheme


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = TokenData(
        user_id=user_id,
        email=payload.get("email"),
        role=payload.get("role"),
    )
    user = get_user_by_id(db, token_data.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_roles(*roles: str) -> Callable:
    def dependency(current_user=Depends(get_current_user)):
        if roles and current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return current_user

    return dependency

