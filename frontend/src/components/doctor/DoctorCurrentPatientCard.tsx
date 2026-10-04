import React from 'react';
import { Activity, MoreVertical, Calendar, ShieldAlert, Clock, ArrowRight, User } from 'lucide-react';
import { DoctorPatient, DoctorVisit, SessionState } from '../../api';

const SAP = '#142E1F';
const SAP_HOVER = '#0E2116';
const BORDER = '#E8E7E0';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE400 = '#A8A29E';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE800 = '#292524';

interface DoctorCurrentPatientCardProps {
  selectedPatient: DoctorPatient | null;
  selectedVisit: DoctorVisit | null;
  sessionSnapshot: SessionState | null;
  onViewFullProfile?: () => void;
}

export const DoctorCurrentPatientCard: React.FC<DoctorCurrentPatientCardProps> = ({
  selectedPatient,
  selectedVisit,
  sessionSnapshot,
  onViewFullProfile,
}) => {
  if (!selectedPatient) {
    return (
      <div style={{ padding: '1.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: STONE100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: STONE400 }}>
          <User size={22} />
        </div>
        <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: SAP, fontSize: '0.95rem' }}>No Patient Selected</div>
        <p style={{ fontSize: '0.72rem', color: STONE500, margin: 0, maxWidth: 180, lineHeight: 1.4 }}>Select a patient from the directory to start clinical review.</p>
      </div>
    );
  }

  const initial = selectedPatient.patient_name?.charAt(0)?.toUpperCase() ?? 'P';
  const visitStatus = selectedVisit?.status || (sessionSnapshot?.status === 'urgent' ? 'Urgent' : 'In Progress');
  const patientIdDisplay = `PT-${selectedPatient.patient_id.slice(-4).toUpperCase()}`;
  const lastVisitDate = selectedVisit?.created_at ? new Date(selectedVisit.created_at).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <div style={{ padding: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: `1px solid ${STONE100}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={16} color={SAP} />
          <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: SAP, fontSize: '0.95rem' }}>Current Patient</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
            {visitStatus}
          </span>
          <MoreVertical size={15} color={STONE400} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      {/* Patient info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.85rem 0' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: STONE100, color: STONE600, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {initial}
        </div>
        <div>
          <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: SAP, fontSize: '0.95rem', lineHeight: 1.1 }}>{selectedPatient.patient_name}</div>
          <div style={{ fontSize: '0.72rem', color: STONE500, marginTop: 2 }}>{selectedPatient.patient_email}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, background: STONE50, borderRadius: 10, border: `1px solid ${STONE100}`, marginBottom: '0.85rem', textAlign: 'center' }}>
        {[['Age', '32'], ['Gender', 'Male'], ['ID', patientIdDisplay]].map(([label, val], i) => (
          <div key={i} style={{ padding: '0.5rem 0.25rem', borderRight: i < 2 ? `1px solid ${STONE200}` : undefined }}>
            <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: STONE400 }}>{label}</div>
            <div style={{ fontWeight: 700, color: SAP, fontSize: '0.8rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Detail rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.85rem' }}>
        {[
          [<Calendar size={13} color={STONE400} />, `${selectedPatient.visit_count || 1} visit${selectedPatient.visit_count === 1 ? '' : 's'}`],
          [<ShieldAlert size={13} color="#22c55e" />, 'No known allergies'],
          [<Clock size={13} color={STONE400} />, `Last visit: ${lastVisitDate}`],
        ].map(([icon, text], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: STONE600 }}>
            {icon as React.ReactNode}
            <span>{text as string}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onViewFullProfile}
        style={{ width: '100%', padding: '0.6rem', background: SAP, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'background 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.background = SAP_HOVER)}
        onMouseLeave={e => (e.currentTarget.style.background = SAP)}
      >
        View Full Profile <ArrowRight size={13} />
      </button>
    </div>
  );
};

const STONE200 = '#E7E5E4';

export default DoctorCurrentPatientCard;
