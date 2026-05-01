"""Pydantic schemas for prescription risk checks."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class RiskCheckCreate(BaseModel):
    prescription_id: str


class RiskCheckOut(BaseModel):
    id: str
    prescription_id: str
    issues: list[dict[str, Any]]
    severity: str
    created_at: datetime

