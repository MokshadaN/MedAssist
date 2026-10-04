import React, { useState, useEffect } from 'react';
import { Activity, ChevronDown } from 'lucide-react';
import { api, MedicalMetric } from '../../api';

const SAP = '#142E1F';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';
const STONE400 = '#A8A29E';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE700 = '#44403C';

interface DoctorHealthTrendsWidgetProps {
  patientId?: string;
  token?: string;
  refreshTrigger?: any;
}

const TABS = [
  { id: 'systolic' as const, label: 'Systolic BP' },
  { id: 'diastolic' as const, label: 'Diastolic BP' },
  { id: 'heartRate' as const, label: 'Heart Rate' },
];

const CHART_DATA = {
  systolic: {
    polygon: '35,72 90,62 145,74 200,60 255,52 305,62 305,110 35,110',
    polyline: '35,72 90,62 145,74 200,60 255,52 305,62',
    dots: [{ cx: 35, cy: 72 }, { cx: 90, cy: 62 }, { cx: 145, cy: 74 }, { cx: 200, cy: 60 }, { cx: 255, cy: 52, active: true }, { cx: 305, cy: 62 }],
    tooltipVal: '128 mmHg', tooltipDate: 'Sep 27, 2026',
  },
  diastolic: {
    polygon: '35,85 90,80 145,82 200,75 255,70 305,74 305,110 35,110',
    polyline: '35,85 90,80 145,82 200,75 255,70 305,74',
    dots: [{ cx: 35, cy: 85 }, { cx: 90, cy: 80 }, { cx: 145, cy: 82 }, { cx: 200, cy: 75 }, { cx: 255, cy: 70, active: true }, { cx: 305, cy: 74 }],
    tooltipVal: '82 mmHg', tooltipDate: 'Sep 27, 2026',
  },
  heartRate: {
    polygon: '35,68 90,75 145,65 200,72 255,58 305,64 305,110 35,110',
    polyline: '35,68 90,75 145,65 200,72 255,58 305,64',
    dots: [{ cx: 35, cy: 68 }, { cx: 90, cy: 75 }, { cx: 145, cy: 65 }, { cx: 200, cy: 72 }, { cx: 255, cy: 58, active: true }, { cx: 305, cy: 64 }],
    tooltipVal: '74 bpm', tooltipDate: 'Sep 27, 2026',
  },
};

const RANGES = ['Last 30 days', 'Last 3 months', 'Last 6 months', 'Last 1 year'];
const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

export const DoctorHealthTrendsWidget: React.FC<DoctorHealthTrendsWidgetProps> = ({
  patientId,
  token,
  refreshTrigger,
}) => {
  const [selectedTab, setSelectedTab] = useState<'systolic' | 'diastolic' | 'heartRate'>('systolic');
  const [timeRange, setTimeRange] = useState('Last 6 months');
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const [metrics, setMetrics] = useState<MedicalMetric[]>([]);

  useEffect(() => {
    if (patientId && token) {
      api.getPatientMetrics(patientId, null, token).then(setMetrics).catch(() => {});
    }
  }, [patientId, token, refreshTrigger]);

  const chart = CHART_DATA[selectedTab];

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={16} color={SAP} />
          <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: SAP, fontSize: '0.95rem' }}>Health Trends</span>
        </div>

        {/* Range picker */}
        <div style={{ position: 'relative' }}>
          <button type="button"
            onClick={() => setShowRangeDropdown(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 500, color: STONE600, background: STONE50, border: `1px solid ${STONE200}`, borderRadius: 8, cursor: 'pointer' }}>
            {timeRange} <ChevronDown size={11} color={STONE400} />
          </button>
          {showRangeDropdown && (
            <div style={{ position: 'absolute', right: 0, top: 32, width: 130, background: '#fff', border: `1px solid ${STONE200}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 40, padding: '0.3rem 0' }}>
              {RANGES.map(r => (
                <button key={r} type="button"
                  onClick={() => { setTimeRange(r); setShowRangeDropdown(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.4rem 0.75rem', fontSize: '0.72rem', fontWeight: r === timeRange ? 700 : 400, color: r === timeRange ? SAP : STONE600, background: 'none', border: 'none', cursor: 'pointer' }}>
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metric tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {TABS.map(({ id, label }) => {
          const active = selectedTab === id;
          return (
            <button key={id} type="button" onClick={() => setSelectedTab(id)}
              style={{ padding: '0.25rem 0.65rem', borderRadius: 8, border: 'none', fontSize: '0.68rem', fontWeight: active ? 700 : 500, cursor: 'pointer', background: active ? SAP : 'transparent', color: active ? '#fff' : STONE600, transition: 'all 0.15s' }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', paddingTop: '1.25rem' }}>
        {/* Tooltip */}
        <div style={{ position: 'absolute', right: 40, top: 0, background: SAP, color: '#fff', fontSize: '0.62rem', padding: '3px 8px', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', pointerEvents: 'none', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>{chart.tooltipVal}</span>
          <span style={{ fontSize: '0.55rem', color: '#9ca3af' }}>{chart.tooltipDate}</span>
          <div style={{ width: 6, height: 6, background: SAP, transform: 'rotate(45deg)', marginTop: 2, marginBottom: -4 }} />
        </div>

        {/* SVG Area Chart */}
        <svg width="100%" height="128" viewBox="0 0 320 120" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={SAP} stopOpacity="0.22" />
              <stop offset="100%" stopColor={SAP} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[10, 45, 80, 110].map((y, i) => (
            <React.Fragment key={y}>
              <line x1="25" y1={y} x2="315" y2={y} stroke={i === 3 ? '#E5E7EB' : '#F0EFEA'} strokeWidth="1" />
              <text x={i === 3 ? 15 : i === 1 ? 5 : i === 2 ? 10 : 5} y={y + 4} fontSize="8" fill="#9CA3AF">
                {['180', '120', '60', '0'][i]}
              </text>
            </React.Fragment>
          ))}

          {/* Gradient fill */}
          <polygon points={chart.polygon} fill="url(#chartGrad)" />

          {/* Line */}
          <polyline points={chart.polyline} fill="none" stroke={SAP} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots */}
          {chart.dots.map((dot, idx) => (
            <circle key={idx} cx={dot.cx} cy={dot.cy} r={dot.active ? 4 : 3} fill={SAP} stroke={dot.active ? '#fff' : undefined} strokeWidth={dot.active ? 1.5 : undefined} />
          ))}
        </svg>

        {/* Month labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '1.5rem', paddingRight: '0.5rem', fontSize: '0.58rem', color: STONE400, fontWeight: 500, marginTop: 4 }}>
          {MONTHS.map(m => <span key={m}>{m}</span>)}
        </div>
      </div>
    </div>
  );
};

export default DoctorHealthTrendsWidget;
