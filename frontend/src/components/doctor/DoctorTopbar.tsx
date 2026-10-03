import React from 'react';
import { Activity, Bell, LogOut, Search } from 'lucide-react';
import { AuthUser, Notification } from '../../api';

interface DoctorTopbarProps {
  user: AuthUser;
  notifications: Notification[];
  showNotifications: boolean;
  setShowNotifications: React.Dispatch<React.SetStateAction<boolean>>;
  onSignOut: () => void;
  busy?: string;
  notificationStatus?: string;
}

export const DoctorTopbar: React.FC<DoctorTopbarProps> = ({
  user,
  notifications,
  showNotifications,
  setShowNotifications,
  onSignOut,
}) => {
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="top-bar">
      <div className="search-box">
        <Search size={18} color="var(--text-secondary)" />
        <input placeholder="Search patients by name, phone, or ID..." />
      </div>

      <div className="top-user" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="secondary"
          style={{ borderRadius: '50%', width: 40, height: 40, padding: 0, position: 'relative' }}
          onClick={() => setShowNotifications((v) => !v)}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.65rem',
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
        <div className="user-avatar">{user.name.charAt(0)}</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Dr. {user.name}</div>
        <button
          className="ghost"
          onClick={onSignOut}
          style={{ color: 'var(--danger)', marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

export default DoctorTopbar;
