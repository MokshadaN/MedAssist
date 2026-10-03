import React from 'react';
import { Reminder } from '../../api';
import { formatDate } from '../../utils/formatters';

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
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Follow-up</div>
          <h2>Schedule Reminder</h2>
        </div>
      </div>
      <div className="stack compact">
        <input
          type="datetime-local"
          value={doctorReminderTime}
          onChange={(e) => setDoctorReminderTime(e.target.value)}
        />
        <textarea
          rows={3}
          value={doctorReminderMessage}
          onChange={(e) => setDoctorReminderMessage(e.target.value)}
          placeholder="Message for patient..."
        />
        <button
          className="primary"
          onClick={() => void scheduleFollowUp()}
          disabled={!selectedPatientId}
        >
          Set Reminder
        </button>
        {doctorReminderStatus && <div className="flash subtle" style={{ marginTop: '0.25rem' }}>{doctorReminderStatus}</div>}
        <div className="stack compact" style={{ marginTop: '0.75rem' }}>
          {doctorReminders[0] ? (
            <div className={`reminder-row ${doctorReminders[0].is_completed ? 'done' : ''}`}>
              <div>
                <span className="badge" style={{ marginBottom: '0.25rem' }}>
                  {doctorReminders[0].is_completed ? 'Follow-up completed' : 'Follow-up already scheduled'}
                </span>
                <strong style={{ display: 'block', color: '#fff' }}>{doctorReminders[0].message}</strong>
                <span style={{ fontSize: '0.85rem' }}>{formatDate(doctorReminders[0].time)}</span>
              </div>
            </div>
          ) : (
            <div className="empty">No follow-ups scheduled for this patient.</div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DoctorFollowUpScheduler;
