import React, { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Activity, AlertCircle, TrendingUp } from 'lucide-react';
import { api, MedicalMetric } from '../api';

interface HealthMetricsChartProps {
  patientId: string;
  token: string;
}

const HealthMetricsChart: React.FC<HealthMetricsChartProps> = ({ patientId, token }) => {
  const [metrics, setMetrics] = useState<MedicalMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedParam, setSelectedParam] = useState<string>('');
  const [availableParams, setAvailableParams] = useState<string[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        // Fetch all metrics first to get available parameters
        const data = await api.getPatientMetrics(patientId, null, token);
        setMetrics(data);
        
        const params = Array.from(new Set(data.map(m => m.parameter)));
        setAvailableParams(params);
        
        if (params.length > 0 && !selectedParam) {
          setSelectedParam(params[0]);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    if (patientId && token) {
      fetchMetrics();
    }
  }, [patientId, token]);

  const chartData = metrics
    .filter(m => m.parameter === selectedParam && m.value !== null)
    .map(m => ({
      date: new Date(m.measured_at).toLocaleDateString(),
      value: m.value,
      raw: m.raw_value,
      units: m.units
    }))
    .reverse(); // Older dates first for the chart

  if (loading) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center animate-pulse">
        <Activity className="text-blue-400 animate-spin mb-4" size={32} />
        <p className="text-blue-200">Loading health trends...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 border-red-500/30 flex items-center gap-4">
        <AlertCircle className="text-red-400" size={24} />
        <p className="text-red-200">{error}</p>
      </div>
    );
  }

  if (availableParams.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <TrendingUp className="mx-auto text-slate-500 mb-4" size={48} />
        <h3 className="text-xl font-semibold text-slate-300">No Health Trends Yet</h3>
        <p className="text-slate-500 mt-2">Upload and analyze medical reports to see your health data visualized here.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-blue-400" size={24} />
            Health Metrics Timeline
          </h3>
          <p className="text-slate-400 text-sm mt-1">Visualize your lab results over time</p>
        </div>
        
        <select 
          value={selectedParam}
          onChange={(e) => setSelectedParam(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-800 transition-colors"
        >
          {availableParams.map(param => (
            <option key={param} value={param}>{param}</option>
          ))}
        </select>
      </div>

      <div className="h-[300px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff'
              }}
              itemStyle={{ color: '#60a5fa' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              name={selectedParam}
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#1e293b' }}
              activeDot={{ r: 8, strokeWidth: 0 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="text-blue-400 mt-0.5" size={18} />
        <p className="text-blue-200 text-sm leading-relaxed">
          Showing <span className="font-bold text-white">{selectedParam}</span> history. 
          Values are automatically extracted from your analyzed medical reports.
        </p>
      </div>
    </div>
  );
};

export default HealthMetricsChart;
