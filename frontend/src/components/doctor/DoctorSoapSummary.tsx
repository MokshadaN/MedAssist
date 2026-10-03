import React from 'react';
import { AISummary } from '../../api';
import { formatSummary } from '../../utils/formatters';

interface DoctorSoapSummaryProps {
  doctorSummary: AISummary | null;
}

export const DoctorSoapSummary: React.FC<DoctorSoapSummaryProps> = ({ doctorSummary }) => {
  return (
    <section className="panel wide">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Analysis</div>
          <h2>SOAP Summary</h2>
        </div>
      </div>
      <pre className="code-block">{formatSummary(doctorSummary)}</pre>
    </section>
  );
};

export default DoctorSoapSummary;
