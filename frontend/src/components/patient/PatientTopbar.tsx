import React, { useState } from 'react';
import { Search, Bell, Pill, LogOut, ChevronDown } from 'lucide-react';
import { AuthUser, Notification } from '../../api';

interface PatientTopbarProps {
  user: AuthUser;
  notifications: Notification[];
  showNotifications?: boolean;
  setShowNotifications?: (show: boolean) => void;
  onOpenNotifications?: () => void;
  onOpenMedicineBox: () => void;
  onSignOut: () => void;
  onSearch?: (query: string) => void;
  onMarkNotificationRead?: (n: Notification) => void;
  onRefreshNotifications?: () => Promise<void>;
}

const SAP = '#142E1F';
const BORDER = '#E8E7E0';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE400 = '#A8A29E';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE800 = '#292524';

export const PatientTopbar: React.FC<PatientTopbarProps> = ({
  user,
  notifications,
  showNotifications: controlledShowNotifications,
  setShowNotifications: controlledSetShowNotifications,
  onOpenNotifications,
  onOpenMedicineBox,
  onSignOut,
  onSearch,
  onMarkNotificationRead,
  onRefreshNotifications,
}) => {
  const [internalShowNotifications, setInternalShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const showNotifications = controlledShowNotifications !== undefined ? controlledShowNotifications : internalShowNotifications;
  const setShowNotifications = controlledSetShowNotifications || setInternalShowNotifications;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="pt-v2-topbar">
      {/* Search Input Container */}
      <div style={{ position: 'relative', maxWidth: '36rem', width: '100%' }}>
        <Search
          size={16}
          color={STONE500}
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          placeholder="Search medicines, reports, or ask a question..."
          onChange={(e) => onSearch?.(e.target.value)}
          style={{
            width: '100%',
            height: 38,
            borderRadius: 999,
            backgroundColor: 'rgba(238, 235, 226, 0.7)',
            border: '1px solid transparent',
            paddingLeft: 40,
            paddingRight: 48,
            fontSize: '0.83rem',
            color: STONE800,
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
          onFocus={e => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#c5c1b2';
          }}
          onBlur={e => {
            e.currentTarget.style.backgroundColor = 'rgba(238, 235, 226, 0.7)';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        />
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <kbd style={{
            fontSize: '0.68rem', fontWeight: 600, color: STONE500,
            background: 'rgba(223, 219, 205, 0.8)', border: '1px solid rgba(203, 206, 203, 0.4)',
            padding: '2px 6px', borderRadius: 4
          }}>⌘K</kbd>
        </span>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        {/* Medicine Info Pill */}
        <button
          type="button"
          onClick={onOpenMedicineBox}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 0.85rem', borderRadius: 999,
            background: '#eaf2eb', border: '1px solid #d6e5d8',
            color: '#1e3e2a', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#deecdf')}
          onMouseLeave={e => (e.currentTarget.style.background = '#eaf2eb')}
        >
          <Pill size={14} color="#3b7e53" />
          <span>Medicine Info</span>
        </button>

        {/* Notification Bell with Dropdown Pop-up */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            id="patient-notifications-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
              onOpenNotifications?.();
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: 'none',
              background: showNotifications ? '#eaf2eb' : 'transparent',
              color: showNotifications ? SAP : STONE600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s',
            }}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#16a34a',
                  border: '2px solid #fff',
                }}
              />
            )}
          </button>

          {/* Notifications dropdown popup */}
          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 44,
                width: 320,
                background: '#FFFFFF',
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                boxShadow: '0 10px 30px rgba(20, 46, 31, 0.12)',
                zIndex: 100,
                padding: '0.75rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  paddingBottom: '0.4rem',
                  borderBottom: `1px solid ${STONE100}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: SAP,
                    }}
                  >
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#16a34a',
                        background: '#dcfce7',
                        padding: '1px 6px',
                        borderRadius: 999,
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {onRefreshNotifications && (
                  <button
                    onClick={() => void onRefreshNotifications()}
                    style={{
                      border: 'none',
                      background: 'none',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: STONE500,
                      cursor: 'pointer',
                    }}
                  >
                    Refresh
                  </button>
                )}
              </div>

              <div
                style={{
                  maxHeight: 240,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => onMarkNotificationRead?.(n)}
                      style={{
                        padding: '0.55rem 0.7rem',
                        borderRadius: 10,
                        border: `1px solid ${n.is_read ? STONE100 : '#bbf7d0'}`,
                        background: n.is_read ? STONE50 : '#f0fdf4',
                        cursor: 'pointer',
                        fontSize: '0.74rem',
                        color: n.is_read ? STONE600 : SAP,
                        fontWeight: n.is_read ? 400 : 600,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.6rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 700,
                            color: n.is_read ? STONE500 : '#16a34a',
                          }}
                        >
                          {n.type || 'Alert'}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: STONE400 }}>
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ lineHeight: 1.35 }}>{n.message}</div>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: STONE500, fontSize: '0.75rem', padding: '1rem 0', margin: 0 }}>
                    No notifications yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setShowUserMenu((prev) => !prev);
              setShowNotifications(false);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem',
              padding: '0.25rem 0.5rem', border: 'none', background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 999, background: SAP,
              color: '#fff', fontWeight: 600, fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: STONE800 }}>{user.name}</span>
            <ChevronDown size={14} color={STONE500} />
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute', right: 0, marginTop: '0.5rem', width: 200,
              background: '#FFFFFF', borderRadius: 16, padding: '0.5rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: `1px solid ${BORDER}`,
              zIndex: 50
            }}>
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontWeight: 600, color: SAP, fontSize: '0.83rem' }}>{user.name}</div>
                <div style={{ fontSize: '0.72rem', color: STONE500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
              </div>
              <button
                type="button"
                onClick={() => { setShowUserMenu(false); onSignOut(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.75rem', borderRadius: 10, border: 'none',
                  background: 'transparent', color: '#DC2626', fontSize: '0.8rem',
                  fontWeight: 600, cursor: 'pointer', marginTop: '0.25rem'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={14} />
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
