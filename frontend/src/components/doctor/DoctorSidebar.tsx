import React, { FormEvent } from 'react';
import { Check } from 'lucide-react';
import { AuthUser, DoctorProfile } from '../../api';

interface DoctorSidebarProps {
  user: AuthUser;
  doctorProfile: DoctorProfile | null;
  patientCount: number;
  profileForm: {
    phone: string;
    specialization: string;
  };
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
}

export const DoctorSidebar: React.FC<DoctorSidebarProps> = ({
  user,
  doctorProfile,
  patientCount,
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
}) => {
  return (
    <aside className="profile-sidebar">
      <div className="panel profile-card">
        <div className="profile-header">
          <div className="profile-avatar">{user.name.charAt(0)}</div>
          <h2>{user.name}</h2>
          <span className="pill" style={{ marginTop: '0.5rem' }}>Medical Professional</span>
        </div>
        <div className="profile-stats">
          <div className="stat-mini"><span>Patients</span><strong>{patientCount}</strong></div>
          <div className="stat-mini"><span>Role</span><strong>Doctor</strong></div>
        </div>

        <div className="profile-details-form">
          <div className="eyebrow" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Professional Profile</div>
          <form className="stack compact" onSubmit={saveProfile}>
            <label className="field">
              <span>Phone Number</span>
              <input
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </label>
            <label className="field">
              <span>Specialization</span>
              <input
                value={profileForm.specialization}
                onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                placeholder="Example: Cardiology"
              />
            </label>
            <button className="primary" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>Update Profile</button>
            {profileStatus && <div className="flash subtle">{profileStatus}</div>}
          </form>

          {/* Indian Medical Council Verification Card */}
          {doctorProfile?.is_verified ? (
            <div className="panel" style={{ marginTop: '1.25rem', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', padding: '1rem', borderRadius: '12px' }}>
              <div className="row" style={{ alignItems: 'center', gap: '0.5rem', color: '#10B981', fontWeight: 600 }}>
                <Check size={18} />
                <span>NMC / Council Verified ✅</span>
              </div>
              <div className="stack compact" style={{ marginTop: '0.6rem', fontSize: '0.82rem', gap: '0.35rem' }}>
                <div><span style={{ opacity: 0.7 }}>Council:</span> <strong>{doctorProfile.state_council || 'National Medical Commission'}</strong></div>
                <div><span style={{ opacity: 0.7 }}>Reg No:</span> <strong>{doctorProfile.license_number}</strong></div>
                {doctorProfile.qualification && <div><span style={{ opacity: 0.7 }}>Qualification:</span> <strong>{doctorProfile.qualification}</strong></div>}
                {doctorProfile.registration_year && <div><span style={{ opacity: 0.7 }}>Reg Year:</span> <strong>{doctorProfile.registration_year}</strong></div>}
                <div style={{ marginTop: '0.25rem' }}>
                  <span className="pill active-pill" style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                    Active Practice (RMP) 🇮🇳
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ marginTop: '1.25rem', background: 'var(--surface-soft)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-strong)' }}>
              <div className="eyebrow" style={{ color: 'var(--accent)', fontWeight: 700 }}>Medical Registration Verification 🇮🇳</div>
              <p style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: '0.25rem', marginBottom: '0.75rem' }}>
                Verify your Indian Medical Council registration with NMC or State Medical Councils.
              </p>
              <div className="stack compact">
                <label className="field">
                  <span>State Medical Council</span>
                  <select value={verifyStateCouncil} onChange={(e) => setVerifyStateCouncil(e.target.value)}>
                    <option value="National Medical Commission (MCI)">National Medical Commission (NMC / MCI)</option>
                    <option value="Maharashtra Medical Council">Maharashtra Medical Council (MMC)</option>
                    <option value="Delhi Medical Council">Delhi Medical Council (DMC)</option>
                    <option value="Karnataka Medical Council">Karnataka Medical Council (KMC)</option>
                    <option value="Tamil Nadu Medical Council">Tamil Nadu Medical Council (TNMC)</option>
                    <option value="Gujarat Medical Council">Gujarat Medical Council (GMC)</option>
                    <option value="West Bengal Medical Council">West Bengal Medical Council (WBMC)</option>
                    <option value="Uttar Pradesh Medical Council">Uttar Pradesh Medical Council (UPMC)</option>
                    <option value="Kerala State Medical Council">Kerala State Medical Council (KSMC)</option>
                    <option value="Andhra Pradesh Medical Council">Andhra Pradesh Medical Council (APMC)</option>
                    <option value="Telangana State Medical Council">Telangana State Medical Council (TSMC)</option>
                    <option value="Rajasthan Medical Council">Rajasthan Medical Council (RMC)</option>
                  </select>
                </label>
                <label className="field">
                  <span>Registration Number</span>
                  <input
                    value={verifyLicenseNumber}
                    onChange={(e) => setVerifyLicenseNumber(e.target.value)}
                    placeholder="e.g. MCI-12345, MMC-2018/04/1234"
                  />
                </label>
                <button
                  type="button"
                  className="primary"
                  onClick={() => void handleVerifyDoctorLicense()}
                  disabled={isVerifyingLicense || !verifyLicenseNumber.trim()}
                  style={{ marginTop: '0.4rem', width: '100%' }}
                >
                  {isVerifyingLicense ? 'Verifying with NMC...' : 'Verify Doctor License 🇮🇳'}
                </button>
                {verificationFeedback && (
                  <div className={`flash ${verificationFeedback.success ? 'subtle' : ''}`} style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: verificationFeedback.success ? '#10B981' : '#EF4444' }}>
                    {verificationFeedback.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default DoctorSidebar;
