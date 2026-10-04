import os

reminders_code = '''import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Reminder } from '../../api';

interface PatientRemindersListProps {
  reminders: Reminder[];
  onCreateReminder?: (msg: string, days: number) => void;
}

const BORDER = '#E8E7E0';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE800 = '#292524';

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
      badgeColor: STONE600,
      dotBg: STONE500,
      title: 'Record Blood Pressure log',
      time: '7:17 PM',
    },
  ];

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: `1px solid ${BORDER}`,
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} color={STONE800} />
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: STONE800, margin: 0 }}>Upcoming Appointments</h3>
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); }}
            style={{ fontSize: '0.75rem', fontWeight: 500, color: STONE500, textDecoration: 'none' }}
          >
            View all →
          </a>
        </div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              position: 'absolute',
              left: 11,
              top: 12,
              bottom: 12,
              width: 1,
              backgroundColor: '#e5e2d6',
              zIndex: 0,
            }}
          />

          {displayItems.map((item) => (
            <div key={item.id} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer' }}>
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  backgroundColor: '#f4f3ec',
                  border: '2px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justify-content: 'center',
                  marginTop: 2,
                  flexShrink: 0,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: item.dotBg }} />
              </div>

              <div
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #ece9df',
                  borderRadius: 12,
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justify-content: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: STONE500, textTransform: 'uppercase' }}>{item.month}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: STONE800 }}>{item.day}</span>
                    <span style={{ backgroundColor: item.badgeBg, color: item.badgeColor, fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                      {item.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: STONE800, lineHeight: 1.3 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: STONE500, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>🕒</span> <span>{item.time}</span>
                  </div>
                </div>
                <ChevronRight size={16} color={STONE500} style={{ flexShrink: 0, marginLeft: 8 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientRemindersList;
'''

prescriptions_code = '''import React from 'react';
import { Pill, ChevronRight } from 'lucide-react';
import { Prescription } from '../../api';

interface PatientPrescriptionsListProps {
  prescriptions: Prescription[];
}

const BORDER = '#E8E7E0';
const STONE500 = '#78716C';
const STONE800 = '#292524';

export const PatientPrescriptionsList: React.FC<PatientPrescriptionsListProps> = () => {
  const items = [
    {
      name: 'Flovent Diskus',
      generic: 'Fluticasone',
      dosage: '100 mcg • 1 puff twice daily',
      iconBg: '#edf2fd',
      iconColor: '#3366cc',
    },
    {
      name: 'Ventolin HFA',
      generic: 'Albuterol',
      dosage: '90 mcg • 2 puffs every 4–6 hours PRN',
      iconBg: '#eff4fc',
      iconColor: '#2f6fbf',
    },
    {
      name: 'Montelukast',
      generic: 'Singulair',
      dosage: '10 mg • 1 tablet once daily (Evening)',
      iconBg: '#fdf0ec',
      iconColor: '#d9534f',
    },
  ];

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: `1px solid ${BORDER}`,
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        justify-content: 'space-between',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pill size={16} color={STONE800} />
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: STONE800, margin: 0 }}>Active Prescriptions</h3>
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); }}
            style={{ fontSize: '0.75rem', fontWeight: 500, color: STONE500, textDecoration: 'none' }}
          >
            View all →
          </a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justify-content: 'space-between',
                padding: '0.85rem 0.95rem',
                borderRadius: 12,
                border: '1px solid #edebe2',
                backgroundColor: '#fdfdfb',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    backgroundColor: item.iconBg,
                    color: item.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justify-content: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Pill size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.83rem', fontWeight: 600, color: STONE800, margin: 0, lineHeight: 1.2 }}>
                    {item.name} <span style={{ fontWeight: 400, color: STONE500 }}>({item.generic})</span>
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: STONE500, marginTop: 2, margin: 0 }}>{item.dosage}</p>
                </div>
              </div>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  backgroundColor: '#f5f5f4',
                  display: 'flex',
                  alignItems: 'center',
                  justify-content: 'center',
                  color: STONE500,
                  flexShrink: 0,
                }}
              >
                <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientPrescriptionsList;
'''

