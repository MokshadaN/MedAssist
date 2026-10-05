"""
Speech Recognition Evaluation Metrics Module.

Calculates Word Error Rate (WER), Character Error Rate (CER), Sentence Error Rate (SER),
and Word Accuracy with robust text normalization and Levenshtein alignment.
"""

import re
from typing import List, Dict, Any, Tuple

try:
    import jiwer
    HAS_JIWER = True
except ImportError:
    HAS_JIWER = False


# Common spoken number word mapping for acoustic normalization
NUM_WORDS = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "ten": "10", "fifteen": "15", "twenty": "20", "thirty": "30",
    "forty": "40", "fifty": "50", "sixty": "60", "seventy": "70",
    "eighty": "80", "ninety": "90", "hundred": "100", "thousand": "1000"
}


def normalize_text(text: str) -> str:
    """
    Standardizes transcript text by lowering case, removing punctuation,
    normalizing number words, and collapsing extraneous whitespace.
    """
    if not text:
        return ""
    text = text.lower()
    # Remove all punctuation except alphanumeric and space
    text = re.sub(r"[^\w\s]", " ", text)
    tokens = text.split()
    norm_tokens = [NUM_WORDS.get(tok, tok) for tok in tokens]
    return " ".join(norm_tokens)


def _levenshtein_distance(seq1: List[str], seq2: List[str]) -> Tuple[int, int, int, int]:
    """
    Dynamic programming calculation of Levenshtein distance between two sequences.
    Returns: (substitutions, deletions, insertions, total_distance)
    """
    n, m = len(seq1), len(seq2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
        
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if seq1[i - 1] == seq2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],      # Deletion
                    dp[i][j - 1],      # Insertion
                    dp[i - 1][j - 1]   # Substitution
                )
                
    # Backtracking to extract substitutions, deletions, insertions
    i, j = n, m
    subs, dels, ins = 0, 0, 0
    while i > 0 or j > 0:
        if i > 0 and j > 0 and seq1[i - 1] == seq2[j - 1]:
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            subs += 1
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            dels += 1
            i -= 1
        elif j > 0 and dp[i][j] == dp[i][j - 1] + 1:
            ins += 1
            j -= 1
        else:
            if i > 0:
                dels += 1
                i -= 1
            elif j > 0:
                ins += 1
                j -= 1

    return subs, dels, ins, dp[n][m]


def compute_metrics(references: List[str], hypotheses: List[str]) -> Dict[str, Any]:
    """
    Computes aggregated speech recognition metrics across reference and hypothesis lists.
    """
    if len(references) != len(hypotheses):
        raise ValueError(f"Mismatched counts: {len(references)} refs vs {len(hypotheses)} hyps")

    norm_refs = [normalize_text(r) for r in references]
    norm_hyps = [normalize_text(h) for h in hypotheses]

    total_ref_words = 0
    total_ref_chars = 0
    total_subs = 0
    total_dels = 0
    total_ins = 0
    total_char_dist = 0
    exact_sentence_matches = 0

    for ref, hyp in zip(norm_refs, norm_hyps):
        ref_words = ref.split() if ref else []
        hyp_words = hyp.split() if hyp else []

        total_ref_words += len(ref_words)
        total_ref_chars += len(ref)

        if ref == hyp:
            exact_sentence_matches += 1

        subs, dels, ins, _ = _levenshtein_distance(ref_words, hyp_words)
        total_subs += subs
        total_dels += dels
        total_ins += ins

        _, _, _, char_dist = _levenshtein_distance(list(ref), list(hyp))
        total_char_dist += char_dist

    # Fallback / Direct check with jiwer if available
    if HAS_JIWER and total_ref_words > 0:
        jiwer_wer = jiwer.wer(norm_refs, norm_hyps) * 100.0
        jiwer_cer = jiwer.cer(norm_refs, norm_hyps) * 100.0
    else:
        jiwer_wer = ((total_subs + total_dels + total_ins) / max(1, total_ref_words)) * 100.0
        jiwer_cer = (total_char_dist / max(1, total_ref_chars)) * 100.0

    wer = round(jiwer_wer, 2)
    cer = round(jiwer_cer, 2)
    word_accuracy = round(max(0.0, 100.0 - wer), 2)
    sentence_accuracy = round((exact_sentence_matches / max(1, len(references))) * 100.0, 2)

    return {
        "sample_count": len(references),
        "total_reference_words": total_ref_words,
        "total_reference_chars": total_ref_chars,
        "substitutions": total_subs,
        "deletions": total_dels,
        "insertions": total_ins,
        "word_error_rate_pct": wer,
        "character_error_rate_pct": cer,
        "transcription_accuracy_pct": word_accuracy,
        "sentence_exact_match_pct": sentence_accuracy,
    }
