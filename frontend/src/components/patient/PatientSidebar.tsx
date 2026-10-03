import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Pill,
  Clock,
  Activity,
  MessageSquare,
  QrCode,
  Settings,
  AlertCircle,
  HelpCircle,
  Shield,
  Phone,
  MapPin,
  User,
  HeartPulse,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { PatientProfile, AuthUser } from '../../api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface PatientSidebarProps {
  user: AuthUser;
  patientProfile: PatientProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenQR: () => void;
  onOpenMedicineBox: () => void;
  onOpenIntake: () => void;
  unreadCount?: number;
}

export const PatientSidebar: React.FC<PatientSidebarProps> = ({
  user,
  patientProfile,
  activeTab,
  setActiveTab,
  onOpenQR,
  onOpenMedicineBox,
  onOpenIntake,
  unreadCount = 0,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'appointments', label: 'My Appointments', icon: Calendar },
    { id: 'records', label: 'Health Records', icon: FileText },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'emergency', label: 'Emergency', icon: AlertCircle },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <aside className="w-64 xl:w-72 bg-[#FFFFFF] border-r border-[#E8ECE7] flex flex-col justify-between h-screen sticky top-0 overflow-y-auto select-none p-4 xl:p-5 z-20">
      <div className="space-y-6">
        
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-8 h-8 rounded-xl bg-[#142A1F] flex items-center justify-center text-white shadow-sm">
            <HeartPulse className="w-4 h-4 text-[#86EFAC]" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-[#142A1F] block leading-tight">MedAssist</span>
            <span className="text-[11px] font-medium text-[#6B8576] block">Patient Portal</span>
          </div>
        </div>

        {/* Patient Profile Card Header */}
        <div className="bg-[#F6F8F5] border border-[#E6EBE5] rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-[#D7E6DB] text-[#1B382B] flex items-center justify-center font-bold text-lg border border-[#C5D9CB]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#142A1F] leading-snug">{user.name}</h3>
              <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-[#E5EFE7] text-[#224A33] text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span>Active Patient</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E3E8E2]">
            <div>
              <span className="text-[#7A9183] block text-[10px] uppercase font-semibold">Age</span>
              <strong className="text-[#142A1F] font-bold">{patientProfile?.age || '32'}</strong>
            </div>
            <div>
              <span className="text-[#7A9183] block text-[10px] uppercase font-semibold">Gender</span>
              <strong className="text-[#142A1F] font-bold">{patientProfile?.gender || 'Female'}</strong>
            </div>
          </div>

          {/* Quick contact info */}
          <div className="mt-2.5 pt-2.5 border-t border-[#E3E8E2] space-y-1.5 text-[11px] text-[#4A6354]">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-[#7A9183]" />
              <span>{user.phone || '+1 555 319 8820'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-[#7A9183]" />
              <span className="truncate">{patientProfile?.address || '742 Evergreen Terrace, CA'}</span>
            </div>
          </div>

          {/* Allergies & Chronic Conditions alerts */}
          <div className="mt-3 space-y-1.5">
            <div className="p-2 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5]/60 text-[11px] text-[#991B1B]">
              <div className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-[#DC2626]" />
                <span>Allergies</span>
              </div>
              <p className="mt-0.5 font-medium leading-tight">{patientProfile?.allergies || 'Penicillin, Peanuts, Sulfa'}</p>
            </div>

            <div className="p-2 rounded-xl bg-[#F4F7F4] border border-[#E0E8E1] text-[11px] text-[#2C4A38]">
              <span className="font-bold block text-[10px] text-[#637D6C] uppercase">Chronic Conditions</span>
              <p className="mt-0.5 font-medium leading-tight">{patientProfile?.chronic_conditions || 'Mild Persistent Asthma, Stage 1 HTN'}</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#142A1F] text-white shadow-sm'
                    : 'text-[#4A6354] hover:bg-[#F2F6F3] hover:text-[#142A1F]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#86EFAC]' : 'text-[#6A8574]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#10B981] text-white text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Emergency Access Box & Settings */}
      <div className="pt-4 space-y-3 border-t border-[#E8ECE7]">
        {/* Emergency Access Card */}
        <div className="bg-[#FEF5F5] border border-[#FED7D7] rounded-2xl p-3 text-center relative">
          <div className="w-8 h-8 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mx-auto mb-1.5">
            <QrCode className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-xs text-[#991B1B]">Emergency Access</h4>
          <p className="text-[10px] text-[#7F1D1D] mt-0.5 leading-snug">
            Show your QR code to healthcare providers for instant access.
          </p>
          <button
            id="patient-show-qr-btn"
            onClick={onOpenQR}
            className="mt-2 w-full py-1.5 px-3 rounded-xl bg-[#142A1F] hover:bg-[#0E1F16] text-white text-[11px] font-medium transition-colors"
          >
            Show QR Code
          </button>
        </div>

        {/* Bottom Support Link */}
        <div className="flex items-center justify-between text-[11px] text-[#6A8574] px-1">
          <button className="flex items-center gap-1.5 hover:text-[#142A1F] transition-colors">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-[#142A1F] transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-[#142A1F] transition-colors">
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default PatientSidebar;
