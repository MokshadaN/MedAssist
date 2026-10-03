import React, { useState } from 'react';
import { Activity, ChevronDown, TrendingUp, Info } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

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
    <div className="bg-[#FFFFFF] border border-[#E8ECE7] rounded-3xl p-6 shadow-sm space-y-5">
      {/* Header with Metric & Range Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0F4F0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#EFF7ED] text-[#1E432F] flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#10B981]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#142A1F]">Health Metrics Timeline</h3>
            <span className="text-[10px] text-[#63806F]">Visualize lab results & vital signs over time</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="h-9 px-3 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] text-xs font-semibold text-[#142A1F] focus:border-[#2D5A43] focus:outline-none"
          >
            <option value="Systolic BP">Systolic BP</option>
            <option value="Diastolic BP">Diastolic BP</option>
            <option value="Heart Rate">Heart Rate (BPM)</option>
            <option value="Blood Glucose">Fasting Glucose</option>
            <option value="SpO2">SpO2 Oxygen (%)</option>
          </select>

          {/* Time range pills */}
          <div className="flex items-center p-1 bg-[#F4F6F2] rounded-xl text-[10px] font-bold text-[#63806F]">
            {['W', 'M', '3M', '6M', '1Y'].map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-2 py-1 rounded-lg transition-all ${
                  selectedRange === range
                    ? 'bg-white text-[#142A1F] shadow-2xs font-extrabold'
                    : 'hover:text-[#142A1F]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#7A9183', fontSize: 10 }}
              axisLine={{ stroke: '#E5ECE5' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 180]}
              tick={{ fill: '#7A9183', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#142A1F',
                borderRadius: '12px',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 'bold',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
              }}
              formatter={(val: any) => [`${val} mmHg`, 'Systolic BP']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#059669"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorMetric)"
              dot={{ stroke: '#059669', strokeWidth: 2, fill: '#FFFFFF', r: 4 }}
              activeDot={{ stroke: '#142A1F', strokeWidth: 3, fill: '#86EFAC', r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary & Caption */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-[#F0F4F0]">
        <div className="p-3 bg-[#F8FAF7] border border-[#E6ECE4] rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-[#7A9183] block">Average</span>
          <div className="font-bold text-sm text-[#142A1F] mt-0.5">124 mmHg</div>
        </div>
        <div className="p-3 bg-[#F8FAF7] border border-[#E6ECE4] rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-[#7A9183] block">Highest Reading</span>
          <div className="font-bold text-sm text-[#142A1F] mt-0.5">132 mmHg</div>
        </div>
        <div className="p-3 bg-[#F8FAF7] border border-[#E6ECE4] rounded-2xl col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-[#7A9183] block">Status</span>
          <div className="font-bold text-xs text-[#059669] mt-0.5 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Optimal Range</span>
          </div>
        </div>
      </div>

      {/* Info Footnote */}
      <div className="flex items-center gap-2 text-[11px] text-[#63806F] pt-1">
        <Info className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
        <span>Values are automatically extracted and plotted from your analyzed medical reports.</span>
      </div>
    </div>
  );
};

export default PatientHealthChart;
