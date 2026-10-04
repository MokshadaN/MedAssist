import React, { FormEvent, useState } from 'react';
import {
  AuthUser,
  DoctorProfile,
  DoctorPatient,
  DoctorVisit,
  SessionState,
  AISummary,
  Reminder,
  PrescriptionItem,
  Notification,
} from '../../api';
import { DoctorSidebar } from './DoctorSidebar';
import { DoctorTopbar } from './DoctorTopbar';
import { DoctorHeroHead } from './DoctorHeroHead';
import { DoctorCurrentPatientCard } from './DoctorCurrentPatientCard';
import { DoctorPatientDirectory } from './DoctorPatientDirectory';
import { DoctorPatientReports } from './DoctorPatientReports';
import { DoctorPrescriptionStudio, FrequencyOption } from './DoctorPrescriptionStudio';
import { DoctorFollowUpScheduler } from './DoctorFollowUpScheduler';
import { DoctorHealthTrendsWidget } from './DoctorHealthTrendsWidget';
import { DoctorSoapSummary } from './DoctorSoapSummary';
import { DoctorTriageCard } from './DoctorTriageCard';
import { DoctorVisitTimeline } from './DoctorVisitTimeline';
import {
  LayoutGrid,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  Pill,
  BarChart2,
  Bell,
  RefreshCw,
  CheckCircle2,
  Clock,
  Activity,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export interface DoctorDashboardViewProps {
  user: AuthUser;
  doctorProfile: DoctorProfile | null;
  authToken: string;
  onSignOut: () => void;
  patientCount: number;
  profileForm: { phone: string; specialization: string };
  setProfileForm: React.Dispatch<React.SetStateAction<any>>;
  saveProfile: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  profileStatus: string;
  verifyStateCouncil: string;
  setVerifyStateCouncil: (val: string) => void;
  verifyLicenseNumber: string;
  setVerifyLicenseNumber: (val: string) => void;
  handleVerifyDoctorLicense: () => Promise<void>;
  isVerifyingLicense: boolean;
  verificationFeedback: { message: string; success: boolean } | null;
  selectedPatient: DoctorPatient | null;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  patients: DoctorPatient[];
  selectedVisit: DoctorVisit | null;
  setSelectedVisit: (visit: DoctorVisit) => void;
  doctorHistory: DoctorVisit[];
  sessionSnapshot: SessionState | null;
  doctorReports: Array<{
    id: string;
    file_url: string;
    parsed_data?: string | null;
    analysis_status?: string;
  }>;
  analyzingId: string | null;
  onAnalyzeReport: (id: string) => Promise<void>;
  onOpenReport: (url: string) => void;
  onDownloadReport: (url: string) => void;
  onDeleteReport: (id: string) => Promise<void>;
  onUploadReport: (file: File) => Promise<void>;
  doctorSummary: AISummary | null;
  doctorReminderTime: string;
  setDoctorReminderTime: (val: string) => void;
  doctorReminderMessage: string;
  setDoctorReminderMessage: (val: string) => void;
  scheduleFollowUp: () => Promise<void>;
  doctorReminderStatus: string;
  doctorReminders: Reminder[];
  prescriptionId: string;
  prescriptionNotes: string;
  setPrescriptionNotes: (val: string) => void;
  createPrescription: () => Promise<void>;
  prescriptionStatus: string;
  currentPrescriptionItems: PrescriptionItem[];
  medicationName: string;
  setMedicationName: (val: string) => void;
  medicineType: 'tablet' | 'syrup';
  setMedicineType: (val: 'tablet' | 'syrup') => void;
  dosage: string;
  setDosage: (val: string) => void;
  syrupQuantity: string;
  setSyrupQuantity: (val: string) => void;
  frequency: FrequencyOption;
  setFrequency: (val: FrequencyOption) => void;
  duration: string;
  setDuration: (val: string) => void;
  customInstructions: string;
  setCustomInstructions: (val: string) => void;
  addMedication: () => Promise<void>;
  medicationStatus: string;
  notifications: Notification[];
  onMarkNotificationRead: (n: Notification) => void;
  onRefreshNotifications: () => Promise<void>;
  busy?: string;
  notificationStatus?: string;
}

const SAP = '#142E1F';
const BORDER = '#E8E7E0';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';
const STONE400 = '#A8A29E';
const STONE500 = '#78716C';
const STONE700 = '#44403C';
const STONE800 = '#292524';

const cardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.86)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: 16,
  border: `1px solid rgba(232, 231, 224, 0.85)`,
  overflow: 'hidden',
  boxShadow: '0 4px 20px -2px rgba(20, 46, 31, 0.05)',
};

