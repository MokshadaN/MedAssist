export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  created_at?: string | null;
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

export type IntakeResponse = {
  session_id: string;
  status: string;
  message: string;
  input_mode?: 'text' | 'voice' | null;
  next_question?: string | null;
  missing_fields: string[];
  structured_data?: Record<string, unknown> | null;
  clinical_summary?: string | null;
  comparison?: Record<string, unknown> | null;
  summary_id?: string | null;
  matched_terms: string[];
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
  message: string;
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
    const errorData = typeof data === 'object' && data !== null ? (data as { detail?: string; message?: string }) : null;
    const message = errorData?.detail || errorData?.message || (typeof data === 'string' ? data : '') || response.statusText;
    throw new Error(message || 'Request failed');
  }

  return data as T;
}

export const api = {
  login(email: string, password: string) {
    const body = new URLSearchParams({ username: email, password });
    return request<{ access_token: string; token_type: string; user: AuthUser }>(`/auth/login`, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },
  me(token: string) {
    return request<{ user: AuthUser }>(`/auth/me`, { token });
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
    return request(`/auth/register/doctor`, {
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
  }) {
    return request(`/auth/register/patient`, {
      method: 'POST',
      body: JSON.stringify(tokenPayload),
    });
  },
  listPatients(token: string) {
    return request<DoctorPatient[]>(`/doctor/patients`, { token });
  },
  getPatientHistory(patientId: string, token: string) {
    return request<DoctorVisit[]>(`/doctor/history/${patientId}`, { token });
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
    return request<{ severity?: string; flags?: string[]; [key: string]: unknown }>(`/triage/analyze`, {
      method: 'POST',
      token,
      body: JSON.stringify({ transcript }),
    });
  },
  generateSummary(transcript: string, token?: string | null) {
    return request<Record<string, unknown>>(`/ai/generate-summary`, {
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
  uploadReport(patientId: string, file: File, token?: string | null) {
    const form = new FormData();
    form.append('file', file);
    return request<ReportOut>(`/reports/upload?patient_id=${encodeURIComponent(patientId)}`, {
      method: 'POST',
      token,
      body: form,
    });
  },
  createVisit(patientId: string, sessionId: string, token: string) {
    return request<DoctorVisit>(`/visit/create?patient_id=${encodeURIComponent(patientId)}&session_id=${encodeURIComponent(sessionId)}`, {
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
    return request<Record<string, unknown>>(`/prescription/${visitId}`, { token });
  },
  createPrescription(visitId: string, notes: string, token: string) {
    return request<Record<string, unknown>>(`/prescription/create`, {
      method: 'POST',
      token,
      body: JSON.stringify({ visit_id: visitId, notes }),
    });
  },
  addPrescriptionItem(prescriptionId: string, item: { medicine_name: string; dosage: string; duration: string; frequency: string }, token: string) {
    return request<Record<string, unknown>>(`/prescription/add-item?prescription_id=${encodeURIComponent(prescriptionId)}`, {
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
  listNotifications() {
    return request<Notification[]>(`/notifications`);
  },
  markNotificationRead(notificationId: string) {
    return request<{ status: string }>(`/notifications/mark-read?notification_id=${encodeURIComponent(notificationId)}`, {
      method: 'POST',
    });
  },
  runRiskCheck(prescriptionId: string) {
    return request<RiskCheck>(`/risk/run?prescription_id=${encodeURIComponent(prescriptionId)}`, {
      method: 'POST',
    });
  },
  getRiskCheck(prescriptionId: string) {
    return request<Record<string, unknown>>(`/risk/${prescriptionId}`);
  },
  createReminder(payload: { user_id: string; message: string; time: string }) {
    return request<Reminder>(`/reminders/create`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listReminders(userId: string) {
    return request<Reminder[]>(`/reminders/${encodeURIComponent(userId)}`);
  },
  completeReminder(reminderId: string) {
    return request<Reminder>(`/reminders/${encodeURIComponent(reminderId)}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ is_completed: true }),
    });
  },
  deleteReminder(reminderId: string) {
    return request<{ status: string }>(`/reminders/${encodeURIComponent(reminderId)}`, {
      method: 'DELETE',
    });
  },
};

export { request };
