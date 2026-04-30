"""Pydantic feedback schemas."""

from pydantic import BaseModel

class FeedbackCreate(BaseModel):
    visit_id: str
    rating: int
    comments: str