export const DoctorDashboardView: React.FC<DoctorDashboardViewProps> = ({
  user,
  doctorProfile,
  authToken,
  onSignOut,
  patientCount,
  profileForm,
  setProfileForm,
  saveProfile,
  profileStatus,
  verifyStateCouncil,
  setVerifyStateCouncil,
  verifyLicenseNumber,
  setVerifyLicenseNumber,
  handleVerifyDoctorLicense,
  isVerifyingLicense,
  verificationFeedback,
  selectedPatient,
  selectedPatientId,
  setSelectedPatientId,
  patients,
  selectedVisit,
  setSelectedVisit,
  doctorHistory,
  sessionSnapshot,
  doctorReports,
  analyzingId,
  onAnalyzeReport,
  onOpenReport,
  onDownloadReport,
  onDeleteReport,
  onUploadReport,
  doctorSummary,
  doctorReminderTime,
  setDoctorReminderTime,
  doctorReminderMessage,
  setDoctorReminderMessage,
  scheduleFollowUp,
  doctorReminderStatus,
  doctorReminders,
  prescriptionId,
  prescriptionNotes,
  setPrescriptionNotes,
  createPrescription,
  prescriptionStatus,
  currentPrescriptionItems,
  medicationName,
  setMedicationName,
  medicineType,
  setMedicineType,
  dosage,
  setDosage,
  syrupQuantity,
  setSyrupQuantity,
  frequency,
  setFrequency,
  duration,
  setDuration,
  customInstructions,
  setCustomInstructions,
  addMedication,
  medicationStatus,
  notifications,
  onMarkNotificationRead,
  onRefreshNotifications,
  busy,
  notificationStatus,
}) => {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // ── Tab Router ──────────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeNav) {
      case 'patients':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} color={SAP} />
                </div>
                <div>
                  <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>
                    Patient Directory & Records
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: STONE500 }}>
                    {patients.length} assigned patient{patients.length === 1 ? '' : 's'} under your clinical care
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.2fr)', gap: '1.25rem' }}>
              {/* Directory Column */}
              <div style={cardStyle}>
                <DoctorPatientDirectory
                  patients={patients}
                  selectedPatientId={selectedPatientId}
                  setSelectedPatientId={setSelectedPatientId}
                  searchFilter={searchQuery}
                />
              </div>

              {/* Patient Profile & Triage Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={cardStyle}>
                  <DoctorCurrentPatientCard
                    selectedPatient={selectedPatient}
                    selectedVisit={selectedVisit}
                    sessionSnapshot={sessionSnapshot}
                  />
                </div>
                <div style={cardStyle}>
                  <DoctorTriageCard sessionSnapshot={sessionSnapshot} />
                </div>
                {doctorSummary && (
                  <div style={cardStyle}>
                    <DoctorSoapSummary doctorSummary={doctorSummary} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'appointments':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={18} color="#92400e" />
              </div>
              <div>
                <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>
                  Visits & Follow-Up Consultations
                </h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: STONE500 }}>
                  Schedule follow-ups and review clinical consultation history
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: '1.25rem' }}>
              <div style={cardStyle}>
                <DoctorFollowUpScheduler
                  doctorReminderTime={doctorReminderTime}
                  setDoctorReminderTime={setDoctorReminderTime}
                  doctorReminderMessage={doctorReminderMessage}
                  setDoctorReminderMessage={setDoctorReminderMessage}
                  scheduleFollowUp={scheduleFollowUp}
                  selectedPatientId={selectedPatientId}
                  doctorReminderStatus={doctorReminderStatus}
                  doctorReminders={doctorReminders}
                />
              </div>
              <div style={cardStyle}>
                <DoctorVisitTimeline
                  doctorHistory={doctorHistory}
                  selectedVisit={selectedVisit}
                  setSelectedVisit={setSelectedVisit}
                  patientName={selectedPatient?.patient_name}
                />
              </div>
            </div>
          </div>
        );

      case 'messages':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={18} color="#1e40af" />
                </div>
                <div>
                  <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>
                    Clinical Alerts & Notifications
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: STONE500 }}>
                    Patient triage updates, system alerts, and reminders
                  </p>
                </div>
              </div>
              {onRefreshNotifications && (
                <button
                  onClick={() => onRefreshNotifications()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.45rem 0.9rem',
                    background: '#FFFFFF',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: STONE700,
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={13} /> Refresh
                </button>
              )}
            </div>

            <div style={{ ...cardStyle, padding: '1.25rem' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: STONE500 }}>
                  <Bell size={32} color={STONE400} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: STONE700 }}>No notifications</p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem' }}>You're all caught up with clinical alerts.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && onMarkNotificationRead(n)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 12,
                        background: n.is_read ? STONE50 : '#f0fdf4',
                        border: `1px solid ${n.is_read ? STONE200 : '#86efac'}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        cursor: n.is_read ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: n.is_read ? 'transparent' : '#16a34a',
                          marginTop: 5,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: STONE800, fontWeight: n.is_read ? 400 : 600, lineHeight: 1.4 }}>
                          {n.message}
                        </p>
                        <span style={{ fontSize: '0.68rem', color: STONE400, marginTop: 4, display: 'inline-block' }}>
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                      {!n.is_read && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: '#16a34a',
                            background: '#dcfce7',
                            padding: '2px 8px',
                            borderRadius: 999,
                            flexShrink: 0,
                          }}
                        >
                          New
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'reports':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color="#6d28d9" />
              </div>
              <div>
                <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>
                  Diagnostic Reports & Lab Results
                </h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: STONE500 }}>
                  Upload patient lab work, run AI diagnostic analysis, and review clinical findings
                </p>
              </div>
            </div>

            <div style={cardStyle}>
              <DoctorPatientReports
                doctorReports={doctorReports}
                analyzingId={analyzingId}
                onAnalyzeReport={onAnalyzeReport}
                onOpenReport={onOpenReport}
                onDownloadReport={onDownloadReport}
                onDeleteReport={onDeleteReport}
                onUploadReport={onUploadReport}
              />
            </div>
          </div>
        );

      case 'medications':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pill size={18} color="#be185d" />
              </div>
              <div>
                <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>
                  Prescription Studio & Medication Formulary
                </h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: STONE500 }}>
                  Create digital prescriptions, configure dosage, frequency, and instructions
                </p>
              </div>
            </div>

            <div style={cardStyle}>
              <DoctorPrescriptionStudio
                selectedVisit={selectedVisit}
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
              />
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={18} color="#0e7490" />
              </div>
              <div>
                <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>
                  Patient Health Trends & Clinical Analytics
                </h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: STONE500 }}>
                  Longitudinal biometric tracking, blood pressure curves, and heart rate telemetry
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(300px, 0.8fr)', gap: '1.25rem' }}>
              <div style={cardStyle}>
                <DoctorHealthTrendsWidget
                  patientId={selectedPatientId}
                  token={authToken}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={cardStyle}>
                  <DoctorCurrentPatientCard
                    selectedPatient={selectedPatient}
                    selectedVisit={selectedVisit}
                    sessionSnapshot={sessionSnapshot}
                  />
                </div>
                <div style={cardStyle}>
                  <DoctorTriageCard sessionSnapshot={sessionSnapshot} />
                </div>
              </div>
            </div>
          </div>
        );

      case 'dashboard':
      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Hero Greeting & Practice KPIs */}
            <DoctorHeroHead
              user={user}
              selectedPatient={selectedPatient}
              selectedVisit={selectedVisit}
              totalVisits={doctorHistory.length}
              totalPatientsCount={patientCount || patients.length}
              sessionSnapshot={sessionSnapshot}
            />

            {/* Main Clinical Grid: 3-column desktop layout */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(280px, 1fr) minmax(340px, 1.3fr) minmax(280px, 1fr)',
                gap: '1.25rem',
                alignItems: 'start',
              }}
            >
              {/* Column 1: Patient Context & Triage */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={cardStyle}>
                  <DoctorCurrentPatientCard
                    selectedPatient={selectedPatient}
                    selectedVisit={selectedVisit}
                    sessionSnapshot={sessionSnapshot}
                    onViewFullProfile={() => setActiveNav('patients')}
                  />
                </div>

                <div style={cardStyle}>
                  <DoctorTriageCard sessionSnapshot={sessionSnapshot} />
                </div>

                <div style={cardStyle}>
                  <DoctorPatientDirectory
                    patients={patients}
                    selectedPatientId={selectedPatientId}
                    setSelectedPatientId={setSelectedPatientId}
                    searchFilter={searchQuery}
                  />
                </div>
              </div>

              {/* Column 2: Clinical Workflows (Prescriptions & AI Summary) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {doctorSummary && (
                  <div style={cardStyle}>
                    <DoctorSoapSummary doctorSummary={doctorSummary} />
                  </div>
                )}

                <div style={cardStyle}>
                  <DoctorPrescriptionStudio
                    selectedVisit={selectedVisit}
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
                  />
                </div>

                <div style={cardStyle}>
                  <DoctorPatientReports
                    doctorReports={doctorReports}
                    analyzingId={analyzingId}
                    onAnalyzeReport={onAnalyzeReport}
                    onOpenReport={onOpenReport}
                    onDownloadReport={onDownloadReport}
                    onDeleteReport={onDeleteReport}
                    onUploadReport={onUploadReport}
                  />
                </div>
              </div>

              {/* Column 3: Biometrics, Timeline, Follow-Ups */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={cardStyle}>
                  <DoctorHealthTrendsWidget
                    patientId={selectedPatientId}
                    token={authToken}
                  />
                </div>

                <div style={cardStyle}>
                  <DoctorFollowUpScheduler
                    doctorReminderTime={doctorReminderTime}
                    setDoctorReminderTime={setDoctorReminderTime}
                    doctorReminderMessage={doctorReminderMessage}
                    setDoctorReminderMessage={setDoctorReminderMessage}
                    scheduleFollowUp={scheduleFollowUp}
                    selectedPatientId={selectedPatientId}
                    doctorReminderStatus={doctorReminderStatus}
                    doctorReminders={doctorReminders}
                  />
                </div>

                <div style={cardStyle}>
                  <DoctorVisitTimeline
                    doctorHistory={doctorHistory}
                    selectedVisit={selectedVisit}
                    setSelectedVisit={setSelectedVisit}
                    patientName={selectedPatient?.patient_name}
                  />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="doc-v2 doc-v2-bg">
      {/* ── Left Sidebar ────────────────────────────────────────────────── */}
      <aside className="doc-v2-sidebar">
        <DoctorSidebar
          user={user}
          doctorProfile={doctorProfile}
          patientCount={patientCount || patients.length}
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
          activeNav={activeNav}
          setActiveNav={setActiveNav}
        />
      </aside>

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      <div className="doc-v2-main">
        {/* Topbar */}
        <header className="doc-v2-topbar">
          <DoctorTopbar
            user={user}
            notifications={notifications}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            onSignOut={onSignOut}
            busy={busy}
            notificationStatus={notificationStatus}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onRefreshNotifications={onRefreshNotifications}
            onMarkNotificationRead={onMarkNotificationRead}
          />
        </header>

        {/* Dynamic Tab Body */}
        <main
          style={{
            padding: '1.5rem 1.75rem 3rem 1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            maxWidth: 1600,
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
};

export default DoctorDashboardView;
