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

  return (
    <div className="min-h-screen bg-[#F8F9F5] text-[#142A1F] flex flex-row font-sans selection:bg-[#2D5A43] selection:text-white">
      {/* 1. Left Patient Sidebar */}
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

      {/* 2. Main Content Flow */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top App Bar */}
        <PatientTopbar
          user={user}
          notifications={notifications}
          onOpenNotifications={() => setShowNotifications(true)}
          onOpenMedicineBox={() => setShowMedicineBox(true)}
          onSignOut={onSignOut}
        />

        {/* Scrollable Dashboard Body */}
        <main className="p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Hero Greeting & Metric KPI Cards */}
          <PatientHeroBanner
            user={user}
            visits={visits}
            prescriptions={prescriptions}
            reportCount={reports.length}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />

          {/* AI Intake Consultation Trigger Card */}
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

          {/* 2-Column Responsive Layout for Main Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column (5 Cols) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Follow-ups & Reminders */}
              <PatientRemindersList
                reminders={reminders}
                onCreateReminder={onCreateReminder}
              />

              {/* Visit Timeline & SOAP Notes */}
              <PatientVisitTimeline
                visits={visits}
              />
            </div>

            {/* Right Column (7 Cols) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Active Prescriptions */}
              <PatientPrescriptionsList
                prescriptions={prescriptions}
              />

              {/* Lab Reports & Extraction */}
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

              {/* Health Metrics Recharts Graph */}
              <PatientHealthChart />
            </div>

          </div>
        </main>
      </div>

      {/* Slide-over Drawers (Medicine Info, Notifications, Emergency QR) */}
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
