import { useEffect, useMemo, useState } from 'react';
import { api, AuthUser, DoctorPatient, DoctorVisit, IntakeResponse, Reminder, SessionState } from './api';

type Page = 'dashboard' | 'intake' | 'records';
type AuthMode = 'login' | 'register-doctor' | 'register-patient';

const navigation: Array<{ id: Page; label: string; hint: string }> = [
  { id: 'dashboard', label: 'Dashboard', hint: 'Patients and alerts' },
  { id: 'intake', label: 'Intake Studio', hint: 'Chat, triage, SOAP' },
  { id: 'records', label: 'Records Lab', hint: 'Reports and prescriptions' },
];

function formatJson(value: unknown) {
  if (value == null) return 'No data yet';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function initialVisitSummary(visit?: DoctorVisit | null) {
  if (!visit) return 'No visit selected.';
  return `${visit.patient_name} • ${visit.status} • ${visit.created_at}`;
}

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('medassist_token') || '');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authReady, setAuthReady] = useState<boolean>(() => !localStorage.getItem('medassist_token'));
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [history, setHistory] = useState<DoctorVisit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<DoctorVisit | null>(null);
  const [sessionSnapshot, setSessionSnapshot] = useState<SessionState | null>(null);
  const [summaryText, setSummaryText] = useState('');
  const [reports, setReports] = useState<Array<{ id: string; file_url: string }>>([]);
  const [notifications, setNotifications] = useState<Array<{ message: string }>>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [riskResult, setRiskResult] = useState<string>('');
  const [visitRiskSnapshot, setVisitRiskSnapshot] = useState<string>('');
  const [feedbackSnapshot, setFeedbackSnapshot] = useState<string>('');
  const [prescriptionSnapshot, setPrescriptionSnapshot] = useState<string>('');
  const [notificationIdInput, setNotificationIdInput] = useState('');
  const [feedbackRating, setFeedbackRating] = useState('4');
  const [feedbackComments, setFeedbackComments] = useState('');

  const [patientIdInput, setPatientIdInput] = useState('');
  const [sessionIdInput, setSessionIdInput] = useState('');
  const [intakeMessage, setIntakeMessage] = useState('');
  const [freeMessage, setFreeMessage] = useState('');
  const [intakeTranscript, setIntakeTranscript] = useState('');
  const [structuredData, setStructuredData] = useState<Record<string, unknown> | null>(null);
  const [triageResult, setTriageResult] = useState<string>('');
  const [aiSummaryDraft, setAiSummaryDraft] = useState<string>('');
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);

  const [reportPatientId, setReportPatientId] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reminderUserId, setReminderUserId] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderTime, setReminderTime] = useState(() => {
    const value = new Date();
    value.setHours(value.getHours() + 24);
    return value.toISOString().slice(0, 16);
  });
  const [visitCreationPatientId, setVisitCreationPatientId] = useState('');
  const [visitCreationSessionId, setVisitCreationSessionId] = useState('');
  const [prescriptionVisitId, setPrescriptionVisitId] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('Continue current therapy and monitor response.');
  const [prescriptionId, setPrescriptionId] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [duration, setDuration] = useState('');
  const [frequency, setFrequency] = useState('');

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.patient_id === selectedPatientId) || null,
    [patients, selectedPatientId],
  );

  useEffect(() => {
    const syncPage = () => {
      const next = window.location.pathname.replace('/', '') as Page;
      if (navigation.some((item) => item.id === next)) {
        setPage(next);
      } else {
        setPage('dashboard');
      }
    };
    syncPage();
    window.addEventListener('popstate', syncPage);
    return () => window.removeEventListener('popstate', syncPage);
  }, []);

  useEffect(() => {
    if (!authToken) {
      setUser(null);
      setAuthReady(true);
      return;
    }

    let active = true;
    setAuthReady(false);

    api.me(authToken)
      .then((res) => {
        if (active) {
          setUser(res.user);
        }
      })
      .catch(() => {
        if (active) {
          localStorage.removeItem('medassist_token');
          setAuthToken('');
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setAuthReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [authToken]);

  useEffect(() => {
    if (user) {
      setPage('dashboard');
      window.history.replaceState({}, '', '/');
    }
  }, [user]);

  useEffect(() => {
    if (!authToken) return;

    setBusy('Loading dashboard data');
    Promise.allSettled([api.listPatients(authToken), api.listNotifications()])
      .then(([patientsResult, notificationsResult]) => {
        if (patientsResult.status === 'fulfilled') {
          setPatients(patientsResult.value);
          setSelectedPatientId((current) => current || patientsResult.value[0]?.patient_id || '');
          setPatientIdInput((current) => current || patientsResult.value[0]?.patient_id || '');
          setReportPatientId((current) => current || patientsResult.value[0]?.patient_id || '');
          setReminderUserId((current) => current || patientsResult.value[0]?.patient_id || '');
          setVisitCreationPatientId((current) => current || patientsResult.value[0]?.patient_id || '');
        }
        if (notificationsResult.status === 'fulfilled') {
          setNotifications(notificationsResult.value);
        }
      })
      .finally(() => setBusy(null));
  }, [authToken]);

  useEffect(() => {
    if (!selectedPatientId || !authToken) {
      setHistory([]);
      setReports([]);
      setReminders([]);
      return;
    }

    setBusy('Loading patient history');
    Promise.allSettled([
      api.getPatientHistory(selectedPatientId, authToken),
      api.listReports(selectedPatientId, authToken),
      api.listReminders(selectedPatientId),
    ])
      .then(([historyResult, reportsResult, remindersResult]) => {
        if (historyResult.status === 'fulfilled') {
          setHistory(historyResult.value);
          setSelectedVisit(historyResult.value[0] || null);
        }
        if (reportsResult.status === 'fulfilled') {
          setReports(reportsResult.value);
        }
        if (remindersResult.status === 'fulfilled') {
          setReminders(remindersResult.value);
        }
      })
      .finally(() => setBusy(null));
  }, [selectedPatientId, authToken]);

  useEffect(() => {
    if (!selectedVisit || !authToken) return;

    if (selectedVisit.session_id) {
      setSessionIdInput(selectedVisit.session_id);
      setVisitCreationSessionId(selectedVisit.session_id);
    }
    setPrescriptionVisitId(selectedVisit.visit_id);

    api.getSession(selectedVisit.session_id || selectedVisit.visit_id, authToken)
      .then(setSessionSnapshot)
      .catch(() => setSessionSnapshot(null));

    if (selectedVisit.session_id) {
      api.getSummary(selectedVisit.session_id, authToken)
        .then((summary) => {
          setSummaryText(
            [
              `Subjective: ${summary.subjective}`,
              `Objective: ${summary.objective}`,
              `Assessment: ${summary.assessment}`,
              `Plan: ${summary.plan}`,
            ].join('\n\n'),
          );
        })
        .catch(() => setSummaryText('No SOAP summary found for this session.'));
    } else {
      setSummaryText('No SOAP summary found for this session.');
    }

    api.getFeedback(selectedVisit.visit_id)
      .then((feedback) => setFeedbackSnapshot(formatJson(feedback)))
      .catch(() => setFeedbackSnapshot('No feedback found for this visit.'));

    api.getPrescription(selectedVisit.visit_id, authToken)
      .then((prescription) => setPrescriptionSnapshot(formatJson(prescription)))
      .catch(() => setPrescriptionSnapshot('No prescription found for this visit.'));
  }, [selectedVisit, authToken]);

  const navigate = (next: Page) => {
    window.history.pushState({}, '', `/${next === 'dashboard' ? '' : next}`);
    setPage(next);
  };

  const setAuth = (token: string) => {
    localStorage.setItem('medassist_token', token);
    setAuthToken(token);
  };

  const clearAuth = () => {
    localStorage.removeItem('medassist_token');
    setAuthToken('');
    setUser(null);
    setPage('dashboard');
    setAuthMode('login');
    setFlash(null);
    window.history.replaceState({}, '', '/');
  };

  const handleLogin = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const email = String(data.get('email') || '');
    const password = String(data.get('password') || '');
    setBusy('Signing in');
    try {
      const result = await api.login(email, password);
      setAuth(result.access_token);
      setUser(result.user);
      setFlash(`Signed in as ${result.user.name}`);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setBusy(null);
    }
  };

  const handleRegisterDoctor = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    setBusy('Creating doctor account');
    try {
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
      const email = String(data.get('email') || '');
      const password = String(data.get('password') || '');
      const result = await api.login(email, password);
      setAuth(result.access_token);
      setUser(result.user);
      setFlash(`Welcome, ${result.user.name}`);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Doctor registration failed');
    } finally {
      setBusy(null);
    }
  };

  const handleRegisterPatient = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    setBusy('Creating patient account');
    try {
      await api.registerPatient({
        name: String(data.get('name') || ''),
        email: String(data.get('email') || ''),
        password: String(data.get('password') || ''),
        phone: String(data.get('phone') || ''),
        age: Number(data.get('age') || 0) || undefined,
        gender: String(data.get('gender') || ''),
        allergies: String(data.get('allergies') || ''),
        chronic_conditions: String(data.get('chronic_conditions') || ''),
      });
      const email = String(data.get('email') || '');
      const password = String(data.get('password') || '');
      const result = await api.login(email, password);
      setAuth(result.access_token);
      setUser(result.user);
      setFlash(`Welcome, ${result.user.name}`);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Patient registration failed');
    } finally {
      setBusy(null);
    }
  };

  const startSession = async () => {
    if (!authToken || !patientIdInput) return;
    setBusy('Starting intake session');
    try {
      const result = await api.startSession(patientIdInput, authToken);
      setSessionId(result.id);
      setSessionIdInput(result.id);
      setMessages(result.initial_question ? [{ role: 'assistant', text: result.initial_question }] : []);
      setFlash(`Session ${result.id} started`);
      navigate('intake');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not start session');
    } finally {
      setBusy(null);
    }
  };

  const sendIntakeAnswer = async () => {
    if (!authToken || !sessionIdInput || !intakeMessage) return;
    setBusy('Saving intake answer');
    try {
      const response = await api.answerIntake(
        sessionIdInput,
        {
          message: intakeMessage,
          input_mode: 'text',
          previous_structured: structuredData,
        },
        authToken,
      );

      setStructuredData(response.structured_data || structuredData);
      setMessages((current) => [
        ...current,
        { role: 'user', text: intakeMessage },
        { role: 'assistant', text: response.next_question || response.message },
      ]);
      setIntakeTranscript((current) => `${current}\n${intakeMessage}`.trim());
      setIntakeMessage('');
      setFlash(`Session ${response.session_id} updated`);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not save intake answer');
    } finally {
      setBusy(null);
    }
  };

  const sendFreeMessage = async () => {
    if (!authToken || !sessionIdInput || !freeMessage) return;
    setBusy('Sending message');
    try {
      const reply = await api.sendMessage(sessionIdInput, freeMessage, authToken);
      setMessages((current) => [
        ...current,
        { role: 'user', text: freeMessage },
        { role: 'assistant', text: reply.message },
      ]);
      setFreeMessage('');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Chat message failed');
    } finally {
      setBusy(null);
    }
  };

  const runTriage = async () => {
    if (!intakeTranscript) return;
    setBusy('Running triage');
    try {
      const result = await api.analyzeTriage(intakeTranscript, authToken || null);
      setTriageResult(formatJson(result));
    } catch (error) {
      setTriageResult(error instanceof Error ? error.message : 'Triage failed');
    } finally {
      setBusy(null);
    }
  };

  const runAI = async () => {
    if (!intakeTranscript) return;
    setBusy('Generating summary');
    try {
      const result = await api.generateSummary(intakeTranscript, authToken || null);
      setAiSummaryDraft(formatJson(result));
    } catch (error) {
      setAiSummaryDraft(error instanceof Error ? error.message : 'Summary failed');
    } finally {
      setBusy(null);
    }
  };

  const refreshSession = async () => {
    if (!authToken || !sessionIdInput) return;
    setBusy('Refreshing session');
    try {
      const snapshot = await api.getSession(sessionIdInput, authToken);
      setSessionSnapshot(snapshot);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not refresh session');
    } finally {
      setBusy(null);
    }
  };

  const uploadReport = async () => {
    if (!authToken || !reportPatientId || !reportFile) return;
    setBusy('Uploading report');
    try {
      await api.uploadReport(reportPatientId, reportFile, authToken);
      setReports(await api.listReports(reportPatientId, authToken));
      setFlash('Report uploaded');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy(null);
    }
  };

  const createReminder = async () => {
    if (!reminderUserId || !reminderMessage || !reminderTime) return;
    setBusy('Creating reminder');
    try {
      const created = await api.createReminder({
        user_id: reminderUserId,
        message: reminderMessage,
        time: reminderTime,
      });
      setReminders((current) => [created, ...current]);
      setReminderMessage('');
      setFlash('Reminder created');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not create reminder');
    } finally {
      setBusy(null);
    }
  };

  const completeReminder = async (reminderId: string) => {
    try {
      const updated = await api.completeReminder(reminderId);
      setReminders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not complete reminder');
    }
  };

  const removeReminder = async (reminderId: string) => {
    try {
      await api.deleteReminder(reminderId);
      setReminders((current) => current.filter((item) => item.id !== reminderId));
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not delete reminder');
    }
  };

  const createVisit = async () => {
    if (!authToken || !visitCreationPatientId || !visitCreationSessionId) return;
    setBusy('Creating visit');
    try {
      const created = await api.createVisit(visitCreationPatientId, visitCreationSessionId, authToken);
      setSelectedVisit(created);
      setFlash(`Visit ${created.visit_id} created`);
      navigate('records');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not create visit');
    } finally {
      setBusy(null);
    }
  };

  const closeSelectedVisit = async () => {
    if (!authToken || !selectedVisit) return;
    setBusy('Closing visit');
    try {
      const updated = await api.closeVisit(selectedVisit.visit_id, authToken);
      setSelectedVisit(updated);
      setFlash(`Visit ${updated.visit_id} closed`);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not close visit');
    } finally {
      setBusy(null);
    }
  };

  const createPrescription = async () => {
    if (!authToken || !prescriptionVisitId) return;
    setBusy('Creating prescription');
    try {
      const created = await api.createPrescription(prescriptionVisitId, prescriptionNotes, authToken);
      setPrescriptionId(String((created as { id?: string }).id || ''));
      setFlash('Prescription created');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not create prescription');
    } finally {
      setBusy(null);
    }
  };

  const addMedication = async () => {
    if (!authToken || !prescriptionId) return;
    setBusy('Adding medication');
    try {
      await api.addPrescriptionItem(
        prescriptionId,
        {
          medicine_name: medicationName,
          dosage,
          duration,
          frequency,
        },
        authToken,
      );
      setFlash('Medication added');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not add item');
    } finally {
      setBusy(null);
    }
  };

  const runRisk = async () => {
    if (!prescriptionId) return;
    setBusy('Checking risk');
    try {
      const result = await api.runRiskCheck(prescriptionId);
      setRiskResult(formatJson(result));
    } catch (error) {
      setRiskResult(error instanceof Error ? error.message : 'Risk check failed');
    } finally {
      setBusy(null);
    }
  };

  const refreshVisitRisk = async () => {
    if (!prescriptionId) return;
    try {
      setVisitRiskSnapshot(formatJson(await api.getRiskCheck(prescriptionId)));
    } catch (error) {
      setVisitRiskSnapshot(error instanceof Error ? error.message : 'Could not fetch risk record');
    }
  };

  const submitFeedback = async () => {
    if (!selectedVisit) return;
    setBusy('Submitting feedback');
    try {
      await api.submitFeedback(selectedVisit.visit_id, Number(feedbackRating || 0), feedbackComments);
      setFlash('Feedback stored');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Feedback failed');
    } finally {
      setBusy(null);
    }
  };

  const refreshNotifications = async () => {
    try {
      setNotifications(await api.listNotifications());
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not refresh notifications');
    }
  };

  const markNotificationRead = async () => {
    if (!notificationIdInput) return;
    setBusy('Updating notification');
    try {
      await api.markNotificationRead(notificationIdInput);
      setFlash('Notification marked as read');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not update notification');
    } finally {
      setBusy(null);
    }
  };

  if (!authReady && authToken && !user) {
    return (
      <div className="auth-loading">
        <div className="panel auth-card">
          <div className="eyebrow">MedAssist AI</div>
          <h1>Loading your workspace</h1>
          <p>Verifying your session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-shell">
        <div className="auth-hero">
          <div className="brand auth-brand">
            <div className="brand-badge">M</div>
            <div>
              <div className="eyebrow">MedAssist AI</div>
              <h1>Clinical workbench for intake, SOAP, and follow-up</h1>
            </div>
          </div>
          <p>
            Sign in to manage patients, start intake sessions, generate SOAP notes, and handle reminders in one workspace.
          </p>
          <div className="auth-points">
            <div className="chip">Patient dashboard</div>
            <div className="chip">AI triage</div>
            <div className="chip">Prescriptions and reminders</div>
          </div>
        </div>

        <div className="panel auth-card">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Access</div>
              <h2>{authMode === 'login' ? 'Sign in' : authMode === 'register-doctor' ? 'Register doctor' : 'Register patient'}</h2>
            </div>
            <span className="pill">{authMode}</span>
          </div>

          <div className="tabs">
            <button className={authMode === 'login' ? 'tab active' : 'tab'} onClick={() => setAuthMode('login')}>Login</button>
            <button className={authMode === 'register-doctor' ? 'tab active' : 'tab'} onClick={() => setAuthMode('register-doctor')}>Doctor</button>
            <button className={authMode === 'register-patient' ? 'tab active' : 'tab'} onClick={() => setAuthMode('register-patient')}>Patient</button>
          </div>

          {authMode === 'login' && (
            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                void handleLogin(event.currentTarget);
              }}
            >
              <input name="email" placeholder="doctor@clinic.com" type="email" required />
              <input name="password" placeholder="Password" type="password" required />
              <button className="primary" type="submit">Sign in</button>
            </form>
          )}

          {authMode === 'register-doctor' && (
            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                void handleRegisterDoctor(event.currentTarget);
              }}
            >
              <input name="name" placeholder="Doctor name" required />
              <input name="email" placeholder="doctor@clinic.com" type="email" required />
              <input name="password" placeholder="Password" type="password" required />
              <input name="phone" placeholder="Phone" />
              <input name="specialization" placeholder="Specialization" required />
              <input name="license_number" placeholder="License number" required />
              <input name="experience_years" placeholder="Experience years" type="number" min="0" required />
              <input name="hospital_affiliation" placeholder="Hospital affiliation" />
              <button className="primary" type="submit">Create account</button>
            </form>
          )}

          {authMode === 'register-patient' && (
            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                void handleRegisterPatient(event.currentTarget);
              }}
            >
              <input name="name" placeholder="Patient name" required />
              <input name="email" placeholder="patient@clinic.com" type="email" required />
              <input name="password" placeholder="Password" type="password" required />
              <input name="phone" placeholder="Phone" />
              <input name="age" placeholder="Age" type="number" min="0" />
              <input name="gender" placeholder="Gender" />
              <input name="allergies" placeholder="Allergies" />
              <input name="chronic_conditions" placeholder="Chronic conditions" />
              <button className="primary" type="submit">Create account</button>
            </form>
          )}

          {flash && <div className="flash" style={{ marginTop: 12 }}>{flash}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">M</div>
          <div>
            <div className="eyebrow">MedAssist AI</div>
            <h1>Clinical Workbench</h1>
          </div>
        </div>

        <nav className="nav">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </button>
          ))}
        </nav>

        <div className="panel auth-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Session</div>
              <h2>{user.name}</h2>
            </div>
            <span className="pill">{user.role}</span>
          </div>
          <div className="stack compact">
            <div className="notification">
              <span>{user.email}</span>
            </div>
            <button className="secondary" onClick={clearAuth}>Sign out</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Context</div>
              <h2>Quick actions</h2>
            </div>
          </div>

          <div className="stack compact">
            <input value={patientIdInput} onChange={(event) => setPatientIdInput(event.target.value)} placeholder="Patient ID" />
            <button className="secondary" onClick={() => void startSession()}>Start intake session</button>
            <button className="secondary" onClick={() => void refreshNotifications()}>Refresh notifications</button>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <div className="eyebrow">Workspace</div>
            <h2>{page === 'dashboard' ? 'Patient overview' : page === 'intake' ? 'Intake and SOAP drafting' : 'Reports and prescriptions'}</h2>
            <p>{user ? `${user.name} • ${user.email}` : 'Sign in to unlock the clinical endpoints.'}</p>
          </div>
          <div className="topbar-actions">
            <button className="ghost" onClick={() => void refreshNotifications()}>Notifications</button>
            <button className="ghost" onClick={() => void navigator.clipboard.writeText(authToken)}>Copy token</button>
          </div>
        </header>

        {flash && <div className="flash">{flash}</div>}
        {busy && <div className="flash subtle">{busy}...</div>}

        {page === 'dashboard' && (
          <section className="grid dashboard-grid">
            <article className="hero-card">
              <div className="hero-head">
                <div>
                  <div className="eyebrow">Patients</div>
                  <h3>{selectedPatient?.patient_name || 'Select a patient'}</h3>
                  <p>{selectedPatient ? `${selectedPatient.patient_email} • ${selectedPatient.visit_count} visits` : 'Choose a patient from the left panel to load history, reports, and summaries.'}</p>
                </div>
                <div className="hero-meta">
                  <span className="pill">Selected {patients.length}</span>
                  <span className="pill muted">{selectedVisit ? selectedVisit.status : 'No visit selected'}</span>
                </div>
              </div>

              <div className="stats">
                <div className="stat">
                  <span>Open records</span>
                  <strong>{history.length}</strong>
                </div>
                <div className="stat">
                  <span>Reports</span>
                  <strong>{reports.length}</strong>
                </div>
                <div className="stat">
                  <span>Notifications</span>
                  <strong>{notifications.length}</strong>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Patients</div>
                  <h2>Doctor roster</h2>
                </div>
              </div>
              <div className="table-list">
                {patients.map((patient) => (
                  <button
                    key={patient.patient_id}
                    className={`list-row ${selectedPatientId === patient.patient_id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedPatientId(patient.patient_id);
                      setReportPatientId(patient.patient_id);
                      setVisitCreationPatientId(patient.patient_id);
                    }}
                  >
                    <div>
                      <strong>{patient.patient_name}</strong>
                      <span>{patient.patient_email}</span>
                    </div>
                    <div className="row-meta">
                      <span>{patient.visit_count} visits</span>
                      <span>{patient.last_visit_status || 'new'}</span>
                    </div>
                  </button>
                ))}
                {!patients.length && <div className="empty">No patients loaded. Sign in as a doctor to fetch /doctor/patients.</div>}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">History</div>
                  <h2>Visit timeline</h2>
                </div>
              </div>
              <div className="stack compact">
                {history.map((visit) => (
                  <button
                    key={visit.visit_id}
                    className={`timeline-item ${selectedVisit?.visit_id === visit.visit_id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedVisit(visit);
                      setSessionIdInput(visit.session_id || '');
                      setVisitCreationSessionId(visit.session_id || '');
                      setPrescriptionVisitId(visit.visit_id);
                    }}
                  >
                    <strong>{visit.visit_id}</strong>
                    <span>{initialVisitSummary(visit)}</span>
                  </button>
                ))}
                {!history.length && <div className="empty">The selected patient has no visit history yet.</div>}
              </div>
            </article>

            <article className="panel wide">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">SOAP</div>
                  <h2>Latest summary</h2>
                </div>
                <button className="secondary" onClick={() => selectedVisit?.session_id && void api.getSummary(selectedVisit.session_id, authToken).then((summary) => setSummaryText(formatJson(summary))).catch((error) => setSummaryText(error instanceof Error ? error.message : 'Failed'))}>Refresh</button>
              </div>
              <pre className="code-block">{summaryText}</pre>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Reports</div>
                  <h2>Uploaded files</h2>
                </div>
              </div>
              <div className="stack compact">
                {reports.map((report) => (
                  <a className="link-row" key={report.id} href={report.file_url} target="_blank" rel="noreferrer">
                    {report.file_url}
                  </a>
                ))}
                {!reports.length && <div className="empty">No reports for the selected patient.</div>}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Alerts</div>
                  <h2>Notifications</h2>
                </div>
              </div>
              <div className="stack compact">
                {notifications.map((item, index) => (
                  <div key={`${item.message}-${index}`} className="notification">
                    <span>{item.message}</span>
                  </div>
                ))}
                {!notifications.length && <div className="empty">No notifications returned by the API.</div>}
                <input value={notificationIdInput} onChange={(event) => setNotificationIdInput(event.target.value)} placeholder="Notification ID" />
                <button className="secondary" onClick={() => void markNotificationRead()}>Mark read</button>
              </div>
            </article>
          </section>
        )}

        {page === 'intake' && (
          <section className="grid intake-grid">
            <article className="panel wide">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Session</div>
                  <h2>Intake chat</h2>
                </div>
                <button className="secondary" onClick={() => void refreshSession()}>Refresh session</button>
              </div>

              <div className="split">
                <div className="stack">
                  <input value={sessionIdInput} onChange={(event) => setSessionIdInput(event.target.value)} placeholder="Session ID" />
                  <input value={patientIdInput} onChange={(event) => setPatientIdInput(event.target.value)} placeholder="Patient ID" />
                  <textarea
                    rows={4}
                    value={intakeMessage}
                    onChange={(event) => setIntakeMessage(event.target.value)}
                    placeholder="Patient response or clinical note"
                  />
                  <div className="row">
                    <button className="primary" onClick={() => void sendIntakeAnswer()}>Save intake answer</button>
                    <button className="secondary" onClick={() => void runTriage()}>Run triage</button>
                    <button className="secondary" onClick={() => void runAI()}>Generate summary</button>
                  </div>
                  <input value={freeMessage} onChange={(event) => setFreeMessage(event.target.value)} placeholder="Follow-up chat message" />
                  <button className="secondary" onClick={() => void sendFreeMessage()}>Send chat message</button>
                </div>

                <div className="chat-card">
                  <div className="chat-log">
                    {messages.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={`bubble ${message.role}`}>
                        {message.text}
                      </div>
                    ))}
                    {!messages.length && <div className="empty">Start a session to see the intake conversation here.</div>}
                  </div>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Structured</div>
                  <h2>Data extracted from intake</h2>
                </div>
              </div>
              <pre className="code-block">{formatJson(structuredData)}</pre>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Triage</div>
                  <h2>Red flags</h2>
                </div>
              </div>
              <pre className="code-block">{triageResult || 'No triage run yet.'}</pre>
            </article>

            <article className="panel wide">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">AI</div>
                  <h2>Generated note</h2>
                </div>
              </div>
              <pre className="code-block">{aiSummaryDraft || 'No AI summary generated yet.'}</pre>
            </article>

            <article className="panel wide">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Session Snapshot</div>
                  <h2>Messages from the backend</h2>
                </div>
              </div>
              <pre className="code-block">{formatJson(sessionSnapshot)}</pre>
            </article>
          </section>
        )}

        {page === 'records' && (
          <section className="grid records-grid">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Reports</div>
                  <h2>Upload and browse</h2>
                </div>
              </div>
              <div className="stack compact">
                <input value={reportPatientId} onChange={(event) => setReportPatientId(event.target.value)} placeholder="Patient ID" />
                <input type="file" onChange={(event) => setReportFile(event.target.files?.[0] || null)} />
                <button className="primary" onClick={() => void uploadReport()}>Upload report</button>
              </div>
              <div className="stack compact">
                {reports.map((report) => (
                  <div className="chip" key={report.id}>{report.file_url}</div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Visit</div>
                  <h2>Create or close</h2>
                </div>
              </div>
              <div className="stack compact">
                <input value={visitCreationPatientId} onChange={(event) => setVisitCreationPatientId(event.target.value)} placeholder="Patient ID" />
                <input value={visitCreationSessionId} onChange={(event) => setVisitCreationSessionId(event.target.value)} placeholder="Session ID" />
                <button className="primary" onClick={() => void createVisit()}>Create visit</button>
                <button className="secondary" onClick={() => void closeSelectedVisit()}>Close selected visit</button>
              </div>
            </article>

            <article className="panel wide">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Prescription</div>
                  <h2>Build medication orders</h2>
                </div>
              </div>
              <div className="split">
                <div className="stack">
                  <input value={prescriptionVisitId} onChange={(event) => setPrescriptionVisitId(event.target.value)} placeholder="Visit ID" />
                  <textarea rows={4} value={prescriptionNotes} onChange={(event) => setPrescriptionNotes(event.target.value)} placeholder="Prescription notes" />
                  <button className="primary" onClick={() => void createPrescription()}>Create prescription</button>
                </div>
                <div className="stack">
                  <input value={prescriptionId} onChange={(event) => setPrescriptionId(event.target.value)} placeholder="Prescription ID" />
                  <input value={medicationName} onChange={(event) => setMedicationName(event.target.value)} placeholder="Medicine name" />
                  <input value={dosage} onChange={(event) => setDosage(event.target.value)} placeholder="Dosage" />
                  <input value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="Duration" />
                  <input value={frequency} onChange={(event) => setFrequency(event.target.value)} placeholder="Frequency" />
                  <div className="row">
                    <button className="primary" onClick={() => void addMedication()}>Add item</button>
                    <button className="secondary" onClick={() => void runRisk()}>Run risk check</button>
                  </div>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Reminders</div>
                  <h2>Follow-up tasks</h2>
                </div>
              </div>
              <div className="stack compact">
                <input value={reminderUserId} onChange={(event) => setReminderUserId(event.target.value)} placeholder="User ID" />
                <input value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} type="datetime-local" />
                <textarea rows={3} value={reminderMessage} onChange={(event) => setReminderMessage(event.target.value)} placeholder="Reminder message" />
                <button className="primary" onClick={() => void createReminder()}>Create reminder</button>
              </div>
              <div className="stack compact" style={{ marginTop: 12 }}>
                {reminders.map((reminder) => (
                  <div key={reminder.id} className={`reminder-row ${reminder.is_completed ? 'done' : ''}`}>
                    <div>
                      <strong>{reminder.message}</strong>
                      <span>{new Date(reminder.time).toLocaleString()}</span>
                    </div>
                    <div className="row">
                      <button className="secondary" onClick={() => void completeReminder(reminder.id)} disabled={reminder.is_completed}>
                        {reminder.is_completed ? 'Completed' : 'Complete'}
                      </button>
                      <button className="ghost" onClick={() => void removeReminder(reminder.id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {!reminders.length && <div className="empty">No reminders for this user yet.</div>}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Feedback</div>
                  <h2>Visit rating</h2>
                </div>
              </div>
              <div className="stack compact">
                <input value={selectedVisit?.visit_id || ''} readOnly placeholder="Selected visit ID" />
                <input value={feedbackRating} onChange={(event) => setFeedbackRating(event.target.value)} type="number" min="1" max="5" />
                <textarea rows={4} value={feedbackComments} onChange={(event) => setFeedbackComments(event.target.value)} placeholder="Comments" />
                <button className="primary" onClick={() => void submitFeedback()}>Submit feedback</button>
              </div>
              <pre className="code-block" style={{ minHeight: 160 }}>{feedbackSnapshot || 'No feedback loaded yet.'}</pre>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Risk</div>
                  <h2>Therapy interactions</h2>
                </div>
              </div>
              <pre className="code-block">{riskResult || 'No risk check yet.'}</pre>
              <button className="secondary" onClick={() => void refreshVisitRisk()}>Load saved risk record</button>
              <pre className="code-block" style={{ minHeight: 140 }}>{visitRiskSnapshot || 'No saved risk record loaded.'}</pre>
            </article>

            <article className="panel wide">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Selected</div>
                  <h2>Current visit details</h2>
                </div>
                {selectedVisit && (
                  <button className="secondary" onClick={() => void api.getVisit(selectedVisit.visit_id, authToken).then(setSelectedVisit).catch((error) => setFlash(error instanceof Error ? error.message : 'Could not load visit'))}>Load full record</button>
                )}
              </div>
              <pre className="code-block">{formatJson(selectedVisit)}</pre>
              <pre className="code-block" style={{ minHeight: 180 }}>{prescriptionSnapshot || 'No prescription loaded yet.'}</pre>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
