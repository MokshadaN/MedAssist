"""
MedAssist Research Evaluation Suite
Automatically benchmarks:
1. Deterministic & AI Triage Safety (Sensitivity, Specificity, Under-Triage Rate)
2. Latency Percentiles (p50, p95, p99, Mean)
3. Confusion Matrix Breakdown
"""

import time
import json
import statistics
import urllib.request
import urllib.parse
import urllib.error

API_BASE = "http://127.0.0.1:8000/api/v1"

# -------------------------------------------------------------
# 1. GROUND TRUTH TRIAGE BENCHMARK DATASET
# -------------------------------------------------------------
BENCHMARK_CASES = [
    # EMERGENCY / RED-FLAG CASES (Ground truth: emergency)
    {
        "id": "EM-01",
        "transcript": "I feel a severe crushing chest pain with radiating pain down my left arm.",
        "expected_tier": "emergency",
        "expected_urgent": True
    },
    {
        "id": "EM-02",
        "transcript": "My mother suddenly has slurred speech and numbness on one side of her face.",
        "expected_tier": "emergency",
        "expected_urgent": True
    },
    {
        "id": "EM-03",
        "transcript": "My child is gasping for breath and cannot breathe.",
        "expected_tier": "emergency",
        "expected_urgent": True
    },
    {
        "id": "EM-04",
        "transcript": "I have sudden severe worst pain of my life in my head with stiff neck.",
        "expected_tier": "emergency",
        "expected_urgent": True
    },
    {
        "id": "EM-05",
        "transcript": "I am coughing up blood and feeling like fainting.",
        "expected_tier": "emergency",
        "expected_urgent": True
    },
    {
        "id": "EM-06",
        "transcript": "He is having a severe seizure and is unconscious.",
        "expected_tier": "emergency",
        "expected_urgent": True
    },
    {
        "id": "EM-07",
        "transcript": "Deep wound that will not stop bleeding with heavy bleeding.",
        "expected_tier": "emergency",
        "expected_urgent": True
    },

    # NON-EMERGENCY / ROUTINE / URGENT (Ground truth: not emergency)
    {
        "id": "NE-01",
        "transcript": "Mild runny nose, sneezing, and slight sore throat for 2 days. No chest pain and no shortness of breath.",
        "expected_tier": "routine",
        "expected_urgent": False
    },
    {
        "id": "NE-02",
        "transcript": "Need a routine prescription refill for my daily Metformin and Amlodipine. Feeling fine.",
        "expected_tier": "routine",
        "expected_urgent": False
    },
    {
        "id": "NE-03",
        "transcript": "Mild dry skin patch on my elbow that has been slightly itchy for two weeks.",
        "expected_tier": "routine",
        "expected_urgent": False
    },
    {
        "id": "NE-04",
        "transcript": "Occasional mild tension headache after staring at my computer screen all day. Denies worst pain.",
        "expected_tier": "routine",
        "expected_urgent": False
    },
    {
        "id": "NE-05",
        "transcript": "Mild knee stiffness in the morning that goes away after walking a bit.",
        "expected_tier": "routine",
        "expected_urgent": False
    },
]

def login():
    url = f"{API_BASE}/auth/login"
    post_data = urllib.parse.urlencode({"username": "jane.doe@example.com", "password": "password123"}).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=post_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode('utf-8'))
        return data.get("access_token")

def make_post_request(endpoint: str, payload: dict, token: str):
    url = f"{API_BASE}{endpoint}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    start_time = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = response.read().decode('utf-8')
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            return json.loads(res_data), elapsed_ms, response.status
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        return {"error": str(e)}, elapsed_ms, 500

