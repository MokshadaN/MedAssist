import React, { useRef, useState } from 'react';
import { FileText, Plus, Upload, Trash2, ExternalLink, Download, Sparkles, CheckCircle2 } from 'lucide-react';

const SAP = '#142E1F';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';
const STONE400 = '#A8A29E';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE700 = '#44403C';
const STONE800 = '#292524';

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
  onUploadReport?: (file: File) => Promise<void>;
}

const IconButton: React.FC<{
  onClick: () => void;
  Icon: React.ElementType;
  hoverRed?: boolean;
  title?: string;
}> = ({ onClick, Icon, hoverRed, title }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 5, borderRadius: 7, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
        background: hovered ? (hoverRed ? '#fee2e2' : STONE100) : 'transparent',
        color: hovered ? (hoverRed ? '#dc2626' : STONE700) : STONE400,
      }}
    >
      <Icon size={13} />
    </button>
  );
};

export const DoctorPatientReports: React.FC<DoctorPatientReportsProps> = ({
  doctorReports,
  analyzingId,
  onAnalyzeReport,
  onOpenReport,
  onDownloadReport,
  onDeleteReport,
  onUploadReport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (onUploadReport) {
      try {
        setUploading(true);
        await onUploadReport(file);
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={16} color={SAP} />
          <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: SAP, fontSize: '0.95rem' }}>Patient Reports</span>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.65rem', borderRadius: 8, border: `1px solid ${STONE200}`, background: STONE100, color: STONE700, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={11} /> Upload Report
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) void handleFile(e.target.files[0]); }}
      />

      {/* Drag & Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) void handleFile(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${isDragging ? SAP : STONE200}`, borderRadius: 12,
          padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center', cursor: 'pointer',
          background: isDragging ? 'rgba(20,46,31,0.03)' : STONE50,
          transition: 'all 0.15s',
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: STONE100, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
          <Upload size={17} color={STONE500} />
        </div>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: STONE700, margin: 0 }}>
          {uploading ? 'Uploading report…' : 'Drop files here or click to upload'}
        </p>
        <p style={{ fontSize: '0.62rem', color: STONE400, marginTop: 2 }}>PDF, PNG, JPG (max 10MB)</p>
      </div>

      {/* Reports list */}
      {doctorReports.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', maxHeight: 180 }}>
          {doctorReports.map(report => {
            const fileName = report.file_url.split('/').pop() || 'Medical_Report.pdf';
            const isAnalyzed = report.analysis_status === 'completed';
            const isAnalyzing = analyzingId === report.id;

            return (
              <div key={report.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0.45rem 0.6rem', borderRadius: 10, border: `1px solid ${STONE200}`, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <FileText size={15} color={SAP} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: STONE800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{fileName}</div>
                    <div style={{ fontSize: '0.62rem', color: STONE400 }}>{isAnalyzed ? 'Analysis Complete' : report.analysis_status || 'Uploaded'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); void onAnalyzeReport(report.id); }}
                    disabled={isAnalyzing || isAnalyzed}
                    style={{
                      padding: '3px 8px', borderRadius: 7, fontSize: '0.62rem', fontWeight: 700, border: 'none',
                      display: 'flex', alignItems: 'center', gap: 4,
                      cursor: isAnalyzed || isAnalyzing ? 'not-allowed' : 'pointer',
                      background: isAnalyzed ? '#ecfdf5' : isAnalyzing ? STONE100 : SAP,
                      color: isAnalyzed ? '#065f46' : isAnalyzing ? STONE400 : '#fff',
                    }}
                  >
                    {isAnalyzed ? <><CheckCircle2 size={10} /> Done</> : isAnalyzing ? 'Analyzing…' : <><Sparkles size={10} /> Analyze</>}
                  </button>
                  <IconButton onClick={() => onOpenReport(report.file_url)} Icon={ExternalLink} title="Open" />
                  <IconButton onClick={() => onDownloadReport(report.file_url)} Icon={Download} title="Download" />
                  <IconButton onClick={() => void onDeleteReport(report.id)} Icon={Trash2} hoverRed title="Delete" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DoctorPatientReports;
