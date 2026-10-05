"""
MedAssist - Fine-Tuning PubMedBERT on Biomegix SOAP Notes Dataset
Model: microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext
Task: 4-class SOAP Section Classification (0=Subjective, 1=Objective, 2=Assessment, 3=Plan)
Epochs: 20
"""

import os
import csv
import sys
import json
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    get_linear_schedule_with_warmup
)
from torch.optim import AdamW

# Set seeds for research reproducibility
SEED = 42
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

MODEL_NAME = "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"
OUTPUT_DIR = "models/pubmedbert_soap_model"
NUM_EPOCHS = 20
BATCH_SIZE = 16
LEARNING_RATE = 2e-5
MAX_LEN = 256

class SOAPDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len=256):
        self.texts = texts
        self.labels = [int(l) for l in labels]
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = str(self.texts[idx])
        encoding = self.tokenizer(
            text,
            truncation=True,
            max_length=self.max_len,
            padding="max_length",
            return_tensors="pt"
        )
        return {
            "input_ids": encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
            "labels": torch.tensor(self.labels[idx], dtype=torch.long)
        }

def load_csv_data(filepath):
    texts, labels = [], []
    with open(filepath, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            texts.append(row["text"])
            labels.append(row["label"])
    return texts, labels

def get_dataset_paths():
    possible_dirs = [
        "../soap-notes",
        "../../soap-notes",
        "e:/medassist/soap-notes",
        "soap-notes"
    ]
    for d in possible_dirs:
        tr = os.path.join(d, "train.csv")
        te = os.path.join(d, "test.csv")
        if os.path.exists(tr) and os.path.exists(te):
            return tr, te
    raise FileNotFoundError("Could not find soap-notes/train.csv and test.csv in project directory.")

def train():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[INFO] Using Device: {device}")

    train_path, test_path = get_dataset_paths()
    print(f"[INFO] Loading Training Set from: {os.path.abspath(train_path)}")
    print(f"[INFO] Loading Test Set from: {os.path.abspath(test_path)}")

    train_texts, train_labels = load_csv_data(train_path)
    test_texts, test_labels = load_csv_data(test_path)

    print(f"[INFO] Train Samples: {len(train_texts)} | Test Samples: {len(test_texts)}")

    # Initialize Tokenizer and Model
    print(f"[INFO] Loading pretrained PubMedBERT: {MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=4
    )
    model.to(device)

    # Prepare DataLoaders
    train_dataset = SOAPDataset(train_texts, train_labels, tokenizer, MAX_LEN)
    test_dataset = SOAPDataset(test_texts, test_labels, tokenizer, MAX_LEN)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)

    # Optimizer & Scheduler
    optimizer = AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=0.01)
    total_steps = len(train_loader) * NUM_EPOCHS
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=int(total_steps * 0.1),
        num_training_steps=total_steps
    )

    print(f"\n" + "=" * 60)
    print(f"🚀 STARTING PUBMEDBERT FINE-TUNING ({NUM_EPOCHS} EPOCHS)")
    print("=" * 60)

    num_batches = len(train_loader)
    for epoch in range(1, NUM_EPOCHS + 1):
        model.train()
        total_loss = 0.0
        print(f"\n--- Epoch {epoch:02d}/{NUM_EPOCHS:02d} ---")
        for batch_idx, batch in enumerate(train_loader, start=1):
            optimizer.zero_grad()
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()

            total_loss += loss.item()
            running_avg = total_loss / batch_idx
            pct = int((batch_idx / num_batches) * 20)
            bar = "#" * pct + "-" * (20 - pct)
            print(f"  Batch {batch_idx:02d}/{num_batches:02d} [{bar}] Loss: {loss.item():.4f} | Avg: {running_avg:.4f}", end="\r", flush=True)

        avg_train_loss = total_loss / num_batches
        
        # Evaluate after each epoch
        model.eval()
        correct, total = 0, 0
        with torch.no_grad():
            for batch in test_loader:
                input_ids = batch["input_ids"].to(device)
                attention_mask = batch["attention_mask"].to(device)
                labels = batch["labels"].to(device)
                outputs = model(input_ids=input_ids, attention_mask=attention_mask)
                preds = torch.argmax(outputs.logits, dim=1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)

        test_acc = (correct / total) * 100
        print(f"\nEpoch {epoch:02d}/{NUM_EPOCHS:02d} COMPLETE | Avg Train Loss: {avg_train_loss:.4f} | Test Acc: {test_acc:.2f}%")
        print("-" * 60)

    # Save fine-tuned model
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"\n[SUCCESS] Fine-tuned PubMedBERT saved to: {os.path.abspath(OUTPUT_DIR)}")

    # ---------------------------------------------------------
    # FINAL DETAILED EVALUATION & LATEX GENERATION
    # ---------------------------------------------------------
    from evaluate_soap_notes import calculate_metrics

    model.eval()
    y_true, y_pred = [], []
    with torch.no_grad():
        for batch in test_loader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            preds = torch.argmax(outputs.logits, dim=1).cpu().numpy()
            y_pred.extend([str(p) for p in preds])
            y_true.extend([str(l) for l in batch["labels"].numpy()])

    results = calculate_metrics(y_true, y_pred, classes=['0', '1', '2', '3'])

    print("\n" + "=" * 65)
    print("📊 PUBMEDBERT FINE-TUNED SYSTEM EVALUATION REPORT")
    print("=" * 65)
    print(f" Total Evaluation Test Samples : {results['Total_Samples']}")
    print(f" Fine-Tuned Accuracy           : {results['Accuracy']}%")
    print(f" Macro Precision               : {results['Macro_Precision']}%")
    print(f" Macro Recall (Sensitivity)    : {results['Macro_Recall']}%")
    print(f" Macro F1-Score                : {results['Macro_F1']}%")
    print(f" Macro Specificity             : {results['Macro_Specificity']}%")
    print("=" * 65)

    latex_table = f"""
\\begin{{table}}[htbp]
\\centering
\\caption{{Fine-Tuned PubMedBERT (20 Epochs) Performance on SOAP Notes Dataset}}
\\label{{tab:pubmedbert_soap_evaluation}}
\\begin{{tabular}}{{|l|c|}}
\\hline
\\textbf{{Evaluation Metric}} & \\textbf{{Result (\\%)}} \\\\
\\hline
Overall Accuracy & {results['Accuracy']:.2f}\\% \\\\
Macro Precision & {results['Macro_Precision']:.2f}\\% \\\\
Macro Sensitivity / Recall & {results['Macro_Recall']:.2f}\\% \\\\
Macro F1-Score & {results['Macro_F1']:.2f}\\% \\\\
Macro Specificity & {results['Macro_Specificity']:.2f}\\% \\\\
\\hline
\\end{{tabular}}
\\end{{table}}
"""
    print("\n📄 Generated LaTeX Table for Research Paper:\n")
    print(latex_table)

    with open("pubmedbert_soap_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("[SUCCESS] Detailed metrics saved to pubmedbert_soap_results.json")

if __name__ == "__main__":
    train()
