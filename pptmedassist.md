# LLM-Based Clinical Intake System

**Indian Institute of Information Technology, Pune**
**Supervisor:** Dr. Sanjeev Sharma
**Presented By:** Shreya Pandey, Shravani Patwardhan, Muskan Gupta, Mokshada Nehete, Tejal Chaudhari. 

---

# Table of Contents

1. Introduction
2. Motivation
3. Literature Review
4. Research Gaps
5. Objectives
6. Methodology
7. Results and Analysis
8. Future Scope
9. References



---

# 1. Introduction

Healthcare systems often suffer from inefficient patient intake processes, fragmented medical data, and delayed diagnosis. This project proposes an AI-powered clinical intake platform that:

* Captures patient symptoms through AI-driven conversations.
* Automates SOAP note generation.
* Provides emergency support mechanisms.
* Performs medication safety analysis.
* Analyzes medical reports for actionable insights.

The system aims to provide an end-to-end intelligent healthcare solution. 

---

# 2. Motivation

The project addresses several healthcare challenges:

## Patient Communication Challenges

Patients often struggle to accurately communicate symptoms using traditional forms and questionnaires. 

## Delayed Diagnosis

Doctors manage large patient loads, leading to delays in diagnosis and treatment. 

## Fragmented Healthcare Systems

There is no unified platform combining patient interaction, report analysis, and medication safety. 

## Emergency Information Accessibility

Emergency responders often lack immediate access to critical patient information. 

---

# 3. Literature Review

## 3.1 Reimagining Patient-Reported Outcomes in the Age of Generative AI (Boyer et al., 2025)

### Methodology

* Integrates Large Language Models (LLMs) with psychometric models such as IRT and CAT.
* Uses conversational AI for patient symptom assessment.

### Contributions

* Shifts from static questionnaires to adaptive AI-driven assessments.
* Enables personalized symptom extraction and analysis.

### Limitations

* Lack of validation frameworks.
* Risk of bias and hallucinations in clinical settings.



---

## 3.2 Optimizing RAG-Based LLMs for Healthcare Question Answering (Bedwa et al., 2025)

### Methodology

* Uses transformer-based LLMs trained on healthcare datasets.
* Processes structured and unstructured medical data.

### Contributions

* Supports automated medical decision systems.
* Extracts and summarizes clinical information.

### Limitations

* Privacy concerns.
* Hallucinations and model bias.
* Limited clinical validation.



---

## 3.3 AI-Powered Clinical Documentation and EHR Experience (Liu et al., 2024)

### Methodology

* Integrates AI documentation systems into EHR workflows.

### Contributions

* Reduces clinician documentation burden.
* Improves Electronic Health Record experiences.

### Limitations

* Non-randomized study.
* Limited generalizability.



---

## 3.4 Framework for Considering Generative AI in Health (de Vere Hunt et al., 2025)

### Contributions

* Establishes principles for safe and equitable healthcare AI deployment.
* Emphasizes robust evaluation practices.

### Limitations

* No empirical validation.



---

## 3.5 NLP in Electronic Health Records (Hossain et al., 2023)

### Contributions

* Demonstrates how NLP converts unstructured EHR text into actionable clinical insights.
* Supports healthcare decision-making.

### Challenges

* Lack of annotated datasets.
* Data imbalance and inadequate evaluation.



---

## 3.6 AI in Medical Questionnaires (Luo et al., 2025)

### Contributions

* Improves efficiency and personalization of medical questionnaires.
* Enhances clinical decision support.

### Limitations

* Limited validation.
* Lack of standardized evaluation metrics.



---

# 4. Research Gaps

Current healthcare AI systems suffer from several limitations:

1. Lack of safeguards against harmful AI outputs.
2. Absence of concise SOAP note generation tools.
3. No unified patient tracking system.
4. Limited treatment adherence monitoring.
5. Lack of validation against trusted medical databases.
6. No secure emergency data-sharing mechanism.
7. Missing integration between triage systems and hospital routing.



---

# 5. Objectives

## Objective 1

Develop an AI-driven system that automates patient intake and symptom collection through natural conversations. 

## Objective 2

Generate structured SOAP notes to support faster clinical decision-making. 

## Objective 3

Provide emergency support using QR-based medical profiles and nearby hospital detection. 

## Objective 4

Enhance medication safety through AI-powered drug analysis and interaction detection. 

---

# 6. Methodology

## 6.1 Patient Intake Workflow

### Authentication & Profile Creation

* JWT-based authentication.
* Storage of demographic and medical history information.

### Multimodal Symptom Intake

* Text-based interaction.
* Voice-to-text support using Web Speech API.

### Dynamic Questionnaire

* AI-generated follow-up questions.
* Adaptive symptom collection.

### Output

* Structured symptom datasets for downstream AI processing.



---

## 6.2 AI Processing Layer

### Conversational Reasoning

