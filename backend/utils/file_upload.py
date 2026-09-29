"""File upload utilities — validation and sanitization."""

import re
import uuid
from pathlib import Path
from typing import Tuple

from fastapi import HTTPException, UploadFile, status

# ── Constants ──────────────────────────────────────────────────────────────────

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}

# Magic bytes (file signatures) for each allowed type
MAGIC_BYTES: dict[str, list[bytes]] = {
    ".pdf": [b"%PDF"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _sanitize_filename(filename: str) -> str:
    """Remove path components and dangerous characters from a filename."""
    # Take only the final component (strip any directory traversal)
    name = Path(filename).name
    # Replace all non-alphanumeric chars except dot, hyphen, underscore
    name = re.sub(r"[^a-zA-Z0-9._\-]", "_", name)
    return name or "upload"


def _check_magic_bytes(content: bytes, ext: str) -> bool:
    """Verify that file content starts with expected magic bytes for the extension."""
    signatures = MAGIC_BYTES.get(ext, [])
    if not signatures:
        return True  # No signature check for unknown types
    return any(content.startswith(sig) for sig in signatures)


# ── Public API ─────────────────────────────────────────────────────────────────

async def validate_and_read_upload(file: UploadFile) -> Tuple[bytes, str]:
    """
    Validate an uploaded file and return (content_bytes, safe_unique_filename).

    Raises HTTPException for:
    - Disallowed file extension
    - File too large (>10 MB)
    - Magic bytes mismatch (content doesn't match claimed extension)
    """
    original_name = file.filename or "upload"
    ext = Path(original_name).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{ext}' is not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read up to MAX_FILE_SIZE + 1 byte to detect oversized files efficiently
    content = await file.read(MAX_FILE_SIZE_BYTES + 1)
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.",
        )

    if not _check_magic_bytes(content, ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match its extension. Upload may be corrupted or tampered.",
        )

    safe_name = f"{uuid.uuid4()}_{_sanitize_filename(original_name)}"
    return content, safe_name
