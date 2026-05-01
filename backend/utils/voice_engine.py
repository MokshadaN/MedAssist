"""Optional voice input helper."""

try:
    import speech_recognition as sr
except ImportError:
    sr = None


def get_patient_input(prompt_text: str) -> str:
    """Offer a choice between typed input and voice input."""
    print(f"\nQUESTION: {prompt_text}")
    print("--- Options: Press [Enter] to Type | Type 'v' then [Enter] for Voice ---")
    choice = input("Choice >> ").lower().strip()

    if choice == "v" and sr is not None:
        recognizer = sr.Recognizer()
        with sr.Microphone() as source:
            print("Listening... Speak now.")
            recognizer.adjust_for_ambient_noise(source, duration=0.6)
            try:
                audio = recognizer.listen(source, timeout=8, phrase_time_limit=12)
                print("Transcribing...")
                text = recognizer.recognize_google(audio)
                print(f'Captured: "{text}"')

                confirm = input("Is this correct? (Y/n): ").lower().strip()
                if confirm == "n":
                    return input("Please type the correct answer: ")
                return text
            except Exception as exc:
                print(f"Voice capture failed: {exc}")
                return input("Please type your answer: ")

    if choice == "v":
        print("Voice input is unavailable because speech_recognition is not installed.")
        return input("Please type your answer: ")

    return input("Type Answer >> ")
