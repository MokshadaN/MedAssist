"""
Dedicated MedAssist + Groq Clinical Triage Benchmark Runner on 250 Clinical Vignettes.
Evaluates clinical safety, predictive efficacy, and latency percentiles on the
AHRQ Emergency Severity Index (ESI v4/v5) 250-Case Gold Standard.
"""

import json
import os
import sys
import time

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from triage_tests.statistical_metrics import compute_triage_metrics
from triage_tests.multi_model_evaluator import extract_facts_groq
from services.triage_service import _detect_emergency_rules, _detect_extracted_emergency, POLICY_VERSION

DATASET_PATH = os.path.join(os.path.dirname(__file__), "esi_250_benchmark_dataset.json")


def generate_groq_250_latex(metrics: dict, total_cases: int) -> str:
    s = metrics["safety_metrics"]
    l = metrics["latency_profile_ms"]
    cm = metrics["confusion_matrix"]
    em = metrics["emergency_cases"]
    nem = metrics["non_emergency_cases"]

    latex = rf"""% ==============================================================================
% Final Research Paper Table: MedAssist + Groq (Qwen-3.8-27B) Triage Benchmark
% Evaluated on AHRQ Emergency Severity Index (ESI v4/v5) Gold Standard (N={total_cases})
% ==============================================================================

\begin{{table*}}[htbp]
\centering
\small
\caption{{Empirical Clinical Triage Performance of MedAssist + Groq (Qwen-3.8-27B) on AHRQ ESI Cohort ($N={total_cases}$)}}
\label{{tab:groq_triage_250}}
\begin{{tabular}}{{l | c | c}}
\hline
\textbf{{Clinical Evaluation Metric}} & \textbf{{Value}} & \textbf{{95\% Wilson Confidence Interval}} \\
\hline
\textbf{{Emergency Sensitivity (Recall)}} & \textbf{{{s['sensitivity_pct']:.2f}\%}} & [{s['sensitivity_ci95'][0]:.2f}\%, {s['sensitivity_ci95'][1]:.2f}\%] \\
\textbf{{Critical Under-Triage Rate ($FN / P$)}} & \textbf{{{s['under_triage_rate_pct']:.2f}\%}} & [{s['under_triage_ci95'][0]:.2f}\%, {s['under_triage_ci95'][1]:.2f}\%] \\
\textbf{{Emergency Specificity}}          & \textbf{{{s['specificity_pct']:.2f}\%}} & [{s['specificity_ci95'][0]:.2f}\%, {s['specificity_ci95'][1]:.2f}\%] \\
\textbf{{Over-Triage Rate ($FP / N$)}}    & \textbf{{{s['over_triage_rate_pct']:.2f}\%}} & -- \\
\hline
\textbf{{Positive Predictive Value (PPV / Precision)}} & \textbf{{{s['precision_pct']:.2f}\%}} & -- \\
\textbf{{Clinical Safety F1-Score}}       & \textbf{{{s['f1_score']:.3f}}} & -- \\
\textbf{{Overall Classification Accuracy}} & \textbf{{{s['accuracy_pct']:.2f}\%}} & [{s['accuracy_ci95'][0]:.2f}\%, {s['accuracy_ci95'][1]:.2f}\%] \\
\hline
\multicolumn{{3}}{{l}}{{\textbf{{Latency Profile (End-to-End Inference)}}}} \\
\hline
Median Latency ($P_{{50}}$)               & \textbf{{{l['p50']:.1f} ms}} & -- \\
90th Percentile Latency ($P_{{90}}$)     & \textbf{{{l['p90']:.1f} ms}} & -- \\
95th Percentile Latency ($P_{{95}}$)     & \textbf{{{l['p95']:.1f} ms}} & -- \\
Mean Latency ($\pm$ SD)                  & \textbf{{{l['mean']:.1f} $\pm$ {l['std_dev']:.1f} ms}} & -- \\
\hline
\multicolumn{{3}}{{l}}{{\footnotesize Cohort Distribution: {em} True Emergencies (ESI 1--2) vs. {nem} Non-Emergencies (ESI 3--5).}} \\
\multicolumn{{3}}{{l}}{{\footnotesize Confusion Matrix: TP = {cm['true_positives']}, FP = {cm['false_positives']}, FN = {cm['false_negatives']}, TN = {cm['true_negatives']}.}} \\
\hline
\end{{tabular*}}
\end{{table*}}
"""
    return latex