def evaluate():
    print("=" * 75)
    print("🏥 MEDASSIST COMPREHENSIVE SYSTEM EVALUATION BENCHMARK")
    print("=" * 75)

    print("Authenticating with live backend...")
    token = login()
    if not token:
        print("[ERROR] Failed to obtain authentication token.")
        return

    print("Authentication successful. Running triage benchmark cases...\n")

    latencies = []
    tp, fp, fn, tn = 0, 0, 0, 0
    results_log = []

    for case in BENCHMARK_CASES:
        payload = {"transcript": case["transcript"]}
        res, latency_ms, status = make_post_request("/triage/analyze", payload, token)
        latencies.append(latency_ms)

        pred_urgent = bool(res.get("urgent", False))
        pred_level = res.get("level", "routine")
        matched_rules = res.get("matched_rules", [])

        is_ground_emergency = case["expected_urgent"]

        # Confusion Matrix Logic
        if is_ground_emergency and pred_urgent:
            tp += 1
            outcome = "[PASS] True Positive (Emergency Identified)"
        elif not is_ground_emergency and not pred_urgent:
            tn += 1
            outcome = "[PASS] True Negative (Safe Non-Emergency)"
        elif not is_ground_emergency and pred_urgent:
            fp += 1
            outcome = "[WARN] False Positive (Over-Triage)"
        else: # is_ground_emergency and not pred_urgent
            fn += 1
            outcome = "[FAIL] False Negative (UNDER-TRIAGE CRITICAL)"

        results_log.append({
            "case_id": case["id"],
            "expected_urgent": is_ground_emergency,
            "pred_urgent": pred_urgent,
            "pred_level": pred_level,
            "matched_rules": matched_rules,
            "latency_ms": round(latency_ms, 2),
            "status": outcome
        })

        rule_info = f"({', '.join(matched_rules[:2])})" if matched_rules else ""
        print(f"[{case['id']}] Expected: {'EMERGENCY' if is_ground_emergency else 'ROUTINE':<10} | Pred: {'EMERGENCY' if pred_urgent else 'ROUTINE':<10} | {latency_ms:6.1f}ms | {outcome} {rule_info}")

    # Calculate Statistical Metrics
    total = len(BENCHMARK_CASES)
    sensitivity = (tp / (tp + fn)) * 100 if (tp + fn) > 0 else 0
    specificity = (tn / (tn + fp)) * 100 if (tn + fp) > 0 else 0
    under_triage_rate = (fn / (tp + fn)) * 100 if (tp + fn) > 0 else 0
    over_triage_rate = (fp / (fp + tn)) * 100 if (fp + tn) > 0 else 0
    precision = (tp / (tp + fp)) * 100 if (tp + fp) > 0 else 0
    f1_score = (2 * precision * sensitivity) / (precision + sensitivity) if (precision + sensitivity) > 0 else 0
    overall_accuracy = ((tp + tn) / total) * 100

    latencies.sort()
    p50 = statistics.median(latencies)
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]
    mean_lat = statistics.mean(latencies)

    print("\n" + "=" * 75)
    print("📊 EMPIRICAL EVALUATION RESULTS FOR RESEARCH PAPER")
    print("=" * 75)
    print(f"Total Test Cases Evaluated:       {total}")
    print(f"Emergency Sensitivity (Recall):   {sensitivity:.2f}%  (Clinical Safety Goal: 100.00%)")
    print(f"Emergency Specificity:            {specificity:.2f}%")
    print(f"Under-Triage Rate (False Neg):    {under_triage_rate:.2f}%  (Clinical Safety Goal: 0.00%)")
    print(f"Over-Triage Rate (False Pos):     {over_triage_rate:.2f}%")
    print(f"Safety F1-Score:                  {f1_score/100:.3f}")
    print(f"Overall Classification Accuracy:  {overall_accuracy:.2f}%")
    print("-" * 75)
    print("⚡ SYSTEM LATENCY BENCHMARKS (End-to-End API)")
    print(f"Mean Latency:                     {mean_lat:.1f} ms")
    print(f"Median Latency (p50):             {p50:.1f} ms")
    print(f"95th Percentile (p95):            {p95:.1f} ms")
    print(f"99th Percentile (p99):            {p99:.1f} ms")
    print("=" * 75)

    eval_artifact = {
        "metrics": {
            "total_cases": total,
            "sensitivity_pct": round(sensitivity, 2),
            "specificity_pct": round(specificity, 2),
            "under_triage_rate_pct": round(under_triage_rate, 2),
            "over_triage_rate_pct": round(over_triage_rate, 2),
            "f1_score": round(f1_score / 100, 3),
            "accuracy_pct": round(overall_accuracy, 2),
            "latency_p50_ms": round(p50, 1),
            "latency_p95_ms": round(p95, 1),
            "latency_p99_ms": round(p99, 1),
            "latency_mean_ms": round(mean_lat, 1)
        },
        "confusion_matrix": {
            "true_positives": tp,
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn
        },
        "case_details": results_log
    }

    with open("evaluation_report.json", "w", encoding="utf-8") as f:
        json.dump(eval_artifact, f, indent=2)
    print("💾 Evaluation artifact generated at: backend/evaluation_report.json\n")

if __name__ == "__main__":
    evaluate()
