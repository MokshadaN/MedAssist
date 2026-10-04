import React, { useState } from 'react';
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

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 16,
  border: '1px solid #E8E7E0',
  padding: '1.25rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: '1rem',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1rem',
};

const itemCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.75rem 0.85rem',
  borderRadius: 12,
  border: '1px solid #ece8de',
  backgroundColor: '#fbfbf8',
  gap: '0.75rem',
};

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
    <div style={cardStyle}>
      <div>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} color="#292524" />
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#292524', margin: 0 }}>Recent Lab Reports</h3>
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); }}
            style={{ fontSize: '0.75rem', fontWeight: 500, color: '#78716C', textDecoration: 'none', marginLeft: 'auto' }}
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
            border: dragActive ? '2px dashed #142E1F' : '1.5px dashed #dad6c8',
            borderRadius: 12,
            padding: '0.75rem 1rem',
            textAlign: 'center',
            backgroundColor: dragActive ? '#eaf2eb' : '#fcfbf8',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <label
              style={{
                cursor: 'pointer',
                padding: '0.35rem 0.85rem',
                borderRadius: 8,
                backgroundColor: '#142E1F',
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
            <span style={{ fontSize: '0.75rem', color: '#78716C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
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
              <div key={report.id} style={itemCardStyle}>
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
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.62rem',
                      letterSpacing: '0.05em',
                      flexShrink: 0,
                    }}
                  >
                    PDF
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#292524', margin: 0, lineHeight: 1.2 }}>
                      {fileName}
                    </h4>
                    <p style={{ fontSize: '0.7rem', color: '#78716C', marginTop: 2, margin: 0 }}>
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
                      backgroundColor: '#142E1F',
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
                      color: '#292524',
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
                      color: '#78716C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
                      justifyContent: 'center',
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
