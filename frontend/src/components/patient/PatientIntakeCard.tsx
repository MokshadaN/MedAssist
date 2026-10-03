import React, { useState } from 'react';
import {
  Stethoscope,
  ArrowRight,
  Mic,
  MicOff,
  Send,
  Sparkles,
  AlertTriangle,
  X,
  Bot,
  User,
  CheckCircle2,
  Phone
} from 'lucide-react';
import { DoctorDirectoryItem, AISummary, EmergencyHospital } from '../../api';
import { Dialog } from '../ui/dialog';

type ChatMessage = { role: 'assistant' | 'user'; text: string };

interface PatientIntakeCardProps {
  doctors: DoctorDirectoryItem[];
  selectedDoctorId: string;
  setSelectedDoctorId: (id: string) => void;
  intakeOpen: boolean;
  setIntakeOpen: (open: boolean) => void;
  intakeText: string;
  setIntakeText: (text: string) => void;
  intakeMessages: ChatMessage[];
  isRecording: boolean;
  isTranscribing: boolean;
  isSendingIntake: boolean;
  intakeStatus: string;
  intakeAdvisory: string;
  emergencyMessage: string;
  emergencyHospitals: EmergencyHospital[];
  lastSummary: AISummary | null;
  onStartIntake: () => Promise<void>;
  onSendIntakeMessage: () => Promise<void>;
  onToggleRecording: () => void;
  onFinishIntake: () => Promise<void>;
}

export const PatientIntakeCard: React.FC<PatientIntakeCardProps> = ({
  doctors,
  selectedDoctorId,
  setSelectedDoctorId,
  intakeOpen,
  setIntakeOpen,
  intakeText,
  setIntakeText,
  intakeMessages,
  isRecording,
  isTranscribing,
  isSendingIntake,
  intakeStatus,
  intakeAdvisory,
  emergencyMessage,
  emergencyHospitals,
  lastSummary,
  onStartIntake,
  onSendIntakeMessage,
  onToggleRecording,
  onFinishIntake,
}) => {
  return (
    <>
      {/* Start Visit Card on Dashboard */}
      <div className="bg-[#FFFFFF] border border-[#E8ECE7] rounded-3xl p-6 relative overflow-hidden shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        <div className="flex items-start gap-4 z-10 max-w-lg">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF5EC] text-[#1E432F] flex items-center justify-center shrink-0 border border-[#D2E4D6]">
            <Stethoscope className="w-6 h-6 text-[#10B981]" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#63806F] block">
              CONSULTATION
            </span>
            <h2 className="text-xl font-bold text-[#142A1F] mt-0.5">Start a new visit</h2>
            <p className="text-xs text-[#52705E] mt-1 leading-relaxed">
              Select a specialist, complete your AI triage questionnaire, and your results will be sent to the doctor.
            </p>
          </div>
        </div>

        {/* Doctor Selection & CTA Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto z-10">
          <select
            id="doctor-select-dropdown"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="h-11 px-3.5 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] text-xs font-medium text-[#142A1F] focus:border-[#2D5A43] focus:outline-none min-w-[200px]"
          >
            <option value="">Select a specialist doctor...</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} • {doc.specialization}
              </option>
            ))}
          </select>

          <button
            id="begin-intake-btn"
            onClick={() => onStartIntake()}
            disabled={!selectedDoctorId}
            className="h-11 px-5 rounded-xl bg-[#142A1F] hover:bg-[#0B1A13] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>Begin Intake</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Decorative corner accent */}
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-[#EAF5EC]/40 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* AI Clinical Consultation Dialog Modal */}
      {intakeOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E3E8E3] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E8ECE7] flex items-center justify-between bg-[#F8FAF7]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#142A1F] text-white flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#86EFAC]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#142A1F]">AI Clinical Intake Assistant</h3>
                  <p className="text-[11px] text-[#63806F]">Conversational triage & symptom evaluation</p>
                </div>
              </div>
              <button
                id="close-intake-modal-btn"
                onClick={() => setIntakeOpen(false)}
                className="p-2 rounded-xl text-[#7A9183] hover:bg-[#EAEFEA] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Emergency & Red-Flag Warnings */}
            {emergencyMessage && (
              <div className="p-4 bg-[#FEF2F2] border-b border-[#FCA5A5] text-xs text-[#991B1B] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">EMERGENCY RED FLAG DETECTED:</strong>
                  <p className="mt-0.5">{emergencyMessage}</p>
                  {emergencyHospitals.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <span className="font-semibold">Nearest Emergency Care:</span>
                      {emergencyHospitals.slice(0, 2).map((h, i) => (
                        <div key={i} className="text-[11px] bg-white p-1.5 rounded-lg border border-[#FCA5A5]/60 flex items-center justify-between">
                          <span>{h.name}</span>
                          <span className="font-bold">{h.phone || 'Call 911'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Advisory note */}
            {intakeAdvisory && (
              <div className="px-6 py-2 bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium border-b border-[#FDE68A] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{intakeAdvisory}</span>
              </div>
            )}

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[420px] bg-[#FAFBF9]">
              {intakeMessages.map((msg, i) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 ${isAssistant ? '' : 'flex-row-reverse'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                        isAssistant
                          ? 'bg-[#142A1F] text-[#86EFAC]'
                          : 'bg-[#2563EB] text-white'
                      }`}
                    >
                      {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        isAssistant
                          ? 'bg-white border border-[#E3E8E3] text-[#142A1F] shadow-sm'
                          : 'bg-[#142A1F] text-white shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}

              {isSendingIntake && (
                <div className="flex items-center gap-2 text-xs text-[#63806F] italic">
                  <Sparkles className="w-3.5 h-3.5 text-[#10B981] animate-spin" />
                  <span>AI assistant is analyzing symptoms...</span>
                </div>
              )}
            </div>

            {/* Input Controls & Voice Recorder */}
            <div className="p-4 bg-white border-t border-[#E8ECE7] space-y-3">
              <form
                onSubmit={(e) => { e.preventDefault(); onSendIntakeMessage(); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={isRecording ? 'Listening to voice...' : 'Type your symptoms or how you feel...'}
                  value={intakeText}
                  onChange={(e) => setIntakeText(e.target.value)}
                  className="flex-1 h-11 px-4 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white text-xs text-[#142A1F] placeholder:text-[#8E9F94] focus:outline-none"
                />

                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={onToggleRecording}
                  className={`h-11 px-3.5 rounded-xl border transition-all flex items-center justify-center ${
                    isRecording
                      ? 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626] animate-pulse'
                      : 'bg-[#F4F6F2] border-[#E3E8E3] text-[#335341] hover:bg-[#EAEFE8]'
                  }`}
                  title={isRecording ? 'Stop Voice Recording' : 'Start Voice Input (Groq Whisper)'}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!intakeText.trim() || isSendingIntake}
                  className="h-11 px-4 rounded-xl bg-[#142A1F] hover:bg-[#0B1A13] disabled:opacity-40 text-white flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Bottom Finish Action */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#7A9183]">
                  {isTranscribing ? 'Transcribing speech audio...' : intakeStatus}
                </span>
                <button
                  type="button"
                  onClick={() => onFinishIntake()}
                  className="text-xs font-bold text-[#142A1F] hover:text-[#059669] transition-colors flex items-center gap-1"
                >
                  <span>Complete Intake & Generate SOAP</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default PatientIntakeCard;
