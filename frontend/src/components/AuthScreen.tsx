import React, { FormEvent, useState } from 'react';
import { Leaf, Sparkles, Settings, HelpCircle, Shield, CheckCircle2, ArrowRight, Stethoscope, User, HeartPulse } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

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
    <div className="min-h-screen w-full bg-[#F7F8F4] text-[#1E2922] font-sans flex flex-col justify-between relative overflow-hidden selection:bg-[#2D5A43] selection:text-white">
      {/* Subtle organic background glow */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#E2EDE5]/60 to-[#D5E6DA]/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#EBF3ED]/70 to-[#F2F7F4]/30 blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5 group cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-[#1B382B] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <Leaf className="w-5 h-5 text-[#86EFAC]" />
          </div>
          <span className="font-semibold text-xl tracking-tight text-[#163024]">MedAssist</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setAuthMode(authMode === 'login' ? 'register-patient' : 'login')}
            className="text-sm font-medium text-[#2E4A3B] hover:text-[#132A1E] transition-colors"
          >
            {authMode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-6 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10 my-auto">
        
        {/* Left Column: Hero Typography & Value Prop */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#4B6B59] bg-[#EAF2EC] px-3 py-1 rounded-full border border-[#D3E5D8]">
            <span>MEDASSIST</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-[#142A1F] leading-[1.12] tracking-tight font-display">
            Care records <br />
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#38BDF8] text-white font-bold text-sm shadow-sm">
                M
              </span>
              <span>without the</span>
            </span> <br />
            paperwork maze
          </h1>

          <p className="text-[#435E50] text-base lg:text-lg leading-relaxed max-w-xl">
            Patients can start a visit, complete intake, review reports and prescriptions, and keep profile details current. Doctors can track timelines and act on the generated SOAP summary.
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E5EFE7] text-[#244835] text-xs font-medium border border-[#D0E2D4]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
              <span>Patient intake</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E5EFE7] text-[#244835] text-xs font-medium border border-[#D0E2D4]">
              <HeartPulse className="w-3.5 h-3.5 text-[#2D6A4F]" />
              <span>SOAP summaries</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E5EFE7] text-[#244835] text-xs font-medium border border-[#D0E2D4]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
              <span>Follow-up reminders</span>
            </div>
          </div>
        </div>

        {/* Center / Decorative Foliage Botanical Illustration */}
        <div className="hidden lg:flex lg:col-span-1 xl:col-span-1 justify-center items-center pointer-events-none relative -mr-16 z-0">
          <div className="relative w-48 h-72 opacity-90 transition-transform duration-700 hover:scale-105">
            {/* Elegant SVG Botanical Plant Illustration */}
            <svg viewBox="0 0 200 300" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 280 Q95 180 110 80 Q115 30 100 10" stroke="#2D5A43" strokeWidth="4" strokeLinecap="round" />
              {/* Leaf 1 */}
              <path d="M100 240 C60 220 40 180 60 150 C80 120 100 190 100 240 Z" fill="#2D5A43" opacity="0.85" />
              <path d="M60 150 Q80 190 100 240" stroke="#86EFAC" strokeWidth="1.5" opacity="0.6" />
              {/* Leaf 2 */}
              <path d="M105 190 C150 170 170 130 150 100 C130 70 105 140 105 190 Z" fill="#1B382B" opacity="0.9" />
              <path d="M150 100 Q130 140 105 190" stroke="#86EFAC" strokeWidth="1.5" opacity="0.6" />
              {/* Leaf 3 */}
              <path d="M108 130 C70 110 55 70 75 40 C95 10 110 80 108 130 Z" fill="#3D7055" opacity="0.85" />
              {/* Leaf 4 */}
              <path d="M110 80 C140 65 155 35 140 15 C125 -5 110 40 110 80 Z" fill="#528B6D" opacity="0.8" />
              {/* Accent berries / pollen */}
              <circle cx="98" cy="110" r="4" fill="#38BDF8" opacity="0.9" />
              <circle cx="115" cy="160" r="5" fill="#34D399" opacity="0.9" />
            </svg>
          </div>
        </div>

        {/* Right Column: Floating Auth Card */}
        <div className="lg:col-span-5 xl:col-span-5 flex justify-center lg:justify-end z-10">
          <div className="w-full max-w-[440px] bg-white rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(20,42,31,0.08)] border border-[#E3E8E3] relative transition-all">
            
            {/* Tab Switcher */}
            <div className="grid grid-cols-3 p-1 bg-[#EEF2EE] rounded-2xl mb-6 text-sm font-medium">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-2 px-3 rounded-xl transition-all duration-200 text-center ${
                  authMode === 'login'
                    ? 'bg-white text-[#132A1E] shadow-sm font-semibold'
                    : 'text-[#627D6E] hover:text-[#183325]'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register-patient')}
                className={`py-2 px-3 rounded-xl transition-all duration-200 text-center ${
                  authMode === 'register-patient'
                    ? 'bg-white text-[#132A1E] shadow-sm font-semibold'
                    : 'text-[#627D6E] hover:text-[#183325]'
                }`}
              >
                Patient
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register-doctor')}
                className={`py-2 px-3 rounded-xl transition-all duration-200 text-center ${
                  authMode === 'register-doctor'
                    ? 'bg-white text-[#132A1E] shadow-sm font-semibold'
                    : 'text-[#627D6E] hover:text-[#183325]'
                }`}
              >
                Doctor
              </button>
            </div>

            {/* Auth Form */}
            <form
              onSubmit={authMode === 'login' ? handleLogin : handleRegister}
              className="space-y-3"
            >
              {authMode !== 'login' && (
                <div>
                  <input
                    name="name"
                    placeholder="Full name"
                    required
                    className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                  />
                </div>
              )}

              <div>
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  required
                  className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                />
              </div>

              <div>
                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  required
                  className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                />
              </div>

              {authMode !== 'login' && (
                <div>
                  <input
                    name="phone"
                    placeholder="Phone number"
                    className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                  />
                </div>
              )}

              {/* Patient Specific Fields */}
              {authMode === 'register-patient' && (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  <input
                    name="address"
                    placeholder="Address"
                    required
                    className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      name="age"
                      type="number"
                      placeholder="Age"
                      className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                    />
                    <input
                      name="gender"
                      placeholder="Gender"
                      className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                    />
                  </div>
                  <input
                    name="allergies"
                    placeholder="Allergies"
                    className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                  />
                  <input
                    name="chronic_conditions"
                    placeholder="Chronic conditions"
                    className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                  />
                </div>
              )}

              {/* Doctor Specific Fields */}
              {authMode === 'register-doctor' && (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  <input
                    name="specialization"
                    placeholder="Specialization"
                    required
                    className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                  />
                  <input
                    name="license_number"
                    placeholder="Medical Reg No"
                    required
                    className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      name="experience_years"
                      type="number"
                      placeholder="Experience (yrs)"
                      required
                      className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                    />
                    <input
                      name="hospital_affiliation"
                      placeholder="Hospital affiliation"
                      className="w-full h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white focus:outline-none text-[#142A1F] text-sm placeholder:text-[#8E9F94] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={Boolean(busy)}
                className="w-full h-12 rounded-2xl bg-[#142A1F] hover:bg-[#0B1A13] active:scale-[0.99] text-white font-medium text-sm shadow-sm transition-all duration-200 mt-3 flex items-center justify-center gap-2 group"
              >
                <span>{authMode === 'login' ? 'Sign in' : 'Create account'}</span>
                {authMode === 'login' ? (
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#86EFAC]" />
                )}
              </button>
            </form>

            {/* Bottom Links */}
            <div className="flex items-center justify-between text-xs text-[#527060] pt-4 mt-2 border-t border-[#EDF2EE]">
              {authMode === 'login' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword((prev) => !prev)}
                    className="hover:underline hover:text-[#183325] transition-colors"
                  >
                    Forgot Password?
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register-patient')}
                    className="hover:underline hover:text-[#183325] font-medium transition-colors"
                  >
                    Create an Account
                  </button>
                </>
              ) : (
                <div className="w-full text-center">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="font-semibold text-[#183325] hover:underline"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>

            {/* Forgot password hint */}
            {showForgotPassword && (
              <div className="mt-3 p-3 bg-[#F0F5F2] rounded-xl text-xs text-[#335342] border border-[#DDE7E0] animate-in fade-in duration-200">
                Contact clinic administrator or use your registered email with your system administrator to reset credentials.
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
        </div>

      </main>

      {/* Footer Navigation */}
      <footer className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#627D6E] z-10">
        <div className="flex items-center gap-2">
          <Settings className="w-3.5 h-3.5" />
          <span>System Settings & Configuration</span>
        </div>

        <div className="flex items-center gap-6">
          <button className="flex items-center gap-1.5 hover:text-[#1C3627] transition-colors">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-[#1C3627] transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-[#1C3627] transition-colors">
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default AuthScreen;
