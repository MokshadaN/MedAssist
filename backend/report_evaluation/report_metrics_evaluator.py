"""Evaluation metrics calculator for medical report information extraction.

Computes:
- True Positives (TP), False Positives (FP), False Negatives (FN)
- Precision, Recall, F1-Score
- Field Extraction Accuracy
- 95% Wilson Score Confidence Intervals
- Stratified breakdowns across clinical entity types (Diagnoses, Medications, Lab/Procedures, Metadata, Notes)
"""

from __future__ import annotations

import math
import re
from typing import Any


def wilson_score_interval(successes: int, total: int, confidence: float = 0.95) -> tuple[float, float]:
    """Calculate 95% Wilson Score confidence interval for a proportion."""
    if total <= 0:
        return 0.0, 0.0
    z = 1.959964  # for 95% confidence
    p_hat = successes / total
    denominator = 1 + (z ** 2) / total
    centre_adjusted_probability = p_hat + (z ** 2) / (2 * total)
    adjusted_std_error = z * math.sqrt((p_hat * (1 - p_hat) + (z ** 2) / (4 * total)) / total)
    lower = max(0.0, (centre_adjusted_probability - adjusted_std_error) / denominator)
    upper = min(1.0, (centre_adjusted_probability + adjusted_std_error) / denominator)
    return round(lower * 100, 2), round(upper * 100, 2)


def normalize_text(text: str) -> str:
    """Normalize text for clinical string matching."""
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s\.-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def match_diagnosis(pred: dict, gt: dict) -> bool:
    """Check if predicted diagnosis matches ground truth."""
    pred_cond = normalize_text(pred.get("condition", ""))
    pred_icd = normalize_text(pred.get("icd_10", "")).replace(".", "")
    gt_cond = normalize_text(gt.get("condition", ""))
    gt_icd = normalize_text(gt.get("icd_10", "")).replace(".", "")

    if gt_icd and pred_icd and (gt_icd in pred_icd or pred_icd in gt_icd):
        return True
    if gt_cond and pred_cond:
        if gt_cond in pred_cond or pred_cond in gt_cond:
            return True
        # Token overlap
        gt_tokens = set(gt_cond.split())
        pred_tokens = set(pred_cond.split())
        if gt_tokens and len(gt_tokens.intersection(pred_tokens)) / len(gt_tokens) >= 0.6:
            return True
    return False


def match_medication(pred: dict, gt: dict) -> bool:
    """Check if predicted medication matches ground truth."""
    pred_name = normalize_text(pred.get("name", ""))
    gt_raw = normalize_text(gt.get("raw_text", ""))

    if not pred_name or not gt_raw:
        return False

    # Extract base drug name (e.g. "metformin" from "metformin 500mg")
    pred_first_token = pred_name.split()[0] if pred_name.split() else ""
    if pred_first_token and len(pred_first_token) >= 3 and pred_first_token in gt_raw:
        return True

    if pred_name in gt_raw or gt_raw in pred_name:
        return True

    # Token overlap
    pred_tokens = set(pred_name.split())
    gt_tokens = set(gt_raw.split())
    if pred_tokens and len(pred_tokens.intersection(gt_tokens)) >= 1:
        return True
    return False


def match_procedure(pred: dict, gt: dict) -> bool:
    """Check if predicted procedure/lab test matches ground truth."""
    pred_name = normalize_text(pred.get("name", "") or pred.get("parameter", ""))
    pred_code = normalize_text(pred.get("code", ""))
    gt_name = normalize_text(gt.get("name", "") or gt.get("parameter", ""))
    gt_code = normalize_text(gt.get("code", ""))

    if gt_code and pred_code and gt_code == pred_code:
        return True
    if gt_name and pred_name:
        if gt_name in pred_name or pred_name in gt_name:
            return True
        gt_tokens = set(gt_name.split())
        pred_tokens = set(pred_name.split())
        if gt_tokens and len(gt_tokens.intersection(pred_tokens)) / len(gt_tokens) >= 0.5:
            return True
    return False


