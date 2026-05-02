# -*- coding: utf-8 -*-
import io
import sys
import json
import time
import numpy as np
from huggingface_hub import InferenceClient
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HF_TOKEN = os.environ.get("HF_TOKEN", "")
MODEL_ID = "NeuML/pubmedbert-base-embeddings" 
THRESHOLD = 0.65  # Lowered for better recall on clinical synonyms

DRUG_DATABASE = [
    {
        "name": "Metformin",
        "category": "Antidiabetic",
        "side_effects": ["nausea", "diarrhea", "dizziness", "stomach pain", "loss of appetite"],
    },
    {
        "name": "Warfarin",
        "category": "Anticoagulant",
        "side_effects": ["bleeding", "bruising", "hair loss", "stomach pain", "vomiting blood"],
    },
    {
        "name": "Lisinopril",
        "category": "ACE Inhibitor",
        "side_effects": ["dry cough", "dizziness", "headache", "fatigue", "high potassium"],
    },
]

client = InferenceClient(api_key=HF_TOKEN)

def get_embedding(text: str, retries: int = 5) -> np.ndarray:
    for attempt in range(1, retries + 1):
        try:
            output = client.feature_extraction(text, model=MODEL_ID)
            arr = np.array(output)
            if arr.ndim == 2: return arr[0]
            if arr.ndim == 3: return arr[0][0]
            return arr
        except Exception as e:
            if "503" in str(e) or "loading" in str(e).lower():
                time.sleep(20)
            else:
                if attempt < retries: time.sleep(5)
                else: raise e
    raise RuntimeError("Failed after maximum retries.")

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0: return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

def main():
    print("=" * 60)
    print("  MedAssist - Medical BERT Semantic Risk Trial")
    print(f"  Model: {MODEL_ID} | Threshold: {THRESHOLD}")
    print("=" * 60)

    cache = {}
    print("\n[*] Pre-computing side-effects...")
    for drug in DRUG_DATABASE:
        name = drug["name"]
        cache[name] = []
        for effect in drug["side_effects"]:
            emb = get_embedding(effect)
            cache[name].append({"effect": effect, "embedding": emb})
    
    trial_cases = [
        {"drug": "Metformin", "symptoms": ["vertigo", "upset stomach", "feeling sick"]},
        {"drug": "Warfarin", "symptoms": ["hemorrhage", "skin bruising", "hair thinning"]},
        {"drug": "Lisinopril", "symptoms": ["persistent cough", "lightheadedness", "tiredness"]}
    ]

    for case in trial_cases:
        name = case["drug"]
        symptoms = case["symptoms"]
        print(f"\n[RUN] Analyzing {name} for {symptoms}")
        
        for symptom in symptoms:
            sym_emb = get_embedding(symptom)
            for entry in cache[name]:
                score = cosine_similarity(sym_emb, entry["embedding"])
                if score >= THRESHOLD:
                    print(f"  MATCH: '{symptom}' -> '{entry['effect']}' ({round(score, 4)})")

    print("\n[FINISH] Trial complete.")

if __name__ == "__main__":
    main()
