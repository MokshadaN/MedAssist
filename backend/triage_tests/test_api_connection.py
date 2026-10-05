"""
API Verification Test Script for MedAssist Research Evaluation.
Tests both Google Gemini and Groq APIs to verify credentials, active models, and latency.
"""

import os
import sys
import time
from dotenv import load_dotenv

# Ensure backend root is loaded
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def test_gemini():
    print("-" * 60)
    print("[*] Testing Google Gemini API...")
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("[FAIL] GOOGLE_API_KEY is not set in backend/.env")
        return False, None

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        start_t = time.perf_counter()
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents="Echo test: reply with 'OK'."
        )
        elapsed_ms = (time.perf_counter() - start_t) * 1000
        reply = response.text.strip()
        print(f"[SUCCESS] Google Gemini is ACTIVE and OPERATIONAL.")
        print(f"          Model: gemini-3.8-flash | Latency: {elapsed_ms:.1f}ms | Reply: '{reply}'")
        return True, elapsed_ms
    except Exception as exc:
        print(f"[FAIL] Google Gemini encountered an error: {type(exc).__name__}: {exc}")
        return False, None


def test_groq():
    print("-" * 60)
    print("[*] Testing Groq API...")
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[FAIL] GROQ_API_KEY is not set in backend/.env")
        return False, None

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        start_t = time.perf_counter()
        response = client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=[{"role": "user", "content": "Echo test: reply with 'OK'."}],
            temperature=0.0
        )
        elapsed_ms = (time.perf_counter() - start_t) * 1000
        reply = response.choices[0].message.content.strip()
        print(f"[SUCCESS] Groq is ACTIVE and OPERATIONAL.")
        print(f"          Model: qwen/qwen3.8-27b | Latency: {elapsed_ms:.1f}ms | Reply: '{reply}'")
        return True, elapsed_ms
    except Exception as exc:
        print(f"[FAIL] Groq encountered an error: {type(exc).__name__}: {exc}")
        return False, None


def main():
    print("=" * 60)
    print("  MEDASSIST AI PROVIDER CONNECTIVITY & CREDENTIALS CHECK")
    print("=" * 60)

    gemini_ok, _ = test_gemini()
    groq_ok, _ = test_groq()

    print("=" * 60)
    print("  SUMMARY:")
    print(f"  - Google Gemini API:  {'[ACTIVE]' if gemini_ok else '[FAILED]'}")
    print(f"  - Groq API:           {'[ACTIVE]' if groq_ok else '[FAILED]'}")
    print("=" * 60)

    if gemini_ok and groq_ok:
        print("[+] Both AI providers are ready for multi-model research benchmarking.\n")
        return 0
    else:
        print("[!] Warning: One or more AI providers failed verification.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
