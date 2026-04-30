"""Pydantic triage schemas."""

from pydantic import BaseModel

class TriageOut(BaseModel):
    severity: str
    recommendation: str