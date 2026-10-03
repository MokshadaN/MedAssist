export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * Origin used for shareable links (e.g. the emergency QR code).
 *
 * When the app is opened via `localhost`/`127.0.0.1` on the dev machine, a QR
 * encoding that origin is useless: a phone scanning it resolves `localhost`
 * to itself and nothing loads. In that case we swap in the LAN host from
 * `VITE_PUBLIC_HOST` (set in `frontend/.env.development`) so the QR points to
 * the dev machine's LAN address, which the phone can actually reach.
 * In production (real hostname) `window.location.origin` is used as-is.
 */
export function getShareableOrigin(): string {
  const { protocol, hostname, port } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const lanHost = (import.meta.env.VITE_PUBLIC_HOST as string | undefined || '').trim();
    if (lanHost) {
      return `${protocol}//${lanHost}${port ? `:${port}` : ''}`;
    }
  }
  return window.location.origin;
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | string;
  phone?: string | null;
  created_at?: string | null;
};

export type PatientProfile = {
  id: string;
  user_id: string;
  age?: number | null;
  gender?: string | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
  address?: string | null;
  emergency_profile_enabled?: boolean;
  emergency_access_token?: string | null;
};

export type EmergencyAccessInfo = {
  enabled: boolean;
  access_token: string;
  expires_at: string;
  public_path: string;
};

export type DoctorProfile = {
  id: string;
  user_id: string;
  specialization?: string | null;
  license_number?: string | null;
  experience_years?: number | null;
  hospital_affiliation?: string | null;
  is_verified?: boolean | null;
  state_council?: string | null;
  qualification?: string | null;
  registration_year?: number | null;
  verification_source?: string | null;
  verified_at?: string | null;
};

export type AuthContext = {
  access_token?: string;
  token_type?: string;
  user: AuthUser;
  doctor_profile?: DoctorProfile | null;
  patient_profile?: PatientProfile | null;
};

export type ProfileUpdate = {
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  gender?: string;
  allergies?: string;
  chronic_conditions?: string;
  address?: string;
  specialization?: string;
  license_number?: string;
  experience_years?: number;
  hospital_affiliation?: string;
};

export type DoctorDirectoryItem = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  specialization?: string | null;
  license_number?: string | null;
  is_verified?: boolean | null;
  state_council?: string | null;
  qualification?: string | null;
  experience_years?: number | null;
  hospital_affiliation?: string | null;
};

export type DoctorPatient = {
  patient_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone?: string | null;
  age?: number | null;
  gender?: string | null;
  visit_count: number;
  last_visit_id?: string | null;
  last_visit_status?: string | null;
  last_visit_at?: string | null;
};

export type DoctorVisit = {
  visit_id: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  doctor_id: string;
  doctor_name: string;
  session_id?: string | null;
  summary_id?: string | null;
  status: string;
  created_at: string;
};

export type IntakeStart = {
  id: string;
  status: string;
  initial_question?: string | null;
};

export type EmergencyHospital = {
  name: string;
  phone?: string | null;
  address?: string | null;
  distance_meters?: number | null;
  opening_hours?: string | null;
  is_open?: boolean | null;
};

export type IntakeResponse = {
  session_id: string;
  status: string;
  message: string;
  input_mode?: 'text' | 'voice' | null;
  next_question?: string | null;
  missing_fields?: string[];
  structured_data?: Record<string, unknown> | null;
  clinical_summary?: string | null;
  comparison?: Record<string, unknown> | null;
  summary_id?: string | null;
  matched_terms?: string[];
  nearest_hospitals?: EmergencyHospital[];
  emergency_message?: string | null;
  triage_level?: 'emergency' | 'urgent_care' | 'routine' | 'abstain' | null;
  review_required?: boolean;
  advisory?: string | null;
};

export type AISummary = {
  id: string;
  session_id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  created_at: string;
};

export type ReportOut = {
  id: string;
  file_url: string;
  parsed_data?: string | null;
  analysis_status?: string; // uploaded | queued | processing | completed | failed
};

