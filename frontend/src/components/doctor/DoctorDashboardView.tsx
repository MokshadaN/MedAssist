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
import HealthMetricsChart from '../HealthMetricsChart';
import DoctorSidebar from './DoctorSidebar';
import DoctorTopbar from './DoctorTopbar';
import DoctorHeroHead from './DoctorHeroHead';
import DoctorPatientDirectory from './DoctorPatientDirectory';
import DoctorVisitTimeline from './DoctorVisitTimeline';
import DoctorPatientReports from './DoctorPatientReports';
import DoctorSoapSummary from './DoctorSoapSummary';
import DoctorFollowUpScheduler from './DoctorFollowUpScheduler';
import DoctorTriageCard from './DoctorTriageCard';
import DoctorPrescriptionStudio, { FrequencyOption } from './DoctorPrescriptionStudio';

interface DoctorDashboardViewProps {
  user: AuthUser;
  doctorProfile: DoctorProfile | null;
  authToken: string;
  onSignOut: () => void;
  // Sidebar Props
  patientCount: number;
  profileForm: {
    phone: string;
    specialization: string;
  };
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

  // Case & Directory Props
  selectedPatient: DoctorPatient | null;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  patients: DoctorPatient[];
  selectedVisit: DoctorVisit | null;
  setSelectedVisit: (visit: DoctorVisit) => void;
  doctorHistory: DoctorVisit[];
  sessionSnapshot: SessionState | null;

  // Reports
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

  // SOAP
  doctorSummary: AISummary | null;

  // Reminders / Follow-up
  doctorReminderTime: string;
  setDoctorReminderTime: (val: string) => void;
  doctorReminderMessage: string;
  setDoctorReminderMessage: (val: string) => void;
  scheduleFollowUp: () => Promise<void>;
  doctorReminderStatus: string;
  doctorReminders: Reminder[];

  // Prescriptions
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

  // Notifications
  notifications: Notification[];
  onMarkNotificationRead: (notification: Notification) => void;
  onRefreshNotifications: () => Promise<void>;
  busy?: string;
  notificationStatus?: string;
}

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
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="app-shell">
      <div className="main-content" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        <DoctorTopbar
          user={user}
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          onSignOut={onSignOut}
          busy={busy}
          notificationStatus={notificationStatus}
        />

        {busy && <div className="flash subtle" style={{ marginTop: '0.75rem' }}>{busy}...</div>}
        {notificationStatus && <div className="flash subtle" style={{ marginTop: '0.75rem' }}>{notificationStatus}</div>}

        {showNotifications && (
          <section className="panel notification-panel" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <div className="panel-head">
              <div>
                <div className="eyebrow">Inbox</div>
                <h2>Notifications</h2>
              </div>
              <button className="ghost" onClick={() => void onRefreshNotifications()}>Refresh</button>
            </div>
            <div className="stack compact">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`notification ${notification.is_read ? 'read' : ''}`}
                  onClick={() => void onMarkNotificationRead(notification)}
                >
                  <strong>{notification.type || 'Update'}</strong>
                  <span>{notification.message}</span>
                </button>
              ))}
              {!notifications.length && <div className="empty">No notifications yet.</div>}
            </div>
          </section>
        )}

        <main className="dashboard-layout" style={{ marginTop: '1rem' }}>
          {/* LEFT SIDEBAR: Doctor Profile & License Verification */}
          <DoctorSidebar
            user={user}
            doctorProfile={doctorProfile}
            patientCount={patientCount}
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
          />

          {/* MAIN CONTENT AREA */}
          <div className="dashboard-content stack">
            <DoctorHeroHead
              selectedPatient={selectedPatient}
              selectedVisit={selectedVisit}
              totalVisits={doctorHistory.length}
              sessionSnapshot={sessionSnapshot}
            />

            <div className="grid grid-2">
              <DoctorPatientDirectory
                patients={patients}
                selectedPatientId={selectedPatientId}
                setSelectedPatientId={setSelectedPatientId}
              />
              <DoctorVisitTimeline
                doctorHistory={doctorHistory}
                selectedVisit={selectedVisit}
                setSelectedVisit={setSelectedVisit}
              />
            </div>

            {selectedPatientId && (
              <HealthMetricsChart
                patientId={selectedPatientId}
                token={authToken}
                key={selectedPatientId}
                refreshTrigger={doctorReports}
              />
            )}

            <DoctorPatientReports
              doctorReports={doctorReports}
              analyzingId={analyzingId}
              onAnalyzeReport={onAnalyzeReport}
              onOpenReport={onOpenReport}
              onDownloadReport={onDownloadReport}
              onDeleteReport={onDeleteReport}
            />

            <DoctorSoapSummary doctorSummary={doctorSummary} />

            <div className="grid grid-2">
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
              <DoctorTriageCard sessionSnapshot={sessionSnapshot} />
            </div>

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
        </main>
      </div>
    </div>
  );
};

export default DoctorDashboardView;
