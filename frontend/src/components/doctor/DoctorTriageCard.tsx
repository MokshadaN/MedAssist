import React from 'react';
import { SessionState } from '../../api';

interface DoctorTriageCardProps {
  sessionSnapshot: SessionState | null;
}

export const DoctorTriageCard: React.FC<DoctorTriageCardProps> = ({ sessionSnapshot }) => {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Triage</div>
          <h2>Status Check</h2>
        </div>
      </div>
      <div
        className={`alert-card ${sessionSnapshot?.status === 'urgent' ? 'urgent' : ''}`}
        style={{ height: '100%' }}
      >
        <strong style={{ color: '#fff' }}>{sessionSnapshot?.status?.toUpperCase() || 'UNKNOWN'}</strong>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
          {sessionSnapshot?.status === 'urgent'
            ? 'Immediate medical evaluation recommended after deterministic emergency screening.'
            : 'No confirmed emergency rule is recorded. This is not a diagnosis or assurance that the situation is safe.'}
        </p>
      </div>
    </section>
  );
};

export default DoctorTriageCard;
