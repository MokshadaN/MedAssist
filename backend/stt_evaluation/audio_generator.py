"""
Audio Generator and Acoustic Perturbation Engine for STT Evaluation.

Synthesizes benchmark utterance audio dynamically with multi-accent vocal profiles
and optional simulated ER acoustic noise.
"""

import os
import io
import hashlib
from pathlib import Path
from typing import Tuple, Optional
from gtts import gTTS

CACHE_DIR = Path(__file__).resolve().parent / "audio_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Language / Top-Level Domain accents for gTTS
TLD_ACCENT_MAP = {
    "en-US": "com",
    "en-GB": "co.uk",
    "en-IN": "co.in",
    "en-AU": "com.au",
    "en-CA": "ca"
}


def generate_audio_bytes(
    text: str,
    accent: str = "en-US",
    use_cache: bool = True
) -> Tuple[bytes, str]:
    """
    Generates realistic spoken audio for a given text utterance.
    
    Returns:
        (audio_bytes, mime_type)
    """
    tld = TLD_ACCENT_MAP.get(accent, "com")
    
    # Hash identifier for caching
    cache_key = hashlib.md5(f"{text}_{accent}".encode("utf-8")).hexdigest()
    cache_file = CACHE_DIR / f"{cache_key}.mp3"
    
    if use_cache and cache_file.exists():
        with open(cache_file, "rb") as f:
            return f.read(), "audio/mpeg"
            
    # Synthesize via gTTS
    tts = gTTS(text=text, lang="en", tld=tld, slow=False)
    buffer = io.BytesIO()
    tts.write_to_fp(buffer)
    audio_data = buffer.getvalue()
    
    if use_cache:
        with open(cache_file, "wb") as f:
            f.write(audio_data)
            
    return audio_data, "audio/mpeg"
