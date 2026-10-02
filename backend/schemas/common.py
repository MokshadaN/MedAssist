"""Shared API response contracts."""

from pydantic import BaseModel


class DeleteResponse(BaseModel):
    status: str
    report_id: str | None = None
