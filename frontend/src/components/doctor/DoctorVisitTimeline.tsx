import React from 'react';
import { DoctorVisit } from '../../api';
import { formatDate } from '../../utils/formatters';

interface DoctorVisitTimelineProps {
  doctorHistory: DoctorVisit[];
  selectedVisit: DoctorVisit | null;
  setSelectedVisit: (visit: DoctorVisit) => void;
}

export const DoctorVisitTimeline: React.FC<DoctorVisitTimelineProps> = ({
  doctorHistory,
  selectedVisit,
  setSelectedVisit,
}) => {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">History</div>
          <h2>Visit Timeline</h2>
        </div>
      </div>
      <div className="stack compact" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {doctorHistory.map((visit) => (
          <button
            key={visit.visit_id}
            className={`timeline-item ${selectedVisit?.visit_id === visit.visit_id ? 'active' : ''}`}
            onClick={() => setSelectedVisit(visit)}
          >
            <strong style={{ color: '#fff' }}>Visit on {new Date(visit.created_at).toLocaleDateString()}</strong>
            <span>{visit.status.toUpperCase()} • {formatDate(visit.created_at)}</span>
          </button>
        ))}
        {!doctorHistory.length && <div className="empty">No history for this patient.</div>}
      </div>
    </section>
  );
};

export default DoctorVisitTimeline;
