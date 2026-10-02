"""Shadow-only interface for a future calibrated clinical text classifier.

No classifier is bundled or activated here. A validated adapter may be
injected later; its output is observed as metadata and never changes the
patient-facing decision while running in shadow mode.
"""

from dataclasses import dataclass
from typing import Literal, Protocol

from core.config import settings
from schemas.triage import TriageExtraction


@dataclass(frozen=True)
class ClassProbabilities:
    emergency: float
    urgent_care: float
    routine: float

    def __post_init__(self) -> None:
        values = (self.emergency, self.urgent_care, self.routine)
        if any(value < 0.0 or value > 1.0 for value in values):
            raise ValueError("Classifier probabilities must be between 0 and 1")
        if abs(sum(values) - 1.0) > 0.01:
            raise ValueError("Classifier probabilities must sum to 1")


@dataclass(frozen=True)
class ClassifierPrediction:
    probabilities: ClassProbabilities
    model_version: str


class ClinicalTriageClassifier(Protocol):
    def classify(
        self,
        patient_text: str,
        extracted_facts: TriageExtraction,
    ) -> ClassifierPrediction:
        """Return calibrated probabilities without making a policy decision."""


@dataclass(frozen=True)
class ShadowClassification:
    status: Literal["disabled", "unavailable", "completed", "failed"]
    model_version: str | None = None
    prediction: ClassifierPrediction | None = None


_shadow_classifier: ClinicalTriageClassifier | None = None


def run_shadow_classification(
    patient_text: str,
    extracted_facts: TriageExtraction,
) -> ShadowClassification:
    """Run an injected classifier without affecting the live triage result."""
    if not settings.triage_classifier_shadow_enabled:
        return ShadowClassification(status="disabled")
    if _shadow_classifier is None:
        return ShadowClassification(status="unavailable")

    try:
        prediction = _shadow_classifier.classify(patient_text, extracted_facts)
    except Exception:
        # Do not log text, extracted facts, or model output; those may contain PHI.
        return ShadowClassification(status="failed")

    return ShadowClassification(
        status="completed",
        model_version=prediction.model_version,
        prediction=prediction,
    )
