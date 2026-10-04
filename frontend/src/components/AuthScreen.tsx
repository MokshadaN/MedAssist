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
      style={{
        backgroundColor: '#f4f3ed',
        color: '#102213',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
      }}
    >
      {/* BEGIN: Botanical Ambient Layer */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden" data-purpose="background-foliage-layer">
        <div
          className="absolute inset-0 opacity-100 hidden md:block"
          style={{
            backgroundImage: "url('/auth_bg.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
          }}
        />
      </div>
      {/* END: Botanical Ambient Layer */}

      {/* BEGIN: Main Page Content with generous left and right padding */}
      <main
        className="relative z-10 w-full flex-1 flex flex-col justify-center"
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          paddingLeft: 'clamp(2rem, 6vw, 8rem)',
          paddingRight: 'clamp(2rem, 6vw, 8rem)',
          paddingTop: 'clamp(2.5rem, 5vw, 4rem)',
          paddingBottom: '3rem',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* BEGIN: Hero Info Section */}
          <section className="lg:col-span-6 xl:col-span-7 pr-0 lg:pr-8" data-purpose="hero-copy-column">
            {/* Logo and Brand Tag */}
            <div className="flex items-center gap-2 mb-7">
              <div className="w-5 h-5 rounded-[5px] bg-[#3fa89b] flex items-center justify-center text-white font-bold text-[11px] shadow-sm">
                M
              </div>
              <span className="text-[11.5px] tracking-[0.22em] font-bold text-[#142318] uppercase">
                MEDASSIST
              </span>
            </div>

            {/* Main Display Headline */}
            <h1
              className="max-w-xl"
              style={{
                fontSize: 'clamp(2.9rem, 4.4vw, 4rem)',
                lineHeight: 1.05,
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
                lineHeight: 1.6,
                maxWidth: '440px',
              }}
            >
              Patients can start a visit, complete intake, review reports and prescriptions, and keep profile details current. Doctors can track timelines and act on the generated SOAP summary.
            </p>

            {/* Feature Pills */}
            <div className="mt-7 flex flex-wrap gap-2.5 items-center" data-purpose="feature-tags">
              <span
                className="inline-flex items-center"
                style={{
                  background: 'rgba(226, 235, 222, 0.75)',
                  color: '#23452a',
                  border: '1px solid rgba(200, 214, 195, 0.6)',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  padding: '7px 16px',
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
                  padding: '7px 16px',
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
                  padding: '7px 16px',
                  borderRadius: '9999px',
                }}
              >
                Follow-up reminders
              </span>
            </div>
          </section>
          {/* END: Hero Info Section */}

          {/* BEGIN: Registration Card Section */}
          <section className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end" data-purpose="registration-card-wrapper">
            <div
              className="w-full max-w-[430px] transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(220, 226, 215, 0.7)',
                boxShadow: '0 20px 48px -12px rgba(27, 43, 29, 0.08), 0 4px 16px -2px rgba(0, 0, 0, 0.03)',
                padding: '30px 30px 26px',
                borderRadius: '24px',
              }}
            >
              {/* Segmented Navigation Switcher */}
              <nav
                aria-label="Account Types"
                className="w-full flex items-center mb-6 text-[13px] font-medium"
                data-purpose="auth-tabs"
                style={{
                  background: 'rgba(234, 239, 233, 0.75)',
                  borderRadius: '14px',
                  padding: '4px',
                }}
              >
                <button
                  className="flex-1 py-1.5 text-center transition-all cursor-pointer"
                  style={{
                    background: authMode === 'login' ? '#ffffff' : 'transparent',
                    color: authMode === 'login' ? '#162c1c' : '#5a6b5d',
                    fontWeight: authMode === 'login' ? 600 : 500,
                    fontSize: '13px',
                    borderRadius: authMode === 'login' ? '10px' : '8px',
                    boxShadow: authMode === 'login' ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
                  }}
                  type="button"
                  onClick={() => setAuthMode('login')}
                >
                  Login
                </button>
                <button
                  className="flex-1 py-1.5 text-center transition-all cursor-pointer"
                  style={{
                    background: authMode === 'register-patient' ? '#ffffff' : 'transparent',
                    color: authMode === 'register-patient' ? '#162c1c' : '#5a6b5d',
                    fontWeight: authMode === 'register-patient' ? 600 : 500,
                    fontSize: '13px',
                    borderRadius: authMode === 'register-patient' ? '10px' : '8px',
                    boxShadow: authMode === 'register-patient' ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
                  }}
                  type="button"
                  onClick={() => setAuthMode('register-patient')}
                >
                  Patient
                </button>
                <button
                  className="flex-1 py-1.5 text-center transition-all cursor-pointer"
                  style={{
                    background: authMode === 'register-doctor' ? '#ffffff' : 'transparent',
                    color: authMode === 'register-doctor' ? '#162c1c' : '#5a6b5d',
                    fontWeight: authMode === 'register-doctor' ? 600 : 500,
                    fontSize: '13px',
                    borderRadius: authMode === 'register-doctor' ? '10px' : '8px',
                    boxShadow: authMode === 'register-doctor' ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
                  }}
                  type="button"
                  onClick={() => setAuthMode('register-doctor')}
                >
                  Doctor
                </button>
              </nav>

              {/* Registration / Login Form with relaxed vertical spacing */}
              <form
                className="flex flex-col"
                style={{ gap: '14px' }}
                data-purpose="auth-form"
                onSubmit={authMode === 'login' ? handleLogin : handleRegister}
              >
                {authMode !== 'login' && (
                  <div style={{ marginBottom: '2px' }}>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="name">Full name</label>
                    <input
                      id="name"
                      name="name"
                      placeholder="Full name"
                      type="text"
                      required
                      minLength={1}
                      className="w-full transition-all focus:outline-none"
                      style={{
                        background: 'rgba(255, 255, 255, 0.75)',
                        border: '1px solid rgba(215, 224, 212, 0.85)',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        padding: '12.5px 18px',
                        color: '#1c2b20',
                        display: 'block',
                        width: '100%',
                      }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '2px' }}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="email">Email address</label>
                  <input
                    id="email"
                    name="email"
                    placeholder="you@example.com"
                    type="email"
                    required
                    className="w-full transition-all focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.75)',
                      border: '1px solid rgba(215, 224, 212, 0.85)',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      padding: '12.5px 18px',
                      color: '#1c2b20',
                      display: 'block',
                      width: '100%',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '2px' }}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="password">Password</label>
                  <input
                    id="password"
                    name="password"
                    placeholder="Min 8 characters"
                    type="password"
                    required
                    minLength={8}
                    className="w-full transition-all focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.75)',
                      border: '1px solid rgba(215, 224, 212, 0.85)',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      padding: '12.5px 18px',
                      color: '#1c2b20',
                      display: 'block',
                      width: '100%',
                    }}
                  />
                </div>

                {authMode !== 'login' && (
                  <div style={{ marginBottom: '2px' }}>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="phone">Phone number</label>
                    <input
                      id="phone"
                      name="phone"
                      placeholder="+91 98765 43210"
                      type="tel"
                      className="w-full transition-all focus:outline-none"
                      style={{
                        background: 'rgba(255, 255, 255, 0.75)',
                        border: '1px solid rgba(215, 224, 212, 0.85)',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        padding: '12.5px 18px',
                        color: '#1c2b20',
                        display: 'block',
                        width: '100%',
                      }}
                    />
                  </div>
                )}

                {authMode === 'register-patient' && (
                  <>
                    <div style={{ marginBottom: '2px' }}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="address">Address</label>
                      <input
                        id="address"
                        name="address"
                        placeholder="Street, City, State"
                        type="text"
                        required
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '12.5px 18px',
                          color: '#1c2b20',
                          display: 'block',
                          width: '100%',
                        }}
                      />
                    </div>
                    <div className="flex gap-3">
                      <div style={{ flex: 1 }}>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="age">Age</label>
                        <input
                          id="age"
                          name="age"
                          placeholder="25"
                          type="number"
                          className="w-full transition-all focus:outline-none"
                          style={{
                            background: 'rgba(255, 255, 255, 0.75)',
                            border: '1px solid rgba(215, 224, 212, 0.85)',
                            borderRadius: '12px',
                            fontSize: '13.5px',
                            padding: '12.5px 18px',
                            color: '#1c2b20',
                            display: 'block',
                            width: '100%',
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="gender">Gender</label>
                        <input
                          id="gender"
                          name="gender"
                          placeholder="Male / Female"
                          type="text"
                          className="w-full transition-all focus:outline-none"
                          style={{
                            background: 'rgba(255, 255, 255, 0.75)',
                            border: '1px solid rgba(215, 224, 212, 0.85)',
                            borderRadius: '12px',
                            fontSize: '13.5px',
                            padding: '12.5px 18px',
                            color: '#1c2b20',
                            display: 'block',
                            width: '100%',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: '2px' }}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="allergies">Allergies</label>
                      <input
                        id="allergies"
                        name="allergies"
                        placeholder="e.g. Penicillin, Peanuts (or none)"
                        type="text"
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '12.5px 18px',
                          color: '#1c2b20',
                          display: 'block',
                          width: '100%',
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: '2px' }}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="chronic_conditions">Chronic conditions</label>
                      <input
                        id="chronic_conditions"
                        name="chronic_conditions"
                        placeholder="e.g. Diabetes, Hypertension (or none)"
                        type="text"
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '12.5px 18px',
                          color: '#1c2b20',
                          display: 'block',
                          width: '100%',
                        }}
                      />
                    </div>
                  </>
                )}

                {authMode === 'register-doctor' && (
                  <>
                    <div style={{ marginBottom: '2px' }}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="specialization">Specialization</label>
                      <input
                        id="specialization"
                        name="specialization"
                        placeholder="e.g. Cardiology, Orthopaedics"
                        type="text"
                        required
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '12.5px 18px',
                          color: '#1c2b20',
                          display: 'block',
                          width: '100%',
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: '2px' }}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="license_number">Medical Registration No.</label>
                      <input
                        id="license_number"
                        name="license_number"
                        placeholder="e.g. MCI-12345"
                        type="text"
                        required
                        className="w-full transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(215, 224, 212, 0.85)',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          padding: '12.5px 18px',
                          color: '#1c2b20',
                          display: 'block',
                          width: '100%',
                        }}
                      />
                    </div>
                    <div className="flex gap-3">
                      <div style={{ flex: 1 }}>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="experience_years">Years of experience</label>
                        <input
                          id="experience_years"
                          name="experience_years"
                          placeholder="e.g. 10"
                          type="number"
                          required
                          className="w-full transition-all focus:outline-none"
                          style={{
                            background: 'rgba(255, 255, 255, 0.75)',
                            border: '1px solid rgba(215, 224, 212, 0.85)',
                            borderRadius: '12px',
                            fontSize: '13.5px',
                            padding: '12.5px 18px',
                            color: '#1c2b20',
                            display: 'block',
                            width: '100%',
                          }}
                        />
                      </div>
                      <div style={{ flex: 2 }}>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#4e6052' }} htmlFor="hospital_affiliation">Hospital / Clinic</label>
                        <input
                          id="hospital_affiliation"
                          name="hospital_affiliation"
                          placeholder="Hospital or clinic name"
                          type="text"
                          className="w-full transition-all focus:outline-none"
                          style={{
                            background: 'rgba(255, 255, 255, 0.75)',
                            border: '1px solid rgba(215, 224, 212, 0.85)',
                            borderRadius: '12px',
                            fontSize: '13.5px',
                            padding: '12.5px 18px',
                            color: '#1c2b20',
                            display: 'block',
                            width: '100%',
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="relative transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer"
                    style={{
                      background: '#162c1c',
                      borderRadius: '12px',
                      padding: '14px 20px',
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
                      <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z"></path>
                    </svg>
                  </button>
                </div>

                {authMode === 'login' && (
                  <div className="flex items-center justify-between pt-2 px-1 text-[12.5px]">
                    <button
                      type="button"
                      className="cursor-pointer transition-colors"
                      style={{ color: '#566859' }}
                      onClick={() => setShowForgotPassword((prev) => !prev)}
                    >
                      Forgot Password?
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer font-medium transition-colors"
                      style={{ color: '#162c1c' }}
                      onClick={() => setAuthMode('register-patient')}
                    >
                      Create an Account
                    </button>
                  </div>
                )}

                {showForgotPassword && (
                  <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(226, 235, 222, 0.6)', color: '#23452a' }}>
                    Password reset instructions will be sent to your registered email address. Contact administrator if needed.
                  </div>
                )}

                {flash && (
                  <div className="p-3 rounded-lg text-xs mt-2" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                    {flash}
                  </div>
                )}
                {busy && (
                  <div className="p-3 rounded-lg text-xs mt-2" style={{ background: 'rgba(234, 239, 233, 0.9)', color: '#23452a' }}>
                    {busy}...
                  </div>
                )}
              </form>
            </div>
          </section>
          {/* END: Registration Card Section */}
        </div>
      </main>
      {/* END: Main Page Content */}

      {/* BEGIN: Bottom Footer Utilities */}
      <footer
        className="relative z-10 w-full flex flex-row items-center justify-between font-normal"
        data-purpose="page-footer"
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          paddingLeft: 'clamp(2rem, 6vw, 8rem)',
          paddingRight: 'clamp(2rem, 6vw, 8rem)',
          paddingTop: '1.25rem',
          paddingBottom: '1.25rem',
          fontSize: '12px',
          color: '#566859',
        }}
      >
        <div>
          <a className="inline-flex items-center gap-1.5 transition-colors hover:text-[#102213]" href="#settings" style={{ color: '#566859', fontSize: '12px' }}>
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>Settings</span>
          </a>
        </div>
        <div className="flex items-center gap-5 sm:gap-6">
          <a className="inline-flex items-center gap-1.5 transition-colors hover:text-[#102213]" href="#help" style={{ color: '#566859', fontSize: '12px' }}>
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" x2="12.01" y1="17" y2="17"></line>
            </svg>
            <span>Help</span>
          </a>
          <a className="inline-flex items-center gap-1.5 transition-colors hover:text-[#102213]" href="#privacy" style={{ color: '#566859', fontSize: '12px' }}>
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
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
