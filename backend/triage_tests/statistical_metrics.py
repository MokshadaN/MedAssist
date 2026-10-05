"""
Statistical Metrics Engine for Clinical Triage Evaluation.
Implements Wilson Score Confidence Intervals, Confusion Matrix Analysis,
and Latency Percentile Profiling according to Clinical Informatics Standards.
"""

import math
import statistics
from typing import Dict, List, Tuple, Any


def wilson_score_interval(successes: int, total: int, confidence: float = 0.95) -> Tuple[float, float]:
    """
    Calculate the Wilson score confidence interval for a binomial proportion.
    Standard for clinical epidemiology and medical AI evaluation.
    """
    if total == 0:
        return 0.0, 0.0

    # 1.96 for 95% confidence
    z = 1.95996 if confidence == 0.95 else 2.57583  # 99% fallback

    p_hat = successes / total
    z2 = z * z
    denom = 1.0 + z2 / total
    center = (p_hat + z2 / (2.0 * total)) / denom
    spread = (z / denom) * math.sqrt((p_hat * (1.0 - p_hat) / total) + (z2 / (4.0 * total * total)))

    lower = max(0.0, (center - spread) * 100.0)
    upper = min(100.0, (center + spread) * 100.0)
    return round(lower, 2), round(upper, 2)


def compute_triage_metrics(
    tp: int,
    fp: int,
    fn: int,
    tn: int,
    latencies: List[float],
    network_errors: int = 0
) -> Dict[str, Any]:
    """
    Compute comprehensive clinical safety, accuracy, and system latency metrics.
    """
    total = tp + fp + fn + tn
    total_emergencies = tp + fn
    total_non_emergencies = tn + fp

    # Point estimates
    sensitivity = (tp / total_emergencies * 100.0) if total_emergencies > 0 else 0.0
    specificity = (tn / total_non_emergencies * 100.0) if total_non_emergencies > 0 else 0.0
    under_triage = (fn / total_emergencies * 100.0) if total_emergencies > 0 else 0.0
    over_triage = (fp / total_non_emergencies * 100.0) if total_non_emergencies > 0 else 0.0
    precision = (tp / (tp + fp) * 100.0) if (tp + fp) > 0 else 0.0
    f1 = (2 * precision * sensitivity / (precision + sensitivity)) if (precision + sensitivity) > 0 else 0.0
    accuracy = ((tp + tn) / total * 100.0) if total > 0 else 0.0

    # 95% Wilson Score Confidence Intervals
    sens_ci = wilson_score_interval(tp, total_emergencies)
    spec_ci = wilson_score_interval(tn, total_non_emergencies)
    under_ci = wilson_score_interval(fn, total_emergencies)
    acc_ci = wilson_score_interval(tp + tn, total)

    # Latencies
    if latencies:
        sorted_lat = sorted(latencies)
        p50 = statistics.median(sorted_lat)
        p90 = sorted_lat[min(len(sorted_lat) - 1, int(len(sorted_lat) * 0.90))]
        p95 = sorted_lat[min(len(sorted_lat) - 1, int(len(sorted_lat) * 0.95))]
        p99 = sorted_lat[min(len(sorted_lat) - 1, int(len(sorted_lat) * 0.99))]
        mean_lat = statistics.mean(sorted_lat)
        std_lat = statistics.stdev(sorted_lat) if len(sorted_lat) > 1 else 0.0
    else:
        p50 = p90 = p95 = p99 = mean_lat = std_lat = 0.0

    return {
        "sample_size": total,
        "emergency_cases": total_emergencies,
        "non_emergency_cases": total_non_emergencies,
        "network_errors": network_errors,
        "confusion_matrix": {
            "true_positives": tp,
            "false_positives": fp,
            "false_negatives": fn,
            "true_negatives": tn,
        },
        "safety_metrics": {
            "sensitivity_pct": round(sensitivity, 2),
            "sensitivity_ci95": sens_ci,
            "specificity_pct": round(specificity, 2),
            "specificity_ci95": spec_ci,
            "under_triage_rate_pct": round(under_triage, 2),
            "under_triage_ci95": under_ci,
            "over_triage_rate_pct": round(over_triage, 2),
            "precision_pct": round(precision, 2),
            "f1_score": round(f1 / 100.0, 3),
            "accuracy_pct": round(accuracy, 2),
            "accuracy_ci95": acc_ci,
        },
        "latency_profile_ms": {
            "p50": round(p50, 1),
            "p90": round(p90, 1),
            "p95": round(p95, 1),
            "p99": round(p99, 1),
            "mean": round(mean_lat, 1),
            "std_dev": round(std_lat, 1),
        }
    }


def generate_latex_table(metrics: Dict[str, Any]) -> str:
    """Generate a camera-ready LaTeX table for academic research papers."""
    s = metrics["safety_metrics"]
    lat = metrics["latency_profile_ms"]
    cm = metrics["confusion_matrix"]

    latex = rf"""% =========================================================
% MedAssist Triage Performance on AHRQ ESI Gold Standard
% Generated automatically by MedAssist Triage Evaluation Suite
% =========================================================
\begin{{table}}[htbp]
\centering
\small
\caption{{Empirical Clinical Triage Evaluation on AHRQ ESI Gold Standard ($N={metrics['sample_size']}$)}}
\label{{tab:triage_performance}}
\begin{{tabular}}{{l c c}}
\hline
\textbf{{Metric}} & \textbf{{Value}} & \textbf{{95\% Wilson CI}} \\
\hline
Emergency Sensitivity (Recall) & {s['sensitivity_pct']:.2f}\% & [{s['sensitivity_ci95'][0]:.2f}\%, {s['sensitivity_ci95'][1]:.2f}\%] \\
Emergency Specificity          & {s['specificity_pct']:.2f}\% & [{s['specificity_ci95'][0]:.2f}\%, {s['specificity_ci95'][1]:.2f}\%] \\
Under-Triage Rate (False Neg)  & {s['under_triage_rate_pct']:.2f}\% & [{s['under_triage_ci95'][0]:.2f}\%, {s['under_triage_ci95'][1]:.2f}\%] \\
Over-Triage Rate (False Pos)   & {s['over_triage_rate_pct']:.2f}\% & -- \\
Precision (Positive Predictive) & {s['precision_pct']:.2f}\% & -- \\
Safety F1-Score                & {s['f1_score']:.3f} & -- \\
Overall Classification Accuracy & {s['accuracy_pct']:.2f}\% & [{s['accuracy_ci95'][0]:.2f}\%, {s['accuracy_ci95'][1]:.2f}\%] \\
\hline
\multicolumn{{3}}{{l}}{{\textbf{{System Latency Profile (End-to-End API)}}}} \\
\hline
Median Latency (P50)           & {lat['p50']:.1f} ms & -- \\
95th Percentile (P95)          & {lat['p95']:.1f} ms & -- \\
99th Percentile (P99)          & {lat['p99']:.1f} ms & -- \\
Mean Latency ($\pm$ SD)        & {lat['mean']:.1f} $\pm$ {lat['std_dev']:.1f} ms & -- \\
\hline
\multicolumn{{3}}{{l}}{{\footnotesize Confusion Matrix: TP={cm['true_positives']}, FP={cm['false_positives']}, FN={cm['false_negatives']}, TN={cm['true_negatives']}}} \\
\hline
\end{{tabular}}
\end{{table}}
"""
    return latex.strip()
