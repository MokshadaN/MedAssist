"""Shared bounded pagination query parameters for array-based list routes."""

from typing import Annotated

from fastapi import Query

PageLimit = Annotated[int, Query(ge=1, le=100)]
PageOffset = Annotated[int, Query(ge=0)]
