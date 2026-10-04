import React, { useState } from 'react';
import { Bell, Plus, Calendar, MoreVertical, X } from 'lucide-react';
import { Reminder } from '../../api';

const SAP = '#142E1F';
const SAP_HOVER = '#0E2116';
const BORDER = '#E8E7E0';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';
const STONE400 = '#A8A29E';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE700 = '#44403C';
const STONE800 = '#292524';

interface DoctorFollowUpSchedulerProps {
  doctorReminderTime: string;
  setDoctorReminderTime: (val: string) => void;
  doctorReminderMessage: string;
  setDoctorReminderMessage: (val: string) => void;
  scheduleFollowUp: () => Promise<void>;
  selectedPatientId: string;
  doctorReminderStatus: string;
  doctorReminders: Reminder[];
}

export const DoctorFollowUpScheduler: React.FC<DoctorFollowUpSchedulerProps> = ({
  doctorReminderTime,
  setDoctorReminderTime,
  doctorReminderMessage,
  setDoctorReminderMessage,
  scheduleFollowUp,
  selectedPatientId,
  doctorReminderStatus,
  doctorReminders,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);

  const activeReminder = doctorReminders[0];

  let reminderMonth = 'OCT', reminderDay = '5', reminderTimeStr = '10:01 AM';
  if (activeReminder?.time) {
    const d = new Date(activeReminder.time);
    reminderMonth = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    reminderDay = d.getDate().toString();
    reminderTimeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  const handleCreate = async () => {
    await scheduleFollowUp();
    setShowAddForm(false);
  };

  const inputStyle = {
    width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.75rem',
    border: `1px solid ${STONE200}`, borderRadius: 8, background: '#fff',
    color: STONE800, outline: 'none', fontFamily: 'inherit',
  };

  const dateIco = (month: string, day: string) => (
    <div style={{ textAlign: 'center', padding: '3px 7px', background: '#fff', borderRadius: 8, border: `1px solid ${STONE200}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minWidth: 34 }}>
      <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: 700, color: STONE400 }}>{month}</div>
      <div style={{ fontWeight: 700, color: SAP, fontSize: '0.88rem', lineHeight: 1 }}>{day}</div>
    </div>
  );

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: `1px solid ${STONE100}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={16} color={SAP} />
          <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: SAP, fontSize: '0.95rem' }}>Follow-up Reminder</span>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.6rem', borderRadius: 8, border: `1px solid ${STONE200}`, background: STONE100, color: STONE700, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
        >
          {showAddForm ? <X size={11} /> : <Plus size={11} />}
          {showAddForm ? 'Close' : 'Add Reminder'}
        </button>
      </div>

      {/* Inline add form */}
      {showAddForm && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: STONE50, borderRadius: 10, border: `1px solid ${STONE200}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: STONE500, marginBottom: 4 }}>Date & Time</label>
            <input type="datetime-local" value={doctorReminderTime} onChange={e => setDoctorReminderTime(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: STONE500, marginBottom: 4 }}>Instructions</label>
            <input type="text" value={doctorReminderMessage} onChange={e => setDoctorReminderMessage(e.target.value)} placeholder="e.g. Doctor visit in 2 days" style={inputStyle} />
          </div>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!selectedPatientId || !doctorReminderTime}
            style={{ padding: '0.5rem', background: SAP, color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', opacity: !selectedPatientId || !doctorReminderTime ? 0.5 : 1 }}
          >
            Save Reminder
          </button>
          {doctorReminderStatus && <p style={{ fontSize: '0.7rem', color: '#059669', textAlign: 'center', margin: 0 }}>{doctorReminderStatus}</p>}
        </div>
      )}

      {/* Reminder item */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.65rem', marginTop: '0.75rem', background: STONE50, borderRadius: 10, border: `1px solid ${STONE200}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {dateIco(activeReminder ? reminderMonth : 'OCT', activeReminder ? reminderDay : '5')}
          <div>
            <div style={{ fontSize: '0.65rem', color: STONE500, fontWeight: 500 }}>{activeReminder ? reminderTimeStr : '10:01 AM'}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: STONE800 }}>
              {activeReminder ? activeReminder.message : 'Doctor visit in 2 days'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={15} color={STONE400} />
          <MoreVertical size={15} color={STONE400} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      <p style={{ fontSize: '0.65rem', color: STONE400, textAlign: 'center', marginTop: '0.5rem' }}>
        {activeReminder ? `${doctorReminders.length} follow-up(s) scheduled` : 'No follow-ups scheduled for this patient.'}
      </p>
    </div>
  );
};

export default DoctorFollowUpScheduler;
