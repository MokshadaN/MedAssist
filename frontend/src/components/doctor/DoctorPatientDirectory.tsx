import React from 'react';
import { DoctorPatient } from '../../api';

interface DoctorPatientDirectoryProps {
  patients: DoctorPatient[];
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
}

export const DoctorPatientDirectory: React.FC<DoctorPatientDirectoryProps> = ({
  patients,
  selectedPatientId,
  setSelectedPatientId,
}) => {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Directory</div>
          <h2>Patient List</h2>
        </div>
      </div>
      <div className="table-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {patients.map((patient) => (
          <button
            key={patient.patient_id}
            className={`list-row ${selectedPatientId === patient.patient_id ? 'active' : ''}`}
            onClick={() => setSelectedPatientId(patient.patient_id)}
          >
            <strong>{patient.patient_name}</strong>
            <span style={{ fontSize: '0.8rem' }}>{patient.patient_email}</span>
            <span className="pill" style={{ fontSize: '0.7rem' }}>{patient.visit_count} visits</span>
          </button>
        ))}
        {!patients.length && <div className="empty">No patients found.</div>}
      </div>
    </section>
  );
};

export default DoctorPatientDirectory;
