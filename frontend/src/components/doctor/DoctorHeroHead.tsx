import React, { useState } from 'react';
import { Calendar, Users, MessageSquare, Stethoscope, TrendingUp, Info, ChevronDown } from 'lucide-react';
import { AuthUser, DoctorPatient, DoctorVisit, SessionState } from '../../api';

const SAP = '#142E1F';
const BORDER = '#E8E7E0';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';
const STONE400 = '#A8A29E';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE800 = '#292524';

interface DoctorHeroHeadProps {
  user: AuthUser;
  selectedPatient: DoctorPatient | null;
  selectedVisit: DoctorVisit | null;
  totalVisits: number;
  totalPatientsCount: number;
  sessionSnapshot: SessionState | null;
  timeframe?: 'today' | 'week' | 'month';
  setTimeframe?: (t: 'today' | 'week' | 'month') => void;
}

export const DoctorHeroHead: React.FC<DoctorHeroHeadProps> = ({
  user,
  selectedPatient,
  selectedVisit,
  totalVisits,
  totalPatientsCount,
  sessionSnapshot,
  timeframe = 'today',
  setTimeframe,
}) => {
  const [activeRange, setActiveRange] = useState<'today' | 'week' | 'month'>(timeframe);

  const handleRange = (r: 'today' | 'week' | 'month') => {
    setActiveRange(r);
    setTimeframe?.(r);
  };

  const displayName = user.name.startsWith('Dr.') ? user.name : `Dr. ${user.name}`;

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  }).format(new Date());

  const messagesCount = sessionSnapshot?.messages?.length ?? 0;
  const sessionStatus = sessionSnapshot?.status?.toUpperCase() || selectedVisit?.status?.toUpperCase() || 'N/A';

  const metrics = [
    {
      label: 'Total Patients',
      value: totalPatientsCount,
      sub: '+1 this month',
      subColor: '#065f46',
      iconBg: '#EDF3EE',
      icon: <Users size={20} color={SAP} />,
      bars: [
        { h: 12, bg: '#D1E0D3' },
        { h: 20, bg: '#D1E0D3' },
        { h: 28, bg: SAP },
      ],
    },
    {
      label: "Today's Visits",
      value: Math.max(totalVisits, 1),
      sub: 'Scheduled',
      subColor: STONE500,
      iconBg: '#F6F5ED',
      icon: <Calendar size={20} color="#92400e" />,
      bars: [
        { h: 8, bg: STONE200 },
        { h: 24, bg: SAP },
        { h: 16, bg: STONE200 },
      ],
    },
    {
      label: 'Messages',
      value: messagesCount,
      sub: 'Unread',
      subColor: STONE500,
      iconBg: '#EEF2F6',
      icon: <MessageSquare size={20} color="#1e3a5f" />,
      bars: [
        { h: 8, bg: STONE200 },
        { h: 12, bg: STONE200 },
        { h: 8, bg: STONE200 },
      ],
    },
    {
      label: 'Session Status',
      value: sessionStatus,
      sub: null,
      subColor: STONE500,
      iconBg: '#EAF2ED',
      icon: <Stethoscope size={20} color={SAP} />,
      dot: sessionSnapshot?.status === 'in_progress' ? '#22c55e' : STONE400,
    },
  ];

  const rangeBtn = (r: 'today' | 'week' | 'month', label: string) => (
    <button
      key={r}
      type="button"
      onClick={() => handleRange(r)}
      style={{
        padding: '0.25rem 0.65rem', borderRadius: 9, border: 'none', fontSize: '0.72rem', cursor: 'pointer',
        fontWeight: activeRange === r ? 700 : 500,
        background: activeRange === r ? SAP : 'transparent',
        color: activeRange === r ? '#fff' : STONE600,
        transition: 'all 0.15s',
      }}
    >{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Greeting row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.83rem', color: STONE500, fontWeight: 500 }}>Good afternoon,</div>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 700, color: SAP, margin: '0.1rem 0 0.2rem', lineHeight: 1.1 }}>
            {displayName}
          </h1>
          <p style={{ fontSize: '0.8rem', color: STONE600, margin: 0 }}>Here's your clinical overview for today.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Quote plaque */}
          <div style={{ display: 'none', padding: '0.4rem 0.85rem', background: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, borderRadius: 14, fontSize: '0.72rem', fontStyle: 'italic', color: STONE600, fontFamily: '"Playfair Display", serif', maxWidth: 220, backdropFilter: 'blur(8px)' }}>
            "Better care starts with a clearer picture."
          </div>
          {/* Date + range pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.92)', padding: '0.35rem 0.35rem 0.35rem 0.75rem', borderRadius: 14, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: STONE700 }}>
              <Calendar size={13} color={SAP} />
              {todayFormatted}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {rangeBtn('today', 'Today')}
              {rangeBtn('week', 'This Week')}
              {rangeBtn('month', 'This Month')}
            </div>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="dr-v2-metrics">
        {metrics.map((m, i) => (
          <div key={i} className="dr-v2-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: m.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {m.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: STONE500 }}>{m.label}</div>
                <div style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.5rem', fontWeight: 700, color: SAP, lineHeight: 1.1, marginTop: 2 }}>{m.value}</div>
                {m.sub && <div style={{ fontSize: '0.62rem', fontWeight: 600, color: m.subColor, marginTop: 1 }}>{m.sub}</div>}
              </div>
            </div>
            {m.bars ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28, opacity: 0.65 }}>
                {m.bars.map((b, bi) => (
                  <div key={bi} style={{ width: 5, height: b.h, borderRadius: 3, background: b.bg }} />
                ))}
              </div>
            ) : (
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.dot, boxShadow: m.dot === '#22c55e' ? '0 0 0 3px rgba(34,197,94,0.2)' : undefined }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const STONE700 = '#44403C';

export default DoctorHeroHead;
