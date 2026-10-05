"""Download and prepare public clinical document benchmark datasets.

Datasets:
1. Noisy Medical Document Images (HuggingFace: hmnshudhmn24/noisy-medical-document-images-ocr)
   - Modality: Scanned Hospital Discharge Summaries
   - Ground Truth: Diagnoses, ICD-10, Medications, Procedures, Hospital Course
2. ClinOCR-Bench (HuggingFace: ianua/ClinOCR-Bench, arXiv:2607.03650)
   - Modality: Scanned Clinical Forms and Tabular Diagnostic Reports
   - Ground Truth: Audited clinical entities, patient history, lab values
3. Medical Prescription Dataset (HuggingFace: chinmays18/medical-prescription-dataset)
   - Modality: Clinical Prescription Documents
   - Ground Truth: Prescribed medications, dosages, directions, physician & patient metadata
"""

from __future__ import annotations

import csv
import io
import json
import os
import re
import sys
import urllib.request
from pathlib import Path
import pyarrow.parquet as pq

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

EVAL_DIR = Path(__file__).resolve().parent
DATA_DIR = EVAL_DIR / "benchmark_data"
IMAGES_DIR = DATA_DIR / "images"
ANNOTATIONS_FILE = DATA_DIR / "ground_truth_manifest.json"

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}


def download_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def setup_directories():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)


def fetch_discharge_summaries(target_count: int = 20) -> list[dict]:
    """Fetch discharge summary images and ground truth from hmnshudhmn24/noisy-medical-document-images-ocr."""
    print(f"\n[1/3] Downloading {target_count} Discharge Summaries from hmnshudhmn24/noisy-medical-document-images-ocr...")
    csv_url = "https://huggingface.co/datasets/hmnshudhmn24/noisy-medical-document-images-ocr/raw/main/discharge_summaries_ground_truth.csv"
    raw_csv = download_bytes(csv_url).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(raw_csv))

    samples = []
    for idx, row in enumerate(reader):
        if idx >= target_count:
            break
        fn = row["filename"]
        raw_json = json.loads(row["json_data"])

        # Download image
        img_url = f"https://huggingface.co/datasets/hmnshudhmn24/noisy-medical-document-images-ocr/resolve/main/discharge_summaries/{fn}"
        img_dest = IMAGES_DIR / fn
        if not img_dest.exists():
            img_data = download_bytes(img_url)
            img_dest.write_bytes(img_data)

        # Normalize ground truth entities
        # 1. Diagnoses
        diagnoses = []
        if raw_json.get("diagnosis"):
            diagnoses.append({
                "condition": raw_json["diagnosis"],
                "icd_10": raw_json.get("icd_10", "")
            })

        # 2. Medications
        medications = []
        for m in raw_json.get("medications", []):
            medications.append({"raw_text": m})

        # 3. Procedures / Lab tests
        procedures = []
        for p in raw_json.get("procedures", []):
            procedures.append({
                "name": p.get("desc", ""),
                "code": p.get("cpt", "")
            })

        # 4. Physician notes / hospital course
        physician_notes = raw_json.get("hospital_course", "")

        # 5. Metadata
        patient = raw_json.get("patient", {})
        hospital = raw_json.get("hospital", {})

        manifest_item = {
            "id": f"DS-{idx+1:03d}",
            "source_dataset": "noisy-medical-document-images-ocr",
            "document_type": "Discharge Summary",
            "image_filename": fn,
            "local_image_path": str(img_dest),
            "ground_truth": {
                "patient_name": patient.get("name", ""),
                "dob": patient.get("dob", ""),
                "mrn": patient.get("mrn", ""),
                "facility": hospital.get("name", ""),
                "diagnoses": diagnoses,
                "medications": medications,
                "procedures": procedures,
                "physician_notes": physician_notes
            }
        }
        samples.append(manifest_item)
        print(f"  ✓ Processed Discharge Summary {manifest_item['id']} ({fn})")

    return samples


