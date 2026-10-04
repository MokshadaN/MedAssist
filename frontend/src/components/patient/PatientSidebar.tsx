import React from 'react';
import {
  LayoutGrid,
  Calendar,
  FileText,
  Pill,
  Clock,
  Activity,
  MessageSquare,
  QrCode,
  Settings,
  AlertCircle,
  Sprout,
  Users,
  Shield,
  Phone,
  MapPin,
  Check
} from 'lucide-react';
import { PatientProfile, AuthUser } from '../../api';

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

const SAP = '#142E1F';
const SAP_HOVER = '#0E2116';
const BORDER = '#E8E7E0';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE800 = '#292524';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'appointments', label: 'Visits', icon: Calendar },
  { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
  { id: 'reports', label: 'Lab Reports', icon: FileText },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'reminders', label: 'Reminders', icon: Clock },
  { id: 'metrics', label: 'Health Metrics', icon: Activity },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
];

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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
      {/* Top Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.15rem 0.5rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: SAP, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sprout size={18} color="#6ee7b7" />
          </div>
          <div>
            <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.05rem', fontWeight: 700, color: SAP, lineHeight: 1.1 }}>MedAssist</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: STONE500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Patient Portal</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            const badge = id === 'messages' && unreadCount > 0 ? unreadCount : undefined;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '0.75rem', padding: '0.55rem 0.85rem', borderRadius: 12, border: 'none',
                  cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600, textAlign: 'left', width: '100%',
                  background: active ? SAP : 'transparent',
                  color: active ? '#fff' : STONE600,
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = STONE100; (e.currentTarget as HTMLButtonElement).style.color = STONE800; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = STONE600; } }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Icon size={15} />
                  {label}
                </span>
                {badge !== undefined && (
                  <span style={{
                    padding: '0.1rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, borderRadius: 999,
                    background: active ? 'rgba(255,255,255,0.2)' : '#E4ECE5',
                    color: active ? '#fff' : SAP,
                  }}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Section: Emergency Access Card & Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '1rem', borderTop: `1px solid ${BORDER}` }}>
        {/* Emergency Access Card */}
        <div style={{
          background: '#ebe8de',
          borderRadius: 16,
          padding: '1rem',
          border: '1px solid #dfdcce',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dedad0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SAP }}>
            <QrCode size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.83rem', fontWeight: 700, color: SAP, lineHeight: 1.2 }}>Emergency Access</div>
            <div style={{ fontSize: '0.72rem', color: '#5b645e', marginTop: 2, lineHeight: 1.3 }}>
              Show your QR code to healthcare providers for instant access.
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenQR}
            style={{
              width: '100%',
              marginTop: '0.25rem',
              padding: '0.5rem',
              background: SAP,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = SAP_HOVER; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = SAP; }}
          >
            Show QR Code
          </button>
        </div>

        {/* Settings Button */}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.4rem 0.85rem',
            borderRadius: 10, border: 'none', background: 'transparent', color: STONE600,
            fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left'
          }}
        >
          <Settings size={15} /> Settings
        </button>
      </div>
    </div>
  );
};

export default PatientSidebar;
