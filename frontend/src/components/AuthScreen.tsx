import React, { FormEvent, useState } from 'react';

export type AuthMode = 'login' | 'register-patient' | 'register-doctor';

interface AuthScreenProps {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  handleLogin: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  handleRegister: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  flash?: string;
  busy?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  authMode,
  setAuthMode,
  handleLogin,
  handleRegister,
  flash,
  busy,
}) => {
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  return (
    <div
      className="min-h-screen w-full relative flex flex-col justify-between selection:bg-[#2b988f] selection:text-white font-sans overflow-x-hidden"
      style={{ backgroundColor: '#f4f3ed', color: '#102213' }}
    >
      {/* BEGIN: Botanical Ambient Layer */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            backgroundImage: "url('/auth_bg.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
          }}
        />
      </div>
      {/* END: Botanical Ambient Layer */}

      {/* BEGIN: Main Page Content */}
      <main className="relative z-10 w-full max-w-[1340px] mx-auto px-6 sm:px-10 lg:px-16 pt-8 md:pt-14 pb-10 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* BEGIN: Hero Info Section */}
          <section className="lg:col-span-6 xl:col-span-7 pr-0 lg:pr-6" data-purpose="hero-copy-column">
            {/* Logo and Brand Tag */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-5 h-5 rounded-[5px] bg-[#3fa89b] flex items-center justify-center text-white font-bold text-[11px] shadow-sm">
                M
              </div>
              <span className="text-[11px] tracking-[0.2em] font-bold text-[#142318] uppercase">
                MEDASSIST
              </span>
            </div>

            {/* Main Display Headline */}
            <h1
              className="max-w-xl"
              style={{
                fontSize: 'clamp(2.8rem, 4.2vw, 3.8rem)',
                lineHeight: 1.06,
                letterSpacing: '-0.035em',
                fontWeight: 700,
                color: 'rgb(21, 43, 27)',
              }}
            >
              Care<br />
              records<br />
              without the<br />
              paperwork<br />
              maze
            </h1>

            {/* Explanatory Paragraph */}
            <p
              className="mt-7"
              style={{
                color: 'rgb(78, 96, 82)',
                fontSize: '15px',
                lineHeight: 1.55,
                maxWidth: '440px',
              }}
            >
              Patients can start a visit, complete intake, review reports and prescriptions, and keep profile details current. Doctors can track timelines and act on the generated SOAP summary.
            </p>

            {/* Feature Pills */}
            <div className="mt-6 flex flex-wrap gap-2.5 items-center" data-purpose="feature-tags">
              <span
                className="inline-flex items-center"
                style={{
                  background: 'rgba(226, 235, 222, 0.75)',
                  color: '#23452a',
                  border: '1px solid rgba(200, 214, 195, 0.6)',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  padding: '6px 14px',
                  borderRadius: '9999px',
                }}
              >
                Patient Intake
              </span>
              <span
                className="inline-flex items-center"
                style={{
                  background: 'rgba(226, 235, 222, 0.75)',
                  color: '#23452a',
                  border: '1px solid rgba(200, 214, 195, 0.6)',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  padding: '6px 14px',
                  borderRadius: '9999px',
                }}
              >
                SOAP summaries
              </span>
              <span
                className="inline-flex items-center"
                style={{
                  background: 'rgba(226, 235, 222, 0.75)',
                  color: '#23452a',
                  border: '1px solid rgba(200, 214, 195, 0.6)',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  padding: '6px 14px',
                  borderRadius: '9999px',
                }}
              >
                Follow-up reminders
              </span>
            </div>
          </section>
          {/* END: Hero Info Section */}

          {/* BEGIN: Auth Card Section */}
          <section className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end" data-purpose="registration-card-wrapper">
            <div
              className="w-full max-w-[420px] transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(220, 226, 215, 0.7)',
                boxShadow: 'rgba(27, 43, 29, 0.08) 0px 20px 48px -12px, rgba(0, 0, 0, 0.03) 0px 4px 16px -2px',
                padding: '28px 28px 24px',
                borderRadius: '24px',
              }}
            >
              {/* Segmented Navigation Switcher */}
              <nav
                aria-label="Account Types"
                className="w-full flex items-center mb-5 text-[13px] font-medium"
                data-purpose="auth-tabs"
                style={{ background: 'rgba(234, 239, 233, 0.75)', borderRadius: '14px', padding: '4px' }}
              >
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="flex-1 py-1.5 text-center transition-all"
                  style={
                    authMode === 'login'
                      ? {
                          background: '#ffffff',
                          color: 'rgb(22, 44, 28)',
                          fontWeight: 600,
                          fontSize: '13px',
                          borderRadius: '10px',
                          boxShadow: 'rgba(0, 0, 0, 0.06) 0px 2px 6px',
                        }
                      : { color: 'rgb(90, 107, 93)', fontWeight: 500, fontSize: '13px' }
                  }
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register-patient')}
                  className="flex-1 py-1.5 text-center transition-all"
                  style={
                    authMode === 'register-patient'
                      ? {
                          background: '#ffffff',
                          color: 'rgb(22, 44, 28)',
                          fontWeight: 600,
                          fontSize: '13px',
                          borderRadius: '10px',
                          boxShadow: 'rgba(0, 0, 0, 0.06) 0px 2px 6px',
                        }
                      : { color: 'rgb(90, 107, 93)', fontWeight: 500, fontSize: '13px' }
                  }
                >
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register-doctor')}
                  className="flex-1 py-1.5 text-center transition-all"
                  style={
                    authMode === 'register-doctor'
                      ? {
                          background: '#ffffff',
                          color: 'rgb(22, 44, 28)',
                          fontWeight: 600,
                          fontSize: '13px',
                          borderRadius: '10px',
                          boxShadow: 'rgba(0, 0, 0, 0.06) 0px 2px 6px',
                        }
                      : { color: 'rgb(90, 107, 93)', fontWeight: 500, fontSize: '13px' }
                  }
                >
                  Doctor
                </button>
              </nav>

              {/* Form Content */}
              <form
                className="space-y-2.5"
                data-purpose="auth-form"
                onSubmit={authMode === 'login' ? handleLogin : handleRegister}
              >
                {authMode !== 'login' && (
                  <div>
                    <label className="sr-only" htmlFor="fullName">Full name</label>
                    <input
                      id="fullName"
                      name="name"
                      placeholder="Full name"
                      required
                      type="text"
                      className="w-full transition-all focus:outline-none"
                      style={{
                        background: 'rgba(255, 255, 255, 0.75)',
                        border: '1px solid rgba(215, 224, 212, 0.85)',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        padding: '11px 16px',
                        color: '#1c2b20',
                      }}
                    />
                  </div>
                )}

                <div>
                  <label className="sr-only" htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    placeholder="Email"
                    required
                    type="email"
                    className="w-full transition-all focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.75)',
                      border: '1px solid rgba(215, 224, 212, 0.85)',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      padding: '11px 16px',
                      color: '#1c2b20',
                    }}
                  />
                </div>

                <div>
                  <label className="sr-only" htmlFor="password">Password</label>
                  <input
                    id="password"
                    name="password"
                    placeholder="Password"
                    required
                    type="password"
                    className="w-full transition-all focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.75)',
                      border: '1px solid rgba(215, 224, 212, 0.85)',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      padding: '11px 16px',
                      color: '#1c2b20',
                    }}
                  />
                </div>

                {authMode !== 'login' && (
                  <div>
                    <label className="sr-only" htmlFor="phone">Phone number</label>
                    <input
                      id="phone"
                      name="phone"
                      placeholder="Phone number"
                      type="tel"
                      className="w-full transition-all focus:outline-none"
                      style={{
                        background: 'rgba(255, 255, 255, 0.75)',
                        border: '1px solid rgba(215, 224, 212, 0.85)',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        padding: '11px 16px',
                        color: '#1c2b20',
                      }}
                    />
                  </div>
                )}

                {/* Patient Specific Fields */}
                {authMode === 'register-patient' && (
                  <>
                    <div>
                      <label className="sr-only" htmlFor="address">Address</label>
                      <input
                        id="address"
                        name="address"
                        placeholder="Address"
                        required
                        type="text"
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '11px 16px',
                          color: '#1c2b20',
                        }}
                      />
                    </div>
                    <div>
                      <label className="sr-only" htmlFor="age">Age</label>
                      <input
                        id="age"
                        name="age"
                        placeholder="Age"
                        type="number"
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '11px 16px',
                          color: '#1c2b20',
                        }}
                      />
                    </div>
                    <div>
                      <label className="sr-only" htmlFor="gender">Gender</label>
                      <input
                        id="gender"
                        name="gender"
                        placeholder="Gender"
                        type="text"
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '11px 16px',
                          color: '#1c2b20',
                        }}
                      />
                    </div>
                    <div>
                      <label className="sr-only" htmlFor="allergies">Allergies</label>
                      <input
                        id="allergies"
                        name="allergies"
                        placeholder="Allergies"
                        type="text"
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '11px 16px',
                          color: '#1c2b20',
                        }}
                      />
                    </div>
                    <div>
                      <label className="sr-only" htmlFor="chronicConditions">Chronic conditions</label>
                      <input
                        id="chronicConditions"
                        name="chronic_conditions"
                        placeholder="Chronic conditions"
                        type="text"
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '11px 16px',
                          color: '#1c2b20',
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Doctor Specific Fields */}
                {authMode === 'register-doctor' && (
                  <>
                    <div>
                      <label className="sr-only" htmlFor="specialization">Specialization</label>
                      <input
                        id="specialization"
                        name="specialization"
                        placeholder="Specialization (e.g. Cardiology)"
                        required
                        type="text"
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '11px 16px',
                          color: '#1c2b20',
                        }}
                      />
                    </div>
                    <div>
                      <label className="sr-only" htmlFor="licenseNumber">Medical Reg / License No</label>
                      <input
                        id="licenseNumber"
                        name="license_number"
                        placeholder="Medical Reg / License No"
                        required
                        type="text"
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '11px 16px',
                          color: '#1c2b20',
                        }}
                      />
                    </div>
                    <div>
                      <label className="sr-only" htmlFor="experienceYears">Experience (years)</label>
                      <input
                        id="experienceYears"
                        name="experience_years"
                        placeholder="Experience (years)"
                        type="number"
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '11px 16px',
                          color: '#1c2b20',
                        }}
                      />
                    </div>
                    <div>
                      <label className="sr-only" htmlFor="hospitalAffiliation">Hospital / Clinic Affiliation</label>
                      <input
                        id="hospitalAffiliation"
                        name="hospital_affiliation"
                        placeholder="Hospital / Clinic Affiliation"
                        type="text"
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '11px 16px',
                          color: '#1c2b20',
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Submit CTA Button */}
                <div className="pt-1.5">
                  <button
                    type="submit"
                    disabled={Boolean(busy)}
                    className="relative transition-all active:scale-[0.99]"
                    style={{
                      background: '#162c1c',
                      borderRadius: '12px',
                      padding: '13px 20px',
                      fontWeight: 500,
                      fontSize: '14.5px',
                      letterSpacing: '-0.01em',
                      color: '#f4f7f2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%',
                      boxShadow: '0 4px 14px rgba(22, 44, 28, 0.25)',
                    }}
                  >
                    <span>{authMode === 'login' ? 'Sign in' : 'Create account'}</span>
                    <svg aria-hidden="true" className="absolute right-5 w-4 h-4 text-[#49704d]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" />
                    </svg>
                  </button>
                </div>
              </form>

              {/* Bottom Card Footer Actions */}
              <div className="pt-3 text-[12px] text-[#566859]">
                {authMode === 'login' ? (
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword((p) => !p)}
                      className="hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register-patient')}
                      className="hover:underline font-medium text-[#162c1c]"
                    >
                      Create an Account
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <span>Already have an account? </span>
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="font-semibold text-[#162c1c] hover:underline"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>

              {/* Forgot password hint */}
              {showForgotPassword && (
                <div className="mt-3 p-3 bg-[#e8eee6] rounded-xl text-xs text-[#2b4d32] border border-[#d2dec0] animate-in fade-in">
                  Contact your clinic administrator or reset credentials with your registered medical email.
                </div>
              )}

              {/* Flash & Status Messages */}
              {flash && (
                <div className="mt-3 p-3 bg-[#FEF2F2] rounded-xl text-xs text-[#991B1B] border border-[#FCA5A5] flex items-center gap-2 animate-in fade-in">
                  <span>{flash}</span>
                </div>
              )}
              {busy && (
                <div className="mt-3 p-2.5 bg-[#EFF6FF] rounded-xl text-xs text-[#1E40AF] border border-[#BFDBFE] flex items-center gap-2 animate-pulse">
                  <span>{busy}...</span>
                </div>
              )}
            </div>
          </section>
          {/* END: Auth Card Section */}

        </div>
      </main>
      {/* END: Main Page Content */}

      {/* BEGIN: Bottom Footer Utilities */}
      <footer
        className="relative z-10 w-full px-6 sm:px-12 py-5 text-[12px] text-[#4d564b] flex flex-row items-center justify-between font-normal"
        data-purpose="page-footer"
      >
        <div>
          <a
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[#102213]"
            href="#settings"
            style={{ color: '#566859', fontSize: '12px' }}
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </a>
        </div>
        <div className="flex items-center gap-5 sm:gap-6">
          <a
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[#102213]"
            href="#help"
            style={{ color: '#566859', fontSize: '12px' }}
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" x2="12.01" y1="17" y2="17" />
            </svg>
            <span>Help</span>
          </a>
          <a
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[#102213]"
            href="#privacy"
            style={{ color: '#566859', fontSize: '12px' }}
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Privacy</span>
          </a>
        </div>
      </footer>
      {/* END: Bottom Footer Utilities */}
    </div>
  );
};

export default AuthScreen;
