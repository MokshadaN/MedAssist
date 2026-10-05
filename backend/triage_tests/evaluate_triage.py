"""
MedAssist Clinical Triage Evaluation Runner.
Benchmarks triage safety against the AHRQ Emergency Severity Index (ESI) Gold Standard.
Computes Wilson 95% Confidence Intervals, Under-triage/Over-triage rates, and LaTeX tables.
"""

import argparse
import json
import os
import sys
import time

# Ensure clean UTF-8 console output on Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Ensure backend root is in Python path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from triage_tests.statistical_metrics import compute_triage_metrics, generate_latex_table
from services.triage_service import detect_urgent_red_flags
from core.circuit_breaker import groq_breaker

DATASET_PATH = os.path.join(os.path.dirname(__file__), "esi_benchmark_dataset.json")


def load_esi_dataset(path: str = DATASET_PATH) -> list:
    if not os.path.exists(path):
        raise FileNotFoundError(f"ESI benchmark dataset not found at: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def run_evaluation(
    dataset_path: str = DATASET_PATH,
    export_latex: bool = True,
    output_prefix: str = "triage_evaluation",
    sample_size: int = None
):
    print("=" * 82)
    print("  MEDASSIST CLINICAL TRIAGE RESEARCH EVALUATION (AHRQ ESI BENCHMARK)")
    print("=" * 82)
    print(f"Benchmark Standard: AHRQ Emergency Severity Index (ESI v4/v5 Consensus)")
    print(f"Dataset Path:       {dataset_path}")
    print("-" * 82)

    all_cases = load_esi_dataset(dataset_path)
    if sample_size and sample_size < len(all_cases):
        cases = all_cases[:sample_size]
    else:
        cases = all_cases
    total_cases = len(cases)
    print(f"Loaded {total_cases} expert-adjudicated clinical vignettes across ESI Levels 1-5 (Total available: {len(all_cases)}).\n")

    tp, fp, fn, tn = 0, 0, 0, 0
    network_errors = 0
    latencies = []
    case_logs = []

    print(f"{'ID':<14} {'ESI':<5} {'Category':<22} {'Expected':<11} {'Predicted':<11} {'Latency':<9} {'Status'}")
    print("-" * 82)

    for case in cases:
        cid = case["id"]
        esi = f"ESI-{case['esi_level']}"
        cat = case.get("category", "")[:20]
        text = case["vignette"]
        expected_emergency = case["ground_truth_emergency"]

        # Track circuit breaker state prior to call
        breaker_was_open = groq_breaker.opened

        start_time = time.perf_counter()
        res = detect_urgent_red_flags(text)
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        latencies.append(elapsed_ms)

        pred_urgent = bool(res.get("urgent", False))
        decision_src = res.get("decision_source", "unknown")
        matched_rules = res.get("matched_rules", [])

        # Check for network circuit breaker trip
        if groq_breaker.opened and not breaker_was_open:
            network_errors += 1
            status_text = "WARN (Network Breaker Open)"
        elif expected_emergency and pred_urgent:
            tp += 1
            status_text = "PASS (True Positive)"
        elif not expected_emergency and not pred_urgent:
            tn += 1
            status_text = "PASS (True Negative)"
        elif not expected_emergency and pred_urgent:
            fp += 1
            status_text = "OVER-TRIAGE (False Positive)"
        else:  # expected_emergency and not pred_urgent
            fn += 1
            status_text = "CRITICAL UNDER-TRIAGE (False Negative)"

        exp_str = "EMERGENCY" if expected_emergency else "NON-EMERG"
        pred_str = "EMERGENCY" if pred_urgent else "NON-EMERG"
        print(f"{cid:<14} {esi:<5} {cat:<22} {exp_str:<11} {pred_str:<11} {elapsed_ms:6.1f}ms   {status_text}")

        case_logs.append({
            "id": cid,
            "esi_level": case["esi_level"],
            "category": case["category"],
            "vignette": text,
            "clinical_rationale": case["clinical_rationale"],
            "ground_truth_emergency": expected_emergency,
            "predicted_urgent": pred_urgent,
            "decision_source": decision_src,
            "matched_rules": matched_rules,
            "latency_ms": round(elapsed_ms, 2),
            "outcome": status_text,
        })
        time.sleep(0.3)

    # Compute Statistical Metrics with 95% Wilson Score Confidence Intervals
    metrics = compute_triage_metrics(tp, fp, fn, tn, latencies, network_errors)
    s = metrics["safety_metrics"]
    lat = metrics["latency_profile_ms"]

    print("\n" + "=" * 82)
    print("  EMPIRICAL CLINICAL SAFETY & STATISTICAL METRICS (95% WILSON SCORE CIs)")
    print("=" * 82)
    print(f"Total Vignettes Evaluated:        {metrics['sample_size']}")
    print(f"Emergency Cohort (ESI 1 & 2):     {metrics['emergency_cases']}")
    print(f"Non-Emergency Cohort (ESI 3,4,5): {metrics['non_emergency_cases']}")
    print("-" * 82)
    print(f"Emergency Sensitivity (Recall):   {s['sensitivity_pct']:.2f}%  [95% CI: {s['sensitivity_ci95'][0]:.2f}% - {s['sensitivity_ci95'][1]:.2f}%]")
    print(f"Emergency Specificity:            {s['specificity_pct']:.2f}%  [95% CI: {s['specificity_ci95'][0]:.2f}% - {s['specificity_ci95'][1]:.2f}%]")
    print(f"Critical Under-Triage Rate:       {s['under_triage_rate_pct']:.2f}%  [95% CI: {s['under_triage_ci95'][0]:.2f}% - {s['under_triage_ci95'][1]:.2f}%]")
    print(f"Over-Triage Rate:                 {s['over_triage_rate_pct']:.2f}%")
    print(f"Positive Predictive Value (PPV):  {s['precision_pct']:.2f}%")
    print(f"Safety F1-Score:                  {s['f1_score']:.3f}")
    print(f"Overall Classification Accuracy:  {s['accuracy_pct']:.2f}%  [95% CI: {s['accuracy_ci95'][0]:.2f}% - {s['accuracy_ci95'][1]:.2f}%]")
    print("-" * 82)
    print("  SYSTEM LATENCY PROFILE (Wall-Clock API Time)")
    print(f"Median Latency (P50):             {lat['p50']:.1f} ms")
    print(f"90th Percentile (P90):            {lat['p90']:.1f} ms")
    print(f"95th Percentile (P95):            {lat['p95']:.1f} ms")
    print(f"99th Percentile (P99):            {lat['p99']:.1f} ms")
    print(f"Mean Latency (+/- SD):            {lat['mean']:.1f} +/- {lat['std_dev']:.1f} ms")
    print("=" * 82)

    # Export Artifacts
    output_dir = os.path.dirname(dataset_path)
    json_path = os.path.join(output_dir, f"{output_prefix}_report.json")
    full_report = {
        "evaluation_standard": "AHRQ Emergency Severity Index (ESI v4/v5)",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "metrics": metrics,
        "case_level_results": case_logs,
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2)
    print(f"[SAVED] Machine-readable evaluation report: {json_path}")

    if export_latex:
        tex_path = os.path.join(output_dir, f"{output_prefix}_tables.tex")
        latex_content = generate_latex_table(metrics)
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(latex_content)
        print(f"[SAVED] Research paper LaTeX tables:       {tex_path}")

    print("=" * 82 + "\n")
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate MedAssist Triage on AHRQ ESI Gold Standard")
    parser.add_argument("--dataset", type=str, default=DATASET_PATH, help="Path to ESI benchmark dataset JSON")
    parser.add_argument("--no-latex", action="store_true", help="Skip LaTeX table export")
    parser.add_argument("--prefix", type=str, default="triage_evaluation", help="Output file prefix")
    parser.add_argument("--sample-size", type=int, default=75, help="Number of ESI vignettes to evaluate (max 75)")
    args = parser.parse_args()

    run_evaluation(
        dataset_path=args.dataset,
        export_latex=not args.no_latex,
        output_prefix=args.prefix,
        sample_size=args.sample_size
    )
