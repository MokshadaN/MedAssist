"""Doctor registration-number validation (P0).

This service ONLY validates the FORMAT of an Indian medical registration
number. It NEVER verifies a doctor — a well-formed registration number is
easily forged, so verification is granted exclusively through the controlled
manual approval workflow (admin review, see api/v1/endpoints/admin.py) or a
future authoritative registry integration (NMC / State Council registers).

Every newly registered doctor defaults to:
    is_verified = False, verification_status = "pending"
"""

import re
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from models.doctor import DoctorProfile

logger = logging.getLogger(__name__)

INDIAN_STATE_COUNCILS = {
    "NMC": "National Medical Commission (MCI)",
    "MMC": "Maharashtra Medical Council",
    "DMC": "Delhi Medical Council",
    "KMC": "Karnataka Medical Council",
    "TNMC": "Tamil Nadu Medical Council",
    "GMC": "Gujarat Medical Council",
    "WBMC": "West Bengal Medical Council",
    "UPMC": "Uttar Pradesh Medical Council",
    "KSMC": "Kerala State Medical Council",
    "APMC": "Andhra Pradesh Medical Council",
    "TSMC": "Telangana State Medical Council",
    "RMC": "Rajasthan Medical Council",
    "MPMC": "Madhya Pradesh Medical Council",
    "PMC": "Punjab Medical Council",
    "BMC": "Bihar Medical Council",
}

# Kept as a backward-compatible alias for older imports.
VERIFICATION_STATUS_PENDING = "pending"
VERIFICATION_STATUS_APPROVED = "approved"
VERIFICATION_STATUS_REJECTED = "rejected"


def reset_verification_for_review(
    profile: DoctorProfile,
    *,
    submitted_at: datetime | None = None,
) -> None:
    """Reset authoritative verification fields after a new registration submission."""
    profile.is_verified = False
    profile.verification_status = VERIFICATION_STATUS_PENDING
    profile.verification_source = None
    profile.verification_note = None
    profile.verified_by = None
    profile.verified_at = None
    profile.qualification = None
    profile.submitted_at = submitted_at or datetime.utcnow()


def validate_registration_format(license_number: str, council_hint: Optional[str] = None) -> Dict[str, Any]:
    """
    Validate the FORMAT of an Indian medical registration number and derive the
    likely state council for record keeping.

    Returns a dict with:
    - is_valid_format: bool — syntactic validity only. NEVER a verification.
    - registration_number, state_council, council_code, qualification,
      registration_year: metadata captured for the manual review workflow.
    - reason: why the format was rejected (when invalid).

    This function must never return any "is_verified" key.
    """
    clean_number = (license_number or "").strip().upper()
    if not clean_number:
        return {
            "is_valid_format": False,
            "registration_number": clean_number,
            "reason": "Registration number is required.",
        }

    # Check for council prefix patterns (e.g. MMC-12345, DMC/2020/543, MCI-98765)
    matched_council_code: Optional[str] = None
    for code in INDIAN_STATE_COUNCILS:
        if clean_number.startswith(code) or (council_hint and code in council_hint.upper()):
            matched_council_code = code
            break

    # Format syntax validation for general Indian registration numbers.
    # Valid formats:
    # - Numeric only (4 to 8 digits)
    # - Alphanumeric with council prefix (e.g. MMC-2015/02/1234, DMC-12345, MCI-65432, 123456/2019)
    is_valid_format = bool(
        re.match(r"^[A-Z]{2,5}[-/]?[0-9]{3,8}([/0-9]{1,10})?$", clean_number)
        or re.match(r"^[0-9]{4,10}$", clean_number)
        or re.match(r"^[A-Z0-9]{5,20}$", clean_number)
    )

    if not is_valid_format:
        return {
            "is_valid_format": False,
            "registration_number": clean_number,
            "reason": (
                "Invalid registration number format. Standard Indian Medical Council "
                "formats: MCI-12345, MMC-2018/04/1234, DMC-54321, or a 4-8 digit NMC number."
            ),
        }

    # Determine state council name (for the review record, not for verification)
    council_name = INDIAN_STATE_COUNCILS.get(matched_council_code or "NMC", "National Medical Commission (MCI)")
    if council_hint and council_hint in INDIAN_STATE_COUNCILS.values():
        council_name = council_hint

    # Extract registration year if present (best-effort metadata for reviewers)
    year_match = re.search(r"(19[89][0-9]|20[0-2][0-9])", clean_number)
    registration_year = int(year_match.group(1)) if year_match else None

    logger.info(
        "Registration number format validated (NOT verified): %s, council=%s",
        clean_number, council_name,
    )

    return {
        "is_valid_format": True,
        "registration_number": clean_number,
        "state_council": council_name,
        "council_code": matched_council_code or "NMC",
        "qualification": None,  # only an authoritative registry or reviewer may attest this
        "registration_year": registration_year,
        "status": "Pending review by administrator",
        "message": (
            "Registration number format accepted. Your registration is now "
            "pending review by an administrator — you will be verified after approval."
        ),
    }