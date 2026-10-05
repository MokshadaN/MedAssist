"""
MedAssist - Pure PyTorch Baseline Text Classifier on Biomegix SOAP Notes Dataset
Does NOT require scikit-learn C-DLLs (bypasses Windows AppLocker restrictions).
"""

import os
import csv
import json
import torch
import torch.nn as nn
import torch.optim as optim
from collections import Counter

# Set seed for reproducibility
torch.manual_seed(42)

def load_csv_data(filepath):
    texts, labels = [], []
    with open(filepath, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            texts.append(row["text"].lower())
            labels.append(int(row["label"]))
    return texts, labels

def tokenize(text):
    return [word.strip(".,!?;:()[]\"'") for word in text.split() if word]

class PyTorchTextClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim=64, num_classes=4):
        super().__init__()
        self.embedding = nn.EmbeddingBag(vocab_size, embed_dim, mode="mean")
        self.fc = nn.Linear(embed_dim, num_classes)

    def forward(self, text_tensor, offsets):
        embedded = self.embedding(text_tensor, offsets)
        return self.fc(embedded)

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

def main():
    train_path, test_path = get_dataset_paths()
    print(f"[INFO] Loading data from {os.path.abspath(train_path)} and {os.path.abspath(test_path)}...")
    X_train, y_train = load_csv_data(train_path)
    X_test, y_test = load_csv_data(test_path)

    # Build vocabulary
    vocab = {"<unk>": 0, "<pad>": 1}
    word_counts = Counter()
    for text in X_train:
        word_counts.update(tokenize(text))

    for word, count in word_counts.most_common(10000):
        if word not in vocab:
            vocab[word] = len(vocab)

    print(f"[INFO] Built vocabulary size: {len(vocab)}")

    def prepare_batch(texts, labels=None):
        text_list = []
        offsets = [0]
        for t in texts:
            tokens = [vocab.get(w, vocab["<unk>"]) for w in tokenize(t)]
            if not tokens:
                tokens = [vocab["<pad>"]]
            text_list.extend(tokens)
            offsets.append(len(text_list))
        
        offsets = torch.tensor(offsets[:-1], dtype=torch.long)
        text_tensor = torch.tensor(text_list, dtype=torch.long)
        
        if labels is not None:
            label_tensor = torch.tensor(labels, dtype=torch.long)
            return text_tensor, offsets, label_tensor
        return text_tensor, offsets

    # Initialize PyTorch Baseline Model
    model = PyTorchTextClassifier(vocab_size=len(vocab), embed_dim=64, num_classes=4)
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    criterion = nn.CrossEntropyLoss()

    X_tr_t, off_tr, y_tr_t = prepare_batch(X_train, y_train)
    X_te_t, off_te, y_te_t = prepare_batch(X_test, y_test)

    print("[INFO] Training Baseline PyTorch Classifier (50 Epochs)...")
    for epoch in range(1, 51):
        model.train()
        optimizer.zero_grad()
        out = model(X_tr_t, off_tr)
        loss = criterion(out, y_tr_t)
        loss.backward()
        optimizer.step()

    # Evaluation
    model.eval()
    with torch.no_grad():
        test_out = model(X_te_t, off_te)
        preds = torch.argmax(test_out, dim=1).numpy()

    correct = sum(1 for p, y in zip(preds, y_test) if p == y)
    acc = (correct / len(y_test)) * 100

    print("\n" + "=" * 60)
    print("📊 BASELINE PYTORCH MODEL EVALUATION REPORT")
    print("=" * 60)
    print(f" Total Test Samples : {len(y_test)}")
    print(f" Baseline Accuracy  : {acc:.2f}%\n")

if __name__ == "__main__":
    main()
