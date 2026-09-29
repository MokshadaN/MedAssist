# 📋 MedAssist Comprehensive Feature Verification Checklist

Use this interactive testing checklist to verify all core features across the **Patient Experience**, **Doctor Portal**, **AI Engine**, and **Clinical Safety Stack**.

---

## 1. 🔐 Authentication & Session Management
- [ ] **Patient Registration**: Create a new patient account with Name, Email, Password, Age, Gender, and Address.
- [ ] **Patient Login**: Log in with credentials and verify JWT access + refresh tokens are issued.
- [ ] **Doctor Login**: Log in with doctor credentials (`doctor@medassist.io` / configured doctor account) and verify redirection to Doctor Dashboard.
- [ ] **Protected Routes**: Attempt accessing `/doctor` as a patient or unauthenticated user and confirm 401/403 redirection.
- [ ] **Token Refresh & Logout**: Log out and ensure authorization headers/tokens are cleared.

---

## 2. 💬 AI Patient Intake & Real-Time Triage
- [ ] **Start Intake Chat**: Click "Start New Intake" and verify initial clinical intake question appears.
- [ ] **Multi-Turn Symptom Collection**: Respond with symptoms (e.g., *"I have had a throbbing migraine for 3 days, worse in bright light"*).
- [ ] **Dynamic Follow-Up Questions**: Verify the AI identifies missing clinical fields (e.g., triggers, severity, duration) and asks smart follow-ups.
- [ ] **Emergency Red-Flag Detection**: Test an emergency input (e.g., *"Sudden crushing chest pain radiating to my left arm"*):
  - [ ] Immediate red banner / warning shown.
  - [ ] Groq / Regex triage flags emergency.
  - [ ] Nearest hospitals with phone numbers and distances are displayed based on patient address.

---

## 3. 📝 Structured SOAP Note Generation & Longitudinal Comparison
- [ ] **Complete Intake Session**: Complete the multi-question intake flow.
- [ ] **Automated SOAP Extraction**: Verify structured summary is generated with:
  - **S** (Subjective): Patient-reported symptoms & timeline.
  - **O** (Objective): Reported vitals/observations.
  - **A** (Assessment): AI clinical assessment & risk categorization.
  - **P** (Plan): Suggested clinical next steps.
- [ ] **Longitudinal Diff Engine**: Run a second intake for the same patient with different symptoms and verify the **"Changes from Previous Visit"** diff section highlights new/resolved symptoms.

---

## 4. 🧪 Lab Report OCR & Biomarker Metric Extraction
- [ ] **Upload Lab Report**: Upload a sample PDF or image of a blood test / lipid panel.
- [ ] **Gemini Multimodal OCR**: Verify extraction of key biomarkers (e.g., Fasting Glucose, HbA1c, Total Cholesterol, HDL/LDL).
- [ ] **Out-of-Range Highlighting**: Confirm abnormal values are tagged with high/low badges.
- [ ] **Trend Visualization**: Verify historical biomarker charts plot extracted metrics over time.

---

## 5. 💊 Drug-Drug Interaction (DDI) & Risk Engine
- [ ] **Prescription Risk Screening**: Input two interacting medications (e.g., *Warfarin + Aspirin* or *Sildenafil + Nitrates*).
- [ ] **PubMedBERT Semantic Risk Analysis**: Verify interaction classification (Severe / Moderate / Mild).
- [ ] **Mechanism of Action Warning**: Verify clinical explanation of the interaction mechanism is clearly rendered for the clinician.
- [ ] **Safe Medication Check**: Input two non-interacting drugs (e.g., *Amoxicillin + Acetaminophen*) and verify "No significant interaction detected".

---

## 6. 📋 Discharge Planning & Patient Guidance
- [ ] **Generate Discharge Plan**: Trigger discharge plan generation for a completed visit.
- [ ] **Plain-Language Instructions**: Verify medical jargon is simplified into patient-friendly daily language.
- [ ] **Dosage & Schedule Timeline**: Confirm clear morning/afternoon/night medication schedules.
- [ ] **"When to Seek Immediate Care"**: Confirm key warning signs and emergency instructions are prominent.

---

## 7. ⏰ Reminders & Multi-Channel Notifications
- [ ] **Create Medication Reminder**: Set a reminder for a medication schedule.
- [ ] **Email Dispatch (SMTP)**: Verify appointment confirmation or reminder email is dispatched (or logged in console if SMTP is not configured).
- [ ] **WhatsApp Alert (Twilio)**: If Twilio credentials are configured, verify WhatsApp message arrival on sandbox number.
- [ ] **QR Code Hand-Off**: Check QR code generation for scanning on mobile to resume intake.

---

## 8. 👨‍⚕️ Doctor Dashboard & Clinical Workflow
- [ ] **Doctor Directory & Directory Search**: View all verified physicians and specialty filter.
- [ ] **Patient Timeline & Records**: Open patient file to review complete history of SOAP notes, lab metrics, and triage logs.
- [ ] **Audit Trail**: Confirm clinical actions generate proper structured audit logs.

---

## 9. ⚡ System Health & Resilience
- [ ] **Shallow Health Check**: [http://localhost:8000/health](http://localhost:8000/health) → returns `status: healthy`.
- [ ] **Detailed Health Check**: [http://localhost:8000/health/detailed](http://localhost:8000/health/detailed) → verifies DB, Gemini, Groq, and HuggingFace status.
- [ ] **Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs) → Swagger UI interactive execution.
