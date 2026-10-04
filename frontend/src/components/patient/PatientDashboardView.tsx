import React, { useState } from 'react';

import {
  AuthUser,
  PatientProfile,
  DoctorDirectoryItem,
  Prescription,
  DoctorVisit,
  Notification,
  Reminder,
  AISummary,
  EmergencyHospital
} from '../../api';
import PatientSidebar from './PatientSidebar';
import PatientTopbar from './PatientTopbar';
import PatientHeroBanner from './PatientHeroBanner';
import PatientIntakeCard from './PatientIntakeCard';
import PatientRemindersList from './PatientRemindersList';
import PatientPrescriptionsList from './PatientPrescriptionsList';
import PatientLabReports from './PatientLabReports';
import PatientVisitTimeline from './PatientVisitTimeline';
import PatientHealthChart from './PatientHealthChart';
import PatientDrawers from './PatientDrawers';
import { Calendar, Pill, Upload, Clock, Zap, LayoutGrid, FileText, Activity, MessageSquare, Bell } from 'lucide-react';

interface MedicineInfo {
  name: string;
  generic?: string;
  purpose: string;
  sideEffects: string;
  usage: string;
  category: string;
  warnings?: string;
}

interface PatientDashboardViewProps {
  user: AuthUser;
  patientProfile: PatientProfile | null;
  doctors: DoctorDirectoryItem[];
  selectedDoctorId: string;
  setSelectedDoctorId: (id: string) => void;
  visits: DoctorVisit[];
  reports: Array<{ id: string; file_url: string; parsed_data?: string | null; analysis_status?: string }>;
  prescriptions: Prescription[];
  notifications: Notification[];
  reminders: Reminder[];
  reportFile: File | null;
  setReportFile: (file: File | null) => void;
  reportStatus: string;
  analyzingId: string | null;
  intakeOpen: boolean;
  setIntakeOpen: (open: boolean) => void;
  intakeText: string;
  setIntakeText: (text: string) => void;
  intakeMessages: Array<{ role: 'assistant' | 'user'; text: string }>;
  isRecording: boolean;
  isTranscribing: boolean;
  isSendingIntake: boolean;
  intakeStatus: string;
  intakeAdvisory: string;
  emergencyMessage: string;
  emergencyHospitals: EmergencyHospital[];
  lastSummary: AISummary | null;
  medicineDb: MedicineInfo[];
  showMedicineBox: boolean;
  setShowMedicineBox: (show: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  showQR: boolean;
  setShowQR: (show: boolean) => void;
  publicProfileUrl?: string;
  onSignOut: () => void;
  onStartIntake: () => Promise<void>;
  onSendIntakeMessage: () => Promise<void>;
  onToggleRecording: () => void;
  onFinishIntake: () => Promise<void>;
  onUploadReport: () => Promise<void>;
  onAnalyzeReport: (id: string) => Promise<void>;
  onOpenReport: (url: string) => void;
  onDownloadReport: (url: string) => void;
  onDeleteReport: (id: string) => Promise<void>;
  onMarkNotificationRead: (n: Notification) => void;
  onCreateReminder?: (msg: string, days: number) => void;
}

const SAP = '#142E1F';
const BORDER = '#E8E7E0';
const STONE500 = '#78716C';
const STONE800 = '#292524';

export const PatientDashboardView: React.FC<PatientDashboardViewProps> = ({
  user,
  patientProfile,
  doctors,
  selectedDoctorId,
  setSelectedDoctorId,
  visits,
  reports,
  prescriptions,
  notifications,
  reminders,
  reportFile,
  setReportFile,
  reportStatus,
  analyzingId,
  intakeOpen,
  setIntakeOpen,
  intakeText,
  setIntakeText,
  intakeMessages,
  isRecording,
  isTranscribing,
  isSendingIntake,
  intakeStatus,
  intakeAdvisory,
  emergencyMessage,
  emergencyHospitals,
  lastSummary,
  medicineDb,
  showMedicineBox,
  setShowMedicineBox,
  showNotifications,
  setShowNotifications,
  showQR,
  setShowQR,
  publicProfileUrl,
  onSignOut,
  onStartIntake,
  onSendIntakeMessage,
  onToggleRecording,
  onFinishIntake,
  onUploadReport,
  onAnalyzeReport,
  onOpenReport,
  onDownloadReport,
  onDeleteReport,
  onMarkNotificationRead,
  onCreateReminder,
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // â”€â”€ Tab page renderer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderTabContent = () => {
    switch (activeTab) {

      case 'appointments':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: '#ebf3ec', color: '#2c5b3b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>Visit History</h2>
                <p style={{ fontSize: '0.78rem', color: STONE500, margin: 0 }}>Your full consultation timeline</p>
              </div>
            </div>
            <PatientVisitTimeline visits={visits} />
          </div>
        );

      case 'prescriptions':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: '#ebf3ec', color: '#2c5b3b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pill size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>Prescriptions</h2>
                <p style={{ fontSize: '0.78rem', color: STONE500, margin: 0 }}>All your active prescriptions</p>
              </div>
            </div>
            <PatientPrescriptionsList prescriptions={prescriptions} />
          </div>
        );

      case 'reports':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: '#ebf3ec', color: '#2c5b3b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>Lab Reports</h2>
                <p style={{ fontSize: '0.78rem', color: STONE500, margin: 0 }}>Upload and analyze your lab results</p>
              </div>
            </div>
            <PatientLabReports
              reports={reports}
              reportFile={reportFile}
              setReportFile={setReportFile}
              reportStatus={reportStatus}
              analyzingId={analyzingId}
              onUploadReport={onUploadReport}
              onAnalyzeReport={onAnalyzeReport}
              onOpenReport={onOpenReport}
              onDownloadReport={onDownloadReport}
              onDeleteReport={onDeleteReport}
            />
          </div>
        );

