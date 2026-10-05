"""
Public Dataset Loader & Normalizer for MedAssist Triage Benchmarking.
Fetches, caches, and normalizes public medical datasets without hardcoding.
"""

import csv
import io
import json
import os
import sys
import urllib.request
from typing import List, Dict, Any

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "public_cache")

# HuggingFace Official Benchmark: gretelai/symptom_to_diagnosis
HUGGINGFACE_TRAIN_URL = "https://huggingface.co/datasets/gretelai/symptom_to_diagnosis/raw/main/train.jsonl"
HUGGINGFACE_TEST_URL = "https://huggingface.co/datasets/gretelai/symptom_to_diagnosis/raw/main/test.jsonl"

# Medical consensus mapping of acute emergencies vs routine / outpatient conditions
ACUTE_EMERGENCY_LABELS = {
    "bronchial asthma",
    "pneumonia",
    "dengue",
    "typhoid",
    "hypertension",
    "drug reaction",
}

ROUTINE_OUTPATIENT_LABELS = {
    "allergy",
    "common cold",
    "psoriasis",
    "fungal infection",
    "gastroesophageal reflux disease",
    "migraine",
    "varicose veins",
    "cervical spondylosis",
    "arthritis",
    "peptic ulcer disease",
    "chicken pox",
    "impetigo",
}


def _ensure_cache_dir():
    os.makedirs(CACHE_DIR, exist_ok=True)


def fetch_url(url: str) -> str:
    """Fetch content over HTTP with browser headers."""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "MedAssist-Evaluation-Runner/1.0 (Public Research Benchmark)"}
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode("utf-8", errors="replace")


def load_symptom2diagnosis(split: str = "train", force_refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Load and normalize HuggingFace gretelai/symptom_to_diagnosis public benchmark.
    Returns normalized list of:
      { "id": str, "text": str, "expected_emergency": bool, "expected_tier": str, "diagnosis": str, "source": str }
    """
    _ensure_cache_dir()
    cache_file = os.path.join(CACHE_DIR, f"symptom2diagnosis_{split}_normalized.json")

    if not force_refresh and os.path.exists(cache_file):
        with open(cache_file, "r", encoding="utf-8") as f:
            return json.load(f)

    target_url = HUGGINGFACE_TEST_URL if split == "test" else HUGGINGFACE_TRAIN_URL
    print(f"[*] Fetching HuggingFace public benchmark ({split} split) from:\n    {target_url}")
    raw_jsonl = fetch_url(target_url)

    normalized_cases = []
    for i, line in enumerate(raw_jsonl.strip().split("\n")):
        if not line.strip():
            continue
        try:
            item = json.loads(line)
        except Exception:
            continue

        text = (item.get("input_text") or "").strip()
        label = (item.get("output_text") or "").strip().lower()

        if not text or not label:
            continue

        is_emergency = label in ACUTE_EMERGENCY_LABELS
        is_routine = label in ROUTINE_OUTPATIENT_LABELS

        if is_emergency or is_routine:
            normalized_cases.append({
                "id": f"HF-S2D-{split.upper()}-{i+1:04d}",
                "text": text,
                "expected_emergency": is_emergency,
                "expected_tier": "emergency" if is_emergency else "routine",
                "diagnosis": label,
                "source": f"HuggingFace-gretelai-symptom-to-diagnosis ({split})",
            })

    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(normalized_cases, f, indent=2)

    print(f"[+] Successfully cached {len(normalized_cases)} normalized cases from HuggingFace.")
    return normalized_cases

