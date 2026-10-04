import React from 'react';
import { Pill, ChevronRight } from 'lucide-react';
import { Prescription } from '../../api';

interface PatientPrescriptionsListProps {
  prescriptions: Prescription[];
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
  padding: '0.85rem 0.95rem',
  borderRadius: 12,
  border: '1px solid #edebe2',
  backgroundColor: '#fdfdfb',
  cursor: 'pointer',
};

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
    <div style={cardStyle}>
      <div>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pill size={16} color="#292524" />
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#292524', margin: 0 }}>Active Prescriptions</h3>
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); }}
            style={{ fontSize: '0.75rem', fontWeight: 500, color: '#78716C', textDecoration: 'none' }}
          >
            View all →
          </a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item, idx) => (
            <div key={idx} style={itemCardStyle}>
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
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Pill size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.83rem', fontWeight: 600, color: '#292524', margin: 0, lineHeight: 1.2 }}>
                    {item.name} <span style={{ fontWeight: 400, color: '#78716C' }}>({item.generic})</span>
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: '#78716C', marginTop: 2, margin: 0 }}>{item.dosage}</p>
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
                  justifyContent: 'center',
                  color: '#78716C',
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
