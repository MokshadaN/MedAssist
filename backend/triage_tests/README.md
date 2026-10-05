# MedAssist Clinical Triage Evaluation Framework (AHRQ ESI Gold Standard)

This evaluation module benchmarks MedAssist's Triage Engine against the **Emergency Severity Index (ESI Version 4/5)** established by the **Agency for Healthcare Research and Quality (AHRQ)**.

## 1. Why AHRQ ESI Gold Standard?

In clinical informatics research (*JAMIA*, *Lancet Digital Health*, *CHIL*), evaluating medical triage requires:
1. **Clinical Ground Truth:** Expert consensus triage acuity ratings rather than synthetic disease-name proxies.
2. **Standardized Acuity Levels:**
   - **ESI 1 (Resuscitation):** Immediate life-saving intervention required (cardiac arrest, anaphylaxis, severe respiratory failure).
   - **ESI 2 (Emergent / High Risk):** High-risk situation, acute chest pain / ACS, acute stroke signs, severe pain (10/10), or acute suicidal ideation.
   - **ESI 3 (Urgent):** Stable patient requiring multiple hospital diagnostic/therapeutic resources.
   - **ESI 4 (Less Urgent):** Stable patient requiring a single resource (e.g. simple sutures, X-ray).
   - **ESI 5 (Non-Urgent):** Routine encounter requiring zero emergency resources (e.g. routine medication refills, suture removal).

## 2. Benchmark Dataset Structure (75 Standardized Clinical Cases)

The dataset in [`esi_benchmark_dataset.json`](./esi_benchmark_dataset.json) contains **75 standardized clinical cases** across all 5 acuity tiers:
- **ESI 1 (Resuscitation - 15 cases):** Immediate life-saving resuscitation required (cardiac arrest, anaphylaxis, severe tension pneumothorax, coma).
- **ESI 2 (Emergent / High Risk - 20 cases):** Acute coronary syndrome, stroke, thunderclap headache, active suicidal ideation, GI bleeding, testicular torsion.
- **ESI 3 (Urgent - 15 cases):** Stable multi-resource conditions (suspected appendicitis, kidney stone, pyelonephritis, DVT).
- **ESI 4 (Less Urgent - 13 cases):** Single-resource conditions (simple lacerations, sprained ankle, corneal abrasion).
- **ESI 5 (Non-Urgent - 12 cases):** Routine outpatient visits (suture removal, medication refills, preventative exams).

**Total:** 35 True Emergencies (ESI 1 & 2) and 40 Non-Emergencies (ESI 3, 4, 5).

## 3. How to Execute Evaluation

### Run Multi-Model Comparative Study (Rules vs. Groq vs. Gemini):
```bash
python triage_tests/multi_model_evaluator.py --sample-size 75
```

### Run Standard Benchmark on Any Sample Size:
```bash
python triage_tests/evaluate_triage.py --sample-size 75
```

### Outputs Generated:
- `triage_evaluation_report.json`: Machine-readable case-by-case audit log with decision sources and matched clinical concepts.
- `triage_evaluation_tables.tex`: Camera-ready LaTeX table for direct inclusion in academic research papers.
