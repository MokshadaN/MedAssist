import React from 'react';
import { AlertCircle, MoreVertical, Plus, Info, CheckCircle2 } from 'lucide-react';
import { SessionState } from '../../api';

const SAP = '#142E1F';
const STONE100 = '#F5F5F4';
const STONE400 = '#A8A29E';
const STONE500 = '#78716C';
const STONE600 = '#57534E';

interface DoctorTriageCardProps {
  sessionSnapshot: SessionState | null;
}

export const DoctorTriageCard: React.FC<DoctorTriageCardProps> = ({ sessionSnapshot }) => {
  const isUrgent = sessionSnapshot?.status === 'urgent';
  const isCompleted = sessionSnapshot?.status === 'completed';

  return (
    <div style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden', minHeight: 140 }}>
      {/* decorative wave */}
      <svg style={{ position: 'absolute', bottom: 0, right: 0, width: 120, height: 120, opacity: 0.08, color: SAP, pointerEvents: 'none' }} fill="currentColor" viewBox="0 0 100 100">
        <path d="M0,50 Q25,20 50,50 T100,50 L100,100 L0,100 Z" />
      </svg>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} color={SAP} />
          <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: SAP, fontSize: '0.95rem' }}>Triage Status</span>
        </div>
        <MoreVertical size={15} color={STONE400} style={{ cursor: 'pointer' }} />
      </div>

      {isUrgent ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', marginBottom: '0.5rem' }}>
          <AlertCircle size={11} color="#dc2626" /> URGENT <Info size={11} color="#f87171" />
        </span>
      ) : isCompleted ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', marginBottom: '0.5rem' }}>
          <CheckCircle2 size={11} color="#22c55e" /> STABLE <Info size={11} color="#6ee7b7" />
        </span>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', marginBottom: '0.5rem' }}>
          <Plus size={11} /> UNKNOWN <Info size={11} color="#f59e0b" />
        </span>
      )}

      <p style={{ fontSize: '0.72rem', color: STONE600, lineHeight: 1.5, margin: 0 }}>
        {isUrgent
          ? 'Immediate medical evaluation recommended after deterministic emergency screening.'
          : 'No confirmed emergency rule is recorded. This is not a diagnosis or assurance that the situation is safe.'}
      </p>
    </div>
  );
};

export default DoctorTriageCard;
