import React from 'react';
import { Clock, ArrowRight, ChevronRight } from 'lucide-react';
import { DoctorVisit } from '../../api';

const SAP = '#142E1F';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';
const STONE400 = '#A8A29E';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE800 = '#292524';

interface DoctorVisitTimelineProps {
  doctorHistory: DoctorVisit[];
  selectedVisit: DoctorVisit | null;
  setSelectedVisit: (visit: DoctorVisit) => void;
  patientName?: string;
}

type MockVisit = { month: string; day: number; time: string; name: string; status: 'IN_PROGRESS' | 'COMPLETED' };

const MOCK_VISITS: MockVisit[] = [
  { month: 'OCT', day: 3, time: '7:47 AM', name: 'Robert Miller', status: 'IN_PROGRESS' },
  { month: 'OCT', day: 1, time: '2:15 PM', name: 'Jane Doe', status: 'COMPLETED' },
];

export const DoctorVisitTimeline: React.FC<DoctorVisitTimelineProps> = ({
  doctorHistory,
  selectedVisit,
  setSelectedVisit,
  patientName = 'Robert Miller',
}) => {
  const dateIco = (month: string, day: number) => (
    <div style={{ textAlign: 'center', padding: '2px 6px', background: '#fff', borderRadius: 6, border: `1px solid ${STONE200}`, minWidth: 30 }}>
      <div style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', color: STONE400 }}>{month}</div>
      <div style={{ fontWeight: 700, color: SAP, fontSize: '0.78rem', lineHeight: 1 }}>{day}</div>
    </div>
  );

  const badge = (inProgress: boolean) => (
    <span style={{ padding: '1px 6px', borderRadius: 999, fontSize: '0.58rem', fontWeight: 700, background: inProgress ? '#ecfdf5' : STONE100, color: inProgress ? '#065f46' : STONE600 }}>
      {inProgress ? 'IN_PROGRESS' : 'COMPLETED'}
    </span>
  );

  const hasData = doctorHistory.length > 0;

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 300 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: `1px solid ${STONE100}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={16} color={SAP} />
          <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: SAP, fontSize: '0.95rem' }}>Visit Timeline</span>
        </div>
        <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', fontWeight: 700, color: SAP, background: 'none', border: 'none', cursor: 'pointer' }}>
          View all <ArrowRight size={11} />
        </button>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', marginTop: '0.65rem', paddingLeft: 20, position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: 6, top: 10, bottom: 10, width: 1, background: STONE200 }} />

        {hasData ? (
          doctorHistory.map((visit, index) => {
            const dateObj = new Date(visit.created_at);
            const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const day = dateObj.getDate();
            const time = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const isSelected = selectedVisit?.visit_id === visit.visit_id;
            const inProgress = visit.status.toLowerCase().includes('progress') || index === 0;
            return (
              <div key={visit.visit_id} style={{ position: 'relative' }} onClick={() => setSelectedVisit(visit)}>
                <div style={{ position: 'absolute', left: -15, top: 10, width: 10, height: 10, borderRadius: '50%', background: inProgress ? '#16a34a' : STONE400, boxShadow: '0 0 0 2px #fff' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '0.45rem 0.6rem', borderRadius: 10, cursor: 'pointer', background: isSelected ? '#ecfdf5' : STONE50, border: `1px solid ${isSelected ? '#a7f3d0' : STONE100}`, transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {dateIco(month, day)}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: STONE800 }}>Visit</div>
                      <div style={{ fontSize: '0.65rem', color: STONE600 }}>{patientName}</div>
                      <div style={{ fontSize: '0.58rem', color: STONE400 }}>{time} · Visit #{doctorHistory.length - index}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {badge(inProgress)}
                    <ChevronRight size={12} color={STONE400} />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          MOCK_VISITS.map((v, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: -15, top: 10, width: 10, height: 10, borderRadius: '50%', background: v.status === 'IN_PROGRESS' ? '#16a34a' : STONE400, boxShadow: '0 0 0 2px #fff' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '0.45rem 0.6rem', borderRadius: 10, background: i === 0 ? '#ecfdf5' : STONE50, border: `1px solid ${i === 0 ? '#a7f3d0' : STONE100}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {dateIco(v.month, v.day)}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: STONE800 }}>Visit</div>
                    <div style={{ fontSize: '0.65rem', color: STONE600 }}>{v.name}</div>
                    <div style={{ fontSize: '0.58rem', color: STONE400 }}>{v.time} · 1 visit</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {badge(v.status === 'IN_PROGRESS')}
                  <ChevronRight size={12} color={STONE400} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DoctorVisitTimeline;
