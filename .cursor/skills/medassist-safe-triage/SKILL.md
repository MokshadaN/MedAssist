---
name: medassist-safe-triage
description: Designs, implements, or reviews MedAssist symptom triage using patient-only input, deterministic emergency rules, extraction-only LLMs, calibrated clinical text classifiers, abstention, and clinician validation. Use when changing triage_service.py, urgency levels, red-flag detection, MedBERT, PubMedBERT, BioClinicalBERT, emergency routing, or triage tests.
---

# MedAssist Safe Triage Architecture

Treat urgency classification as safety-critical clinical decision support. The system may identify risk and recommend an evaluation timeframe, but it must not diagnose, prescribe, or claim clinical certainty.

## Non-negotiable boundaries

- Use only patient-authored messages as triage input. Never classify AI questions, generated summaries, or previous advisories.
- Keep an independent deterministic emergency path operating on raw patient text. Do not make emergency detection depend solely on an LLM or extracted fields.
- Account for negation, temporality, experiencer, severity, and symptom combinations. A raw substring match such as `chest pain` is insufficient.
- Limit LLMs to extracting explicitly stated facts. They must not choose urgency, diagnose, prescribe, or produce the final patient recommendation.
- Never translate malformed output, model failure, low confidence, or conflicting signals into `routine`.
- Provide an `abstain` or `review_required` outcome.
- Do not expose model-generated reasoning as medical fact.
- Do not log PHI, raw transcripts, model prompts, or extracted clinical facts in normal application logs.

## Target pipeline

Apply the following stages in order:

1. Build a transcript containing patient messages only.
2. Normalize text without removing clinically meaningful wording.
3. Run negation- and context-aware deterministic emergency rules against the raw patient text.
4. Extract explicit clinical facts into a validated schema.
5. Run a fine-tuned clinical text classifier that returns class probabilities.
6. Calibrate probabilities using held-out clinician-labelled data.
7. Apply a deterministic decision policy.
8. Attach hospitals only after the final level is `emergency`.

The extraction schema should include, when explicitly stated:

```json
{
  "symptoms": [],
  "severity": null,
  "duration": null,
  "trend": null,
  "functional_impairment": null,
  "associated_symptoms": [],
  "negated_symptoms": []
}
```

Reject additional diagnostic or treatment fields.

## Model selection

Do not assume a model is appropriate merely because it contains “medical” or “BERT” in its name.

- Standard Med-BERT is primarily intended for structured longitudinal EHR code sequences and is not the default for patient-authored narrative text.
- Prefer a narrative clinical encoder such as PubMedBERT or BioClinicalBERT when its licence and intended use are suitable.
- Fine-tune against MedAssist's exact labels: `emergency`, `urgent_care`, and `routine`.
- Use clinician-labelled, representative, de-identified examples.
- Return probabilities for every class; do not expose an uncalibrated argmax as a safe verdict.
- Record the model identifier, dataset version, calibration method, and threshold version in non-PHI decision metadata.

Do not enable a classifier for patient-facing decisions until it passes clinical evaluation. Before that point, run it only in shadow mode.

## Decision policy

Use an explicit, versioned policy. Thresholds must come from validation results rather than intuition.

```text
Confirmed emergency rule                 -> emergency
Emergency probability above threshold    -> emergency
Urgent-care probability above threshold  -> urgent_care
Calibrated routine with high confidence   -> routine
Low confidence, model failure, or conflict -> abstain
```

Rules may escalate a classifier result but must not silently downgrade an emergency signal. When rules and the classifier conflict, prefer the safer level or abstain according to the validated policy.

`abstain` must:

- continue collecting relevant intake information when safe;
- show neutral wording that the urgency could not be determined automatically;
- recommend review by an appropriate healthcare professional;
- avoid saying that the situation is safe or “not an emergency”;
- preserve an immediate emergency-services instruction for symptoms that worsen or appear life-threatening.

## MedAssist integration

