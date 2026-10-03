import { FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import {
  Heart,
  User,
  Stethoscope,
  Calendar,
  Clock,
  MapPin,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Bell,
  Search,
  Plus,
  Activity,
  ShieldAlert,
  Send,
  Mic,
  Video,
  FileText,
  Upload,
  Check,
  History,
  TrendingUp,
  Trash2,
  MessageCircle,
  Camera,
  Microscope,
  Star,
  ThumbsUp,
  Smartphone,
  AlertTriangle,
  Pill
} from 'lucide-react';
import HealthMetricsChart from './components/HealthMetricsChart';
import AuthScreen from './components/AuthScreen';
import {
  api,
  AISummary,
  AuthContext,
  AuthUser,
  DoctorDirectoryItem,
  DoctorPatient,
  DoctorVisit,
  DoctorProfile,
  EmergencyHospital,
  Notification,
  PatientProfile,
  Prescription,
  PrescriptionItem,
  Reminder,
  SessionState,
  API_BASE,
  PublicProfile,
  getShareableOrigin,
} from './api';
import { QRCodeSVG } from 'qrcode.react';

type AuthMode = 'login' | 'register-doctor' | 'register-patient';
type ChatMessage = { role: 'assistant' | 'user'; text: string };
type FrequencyOption = 'once' | 'twice' | 'thrice';

function settledFailureMessage(
  results: Array<[string, PromiseSettledResult<unknown>]>,
): string {
  return results
    .filter((entry): entry is [string, PromiseRejectedResult] => entry[1].status === 'rejected')
    .map(([label, result]) => (
      `${label}: ${result.reason instanceof Error ? result.reason.message : 'request failed'}`
    ))
    .join('; ');
}

interface MedicineInfo {
  name: string;
  generic?: string;
  purpose: string;
  sideEffects: string;
  usage: string;
  category: string;
  warnings?: string;
}

const MEDICINE_DB: MedicineInfo[] = [
  // ── Analgesics & Antipyretics ──
  { name: 'Paracetamol (Crocin)', generic: 'Acetaminophen', purpose: 'Fever and mild-to-moderate pain relief', sideEffects: 'Liver damage in overdose; rare rash', usage: 'Do not exceed 4 g/day; avoid alcohol', category: 'Analgesic / Antipyretic', warnings: 'Overdose can cause fatal liver failure' },
  { name: 'Ibuprofen (Brufen)', generic: 'Ibuprofen', purpose: 'Pain, fever, and inflammation', sideEffects: 'GI irritation, ulcers, raised BP, kidney stress', usage: 'Take with food; use lowest effective dose', category: 'NSAID', warnings: 'Avoid in kidney disease, 3rd-trimester pregnancy, and heart failure' },
  { name: 'Diclofenac (Voveran)', generic: 'Diclofenac sodium', purpose: 'Joint pain, muscle pain, post-op analgesia', sideEffects: 'Stomach pain, ulcers, elevated liver enzymes', usage: 'Take after meals; do not crush SR tablets', category: 'NSAID', warnings: 'Increases cardiovascular event risk with long-term use' },
  { name: 'Aspirin (Ecosprin)', generic: 'Acetylsalicylic Acid', purpose: 'Platelet aggregation inhibitor; anti-clot after heart attack/stroke', sideEffects: 'GI bleeding, tinnitus', usage: 'Take after food; low-dose (75 mg) for cardiac use', category: 'Antiplatelet / NSAID', warnings: "Avoid in children < 16 (Reye's syndrome risk)" },
  { name: 'Tramadol (Ultracet)', generic: 'Tramadol HCl', purpose: 'Moderate-to-severe pain', sideEffects: 'Nausea, dizziness, constipation, dependence', usage: 'Take every 4–6 h as needed; avoid alcohol', category: 'Opioid Analgesic', warnings: 'Seizure risk; do not use with MAOIs' },
  { name: 'Nimesulide (Nimulid)', generic: 'Nimesulide', purpose: 'Fever, musculoskeletal pain, dysmenorrhoea', sideEffects: 'GI upset, liver toxicity (rare)', usage: 'Take after meals; max 15 days', category: 'NSAID (COX-2 preferential)', warnings: 'Banned in several countries for children; watch liver function' },
  { name: 'Aceclofenac (Hifenac)', generic: 'Aceclofenac', purpose: 'Osteoarthritis, rheumatoid arthritis, ankylosing spondylitis', sideEffects: 'Dyspepsia, nausea, dizziness', usage: 'Take with food twice daily', category: 'NSAID', warnings: 'Avoid in peptic ulcer and severe renal impairment' },
  // ── Antibiotics ──
  { name: 'Amoxicillin (Mox)', generic: 'Amoxicillin trihydrate', purpose: 'Throat, ear, chest, UTI bacterial infections', sideEffects: 'Diarrhoea, rash, nausea', usage: 'Complete the full course', category: 'Antibiotic (Penicillin)', warnings: 'Inform doctor of penicillin allergy' },
  { name: 'Azithromycin (Zithromax)', generic: 'Azithromycin', purpose: 'Respiratory, skin, STI bacterial infections', sideEffects: 'Nausea, diarrhoea, QT prolongation', usage: 'Take 1 h before or 2 h after food', category: 'Antibiotic (Macrolide)' },
  { name: 'Ciprofloxacin (Ciplox)', generic: 'Ciprofloxacin HCl', purpose: 'UTI, typhoid, diarrhoea, respiratory infections', sideEffects: 'Nausea, headache, tendon rupture (rare)', usage: 'Take with plenty of water; avoid antacids within 2 h', category: 'Antibiotic (Fluoroquinolone)', warnings: 'Avoid in children; photosensitivity possible' },
  { name: 'Amoxicillin-Clavulanate (Augmentin)', generic: 'Amoxicillin + Clavulanate', purpose: 'Beta-lactamase-producing bacterial infections', sideEffects: 'Diarrhoea, nausea, rash', usage: 'Take at the start of a meal', category: 'Antibiotic (Penicillin + BLI)' },
  { name: 'Doxycycline (Doxy-1)', generic: 'Doxycycline hyclate', purpose: 'Acne, malaria prophylaxis, bacterial infections', sideEffects: 'Photosensitivity, oesophageal irritation, nausea', usage: 'Take upright with full glass of water; avoid lying down 30 min after', category: 'Antibiotic (Tetracycline)', warnings: 'Avoid sun exposure; not for < 8 years or pregnancy' },
  { name: 'Metronidazole (Flagyl)', generic: 'Metronidazole', purpose: 'Anaerobic bacterial/protozoal infections, giardiasis, H. pylori', sideEffects: 'Metallic taste, nausea, dark urine', usage: 'Take with or after food; complete course', category: 'Antibiotic / Antiprotozoal', warnings: 'Strictly avoid alcohol — severe reaction' },
  { name: 'Cephalexin (Sporidex)', generic: 'Cefalexin', purpose: 'Skin, respiratory, and UTI infections', sideEffects: 'Diarrhoea, nausea, rash', usage: 'Take 4 times daily; complete the course', category: 'Antibiotic (Cephalosporin)' },
  { name: 'Cefixime (Suprax)', generic: 'Cefixime trihydrate', purpose: 'Typhoid, UTI, pharyngitis, gonorrhoea', sideEffects: 'Diarrhoea, abdominal pain, headache', usage: 'Can be taken with or without food', category: 'Antibiotic (Cephalosporin)' },
  { name: 'Levofloxacin (Levaquin)', generic: 'Levofloxacin', purpose: 'Pneumonia, UTI, sinusitis, typhoid', sideEffects: 'Nausea, headache, tendinitis, dizziness', usage: 'Take with plenty of water; avoid antacids', category: 'Antibiotic (Fluoroquinolone)', warnings: 'Avoid prolonged use; tendon rupture possible in elderly' },
  { name: 'Clarithromycin (Klaricid)', generic: 'Clarithromycin', purpose: 'Respiratory infections, H. pylori eradication', sideEffects: 'Metallic taste, nausea, QT prolongation', usage: 'Take with or without food; complete course', category: 'Antibiotic (Macrolide)' },
  { name: 'Clindamycin (Dalacin)', generic: 'Clindamycin HCl', purpose: 'Severe skin, bone, dental, abdominal infections', sideEffects: 'Diarrhoea (including C. difficile), GI upset', usage: 'Take with a full glass of water', category: 'Antibiotic (Lincosamide)', warnings: 'Stop immediately if severe diarrhoea develops' },
  // ── Antidiabetics ──
  { name: 'Metformin (Glycomet)', generic: 'Metformin HCl', purpose: 'Type 2 diabetes blood-sugar control', sideEffects: 'Nausea, diarrhoea, stomach upset', usage: 'Take with or after meals', category: 'Antidiabetic (Biguanide)', warnings: 'Stop before contrast imaging; avoid in severe renal impairment' },
  { name: 'Glibenclamide (Daonil)', generic: 'Glibenclamide', purpose: 'Type 2 diabetes blood-sugar lowering', sideEffects: 'Hypoglycaemia, weight gain, nausea', usage: 'Take with or just before meals', category: 'Antidiabetic (Sulfonylurea)', warnings: 'Do not skip meals — risk of low blood sugar' },
  { name: 'Glimepiride (Amaryl)', generic: 'Glimepiride', purpose: 'Type 2 diabetes', sideEffects: 'Hypoglycaemia, dizziness, weight gain', usage: 'Take before the first main meal of the day', category: 'Antidiabetic (Sulfonylurea)' },
  { name: 'Voglibose (Volix)', generic: 'Voglibose', purpose: 'Post-meal blood sugar spikes in Type 2 Diabetes', sideEffects: 'Flatulence, abdominal bloating, diarrhoea', usage: 'Take just before meals — must eat immediately after', category: 'Antidiabetic (Alpha-glucosidase inhibitor)' },
  { name: 'Sitagliptin (Januvia)', generic: 'Sitagliptin phosphate', purpose: 'Type 2 diabetes (adjunct to diet & exercise)', sideEffects: 'Nasopharyngitis, headache, joint pain', usage: 'Take once daily with or without food', category: 'Antidiabetic (DPP-4 Inhibitor)' },
  { name: 'Dapagliflozin (Forxiga)', generic: 'Dapagliflozin', purpose: 'Type 2 diabetes; heart failure; chronic kidney disease', sideEffects: 'UTI, genital fungal infections, polyuria', usage: 'Take once daily in the morning', category: 'Antidiabetic (SGLT-2 Inhibitor)', warnings: 'Increased risk of DKA; stay well hydrated' },
  { name: 'Insulin Glargine (Lantus)', generic: 'Insulin glargine', purpose: 'Long-acting basal insulin for Type 1 & 2 Diabetes', sideEffects: 'Hypoglycaemia, injection site reactions', usage: 'Inject subcutaneously once daily at the same time', category: 'Insulin (Long-acting)', warnings: 'Never mix or dilute; store unused pens in refrigerator' },
  // ── Cardiovascular ──
  { name: 'Amlodipine (Amlip)', generic: 'Amlodipine besylate', purpose: 'Hypertension and stable angina', sideEffects: 'Ankle oedema, flushing, dizziness', usage: 'Take once daily, with or without food', category: 'Calcium Channel Blocker' },
  { name: 'Atenolol (Tenormin)', generic: 'Atenolol', purpose: 'Hypertension, angina, post-MI heart rate control', sideEffects: 'Bradycardia, fatigue, cold extremities', usage: 'Take once or twice daily; do not skip doses', category: 'Beta Blocker', warnings: 'Never stop abruptly — can precipitate MI' },
  { name: 'Metoprolol (Betaloc)', generic: 'Metoprolol succinate', purpose: 'Hypertension, heart failure, arrhythmia, angina', sideEffects: 'Fatigue, dizziness, bradycardia', usage: 'Take with or after food; do not crush SR tablets', category: 'Beta Blocker', warnings: 'Taper dose before stopping' },
  { name: 'Enalapril (Enam)', generic: 'Enalapril maleate', purpose: 'Hypertension, heart failure', sideEffects: 'Dry cough, hypotension, high potassium', usage: 'Take once or twice daily with or without food', category: 'ACE Inhibitor', warnings: 'Avoid in pregnancy; stop if angioedema occurs' },
  { name: 'Ramipril (Cardace)', generic: 'Ramipril', purpose: 'Hypertension, heart failure, stroke/MI prevention', sideEffects: 'Dry cough, dizziness, elevated potassium', usage: 'Take once daily; swallow whole', category: 'ACE Inhibitor', warnings: 'Avoid in pregnancy and bilateral renal artery stenosis' },
  { name: 'Losartan (Losar)', generic: 'Losartan potassium', purpose: 'Hypertension, diabetic nephropathy', sideEffects: 'Dizziness, high potassium, back pain', usage: 'Take once daily with or without food', category: 'ARB', warnings: 'Contraindicated in pregnancy' },
  { name: 'Telmisartan (Telma)', generic: 'Telmisartan', purpose: 'Hypertension, cardiovascular risk reduction', sideEffects: 'Dizziness, back pain, sinusitis', usage: 'Take once daily at the same time each day', category: 'ARB', warnings: 'Avoid in pregnancy' },
  { name: 'Atorvastatin (Lipitor)', generic: 'Atorvastatin calcium', purpose: 'High cholesterol, cardiovascular risk reduction', sideEffects: 'Muscle pain, liver enzyme rise, GI upset', usage: 'Take once daily; grapefruit juice reduces effect', category: 'Statin', warnings: 'Report unexplained muscle pain immediately' },
  { name: 'Rosuvastatin (Crestor)', generic: 'Rosuvastatin calcium', purpose: 'High cholesterol and cardiovascular risk', sideEffects: 'Muscle pain, headache, abdominal pain', usage: 'Take once daily, any time of day', category: 'Statin', warnings: 'Avoid high doses in Asian patients; check liver function' },
  { name: 'Clopidogrel (Plavix)', generic: 'Clopidogrel bisulfate', purpose: 'Prevention of blood clots after MI or stroke', sideEffects: 'Bleeding, bruising, GI upset', usage: 'Take once daily with or without food', category: 'Antiplatelet', warnings: 'Do not stop without doctor guidance; interacts with PPIs' },
  { name: 'Furosemide (Lasix)', generic: 'Furosemide', purpose: 'Oedema in heart failure, kidney/liver disease; hypertension', sideEffects: 'Increased urination, low potassium, dehydration', usage: 'Take in the morning to avoid nocturia', category: 'Loop Diuretic', warnings: 'Monitor potassium; can worsen gout and diabetes' },
  { name: 'Digoxin (Lanoxin)', generic: 'Digoxin', purpose: 'Heart failure and atrial fibrillation rate control', sideEffects: 'Nausea, yellow-green visual halos, arrhythmia (toxicity)', usage: 'Take at same time daily; regular blood-level checks', category: 'Cardiac Glycoside', warnings: 'Very narrow therapeutic window — toxicity is dangerous' },
  { name: 'Isosorbide Mononitrate (Imdur)', generic: 'Isosorbide-5-mononitrate', purpose: 'Angina prevention', sideEffects: 'Headache, dizziness, hypotension', usage: 'Take in morning; allow nitrate-free interval to prevent tolerance', category: 'Nitrate', warnings: 'Never combine with PDE5 inhibitors (sildenafil etc.)' },
  // ── Gastrointestinal ──
  { name: 'Omeprazole (Omez)', generic: 'Omeprazole', purpose: 'GERD, peptic ulcers, Zollinger-Ellison syndrome', sideEffects: 'Headache, nausea, diarrhoea, B12 deficiency (long-term)', usage: 'Take 30 min before first meal of the day', category: 'Proton Pump Inhibitor' },
  { name: 'Pantoprazole (Pan)', generic: 'Pantoprazole sodium', purpose: 'Acid-related diseases, H. pylori eradication', sideEffects: 'Headache, diarrhoea, abdominal pain', usage: 'Take 30–60 min before meals; swallow whole', category: 'Proton Pump Inhibitor' },
  { name: 'Rabeprazole (Razo)', generic: 'Rabeprazole sodium', purpose: 'GERD, duodenal ulcer, H. pylori', sideEffects: 'Headache, nausea, flatulence', usage: 'Take before meals; do not crush', category: 'Proton Pump Inhibitor' },
  { name: 'Domperidone (Domstal)', generic: 'Domperidone', purpose: 'Nausea, vomiting, gastric motility disorders', sideEffects: 'Dry mouth, headache, raised prolactin', usage: 'Take 15–30 min before meals', category: 'Prokinetic / Antiemetic', warnings: 'Cardiac arrhythmia risk at high doses; use lowest effective dose' },
  { name: 'Ondansetron (Emeset)', generic: 'Ondansetron HCl', purpose: 'Nausea and vomiting (chemo, surgery, pregnancy)', sideEffects: 'Headache, constipation, QT prolongation', usage: 'Take 30 min before event likely to cause nausea', category: 'Antiemetic (5-HT3 Antagonist)' },
  { name: 'Metoclopramide (Perinorm)', generic: 'Metoclopramide HCl', purpose: 'Nausea, vomiting, gastroparesis, GERD', sideEffects: 'Drowsiness, restlessness, tardive dyskinesia (long-term)', usage: 'Take 30 min before meals', category: 'Prokinetic / Antiemetic', warnings: 'Do not use > 12 weeks — tardive dyskinesia risk' },
  { name: 'Loperamide (Imodium)', generic: 'Loperamide HCl', purpose: 'Acute and chronic diarrhoea', sideEffects: 'Constipation, abdominal cramps, dizziness', usage: 'Take after each loose stool; do not exceed daily limit', category: 'Antidiarrheal', warnings: 'Do not use with fever or bloody stools' },
  { name: 'ORS (Electral)', generic: 'Oral Rehydration Salts', purpose: 'Dehydration due to diarrhoea and vomiting', sideEffects: 'Very rare; hypernatraemia if misused', usage: 'Dissolve sachet in 1 litre of clean water; sip frequently', category: 'Rehydration Salt' },
  { name: 'Lactulose (Duphalac)', generic: 'Lactulose', purpose: 'Constipation, hepatic encephalopathy', sideEffects: 'Flatulence, bloating, diarrhoea at high doses', usage: 'Take with water or juice; may take up to 48 h for effect', category: 'Osmotic Laxative' },
  { name: 'Activated Charcoal (Carbomix)', generic: 'Activated charcoal', purpose: 'Drug overdose/poisoning; bloating and gas', sideEffects: 'Black stools, constipation, vomiting', usage: 'Take as directed by physician or poison control immediately', category: 'Adsorbent / Antidote', warnings: 'Not effective for all poisons; seek emergency care' },
  // ── Respiratory ──
  { name: 'Salbutamol (Asthalin)', generic: 'Albuterol', purpose: 'Acute bronchospasm relief in asthma and COPD', sideEffects: 'Tremor, palpitations, headache, anxiety', usage: 'Inhale 1–2 puffs as needed; wait 1 min between puffs', category: 'Bronchodilator (SABA)' },
  { name: 'Montelukast (Singulair)', generic: 'Montelukast sodium', purpose: 'Asthma prevention, allergic rhinitis', sideEffects: 'Headache, stomach pain, mood changes (rare)', usage: 'Take once daily in the evening', category: 'Leukotriene Receptor Antagonist', warnings: 'Monitor for mood/behavioural changes' },
  { name: 'Budesonide Inhaler (Budecort)', generic: 'Budesonide', purpose: 'Maintenance treatment of asthma and COPD', sideEffects: 'Oral candidiasis, hoarseness, sore throat', usage: 'Rinse mouth with water after each use', category: 'Inhaled Corticosteroid' },
  { name: 'Theophylline (Deriphyllin)', generic: 'Theophylline + Etofylline', purpose: 'Asthma and COPD bronchospasm', sideEffects: 'Nausea, headache, palpitations, insomnia', usage: 'Take with food; avoid caffeine', category: 'Xanthine Bronchodilator', warnings: 'Narrow therapeutic index; many drug interactions' },
  { name: 'N-Acetylcysteine (Mucomyst)', generic: 'N-Acetylcysteine', purpose: 'Mucolytic for respiratory secretions; paracetamol overdose antidote', sideEffects: 'Nausea, vomiting, rash', usage: 'Dissolve effervescent tablet in water; take after meals', category: 'Mucolytic / Antidote' },
  // ── Allergy & Dermatology ──
  { name: 'Cetirizine (Cetzine)', generic: 'Cetirizine HCl', purpose: 'Allergic rhinitis, xurticaria, hay fever', sideEffects: 'Mild drowsiness, dry mouth, headache', usage: 'Take once daily, preferably at night', category: 'Antihistamine (2nd gen)' },
  { name: 'Fexofenadine (Allegra)', generic: 'Fexofenadine HCl', purpose: 'Allergic rhinitis and chronic urticaria', sideEffects: 'Headache, nausea, dizziness — non-sedating', usage: 'Take with water; avoid fruit juices within 4 h', category: 'Antihistamine (2nd gen)' },
  { name: 'Chlorpheniramine (Piriton)', generic: 'Chlorpheniramine maleate', purpose: 'Allergy, common cold, insect bites', sideEffects: 'Drowsiness, dry mouth, urinary retention', usage: 'Take with food; avoid driving', category: 'Antihistamine (1st gen)' },
  { name: 'Betamethasone cream (Betnovate)', generic: 'Betamethasone valerate', purpose: 'Eczema, psoriasis, allergic dermatitis', sideEffects: 'Skin thinning, stretch marks, fungal superinfection with prolonged use', usage: 'Apply thin layer to affected area; do not occlude face or genital area', category: 'Topical Corticosteroid', warnings: 'Do not use on face long-term; avoid in skin infections' },
  { name: 'Clotrimazole cream (Canesten)', generic: 'Clotrimazole', purpose: 'Fungal skin infections: ringworm, athlete\'s foot, candidiasis', sideEffects: 'Mild burning, itching, redness', usage: 'Apply 2–3 times daily; continue for 2 weeks after symptoms clear', category: 'Antifungal (Topical)' },
  { name: 'Fluconazole (Fluconac)', generic: 'Fluconazole', purpose: 'Systemic and mucosal fungal infections, vaginal candidiasis', sideEffects: 'Nausea, headache, rash, liver toxicity', usage: 'Take with or without food; single dose for vaginal thrush', category: 'Antifungal (Systemic)', warnings: 'Many drug interactions; check liver function in prolonged use' },
  // ── Thyroid ──
  { name: 'Levothyroxine (Thyronorm)', generic: 'Levothyroxine sodium', purpose: 'Hypothyroidism replacement therapy', sideEffects: 'Palpitations, insomnia, weight loss (if over-dosed)', usage: 'Take on empty stomach 30–60 min before breakfast', category: 'Thyroid Hormone', warnings: 'Many drug interactions; regular TSH monitoring required' },
  { name: 'Carbimazole (Neomercazole)', generic: 'Carbimazole', purpose: 'Hyperthyroidism (Graves disease, toxic goitre)', sideEffects: 'Rash, nausea, agranulocytosis (rare)', usage: 'Take at regular intervals with or without food', category: 'Antithyroid', warnings: 'Stop immediately and seek care if fever/sore throat develops' },
  // ── Vitamins & Supplements ──
  { name: 'Vitamin D3 (Calcirol)', generic: 'Cholecalciferol', purpose: 'Vitamin D3 deficiency, bone health, immune support', sideEffects: 'Hypercalcaemia with very high doses', usage: 'Take with a fatty meal for best absorption', category: 'Vitamin / Supplement' },
  { name: 'Calcium + Vit D3 (Shelcal)', generic: 'Calcium carbonate + Cholecalciferol', purpose: 'Calcium and Vitamin D deficiency, osteoporosis prevention', sideEffects: 'Constipation, bloating, hypercalcaemia', usage: 'Take with meals; space from iron supplements by 2 h', category: 'Vitamin / Supplement' },
  { name: 'Folic Acid (Folvite)', generic: 'Folate', purpose: 'Neural tube defect prevention, folate-deficiency anaemia', sideEffects: 'Generally well tolerated; very rare allergic reactions', usage: 'Take once daily; start before conception in women planning pregnancy', category: 'Vitamin / Supplement' },
  { name: 'Iron + Folic Acid (Ferrous Sulphate)', generic: 'Ferrous sulphate + Folic acid', purpose: 'Iron-deficiency anaemia; pregnancy anaemia', sideEffects: 'Constipation, dark stools, nausea', usage: 'Take on empty stomach; space from antacids and tea by 2 h', category: 'Haematinic', warnings: 'Dark stools are normal; overdose is dangerous in children' },
  { name: 'Vitamin B12 (Methylcobalamin)', generic: 'Methylcobalamin', purpose: 'Vitamin B12 deficiency, neuropathy, anaemia', sideEffects: 'Generally safe; occasional nausea', usage: 'Take with or without food', category: 'Vitamin / Supplement' },
  // ── Neurological & Psychiatric ──
  { name: 'Sertraline (Zoloft)', generic: 'Sertraline HCl', purpose: 'Depression, anxiety, OCD, PTSD', sideEffects: 'Nausea, insomnia, dry mouth, sexual dysfunction', usage: 'Take once daily; allow 4–6 weeks for full effect', category: 'SSRI Antidepressant', warnings: 'Do not stop abruptly; monitor for suicidality early in treatment' },
  { name: 'Escitalopram (Nexito)', generic: 'Escitalopram oxalate', purpose: 'Depression and generalised anxiety disorder', sideEffects: 'Nausea, insomnia, sweating, headache', usage: 'Take once daily; morning or evening', category: 'SSRI Antidepressant', warnings: 'Avoid abrupt withdrawal; QT prolongation at high doses' },
  { name: 'Alprazolam (Restyl)', generic: 'Alprazolam', purpose: 'Anxiety disorders, panic disorder', sideEffects: 'Sedation, dependence, cognitive impairment', usage: 'Take as prescribed; do not drive', category: 'Benzodiazepine', warnings: 'High dependence potential; do not combine with alcohol or opioids' },
  { name: 'Diazepam (Calmpose)', generic: 'Diazepam', purpose: 'Anxiety, muscle spasms, alcohol withdrawal, seizures', sideEffects: 'Drowsiness, confusion, dependence', usage: 'Take exactly as prescribed; do not drive', category: 'Benzodiazepine', warnings: 'Serious dependence risk; avoid with alcohol' },
  { name: 'Phenytoin (Eptoin)', generic: 'Phenytoin sodium', purpose: 'Epilepsy (grand mal, focal seizures)', sideEffects: 'Gum overgrowth, nystagmus, rash, folate deficiency', usage: 'Take with or after meals; do not skip doses', category: 'Anticonvulsant', warnings: 'Narrow therapeutic index; monitor blood levels regularly' },
  { name: 'Levetiracetam (Levroxa)', generic: 'Levetiracetam', purpose: 'Partial and generalised seizures', sideEffects: 'Drowsiness, irritability, headache', usage: 'Take twice daily with or without food; do not stop abruptly', category: 'Anticonvulsant' },
  { name: 'Pregabalin (Lyrica)', generic: 'Pregabalin', purpose: 'Neuropathic pain, fibromyalgia, partial seizures, anxiety', sideEffects: 'Dizziness, drowsiness, weight gain, peripheral oedema', usage: 'Take 2–3 times daily; do not stop abruptly', category: 'Gabapentinoid', warnings: 'Dependence potential; avoid with alcohol' },
  { name: 'Gabapentin (Gabantin)', generic: 'Gabapentin', purpose: 'Neuropathic pain, partial seizures', sideEffects: 'Dizziness, somnolence, ataxia', usage: 'Take 3 times daily; can be taken with food', category: 'Gabapentinoid', warnings: 'Do not stop abruptly' },
  // ── Antimalarials & Antiparasitals ──
  { name: 'Chloroquine (Lariago)', generic: 'Chloroquine phosphate', purpose: 'Malaria treatment and prophylaxis; autoimmune conditions', sideEffects: 'Nausea, retinal toxicity (long-term), headache', usage: 'Take with food; eye exams needed with long-term use', category: 'Antimalarial', warnings: 'Retinal toxicity with prolonged use; check G6PD deficiency' },
  { name: 'Hydroxychloroquine (HCQS)', generic: 'Hydroxychloroquine sulphate', purpose: 'Rheumatoid arthritis, lupus, malaria', sideEffects: 'Nausea, retinal toxicity, QT prolongation', usage: 'Take with food or milk', category: 'Antimalarial / DMARD', warnings: 'Annual eye screening required for long-term use' },
  { name: 'Albendazole (Zentel)', generic: 'Albendazole', purpose: 'Worm infestations (roundworm, tapeworm, hookworm)', sideEffects: 'Nausea, headache, raised liver enzymes', usage: 'Take with a fatty meal; single dose for most worm infections', category: 'Anthelmintic' },
  { name: 'Ivermectin (Ivermectol)', generic: 'Ivermectin', purpose: 'Scabies, filariasis, strongyloides, head lice', sideEffects: 'Dizziness, nausea, Mazzotti reaction (in filariasis)', usage: 'Take on empty stomach with water; single dose', category: 'Antiparasitic' },
  // ── Bone & Joints ──
  { name: 'Calcium + Vitamin D (Shelcal HD)', generic: 'Calcium carbonate + Vit D3', purpose: 'Osteoporosis prevention and treatment', sideEffects: 'Constipation, kidney stones with excess use', usage: 'Take with meals for best absorption', category: 'Bone Health Supplement' },
  { name: 'Alendronate (Osteofos)', generic: 'Alendronic acid', purpose: 'Osteoporosis treatment and prevention', sideEffects: 'Oesophageal irritation, bone/joint pain, hypocalcaemia', usage: 'Take on empty stomach with 200 mL water; stay upright for 30 min', category: 'Bisphosphonate', warnings: 'Never lie down after taking; jaw osteonecrosis with long-term use' },
  { name: 'Methotrexate (Folitrax)', generic: 'Methotrexate', purpose: 'Rheumatoid arthritis, psoriasis, certain cancers', sideEffects: 'Mouth ulcers, nausea, liver toxicity, bone marrow suppression', usage: 'Take once weekly — NOT daily; take folic acid same week', category: 'DMARD / Antimetabolite', warnings: 'Teratogenic; strict contraception required; regular blood monitoring essential' },
  // ── Women\'s Health ──
  { name: 'Norethisterone (Primolut N)', generic: 'Norethisterone', purpose: 'Menstrual irregularities, endometriosis, postponing menstruation', sideEffects: 'Nausea, bloating, headache, breakthrough bleeding', usage: 'Take as directed by gynaecologist; do not self-prescribe', category: 'Progestogen' },
  { name: 'Mifepristone + Misoprostol (MTP Kit)', generic: 'Mifepristone + Misoprostol', purpose: 'Medical termination of pregnancy up to 9 weeks', sideEffects: 'Cramping, heavy bleeding, nausea', usage: 'Strictly under medical supervision only', category: 'Abortifacient', warnings: 'For use only under physician guidance; ectopic pregnancy must be excluded' },
  { name: 'Clomiphene (Siphene)', generic: 'Clomiphene citrate', purpose: 'Ovulation induction in infertility', sideEffects: 'Hot flushes, mood swings, ovarian enlargement, multiple pregnancies', usage: 'Take as prescribed; monitor ovulation with ultrasound', category: 'Fertility Drug', warnings: 'Multiple pregnancy risk; ovarian hyperstimulation syndrome possible' },
  // ── Miscellaneous & Common OTC ──
  { name: 'Antacid (Digene / Gelusil)', generic: 'Magnesium hydroxide + Aluminium hydroxide', purpose: 'Heartburn, acidity, gastric discomfort', sideEffects: 'Constipation (Al salts), diarrhoea (Mg salts)', usage: 'Chew tablet or take liquid 1 h after meals and at bedtime', category: 'Antacid', warnings: 'Reduces absorption of many drugs — space by at least 2 h' },
  { name: 'Chlorhexidine Mouthwash (Hexidine)', generic: 'Chlorhexidine gluconate', purpose: 'Gingivitis, oral ulcers, post-dental infection antisepsis', sideEffects: 'Tooth staining, taste disturbance', usage: 'Rinse for 30 sec after brushing; do not swallow', category: 'Oral Antiseptic' },
  { name: 'Povidone-Iodine (Betadine)', generic: 'Povidone-iodine', purpose: 'Wound cleaning, skin antisepsis, throat gargle', sideEffects: 'Skin irritation, iodine hypersensitivity', usage: 'Dilute before gargling; do not use on deep wounds long-term', category: 'Topical Antiseptic', warnings: 'Avoid in thyroid disease and pregnancy' },
  { name: 'Warfarin (Warf)', generic: 'Warfarin sodium', purpose: 'DVT, pulmonary embolism, stroke prevention in AF', sideEffects: 'Bleeding, bruising, hair loss', usage: 'Take at the same time daily; regular INR monitoring essential', category: 'Anticoagulant', warnings: 'Many food/drug interactions; avoid NSAIDs and Vitamin K-rich foods in excess' },
  { name: 'Heparin (Injection)', generic: 'Unfractionated Heparin', purpose: 'Deep vein thrombosis, pulmonary embolism treatment; anticoagulation during surgery', sideEffects: 'Bleeding, heparin-induced thrombocytopenia (HIT)', usage: 'Administered by healthcare professional only (IV/SC)', category: 'Anticoagulant (Parenteral)', warnings: 'Life-threatening bleeding risk; platelet monitoring required' },
  { name: 'Zinc Supplements (Zincovit)', generic: 'Zinc sulphate / gluconate', purpose: 'Zinc deficiency, diarrhoea in children, wound healing support', sideEffects: 'Nausea, metallic taste, copper deficiency at high doses', usage: 'Take with or after food', category: 'Mineral Supplement' },
  { name: 'Rabies Vaccine (Rabipur)', generic: 'Inactivated Rabies Virus', purpose: 'Post-exposure prophylaxis after animal bite', sideEffects: 'Injection site pain, redness, mild fever', usage: 'Follow the prescribed schedule; do not miss doses', category: 'Vaccine', warnings: 'Must be combined with Rabies Immunoglobulin for unvaccinated individuals' },
  { name: 'Tetanus Toxoid (TT Vaccine)', generic: 'Tetanus Toxoid', purpose: 'Tetanus prevention after injury', sideEffects: 'Injection site soreness, mild fever', usage: 'Single IM injection; booster every 10 years', category: 'Vaccine' },
  { name: 'Ranitidine (Zinetac)', generic: 'Ranitidine HCl', purpose: 'Peptic ulcer, GERD, xheartburn', sideEffects: 'Headache, dizziness, constipation', usage: 'Take before meals or at bedtime', category: 'H2 Blocker' },
  { name: 'Spironolactone (Aldactone)', generic: 'Spironolactone', purpose: 'Heart failure, oedema, hypertension, PCOS-related acne', sideEffects: 'High potassium, breast tenderness, irregular periods', usage: 'Take with food', category: 'Potassium-sparing Diuretic', warnings: 'Monitor potassium; avoid potassium supplements' },
  { name: 'Prednisolone (Wysolone)', generic: 'Prednisolone', purpose: 'Asthma flares, allergic conditions, autoimmune disease', sideEffects: 'Weight gain, elevated blood sugar, mood changes, immune suppression', usage: 'Take with food in the morning; taper dose as directed', category: 'Corticosteroid', warnings: 'Never stop abruptly after prolonged use; increases infection risk' },
];

const emptyProfile: PatientProfile = {
  id: '',
  user_id: '',
  age: null,
  gender: '',
  allergies: '',
  chronic_conditions: '',
  address: '',
};

function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleString();
}

