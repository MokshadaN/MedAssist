import React from 'react';
import { formatReportAnalysis } from '../../utils/formatters';

interface DoctorPatientReportsProps {
  doctorReports: Array<{
    id: string;
    file_url: string;
    parsed_data?: string | null;
    analysis_status?: string;
  }>;
  analyzingId: string | null;
  onAnalyzeReport: (id: string) => Promise<void>;
  onOpenReport: (url: string) => void;
  onDownloadReport: (url: string) => void;
  onDeleteReport: (id: string) => Promise<void>;
}

export const DoctorPatientReports: React.FC<DoctorPatientReportsProps> = ({
  doctorReports,
  analyzingId,
  onAnalyzeReport,
  onOpenReport,
  onDownloadReport,
  onDeleteReport,
}) => {
  return (
    <section className="panel wide">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Documents</div>
          <h2>Patient Reports</h2>
        </div>
      </div>
      <div className="stack compact">
        {doctorReports.map((report) => (
          <div
            className="record-card"
            key={report.id}
            style={{
              gridTemplateColumns: '1fr auto auto auto auto',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div className="stack compact" style={{ gap: '0.25rem' }}>
              <strong style={{ color: '#fff' }}>{report.file_url.split('/').pop()}</strong>
              {report.analysis_status && report.analysis_status !== 'uploaded' && (
                <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>
                  Analysis: {report.analysis_status}
                </span>
              )}
              {report.parsed_data && (
                <pre
                  className="code-block"
                  style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}
                >
                  {formatReportAnalysis(report.parsed_data)}
                </pre>
              )}
            </div>
            <button
              className="secondary"
              type="button"
              onClick={() => void onAnalyzeReport(report.id)}
              disabled={
                analyzingId === report.id ||
                report.analysis_status === 'queued' ||
                report.analysis_status === 'processing'
              }
            >
              {analyzingId === report.id
                ? 'Analyzing...'
                : report.analysis_status === 'completed'
                ? 'Analyzed'
                : 'Analyze'}
            </button>
            <button className="secondary" type="button" onClick={() => void onOpenReport(report.file_url)}>
              Open
            </button>
            <button className="secondary" type="button" onClick={() => void onDownloadReport(report.file_url)}>
              Download
            </button>
            <button className="secondary" type="button" onClick={() => void onDeleteReport(report.id)}>
              Delete
            </button>
          </div>
        ))}
        {!doctorReports.length && <div className="empty">No reports uploaded for this patient.</div>}
      </div>
    </section>
  );
};

export default DoctorPatientReports;