export type PatientPublicProfile = {
  name: string;
  age?: number | null;
  gender?: string | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
};

export type SessionState = {
  session_id: string;
  status: string;
  messages: Array<{
    id: string;
    sender: string;
    message: string;
    timestamp: string;
  }>;
};

export type Notification = {
  id: string;
  user_id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export type PrescriptionItem = {
  id: string;
  prescription_id: string;
  medicine_name: string;
  dosage: string;
  duration: string;
  frequency: string;
};

export type Prescription = {
  id: string;
  visit_id: string;
  doctor_id: string;
  notes?: string | null;
  created_at: string;
  items: PrescriptionItem[];
};

export type RiskCheck = {
  severity: string;
  issues: string[];
};

export type FeedbackResult = {
  status?: string;
  rating?: number;
};

export type Reminder = {
  id: string;
  user_id: string;
  message: string;
  time: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type MedicineSchedule = {
  id: string;
  prescription_item_id: string;
  patient_id: string;
  patient_phone?: string | null;
  medicine_name: string;
  dosage?: string | null;
  frequency: string;
  reminder_times: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};

export type PublicProfile = {
  name: string;
  age?: number | null;
  gender?: string | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
  medications: Array<{
    medicine_name: string;
    dosage: string;
    duration: string;
    frequency: string;
    prescribed_on: string;
  }>;
};

export type MedicalMetric = {
  id: string;
  patient_id: string;
  report_id: string;
  parameter: string;
  value: number | null;
  raw_value: string;
  units?: string | null;
  interpretation?: string | null;
  severity?: string | null;
  measured_at: string;
  created_at: string;
};

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    let message = response.statusText || 'Request failed';
    if (typeof data === 'string' && data) {
      message = data;
    } else if (typeof data === 'object' && data !== null) {
      const errorData = data as { detail?: unknown; message?: string };
      if (Array.isArray(errorData.detail)) {
        // FastAPI 422 validation errors: [{loc:[...], msg:"...", type:"..."}]
        message = errorData.detail
          .map((e: unknown) => {
            if (typeof e === 'object' && e !== null && 'msg' in e) {
              const err = e as { msg: string; loc?: string[] };
              const field = err.loc ? err.loc.filter((l) => l !== 'body').join('.') : '';
              return field ? `${field}: ${err.msg}` : err.msg;
            }
            return String(e);
          })
          .join('; ');
      } else if (typeof errorData.detail === 'string') {
        message = errorData.detail;
      } else if (typeof errorData.message === 'string') {
        message = errorData.message;
      }
    }
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  login(email: string, password: string) {
    const body = new URLSearchParams({ username: email, password });
    return request<AuthContext & { access_token: string; token_type: string }>(`/auth/login`, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },
  me(token: string) {
    return request<AuthContext>(`/auth/me`, { token });
  },
  updateMe(payload: ProfileUpdate, token: string) {
    return request<AuthContext>(`/auth/me`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },
  registerDoctor(tokenPayload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    specialization: string;
    license_number: string;
    experience_years: number;
    hospital_affiliation?: string;
  }) {
    return request<AuthContext>(`/auth/register/doctor`, {
      method: 'POST',
      body: JSON.stringify(tokenPayload),
    });
  },
  registerPatient(tokenPayload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    age?: number;
    gender?: string;
    allergies?: string;
    chronic_conditions?: string;
    address?: string;
  }) {
    return request<AuthContext>(`/auth/register/patient`, {
      method: 'POST',
      body: JSON.stringify(tokenPayload),
    });
  },
  listDoctors(token: string) {
    return request<DoctorDirectoryItem[]>(`/doctor/directory`, { token });
  },
  listPatients(token: string) {
    return request<DoctorPatient[]>(`/doctor/patients`, { token });
  },
  getPatientHistory(patientId: string, token: string) {
    return request<DoctorVisit[]>(`/doctor/history/${patientId}`, { token });
  },
  getMyVisits(token: string) {
    return request<DoctorVisit[]>(`/visit/my`, { token });
  },
  getVisit(visitId: string, token: string) {
    return request<DoctorVisit>(`/doctor/visit/${visitId}`, { token });
  },
  startSession(patientId: string, token: string) {
    return request<IntakeStart>(`/chat/start`, {
      method: 'POST',
      token,
      body: JSON.stringify({ patient_id: patientId }),
    });
  },
  answerIntake(sessionId: string, payload: { message: string; input_mode: 'text' | 'voice'; previous_structured?: Record<string, unknown> | null }, token: string) {
    return request<IntakeResponse>(`/chat/${sessionId}/intake`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },
  transcribeAudio(file: Blob, token: string) {
    // Browser MediaRecorder audio → Groq Whisper on the backend.
    const form = new FormData();
    form.append('file', file, 'speech.webm');
    return request<{ text: string }>(`/ai/transcribe`, {
      method: 'POST',
      token,
      body: form,
    });
  },
  getSession(sessionId: string, token: string) {
    return request<SessionState>(`/chat/${sessionId}`, { token });
  },
  sendMessage(sessionId: string, message: string, token: string) {
    return request<{ id: string; message: string; sender: string }>(`/chat/message`, {
      method: 'POST',
      token,
      body: JSON.stringify({ session_id: sessionId, message }),
    });
  },
  analyzeTriage(transcript: string, token?: string | null) {
    return request<{ severity?: string; flags?: string[];[key: string]: unknown }>(`/triage/analyze`, {
      method: 'POST',
      token,
      body: JSON.stringify({ transcript }),
    });
  },
  getSummary(sessionId: string, token: string) {
    return request<AISummary>(`/ai/summary/${sessionId}`, { token });
  },
  listReports(patientId: string, token?: string | null) {
    return request<ReportOut[]>(`/reports/${patientId}`, { token });
  },
  listPatientReports(patientId: string, token: string) {
    return request<ReportOut[]>(`/reports/${encodeURIComponent(patientId)}`, { token });
  },
  uploadReport(patientId: string, file: File, token?: string | null) {
    const form = new FormData();
    form.append('file', file);
    return request<ReportOut>(`/reports/upload?patient_id=${encodeURIComponent(patientId)}`, {
      method: 'POST',
      token,
      body: form,
    });
  },
  analyzeReport(reportId: string, token: string) {
    return request<ReportOut>(`/reports/${encodeURIComponent(reportId)}/analyze`, {
      method: 'POST',
      token,
    });
  },
  deleteReport(reportId: string, token: string) {
    return request<{ status: string; report_id: string }>(`/reports/${encodeURIComponent(reportId)}`, {
      method: 'DELETE',
      token,
    });
  },
  createVisit(patientId: string, sessionId: string, token: string) {
    return request<DoctorVisit>(`/visit/create?patient_id=${encodeURIComponent(patientId)}&session_id=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      token,
    });
  },
  createPatientVisit(doctorId: string, sessionId: string, token: string) {
    return request<DoctorVisit>(`/visit/patient-create?doctor_id=${encodeURIComponent(doctorId)}&session_id=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      token,
    });
  },
  closeVisit(visitId: string, token: string) {
    return request<DoctorVisit>(`/visit/close?visit_id=${encodeURIComponent(visitId)}`, {
      method: 'PUT',
      token,
    });
  },
  getPrescription(visitId: string, token: string) {
    return request<Prescription>(`/prescription/${visitId}`, { token });
  },
  getMyPrescriptions(token: string) {
    return request<Prescription[]>(`/prescription/my`, { token });
  },
  createPrescription(visitId: string, notes: string, token: string) {
    return request<Prescription>(`/prescription/create`, {
      method: 'POST',
      token,
      body: JSON.stringify({ visit_id: visitId, notes }),
    });
  },
  addPrescriptionItem(prescriptionId: string, item: { medicine_name: string; dosage: string; duration: string; frequency: string }, token: string) {
    return request<PrescriptionItem>(`/prescription/add-item?prescription_id=${encodeURIComponent(prescriptionId)}`, {
      method: 'POST',
      token,
      body: JSON.stringify(item),
    });
  },
  submitFeedback(visitId: string, rating: number, comments: string) {
    return request<FeedbackResult>(`/feedback/submit`, {
      method: 'POST',
      body: JSON.stringify({ visit_id: visitId, rating, comments }),
    });
  },
  getFeedback(visitId: string) {
    return request<{ rating: number }>(`/feedback/${visitId}`);
  },
  listNotifications(token: string) {
    return request<Notification[]>(`/notifications`, { token });
  },
  markNotificationRead(notificationId: string, token: string) {
    return request<Notification>(`/notifications/mark-read?notification_id=${encodeURIComponent(notificationId)}`, {
      method: 'POST',
      token,
    });
  },
  runRiskCheck(prescriptionId: string, token: string) {
    return request<RiskCheck>(`/risk/run?prescription_id=${encodeURIComponent(prescriptionId)}`, {
      method: 'POST',
      token,
    });
  },
  getRiskCheck(prescriptionId: string, token: string) {
    return request<Record<string, unknown>>(`/risk/${prescriptionId}`, { token });
  },
  createReminder(payload: { user_id: string; message: string; time: string }, token: string) {
    return request<Reminder>(`/reminders/create`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },
  createMyReminder(payload: { message: string; time: string }, token: string) {
    return request<Reminder>(`/reminders/me`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },
  listReminders(userId: string, token: string) {
    return request<Reminder[]>(`/reminders/${encodeURIComponent(userId)}`, { token });
  },
  listMyReminders(token: string) {
    return request<Reminder[]>(`/reminders/me`, { token });
  },
  completeReminder(reminderId: string, token: string) {
    return request<Reminder>(`/reminders/${encodeURIComponent(reminderId)}/complete`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ is_completed: true }),
    });
  },
  deleteReminder(reminderId: string, token: string) {
    return request<{ status: string }>(`/reminders/${encodeURIComponent(reminderId)}`, {
      method: 'DELETE',
      token,
    });
  },
  getPublicProfile(patientId: string, token?: string | null) {
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return request<PublicProfile>(`/patient/public/${patientId}${query}`);
  },
  enableEmergencyAccess(token: string) {
    return request<EmergencyAccessInfo>(`/patient/profile/emergency-access`, {
      method: 'POST',
      token,
    });
  },
  disableEmergencyAccess(token: string) {
    return request<PatientProfile>(`/patient/profile/emergency-access`, {
      method: 'DELETE',
      token,
    });
  },
  getPatientMetrics(patientId: string, parameter: string | null, token: string) {
    const path = parameter 
      ? `/reports/${encodeURIComponent(patientId)}/metrics?parameter=${encodeURIComponent(parameter)}`
      : `/reports/${encodeURIComponent(patientId)}/metrics`;
    return request<MedicalMetric[]>(path, { token });
  },
  getMySchedules(token: string) {
    return request<MedicineSchedule[]>(`/schedules/me`, { token });
  },
  getPatientSchedules(patientId: string, token: string) {
    return request<MedicineSchedule[]>(`/schedules/patient/${encodeURIComponent(patientId)}`, { token });
  },
  stopSchedule(scheduleId: string, token: string) {
    return request<MedicineSchedule>(`/schedules/${encodeURIComponent(scheduleId)}`, {
      method: 'DELETE',
      token,
    });
  },
  verifyDoctorLicense(licenseNumber: string, stateCouncil?: string, token?: string) {
    return request<DoctorProfile & { is_verified: boolean; message: string; registration_number: string; verification_status?: string; status?: string | null; }>(
      '/doctor/verify-license',
      {
        method: 'POST',
        body: JSON.stringify({ license_number: licenseNumber, state_council: stateCouncil }),
        token,
      },
    );
  },
  getDoctorVerificationStatus(token?: string) {
    return request<{
      is_verified: boolean;
      message: string;
      registration_number: string;
      state_council?: string;
      qualification?: string;
      registration_year?: number;
      verification_source?: string;
      status?: string;
      verified_at?: string;
    }>(
      '/doctor/verification-status',
      { method: 'GET', token },
    );
  },
};

export { request };
