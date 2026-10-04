import React, { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut } from 'lucide-react';
import { AuthUser, Notification } from '../../api';

interface DoctorTopbarProps {
  user: AuthUser;
  notifications: Notification[];
  showNotifications: boolean;
  setShowNotifications: React.Dispatch<React.SetStateAction<boolean>>;
  onSignOut: () => void;
  busy?: string;
  notificationStatus?: string;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  onRefreshNotifications?: () => Promise<void>;
  onMarkNotificationRead?: (notification: Notification) => void;
}

const SAP = '#142E1F';
const BORDER = '#E8E7E0';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE800 = '#292524';

export const DoctorTopbar: React.FC<DoctorTopbarProps> = ({
  user,
  notifications,
  showNotifications,
  setShowNotifications,
  onSignOut,
  searchQuery = '',
  setSearchQuery,
  onRefreshNotifications,
  onMarkNotificationRead,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const initial = user.name.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase();
  const displayName = user.name.startsWith('Dr.') ? user.name : `Dr. ${user.name}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 460 }}>
        <Search size={15} color={STONE500} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery?.(e.target.value)}
          placeholder="Search patients by name, phone, or ID..."
          style={{
            width: '100%', paddingLeft: 36, paddingRight: 50, paddingTop: 8, paddingBottom: 8,
            fontSize: '0.83rem', border: `1px solid ${STONE200}`, borderRadius: 12,
            background: STONE50, color: STONE800, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <kbd style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.62rem', fontWeight: 600, color: STONE500,
          background: STONE100, padding: '2px 6px', borderRadius: 5,
          border: `1px solid ${STONE200}`, fontFamily: 'inherit',
        }}>⌘ K</kbd>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        {/* Notification bell */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => { setShowNotifications(v => !v); setShowProfileMenu(false); }}
            style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', color: STONE600 }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '2px solid #fff' }} />
            )}
          </button>

          {/* Notifications dropdown */}
          {showNotifications && (
            <div style={{ position: 'absolute', right: 0, top: 44, width: 300, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 100, padding: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${STONE100}` }}>
                <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '0.85rem', color: SAP }}>Notifications</span>
                {onRefreshNotifications && (
                  <button onClick={() => void onRefreshNotifications()} style={{ border: 'none', background: 'none', fontSize: '0.7rem', fontWeight: 600, color: STONE500, cursor: 'pointer' }}>Refresh</button>
                )}
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {notifications.length > 0 ? notifications.map(n => (
                  <div key={n.id} onClick={() => onMarkNotificationRead?.(n)}
                    style={{ padding: '0.5rem 0.6rem', borderRadius: 10, border: `1px solid ${n.is_read ? STONE100 : '#a7f3d0'}`, background: n.is_read ? STONE50 : '#ecfdf5', cursor: 'pointer', fontSize: '0.72rem', color: n.is_read ? STONE600 : SAP, fontWeight: n.is_read ? 400 : 600 }}>
                    <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2 }}>{n.type || 'Alert'}</div>
                    {n.message}
                  </div>
                )) : (
                  <p style={{ textAlign: 'center', color: STONE500, fontSize: '0.75rem', padding: '0.75rem 0' }}>No notifications yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: STONE200 }} />

        {/* Profile trigger */}
        <div style={{ position: 'relative' }}>
          <div onClick={() => { setShowProfileMenu(v => !v); setShowNotifications(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: SAP, color: '#fff', fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px #E8E7E0' }}>
              {initial}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: STONE800 }}>{displayName}, MD</span>
              <ChevronDown size={13} color={STONE500} />
            </div>
          </div>

          {showProfileMenu && (
            <div style={{ position: 'absolute', right: 0, top: 44, width: 180, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 100, padding: '0.4rem' }}>
              <div style={{ padding: '0.4rem 0.6rem', borderBottom: `1px solid ${STONE100}`, marginBottom: '0.3rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: SAP, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                <div style={{ fontSize: '0.65rem', color: STONE500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
              <button
                type="button"
                onClick={() => { setShowProfileMenu(false); onSignOut(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '0.45rem 0.6rem', borderRadius: 9, border: 'none', background: 'none', fontSize: '0.78rem', fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorTopbar;