def fetch_clinocr_reports(target_count: int = 15) -> list[dict]:
    """Fetch clinical forms & tabular reports from ianua/ClinOCR-Bench."""
    print(f"\n[2/3] Downloading {target_count} Clinical Tabular Reports from ianua/ClinOCR-Bench...")
    parquet_url = "https://huggingface.co/datasets/ianua/ClinOCR-Bench/resolve/main/tables/test-00000-of-00001.parquet"
    parquet_bytes = download_bytes(parquet_url)
    table = pq.read_table(io.BytesIO(parquet_bytes))

    samples = []
    for idx in range(min(target_count, len(table))):
        doc_id = table["doc_id"][idx].as_py()
        gt_text = table["ground_truth"][idx].as_py()
        img_dict = table["image"][idx].as_py()
        img_bytes = img_dict["bytes"]

        img_fn = f"clinocr_table_{doc_id}.png"
        img_dest = IMAGES_DIR / img_fn
        img_dest.write_bytes(img_bytes)

        # Parse entities from ground truth text
        # Extract patient metadata, ICD-10 diagnoses, and clinical findings
        diagnoses = []
        for line in gt_text.splitlines():
            # Check for patterns like "Rheumatoid Arthritis (ICD-10: M06.9)"
            match = re.search(r"([A-Za-z\s,]+)\s*\(ICD-10:\s*([A-Z0-9.]+)\)", line)
            if match:
                diagnoses.append({
                    "condition": match.group(1).strip(),
                    "icd_10": match.group(2).strip()
                })

        # Extract patient name & MRN if present
        patient_name = ""
        name_match = re.search(r"Patient:\s*([A-Za-z\s.]+?)(?:\s{2,}|DOB:|$)", gt_text)
        if name_match:
            patient_name = name_match.group(1).strip()

        mrn = ""
        mrn_match = re.search(r"MRN:\s*([A-Za-z0-9-]+)", gt_text)
        if mrn_match:
            mrn = mrn_match.group(1).strip()

        facility = ""
        lines = [l.strip() for l in gt_text.splitlines() if l.strip()]
        if lines:
            facility = lines[0]

        manifest_item = {
            "id": f"CLINOCR-{idx+1:03d}",
            "source_dataset": "ClinOCR-Bench",
            "document_type": "Clinical Tabular Report",
            "image_filename": img_fn,
            "local_image_path": str(img_dest),
            "ground_truth": {
                "patient_name": patient_name,
                "dob": "",
                "mrn": mrn,
                "facility": facility,
                "diagnoses": diagnoses,
                "medications": [],
                "procedures": [],
                "physician_notes": gt_text[:300]
            }
        }
        samples.append(manifest_item)
        print(f"  ✓ Processed ClinOCR Case {manifest_item['id']} ({doc_id})")

    return samples


