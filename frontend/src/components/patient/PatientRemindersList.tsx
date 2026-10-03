import React from 'react';
import { Clock, CheckCircle2, AlertCircle, ArrowRight, Plus, Bell } from 'lucide-react';
import { Reminder } from '../../api';

interface PatientRemindersListProps {
  reminders: Reminder[];
  onCreateReminder?: (msg: string, days: number) => void;
}

export const PatientRemindersList: React.FC<PatientRemindersListProps> = ({
  reminders,
  onCreateReminder,
}) => {
  const sampleReminders = [
    {
      id: 'rem-1',
      status: 'Due today',
      type: 'urgent',
      title: 'Morning Dose: Flovent Inhaler (1 puff) & Peak Flow Check',
      time: 'Today, 2:47 PM',
      color: 'bg-[#DC2626]',
      badgeBg: 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]',
    },
    {
      id: 'rem-2',
      status: 'Due today',
      type: 'urgent',
      title: 'Evening Dose: Montelukast 10mg with dinner',
      time: 'Today, 7:47 PM',
      color: 'bg-[#059669]',
      badgeBg: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
    },
    {
      id: 'rem-3',
      status: 'Overdue',
      type: 'overdue',
      title: 'Record Blood Pressure log',
      time: 'Yesterday, 7:17 PM',
      color: 'bg-[#64748B]',
      badgeBg: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
    },
  ];

  return (
    <div className="bg-[#FFFFFF] border border-[#E8ECE7] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F0F4F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EFF7ED] text-[#1E432F] flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#10B981]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#142A1F]">Follow-ups & Reminders</h3>
              <span className="text-[10px] text-[#63806F]">Daily therapy & task schedule</span>
            </div>
          </div>
          <button className="text-[11px] font-semibold text-[#142A1F] hover:text-[#059669] flex items-center gap-1 transition-colors">
            <span>View all</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Timeline Items */}
        <div className="mt-4 space-y-3 relative before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-[#E5EBE5]">
          {sampleReminders.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3.5 pl-0 relative group cursor-pointer"
            >
              {/* Timeline Dot */}
              <div className={`w-6 h-6 rounded-full ${item.color} text-white flex items-center justify-center shrink-0 border-4 border-white shadow-sm z-10`}>
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              {/* Reminder Card Body */}
              <div className="flex-1 bg-[#F9FAF8] hover:bg-[#F3F7F4] border border-[#E6EBE5] rounded-2xl p-3 transition-all flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeBg}`}>
                      {item.status}
                    </span>
                    <span className="text-[10px] text-[#7A9183]">{item.time}</span>
                  </div>
                  <h4 className="font-semibold text-xs text-[#142A1F] leading-snug">
                    {item.title}
                  </h4>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8AA293] group-hover:text-[#142A1F] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Add Reminder action */}
      <div className="pt-4 mt-4 border-t border-[#F0F4F0] flex items-center justify-between text-xs">
        <span className="text-[11px] text-[#7A9183]">3 items scheduled today</span>
        <button
          onClick={() => onCreateReminder?.('Routine BP check', 1)}
          className="text-xs font-semibold text-[#142A1F] hover:text-[#059669] flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Reminder</span>
        </button>
      </div>
    </div>
  );
};

export default PatientRemindersList;