def run_benchmark():
    print("=" * 80)
    print("  MEDASSIST + GROQ (QWEN-3.8-27B) CLINICAL TRIAGE BENCHMARK")
    print("  AHRQ Emergency Severity Index (ESI v4/v5) -- 250 Case Dataset")
    print("=" * 80)

    if not os.path.exists(DATASET_PATH):
        print(f"[ERROR] Dataset not found at: {DATASET_PATH}")
        return

    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        cases = json.load(f)

    total_cases = len(cases)
    emergencies = sum(1 for c in cases if c["ground_truth_emergency"])
    non_emergencies = total_cases - emergencies
    print(f"[+] Loaded {total_cases} clinical cases ({emergencies} Emergencies / {non_emergencies} Non-Emergencies).")

    # Initialize Groq
    from groq import Groq
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[ERROR] GROQ_API_KEY missing from environment.")
        return
    client = Groq(api_key=api_key)

    tp, fp, fn, tn = 0, 0, 0, 0
    latencies = []
    case_logs = []

    print("\nStarting evaluation run across 250 cases with live progress...")
    print("-" * 80)

    for i, case in enumerate(cases):
        text = case["vignette"]
        expected = case["ground_truth_emergency"]
        cid = case["id"]
        esi = f"ESI-{case['esi_level']}"

        start_t = time.perf_counter()
        
        # 1. Deterministic Fast-Path
        rule_match = _detect_emergency_rules(text)
        if rule_match:
            res = rule_match
        else:
            # 2. Groq LLM Semantic Extraction with retry on rate-limit
            max_retries = 3
            res = None
            for attempt in range(max_retries):
                try:
                    facts, model_ver = extract_facts_groq(client, text)
                    semantic_match = _detect_extracted_emergency(facts, model_ver)
                    if semantic_match:
                        res = semantic_match
                    else:
                        res = {
                            "urgent": False,
                            "level": "abstain",
                            "decision_source": "groq_extraction_only",
                            "matched_rules": [],
                            "model_version": model_ver,
                            "policy_version": POLICY_VERSION
                        }
                    break
                except Exception as exc:
                    if "rate_limit" in str(exc).lower() or "429" in str(exc):
                        time.sleep(2.0)
                    else:
                        time.sleep(0.5)
            
            if res is None:
                res = {
                    "urgent": False,
                    "level": "abstain",
                    "decision_source": "fallback_error",
                    "policy_version": POLICY_VERSION
                }

        elapsed_ms = (time.perf_counter() - start_t) * 1000
        latencies.append(elapsed_ms)

        pred_urgent = bool(res.get("urgent", False))

        if expected and pred_urgent:
            tp += 1
            status = "TP"
        elif not expected and not pred_urgent:
            tn += 1
            status = "TN"
        elif not expected and pred_urgent:
            fp += 1
            status = "FP"
        else:
            fn += 1
            status = "FN"

        case_logs.append({
            "id": cid,
            "esi_level": case["esi_level"],
            "expected_emergency": expected,
            "predicted_urgent": pred_urgent,
            "decision_source": res.get("decision_source"),
            "latency_ms": round(elapsed_ms, 1),
            "status": status,
        })

        # Periodic progress logging
        if (i + 1) % 10 == 0 or (i + 1) == total_cases:
            cur_sens = (tp / (tp + fn) * 100) if (tp + fn) > 0 else 0
            cur_spec = (tn / (tn + fp) * 100) if (tn + fp) > 0 else 0
            print(f"[{i+1:03d}/{total_cases:03d}] {cid} ({status:<2}) | Sens: {cur_sens:5.1f}% | Spec: {cur_spec:5.1f}% | Lat: {elapsed_ms:5.0f}ms", flush=True)

        # Gentle delay to honor Groq RPM limits
        time.sleep(0.05)

    # Compute Final Statistical Metrics
    metrics = compute_triage_metrics(tp, fp, fn, tn, latencies)
    s = metrics["safety_metrics"]
    l = metrics["latency_profile_ms"]

    print("\n" + "=" * 80)
    print("  FINAL 250-CASE BENCHMARK RESULTS (GROQ QWEN-3.8-27B)")
    print("=" * 80)
    print(f"Total Cohort Evaluated:           {total_cases}")
    print(f"Emergency Cases (ESI 1 & 2):      {emergencies}")
    print(f"Non-Emergency Cases (ESI 3,4,5):  {non_emergencies}")
    print("-" * 80)
    print(f"Emergency Sensitivity (Recall):   {s['sensitivity_pct']:.2f}%  [95% CI: {s['sensitivity_ci95'][0]:.2f}% - {s['sensitivity_ci95'][1]:.2f}%]")
    print(f"Emergency Specificity:            {s['specificity_pct']:.2f}%  [95% CI: {s['specificity_ci95'][0]:.2f}% - {s['specificity_ci95'][1]:.2f}%]")
    print(f"Critical Under-Triage Rate:       {s['under_triage_rate_pct']:.2f}%  [95% CI: {s['under_triage_ci95'][0]:.2f}% - {s['under_triage_ci95'][1]:.2f}%]")
    print(f"Over-Triage Rate (False Pos):     {s['over_triage_rate_pct']:.2f}%")
    print(f"Positive Predictive Value (PPV):  {s['precision_pct']:.2f}%")
    print(f"Safety F1-Score:                  {s['f1_score']:.3f}")
    print(f"Overall Classification Accuracy:  {s['accuracy_pct']:.2f}%  [95% CI: {s['accuracy_ci95'][0]:.2f}% - {s['accuracy_ci95'][1]:.2f}%]")
    print("-" * 80)
    print("  LATENCY METRICS")
    print(f"Median (P50):                     {l['p50']:.1f} ms")
    print(f"90th Percentile (P90):            {l['p90']:.1f} ms")
    print(f"95th Percentile (P95):            {l['p95']:.1f} ms")
    print(f"Mean (+/- SD):                    {l['mean']:.1f} +/- {l['std_dev']:.1f} ms")
    print("=" * 80)

    # Export Artifacts
    output_dir = os.path.dirname(DATASET_PATH)
    json_path = os.path.join(output_dir, "groq_250_evaluation_report.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"metrics": metrics, "cases": case_logs}, f, indent=2)

    tex_path = os.path.join(output_dir, "groq_250_research_tables.tex")
    latex_content = generate_groq_250_latex(metrics, total_cases)
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(latex_content)

    print(f"[SAVED] Final JSON Report: {json_path}")
    print(f"[SAVED] Paper LaTeX Table: {tex_path}")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    run_benchmark()
