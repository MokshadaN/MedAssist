import { FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import { AuthScreen, AuthMode } from './components/AuthScreen';
import PatientDashboardView from './components/patient/PatientDashboardView';
import DoctorDashboardView from './components/doctor/DoctorDashboardView';
import AdminDashboardView from './components/admin/AdminDashboardView';
import PublicProfileView from './components/public/PublicProfileView';
import { MEDICINE_DB, MedicineInfo } from './data/medicineDatabase';
import {
  settledFailureMessage,
  formatDate,
  formatSummary,
  formatReportAnalysis,
  reminderLabel,
  isUrgent,
} from './utils/formatters';
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
  PublicProfile,
  getShareableOrigin,
} from './api';
import { FrequencyOption } from './components/doctor/DoctorPrescriptionStudio';

type ChatMessage = { role: 'assistant' | 'user'; text: string };

function App() {
  const isPublicRoute = window.location.pathname.startsWith('/public-profile/');
  const routeProfileId = isPublicRoute ? window.location.pathname.split('/').pop() : null;
  const routeProfileToken = new URLSearchParams(window.location.search).get('token');

  const [authToken, setAuthToken] = useState(() => localStorage.getItem('medassist_token') || '');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

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

  // Patient states
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

  // Intake / Chat / Voice states
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [intakeText, setIntakeText] = useState('');
  const [intakeMessages, setIntakeMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
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
  const [intakeAdvisory, setIntakeAdvisory] = useState('');
  const [, setIntakeTriageLevel] = useState<'emergency' | 'urgent_care' | 'routine' | 'abstain' | null>(null);
  const [isSendingIntake, setIsSendingIntake] = useState(false);

  // Doctor states
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
  const [currentPrescriptionItems, setCurrentPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [doctorReminderTime, setDoctorReminderTime] = useState(() => {
    const value = new Date();
    value.setDate(value.getDate() + 2);
    return value.toISOString().slice(0, 16);
  });
  const [doctorReminderMessage, setDoctorReminderMessage] = useState('Doctor visit in 2 days');

  // License Verification State
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

    const str = (key: string) => { const v = String(data.get(key) || '').trim(); return v || undefined; };
    const num = (key: string) => { const v = Number(data.get(key) || 0); return v || undefined; };

    try {
      if (authMode === 'register-doctor') {
        await api.registerDoctor({
          name: String(data.get('name') || ''),
          email: String(data.get('email') || ''),
          password: String(data.get('password') || ''),
          phone: str('phone'),
          specialization: String(data.get('specialization') || ''),
          license_number: String(data.get('license_number') || ''),
          experience_years: Number(data.get('experience_years') || 0),
          hospital_affiliation: str('hospital_affiliation'),
        });
      } else {
        await api.registerPatient({
          name: String(data.get('name') || ''),
          email: String(data.get('email') || ''),
          password: String(data.get('password') || ''),
          phone: str('phone'),
          age: num('age'),
          gender: str('gender'),
          allergies: str('allergies'),
          chronic_conditions: str('chronic_conditions'),
          address: str('address'),
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

  const uploadDoctorReport = async (file: File) => {
    if (!authToken || !selectedPatientId) return;
    setBusy('Uploading report');
    try {
      const uploaded = await api.uploadReport(selectedPatientId, file, authToken);
      setDoctorReports(await api.listPatientReports(selectedPatientId, authToken));
      setReportStatus(`Report uploaded: ${uploaded.file_url.split('/').pop()}`);
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
    return `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/${fileUrl}`;
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

  if (user.role === 'admin') {
    return (
      <AdminDashboardView
        user={user}
        authToken={authToken}
        onSignOut={signOut}
      />
    );
  }

  if (user.role === 'patient') {
    const publicProfileUrl = patientProfile?.emergency_access_token
      ? `${getShareableOrigin()}/public-profile/${patientProfile.id}?token=${encodeURIComponent(patientProfile.emergency_access_token)}`
      : undefined;

    return (
      <PatientDashboardView
        user={user}
        patientProfile={patientProfile}
        doctors={doctors}
        selectedDoctorId={selectedDoctorId}
        setSelectedDoctorId={setSelectedDoctorId}
        visits={patientVisits}
        reports={patientReports}
        prescriptions={patientPrescriptions}
        notifications={notifications}
        reminders={patientReminders}
        reportFile={reportFile}
        setReportFile={setReportFile}
        reportStatus={reportStatus}
        analyzingId={analyzingId}
        intakeOpen={intakeOpen}
        setIntakeOpen={setIntakeOpen}
        intakeText={intakeText}
        setIntakeText={setIntakeText}
        intakeMessages={intakeMessages}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        isSendingIntake={isSendingIntake}
        intakeStatus={intakeStatus}
        intakeAdvisory={intakeAdvisory}
        emergencyMessage={emergencyMessage}
        emergencyHospitals={emergencyHospitals}
        lastSummary={lastSummary}
        medicineDb={MEDICINE_DB}
        showMedicineBox={showMedicineBox}
        setShowMedicineBox={setShowMedicineBox}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        showQR={showQR}
        setShowQR={setShowQR}
        publicProfileUrl={publicProfileUrl}
        onSignOut={signOut}
        onStartIntake={startPatientVisit}
        onSendIntakeMessage={sendIntakeAnswer}
        onToggleRecording={toggleRecording}
        onFinishIntake={async () => {
          setIntakeOpen(false);
          setActiveSessionId('');
          await refreshPatientData();
        }}
        onUploadReport={uploadPatientReport}
        onAnalyzeReport={analyzeReport}
        onOpenReport={openReport}
        onDownloadReport={downloadReport}
        onDeleteReport={deleteReport}
        onMarkNotificationRead={markNotificationRead}
      />
    );
  }

  return (
    <DoctorDashboardView
      user={user}
      doctorProfile={doctorProfile}
      authToken={authToken}
      onSignOut={signOut}
      patientCount={patients.length}
      profileForm={profileForm}
      setProfileForm={setProfileForm}
      saveProfile={saveProfile}
      profileStatus={profileStatus}
      verifyStateCouncil={verifyStateCouncil}
      setVerifyStateCouncil={setVerifyStateCouncil}
      verifyLicenseNumber={verifyLicenseNumber}
      setVerifyLicenseNumber={setVerifyLicenseNumber}
      handleVerifyDoctorLicense={handleVerifyDoctorLicense}
      isVerifyingLicense={isVerifyingLicense}
      verificationFeedback={verificationFeedback}
      selectedPatient={selectedPatient}
      selectedPatientId={selectedPatientId}
      setSelectedPatientId={setSelectedPatientId}
      patients={patients}
      selectedVisit={selectedVisit}
      setSelectedVisit={setSelectedVisit}
      doctorHistory={doctorHistory}
      sessionSnapshot={sessionSnapshot}
      doctorReports={doctorReports}
      analyzingId={analyzingId}
      onAnalyzeReport={analyzeReport}
      onOpenReport={openReport}
      onDownloadReport={downloadReport}
      onDeleteReport={deleteReport}
      onUploadReport={uploadDoctorReport}
      doctorSummary={doctorSummary}
      doctorReminderTime={doctorReminderTime}
      setDoctorReminderTime={setDoctorReminderTime}
      doctorReminderMessage={doctorReminderMessage}
      setDoctorReminderMessage={setDoctorReminderMessage}
      scheduleFollowUp={scheduleFollowUp}
      doctorReminderStatus={doctorReminderStatus}
      doctorReminders={doctorReminders}
      prescriptionId={prescriptionId}
      prescriptionNotes={prescriptionNotes}
      setPrescriptionNotes={setPrescriptionNotes}
      createPrescription={createPrescription}
      prescriptionStatus={prescriptionStatus}
      currentPrescriptionItems={currentPrescriptionItems}
      medicationName={medicationName}
      setMedicationName={setMedicationName}
      medicineType={medicineType}
      setMedicineType={setMedicineType}
      dosage={dosage}
      setDosage={setDosage}
      syrupQuantity={syrupQuantity}
      setSyrupQuantity={setSyrupQuantity}
      frequency={frequency}
      setFrequency={setFrequency}
      duration={duration}
      setDuration={setDuration}
      customInstructions={customInstructions}
      setCustomInstructions={setCustomInstructions}
      addMedication={addMedication}
      medicationStatus={medicationStatus}
      notifications={notifications}
      onMarkNotificationRead={markNotificationRead}
      onRefreshNotifications={refreshNotifications}
      busy={busy}
      notificationStatus={notificationStatus}
    />
  );
}

export default App;