function formatSummary(summary?: AISummary | null) {
  if (!summary) return 'No SOAP summary available yet.';
  return [
    `Subjective: ${summary.subjective || 'Not documented'}`,
    `Objective: ${summary.objective || 'Not documented'}`,
    `Assessment: ${summary.assessment || 'Not documented'}`,
    `Plan: ${summary.plan || 'Not documented'}`,
  ].join('\n\n');
}

function formatReportAnalysis(parsedData?: string | null) {
  if (!parsedData) return '';

  try {
    const data = JSON.parse(parsedData) as Record<string, any>;
    // The Gemini JSON is nested under the 'analysis' key
    const analysis = data.analysis || data;
    const summary = analysis.clinical_summary || {};

    // Show only the overall clinical snapshot
    const snapshot = typeof summary.overall_clinical_snapshot === 'string'
      ? summary.overall_clinical_snapshot
      : '';

    return snapshot || 'Analysis complete. No summary found.';
  } catch {
    return parsedData || '';
  }
}

function reminderLabel(reminder: Reminder) {
  const due = new Date(reminder.time);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const days = Math.round((startDue - startToday) / 86400000);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 2) return `In ${days} days`;
  return formatDate(reminder.time);
}

function isUrgent(reminder: Reminder) {
  const text = reminder.message.toLowerCase();
  return text.includes('urgent') || reminderLabel(reminder) === 'Overdue' || reminderLabel(reminder) === 'Due today';
}