* LLMs (Groq/Gemini) interpret symptoms and history.

### Hybrid Intelligence Layer

* PubMedBERT embeddings.
* Semantic similarity matching.
* LLM-based reasoning.

### SOAP Note Generation

Produces:

* Subjective
* Objective
* Assessment
* Plan

### Risk Detection

Assigns:

* Low Risk
* Medium Risk
* High Risk

High-risk cases trigger emergency workflows.



---

## 6.3 Emergency Support System

### Emergency Detection

Triggered when risk scores exceed predefined thresholds.

### Nearby Hospital Discovery

Uses OpenStreetMap APIs for hospital recommendations.

### QR Emergency Profile

Contains:

* Blood group
* Allergies
* Medications

Enables rapid emergency access to critical information.



---

## 6.4 Medicine Intelligence & Safety Layer

### AI Medicine Assistant

Uses NLP and PubMedBERT to understand:

* Drug information
* Patient context

### Features

* Drug benefits
* Side effects
* Drug interactions
* Contraindications
* Usage guidance

### Semantic Risk Checks

Detects:

* Allergy conflicts
* Unsafe drug combinations
* Adverse reactions



---

## 6.5 Medical Report Analysis Engine

### Report Upload

Supports:

* PDF documents
* Medical images

### OCR + AI Processing

Extracts:

* Laboratory values
* Medical indicators

### Insights

* Simplified explanations
* Historical trend analysis

 

---

## 6.6 Patient Dashboard

### Features

#### Health Visualization

* Vital signs tracking
* Lab metric charts

#### Medication Management

* Scheduled reminders
* Urgent alerts
* Integrated medicine information

#### Appointment Tracking

* Consultations
* Follow-up schedules



---

## 6.7 Doctor Dashboard

### Features

* Secure authentication
* Patient queue management
* Real-time updates

### AI Clinical Summary

Automatically generated SOAP notes provide:

* Subjective data
* Objective findings
* Assessment
* Plan

### Decision Support

PubMedBERT-powered semantic checks identify:

* Drug-side effect relationships
* Potential adverse reactions

 

---

## 6.8 Prescription Studio

### Digital Prescription Generation

Supports:

* Dosage control
* Frequency selection
* Custom instructions



---

## 6.9 Patient Monitoring

Provides access to:

* Uploaded reports
* Vital trends
* Continuous care information



---

## 6.10 QR-Based Emergency Access

Scanning a patient QR code instantly reveals:

* Allergies
* Blood group
* Medication details



---

# 7. Results and Analysis

## 7.1 AI Report Trend Analysis

The system summarizes uploaded reports into concise historical medical information, enabling faster review and better clinical understanding. 

---

## 7.2 Prescription and Reminder System

Patients can:

* Access prescriptions.
* Receive appointment reminders.
* Receive notifications through WhatsApp and email.



---

## 7.3 Medicine Information System

Patients can search medications by name and understand:

* Benefits
* Side effects

This reduces confusion caused by medical terminology.



---

## 7.4 Real-Time SOAP Summary Generation

The system converts free-text patient narratives into structured clinical records in real time.



---

## 7.5 Emergency QR and Red-Flag Detection

The system:

* Detects medical emergencies.
* Generates QR codes containing patient information.
* Supports rapid emergency response.



---

# 8. Future Scope

## Clinical Decision Support Using Similar Cases

Vector embeddings can identify similar historical patient cases and recommend diagnostic tests or next steps. 

---

## Automated Imaging Insights

AI can analyze:

* X-rays
* Sonography scans

to detect abnormalities and assist diagnosis. 

---

## Automated Clinical Scribing

AI-powered transcription can:

* Record doctor-patient conversations.
* Generate structured clinical notes.
* Automatically update patient histories.

This reduces documentation burden and allows physicians to focus on patient care. 

---

# Conclusion

The **LLM-Based Clinical Intake System** proposes a comprehensive AI-enabled healthcare platform that combines:

* Conversational symptom intake
* PubMedBERT + LLM reasoning
* SOAP note generation
* Medical report analysis
* Medication safety intelligence
* Emergency QR profiles
* Doctor decision-support tools

The system aims to improve patient-doctor communication, accelerate diagnosis, enhance treatment safety, and support emergency care through a unified intelligent healthcare ecosystem.  

---

# References

1. Boyer et al. (2025). *Reimagining patient-reported outcomes in the age of generative AI*.
2. Bedwa et al. (2026). *Optimizing RAG-based LLMs for healthcare question answering tasks*.
3. Liu et al. (2024). *AI-powered clinical documentation and clinicians’ electronic health record experience*.
4. de Vere Hunt et al. (2025). *A framework for considering the use of generative AI for health*.
5. Hossain et al. (2023). *Natural language processing in electronic health records in relation to healthcare decision-making*.
6. Luo et al. (2025). *AI in Medical Questionnaires: Scoping Review*.

