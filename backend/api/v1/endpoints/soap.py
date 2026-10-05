"""SOAP classification API endpoints.

Provides a lightweight, auth-protected endpoint for real-time SOAP
section classification — designed to be called with a debounced frontend
hook as the patient types their intake response.

Routes
------
POST /api/v1/soap/classify   — classify or validate a text snippet
GET  /api/v1/soap/status     — model health (ops / health-check dashboards)
"""

import logging
from typing import Literal, Optional

from fastapi import APIRouter, Depends

from core.dependencies import require_roles
from services.soap_classifier import classify_soap, get_model_status, validate_soap_section
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(tags=["soap"])


# ──────────────────────────────────────────────────────────────────────────────
# Schemas (inline — small enough not to need a separate schema file)
# ──────────────────────────────────────────────────────────────────────────────

class SOAPClassifyRequest(BaseModel):
    """Request body for SOAP classification / validation."""

    text: str = Field(
        ...,
        min_length=1,
        max_length=4096,
        description="The patient's text to classify into a SOAP section.",
    )
    expected_section: Optional[Literal["Subjective", "Objective", "Assessment", "Plan"]] = Field(
        default=None,
        description=(
            "If provided, the response will include a `valid` flag indicating "
            "whether the text matches the expected SOAP section."
        ),
    )

    model_config = {"extra": "forbid"}


class SOAPClassifyResponse(BaseModel):
    """Classification result returned to the frontend."""

    label: str
    label_id: int
    confidence: float
    valid: Optional[bool] = None          # only set when expected_section was provided
    feedback: str = ""                    # human-readable message when valid=False
    available: bool                       # False when the model could not be loaded


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post(
    "/classify",
    response_model=SOAPClassifyResponse,
    summary="Classify / validate a text snippet into a SOAP section",
    description=(
        "Runs the fine-tuned PubMedBERT classifier on the provided text. "
        "When `expected_section` is supplied the response additionally includes "
        "`valid` (bool) and `feedback` (guidance string for the patient). "
        "Always returns HTTP 200 — even when the model is unavailable — so "
        "client-side validation never blocks intake submission."
    ),
)
def classify_soap_endpoint(
    body: SOAPClassifyRequest,
    _current_user=Depends(require_roles("patient", "doctor")),
) -> SOAPClassifyResponse:
    if body.expected_section:
        result = validate_soap_section(body.text, body.expected_section)
        return SOAPClassifyResponse(
            label=result["label"],
            label_id=-1 if result["label"] in {"Unclear", "Unavailable"} else _label_id(result["label"]),
            confidence=result["confidence"],
            valid=result["valid"],
            feedback=result.get("message", ""),
            available=result["available"],
        )
    else:
        result = classify_soap(body.text)
        return SOAPClassifyResponse(
            label=result["label"],
            label_id=result["label_id"],
            confidence=result["confidence"],
            available=result["available"],
        )


@router.get(
    "/status",
    summary="SOAP model health status",
    description="Returns the current load status of the PubMedBERT classifier — for ops dashboards.",
)
def soap_model_status(
    _current_user=Depends(require_roles("patient", "doctor")),
):
    return get_model_status()


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

_LABEL_TO_ID = {"Subjective": 0, "Objective": 1, "Assessment": 2, "Plan": 3}


def _label_id(label: str) -> int:
    return _LABEL_TO_ID.get(label, -1)