function formatDistance(meters?: number | null) {
  if (!meters && meters !== 0) return 'Distance unavailable';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km away`;
  return `${Math.round(meters)} m away`;
}

function openStatus(hospital: EmergencyHospital) {
  if (hospital.is_open === true) return 'Open now';
  if (hospital.is_open === false) return 'May be closed';
  return hospital.opening_hours ? `Hours: ${hospital.opening_hours}` : 'Open status not listed';
}

function PublicProfileView({ profile, loading }: { profile: PublicProfile | null, loading: boolean }) {
  if (loading) return <div className="auth-loading panel">Loading profile...</div>;
  if (!profile) return <div className="auth-loading panel">Profile not found or link expired.</div>;

  return (
    <main className="auth-shell" style={{ justifyContent: 'center' }}>
      <section className="panel auth-card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
        <div className="brand" style={{ marginBottom: '2rem', justifyContent: 'center' }}>
          <div className="brand-badge">M</div>
          <div style={{ textAlign: 'center' }}>
            <div className="eyebrow">MedAssist Emergency</div>
            <h1>Medical Summary</h1>
          </div>
        </div>

        <div className="stack" style={{ gap: '1.5rem' }}>
          <div className="profile-header" style={{ alignItems: 'center' }}>
            <div className="profile-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>{profile.name.charAt(0)}</div>
            <h2 style={{ fontSize: '1.75rem', marginTop: '1rem' }}>{profile.name}</h2>
            <span className="pill urgent" style={{ marginTop: '0.5rem' }}>Emergency Information</span>
          </div>

          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="stat-card" style={{ background: 'var(--surface-soft)', padding: '1rem', borderRadius: '12px' }}>
              <div className="eyebrow">Age</div>
              <strong style={{ fontSize: '1.25rem' }}>{profile.age || 'Not listed'}</strong>
            </div>
            <div className="stat-card" style={{ background: 'var(--surface-soft)', padding: '1rem', borderRadius: '12px' }}>
              <div className="eyebrow">Gender</div>
              <strong style={{ fontSize: '1.25rem' }}>{profile.gender || 'Not listed'}</strong>
            </div>
          </div>

          <div className="panel" style={{ background: 'rgba(255, 71, 87, 0.1)', borderColor: 'rgba(255, 71, 87, 0.3)' }}>
            <div className="eyebrow" style={{ color: '#ff4757' }}>Allergies</div>
            <p style={{ marginTop: '0.5rem', fontWeight: '600' }}>{profile.allergies || 'None reported'}</p>
          </div>

          <div className="panel">
            <div className="eyebrow">Chronic Conditions</div>
            <p style={{ marginTop: '0.5rem' }}>{profile.chronic_conditions || 'None reported'}</p>
          </div>

          <div style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
            This information is provided for emergency medical purposes only.
          </div>
        </div>
      </section>
    </main>
  );
}

function App() {
  const isPublicRoute = window.location.pathname.startsWith('/public-profile/');
  const routeProfileId = isPublicRoute ? window.location.pathname.split('/').pop() : null;
  const routeProfileToken = new URLSearchParams(window.location.search).get('token');

  const [authToken, setAuthToken] = useState(() => localStorage.getItem('medassist_token') || '');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  const [publicProfileId, setPublicProfileId] = useState<string | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [publicLoading, setPublicLoading] = useState(isPublicRoute);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (isPublicRoute && routeProfileId) {
      api.getPublicProfile(routeProfileId, routeProfileToken)
        .then(setPublicProfile)
        .catch((err: Error) => setFlash(err.message))
        .finally(() => setPublicLoading(false));
    }
  }, [isPublicRoute, routeProfileId, routeProfileToken]);

  if (isPublicRoute) {
    return <PublicProfileView profile={publicProfile} loading={publicLoading} />;
  }
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authReady, setAuthReady] = useState(!localStorage.getItem('medassist_token'));
  const [busy, setBusy] = useState('');
  const [flash, setFlash] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMedicineBox, setShowMedicineBox] = useState(false);
  const [medicineQuery, setMedicineQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineInfo | null>(null);

  const [doctors, setDoctors] = useState<DoctorDirectoryItem[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [patientVisits, setPatientVisits] = useState<DoctorVisit[]>([]);
  const [patientReports, setPatientReports] = useState<Array<{ id: string; file_url: string; parsed_data?: string | null; analysis_status?: string }>>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [patientReminders, setPatientReminders] = useState<Reminder[]>([]);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [intakeStatus, setIntakeStatus] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [prescriptionStatus, setPrescriptionStatus] = useState('');
  const [medicationStatus, setMedicationStatus] = useState('');
  const [notificationStatus, setNotificationStatus] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const [intakeOpen, setIntakeOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [intakeText, setIntakeText] = useState('');
  const [intakeMessages, setIntakeMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  // Voice input records audio with MediaRecorder and transcribes it on the
  // backend (Groq Whisper) — this works in Firefox too, unlike the old Web
  // Speech API approach, and is more accurate for medical/accented speech.
  const [voiceSupported] = useState(() =>
    typeof window !== 'undefined'
    && typeof MediaRecorder !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingBaseTextRef = useRef('');
  const [structuredData, setStructuredData] = useState<Record<string, unknown> | null>(null);
  const [lastSummary, setLastSummary] = useState<AISummary | null>(null);
  const [emergencyHospitals, setEmergencyHospitals] = useState<EmergencyHospital[]>([]);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  // Non-emergency triage advisory; intake continues.
  const [intakeAdvisory, setIntakeAdvisory] = useState('');
  const [intakeTriageLevel, setIntakeTriageLevel] = useState<
    'emergency' | 'urgent_care' | 'routine' | 'abstain' | null
  >(null);
  const [isSendingIntake, setIsSendingIntake] = useState(false);


  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    allergies: '',
    chronic_conditions: '',
    address: '',
    specialization: '',
    license_number: '',
    experience_years: '',
    hospital_affiliation: '',
  });

  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [doctorHistory, setDoctorHistory] = useState<DoctorVisit[]>([]);
  const [doctorReports, setDoctorReports] = useState<Array<{ id: string; file_url: string; parsed_data?: string | null; analysis_status?: string }>>([]);
  const [doctorReminders, setDoctorReminders] = useState<Reminder[]>([]);
  const [doctorReminderStatus, setDoctorReminderStatus] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<DoctorVisit | null>(null);
  const [sessionSnapshot, setSessionSnapshot] = useState<SessionState | null>(null);
  const [doctorSummary, setDoctorSummary] = useState<AISummary | null>(null);
  const [prescriptionNotes, setPrescriptionNotes] = useState('Continue current therapy and monitor response.');
  const [prescriptionId, setPrescriptionId] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [medicineType, setMedicineType] = useState<'tablet' | 'syrup'>('tablet');
  const [dosage, setDosage] = useState('');
  const [syrupQuantity, setSyrupQuantity] = useState('');
  const [duration, setDuration] = useState('');
  const [frequency, setFrequency] = useState<FrequencyOption>('once');
  const [customInstructions, setCustomInstructions] = useState('');
  const [prescriptionDraftStatus, setPrescriptionDraftStatus] = useState('');
  const [currentPrescriptionItems, setCurrentPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [doctorReminderTime, setDoctorReminderTime] = useState(() => {
    const value = new Date();
    value.setDate(value.getDate() + 2);
    return value.toISOString().slice(0, 16);
  });
  const [doctorReminderMessage, setDoctorReminderMessage] = useState('Doctor visit in 2 days');

  const [selectedTimelineVisit, setSelectedTimelineVisit] = useState<DoctorVisit | null>(null);
  const [timelineSummary, setTimelineSummary] = useState<AISummary | null>(null);

  // Indian Doctor License Verification State
  const [verifyLicenseNumber, setVerifyLicenseNumber] = useState('');
  const [verifyStateCouncil, setVerifyStateCouncil] = useState('National Medical Commission (MCI)');
  const [isVerifyingLicense, setIsVerifyingLicense] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{ message: string; success: boolean } | null>(null);

  const clearUserData = () => {
    setPatientProfile(null);
    setDoctorProfile(null);
    setFlash('');
    setBusy('');
    setShowNotifications(false);

    // Clear patient state
    setDoctors([]);
    setSelectedDoctorId('');
    setPatientVisits([]);
    setPatientReports([]);
    setPatientPrescriptions([]);
    setNotifications([]);
    setPatientReminders([]);
    setReportFile(null);
    setIntakeStatus('');
    setProfileStatus('');
    setReportStatus('');
    setPrescriptionStatus('');
    setMedicationStatus('');
    setNotificationStatus('');

    // Clear intake/chat state
    setIntakeOpen(false);
    setActiveSessionId('');
    setIntakeText('');
    setIntakeMessages([]);
    setStructuredData(null);
    setLastSummary(null);
    setEmergencyHospitals([]);
    setEmergencyMessage('');
    setIntakeAdvisory('');
    setIntakeTriageLevel(null);
    setIsSendingIntake(false);

    // Clear doctor state
    setPatients([]);
    setSelectedPatientId('');
    setDoctorHistory([]);
    setDoctorReports([]);
    setDoctorReminders([]);
    setDoctorReminderStatus('');
    setSelectedVisit(null);
    setSessionSnapshot(null);
    setDoctorSummary(null);
    setCurrentPrescriptionItems([]);
    setPrescriptionDraftStatus('');
  };

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.patient_id === selectedPatientId) || null,
    [patients, selectedPatientId],
  );

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId],
  );

  const setAuthContext = (context: AuthContext) => {
    setUser(context.user);
    setPatientProfile(context.patient_profile || null);
    setDoctorProfile(context.doctor_profile || null);
    setProfileForm({
      name: context.user.name || '',
      email: context.user.email || '',
      phone: context.user.phone || '',
      age: String(context.patient_profile?.age || ''),
      gender: context.patient_profile?.gender || '',
      allergies: context.patient_profile?.allergies || '',
      chronic_conditions: context.patient_profile?.chronic_conditions || '',
      address: context.patient_profile?.address || '',
      specialization: context.doctor_profile?.specialization || '',
      license_number: context.doctor_profile?.license_number || '',
      experience_years: String(context.doctor_profile?.experience_years || ''),
      hospital_affiliation: context.doctor_profile?.hospital_affiliation || '',
    });
  };

  useEffect(() => {
    if (!authToken) {
      setUser(null);
      setPatientProfile(null);
      setAuthReady(true);
      return;
    }

    let active = true;
    setAuthReady(false);
    api.me(authToken)
      .then((context) => {
        if (active) setAuthContext(context);
      })
      .catch(() => {
        localStorage.removeItem('medassist_token');
        setAuthToken('');
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, [authToken]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const profileId = params.get('profile');
    if (profileId) {
      setPublicProfileId(profileId);
      api.getPublicProfile(profileId, params.get('token'))
        .then(setPublicProfile)
        .catch((err: Error) => setFlash(`Error loading profile: ${err.message}`));
    }
  }, []);

  const refreshNotifications = async () => {
    if (!authToken) return;
    try {
      setNotifications(await api.listNotifications(authToken));
    } catch (error) {
      setNotificationStatus(error instanceof Error ? error.message : 'Could not load notifications');
    }
  };

  const refreshPatientData = async () => {
    if (!authToken || !user || user.role !== 'patient') return;
    setBusy('Loading your dashboard');
    try {
      const [doctorResult, visitResult, reportResult, prescriptionResult, reminderResult, notificationResult] = await Promise.allSettled([
        api.listDoctors(authToken),
        api.getMyVisits(authToken),
        api.listReports(user.id, authToken),
        api.getMyPrescriptions(authToken),
        api.listMyReminders(authToken),
        api.listNotifications(authToken),
      ]);
      const doctorList = doctorResult.status === 'fulfilled' ? doctorResult.value : [];
      setDoctors(doctorList);
      setSelectedDoctorId((current) => (
        doctorList.some((doctor) => doctor.id === current)
          ? current
          : doctorList[0]?.id || ''
      ));
      setPatientVisits(visitResult.status === 'fulfilled' ? visitResult.value : []);
      setPatientReports(reportResult.status === 'fulfilled' ? reportResult.value : []);
      setPatientPrescriptions(
        prescriptionResult.status === 'fulfilled' ? prescriptionResult.value : [],
      );
      setPatientReminders(reminderResult.status === 'fulfilled' ? reminderResult.value : []);
      setNotifications(
        notificationResult.status === 'fulfilled' ? notificationResult.value : [],
      );

      const failures = settledFailureMessage([
        ['Doctors', doctorResult],
        ['Visits', visitResult],
        ['Reports', reportResult],
        ['Prescriptions', prescriptionResult],
        ['Reminders', reminderResult],
        ['Notifications', notificationResult],
      ]);
      setNotificationStatus(failures ? `Some dashboard data could not be loaded — ${failures}` : '');
    } finally {
      setBusy('');
    }
  };

  const refreshDoctorData = async () => {
    if (!authToken || !user || user.role !== 'doctor') return;
    setBusy('Loading doctor dashboard');
    try {
      const [patientResult, notificationResult] = await Promise.allSettled([
        api.listPatients(authToken),
        api.listNotifications(authToken),
      ]);
      const loadedPatients = patientResult.status === 'fulfilled' ? patientResult.value : [];
      setPatients(loadedPatients);
      setNotifications(
        notificationResult.status === 'fulfilled' ? notificationResult.value : [],
      );
      setSelectedPatientId((current) => (
        loadedPatients.some((patient) => patient.patient_id === current)
          ? current
          : loadedPatients[0]?.patient_id || ''
      ));

      const failures = settledFailureMessage([
        ['Patients', patientResult],
        ['Notifications', notificationResult],
      ]);
      setNotificationStatus(failures ? `Some dashboard data could not be loaded — ${failures}` : '');
    } finally {
      setBusy('');
    }
  };

  useEffect(() => {
    void refreshPatientData();
    void refreshDoctorData();
  }, [authToken, user?.id, user?.role]);

  useEffect(() => {
    if (!authToken || !selectedPatientId || user?.role !== 'doctor') return;
    setDoctorReminderStatus('');
    setDoctorHistory([]);
    setDoctorReports([]);
    setDoctorReminders([]);
    setSelectedVisit(null);
    setBusy('Loading patient timeline');
    Promise.allSettled([
      api.getPatientHistory(selectedPatientId, authToken),
      api.listPatientReports(selectedPatientId, authToken),
      api.listReminders(selectedPatientId, authToken),
    ])
      .then(([historyResult, reportResult, reminderResult]) => {
        const history = historyResult.status === 'fulfilled' ? historyResult.value : [];
        setDoctorHistory(history);
        setDoctorReports(reportResult.status === 'fulfilled' ? reportResult.value : []);
        setDoctorReminders(
          reminderResult.status === 'fulfilled' ? reminderResult.value : [],
        );
        setSelectedVisit(history[0] || null);
        const failures = settledFailureMessage([
          ['Visit history', historyResult],
          ['Reports', reportResult],
          ['Reminders', reminderResult],
        ]);
        if (failures) {
          setFlash(`Some patient data could not be loaded — ${failures}`);
        }
      })
      .finally(() => setBusy(''));
  }, [authToken, selectedPatientId, user?.role]);

  useEffect(() => {
    if (!authToken || !selectedVisit?.session_id) {
      setSessionSnapshot(null);
      setDoctorSummary(null);
      return;
    }

    Promise.allSettled([
      api.getSession(selectedVisit.session_id, authToken),
      api.getSummary(selectedVisit.session_id, authToken),
    ]).then(([sessionResult, summaryResult]) => {
      setSessionSnapshot(sessionResult.status === 'fulfilled' ? sessionResult.value : null);
      setDoctorSummary(summaryResult.status === 'fulfilled' ? summaryResult.value : null);
    });
  }, [authToken, selectedVisit?.session_id]);

  useEffect(() => {
    let active = true;
    const defaultNotes = 'Continue current therapy and monitor response.';

    setPrescriptionId('');
    setCurrentPrescriptionItems([]);
    setPrescriptionNotes(defaultNotes);
    setPrescriptionStatus('');
    setMedicationStatus('');
    setMedicationName('');
    setDosage('');
    setSyrupQuantity('');
    setDuration('');
    setFrequency('once');
    setCustomInstructions('');

    if (!authToken || !selectedVisit?.visit_id || user?.role !== 'doctor') {
      return () => {
        active = false;
      };
    }

    api.getPrescription(selectedVisit.visit_id, authToken)
      .then((prescription) => {
        if (!active) return;
        setPrescriptionId(prescription.id);
        setPrescriptionNotes(prescription.notes || defaultNotes);
        setCurrentPrescriptionItems(prescription.items || []);
      })
      .catch((error) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Could not load prescription';
        if (message !== 'Prescription not found') {
          setPrescriptionStatus(message);
        }
      });

    return () => {
      active = false;
    };
  }, [authToken, selectedVisit?.visit_id, user?.role]);

  useEffect(() => {
    if (!authToken || !selectedTimelineVisit?.session_id) {
      setTimelineSummary(null);
      return;
    }
    api.getSummary(selectedTimelineVisit.session_id, authToken)
      .then(setTimelineSummary)
      .catch(() => setTimelineSummary(null));
  }, [authToken, selectedTimelineVisit?.session_id]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy('Signing in');
    try {
      clearUserData();
      const result = await api.login(String(data.get('email') || ''), String(data.get('password') || ''));
      localStorage.setItem('medassist_token', result.access_token);
      setAuthToken(result.access_token);
      setAuthContext(result);
      // setFlash(`Signed in as ${result.user.name}`);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setBusy('');
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy('Creating account');
    try {
      if (authMode === 'register-doctor') {
        await api.registerDoctor({
          name: String(data.get('name') || ''),
          email: String(data.get('email') || ''),
          password: String(data.get('password') || ''),
          phone: String(data.get('phone') || ''),
          specialization: String(data.get('specialization') || ''),
          license_number: String(data.get('license_number') || ''),
          experience_years: Number(data.get('experience_years') || 0),
          hospital_affiliation: String(data.get('hospital_affiliation') || ''),
        });
      } else {
        await api.registerPatient({
          name: String(data.get('name') || ''),
          email: String(data.get('email') || ''),
          password: String(data.get('password') || ''),
          phone: String(data.get('phone') || ''),
          age: Number(data.get('age') || 0) || undefined,
          gender: String(data.get('gender') || ''),
          allergies: String(data.get('allergies') || ''),
          chronic_conditions: String(data.get('chronic_conditions') || ''),
          address: String(data.get('address') || ''),
        });
      }

      clearUserData();
      const result = await api.login(String(data.get('email') || ''), String(data.get('password') || ''));
      localStorage.setItem('medassist_token', result.access_token);
      setAuthToken(result.access_token);
      setAuthContext(result);
      setFlash(`Welcome, ${result.user.name}`);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setBusy('');
    }
  };

  const signOut = () => {
    localStorage.removeItem('medassist_token');
    setAuthToken('');
    setUser(null);
    clearUserData();
  };

  const startPatientVisit = async () => {
    if (!authToken || !user || !selectedDoctorId) return;
    setBusy('Starting questionnaire');
    try {
      const started = await api.startSession(user.id, authToken);
      setActiveSessionId(started.id);
      setIntakeMessages(started.initial_question ? [{ role: 'assistant', text: started.initial_question }] : []);
      setStructuredData(null);
      setLastSummary(null);
      setEmergencyHospitals([]);
      setEmergencyMessage('');
      setIntakeAdvisory('');
      setIntakeTriageLevel(null);
      setIntakeOpen(true);
      setIntakeStatus('Intake started');
    } catch (error) {
      setIntakeStatus(error instanceof Error ? error.message : 'Could not start visit');
    } finally {
      setBusy('');
    }
  };

  const pickRecorderMime = (): string => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // setIsRecording(false) happens in onstop so the button stays "live"
    // until the recorder has fully flushed the last audio chunk.
  };

  const toggleRecording = () => {
    if (isTranscribing || isSendingIntake) return;

    if (isRecording) {
      stopRecording();
      return;
    }
    if (!voiceSupported) {
      setFlash('Voice input is not supported in this browser.');
      return;
    }

    recordingBaseTextRef.current = intakeText.trim();
    audioChunksRef.current = [];

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        mediaStreamRef.current = stream;
        const mimeType = pickRecorderMime();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        recorder.onstop = async () => {
          setIsRecording(false);
          mediaRecorderRef.current = null;
          // Release the mic immediately — don't hold it while uploading.
          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;

          const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
          audioChunksRef.current = [];
          if (blob.size === 0) {
            setFlash('No speech captured — please try again.');
            return;
          }

          setIsTranscribing(true);
          setBusy('Transcribing your voice');
          try {
            const result = await api.transcribeAudio(blob, authToken || '');
            const text = (result.text || '').trim();
            if (text) {
              setIntakeText(
                recordingBaseTextRef.current
                  + (recordingBaseTextRef.current ? ' ' : '')
                  + text
              );
              setIsVoiceInput(true);
            } else {
              setFlash('No speech detected in the recording — please try again.');
            }
          } catch (error) {
            console.error('Transcription failed', error);
            setFlash(error instanceof Error ? error.message : 'Voice transcription failed.');
          } finally {
            setIsTranscribing(false);
            setBusy('');
          }
        };

        recorder.start();
        setIsRecording(true);
      })
      .catch((error) => {
        console.error('Failed to start recording', error);
        if (error?.name === 'NotAllowedError') {
          setFlash('Microphone access was denied — allow it in your browser settings to use voice input.');
        } else {
          setFlash('Failed to start voice input.');
        }
      });
  };

  const sendIntakeAnswer = async () => {
    if (!authToken || !activeSessionId || !intakeText.trim() || isSendingIntake) return;
    const answer = intakeText.trim();
    setIsSendingIntake(true);
    setBusy('Saving answer');
    try {
      const response = await api.answerIntake(
        activeSessionId,
        {
          message: answer,
          input_mode: isVoiceInput ? 'voice' : 'text',
          previous_structured: structuredData,
        },
        authToken,
      );
      setIntakeMessages((current) => [
        ...current,
        { role: 'user', text: answer },
        { role: 'assistant', text: response.next_question || response.clinical_summary || response.message },
      ]);
      setIntakeText('');
      setIsVoiceInput(false);
      if (response.structured_data) setStructuredData(response.structured_data);
      if (response.status === 'urgent') {
        setEmergencyHospitals(response.nearest_hospitals || []);
        setEmergencyMessage(response.emergency_message || response.message);
      }
      setIntakeAdvisory(response.advisory || '');
      setIntakeTriageLevel(response.triage_level || null);

      if (response.status === 'complete') {
        const visit = await api.createPatientVisit(selectedDoctorId, response.session_id, authToken);
        const summary = await api.getSummary(response.session_id, authToken);
        setLastSummary(summary);
        setPatientVisits((current) => [visit, ...current.filter((item) => item.visit_id !== visit.visit_id)]);
        setPatientReminders((current) => current);
        setIntakeStatus(`Visit sent to ${selectedDoctor?.name || 'doctor'}`);
        await refreshPatientData();
      }
    } catch (error) {
      setIntakeStatus(error instanceof Error ? error.message : 'Could not save intake answer');
    } finally {
      setBusy('');
      setIsSendingIntake(false);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authToken || !user) return;
    setBusy('Saving profile');
    try {
      const payload: any = {
        name: profileForm.name || undefined,
        email: profileForm.email || undefined,
        phone: profileForm.phone || undefined,
      };

      if (user.role === 'patient') {
        Object.assign(payload, {
          age: profileForm.age ? Number(profileForm.age) : undefined,
          gender: profileForm.gender || undefined,
          allergies: profileForm.allergies || undefined,
          chronic_conditions: profileForm.chronic_conditions || undefined,
          address: profileForm.address || undefined,
        });
      } else if (user.role === 'doctor') {
        Object.assign(payload, {
          specialization: profileForm.specialization || undefined,
          license_number: profileForm.license_number || undefined,
          experience_years: profileForm.experience_years ? Number(profileForm.experience_years) : undefined,
          hospital_affiliation: profileForm.hospital_affiliation || undefined,
        });
      }

      const context = await api.updateMe(payload, authToken);
      setAuthContext(context);
      setProfileStatus('Profile updated');
    } catch (error) {
      setProfileStatus(error instanceof Error ? error.message : 'Could not update profile');
    } finally {
      setBusy('');
    }
  };

  const enableEmergencyQR = async () => {
    if (!authToken || !patientProfile) return;
    setBusy('Enabling emergency QR');
    try {
      const info = await api.enableEmergencyAccess(authToken);
      setPatientProfile((prev) => prev
        ? { ...prev, emergency_profile_enabled: info.enabled, emergency_access_token: info.access_token }
        : prev);
      setShowQR(true);
      setProfileStatus('Emergency QR enabled. Only people scanning your QR code can open the emergency profile.');
    } catch (error) {
      setProfileStatus(error instanceof Error ? error.message : 'Could not enable emergency QR');
    } finally {
      setBusy('');
    }
  };

  const disableEmergencyQR = async () => {
    if (!authToken || !patientProfile) return;
    setBusy('Disabling emergency QR');
    try {
      if (!window.confirm('Disable the emergency QR profile? Scanning your QR code will no longer show any medical details.')) return;
      const updated = await api.disableEmergencyAccess(authToken);
      setPatientProfile(updated);
      setShowQR(false);
      setProfileStatus('Emergency QR disabled. The public link no longer works.');
    } catch (error) {
      setProfileStatus(error instanceof Error ? error.message : 'Could not disable emergency QR');
    } finally {
      setBusy('');
    }
  };

  const uploadPatientReport = async () => {
    if (!authToken || !user || !reportFile) return;
    setBusy('Uploading report');
    try {
      const uploaded = await api.uploadReport(user.id, reportFile, authToken);
      setPatientReports(await api.listReports(user.id, authToken));
      setReportFile(null);
      setReportStatus(`Report uploaded: ${uploaded.file_url.split('/').pop()}. Click Analyze to run report analysis.`);
    } catch (error) {
      setReportStatus(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy('');
    }
  };

  const analyzeReport = async (reportId: string) => {
    if (!authToken || !user) return;
    setAnalyzingId(reportId);
    setBusy('Analyzing report');
    try {
      if (user.role === 'doctor' && selectedPatientId) {
        await api.analyzeReport(reportId, authToken);
        setDoctorReports(await api.listPatientReports(selectedPatientId, authToken));
      } else {
        await api.analyzeReport(reportId, authToken);
        setPatientReports(await api.listReports(user.id, authToken));
      }
      setReportStatus('Report analyzed');
    } catch (error) {
      setReportStatus(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setBusy('');
      setAnalyzingId(null);
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!authToken || !user) return;
    if (!window.confirm('Delete this uploaded report?')) return;
    setBusy('Deleting report');
    try {
      await api.deleteReport(reportId, authToken);
      if (user.role === 'doctor' && selectedPatientId) {
        setDoctorReports(await api.listPatientReports(selectedPatientId, authToken));
      } else {
        setPatientReports(await api.listReports(user.id, authToken));
      }
      setReportStatus('Report deleted');
    } catch (error) {
      setReportStatus(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setBusy('');
    }
  };

  const getReportUrl = (fileUrl: string) => {
    if (fileUrl.startsWith('http')) return fileUrl;
    if (fileUrl.startsWith('/')) return fileUrl;
    return `${API_BASE}/${fileUrl}`;
  };

  const openReport = async (fileUrl: string) => {
    if (!authToken) return;
    try {
      const response = await fetch(getReportUrl(fileUrl), {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Could not open report');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not open report');
    }
  };

  const downloadReport = async (fileUrl: string) => {
    if (!authToken) return;
    try {
      const response = await fetch(getReportUrl(fileUrl), {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Could not download report');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fileUrl.split('/').pop() || 'report';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not download report');
    }
  };

  const createPatientReminder = async (message: string, daysFromNow: number) => {
    if (!authToken) return;
    const time = new Date();
    time.setDate(time.getDate() + daysFromNow);
    try {
      const reminder = await api.createMyReminder({ message, time: time.toISOString() }, authToken);
      setPatientReminders((current) => [reminder, ...current]);
    } catch (error) {
      setNotificationStatus(error instanceof Error ? error.message : 'Could not create reminder');
    }
  };

  const markNotificationRead = async (notification: Notification) => {
    if (!authToken) return;
    try {
      const updated = await api.markNotificationRead(notification.id, authToken);
      setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setNotificationStatus(error instanceof Error ? error.message : 'Could not mark notification read');
    }
  };

  const createPrescription = async () => {
    if (!authToken || !selectedVisit) return;
    setBusy('Creating prescription');
    try {
      const prescription = await api.createPrescription(selectedVisit.visit_id, prescriptionNotes, authToken);
      setPrescriptionId(prescription.id);
      setCurrentPrescriptionItems(prescription.items || []);
      setPrescriptionStatus('Prescription created');
    } catch (error) {
      setPrescriptionStatus(error instanceof Error ? error.message : 'Could not create prescription');
    } finally {
      setBusy('');
    }
  };

  const addMedication = async () => {
    if (!authToken || !prescriptionId) return;
    setBusy('Adding medication');
    try {
      const dosageValue =
        medicineType === 'syrup'
          ? `${syrupQuantity.trim() || 'Quantity not specified'}`
          : dosage.trim();
      const medicineLabel = customInstructions.trim()
        ? `${medicationName} (${customInstructions.trim()})`
        : medicationName;
      const newItem = await api.addPrescriptionItem(
        prescriptionId,
        {
          medicine_name: medicineLabel,
          dosage: dosageValue,
          duration,
          frequency: frequency === 'once' ? '1 time/day' : frequency === 'twice' ? '2 times/day' : '3 times/day',
        },
        authToken,
      );
      setCurrentPrescriptionItems((current) => [...current, newItem]);
      setMedicationName('');
      setDosage('');
      setSyrupQuantity('');
      setDuration('');
      setFrequency('once');
      setCustomInstructions('');
      setMedicationStatus('Medication added');
    } catch (error) {
      setMedicationStatus(error instanceof Error ? error.message : 'Could not add medication');
    } finally {
      setBusy('');
    }
  };

  const scheduleFollowUp = async () => {
    if (!selectedPatientId || !doctorReminderMessage || !doctorReminderTime) return;
    try {
      const reminder = await api.createReminder({
        user_id: selectedPatientId,
        message: doctorReminderMessage,
        time: new Date(doctorReminderTime).toISOString(),
      }, authToken);
      setDoctorReminders((current) => [reminder, ...current.filter((item) => item.id !== reminder.id)]);
      setDoctorReminderStatus('Follow-up scheduled for this patient.');
    } catch (error) {
      setDoctorReminderStatus(error instanceof Error ? error.message : 'Could not schedule follow-up');
    }
  };

  const handleVerifyDoctorLicense = async () => {
    if (!authToken || !verifyLicenseNumber.trim()) return;
    setIsVerifyingLicense(true);
    setVerificationFeedback(null);
    try {
      const res = await api.verifyDoctorLicense(verifyLicenseNumber.trim(), verifyStateCouncil, authToken);
      setDoctorProfile((prev) => prev ? {
        ...prev,
        is_verified: res.is_verified,
        license_number: res.registration_number,
        state_council: res.state_council,
        qualification: res.qualification,
        registration_year: res.registration_year,
        verification_source: res.verification_source,
        verified_at: res.verified_at,
      } : prev);
      setVerificationFeedback({ message: res.message || 'Medical registration verified successfully!', success: true });
    } catch (err: any) {
      setVerificationFeedback({ message: err.message || 'Verification failed. Please check registration number.', success: false });
    } finally {
      setIsVerifyingLicense(false);
    }
  };

  if (publicProfileId) {
    return (
      <main className="auth-shell public-profile-view">
        <section className="panel wide profile-card">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Medical Profile</div>
              <h2>{publicProfile?.name || 'Loading profile...'}</h2>
            </div>
            <button className="ghost" onClick={() => (window.location.href = '/')}>Close</button>
          </div>

          {!publicProfile ? (
            <div className="empty">Fetching patient information...</div>
          ) : (
            <div className="grid grid-2" style={{ marginTop: '1.5rem' }}>
              <div className="stack">
                <div className="eyebrow">Personal Details</div>
                <div className="record-card">
                  <div className="stat-mini"><span>Age</span><strong>{publicProfile.age || '--'}</strong></div>
                  <div className="stat-mini"><span>Gender</span><strong>{publicProfile.gender || '--'}</strong></div>
                </div>

                <div className="eyebrow" style={{ marginTop: '1.5rem' }}>Medical Alerts</div>
                <div className="alert-card urgent">
                  <strong>Allergies</strong>
                  <p>{publicProfile.allergies || 'No known allergies reported.'}</p>
                </div>
                <div className="alert-card" style={{ marginTop: '1rem' }}>
                  <strong>Chronic Conditions</strong>
                  <p>{publicProfile.chronic_conditions || 'No chronic conditions reported.'}</p>
                </div>
              </div>

              <div className="stack">
                <div className="eyebrow">Current Medications</div>
                <div className="medication-list-public">
                  {publicProfile.medications.map((med: any, i: number) => (
                    <div key={i} className="record-card" style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: '#fff' }}>{med.medicine_name}</strong>
                      <div className="pill-group" style={{ marginTop: '0.25rem' }}>
                        <span className="pill">{med.dosage}</span>
                        <span className="pill">{med.frequency}</span>
                        <span className="pill">{med.duration}</span>
                      </div>
                      <small style={{ display: 'block', marginTop: '0.5rem', opacity: 0.7 }}>
                        Prescribed: {new Date(med.prescribed_on).toLocaleDateString()}
                      </small>
                    </div>
                  ))}
                  {!publicProfile.medications.length && <div className="empty">No active medications found.</div>}
                </div>
              </div>
            </div>
          )}
        </section>
        <footer style={{ marginTop: '2rem', textAlign: 'center', opacity: 0.6 }}>
          <p>MedAssist Secure Patient Sharing • {new Date().getFullYear()}</p>
        </footer>
      </main>
    );
  }

  if (!authReady) {
    return <div className="auth-loading panel">Loading MedAssist...</div>;
  }

  if (!user) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
        flash={flash}
        busy={busy}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="brand">
          <div className="brand-badge">M</div>
          <div>
            <div className="eyebrow">{user.role === 'patient' ? 'Patient portal' : 'Doctor dashboard'}</div>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
          </div>
        </div>
        <div className="topbar-actions">
          {user.role === 'patient' && (
            <button
              id="medicine-infobox-btn"
              className={`secondary med-info-btn ${showMedicineBox ? 'active' : ''}`}
              onClick={() => { setShowMedicineBox((v) => !v); setShowNotifications(false); }}
              title="Medicine Information"
            >
              <Pill size={16} />
              Medicine Info
            </button>
          )}
          <button className="secondary" onClick={() => { setShowNotifications((value) => !value); setShowMedicineBox(false); }}>
            Notifications ({notifications.filter((item) => !item.is_read).length})
          </button>
          <button className="ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {busy && <div className="flash subtle">{busy}...</div>}
      {notificationStatus && <div className="flash subtle">{notificationStatus}</div>}

      {showNotifications && (
        <section className="panel notification-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Inbox</div>
              <h2>Notifications</h2>
            </div>
            <button className="ghost" onClick={() => void refreshNotifications()}>Refresh</button>
          </div>
          <div className="stack compact">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                className={`notification ${notification.is_read ? 'read' : ''}`}
                onClick={() => void markNotificationRead(notification)}
              >
                <strong>{notification.type || 'Update'}</strong>
                <span>{notification.message}</span>
              </button>
            ))}
            {!notifications.length && <div className="empty">No notifications yet.</div>}
          </div>
        </section>
      )}

      {showMedicineBox && (
        <section className="panel medicine-box-panel animate-in" id="medicine-infobox-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Drug Reference</div>
              <h2>Medicine Info</h2>
            </div>
            <button className="ghost" onClick={() => { setShowMedicineBox(false); setSelectedMedicine(null); setMedicineQuery(''); }}>
              <X size={18} />
            </button>
          </div>

          <div className="medicine-search-row">
            <div className="medicine-search-input-wrap">
              <Search size={16} className="medicine-search-icon" />
              <input
                id="medicine-search-input"
                className="medicine-search-input"
                type="text"
                placeholder="Search medication name e.g. Metformin..."
                value={medicineQuery}
                onChange={(e) => { setMedicineQuery(e.target.value); setSelectedMedicine(null); }}
                autoFocus
              />
              {medicineQuery && (
                <button className="ghost medicine-clear-btn" onClick={() => { setMedicineQuery(''); setSelectedMedicine(null); }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {!medicineQuery && !selectedMedicine && (
            <div className="medicine-categories">
              <div className="eyebrow" style={{ marginBottom: '0.75rem' }}>Browse by category</div>
              <div className="medicine-cat-chips">
                {Array.from(new Set(MEDICINE_DB.map((m) => m.category.split(' ')[0]))).map((cat) => (
                  <button key={cat} className="pill medicine-cat-chip" onClick={() => setMedicineQuery(cat)}>{cat}</button>
                ))}
              </div>
            </div>
          )}

          {medicineQuery && !selectedMedicine && (() => {
            const results = MEDICINE_DB.filter(
              (m) =>
                m.name.toLowerCase().includes(medicineQuery.toLowerCase()) ||
                (m.generic || '').toLowerCase().includes(medicineQuery.toLowerCase()) ||
                m.purpose.toLowerCase().includes(medicineQuery.toLowerCase()) ||
                m.category.toLowerCase().includes(medicineQuery.toLowerCase())
            );
            return results.length > 0 ? (
              <div className="medicine-results stack compact">
                {results.map((med) => (
                  <button
                    key={med.name}
                    className="medicine-result-item"
                    onClick={() => setSelectedMedicine(med)}
                  >
                    <div className="medicine-result-name">{med.name}</div>
                    {med.generic && <div className="medicine-result-generic">{med.generic}</div>}
                    <div className="medicine-result-category">{med.category}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="medicine-no-result">
                <div className="medicine-no-result-icon">💊</div>
                <strong>No results for "{medicineQuery}"</strong>
                <p>Try a different name or browse by category above.</p>
              </div>
            );
          })()}

          {selectedMedicine && (
            <div className="medicine-detail animate-in">
              <button className="ghost medicine-back-btn" onClick={() => setSelectedMedicine(null)}>
                ← Back to results
              </button>
              <div className="medicine-detail-header">
                <div className="medicine-detail-icon"><Pill size={24} /></div>
                <div>
                  <h3 className="medicine-detail-name">{selectedMedicine.name}</h3>
                  {selectedMedicine.generic && <div className="medicine-detail-generic">Generic: {selectedMedicine.generic}</div>}
                  <span className="pill" style={{ marginTop: '0.35rem', display: 'inline-flex' }}>{selectedMedicine.category}</span>
                </div>
              </div>
              <div className="medicine-info-grid">
                <div className="medicine-info-card purpose">
                  <div className="medicine-info-label">Purpose</div>
                  <div className="medicine-info-value">{selectedMedicine.purpose}</div>
                </div>
                <div className="medicine-info-card usage">
                  <div className="medicine-info-label">How to Take</div>
                  <div className="medicine-info-value">{selectedMedicine.usage}</div>
                </div>
                <div className="medicine-info-card side-effects">
                  <div className="medicine-info-label">Common Side Effects</div>
                  <div className="medicine-info-value">{selectedMedicine.sideEffects}</div>
                </div>
                {selectedMedicine.warnings && (
                  <div className="medicine-info-card warnings">
                    <div className="medicine-info-label">⚠ Important Warnings</div>
                    <div className="medicine-info-value">{selectedMedicine.warnings}</div>
                  </div>
                )}
              </div>
              <p className="medicine-disclaimer">This information is for general reference only. Always follow your doctor's instructions.</p>
            </div>
          )}
        </section>
      )}

      {user.role === 'patient' ? (
        <main className="dashboard-layout">
          {/* LEFT SIDEBAR: Patient Profile Summary */}
          <aside className="profile-sidebar">
            <div className="panel profile-card">
              <div className="profile-header">
                <div className="profile-avatar">{user.name.charAt(0)}</div>
                <h2>{user.name}</h2>
                <span className="pill" style={{ marginTop: '0.5rem' }}>Active Patient</span>
              </div>
              <div className="profile-stats">
                <div className="stat-mini"><span>Age</span><strong>{patientProfile?.age || '--'}</strong></div>
                <div className="stat-mini"><span>Gender</span><strong>{patientProfile?.gender || '--'}</strong></div>
                <div className="stat-mini"><span>Visits</span><strong>{patientVisits.length}</strong></div>
              </div>

              <div className="profile-details-form">
                <div className="eyebrow" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Medical Profile</div>
                <form className="stack compact" onSubmit={saveProfile}>
                  <label className="field">
                    <span>Phone Number</span>
                    <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Enter phone number" />
                  </label>
                  <label className="field">
                    <span>Age</span>
                    <input value={profileForm.age} onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })} placeholder="Enter age" type="number" />
                  </label>
                  <label className="field">
                    <span>Gender</span>
                    <input value={profileForm.gender} onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })} placeholder="Enter gender" />
                  </label>
                  <label className="field">
                    <span>Address</span>
                    <textarea rows={2} value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} placeholder="Enter your full address" />
                  </label>
                  <label className="field">
                    <span>Allergies</span>
                    <textarea rows={2} value={profileForm.allergies} onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })} placeholder="Example: Penicillin" />
                  </label>
                  <label className="field">
                    <span>Chronic Conditions</span>
                    <textarea rows={2} value={profileForm.chronic_conditions} onChange={(e) => setProfileForm({ ...profileForm, chronic_conditions: e.target.value })} placeholder="Example: Diabetes" />
                  </label>

                  <div className="panel" style={{ background: 'var(--surface-soft)', marginTop: '1rem', border: '1px dashed var(--border)' }}>
                    <div className="eyebrow" style={{ marginBottom: '0.5rem' }}>Emergency QR</div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '1rem' }}>
                      {patientProfile?.emergency_profile_enabled
                        ? 'Emergency responders can scan this to see your vital medical details instantly. You control this — disable it at any time and the link stops working.'
                        : 'Enable the emergency QR so responders can scan it and see your vital medical details. The profile is only reachable through your personal QR code.'}
                    </p>

                    {patientProfile?.emergency_profile_enabled ? (
                      showQR ? (
                        <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <QRCodeSVG
                            value={`${getShareableOrigin()}/public-profile/${patientProfile?.id}?token=${encodeURIComponent(patientProfile?.emergency_access_token || '')}`}
                            size={150}
                          />
                          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#555', wordBreak: 'break-all', textAlign: 'center', maxWidth: '280px' }}>
                            {`${getShareableOrigin()}/public-profile/${patientProfile?.id}?token=${encodeURIComponent(patientProfile?.emergency_access_token || '')}`}
                          </div>
                          <button type="button" className="ghost" style={{ marginTop: '0.5rem', color: '#000' }} onClick={() => setShowQR(false)}>Hide QR</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <button type="button" className="secondary" style={{ width: '100%' }} onClick={() => setShowQR(true)}>Show Emergency QR</button>
                          <button type="button" className="ghost" style={{ width: '100%' }} onClick={() => void disableEmergencyQR()}>Disable emergency profile</button>
                        </div>
                      )
                    ) : (
                      <button type="button" className="secondary" style={{ width: '100%' }} onClick={() => void enableEmergencyQR()}>Enable Emergency QR</button>
                    )}
                  </div>

                  <button className="primary" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>Update Profile</button>
                  {profileStatus && <div className="flash subtle">{profileStatus}</div>}


                </form>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <div className="dashboard-content stack">
            {/* HERO SECTION */}
            <section className="hero-card">
              <div className="hero-head">
                <div>
                  <div className="eyebrow">Consultation</div>
                  <h2>Start a new visit</h2>
                  <p>Select a specialist, complete your AI triage questionnaire, and your results will be sent to the doctor.</p>
                </div>
                <div className="action-group">
                  <select value={selectedDoctorId} onChange={(event) => setSelectedDoctorId(event.target.value)} style={{ minWidth: '200px' }}>
                    <option value="" disabled>Select a doctor...</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.name} {doctor.specialization ? `(${doctor.specialization})` : ''} {doctor.is_verified ? '✓ NMC Verified' : ''}
                      </option>
                    ))}
                  </select>
                  <button className="primary" onClick={() => void startPatientVisit()} disabled={!selectedDoctorId}>Begin Intake</button>
                </div>
              </div>
            </section>

            {/* AI INTAKE STUDIO (Expands when active) */}
            {intakeOpen && (
              <section className="panel wide intake-studio">
                <div className="panel-head">
                  <div>
                    <div className="eyebrow">AI Assistant</div>
                    <h2>Intake Studio</h2>
                  </div>
                  <button className="ghost" onClick={() => setIntakeOpen(false)}>Close Session</button>
                </div>
                <div className="split">
                  <div className="chat-card">
                    <div className="chat-log">
                      {intakeMessages.map((message, index) => (
                        <div key={`${message.role}-${index}`} className={`bubble ${message.role}`}>{message.text}</div>
                      ))}
                    </div>
                    <form
                      className="chat-compose"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void sendIntakeAnswer();
                      }}
                    >
                      <textarea
                        rows={2}
                        value={intakeText}
                        onChange={(event) => {
                          setIntakeText(event.target.value);
                          setIsVoiceInput(false);
                        }}
                        placeholder="Type your response..."
                        disabled={isSendingIntake}
                      />
                      <button
                        type="button"
                        className={`voice-btn ${isRecording ? 'recording' : ''}`}
                        onClick={toggleRecording}
                        disabled={!voiceSupported || isTranscribing || isSendingIntake}
                        title={
                          !voiceSupported
                            ? 'Voice input is not supported in this browser'
                            : isTranscribing
                              ? 'Transcribing your recording…'
                              : isRecording
                                ? 'Stop recording and transcribe'
                                : 'Start voice input'
                        }
                      >
                        {isTranscribing ? (
                          <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20" className="animate-spin">
                            <path d="M10 3v3a.5.5 0 001 0V3h2a1 1 0 100-2H7a1 1 0 100 2h3zm4.549 5A1 1 0 0114 9.449V11a4 4 0 01-8 0V9.449A1 1 0 015 8.55V11a5 5 0 0010 0V8.55z" />
                            <path d="M10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" opacity="0.3" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                            <path d="M16 10a1 1 0 10-2 0 4 4 0 01-8 0 1 1 0 00-2 0 6 6 0 1012 0z" />
                            <path d="M10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" />
                          </svg>
                        )}
                      </button>
                      <button className="primary" type="submit" disabled={isSendingIntake || !intakeText.trim()}>
                        {isSendingIntake ? 'Thinking...' : 'Send'}
                      </button>
                    </form>
                    {intakeStatus && <div className="flash subtle" style={{ marginTop: '0.25rem' }}>{intakeStatus}</div>}
                  </div>
                  <div className="summary-card">
                    <div className="eyebrow" style={{ marginBottom: '1rem' }}>Live SOAP Generation</div>
                    <pre className="code-block">{formatSummary(lastSummary)}</pre>
                  </div>
                </div>
                {intakeAdvisory && (
                  <div
                    style={{
                      marginTop: '1rem',
                      padding: '0.9rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.45)',
                    }}
                  >
                    <div className="eyebrow" style={{ color: '#b45309', marginBottom: '0.35rem' }}>
                      {intakeTriageLevel === 'abstain'
                        ? '⚠ Urgency uncertain — professional review recommended'
                        : '⚠ See a doctor within 24 hours'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#92400e' }}>{intakeAdvisory}</div>
                  </div>
                )}
                {emergencyMessage && (
                  <div className="emergency-panel">
                    <div>
                      <div className="eyebrow">Emergency detected</div>
                      <h2>{emergencyMessage}</h2>
                    </div>
                    <div className="stack compact">
                      {emergencyHospitals.map((hospital, index) => (
                        <div className="hospital-card" key={`${hospital.name}-${index}`}>
                          <div>
                            <strong>{hospital.name}</strong>
                            <span>{hospital.address || 'Address unavailable'}</span>
                            <span>{formatDistance(hospital.distance_meters)} - {openStatus(hospital)}</span>
                          </div>
                          {hospital.phone ? (
                            <a className="dial-button" href={`tel:${hospital.phone.replace(/[^\d+]/g, '')}`}>
                              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                              </svg>
                              <span>{hospital.phone}</span>
                            </a>
                          ) : (
                            <span className="phone-missing">Phone unavailable</span>
                          )}
                        </div>
                      ))}
                      {!emergencyHospitals.length && (
                        <div className="empty">No nearby hospital phone number returned. Call local emergency services immediately.</div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* TWO-COLUMN DASHBOARD METRICS */}
            <div className="grid grid-2">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <div className="eyebrow">Schedule</div>
                    <h2>Follow-ups & Reminders</h2>
                  </div>
                </div>
                <div className="stack compact">
                  {patientReminders.map((reminder) => (
                    <div key={reminder.id} className={`reminder-row ${reminder.is_completed ? 'done' : ''}`}>
                      <div>
                        <span className={`badge ${isUrgent(reminder) ? 'urgent' : ''}`} style={{ marginBottom: '0.25rem' }}>{reminderLabel(reminder)}</span>
                        <strong style={{ display: 'block', color: '#fff' }}>{reminder.message}</strong>
                        <span style={{ fontSize: '0.85rem' }}>{formatDate(reminder.time)}</span>
                      </div>
                    </div>
                  ))}
                  {!patientReminders.length && <div className="empty">No upcoming reminders.</div>}
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <div className="eyebrow">Medical</div>
                    <h2>Active Prescriptions</h2>
                  </div>
                </div>
                <div className="stack compact">
                  {patientPrescriptions.map((prescription) => (
                    <div className="record-card" key={prescription.id}>
                      <strong style={{ color: '#fff' }}>{prescription.notes || 'Prescription Details'}</strong>
                      <span style={{ fontSize: '0.85rem' }}>{formatDate(prescription.created_at)}</span>
                      <div className="medication-list" style={{ marginTop: '0.5rem' }}>
                        {prescription.items.map((item) => (
                          <div key={item.id} className="pill" style={{ marginRight: '0.5rem', marginBottom: '0.5rem' }}>
                            {item.medicine_name} • {item.dosage} • {item.frequency}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!patientPrescriptions.length && <div className="empty">No active prescriptions.</div>}
                  {prescriptionStatus && <div className="flash subtle">{prescriptionStatus}</div>}
                </div>
              </section>
            </div>

            <section className="panel wide">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Documents</div>
                  <h2>Lab Reports</h2>
                </div>
              </div>
              <div className="stack compact">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="file" onChange={(event) => setReportFile(event.target.files?.[0] || null)} style={{ flex: 1 }} />
                  <button className="secondary" onClick={() => void uploadPatientReport()} disabled={!reportFile}>Upload</button>
                </div>
                {reportStatus && <div className="flash subtle">{reportStatus}</div>}
                <div className="reports-list" style={{ marginTop: '0.5rem' }}>
                  {patientReports.map((report) => (
                    <div className="record-card" key={report.id} style={{ gridTemplateColumns: '1fr auto auto auto auto', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="stack compact" style={{ gap: '0.25rem' }}>
                        <strong style={{ color: '#fff' }}>{report.file_url.split('/').pop()}</strong>
                        {report.analysis_status && report.analysis_status !== 'uploaded' && (
                          <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>
                            Analysis: {report.analysis_status}
                          </span>
                        )}
                        {report.parsed_data && (
                          <pre className="code-block" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {formatReportAnalysis(report.parsed_data)}
                          </pre>
                        )}
                      </div>
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => void analyzeReport(report.id)}
                        disabled={analyzingId === report.id || report.analysis_status === 'queued' || report.analysis_status === 'processing'}
                      >
                        {analyzingId === report.id ? 'Analyzing...' : (report.analysis_status === 'completed' ? 'Analyzed' : 'Analyze')}
                      </button>
                      <button className="secondary" type="button" onClick={() => void openReport(report.file_url)}>Open</button>
                      <button className="secondary" type="button" onClick={() => void downloadReport(report.file_url)}>Download</button>
                      <button className="secondary" type="button" onClick={() => void deleteReport(report.id)}>Delete</button>
                    </div>
                  ))}
                  {!patientReports.length && <div className="empty">No reports uploaded.</div>}
                </div>
              </div>
            </section>

            <section className="panel wide">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">History</div>
                  <h2>Visit Timeline</h2>
                </div>
              </div>
              <div className="horizontal-timeline">
                <div className="timeline-line"></div>
                <div className="timeline-dot-wrapper">
                  {patientVisits.map((visit) => (
                    <div key={visit.visit_id} className="timeline-item-node" onClick={() => setSelectedTimelineVisit(visit)}>
                      <div className="timeline-label-above">Dr. {visit.doctor_name.split(' ').pop()}</div>
                      <div className="timeline-dot-row">
                        <div
                          className={`timeline-dot ${selectedTimelineVisit?.visit_id === visit.visit_id ? 'active' : ''}`}
                          title="Click to view details"
                        ></div>
                      </div>
                      <div className="timeline-label-below">{new Date(visit.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {!patientVisits.length && <div className="empty" style={{ width: '100%', textAlign: 'center' }}>No visits yet.</div>}
                </div>
              </div>

              {selectedTimelineVisit && (
                <div className="panel visit-details-box animate-in">
                  <div className="panel-head">
                    <div>
                      <div className="eyebrow">Visit Details</div>
                      <h2>Dr. {selectedTimelineVisit.doctor_name}</h2>
                      <p>{formatDate(selectedTimelineVisit.created_at)} • {selectedTimelineVisit.status.toUpperCase()}</p>
                    </div>
                    <button className="ghost" onClick={() => setSelectedTimelineVisit(null)}>Close</button>
                  </div>
                  <div className="stack">
                    <div className="summary-card">
                      <div className="eyebrow">Clinical Summary (SOAP)</div>
                      <pre className="code-block">{formatSummary(timelineSummary)}</pre>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <HealthMetricsChart patientId={user.id} token={authToken} refreshTrigger={patientReports} />
          </div>
        </main>
      ) : (
        <main className="dashboard-layout">
          {/* LEFT SIDEBAR: Doctor Profile */}
          <aside className="profile-sidebar">
            <div className="panel profile-card">
              <div className="profile-header">
                <div className="profile-avatar">{user.name.charAt(0)}</div>
                <h2>{user.name}</h2>
                <span className="pill" style={{ marginTop: '0.5rem' }}>Medical Professional</span>
              </div>
              <div className="profile-stats">
                <div className="stat-mini"><span>Patients</span><strong>{patients.length}</strong></div>
                <div className="stat-mini"><span>Role</span><strong>Doctor</strong></div>
              </div>

              <div className="profile-details-form">
                <div className="eyebrow" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Professional Profile</div>
                <form className="stack compact" onSubmit={saveProfile}>
                  <label className="field">
                    <span>Phone Number</span>
                    <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Enter phone number" />
                  </label>
                  <label className="field">
                    <span>Specialization</span>
                    <input value={profileForm.specialization} onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })} placeholder="Example: Cardiology" />
                  </label>
                  <button className="primary" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>Update Profile</button>
                  {profileStatus && <div className="flash subtle">{profileStatus}</div>}
                </form>

                {/* Indian Medical Council Verification Card */}
                {doctorProfile?.is_verified ? (
                  <div className="panel" style={{ marginTop: '1.25rem', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', padding: '1rem', borderRadius: '12px' }}>
                    <div className="row" style={{ alignItems: 'center', gap: '0.5rem', color: '#10B981', fontWeight: 600 }}>
                      <Check size={18} />
                      <span>NMC / Council Verified ✅</span>
                    </div>
                    <div className="stack compact" style={{ marginTop: '0.6rem', fontSize: '0.82rem', gap: '0.35rem' }}>
                      <div><span style={{ opacity: 0.7 }}>Council:</span> <strong>{doctorProfile.state_council || 'National Medical Commission'}</strong></div>
                      <div><span style={{ opacity: 0.7 }}>Reg No:</span> <strong>{doctorProfile.license_number}</strong></div>
                      {doctorProfile.qualification && <div><span style={{ opacity: 0.7 }}>Qualification:</span> <strong>{doctorProfile.qualification}</strong></div>}
                      {doctorProfile.registration_year && <div><span style={{ opacity: 0.7 }}>Reg Year:</span> <strong>{doctorProfile.registration_year}</strong></div>}
                      <div style={{ marginTop: '0.25rem' }}>
                        <span className="pill active-pill" style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                          Active Practice (RMP) 🇮🇳
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="panel" style={{ marginTop: '1.25rem', background: 'var(--surface-soft)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-strong)' }}>
                    <div className="eyebrow" style={{ color: 'var(--accent)', fontWeight: 700 }}>Medical Registration Verification 🇮🇳</div>
                    <p style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: '0.25rem', marginBottom: '0.75rem' }}>
                      Verify your Indian Medical Council registration with NMC or State Medical Councils.
                    </p>
                    <div className="stack compact">
                      <label className="field">
                        <span>State Medical Council</span>
                        <select value={verifyStateCouncil} onChange={(e) => setVerifyStateCouncil(e.target.value)}>
                          <option value="National Medical Commission (MCI)">National Medical Commission (NMC / MCI)</option>
                          <option value="Maharashtra Medical Council">Maharashtra Medical Council (MMC)</option>
                          <option value="Delhi Medical Council">Delhi Medical Council (DMC)</option>
                          <option value="Karnataka Medical Council">Karnataka Medical Council (KMC)</option>
                          <option value="Tamil Nadu Medical Council">Tamil Nadu Medical Council (TNMC)</option>
                          <option value="Gujarat Medical Council">Gujarat Medical Council (GMC)</option>
                          <option value="West Bengal Medical Council">West Bengal Medical Council (WBMC)</option>
                          <option value="Uttar Pradesh Medical Council">Uttar Pradesh Medical Council (UPMC)</option>
                          <option value="Kerala State Medical Council">Kerala State Medical Council (KSMC)</option>
                          <option value="Andhra Pradesh Medical Council">Andhra Pradesh Medical Council (APMC)</option>
                          <option value="Telangana State Medical Council">Telangana State Medical Council (TSMC)</option>
                          <option value="Rajasthan Medical Council">Rajasthan Medical Council (RMC)</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Registration Number</span>
                        <input
                          value={verifyLicenseNumber}
                          onChange={(e) => setVerifyLicenseNumber(e.target.value)}
                          placeholder="e.g. MCI-12345, MMC-2018/04/1234"
                        />
                      </label>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => void handleVerifyDoctorLicense()}
                        disabled={isVerifyingLicense || !verifyLicenseNumber.trim()}
                        style={{ marginTop: '0.4rem', width: '100%' }}
                      >
                        {isVerifyingLicense ? 'Verifying with NMC...' : 'Verify Doctor License 🇮🇳'}
                      </button>
                      {verificationFeedback && (
                        <div className={`flash ${verificationFeedback.success ? 'subtle' : ''}`} style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: verificationFeedback.success ? '#10B981' : '#EF4444' }}>
                          {verificationFeedback.message}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <div className="dashboard-content stack">
            <section className="hero-card">
              <div className="hero-head">
                <div>
                  <div className="eyebrow">Current Case</div>
                  <h2>{selectedPatient?.patient_name || 'No patient selected'}</h2>
                  <p>{selectedPatient ? `${selectedPatient.patient_email} - ${selectedPatient.visit_count} visits` : 'Select a patient to view history and generate SOAP summaries.'}</p>
                </div>
                <span className="pill">{selectedVisit?.status || 'Select Visit'}</span>
              </div>
              <div className="stats" style={{ marginTop: '1.5rem' }}>
                <div className="stat"><span>Total Visits</span><strong>{doctorHistory.length}</strong></div>
                <div className="stat"><span>Session Status</span><strong>{sessionSnapshot?.status || 'N/A'}</strong></div>
                <div className="stat"><span>Messages</span><strong>{sessionSnapshot?.messages.length || 0}</strong></div>
              </div>
            </section>

            <div className="grid grid-2">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <div className="eyebrow">Directory</div>
                    <h2>Patient List</h2>
                  </div>
                </div>
                <div className="table-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {patients.map((patient) => (
                    <button
                      key={patient.patient_id}
                      className={`list-row ${selectedPatientId === patient.patient_id ? 'active' : ''}`}
                      onClick={() => setSelectedPatientId(patient.patient_id)}
                    >
                      <strong>{patient.patient_name}</strong>
                      <span style={{ fontSize: '0.8rem' }}>{patient.patient_email}</span>
                      <span className="pill" style={{ fontSize: '0.7rem' }}>{patient.visit_count} visits</span>
                    </button>
                  ))}
                  {!patients.length && <div className="empty">No patients found.</div>}
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <div className="eyebrow">History</div>
                    <h2>Visit Timeline</h2>
                  </div>
                </div>
                <div className="stack compact" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {doctorHistory.map((visit) => (
                    <button
                      key={visit.visit_id}
                      className={`timeline-item ${selectedVisit?.visit_id === visit.visit_id ? 'active' : ''}`}
                      onClick={() => setSelectedVisit(visit)}
                    >
                      <strong style={{ color: '#fff' }}>Visit on {new Date(visit.created_at).toLocaleDateString()}</strong>
                      <span>{visit.status.toUpperCase()} • {formatDate(visit.created_at)}</span>
                    </button>
                  ))}
                  {!doctorHistory.length && <div className="empty">No history for this patient.</div>}
                </div>
              </section>
            </div>

            {selectedPatientId && <HealthMetricsChart patientId={selectedPatientId} token={authToken} key={selectedPatientId} refreshTrigger={doctorReports} />}

            <section className="panel wide">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Documents</div>
                  <h2>Patient Reports</h2>
                </div>
              </div>
              <div className="stack compact">
                {doctorReports.map((report) => (
                  <div className="record-card" key={report.id} style={{ gridTemplateColumns: '1fr auto auto auto auto', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="stack compact" style={{ gap: '0.25rem' }}>
                      <strong style={{ color: '#fff' }}>{report.file_url.split('/').pop()}</strong>
                      {report.analysis_status && report.analysis_status !== 'uploaded' && (
                        <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>
                          Analysis: {report.analysis_status}
                        </span>
                      )}
                      {report.parsed_data && (
                        <pre className="code-block" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {formatReportAnalysis(report.parsed_data)}
                        </pre>
                      )}
                    </div>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => void analyzeReport(report.id)}
                      disabled={analyzingId === report.id || report.analysis_status === 'queued' || report.analysis_status === 'processing'}
                    >
                      {analyzingId === report.id ? 'Analyzing...' : (report.analysis_status === 'completed' ? 'Analyzed' : 'Analyze')}
                    </button>
                    <button className="secondary" type="button" onClick={() => void openReport(report.file_url)}>Open</button>
                    <button className="secondary" type="button" onClick={() => void downloadReport(report.file_url)}>Download</button>
                    <button className="secondary" type="button" onClick={() => void deleteReport(report.id)}>Delete</button>
                  </div>
                ))}
                {!doctorReports.length && <div className="empty">No reports uploaded for this patient.</div>}
              </div>
            </section>

            <section className="panel wide">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Analysis</div>
                  <h2>SOAP Summary</h2>
                </div>
              </div>
              <pre className="code-block">{formatSummary(doctorSummary)}</pre>
            </section>

            <div className="grid grid-2">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <div className="eyebrow">Follow-up</div>
                    <h2>Schedule Reminder</h2>
                  </div>
                </div>
                <div className="stack compact">
                  <input type="datetime-local" value={doctorReminderTime} onChange={(e) => setDoctorReminderTime(e.target.value)} />
                  <textarea rows={3} value={doctorReminderMessage} onChange={(e) => setDoctorReminderMessage(e.target.value)} placeholder="Message for patient..." />
                  <button className="primary" onClick={() => void scheduleFollowUp()} disabled={!selectedPatientId}>Set Reminder</button>
                  {doctorReminderStatus && <div className="flash subtle" style={{ marginTop: '0.25rem' }}>{doctorReminderStatus}</div>}
                  <div className="stack compact" style={{ marginTop: '0.75rem' }}>
                    {doctorReminders[0] ? (
                      <div className={`reminder-row ${doctorReminders[0].is_completed ? 'done' : ''}`}>
                        <div>
                          <span className="badge" style={{ marginBottom: '0.25rem' }}>
                            {doctorReminders[0].is_completed ? 'Follow-up completed' : 'Follow-up already scheduled'}
                          </span>
                          <strong style={{ display: 'block', color: '#fff' }}>{doctorReminders[0].message}</strong>
                          <span style={{ fontSize: '0.85rem' }}>{formatDate(doctorReminders[0].time)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="empty">No follow-ups scheduled for this patient.</div>
                    )}
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <div className="eyebrow">Triage</div>
                    <h2>Status Check</h2>
                  </div>
                </div>
                <div className={`alert-card ${sessionSnapshot?.status === 'urgent' ? 'urgent' : ''}`} style={{ height: '100%' }}>
                  <strong style={{ color: '#fff' }}>{sessionSnapshot?.status?.toUpperCase() || 'UNKNOWN'}</strong>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    {sessionSnapshot?.status === 'urgent'
                      ? 'Immediate medical evaluation recommended after deterministic emergency screening.'
                      : 'No confirmed emergency rule is recorded. This is not a diagnosis or assurance that the situation is safe.'}
                  </p>
                </div>
              </section>
            </div>

            <section className="panel wide">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Care Plan</div>
                  <h2>Prescription Studio</h2>
                </div>
              </div>
              <div className="stack compact">
                <div className="row" style={{ gap: '1rem' }}>
                  <div style={{ flex: 2 }}>
                    <textarea rows={2} value={prescriptionNotes} onChange={(e) => setPrescriptionNotes(e.target.value)} placeholder="Overall prescription notes..." />
                  </div>
                  <div style={{ flex: 1 }}>
                    <button className="secondary" style={{ height: '100%', width: '100%' }} onClick={() => void createPrescription()} disabled={!selectedVisit || Boolean(prescriptionId)}>
                      {prescriptionId ? 'Prescription loaded' : 'Create ID'}
                    </button>
                  </div>
                </div>
                {prescriptionStatus && <div className="flash subtle">{prescriptionStatus}</div>}

                {prescriptionId && (
                  <div className="panel animate-in" style={{ background: 'var(--surface-soft)', padding: '1rem', border: '1px dashed var(--border)' }}>
                    {currentPrescriptionItems.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div className="eyebrow">Added Items</div>
                        <div className="stack compact" style={{ marginTop: '0.5rem' }}>
                          {currentPrescriptionItems.map((item) => (
                            <div key={item.id} className="record-card" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong style={{ color: '#fff' }}>{item.medicine_name}</strong>
                                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                                  {item.dosage || 'No dosage'} • {item.frequency} • {item.duration}
                                </div>
                              </div>
                              <span className="pill">Added</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="eyebrow">Add Items</div>
                    <div className="stack compact" style={{ marginTop: '0.5rem' }}>
                      <label className="field">
                        <span>Medicine Name</span>
                        <input value={medicationName} onChange={(e) => setMedicationName(e.target.value)} placeholder="Medicine name" />
                      </label>
                      <div className="row" style={{ gap: '0.75rem' }}>
                        <label className={`pill ${medicineType === 'tablet' ? 'active-pill' : ''}`} style={{ cursor: 'pointer' }}>
                          <input type="radio" name="medicineType" checked={medicineType === 'tablet'} onChange={() => setMedicineType('tablet')} style={{ marginRight: '0.5rem' }} />
                          Tablet
                        </label>
                        <label className={`pill ${medicineType === 'syrup' ? 'active-pill' : ''}`} style={{ cursor: 'pointer' }}>
                          <input type="radio" name="medicineType" checked={medicineType === 'syrup'} onChange={() => setMedicineType('syrup')} style={{ marginRight: '0.5rem' }} />
                          Syrup
                        </label>
                      </div>
                      {medicineType === 'tablet' ? (
                        <label className="field">
                          <span>Dosage</span>
                          <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Dosage (e.g. 500mg)" />
                        </label>
                      ) : (
                        <label className="field">
                          <span>Quantity</span>
                          <input value={syrupQuantity} onChange={(e) => setSyrupQuantity(e.target.value)} placeholder="Quantity (e.g. 5 ml)" />
                        </label>
                      )}
                      <div className="field">
                        <span>Frequency</span>
                        <div className="row" style={{ gap: '0.75rem' }}>
                          {([
                            ['once', 'Once a day'],
                            ['twice', 'Twice a day'],
                            ['thrice', 'Thrice a day'],
                          ] as Array<[FrequencyOption, string]>).map(([value, label]) => (
                            <label key={value} className={`pill ${frequency === value ? 'active-pill' : ''}`} style={{ cursor: 'pointer' }}>
                              <input type="radio" name="frequency" checked={frequency === value} onChange={() => setFrequency(value)} style={{ marginRight: '0.5rem' }} />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>
                      <label className="field">
                        <span>Duration</span>
                        <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration (e.g. 5 days)" />
                      </label>
                      <label className="field">
                        <span>Custom Instructions</span>
                        <textarea rows={2} value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder="Add special instructions or notes" />
                      </label>
                    </div>
                    <button
                      className="primary"
                      style={{ marginTop: '1rem', width: '100%' }}
                      onClick={() => void addMedication()}
                      disabled={!medicationName || !duration}
                    >
                      Add Item
                    </button>
                    {medicationStatus && <div className="flash subtle" style={{ marginTop: '0.75rem' }}>{medicationStatus}</div>}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
