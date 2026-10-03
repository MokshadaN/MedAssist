import React from 'react';
import { Calendar, Pill, AlertTriangle, Activity, ArrowRight, TrendingUp, HeartPulse, Sparkles, FileText, MessageSquare } from 'lucide-react';
import { AuthUser, Prescription, DoctorVisit } from '../../api';

interface PatientHeroBannerProps {
  user: AuthUser;
  visits: DoctorVisit[];
  prescriptions: Prescription[];
  reportCount: number;
  onNavigateTab: (tab: string) => void;
}

export const PatientHeroBanner: React.FC<PatientHeroBannerProps> = ({
  user,
  visits,
  prescriptions,
  reportCount,
  onNavigateTab,
}) => {
  const firstName = user.name.split(' ')[0] || user.name;
  const activeMedsCount = prescriptions.reduce((acc, p) => acc + (p.items?.length || 0), 0) || 3;

  return (
    <section className="space-y-4">
      {/* Top Banner with Foliage Graphic & Quote */}
      <div className="bg-[#FFFFFF] border border-[#E8ECE7] rounded-3xl p-6 lg:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
        
        {/* Left Greeting Text */}
        <div className="space-y-1.5 z-10 max-w-lg">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#63806F] block">
            Good Afternoon
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#142A1F] leading-tight font-display tracking-tight">
            {firstName}, <br />
            <span className="text-[#1E432F]">here's your health overview.</span>
          </h1>
          <p className="text-xs text-[#52705E] pt-1 leading-relaxed">
            Stay on top of your health. Your care, all in one place.
          </p>
        </div>

        {/* Center/Right Botanical Accent & Inspirational Card */}
        <div className="flex items-center gap-4 z-10 self-stretch md:self-auto justify-end">
          {/* Foliage Thumbnail Accent */}
          <div className="hidden lg:block w-36 h-28 relative overflow-hidden rounded-2xl">
            <img
              src="/assets/botanical_foliage.jpg"
              alt="Foliage"
              className="w-full h-full object-cover mix-blend-multiply brightness-95"
            />
          </div>

          {/* Quote Card */}
          <div className="bg-[#F8FAF7] border border-[#E1E8E0] rounded-2xl p-4 max-w-xs shadow-sm flex flex-col justify-between">
            <p className="text-xs italic text-[#254633] font-medium leading-relaxed">
              "Small steps today for a healthier tomorrow."
            </p>
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#E3EBE3] text-[10px] text-[#63806F]">
              <span className="font-semibold uppercase tracking-wider">Daily Wellness</span>
              <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
          </div>
        </div>

        {/* Decorative background light gradient */}
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-[#EEF5F0]/60 to-transparent pointer-events-none" />
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Next Appointment / Visits */}
        <div
          onClick={() => onNavigateTab('appointments')}
          className="bg-white border border-[#E6EBE5] hover:border-[#2D5A43]/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#EAF5EC] text-[#1E432F] flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#10B981]" />
            </div>
            <span className="text-[10px] font-bold text-[#10B981] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
              Upcoming
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[11px] text-[#6B8576] font-medium block">Next Appointment</span>
            <div className="font-bold text-sm text-[#142A1F] mt-0.5">Oct 5, 2026 • 10:01 AM</div>
          </div>
          <div className="flex items-center text-[10px] font-semibold text-[#2D5A43] pt-2 mt-2 border-t border-[#F0F4F0] group-hover:translate-x-0.5 transition-transform">
            <span>View calendar</span>
            <ArrowRight className="w-3 h-3 ml-1" />
          </div>
        </div>

        {/* Metric 2: Active Medications */}
        <div
          onClick={() => onNavigateTab('medications')}
          className="bg-white border border-[#E6EBE5] hover:border-[#2D5A43]/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#EFF7ED] text-[#1E432F] flex items-center justify-center">
              <Pill className="w-4 h-4 text-[#059669]" />
            </div>
            <span className="text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
              Active
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[11px] text-[#6B8576] font-medium block">Active Medications</span>
            <div className="font-bold text-2xl text-[#142A1F] mt-0.5">{activeMedsCount}</div>
          </div>
          <div className="flex items-center text-[10px] font-semibold text-[#2D5A43] pt-2 mt-2 border-t border-[#F0F4F0] group-hover:translate-x-0.5 transition-transform">
            <span>View details</span>
            <ArrowRight className="w-3 h-3 ml-1" />
          </div>
        </div>

        {/* Metric 3: Lab Reports / Alerts */}
        <div
          onClick={() => onNavigateTab('reports')}
          className="bg-white border border-[#E6EBE5] hover:border-[#2D5A43]/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3F2] text-[#DC2626] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
            </div>
            <span className="text-[10px] font-bold text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded-full border border-[#FCA5A5]">
              Alerts (1)
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[11px] text-[#6B8576] font-medium block">Diagnostic Reports</span>
            <div className="font-bold text-sm text-[#142A1F] mt-0.5">{reportCount || 1} Analyzed</div>
          </div>
          <div className="flex items-center text-[10px] font-semibold text-[#991B1B] pt-2 mt-2 border-t border-[#F0F4F0] group-hover:translate-x-0.5 transition-transform">
            <span>Requires attention</span>
            <ArrowRight className="w-3 h-3 ml-1" />
          </div>
        </div>

        {/* Metric 4: Health Score / Vitals */}
        <div
          onClick={() => onNavigateTab('records')}
          className="bg-white border border-[#E6EBE5] hover:border-[#2D5A43]/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#EBF6FD] text-[#0284C7] flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#0284C7]" />
            </div>
            <span className="text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-[#A7F3D0]">
              <TrendingUp className="w-2.5 h-2.5" />
              <span>+10%</span>
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[11px] text-[#6B8576] font-medium block">Overall Health Score</span>
            <div className="font-bold text-2xl text-[#142A1F] mt-0.5">78<span className="text-xs text-[#7A9183] font-normal"> / 100</span></div>
          </div>
          <div className="flex items-center text-[10px] font-semibold text-[#2D5A43] pt-2 mt-2 border-t border-[#F0F4F0] group-hover:translate-x-0.5 transition-transform">
            <span>View trends</span>
            <ArrowRight className="w-3 h-3 ml-1" />
          </div>
        </div>

      </div>
    </section>
  );
};

export default PatientHeroBanner;
