import React from 'react';
import { LayoutGrid, Users, Calendar, MessageSquare, FileText, Pill, BarChart2, Settings, Shield, Award, Building, Check, Info, ArrowRight, Sprout, X, Edit2 } from 'lucide-react';
import { AuthUser, DoctorProfile } from '../../api';
import { FormEvent, useState } from 'react';

interface DoctorSidebarProps {
  user: AuthUser;
  doctorProfile: DoctorProfile | null;
  patientCount: number;
  profileForm: { phone: string; specialization: string };
  setProfileForm: React.Dispatch<React.SetStateAction<any>>;
  saveProfile: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  profileStatus: string;
  verifyStateCouncil: string;
  setVerifyStateCouncil: (val: string) => void;
  verifyLicenseNumber: string;
  setVerifyLicenseNumber: (val: string) => void;
  handleVerifyDoctorLicense: () => Promise<void>;
  isVerifyingLicense: boolean;
  verificationFeedback: { message: string; success: boolean } | null;
  activeNav?: string;
  setActiveNav?: (nav: string) => void;
}

const SAP = '#142E1F';
const SAP_HOVER = '#0E2116';
const BORDER = '#E8E7E0';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE700 = '#44403C';
const STONE800 = '#292524';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'messages', label: 'Messages', icon: MessageSquare, badge: 3 },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
];