      case 'medications':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: '#ebf3ec', color: '#2c5b3b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pill size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>Medications</h2>
                <p style={{ fontSize: '0.78rem', color: STONE500, margin: 0 }}>Search your drug reference library</p>
              </div>
            </div>
            <div
              style={{
                background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8E7E0',
                padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '1rem',
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#eaf2eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pill size={26} color="#2c5b3b" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: SAP, margin: '0 0 0.35rem' }}>Drug Reference Library</h3>
                <p style={{ fontSize: '0.82rem', color: STONE500, margin: 0, maxWidth: 320 }}>Search for medications, side effects, usage and warnings using the Medicine Info tool.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMedicineBox(true)}
                style={{
                  padding: '0.6rem 1.5rem', borderRadius: 10, background: SAP,
                  color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Open Medicine Info
              </button>
            </div>
          </div>
        );

      case 'reminders':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: '#ebf3ec', color: '#2c5b3b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>Reminders</h2>
                <p style={{ fontSize: '0.78rem', color: STONE500, margin: 0 }}>Your upcoming appointments and medication reminders</p>
              </div>
            </div>
            <PatientRemindersList reminders={reminders} onCreateReminder={onCreateReminder} />
          </div>
        );

      case 'metrics':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: '#ebf3ec', color: '#2c5b3b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>Health Metrics</h2>
                <p style={{ fontSize: '0.78rem', color: STONE500, margin: 0 }}>Track your vital signs and health trends</p>
              </div>
            </div>
            <PatientHealthChart />
          </div>
        );

