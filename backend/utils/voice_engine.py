import speech_recognition as sr

def get_patient_input(prompt_text: str) -> str:
    """
    Offers the user a choice between typing or speaking.
    """
    print(f"\n❓ QUESTION: {prompt_text}")
    print("--- Options: Press [Enter] to Type | Type 'v' then [Enter] for Voice ---")
    choice = input("Choice >> ").lower().strip()

    if choice == 'v':
        recognizer = sr.Recognizer()
        with sr.Microphone() as source:
            print("🎤 Listening... Speak now.")
            # Adjusts for background noise
            recognizer.adjust_for_ambient_noise(source, duration=0.6)
            try:
                audio = recognizer.listen(source, timeout=8, phrase_time_limit=12)
                print("Transcribing...")
                text = recognizer.recognize_google(audio)
                print(f"Captured: \"{text}\"")
                
                # Simple verification
                confirm = input("Is this correct? (Y/n): ").lower().strip()
                if confirm == 'n':
                    return input("Please type the correct answer: ")
                return text
                
            except Exception as e:
                print(f"❌ Voice capture failed: {e}")
                return input("Please type your answer: ")
    else:
        # Default to standard text input
        return input("Type Answer >> ")