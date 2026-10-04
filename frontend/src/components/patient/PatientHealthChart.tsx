import React, { useState } from 'react';
import { Activity, ChevronDown, Info } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const SAP = '#142E1F';
const BORDER = '#E8E7E0';
const STONE500 = '#78716C';
const STONE800 = '#292524';

export const PatientHealthChart: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState('Systolic BP');
  const [selectedRange, setSelectedRange] = useState('M');

  const chartData = [
    { date: 'Sep 19', value: 92, label: '92 mmHg' },
    { date: 'Sep 23', value: 114, label: '114 mmHg' },
    { date: 'Sep 26', value: 102, label: '102 mmHg' },
    { date: 'Sep 27', value: 128, label: '128 mmHg' },
    { date: 'Sep 29', value: 126, label: '126 mmHg' },
    { date: 'Oct 1', value: 127, label: '127 mmHg' },
    { date: 'Oct 3', value: 128, label: '128 mmHg' },
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} color={STONE800} />
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: STONE800, margin: 0 }}>Health Metrics</h3>
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); }}
            style={{ fontSize: '0.75rem', fontWeight: 500, color: STONE500, textDecoration: 'none' }}
          >
            View trends →
          </a>
        </div>

        {/* Controls: Metric Dropdown & Range Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #f1eee6',
          }}
        >
          {/* Dropdown Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#f6f5f0',
              border: '1px solid #e5e2d6',
              padding: '0.25rem 0.65rem',
              borderRadius: 8,
              fontSize: '0.75rem',
              fontWeight: 500,
              color: STONE800,
              cursor: 'pointer',
            }}
          >
            <span>{selectedMetric}</span>
            <ChevronDown size={12} color={STONE500} />
          </div>

          {/* Time Range Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 500, color: STONE500 }}>
            {['W', 'M', '3M', '6M', '1Y'].map((range) => {
              const active = selectedRange === range;
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setSelectedRange(range)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: active ? SAP : 'transparent',
                    color: active ? '#FFFFFF' : STONE500,
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {range}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart Area */}
        <div style={{ height: 140, width: '100%', paddingTop: '1rem', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="ptMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b7e53" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b7e53" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1eee6" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: STONE500, fontSize: 9 }}
                axisLine={{ stroke: '#f1eee6' }}
                tickLine={false}
              />
              <YAxis
                domain={[40, 160]}
                tick={{ fill: STONE500, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: SAP,
                  borderRadius: '8px',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
                formatter={(val: any) => [`${val} mmHg`, 'Systolic BP']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b7e53"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#ptMetric)"
                dot={{ stroke: '#3b7e53', strokeWidth: 2, fill: '#FFFFFF', r: 3 }}
                activeDot={{ stroke: SAP, strokeWidth: 2, fill: '#6ee7b7', r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Stats */}
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #f1eee6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: '0.25rem',
            paddingRight: '0.25rem',
          }}
        >
          {/* Average BP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📊</span>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: STONE800, lineHeight: 1 }}>124 mmHg</div>
              <div style={{ fontSize: '0.65rem', color: STONE500, fontWeight: 500 }}>Average</div>
            </div>
          </div>

          {/* Highest BP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, background: '#fce8e6', color: '#d9534f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
              ↑
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: STONE800, lineHeight: 1 }}>132 mmHg</div>
              <div style={{ fontSize: '0.65rem', color: STONE500, fontWeight: 500 }}>Highest</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientHealthChart;