      case 'messages':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: '#ebf3ec', color: '#2c5b3b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: SAP, margin: 0 }}>Notifications</h2>
                <p style={{ fontSize: '0.78rem', color: STONE500, margin: 0 }}>Clinical updates and messages</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {notifications.length > 0 ? notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onMarkNotificationRead(n)}
                  style={{
                    padding: '1rem 1.15rem', borderRadius: 14,
                    border: n.is_read ? '1px solid #E8E7E0' : '1px solid #C4D9C8',
                    background: n.is_read ? '#FFFFFF' : '#F4F9F5',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.35rem',
                    opacity: n.is_read ? 0.75 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block', flexShrink: 0 }} />}
                    <span style={{ fontWeight: 600, fontSize: '0.84rem', color: SAP }}>{n.type || 'Clinical Update'}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: STONE500 }}>Just now</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: STONE500, margin: 0, lineHeight: 1.5 }}>{n.message}</p>
                </div>
              )) : (
                <div style={{
                  background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8E7E0',
                  padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '0.75rem',
                }}>
                  <Bell size={28} color="#c5c1b2" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: SAP, margin: 0 }}>No new notifications</h3>
                  <p style={{ fontSize: '0.8rem', color: STONE500, margin: 0 }}>You're all caught up.</p>
                </div>
              )}
            </div>
          </div>
        );

      // â”€â”€ Default: Full Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      default:
        return (
          <>
            <PatientHeroBanner
              user={user}
              visits={visits}
              prescriptions={prescriptions}
              reportCount={reports.length}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
            <PatientIntakeCard
              doctors={doctors}
              selectedDoctorId={selectedDoctorId}
              setSelectedDoctorId={setSelectedDoctorId}
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
              onStartIntake={onStartIntake}
              onSendIntakeMessage={onSendIntakeMessage}
              onToggleRecording={onToggleRecording}
              onFinishIntake={onFinishIntake}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', alignItems: 'stretch' }}>
              <PatientRemindersList reminders={reminders} onCreateReminder={onCreateReminder} />
              <PatientPrescriptionsList prescriptions={prescriptions} />
              <PatientHealthChart />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              <PatientLabReports
                reports={reports}
                reportFile={reportFile}
                setReportFile={setReportFile}
                reportStatus={reportStatus}
                analyzingId={analyzingId}
                onUploadReport={onUploadReport}
                onAnalyzeReport={onAnalyzeReport}
                onOpenReport={onOpenReport}
                onDownloadReport={onDownloadReport}
                onDeleteReport={onDeleteReport}
              />

              {/* Quick Actions Tile */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  border: `1px solid ${BORDER}`,
                  padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Zap size={16} color="#f59e0b" />
                    <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: STONE800, margin: 0 }}>Quick Actions</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => { if (doctors.length > 0 && !selectedDoctorId) setSelectedDoctorId(doctors[0].id); onStartIntake(); }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.85rem', borderRadius: 12, backgroundColor: '#eaf2eb', border: '1px solid #d6e5d8', cursor: 'pointer', textAlign: 'center', transition: 'background 0.15s', minHeight: 90 }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#deecdf')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#eaf2eb')}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, color: '#254b34', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}><Calendar size={18} /></div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e3e2a', lineHeight: 1.2 }}>Book a Visit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMedicineBox(true)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.85rem', borderRadius: 12, backgroundColor: '#faf9f5', border: '1px solid #ebe7dc', cursor: 'pointer', textAlign: 'center', transition: 'background 0.15s', minHeight: 90 }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f1efe6')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#faf9f5')}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, color: STONE500, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}><Pill size={18} /></div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: STONE800, lineHeight: 1.2 }}>Refill Medicine</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { const fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.pdf,image/*'; fi.onchange = (e: any) => { if (e.target.files?.[0]) setReportFile(e.target.files[0]); }; fi.click(); }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.85rem', borderRadius: 12, backgroundColor: '#faf9f5', border: '1px solid #ebe7dc', cursor: 'pointer', textAlign: 'center', transition: 'background 0.15s', minHeight: 90 }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f1efe6')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#faf9f5')}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, color: STONE500, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}><Upload size={18} /></div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: STONE800, lineHeight: 1.2 }}>Upload Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreateReminder?.('Daily medication reminder', 1)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.85rem', borderRadius: 12, backgroundColor: '#faf9f5', border: '1px solid #ebe7dc', cursor: 'pointer', textAlign: 'center', transition: 'background 0.15s', minHeight: 90 }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f1efe6')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#faf9f5')}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, color: STONE500, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}><Clock size={18} /></div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: STONE800, lineHeight: 1.2 }}>Set Reminder</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  // â”€â”€ JSX Shell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="pt-v2 pt-v2-bg">
      {/* 1. Left Patient Sidebar */}
      <div className="pt-v2-sidebar">
        <PatientSidebar
          user={user}
          patientProfile={patientProfile}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenQR={() => setShowQR(true)}
          onOpenMedicineBox={() => setShowMedicineBox(true)}
          onOpenIntake={() => setIntakeOpen(true)}
          unreadCount={unreadCount}
        />
      </div>

      {/* 2. Main Content Flow */}
      <div className="pt-v2-main">
        <PatientTopbar
          user={user}
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          onOpenMedicineBox={() => setShowMedicineBox(true)}
          onSignOut={onSignOut}
          onMarkNotificationRead={onMarkNotificationRead}
        />
        <main style={{ padding: '1.5rem 1.75rem 3rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 1280, width: '100%', margin: '0 auto' }}>
          {renderTabContent()}
        </main>
      </div>

      {/* Slide-over Drawers */}
      <PatientDrawers
        showMedicineBox={showMedicineBox}
        setShowMedicineBox={setShowMedicineBox}
        medicineDb={medicineDb}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        notifications={notifications}
        onMarkNotificationRead={onMarkNotificationRead}
        showQR={showQR}
        setShowQR={setShowQR}
        patientProfile={patientProfile}
        publicProfileUrl={publicProfileUrl}
      />
    </div>
  );
};

export default PatientDashboardView;
