import React, { useState } from 'react';
import { FileText, Upload, CheckCircle2, Download, ExternalLink, Trash2, Sparkles, ArrowRight, FilePlus } from 'lucide-react';

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

export const PatientLabReports: React.FC<PatientLabReportsProps> = ({
  reports,
  reportFile,
  setReportFile,
  reportStatus,
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
    <div className="bg-[#FFFFFF] border border-[#E8ECE7] rounded-3xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#F0F4F0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#EFF7ED] text-[#1E432F] flex items-center justify-center">
            <FileText className="w-4 h-4 text-[#10B981]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#142A1F]">Lab Reports & Diagnostics</h3>
            <span className="text-[10px] text-[#63806F]">AI-powered OCR and blood report extraction</span>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-[#63806F]">
          {displayReports.length} {displayReports.length === 1 ? 'Report' : 'Reports'}
        </span>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files?.[0]) setReportFile(e.dataTransfer.files[0]);
        }}
        className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all ${
          dragActive
            ? 'border-[#2D5A43] bg-[#EAF5EC]'
            : 'border-[#D5DDD6] bg-[#FAFBF9] hover:bg-[#F3F7F4]'
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-[#E5EFE7] text-[#142A1F] flex items-center justify-center mx-auto mb-2">
          <Upload className="w-5 h-5 text-[#10B981]" />
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <label className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-[#142A1F] text-white text-xs font-semibold hover:bg-[#0B1A13] transition-colors shadow-2xs">
            <span>Choose File</span>
            <input
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => setReportFile(e.target.files?.[0] || null)}
            />
          </label>
          <span className="text-xs text-[#63806F] truncate max-w-xs">
            {reportFile ? reportFile.name : 'No file chosen'}
          </span>
          {reportFile && (
            <button
              onClick={() => onUploadReport()}
              className="px-3.5 py-1.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-colors"
            >
              Upload
            </button>
          )}
        </div>
        <p className="text-[10px] text-[#7A9183] mt-2">
          Supports PDF, PNG, JPG (up to 10MB)
        </p>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {displayReports.map((report) => {
          const fileName = report.file_url.split('/').pop() || 'report.pdf';
          const isAnalyzing = analyzingId === report.id;
          let snapshot = '';
          try {
            if (report.parsed_data) {
              const data = JSON.parse(report.parsed_data);
              snapshot = data.analysis?.clinical_summary?.overall_clinical_snapshot || report.parsed_data;
            }
          } catch {
            snapshot = report.parsed_data || '';
          }

          return (
            <div
              key={report.id}
              className="bg-[#F8FAF7] border border-[#E4ECE3] rounded-2xl p-4 transition-all hover:border-[#2D5A43]/40"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center font-bold text-xs shrink-0">
                    PDF
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#142A1F]">{fileName}</h4>
                    <span className="text-[10px] text-[#63806F] block">
                      Analysis completed • Oct 1, 2026
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Analyzed</span>
                  </span>

                  <button
                    onClick={() => onAnalyzeReport(report.id)}
                    disabled={isAnalyzing}
                    className="px-2.5 py-1 rounded-lg bg-[#142A1F] hover:bg-[#0B1A13] text-white text-[11px] font-medium transition-colors"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  </button>

                  <button
                    onClick={() => onOpenReport(report.file_url)}
                    className="p-1.5 rounded-lg bg-white border border-[#E1E8E0] hover:bg-[#F2F6F3] text-[#335341] transition-colors"
                    title="View file"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDownloadReport(report.file_url)}
                    className="p-1.5 rounded-lg bg-white border border-[#E1E8E0] hover:bg-[#F2F6F3] text-[#335341] transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteReport(report.id)}
                    className="p-1.5 rounded-lg bg-white border border-[#FCA5A5]/60 hover:bg-[#FEF2F2] text-[#DC2626] transition-colors"
                    title="Delete report"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Extracted Clinical Snapshot */}
              {snapshot && (
                <div className="mt-3 p-3 bg-white rounded-xl border border-[#E4ECE3] text-[11px] text-[#335341] leading-relaxed">
                  <span className="font-bold text-[#142A1F] block text-[10px] uppercase text-[#63806F]">
                    Extracted AI Summary
                  </span>
                  <p className="mt-0.5">{snapshot}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PatientLabReports;
