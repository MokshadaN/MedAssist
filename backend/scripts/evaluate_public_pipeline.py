"""
MedAssist Dynamic Public Dataset Triage Benchmark Runner.
Evaluates triage safety, recall, under-triage rate, specificity, and latency percentiles
against public medical datasets without any hardcoded cases.
"""

import argparse
import json
import os
import random
import statistics
import sys
import time

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scripts.public_dataset_loader import load_symptom2diagnosis
from services.triage_service import detect_urgent_red_flags


def run_benchmark(sample_size: int = 40, split: str = "test", seed: int = 42, force_refresh: bool = False):
    print("=" * 80)
    print("[+] MEDASSIST PUBLIC DATASET TRIAGE SAFETY & ACCURACY BENCHMARK")
    print("=" * 80)
    print(f"Dataset: HuggingFace (gretelai/symptom_to_diagnosis) | Split: {split}")
    print(f"Sample Size: {sample_size} cases | Random Seed: {seed}")
    print("-" * 80)

    # 1. Load public dataset
    cases = load_symptom2diagnosis(split=split, force_refresh=force_refresh)
    if not cases:
        print("[ERROR] No cases loaded from public dataset.")
        return

    random.seed(seed)
    sample_cases = random.sample(cases, min(sample_size, len(cases)))

    tp, fp, fn, tn = 0, 0, 0, 0
    latencies = []
    case_results = []

    print("\nEvaluating cases through MedAssist Triage Pipeline...")
    print(f"{'ID':<10} {'Diagnosis':<22} {'Expected':<11} {'Predicted':<11} {'Latency':<9} {'Status'}")
    print("-" * 80)

    for case in sample_cases:
        text = case["text"]
        is_ground_emergency = case["expected_emergency"]
        diagnosis = case["diagnosis"]
        case_id = case["id"]

        start_time = time.perf_counter()
        res = detect_urgent_red_flags(text)
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        latencies.append(elapsed_ms)

        pred_urgent = bool(res.get("urgent", False))
        pred_level = res.get("level", "routine")
        matched_rules = res.get("matched_rules", [])

        # Confusion Matrix Logic
        if is_ground_emergency and pred_urgent:
            tp += 1
            status_text = "PASS (TP)"
        elif not is_ground_emergency and not pred_urgent:
            tn += 1
            status_text = "PASS (TN)"
        elif not is_ground_emergency and pred_urgent:
            fp += 1
            status_text = "OVER-TRIAGE (FP)"
        else:  # is_ground_emergency and not pred_urgent
            fn += 1
            status_text = "UNDER-TRIAGE (FN) [CRITICAL]"

        case_results.append({
            "id": case_id,
            "diagnosis": diagnosis,
            "symptoms": text,
            "expected_emergency": is_ground_emergency,
            "predicted_urgent": pred_urgent,
            "predicted_level": pred_level,
            "matched_rules": matched_rules,
            "latency_ms": round(elapsed_ms, 2),
            "status": status_text,
        })

        exp_str = "EMERGENCY" if is_ground_emergency else "ROUTINE"
        pred_str = "EMERGENCY" if pred_urgent else "ROUTINE"
        print(f"{case_id:<10} {diagnosis[:20]:<22} {exp_str:<11} {pred_str:<11} {elapsed_ms:6.1f}ms   {status_text}")

    # Calculate Statistical & Safety Metrics
    total = tp + fp + fn + tn
    sensitivity = (tp / (tp + fn)) * 100 if (tp + fn) > 0 else 0.0
    specificity = (tn / (tn + fp)) * 100 if (tn + fp) > 0 else 0.0
    under_triage_rate = (fn / (tp + fn)) * 100 if (tp + fn) > 0 else 0.0
    over_triage_rate = (fp / (fp + tn)) * 100 if (fp + tn) > 0 else 0.0
    precision = (tp / (tp + fp)) * 100 if (tp + fp) > 0 else 0.0
    f1_score = (2 * precision * sensitivity) / (precision + sensitivity) if (precision + sensitivity) > 0 else 0.0
    accuracy = ((tp + tn) / total) * 100 if total > 0 else 0.0

    latencies.sort()
    p50 = statistics.median(latencies)
    p90 = latencies[int(len(latencies) * 0.90)]
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]
    mean_lat = statistics.mean(latencies)

    print("\n" + "=" * 80)
    print("[REPORT] EMPIRICAL RESEARCH RESULTS ON PUBLIC BENCHMARK")
    print("=" * 80)
    print(f"Total Cases Evaluated:            {total}")
    print(f"Emergency Sensitivity (Recall):   {sensitivity:.2f}%  (Target: >= 98.00%)")
    print(f"Emergency Specificity:            {specificity:.2f}%  (Target: >= 85.00%)")
    print(f"Critical Under-Triage Rate:       {under_triage_rate:.2f}%  (Safety Target: <= 2.00%)")
    print(f"Over-Triage Rate (False Pos):     {over_triage_rate:.2f}%")
    print(f"Precision:                        {precision:.2f}%")
    print(f"F1-Score:                         {f1_score/100:.3f}")
    print(f"Overall Accuracy:                 {accuracy:.2f}%")
    print("-" * 80)
    print("[LATENCY] SYSTEM LATENCY PROFILE")
    print(f"Mean Latency:                     {mean_lat:.1f} ms")
    print(f"Median (P50):                     {p50:.1f} ms")
    print(f"90th Percentile (P90):            {p90:.1f} ms")
    print(f"95th Percentile (P95):            {p95:.1f} ms")
    print(f"99th Percentile (P99):            {p99:.1f} ms")
    print("=" * 80)

    # Export JSON Artifact
    output_dir = os.path.join(os.path.dirname(__file__), "..", "data", "public_cache")
    os.makedirs(output_dir, exist_ok=True)
    report_file = os.path.join(output_dir, "evaluation_report_public.json")

    report_payload = {
        "benchmark_metadata": {
            "dataset_source": "Symptom2Disease Public Clinical Dataset",
            "total_sample_cases": total,
            "random_seed": seed,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        "safety_metrics": {
            "sensitivity_pct": round(sensitivity, 2),
            "specificity_pct": round(specificity, 2),
            "under_triage_rate_pct": round(under_triage_rate, 2),
            "over_triage_rate_pct": round(over_triage_rate, 2),
            "precision_pct": round(precision, 2),
            "f1_score": round(f1_score / 100, 3),
            "accuracy_pct": round(accuracy, 2),
        },
        "latency_metrics": {
            "p50_ms": round(p50, 1),
            "p90_ms": round(p90, 1),
            "p95_ms": round(p95, 1),
            "p99_ms": round(p99, 1),
            "mean_ms": round(mean_lat, 1),
        },
        "confusion_matrix": {
            "true_positives": tp,
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
        },
        "sample_case_results": case_results,
    }

    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report_payload, f, indent=2)

    print(f"[SAVED] Machine-readable report saved to: {report_file}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate MedAssist Triage on Public Datasets")
    parser.add_argument("--sample-size", type=int, default=30, help="Number of public cases to evaluate")
    parser.add_argument("--split", type=str, default="test", choices=["train", "test"], help="Dataset split")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for repeatable sampling")
    parser.add_argument("--force-refresh", action="store_true", help="Force redownload from public URL")
    args = parser.parse_args()

    run_benchmark(sample_size=args.sample_size, split=args.split, seed=args.seed, force_refresh=args.force_refresh)