def evaluate_single_report(predicted_analysis: dict, ground_truth: dict) -> dict[str, Any]:
    """Evaluate extraction accuracy for a single medical document."""
    tp, fp, fn = 0, 0, 0
    entity_breakdown = {
        "metadata": {"tp": 0, "fp": 0, "fn": 0},
        "diagnoses": {"tp": 0, "fp": 0, "fn": 0},
        "medications": {"tp": 0, "fp": 0, "fn": 0},
        "procedures": {"tp": 0, "fp": 0, "fn": 0},
        "physician_notes": {"tp": 0, "fp": 0, "fn": 0}
    }

    # 1. Metadata evaluation (patient_name, mrn, facility)
    pred_meta = predicted_analysis.get("report_metadata", {})
    for field in ["patient_name", "mrn", "facility"]:
        gt_val = normalize_text(ground_truth.get(field, ""))
        pred_val = normalize_text(pred_meta.get(field, ""))
        if gt_val:
            if pred_val and (gt_val in pred_val or pred_val in gt_val):
                entity_breakdown["metadata"]["tp"] += 1
            else:
                entity_breakdown["metadata"]["fn"] += 1
        elif pred_val:
            entity_breakdown["metadata"]["fp"] += 1

    # 2. Diagnoses evaluation
    gt_diagnoses = ground_truth.get("diagnoses", [])
    pred_diagnoses = predicted_analysis.get("diagnoses", [])
    matched_gt_d = set()

    for p in pred_diagnoses:
        match_found = False
        for idx, g in enumerate(gt_diagnoses):
            if idx not in matched_gt_d and match_diagnosis(p, g):
                matched_gt_d.add(idx)
                entity_breakdown["diagnoses"]["tp"] += 1
                match_found = True
                break
        if not match_found:
            entity_breakdown["diagnoses"]["fp"] += 1

    entity_breakdown["diagnoses"]["fn"] += len(gt_diagnoses) - len(matched_gt_d)

    # 3. Medications evaluation
    gt_meds = ground_truth.get("medications", [])
    pred_meds = predicted_analysis.get("medications", [])
    matched_gt_m = set()

    for p in pred_meds:
        match_found = False
        for idx, g in enumerate(gt_meds):
            if idx not in matched_gt_m and match_medication(p, g):
                matched_gt_m.add(idx)
                entity_breakdown["medications"]["tp"] += 1
                match_found = True
                break
        if not match_found:
            entity_breakdown["medications"]["fp"] += 1

    entity_breakdown["medications"]["fn"] += len(gt_meds) - len(matched_gt_m)

    # 4. Procedures / Lab tests
    gt_procs = ground_truth.get("procedures", [])
    pred_procs = predicted_analysis.get("procedures", []) or predicted_analysis.get("detailed_metrics", [])
    matched_gt_p = set()

    for p in pred_procs:
        match_found = False
        for idx, g in enumerate(gt_procs):
            if idx not in matched_gt_p and match_procedure(p, g):
                matched_gt_p.add(idx)
                entity_breakdown["procedures"]["tp"] += 1
                match_found = True
                break
        if not match_found:
            # Only count as FP if procedures were expected in this document
            if len(gt_procs) > 0:
                entity_breakdown["procedures"]["fp"] += 1

    entity_breakdown["procedures"]["fn"] += len(gt_procs) - len(matched_gt_p)

    # 5. Physician Notes Evaluation (Key clinical concept coverage)
    gt_notes = normalize_text(ground_truth.get("physician_notes", ""))
    pred_notes = normalize_text(
        predicted_analysis.get("physician_notes", "") or 
        predicted_analysis.get("clinical_summary", {}).get("overall_clinical_snapshot", "")
    )
    if gt_notes:
        gt_tokens = [w for w in gt_notes.split() if len(w) > 3]
        if gt_tokens:
            overlap = sum(1 for w in gt_tokens if w in pred_notes)
            coverage = overlap / len(gt_tokens)
            if coverage >= 0.4:
                entity_breakdown["physician_notes"]["tp"] += 1
            else:
                entity_breakdown["physician_notes"]["fn"] += 1
    elif pred_notes:
        # Notes generated where none existed
        pass

    # Sum totals
    for cat in entity_breakdown.values():
        tp += cat["tp"]
        fp += cat["fp"]
        fn += cat["fn"]

    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "entity_breakdown": entity_breakdown
    }


def compute_aggregate_metrics(per_case_results: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate per-case results and calculate final camera-ready metrics with Wilson CIs."""
    total_tp = sum(r["tp"] for r in per_case_results)
    total_fp = sum(r["fp"] for r in per_case_results)
    total_fn = sum(r["fn"] for r in per_case_results)

    precision = (total_tp / (total_tp + total_fp) * 100) if (total_tp + total_fp) > 0 else 0.0
    recall = (total_tp / (total_tp + total_fn) * 100) if (total_tp + total_fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    field_acc = (total_tp / (total_tp + total_fp + total_fn) * 100) if (total_tp + total_fp + total_fn) > 0 else 0.0

    p_low, p_high = wilson_score_interval(total_tp, total_tp + total_fp)
    r_low, r_high = wilson_score_interval(total_tp, total_tp + total_fn)
    acc_low, acc_high = wilson_score_interval(total_tp, total_tp + total_fp + total_fn)

    # Entity breakdowns
    categories = ["metadata", "diagnoses", "medications", "procedures", "physician_notes"]
    cat_metrics = {}
    for cat in categories:
        c_tp = sum(r["entity_breakdown"][cat]["tp"] for r in per_case_results)
        c_fp = sum(r["entity_breakdown"][cat]["fp"] for r in per_case_results)
        c_fn = sum(r["entity_breakdown"][cat]["fn"] for r in per_case_results)

        c_prec = (c_tp / (c_tp + c_fp) * 100) if (c_tp + c_fp) > 0 else 0.0
        c_rec = (c_tp / (c_tp + c_fn) * 100) if (c_tp + c_fn) > 0 else 0.0
        c_f1 = (2 * c_prec * c_rec / (c_prec + c_rec)) if (c_prec + c_rec) > 0 else 0.0
        c_acc = (c_tp / (c_tp + c_fp + c_fn) * 100) if (c_tp + c_fp + c_fn) > 0 else 0.0

        cat_metrics[cat] = {
            "tp": c_tp, "fp": c_fp, "fn": c_fn,
            "precision": round(c_prec, 2),
            "recall": round(c_rec, 2),
            "f1_score": round(c_f1, 2),
            "field_accuracy": round(c_acc, 2)
        }

    return {
        "counts": {
            "total_documents": len(per_case_results),
            "total_tp": total_tp,
            "total_fp": total_fp,
            "total_fn": total_fn
        },
        "overall_metrics": {
            "precision": round(precision, 2),
            "precision_ci": [p_low, p_high],
            "recall": round(recall, 2),
            "recall_ci": [r_low, r_high],
            "f1_score": round(f1, 2),
            "field_extraction_accuracy": round(field_acc, 2),
            "field_extraction_accuracy_ci": [acc_low, acc_high]
        },
        "category_metrics": cat_metrics
    }
