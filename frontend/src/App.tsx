import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  api,
  AISummary,
  AuthContext,
  AuthUser,
  DoctorDirectoryItem,
  DoctorPatient,
  DoctorVisit,
  Notification,
  PatientProfile,
  Prescription,
  Reminder,
  SessionState,
} from './api';

type AuthMode = 'login' | 'register-doctor' | 'register-patient';
type ChatMessage = { role: 'assistant' | 'user'; text: string };

const emptyProfile: PatientProfile = {
  id: '',
  user_id: '',
  age: null,
  gender: '',
  allergies: '',
  chronic_conditions: '',
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

function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('medassist_token') || '');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authReady, setAuthReady] = useState(!localStorage.getItem('medassist_token'));
  const [busy, setBusy] = useState('');
  const [flash, setFlash] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [patientPortalOpen, setPatientPortalOpen] = useState(true);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);

  const [doctors, setDoctors] = useState<DoctorDirectoryItem[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [patientVisits, setPatientVisits] = useState<DoctorVisit[]>([]);
  const [patientReports, setPatientReports] = useState<Array<{ id: string; file_url: string }>>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [patientReminders, setPatientReminders] = useState<Reminder[]>([]);
  const [reportFile, setReportFile] = useState<File | null>(null);

  const [intakeOpen, setIntakeOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [intakeText, setIntakeText] = useState('');
  const [intakeMessages, setIntakeMessages] = useState<ChatMessage[]>([]);
  const [structuredData, setStructuredData] = useState<Record<string, unknown> | null>(null);
  const [lastSummary, setLastSummary] = useState<AISummary | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    allergies: '',
    chronic_conditions: '',
  });

  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [doctorHistory, setDoctorHistory] = useState<DoctorVisit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<DoctorVisit | null>(null);
  const [sessionSnapshot, setSessionSnapshot] = useState<SessionState | null>(null);
  const [doctorSummary, setDoctorSummary] = useState<AISummary | null>(null);
  const [prescriptionNotes, setPrescriptionNotes] = useState('Continue current therapy and monitor response.');
  const [prescriptionId, setPrescriptionId] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [duration, setDuration] = useState('');
  const [frequency, setFrequency] = useState('');
  const [doctorReminderTime, setDoctorReminderTime] = useState(() => {
    const value = new Date();
    value.setDate(value.getDate() + 2);
    return value.toISOString().slice(0, 16);
  });
  const [doctorReminderMessage, setDoctorReminderMessage] = useState('Doctor visit in 2 days');

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
    setProfileForm({
      name: context.user.name || '',
      email: context.user.email || '',
      phone: context.user.phone || '',
      age: String(context.patient_profile?.age || ''),
      gender: context.patient_profile?.gender || '',
      allergies: context.patient_profile?.allergies || '',
      chronic_conditions: context.patient_profile?.chronic_conditions || '',
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

  const refreshNotifications = async () => {
    if (!authToken) return;
    try {
      setNotifications(await api.listNotifications(authToken));
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not load notifications');
    }
  };

  const refreshPatientData = async () => {
    if (!authToken || !user || user.role !== 'patient') return;
    setBusy('Loading your dashboard');
    try {
      const [doctorList, visits, reports, prescriptions, reminders, notes] = await Promise.all([
        api.listDoctors(authToken),
        api.getMyVisits(authToken),
        api.listReports(user.id, authToken),
        api.getMyPrescriptions(authToken),
        api.listMyReminders(authToken),
        api.listNotifications(authToken),
      ]);
      setDoctors(doctorList);
      setSelectedDoctorId((current) => current || doctorList[0]?.id || '');
      setPatientVisits(visits);
      setPatientReports(reports);
      setPatientPrescriptions(prescriptions);
      setPatientReminders(reminders);
      setNotifications(notes);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not load patient dashboard');
    } finally {
      setBusy('');
    }
  };

  const refreshDoctorData = async () => {
    if (!authToken || !user || user.role !== 'doctor') return;
    setBusy('Loading doctor dashboard');
    try {
      const [loadedPatients, notes] = await Promise.all([
        api.listPatients(authToken),
        api.listNotifications(authToken),
      ]);
      setPatients(loadedPatients);
      setNotifications(notes);
      setSelectedPatientId((current) => current || loadedPatients[0]?.patient_id || '');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not load doctor dashboard');
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
    setBusy('Loading patient timeline');
    api.getPatientHistory(selectedPatientId, authToken)
      .then((history) => {
        setDoctorHistory(history);
        setSelectedVisit(history[0] || null);
      })
      .catch((error) => setFlash(error instanceof Error ? error.message : 'Could not load patient history'))
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
    if (intakeOpen) {
      chatPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [intakeOpen]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy('Signing in');
    try {
      const result = await api.login(String(data.get('email') || ''), String(data.get('password') || ''));
      localStorage.setItem('medassist_token', result.access_token);
      setAuthToken(result.access_token);
      setAuthContext(result);
      setFlash(`Signed in as ${result.user.name}`);
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
        });
      }

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
    setPatientProfile(null);
    setFlash('');
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
      setPatientPortalOpen(true);
      setIntakeOpen(true);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not start visit');
    } finally {
      setBusy('');
    }
  };

  const sendIntakeAnswer = async () => {
    if (!authToken || !activeSessionId || !intakeText.trim()) return;
    const answer = intakeText.trim();
    setBusy('Saving answer');
    try {
      const response = await api.answerIntake(
        activeSessionId,
        {
          message: answer,
          input_mode: 'text',
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
      if (response.structured_data) setStructuredData(response.structured_data);

      if (response.status === 'complete') {
        const visit = await api.createPatientVisit(selectedDoctorId, response.session_id, authToken);
        const summary = await api.getSummary(response.session_id, authToken);
        setLastSummary(summary);
        setPatientVisits((current) => [visit, ...current.filter((item) => item.visit_id !== visit.visit_id)]);
        setFlash(`Visit sent to ${selectedDoctor?.name || 'doctor'}`);
        await refreshPatientData();
      }
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not save intake answer');
    } finally {
      setBusy('');
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authToken) return;
    setBusy('Saving profile');
    try {
      const context = await api.updateMe(
        {
          name: profileForm.name,
          email: profileForm.email,
          phone: profileForm.phone,
          age: Number(profileForm.age || 0) || undefined,
          gender: profileForm.gender,
          allergies: profileForm.allergies,
          chronic_conditions: profileForm.chronic_conditions,
        },
        authToken,
      );
      setAuthContext(context);
      setFlash('Profile updated');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not update profile');
    } finally {
      setBusy('');
    }
  };

  const uploadPatientReport = async () => {
    if (!authToken || !user || !reportFile) return;
    setBusy('Uploading report');
    try {
      await api.uploadReport(user.id, reportFile, authToken);
      setPatientReports(await api.listReports(user.id, authToken));
      setReportFile(null);
      setFlash('Report uploaded');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy('');
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
      setFlash(error instanceof Error ? error.message : 'Could not create reminder');
    }
  };

  const markNotificationRead = async (notification: Notification) => {
    if (!authToken) return;
    try {
      const updated = await api.markNotificationRead(notification.id, authToken);
      setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not mark notification read');
    }
  };

  const createPrescription = async () => {
    if (!authToken || !selectedVisit) return;
    setBusy('Creating prescription');
    try {
      const prescription = await api.createPrescription(selectedVisit.visit_id, prescriptionNotes, authToken);
      setPrescriptionId(prescription.id);
      setFlash('Prescription created');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not create prescription');
    } finally {
      setBusy('');
    }
  };

  const addMedication = async () => {
    if (!authToken || !prescriptionId) return;
    setBusy('Adding medication');
    try {
      await api.addPrescriptionItem(
        prescriptionId,
        { medicine_name: medicationName, dosage, duration, frequency },
        authToken,
      );
      setMedicationName('');
      setDosage('');
      setDuration('');
      setFrequency('');
      setFlash('Medication added');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not add medication');
    } finally {
      setBusy('');
    }
  };

  const scheduleFollowUp = async () => {
    if (!selectedPatientId || !doctorReminderMessage || !doctorReminderTime) return;
    try {
      await api.createReminder({
        user_id: selectedPatientId,
        message: doctorReminderMessage,
        time: new Date(doctorReminderTime).toISOString(),
      });
      setFlash('Follow-up reminder scheduled');
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Could not schedule follow-up');
    }
  };

  if (!authReady) {
    return <div className="auth-loading panel">Loading MedAssist...</div>;
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-hero">
          <div className="brand">
            <div className="brand-badge">M</div>
            <div>
              <div className="eyebrow">MedAssist</div>
              <h1>Care records without the paperwork maze</h1>
            </div>
          </div>
          <p>Patients can start a visit, complete intake, review reports and prescriptions, and keep profile details current. Doctors can track timelines and act on the generated SOAP summary.</p>
          <div className="auth-points">
            <span className="pill">Patient intake</span>
            <span className="pill">SOAP summaries</span>
            <span className="pill">Follow-up reminders</span>
          </div>
        </section>

        <section className="panel auth-card">
          <div className="tabs">
            <button className={`tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>Login</button>
            <button className={`tab ${authMode === 'register-patient' ? 'active' : ''}`} onClick={() => setAuthMode('register-patient')}>Patient</button>
            <button className={`tab ${authMode === 'register-doctor' ? 'active' : ''}`} onClick={() => setAuthMode('register-doctor')}>Doctor</button>
          </div>

          <form className="stack" onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
            {authMode !== 'login' && <input name="name" placeholder="Full name" required />}
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Password" required />
            {authMode !== 'login' && <input name="phone" placeholder="Phone number" />}
            {authMode === 'register-patient' && (
              <>
                <input name="age" type="number" placeholder="Age" />
                <input name="gender" placeholder="Gender" />
                <input name="allergies" placeholder="Allergies" />
                <input name="chronic_conditions" placeholder="Chronic conditions" />
              </>
            )}
            {authMode === 'register-doctor' && (
              <>
                <input name="specialization" placeholder="Specialization" required />
                <input name="license_number" placeholder="License number" required />
                <input name="experience_years" type="number" placeholder="Years of experience" required />
                <input name="hospital_affiliation" placeholder="Hospital affiliation" />
              </>
            )}
            <button className="primary" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>
          {flash && <div className="flash">{flash}</div>}
          {busy && <div className="flash subtle">{busy}...</div>}
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="brand" onClick={() => setShowProfile(!showProfile)} style={{ cursor: 'pointer' }}>
          <div className="brand-badge">M</div>
          <div>
            <div className="eyebrow">{user.role === 'patient' ? 'Patient portal' : 'Doctor dashboard'}</div>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="secondary" onClick={() => setShowNotifications((value) => !value)}>
            Notifications ({notifications.filter((item) => !item.is_read).length})
          </button>
          <button className="ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {flash && <div className="flash">{flash}</div>}
      {busy && <div className="flash subtle">{busy}...</div>}

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

      {showProfile && user.role === 'patient' && (
        <section className="panel notification-panel" style={{ right: 'auto', left: '22px' }}>
          <div className="panel-head">
            <div>
              <div className="eyebrow">Profile</div>
              <h2>Lookup and edit details</h2>
            </div>
            <span className="pill">{patientProfile?.allergies ? 'Allergies recorded' : 'No allergy details'}</span>
          </div>
          <form className="profile-grid" onSubmit={(e) => { saveProfile(e); setShowProfile(false); }}>
            <input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} placeholder="Name" />
            <input value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} placeholder="Email" />
            <input value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} placeholder="Phone" />
            <input value={profileForm.age} onChange={(event) => setProfileForm({ ...profileForm, age: event.target.value })} placeholder="Age" />
            <input value={profileForm.gender} onChange={(event) => setProfileForm({ ...profileForm, gender: event.target.value })} placeholder="Gender" />
            <textarea rows={3} value={profileForm.allergies} onChange={(event) => setProfileForm({ ...profileForm, allergies: event.target.value })} placeholder="Allergies" />
            <textarea rows={3} value={profileForm.chronic_conditions} onChange={(event) => setProfileForm({ ...profileForm, chronic_conditions: event.target.value })} placeholder="Chronic conditions" />
            <button className="primary" type="submit">Save profile</button>
          </form>
        </section>
      )}

      {user.role === 'patient' ? (
        <main className="patient-shell">
          <section className="hero-card hero-top">
            <div className="hero-head">
              <div>
                <div className="eyebrow">Current care</div>
                <h2>Start a new visit</h2>
                <p>Select a doctor, answer the questionnaire, and your SOAP summary will be sent to the doctor's dashboard.</p>
              </div>
              <div className="action-group">
                <select value={selectedDoctorId} onChange={(event) => setSelectedDoctorId(event.target.value)}>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                  ))}
                </select>
                <button className="primary" onClick={() => void startPatientVisit()} disabled={!selectedDoctorId}>Add new visit</button>
                <button className="ghost" onClick={() => setPatientPortalOpen((value) => !value)}>{patientPortalOpen ? 'Hide portal' : 'Show portal'}</button>
              </div>
            </div>
          </section>

          {patientPortalOpen ? (
            <div className="patient-portal-grid">
              <div className="panel-column">
                <section className="panel compact-panel">
                  <div className="panel-head">
                    <div>
                      <div className="eyebrow">Reminders</div>
                      <h2>Important soon</h2>
                    </div>
                    <button className="ghost" onClick={() => void createPatientReminder('Doctor visit in 2 days', 2)}>+ 2 days</button>
                  </div>
                  <div className="stack compact">
                    {patientReminders.map((reminder) => (
                      <div key={reminder.id} className={`reminder-row ${reminder.is_completed ? 'done' : ''}`}>
                        <div>
                          <span className={`badge ${isUrgent(reminder) ? 'urgent' : ''}`}>{reminderLabel(reminder)}</span>
                          <strong>{reminder.message}</strong>
                          <span>{formatDate(reminder.time)}</span>
                        </div>
                      </div>
                    ))}
                    {!patientReminders.length && <div className="empty">No reminders yet.</div>}
                  </div>
                </section>

                <section className="panel compact-panel">
                  <div className="panel-head">
                    <div>
                      <div className="eyebrow">Timeline</div>
                      <h2>Visit history</h2>
                    </div>
                  </div>
                  <div className="stack compact">
                    {patientVisits.map((visit) => (
                      <button key={visit.visit_id} className="timeline-item">
                        <strong>{visit.doctor_name}</strong>
                        <span>{visit.status} - {formatDate(visit.created_at)}</span>
                      </button>
                    ))}
                    {!patientVisits.length && <div className="empty">Your visits will appear here after intake is completed.</div>}
                  </div>
                </section>
              </div>

              <div className="panel-column center-column" ref={chatPanelRef}>
                <section className="panel chat-panel">
                  <div className="panel-head">
                    <div>
                      <div className="eyebrow">Questionnaire</div>
                      <h2>Chat flow timeline</h2>
                    </div>
                    {intakeOpen ? <button className="ghost" onClick={() => setIntakeOpen(false)}>Hide</button> : null}
                  </div>
                  {intakeOpen ? (
                    <div className="chat-card">
                      <div className="chat-log">
                        {intakeMessages.map((message, index) => (
                          <div key={`${message.role}-${index}`} className={`bubble ${message.role}`}>{message.text}</div>
                        ))}
                      </div>
                      <div className="chat-compose">
                        <textarea rows={3} value={intakeText} onChange={(event) => setIntakeText(event.target.value)} placeholder="Type your answer" />
                        <button className="primary" onClick={() => void sendIntakeAnswer()}>Send answer</button>
                      </div>
                    </div>
                  ) : (
                    <div className="empty">Click Add new visit to open the questionnaire.</div>
                  )}
                </section>
                <section className="panel summary-panel">
                  <div className="panel-head">
                    <div>
                      <div className="eyebrow">SOAP summary</div>
                      <h2>Live summary</h2>
                    </div>
                  </div>
                  <pre className="code-block">{formatSummary(lastSummary)}</pre>
                </section>
              </div>

              <div className="panel-column">
                <section className="panel compact-panel">
                  <div className="panel-head">
                    <div>
                      <div className="eyebrow">Reports</div>
                      <h2>Uploaded files</h2>
                    </div>
                  </div>
                  <div className="stack compact">
                    <input type="file" onChange={(event) => setReportFile(event.target.files?.[0] || null)} />
                    <button className="secondary" onClick={() => void uploadPatientReport()} disabled={!reportFile}>Upload report</button>
                    {patientReports.map((report) => (
                      <a className="link-row" key={report.id} href={report.file_url} target="_blank" rel="noreferrer">{report.file_url}</a>
                    ))}
                    {!patientReports.length && <div className="empty">No reports uploaded yet.</div>}
                  </div>
                </section>

                <section className="panel compact-panel">
                  <div className="panel-head">
                    <div>
                      <div className="eyebrow">Prescriptions</div>
                      <h2>Current orders</h2>
                    </div>
                  </div>
                  <div className="stack compact">
                    {patientPrescriptions.map((prescription) => (
                      <div className="record-card" key={prescription.id}>
                        <strong>{prescription.notes || 'Prescription'}</strong>
                        <span>{formatDate(prescription.created_at)}</span>
                        {prescription.items.map((item) => (
                          <span key={item.id}>{item.medicine_name} - {item.dosage} - {item.frequency} - {item.duration}</span>
                        ))}
                      </div>
                    ))}
                    {!patientPrescriptions.length && <div className="empty">No prescriptions yet.</div>}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <section className="panel empty-panel">
              <div className="empty">Patient portal collapsed. Click Show portal to open intake, history and reports.</div>
            </section>
          )}
        </main>
      ) : (
        <main className="grid doctor-grid">
          <section className="panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Patients</div>
                <h2>Select patient</h2>
              </div>
            </div>
            <div className="table-list">
              {patients.map((patient) => (
                <button
                  key={patient.patient_id}
                  className={`list-row ${selectedPatientId === patient.patient_id ? 'active' : ''}`}
                  onClick={() => setSelectedPatientId(patient.patient_id)}
                >
                  <strong>{patient.patient_name}</strong>
                  <span>{patient.patient_email}</span>
                  <span>{patient.visit_count} visits</span>
                </button>
              ))}
              {!patients.length && <div className="empty">No patients yet. Completed patient visits will appear here.</div>}
            </div>
          </section>

          <section className="hero-card">
            <div className="hero-head">
              <div>
                <div className="eyebrow">Selected patient</div>
                <h2>{selectedPatient?.patient_name || 'No patient selected'}</h2>
                <p>{selectedPatient ? `${selectedPatient.patient_email} - ${selectedPatient.visit_count} visits` : 'Choose a patient to load timeline and SOAP summaries.'}</p>
              </div>
              <span className="pill">{selectedVisit?.status || 'No visit'}</span>
            </div>
            <div className="stats">
              <div className="stat"><span>Visits</span><strong>{doctorHistory.length}</strong></div>
              <div className="stat"><span>Red flags</span><strong>{sessionSnapshot?.status === 'urgent' ? 1 : 0}</strong></div>
              <div className="stat"><span>Messages</span><strong>{sessionSnapshot?.messages.length || 0}</strong></div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Timeline</div>
                <h2>Visit timeline</h2>
              </div>
            </div>
            <div className="stack compact">
              {doctorHistory.map((visit) => (
                <button
                  key={visit.visit_id}
                  className={`timeline-item ${selectedVisit?.visit_id === visit.visit_id ? 'active' : ''}`}
                  onClick={() => setSelectedVisit(visit)}
                >
                  <strong>{visit.doctor_name}</strong>
                  <span>{visit.status} - {formatDate(visit.created_at)}</span>
                </button>
              ))}
              {!doctorHistory.length && <div className="empty">No visit history for this patient.</div>}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Urgent red flags</div>
                <h2>Triage state</h2>
              </div>
            </div>
            <div className={`alert-card ${sessionSnapshot?.status === 'urgent' ? 'urgent' : ''}`}>
              <strong>{sessionSnapshot?.status || 'No session loaded'}</strong>
              <span>{sessionSnapshot?.status === 'urgent' ? 'Immediate medical evaluation recommended.' : 'No urgent state returned for this visit.'}</span>
            </div>
          </section>

          <section className="panel wide">
            <div className="panel-head">
              <div>
                <div className="eyebrow">SOAP</div>
                <h2>Summary for selected visit</h2>
              </div>
            </div>
            <pre className="code-block">{formatSummary(doctorSummary)}</pre>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Follow-up</div>
                <h2>Schedule reminder</h2>
              </div>
            </div>
            <div className="stack compact">
              <input type="datetime-local" value={doctorReminderTime} onChange={(event) => setDoctorReminderTime(event.target.value)} />
              <textarea rows={3} value={doctorReminderMessage} onChange={(event) => setDoctorReminderMessage(event.target.value)} />
              <button className="primary" onClick={() => void scheduleFollowUp()} disabled={!selectedPatientId}>Schedule follow-up</button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Prescription</div>
                <h2>Write prescription</h2>
              </div>
            </div>
            <div className="stack compact">
              <textarea rows={3} value={prescriptionNotes} onChange={(event) => setPrescriptionNotes(event.target.value)} />
              <button className="secondary" onClick={() => void createPrescription()} disabled={!selectedVisit}>Create prescription</button>
              <input value={prescriptionId} onChange={(event) => setPrescriptionId(event.target.value)} placeholder="Prescription ID after creation" />
              <input value={medicationName} onChange={(event) => setMedicationName(event.target.value)} placeholder="Medicine" />
              <input value={dosage} onChange={(event) => setDosage(event.target.value)} placeholder="Dosage" />
              <input value={frequency} onChange={(event) => setFrequency(event.target.value)} placeholder="Frequency" />
              <input value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="Duration" />
              <button className="primary" onClick={() => void addMedication()} disabled={!prescriptionId}>Add medication</button>
            </div>
          </section>

          <section className="panel wide">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Profile</div>
                <h2>Doctor profile</h2>
              </div>
            </div>
            <div className="record-card">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
              <span>{user.phone || 'No phone number added'}</span>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