export const DoctorSidebar: React.FC<DoctorSidebarProps> = ({
  user,
  doctorProfile,
  profileForm,
  setProfileForm,
  saveProfile,
  profileStatus,
  verifyStateCouncil,
  setVerifyStateCouncil,
  verifyLicenseNumber,
  setVerifyLicenseNumber,
  handleVerifyDoctorLicense,
  isVerifyingLicense,
  verificationFeedback,
  activeNav = 'dashboard',
  setActiveNav,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);

  const displayName = user.name.startsWith('Dr.') ? user.name : `Dr. ${user.name}`;
  const specialization = doctorProfile?.specialization || profileForm.specialization || 'Cardiology & Internal Medicine';
  const licenseNumber = doctorProfile?.license_number || 'MC-12345';
  const qualification = doctorProfile?.qualification || 'MBBS, MD (Cardiology), FACC';
  const stateCouncil = doctorProfile?.state_council || 'National Medical Commission';

  return (
    <>
      {/* Brand */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.25rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: SAP, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sprout size={18} color="#6ee7b7" />
          </div>
          <div>
            <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.05rem', fontWeight: 700, color: SAP, lineHeight: 1.1 }}>MedAssist</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: STONE500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Doctor Portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          {navItems.map(({ id, label, icon: Icon, badge }) => {
            const active = activeNav === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveNav?.(id)}
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

      {/* Footer: Settings + Credentials */}
      <div style={{ borderTop: `1px solid ${STONE200}`, paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          type="button"
          style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.4rem 0.85rem', borderRadius: 10, border: 'none', background: 'transparent', color: STONE600, fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left' }}
        >
          <Settings size={15} /> Settings
        </button>

        {/* Doctor Credentials Card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '1rem', border: `1px solid ${BORDER}`, boxShadow: '0 2px 10px -2px rgba(20,46,31,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', fontWeight: 700, color: '#065f46', background: '#ecfdf5', padding: '2px 8px', borderRadius: 999, border: '1px solid #a7f3d0' }}>
              <Check size={10} /> NMC Verified
            </span>
            <Info size={13} color={STONE500} style={{ cursor: 'pointer' }} />
          </div>

          <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '0.83rem', color: SAP, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
          <div style={{ fontSize: '0.72rem', color: STONE500, fontWeight: 500, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{specialization}</div>

          <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: `1px solid ${STONE100}`, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {[
              [Shield, `Reg. No. ${licenseNumber}`],
              [Award, qualification],
              [Building, stateCouncil],
            ].map(([Icon, text], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.67rem', color: STONE600, fontWeight: 500 }}>
                {/* @ts-ignore */}
                <Icon size={11} color={STONE500} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text as string}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            style={{ marginTop: '0.6rem', width: '100%', padding: '0.35rem', fontSize: '0.7rem', fontWeight: 600, color: STONE700, background: STONE50, border: `1px solid ${STONE200}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            Edit Profile <ArrowRight size={11} />
          </button>
        </div>
      </div>

      {/* Edit / Verify Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 20, maxWidth: 420, width: '100%', padding: '1.5rem', border: `1px solid ${BORDER}`, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowEditModal(false)} style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'none', cursor: 'pointer', color: STONE500 }}><X size={18} /></button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: SAP, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Edit2 size={14} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1rem', color: SAP }}>Doctor Profile</div>
                <div style={{ fontSize: '0.72rem', color: STONE500 }}>Update clinical info & verify with NMC</div>
              </div>
            </div>

            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[['Phone Number', 'phone', 'text', 'Enter contact phone'],
                ['Specialization', 'specialization', 'text', 'e.g. Cardiology']].map(([label, key, type, ph]) => (
                <div key={key as string}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: STONE600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label as string}</label>
                  <input
                    type={type as string}
                    value={(profileForm as any)[key as string]}
                    onChange={e => setProfileForm({ ...profileForm, [key as string]: e.target.value })}
                    placeholder={ph as string}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.8rem', border: `1px solid ${STONE200}`, borderRadius: 10, background: STONE50, color: STONE800, outline: 'none' }}
                  />
                </div>
              ))}
              <button type="submit" style={{ padding: '0.6rem', background: SAP, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Save Profile</button>
              {profileStatus && <p style={{ fontSize: '0.72rem', color: '#059669', textAlign: 'center' }}>{profileStatus}</p>}
            </form>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${STONE200}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: SAP, marginBottom: '0.4rem' }}>
                <Shield size={14} color="#059669" /> NMC Verification
              </div>
              <p style={{ fontSize: '0.7rem', color: STONE500, marginBottom: '0.75rem' }}>Verify registration with NMC or State Medical Councils.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: STONE600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medical Council</label>
                  <select value={verifyStateCouncil} onChange={e => setVerifyStateCouncil(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.8rem', border: `1px solid ${STONE200}`, borderRadius: 10, background: STONE50, color: STONE800, outline: 'none' }}>
                    <option value="National Medical Commission (MCI)">NMC / MCI (National)</option>
                    <option value="Maharashtra Medical Council">Maharashtra (MMC)</option>
                    <option value="Delhi Medical Council">Delhi (DMC)</option>
                    <option value="Karnataka Medical Council">Karnataka (KMC)</option>
                    <option value="Tamil Nadu Medical Council">Tamil Nadu (TNMC)</option>
                    <option value="Gujarat Medical Council">Gujarat (GMC)</option>
                    <option value="West Bengal Medical Council">West Bengal (WBMC)</option>
                    <option value="Uttar Pradesh Medical Council">Uttar Pradesh (UPMC)</option>
                    <option value="Kerala State Medical Council">Kerala (KSMC)</option>
                    <option value="Andhra Pradesh Medical Council">Andhra Pradesh (APMC)</option>
                    <option value="Telangana State Medical Council">Telangana (TSMC)</option>
                    <option value="Rajasthan Medical Council">Rajasthan (RMC)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: STONE600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registration Number</label>
                  <input type="text" value={verifyLicenseNumber} onChange={e => setVerifyLicenseNumber(e.target.value)}
                    placeholder="e.g. MC-12345"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.8rem', border: `1px solid ${STONE200}`, borderRadius: 10, background: STONE50, color: STONE800, outline: 'none' }} />
                </div>
                <button type="button" onClick={() => void handleVerifyDoctorLicense()}
                  disabled={isVerifyingLicense || !verifyLicenseNumber.trim()}
                  style={{ padding: '0.6rem', background: '#047857', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.8rem', cursor: isVerifyingLicense ? 'not-allowed' : 'pointer', opacity: isVerifyingLicense || !verifyLicenseNumber.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Check size={14} /> {isVerifyingLicense ? 'Verifying…' : 'Verify with NMC'}
                </button>
                {verificationFeedback && (
                  <div style={{ padding: '0.4rem 0.75rem', borderRadius: 8, fontSize: '0.72rem', fontWeight: 500, background: verificationFeedback.success ? '#ecfdf5' : '#fef2f2', color: verificationFeedback.success ? '#065f46' : '#991b1b', border: `1px solid ${verificationFeedback.success ? '#a7f3d0' : '#fca5a5'}` }}>
                    {verificationFeedback.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DoctorSidebar;