def fetch_prescriptions(target_count: int = 15) -> list[dict]:
    """Fetch prescription images and annotations from chinmays18/medical-prescription-dataset."""
    print(f"\n[3/3] Downloading {target_count} Clinical Prescriptions from chinmays18/medical-prescription-dataset...")
    api_url = "https://huggingface.co/api/datasets/chinmays18/medical-prescription-dataset"
    raw_api = json.loads(download_bytes(api_url).decode("utf-8"))

    siblings = raw_api.get("siblings", [])
    annot_files = [s["rfilename"] for s in siblings if s["rfilename"].startswith("test/annotations/")]
    annot_files.sort()

    samples = []
    for idx, afn in enumerate(annot_files[:target_count]):
        # Read annotation
        annot_url = f"https://huggingface.co/datasets/chinmays18/medical-prescription-dataset/raw/main/{afn}"
        annot_json = json.loads(download_bytes(annot_url).decode("utf-8"))
        gt_raw = annot_json.get("ground_truth", "")

        # Target image filename
        base_name = Path(afn).stem
        img_rel = f"test/images/{base_name}.png"
        img_url = f"https://huggingface.co/datasets/chinmays18/medical-prescription-dataset/resolve/main/{img_rel}"
        img_dest = IMAGES_DIR / f"{base_name}.png"
        if not img_dest.exists():
            img_dest.write_bytes(download_bytes(img_url))

        # Parse fields from <s_ocr> format:
        # doctor_name: Dr. C. Rossi clinic_name: City Health Clinic patient_name: Aisha Khan patient_age: 73 date: 2024-12-16 medications: - Prednisone 25 mg - After meals
        doctor_name = ""
        doc_m = re.search(r"doctor_name:\s*(.*?)(?=\s+[a-z_]+:|$)", gt_raw)
        if doc_m:
            doctor_name = doc_m.group(1).strip()

        clinic_name = ""
        clin_m = re.search(r"clinic_name:\s*(.*?)(?=\s+[a-z_]+:|$)", gt_raw)
        if clin_m:
            clinic_name = clin_m.group(1).strip()

        patient_name = ""
        pat_m = re.search(r"patient_name:\s*(.*?)(?=\s+[a-z_]+:|$)", gt_raw)
        if pat_m:
            patient_name = pat_m.group(1).strip()

        date_val = ""
        date_m = re.search(r"date:\s*(.*?)(?=\s+[a-z_]+:|$)", gt_raw)
        if date_m:
            date_val = date_m.group(1).strip()

        medications = []
        med_m = re.search(r"medications:\s*(.*?)(?=\s+signature:|$)", gt_raw, re.S)
        if med_m:
            med_text = med_m.group(1).strip()
            # Split items starting with '-'
            items = [item.strip() for item in med_text.split("-") if item.strip()]
            for item in items:
                medications.append({"raw_text": item})

        manifest_item = {
            "id": f"RX-{idx+1:03d}",
            "source_dataset": "medical-prescription-dataset",
            "document_type": "Clinical Prescription",
            "image_filename": f"{base_name}.png",
            "local_image_path": str(img_dest),
            "ground_truth": {
                "patient_name": patient_name,
                "dob": "",
                "mrn": "",
                "facility": clinic_name or doctor_name,
                "diagnoses": [],
                "medications": medications,
                "procedures": [],
                "physician_notes": f"Prescribed by {doctor_name} at {clinic_name} on {date_val}" if doctor_name else ""
            }
        }
        samples.append(manifest_item)
        print(f"  ✓ Processed Prescription {manifest_item['id']} ({base_name})")

    return samples


def main():
    setup_directories()
    all_samples = []

    # Dataset 1: Discharge Summaries (20)
    all_samples.extend(fetch_discharge_summaries(20))

    # Dataset 2: ClinOCR Tabular Reports (15)
    all_samples.extend(fetch_clinocr_reports(15))

    # Dataset 3: Clinical Prescriptions (15)
    all_samples.extend(fetch_prescriptions(15))

    manifest = {
        "benchmark_metadata": {
            "title": "Multi-Corpus Medical Report Extraction Public Benchmark",
            "total_documents": len(all_samples),
            "public_datasets": [
                {
                    "name": "Noisy Medical Document Images (OCR)",
                    "source": "HuggingFace (hmnshudhmn24/noisy-medical-document-images-ocr)",
                    "count": 20,
                    "document_type": "Hospital Discharge Summaries"
                },
                {
                    "name": "ClinOCR-Bench",
                    "source": "arXiv:2607.03650 / HuggingFace (ianua/ClinOCR-Bench)",
                    "count": 15,
                    "document_type": "Clinical Scanned Forms & Tabular Reports"
                },
                {
                    "name": "Medical Prescription Dataset",
                    "source": "HuggingFace (chinmays18/medical-prescription-dataset)",
                    "count": 15,
                    "document_type": "Physician Clinical Prescriptions"
                }
            ]
        },
        "documents": all_samples
    }

    with open(ANNOTATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n[DONE] Successfully downloaded and indexed {len(all_samples)} public benchmark documents!")
    print(f"Ground truth manifest saved to: {ANNOTATIONS_FILE}")


if __name__ == "__main__":
    main()
