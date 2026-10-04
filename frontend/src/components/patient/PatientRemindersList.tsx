import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Reminder } from '../../api';

interface PatientRemindersListProps {
  reminders: Reminder[];
  onCreateReminder?: (msg: string, days: number) => void;
}

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 16,
  border: '1px solid #E8E7E0',
  padding: '1.25rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1rem',
};

const listContainerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const timelineLineStyle: React.CSSProperties = {
  position: 'absolute',
  left: 11,
  top: 12,
  bottom: 12,
  width: 1,
  backgroundColor: '#e5e2d6',
  zIndex: 0,
};

const itemStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '1rem',
  cursor: 'pointer',
};

const dotOuterStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: 22,
  height: 22,
  borderRadius: 999,
  backgroundColor: '#f4f3ec',
  border: '2px solid #FFFFFF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 2,
  flexShrink: 0,
};

const itemCardStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#FFFFFF',
  border: '1px solid #ece9df',
  borderRadius: 12,
  padding: '0.75rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
};

export const PatientRemindersList: React.FC<PatientRemindersListProps> = () => {
  const displayItems = [
    {
      id: 'rem-1',
      month: 'OCT',
      day: '3',
      badge: 'Due today',
      badgeBg: '#e4ede5',
      badgeColor: '#2c5339',
      dotBg: '#759e7e',
      title: 'Morning Dose: Flovent Inhaler (1 puff) & Peak Flow Check',
      time: '2:47 PM',
    },
    {
      id: 'rem-2',
      month: 'OCT',
      day: '3',
      badge: 'Due today',
      badgeBg: '#e4ede5',
      badgeColor: '#2c5339',
      dotBg: '#759e7e',
      title: 'Evening Dose: Montelukast 10mg with dinner',
      time: '7:47 PM',
    },
    {
      id: 'rem-3',
      month: 'OCT',
      day: '2',
      badge: 'Overdue',
      badgeBg: '#e9e7e1',
      badgeColor: '#57534E',
      dotBg: '#78716C',
      title: 'Record Blood Pressure log',
      time: '7:17 PM',
    },
  ];

  return (
    <div style={cardStyle}>
      <div>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} color="#292524" />
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#292524', margin: 0 }}>Upcoming Appointments</h3>
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); }}
            style={{ fontSize: '0.75rem', fontWeight: 500, color: '#78716C', textDecoration: 'none' }}
          >
            View all →
          </a>
        </div>

        <div style={listContainerStyle}>
          <div style={timelineLineStyle} />

          {displayItems.map((item) => (
            <div key={item.id} style={itemStyle}>
              <div style={dotOuterStyle}>
                <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: item.dotBg }} />
              </div>

              <div style={itemCardStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>{item.month}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#292524' }}>{item.day}</span>
                    <span style={{ backgroundColor: item.badgeBg, color: item.badgeColor, fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                      {item.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#292524', lineHeight: 1.3 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>🕒</span> <span>{item.time}</span>
                  </div>
                </div>
                <ChevronRight size={16} color="#78716C" style={{ flexShrink: 0, marginLeft: 8 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientRemindersList;
