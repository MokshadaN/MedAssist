import React from 'react';
import { PublicProfile } from '../../api';

interface PublicProfileViewProps {
  profile: PublicProfile | null;
  loading: boolean;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({ profile, loading }) => {
  if (loading) return <div className="auth-loading panel">Loading profile...</div>;
  if (!profile) return <div className="auth-loading panel">Profile not found or link expired.</div>;

  return (
    <main className="auth-shell" style={{ justifyContent: 'center' }}>
      <section className="panel auth-card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
        <div className="brand" style={{ marginBottom: '2rem', justifyContent: 'center' }}>
          <div className="brand-badge">M</div>
          <div style={{ textAlign: 'center' }}>
            <div className="eyebrow">MedAssist Emergency</div>
            <h1>Medical Summary</h1>
          </div>
        </div>

        <div className="stack" style={{ gap: '1.5rem' }}>
          <div className="profile-header" style={{ alignItems: 'center' }}>
            <div className="profile-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>{profile.name.charAt(0)}</div>
            <h2 style={{ fontSize: '1.75rem', marginTop: '1rem' }}>{profile.name}</h2>
            <span className="pill urgent" style={{ marginTop: '0.5rem' }}>Emergency Information</span>
          </div>

          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="stat-card" style={{ background: 'var(--surface-soft)', padding: '1rem', borderRadius: '12px' }}>
              <div className="eyebrow">Age</div>
              <strong style={{ fontSize: '1.25rem' }}>{profile.age || 'Not listed'}</strong>
            </div>
            <div className="stat-card" style={{ background: 'var(--surface-soft)', padding: '1rem', borderRadius: '12px' }}>
              <div className="eyebrow">Gender</div>
              <strong style={{ fontSize: '1.25rem' }}>{profile.gender || 'Not listed'}</strong>
            </div>
          </div>

          <div className="panel" style={{ background: 'rgba(255, 71, 87, 0.1)', borderColor: 'rgba(255, 71, 87, 0.3)' }}>
            <div className="eyebrow" style={{ color: '#ff4757' }}>Allergies</div>
            <p style={{ marginTop: '0.5rem', fontWeight: '600' }}>{profile.allergies || 'None reported'}</p>
          </div>

          <div className="panel">
            <div className="eyebrow">Chronic Conditions</div>
            <p style={{ marginTop: '0.5rem' }}>{profile.chronic_conditions || 'None reported'}</p>
          </div>

          <div style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
            This information is provided for emergency medical purposes only.
          </div>
        </div>
      </section>
    </main>
  );
};

export default PublicProfileView;
