"""
Unit and Integration Tests for Speech Recognition Evaluation Module.
"""

import os
import sys
import unittest
import json
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from stt_evaluation.metrics import normalize_text, compute_metrics, _levenshtein_distance
from stt_evaluation.audio_generator import generate_audio_bytes, CACHE_DIR


class TestSTTMetrics(unittest.TestCase):
    def test_normalize_text(self):
        raw = "  Hello, World! Patient has 103.4 F fever; right-sided hemiparesis...  "
        expected = "hello world patient has 103 4 f fever right sided hemiparesis"
        self.assertEqual(normalize_text(raw), expected)

    def test_levenshtein_distance_exact(self):
        seq1 = ["patient", "has", "fever"]
        seq2 = ["patient", "has", "fever"]
        subs, dels, ins, dist = _levenshtein_distance(seq1, seq2)
        self.assertEqual(dist, 0)
        self.assertEqual((subs, dels, ins), (0, 0, 0))

    def test_levenshtein_distance_edits(self):
        seq1 = ["patient", "has", "fever"]
        seq2 = ["patient", "had", "high", "fever"]
        subs, dels, ins, dist = _levenshtein_distance(seq1, seq2)
        # "has" -> "had" (sub=1), "high" inserted (ins=1)
        self.assertEqual(subs, 1)
        self.assertEqual(ins, 1)
        self.assertEqual(dels, 0)

    def test_compute_metrics_perfect_match(self):
        refs = ["Patient has severe chest pain", "Sudden onset of dyspnea"]
        hyps = ["Patient has severe chest pain", "Sudden onset of dyspnea"]
        res = compute_metrics(refs, hyps)
        self.assertEqual(res["word_error_rate_pct"], 0.0)
        self.assertEqual(res["character_error_rate_pct"], 0.0)
        self.assertEqual(res["transcription_accuracy_pct"], 100.0)
        self.assertEqual(res["sentence_exact_match_pct"], 100.0)

    def test_compute_metrics_with_errors(self):
        refs = ["patient has chest pain"]
        hyps = ["patient had pain"]
        res = compute_metrics(refs, hyps)
        self.assertGreater(res["word_error_rate_pct"], 0.0)
        self.assertLess(res["transcription_accuracy_pct"], 100.0)


class TestDatasetsAndAudio(unittest.TestCase):
    def test_dataset_validity(self):
        datasets_dir = Path(__file__).resolve().parent / "datasets"
        files = [
            "medical_symptoms_dataset.json",
            "librispeech_benchmark_dataset.json",
            "accented_noisy_intake_dataset.json"
        ]
        for f in files:
            p = datasets_dir / f
            self.assertTrue(p.exists(), f"Dataset file {f} missing")
            with open(p, "r", encoding="utf-8") as dfile:
                data = json.load(dfile)
                self.assertIsInstance(data, list)
                self.assertGreater(len(data), 0)
                for item in data:
                    self.assertIn("text", item)
                    self.assertTrue(len(item["text"]) > 5)

    def test_audio_generator(self):
        text = "Testing speech evaluation audio generation"
        audio_bytes, mime = generate_audio_bytes(text, accent="en-US", use_cache=True)
        self.assertIsInstance(audio_bytes, bytes)
        self.assertGreater(len(audio_bytes), 100)
        self.assertEqual(mime, "audio/mpeg")


if __name__ == "__main__":
    unittest.main()
