import React from 'react';
import { Sparkles } from 'lucide-react';
import { AISummary } from '../../api';
import { formatSummary } from '../../utils/formatters';

const SAP = '#142E1F';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';

interface DoctorSoapSummaryProps {
  doctorSummary: AISummary | null;
}

export const DoctorSoapSummary: React.FC<DoctorSoapSummaryProps> = ({ doctorSummary }) => {
  if (!doctorSummary) return null;

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: `1px solid ${STONE100}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={14} color={SAP} />
          </div>
          <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: SAP, fontSize: '0.95rem' }}>AI Clinical SOAP Summary</span>
        </div>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#065f46', background: '#ecfdf5', padding: '2px 8px', borderRadius: 999, border: '1px solid #a7f3d0' }}>
          Generated from Visit
        </span>
      </div>

      {/* Content */}
      <div style={{ background: STONE50, border: `1px solid ${STONE200}`, borderRadius: 10, padding: '0.85rem', fontSize: '0.78rem', color: '#44403C', lineHeight: 1.65, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
        {formatSummary(doctorSummary)}
      </div>
    </div>
  );
};

export default DoctorSoapSummary;
