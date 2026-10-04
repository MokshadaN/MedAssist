import React, { useState } from 'react';
import { UserCheck, Search, Filter, ChevronRight } from 'lucide-react';
import { DoctorPatient } from '../../api';

const SAP = '#142E1F';
const SAP_HOVER = '#0E2116';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';
const STONE400 = '#A8A29E';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE800 = '#292524';

interface DoctorPatientDirectoryProps {
  patients: DoctorPatient[];
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  searchFilter?: string;
}

export const DoctorPatientDirectory: React.FC<DoctorPatientDirectoryProps> = ({
  patients,
  selectedPatientId,
  setSelectedPatientId,
  searchFilter = '',
}) => {
  const [internalFilter, setInternalFilter] = useState('');

  const query = (searchFilter || internalFilter).toLowerCase();
  const filteredPatients = patients.filter(
    (p) =>
      p.patient_name.toLowerCase().includes(query) ||
      p.patient_email.toLowerCase().includes(query) ||
      p.patient_id.toLowerCase().includes(query)
  );

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', height: '100%', minHeight: 300 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCheck size={16} color={SAP} />
          <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: SAP, fontSize: '0.95rem' }}>Patient List</span>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={13} color={STONE400} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          placeholder="Search patients..."
          value={internalFilter}
          onChange={e => setInternalFilter(e.target.value)}
          style={{ width: '100%', paddingLeft: 30, paddingRight: 28, paddingTop: 6, paddingBottom: 6, fontSize: '0.75rem', background: STONE50, border: `1px solid ${STONE200}`, borderRadius: 8, color: STONE800, outline: 'none', fontFamily: 'inherit' }}
        />
        <Filter size={12} color={STONE400} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }} />
      </div>

      {/* Patient list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', flex: 1 }}>
        {filteredPatients.length === 0 ? (
          <p style={{ textAlign: 'center', color: STONE400, fontSize: '0.75rem', paddingTop: '1rem' }}>No patients found.</p>
        ) : (
          filteredPatients.map((p) => {
            const isSelected = p.patient_id === selectedPatientId;
            const initial = p.patient_name.charAt(0).toUpperCase();
            const visitText = `${p.visit_count || 1} visit${p.visit_count === 1 ? '' : 's'}`;
            return (
              <div
                key={p.patient_id}
                onClick={() => setSelectedPatientId(p.patient_id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '0.6rem', padding: '0.45rem 0.6rem', borderRadius: 10, cursor: 'pointer',
                  background: isSelected ? SAP : STONE50,
                  border: `1px solid ${isSelected ? SAP : STONE200}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.15)' : STONE100, color: isSelected ? '#fff' : STONE600, fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: '"Playfair Display", serif' }}>
                    {initial}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem', color: isSelected ? '#fff' : STONE800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.patient_name}</div>
                    <div style={{ fontSize: '0.62rem', color: isSelected ? 'rgba(255,255,255,0.7)' : STONE500 }}>{visitText}</div>
                  </div>
                </div>
                <ChevronRight size={13} color={isSelected ? 'rgba(255,255,255,0.6)' : STONE400} style={{ flexShrink: 0 }} />
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <button
        type="button"
        style={{ width: '100%', padding: '0.45rem', background: 'none', border: `1px solid ${STONE200}`, borderRadius: 9, fontSize: '0.72rem', fontWeight: 600, color: SAP, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
      >
        View all patients →
      </button>
    </div>
  );
};

export default DoctorPatientDirectory;
