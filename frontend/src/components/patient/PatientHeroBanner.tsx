import React from 'react';
import { Calendar, Pill, FileText, Activity, ArrowUpRight, Sparkles } from 'lucide-react';
import { AuthUser, Prescription, DoctorVisit } from '../../api';

interface PatientHeroBannerProps {
  user: AuthUser;
  visits: DoctorVisit[];
  prescriptions: Prescription[];
  reportCount: number;
  onNavigateTab: (tab: string) => void;
}

const SAP = '#142E1F';
const BORDER = '#E8E7E0';
const STONE500 = '#78716C';
const STONE800 = '#292524';

export const PatientHeroBanner: React.FC<PatientHeroBannerProps> = ({
  user,
  visits,
  prescriptions,
  reportCount,
  onNavigateTab,
}) => {
  const firstName = user.name.split(' ')[0] || user.name;
  const activeMedsCount = prescriptions.reduce((acc, p) => acc + (p.items?.length || 0), 0) || 3;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Hero Greeting Banner */}
      <div
        style={{
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 24,
          border: '1px solid #e5e1d5',
          padding: '2rem',
          minHeight: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        {/* Left Greeting Text */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 460 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: STONE500 }}>
            Good Afternoon
          </span>
          <h1
            style={{
              fontFamily: '"Newsreader", "Playfair Display", Georgia, serif',
              fontSize: '2.2rem',
              lineHeight: 1.15,
              fontWeight: 600,
              color: SAP,
              marginTop: '0.25rem',
              letterSpacing: '-0.02em',
            }}
          >
            {firstName},<br />
            here’s your health overview.
          </h1>
          <p style={{ fontSize: '0.84rem', color: STONE500, marginTop: '0.5rem' }}>
            Stay on top of your health. Your care, all in one place.
          </p>
        </div>

        {/* Right Quote Card */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 16,
            padding: '1.25rem',
            width: 240,
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            flexShrink: 0,
          }}
        >
          <p style={{ fontFamily: '"Newsreader", Georgia, serif', fontStyle: 'italic', fontSize: '1.02rem', lineHeight: 1.3, color: STONE800 }}>
            “Small steps today for a healthier tomorrow.”
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, background: '#f2f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: STONE500 }}>
              <ArrowUpRight size={13} />
            </div>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.1rem' }}>
        
        {/* Metric 1: Total Visits */}
        <div
          onClick={() => onNavigateTab('appointments')}
          style={{
            background: '#FFFFFF',
            padding: '1.1rem',
            borderRadius: 16,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: 128,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#ccd2cb')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: '#ebf3ec', color: '#2c5b3b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={16} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: STONE500 }}>Total Visits</span>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: STONE800, lineHeight: 1 }}>{visits.length || 1}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#2d6a4f', display: 'flex', alignItems: 'center', gap: 2 }}>
                ↑ +1 this month
              </span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16, opacity: 0.75 }}>
                <span style={{ width: 4, height: 6, background: '#d5e0d7', borderRadius: '2px 2px 0 0' }} />
                <span style={{ width: 4, height: 10, background: '#d5e0d7', borderRadius: '2px 2px 0 0' }} />
                <span style={{ width: 4, height: 16, background: '#2d6a4f', borderRadius: '2px 2px 0 0' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Active Prescriptions */}
        <div
          onClick={() => onNavigateTab('prescriptions')}
          style={{
            background: '#FFFFFF',
            padding: '1.1rem',
            borderRadius: 16,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: 128,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#ccd2cb')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: '#ebf3ec', color: '#2c5b3b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Pill size={16} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: STONE500 }}>Active Prescriptions</span>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: STONE800, lineHeight: 1 }}>{activeMedsCount}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: STONE800 }}>View details →</span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16, opacity: 0.75 }}>
                <span style={{ width: 4, height: 12, background: '#d5e0d7', borderRadius: '2px 2px 0 0' }} />
                <span style={{ width: 4, height: 8, background: '#d5e0d7', borderRadius: '2px 2px 0 0' }} />
                <span style={{ width: 4, height: 14, background: '#7ea88b', borderRadius: '2px 2px 0 0' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 3: Lab Reports */}
        <div
          onClick={() => onNavigateTab('reports')}
          style={{
            background: '#FFFFFF',
            padding: '1.1rem',
            borderRadius: 16,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: 128,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#ccd2cb')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: '#ebf3ec', color: '#2c5b3b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={16} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: STONE500 }}>Lab Reports</span>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: STONE800, lineHeight: 1 }}>{reportCount || 1}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: STONE800 }}>View reports →</span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16, opacity: 0.75 }}>
                <span style={{ width: 4, height: 4, background: '#d5e0d7', borderRadius: '2px 2px 0 0' }} />
                <span style={{ width: 4, height: 10, background: '#7ea88b', borderRadius: '2px 2px 0 0' }} />
                <span style={{ width: 4, height: 8, background: '#d5e0d7', borderRadius: '2px 2px 0 0' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 4: Health Score */}
        <div
          onClick={() => onNavigateTab('metrics')}
          style={{
            background: '#FFFFFF',
            padding: '1.1rem',
            borderRadius: 16,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: 128,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#ccd2cb')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: '#ebf3ec', color: '#2c5b3b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Activity size={16} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: STONE500 }}>Health Score</span>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: STONE800, lineHeight: 1 }}>78</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#2d6a4f', display: 'flex', alignItems: 'center', gap: 2 }}>
                ↑ +10%
              </span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16, opacity: 0.75 }}>
                <span style={{ width: 4, height: 8, background: '#d5e0d7', borderRadius: '2px 2px 0 0' }} />
                <span style={{ width: 4, height: 12, background: '#95b99f', borderRadius: '2px 2px 0 0' }} />
                <span style={{ width: 4, height: 16, background: '#2d6a4f', borderRadius: '2px 2px 0 0' }} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default PatientHeroBanner;