Keep responsibilities separated:

- `services/triage_service.py`: orchestrate rules, extraction, classifier inference, calibration, decision policy, and hospital attachment.
- `services/session_service.py`: construct patient-only input and handle `emergency`, `urgent_care`, `routine`, and `abstain`.
- `utils/prompts.py`: contain extraction-only instructions with explicit no-diagnosis and no-urgency constraints.
- API schemas: expose stable decision fields without revealing chain-of-thought.

Use a result contract shaped like:

```json
{
  "level": "emergency | urgent_care | routine | abstain",
  "confidence": null,
  "decision_source": "rule | classifier | combined | fallback",
  "matched_rules": [],
  "review_required": false,
  "model_version": null,
  "policy_version": "string"
}
```

Retain `urgent` temporarily only when backward compatibility requires it, and define it as `level == "emergency"`.

## Implementation phases

Do not combine these phases into one production rollout.

### Phase 1: Safety foundation

- Isolate patient-authored messages.
- Replace substring-only rules with context-aware matching.
- Add `abstain` and fail-safe error handling.
- Change invalid model output and unavailable dependencies from `routine` to `abstain`.
- Add structured, non-PHI decision metadata.

### Phase 2: Extraction

- Introduce the validated extraction schema.
- Restrict the LLM to explicit fact extraction.
- Test negation, uncertainty, temporality, and attempts to inject instructions through patient text.

### Phase 3: Classifier experiment

- Define a clinician labelling guide before collecting labels.
- Split data by patient or encounter to prevent leakage.
- Fine-tune the selected clinical text encoder.
- Calibrate it on data excluded from training.
- Freeze the model, dataset, policy, and threshold versions for evaluation.

### Phase 4: Shadow deployment

- Run the classifier without changing patient-facing behavior.
- Store only the minimum approved audit metadata.
- Compare decisions with clinician review.
- Investigate disagreements, especially false-negative emergencies.

### Phase 5: Controlled activation

- Activate only after documented approval against predefined acceptance criteria.
- Use feature flags and a rapid rollback path.
- Monitor drift and safety metrics without storing unnecessary PHI.
- Revalidate after changing prompts, models, labels, rules, thresholds, or populations.

## Evaluation requirements

Mocked service tests verify branching but do not validate clinical performance. Maintain a separate de-identified clinical evaluation set and report:

- emergency sensitivity and false-negative rate;
- precision, recall, and confusion matrix for every level;
- calibration error and reliability by confidence band;
- abstention rate and performance on non-abstained cases;
- negation and contextual-language accuracy;
- subgroup performance across relevant ages, sex, language style, and symptom categories;
- robustness to misspellings, short answers, contradictory statements, and prompt injection.

Prioritize emergency sensitivity while measuring the cost of over-triage. Do not claim the system is safe from aggregate accuracy alone.

## Test cases

At minimum, cover:

- “I have chest pain” versus “I have no chest pain.”
- Historical or third-party symptoms versus current patient symptoms.
- Worsening fever with functional impairment.
- Mild stable symptoms.
- Conflicting emergency and routine signals.
- Empty, malformed, or low-confidence model output.
- Classifier timeout or unavailable model.
- AI advisory text appearing in session history but excluded from the next triage input.
- LLM output containing diagnosis, treatment, or urgency fields and being rejected.
- Emergency rules escalating a lower classifier result.

## Review checklist

- [ ] Patient-only input is demonstrated by tests.
- [ ] No LLM makes the final urgency decision.
- [ ] No component diagnoses or prescribes.
- [ ] Model or parsing failures abstain instead of defaulting to routine.
- [ ] Rules handle negation and context.
- [ ] Thresholds are linked to calibration evidence.
- [ ] Patient-facing activation is gated by clinical validation.
- [ ] Logs and telemetry avoid PHI.
- [ ] Model, policy, and threshold versions are auditable.
- [ ] Rollback behavior is documented and tested.