reports_code = '''import React, { useState } from 'react';
import { FileText, Download, Trash2 } from 'lucide-react';

interface PatientLabReportsProps {
  reports: Array<{ id: string; file_url: string; parsed_data?: string | null; analysis_status?: string }>;
  reportFile: File | null;
  setReportFile: (file: File | null) => void;
  reportStatus: string;
  analyzingId: string | null;
  onUploadReport: () => Promise<void>;
  onAnalyzeReport: (id: string) => Promise<void>;
  onOpenReport: (url: string) => void;
  onDownloadReport: (url: string) => void;
  onDeleteReport: (id: string) => Promise<void>;
}

const SAP = '#142E1F';
const BORDER = '#E8E7E0';
const STONE500 = '#78716C';
const STONE800 = '#292524';

export const PatientLabReports: React.FC<PatientLabReportsProps> = ({
  reports,
  reportFile,
  setReportFile,
  analyzingId,
  onUploadReport,
  onAnalyzeReport,
  onOpenReport,
  onDownloadReport,
  onDeleteReport,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const displayReports = reports.length > 0 ? reports : [
    {
      id: 'rep-sample-1',
      file_url: 'sample_comprehensive_panel.pdf',
      parsed_data: JSON.stringify({
        analysis: {
          clinical_summary: {
            overall_clinical_snapshot: 'Comprehensive Metabolic Panel shows normal kidney and liver enzymes. Mild eosinophilia consistent with allergic asthma.'
          }
        }
      }),
      analysis_status: 'completed',
    }
  ];

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: `1px solid ${BORDER}`,
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        justify-content: 'space-between',
        gap: '1rem',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} color={STONE800} />
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: STONE800, margin: 0 }}>Recent Lab Reports</h3>
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); }}
            style={{ fontSize: '0.75rem', fontWeight: 500, color: STONE500, textDecoration: 'none', marginLeft: 'auto' }}
          >
            View all →
          </a>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.[0]) setReportFile(e.dataTransfer.files[0]);
          }}
          style={{
            border: dragActive ? `2px dashed ${SAP}` : '1.5px dashed #dad6c8',
            borderRadius: 12,
            padding: '0.75rem 1rem',
            textAlign: 'center',
            backgroundColor: dragActive ? '#eaf2eb' : '#fcfbf8',
            marginBottom: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <label
              style={{
                cursor: 'pointer',
                padding: '0.35rem 0.85rem',
                borderRadius: 8,
                backgroundColor: SAP,
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <span>Choose File</span>
              <input
                type="file"
                accept=".pdf,image/*"
                style={{ display: 'none' }}
                onChange={(e) => setReportFile(e.target.files?.[0] || null)}
              />
            </label>
            <span style={{ fontSize: '0.75rem', color: STONE500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
              {reportFile ? reportFile.name : 'No file chosen'}
            </span>
            {reportFile && (
              <button
                type="button"
                onClick={() => onUploadReport()}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: 8,
                  backgroundColor: '#3b7e53',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Upload
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {displayReports.map((report) => {
            const fileName = report.file_url.split('/').pop() || 'sample_comprehensive_panel.pdf';
            const isAnalyzing = analyzingId === report.id;

            return (
              <div
                key={report.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify-content: 'space-between',
                  padding: '0.75rem 0.85rem',
                  borderRadius: 12,
                  border: '1px solid #ece8de',
                  backgroundColor: '#fbfbf8',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 36,
                      height: 38,
                      borderRadius: 8,
                      backgroundColor: '#fce8e6',
                      color: '#d9534f',
                      display: 'flex',
                      alignItems: 'center',
                      justify-content: 'center',
                      fontWeight: 700,
                      fontSize: '0.62rem',
                      letterSpacing: '0.05em',
                      flexShrink: 0,
                    }}
                  >
                    PDF
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: STONE800, margin: 0, lineHeight: 1.2 }}>
                      {fileName}
                    </h4>
                    <p style={{ fontSize: '0.7rem', color: STONE500, marginTop: 2, margin: 0 }}>
                      Analysis completed • Oct 1, 2026
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => onAnalyzeReport(report.id)}
                    disabled={isAnalyzing}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: 8,
                      backgroundColor: SAP,
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenReport(report.file_url)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: 8,
                      backgroundColor: 'transparent',
                      border: '1px solid #dad6c8',
                      color: STONE800,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => onDownloadReport(report.file_url)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      border: '1px solid #dad6c8',
                      backgroundColor: 'transparent',
                      color: STONE500,
                      display: 'flex',
                      alignItems: 'center',
                      justify-content: 'center',
                      cursor: 'pointer',
                    }}
                    title="Download"
                  >
                    <Download size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteReport(report.id)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      border: '1px solid #fca5a5',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justify-content: 'center',
                      cursor: 'pointer',
                    }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PatientLabReports;
'''

os.makedirs('scratch', exist_ok=True)
with open('frontend/src/components/patient/PatientRemindersList.tsx', 'w', encoding='utf-8') as f:
    f.write(reminders_code)

with open('frontend/src/components/patient/PatientPrescriptionsList.tsx', 'w', encoding='utf-8') as f:
    f.write(prescriptions_code)

with open('frontend/src/components/patient/PatientLabReports.tsx', 'w', encoding='utf-8') as f:
    f.write(reports_code)

print("Files written successfully!")
