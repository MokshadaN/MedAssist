"""SOAP Section Classifier — PubMedBERT fine-tuned inference service.

Loads the fine-tuned model once at startup and exposes two functions:
  - classify_soap(text)            → label, label_id, confidence
  - validate_soap_section(text, expected_section) → valid, label, confidence, message

Label mapping (matches training):
  0 = Subjective  (patient-reported symptoms, history)
  1 = Objective   (vitals, exam findings, lab values)
  2 = Assessment  (diagnosis, clinical impression)
  3 = Plan        (medications, follow-up, next steps)
"""

import logging
import os
import threading
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────

LABEL_MAP: dict[int, str] = {
    0: "Subjective",
    1: "Objective",
    2: "Assessment",
    3: "Plan",
}

LABEL_ID_MAP: dict[str, int] = {v: k for k, v in LABEL_MAP.items()}

# Below this confidence the model returns "Unclear" — avoids confidently wrong labels.
CONFIDENCE_THRESHOLD: float = float(os.getenv("SOAP_CONFIDENCE_THRESHOLD", "0.65"))

# Model search candidate directories (in order of priority):
_CANDIDATE_PATHS = [
    Path(os.getenv("SOAP_MODEL_PATH", "")),
    Path(__file__).resolve().parents[1] / "pubmedbert",
    Path(__file__).resolve().parents[1] / "models" / "pubmedbert_soap_model",
    Path("e:/medassist/soap-notes/results/checkpoint-500"),
]

def _resolve_model_dir() -> Optional[Path]:
    for path in _CANDIDATE_PATHS:
        if path and str(path) != "." and path.exists() and (path / "config.json").exists():
            return path
    return None

MAX_LEN: int = 256

# ──────────────────────────────────────────────────────────────────────────────
# Singleton — loaded once, thread-safe via a lock
# ──────────────────────────────────────────────────────────────────────────────

_lock = threading.Lock()
_tokenizer = None
_model = None
_device = None
_load_error: Optional[str] = None   # set if the model failed to load


def _load_model() -> None:
    """Load tokenizer + model into module-level singletons (called once)."""
    global _tokenizer, _model, _device, _load_error

    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification

        model_dir = _resolve_model_dir()
        if not model_dir:
            paths_str = ", ".join(str(p) for p in _CANDIDATE_PATHS if str(p))
            _load_error = (
                f"PubMedBERT model not found in candidate locations: [{paths_str}]. "
                "Run train_soap_pubmedbert.py first to generate the model."
            )
            logger.error(_load_error)
            return

        logger.info("Loading PubMedBERT SOAP classifier from %s …", model_dir)
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        _tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
        _model = AutoModelForSequenceClassification.from_pretrained(str(model_dir))
        _model.to(_device)
        _model.eval()
        logger.info(
            "PubMedBERT SOAP classifier ready on %s (threshold=%.2f)",
            _device,
            CONFIDENCE_THRESHOLD,
        )
    except Exception as exc:  # pragma: no cover
        _load_error = str(exc)
        logger.error("Failed to load PubMedBERT SOAP classifier: %s", exc)


def _ensure_loaded() -> None:
    """Thread-safe lazy initialiser — loads the model the first time it's needed."""
    global _tokenizer, _model
    if _tokenizer is None and _load_error is None:
        with _lock:
            if _tokenizer is None and _load_error is None:
                _load_model()


def warmup() -> None:
    """Pre-warm the model. Call this from the FastAPI startup event so the
    first patient request isn't slowed by model loading."""
    _ensure_loaded()


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def classify_soap(text: str) -> dict:
    """Classify a text snippet into one of the four SOAP sections.

    Returns::

        {
            "label":      "Subjective",   # or "Objective" / "Assessment" / "Plan" / "Unclear"
            "label_id":   0,              # int 0-3, or -1 when Unclear
            "confidence": 0.94,           # float 0.0-1.0
            "available":  True,           # False if model could not be loaded
        }
    """
    _ensure_loaded()

    if _load_error or _model is None:
        return {
            "label": "Unavailable",
            "label_id": -1,
            "confidence": 0.0,
            "available": False,
        }

    text = text.strip()
    if not text:
        return {"label": "Unclear", "label_id": -1, "confidence": 0.0, "available": True}

    try:
        import torch
        import torch.nn.functional as F

        encoding = _tokenizer(
            text,
            truncation=True,
            max_length=MAX_LEN,
            padding="max_length",
            return_tensors="pt",
        )
        input_ids = encoding["input_ids"].to(_device)
        attention_mask = encoding["attention_mask"].to(_device)

        with torch.no_grad():
            logits = _model(input_ids=input_ids, attention_mask=attention_mask).logits

        probs = F.softmax(logits, dim=1)[0]
        confidence = float(probs.max().item())
        label_id = int(probs.argmax().item())

        if confidence < CONFIDENCE_THRESHOLD:
            return {
                "label": "Unclear",
                "label_id": -1,
                "confidence": round(confidence, 4),
                "available": True,
            }

        return {
            "label": LABEL_MAP[label_id],
            "label_id": label_id,
            "confidence": round(confidence, 4),
            "available": True,
        }
    except Exception as exc:
        logger.error("SOAP classification error: %s", exc)
        return {"label": "Unavailable", "label_id": -1, "confidence": 0.0, "available": False}


def validate_soap_section(text: str, expected_section: str) -> dict:
    """Validate whether a patient's text belongs to the expected SOAP section.

    Args:
        text: The patient's input text.
        expected_section: One of "Subjective", "Objective", "Assessment", "Plan".

    Returns::

        {
            "valid":      True,
            "label":      "Subjective",
            "confidence": 0.94,
            "message":    "",          # human-readable feedback when invalid
            "available":  True,
        }
    """
    result = classify_soap(text)

    if not result["available"]:
        # Model not available — treat as valid so intake is never blocked.
        return {
            "valid": True,
            "label": "Unavailable",
            "confidence": 0.0,
            "message": "",
            "available": False,
        }

    if result["label"] == "Unclear":
        return {
            "valid": True,         # ambiguous — don't penalise the patient
            "label": "Unclear",
            "confidence": result["confidence"],
            "message": "Keep describing your symptoms in more detail.",
            "available": True,
        }

    is_valid = result["label"].lower() == expected_section.lower()
    message = (
        ""
        if is_valid
        else (
            f"This looks more like {result['label']} information. "
            f"For this question, please focus on {expected_section} details."
        )
    )

    return {
        "valid": is_valid,
        "label": result["label"],
        "confidence": result["confidence"],
        "message": message,
        "available": True,
    }


def get_model_status() -> dict:
    """Return the current model load status for the health-check endpoint."""
    _ensure_loaded()
    return {
        "loaded": _model is not None,
        "device": str(_device) if _device else None,
        "model_dir": str(_MODEL_DIR),
        "model_exists": _MODEL_DIR.exists(),
        "error": _load_error,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "labels": LABEL_MAP,
    }
