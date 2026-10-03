import React from 'react';
import { DoctorPatient, DoctorVisit, SessionState } from '../../api';

interface DoctorHeroHeadProps {
  selectedPatient: DoctorPatient | null;
  selectedVisit: DoctorVisit | null;
  totalVisits: number;
  sessionSnapshot: SessionState | null;
}

export const DoctorHeroHead: React.FC<DoctorHeroHeadProps> = ({
  selectedPatient,
  selectedVisit,
  totalVisits,
  sessionSnapshot,
}) => {
  return (
    <section className="hero-card">
      <div className="hero-head">
        <div>
          <div className="eyebrow">Current Case</div>
          <h2>{selectedPatient?.patient_name || 'No patient selected'}</h2>
          <p>
            {selectedPatient
              ? `${selectedPatient.patient_email} - ${selectedPatient.visit_count} visits`
              : 'Select a patient to view history and generate SOAP summaries.'}
          </p>
        </div>
        <span className="pill">{selectedVisit?.status || 'Select Visit'}</span>
      </div>
      <div className="stats" style={{ marginTop: '1.5rem' }}>
        <div className="stat">
          <span>Total Visits</span>
          <strong>{totalVisits}</strong>
        </div>
        <div className="stat">
          <span>Session Status</span>
          <strong>{sessionSnapshot?.status || 'N/A'}</strong>
        </div>
        <div className="stat">
          <span>Messages</span>
          <strong>{sessionSnapshot?.messages.length || 0}</strong>
        </div>
      </div>
    </section>
  );
};

export default DoctorHeroHead;
