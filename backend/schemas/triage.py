"""Pydantic triage schemas."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from schemas.session import EmergencyHospital


class TriageRequest(BaseModel):
    transcript: str


SafetyConcept = Literal[
    "chest_pain_or_tightness",
    "breathing_difficulty",
    "coughing_or_vomiting_blood",
    "severe_or_uncontrolled_bleeding",
    "fainting_unconscious_or_collapse",
    "seizure",
    "new_weakness_numbness_or_inability_to_move",
    "confusion_or_slurred_speech",
    "severe_head_injury",
    "worst_or_extreme_pain",
    "severe_allergic_reaction",
    "choking",
    "overdose_or_poisoning",
    "suicidal_or_homicidal_intent",
]


class TriageExtraction(BaseModel):
    """Explicit facts only; urgency, diagnosis, and treatment are forbidden."""

    symptoms: list[str] = Field(default_factory=list)
    severity: Literal["mild", "moderate", "severe"] | None = None
    duration: str | None = None
    trend: Literal["worsening", "improving", "stable"] | None = None
    functional_impairment: bool | None = None
    associated_symptoms: list[str] = Field(default_factory=list)
    negated_symptoms: list[str] = Field(default_factory=list)
    present_safety_concepts: list[SafetyConcept] = Field(default_factory=list)
    negated_safety_concepts: list[SafetyConcept] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def reject_conflicting_safety_concepts(self):
        conflicts = set(self.present_safety_concepts) & set(
            self.negated_safety_concepts
        )
        if conflicts:
            raise ValueError("Safety concepts cannot be both present and negated")
        return self


class TriageOut(BaseModel):
    urgent: bool
    level: str
    reason: str = ""
    matched_terms: list[str] = Field(default_factory=list)
    matched_rules: list[str] = Field(default_factory=list)
    confidence: float | None = None
    decision_source: str
    review_required: bool = False
    model_version: str | None = None
    policy_version: str
    shadow_classifier_status: str | None = None
    shadow_model_version: str | None = None
    nearest_hospitals: list[EmergencyHospital] = Field(default_factory=list)
    emergency_message: str | None = None