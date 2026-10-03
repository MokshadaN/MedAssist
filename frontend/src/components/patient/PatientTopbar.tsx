import React, { useState } from 'react';
import { Search, Bell, Pill, LogOut, ChevronDown, User, Sparkles } from 'lucide-react';
import { AuthUser, Notification } from '../../api';

interface PatientTopbarProps {
  user: AuthUser;
  notifications: Notification[];
  onOpenNotifications: () => void;
  onOpenMedicineBox: () => void;
  onSignOut: () => void;
  onSearch?: (query: string) => void;
}

export const PatientTopbar: React.FC<PatientTopbarProps> = ({
  user,
  notifications,
  onOpenNotifications,
  onOpenMedicineBox,
  onSignOut,
  onSearch,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="w-full bg-[#FFFFFF] border-b border-[#E8ECE7] px-6 lg:px-8 py-3.5 flex items-center justify-between sticky top-0 z-10 select-none">
      {/* Search Input Bar */}
      <div className="flex-1 max-w-xl relative">
        <Search className="w-4 h-4 text-[#8AA293] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search symptoms, medications, doctors, or anything..."
          onChange={(e) => onSearch?.(e.target.value)}
          className="w-full h-10 pl-10 pr-12 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-xs text-[#142A1F] placeholder:text-[#8AA293] transition-all"
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#8AA293] bg-[#E5EBE5] px-1.5 py-0.5 rounded border border-[#D5DDD6]">
          ⌘K
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 ml-4">
        {/* Medicine Info Quick Pill */}
        <button
          onClick={onOpenMedicineBox}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#EAF3EC] hover:bg-[#DDEEE1] text-[#1E432F] text-xs font-semibold border border-[#D2E4D6] transition-colors"
        >
          <Pill className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Medicine Info</span>
        </button>

        {/* Notifications Bell */}
        <button
          id="patient-notifications-btn"
          onClick={onOpenNotifications}
          className="relative p-2.5 rounded-xl bg-[#F4F6F2] hover:bg-[#EAEFE8] text-[#335341] border border-[#E3E8E3] transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-[#F4F6F2] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#142A1F] text-white flex items-center justify-center font-bold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-[#142A1F] hidden sm:inline-block">{user.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8AA293]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl p-1.5 shadow-lg border border-[#E3E8E3] text-xs z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-[#EDF2EE]">
                <div className="font-semibold text-[#142A1F] truncate">{user.name}</div>
                <div className="text-[10px] text-[#7A9183] truncate">{user.email}</div>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); onSignOut(); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#DC2626] hover:bg-[#FEF2F2] transition-colors mt-1 font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default PatientTopbar;
