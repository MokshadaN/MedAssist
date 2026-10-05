import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Brain,
} from 'lucide-react';
import { DoctorDirectoryItem, AISummary, EmergencyHospital, SOAPClassification, api } from '../../api';

type ChatMessage = { role: 'assistant' | 'user'; text: string; soapLabel?: string; soapConfidence?: number };

// ─── SOAP badge config ────────────────────────────────────────────────────────
const SOAP_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; dot: string; short: string }
> = {
  Subjective:  { color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981', short: 'S' },
  Objective:   { color: '#1E3A8A', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6', short: 'O' },
  Assessment:  { color: '#713F12', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B', short: 'A' },
  Plan:        { color: '#4C1D95', bg: '#F5F3FF', border: '#DDD6FE', dot: '#8B5CF6', short: 'P' },
  Unclear:     { color: '#374151', bg: '#F9FAFB', border: '#E5E7EB', dot: '#9CA3AF', short: '?' },
};

function SOAPBadge({
  result,
  isLoading,
}: {
  result: SOAPClassification | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.2rem 0.65rem',
          borderRadius: 999,
          backgroundColor: '#F3F4F6',
          border: '1px solid #E5E7EB',
          fontSize: '0.68rem',
          color: '#6B7280',
          fontWeight: 500,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      >
        <Brain size={11} />
        <span>Classifying…</span>
      </div>
    );
  }

  if (!result || !result.available || result.label === 'Unavailable') return null;

  const cfg = SOAP_CONFIG[result.label] ?? SOAP_CONFIG['Unclear'];
  const pct = Math.round(result.confidence * 100);

  return (
    <div
      title={`PubMedBERT classified this as "${result.label}" (${pct}% confidence)`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.65rem',
        borderRadius: 999,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        fontSize: '0.68rem',
        color: cfg.color,
        fontWeight: 600,
        transition: 'all 0.2s ease',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: cfg.dot,
          flexShrink: 0,
        }}
      />
      <span>{result.label === 'Unclear' ? 'Keep describing…' : result.label}</span>
      {result.label !== 'Unclear' && (
        <span style={{ opacity: 0.7 }}>{pct}%</span>
      )}
    </div>
  );
}

// Small inline SOAP tag shown on each user message bubble
function MessageSOAPTag({ label, confidence }: { label: string; confidence: number }) {
  const cfg = SOAP_CONFIG[label];
  if (!cfg) return null;
  return (
    <span
      title={`${label} — ${Math.round(confidence * 100)}% confidence`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.1rem 0.45rem',
        borderRadius: 999,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        fontSize: '0.62rem',
        color: cfg.color,
        fontWeight: 700,
        marginTop: '0.3rem',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: cfg.dot, flexShrink: 0 }} />
      {cfg.short}
    </span>
  );
}

// Coverage strip: which SOAP sections have been captured
function SOAPCoverageStrip({ messages }: { messages: ChatMessage[] }) {
  const covered = new Set(messages.filter((m) => m.soapLabel && m.soapLabel !== 'Unclear').map((m) => m.soapLabel));
  const sections = [
    { key: 'Subjective',  label: 'S', title: 'Subjective'  },
    { key: 'Objective',   label: 'O', title: 'Objective'   },
    { key: 'Assessment',  label: 'A', title: 'Assessment'  },
    { key: 'Plan',        label: 'P', title: 'Plan'        },
  ];
  const hasSome = messages.some((m) => m.role === 'user');
  if (!hasSome) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.45rem 1.25rem',
        backgroundColor: '#F8FAF7',
        borderBottom: '1px solid #E8ECE7',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#63806F', textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: '0.25rem' }}>
        SOAP
      </span>
      {sections.map(({ key, label, title }) => {
        const ok = covered.has(key);
        const cfg = SOAP_CONFIG[key];
        return (
          <span
            key={key}
            title={`${title}: ${ok ? 'captured' : 'not yet covered'}`}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: `1px solid ${ok ? cfg.border : '#E5E7EB'}`,
              backgroundColor: ok ? cfg.bg : '#F9FAFB',
              color: ok ? cfg.color : '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
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
  authToken: string | null;
  onStartIntake: () => Promise<void>;
  onSendIntakeMessage: () => Promise<void>;
  onToggleRecording: () => void;
  onFinishIntake: () => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────
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
  authToken,
  onStartIntake,
  onSendIntakeMessage,
  onToggleRecording,
  onFinishIntake,
}) => {
  // ── SOAP real-time classification state ──────────────────────────────────────
  const [soapResult, setSoapResult] = useState<SOAPClassification | null>(null);
  const [soapLoading, setSoapLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runClassify = useCallback(
    async (text: string) => {
      if (!authToken || !text.trim() || text.trim().length < 8) {
        setSoapResult(null);
        setSoapLoading(false);
        return;
      }
      // Cancel any previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setSoapLoading(true);
      try {
        const result = await api.classifySOAP(text.trim(), authToken);
        setSoapResult(result);
      } catch {
        // Silent fail — never disrupt the patient typing flow
        setSoapResult(null);
      } finally {
        setSoapLoading(false);
      }
    },
    [authToken],
  );

  // Debounce: classify 400ms after the user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!intakeText.trim() || intakeText.trim().length < 8) {
      setSoapResult(null);
      setSoapLoading(false);
      return;
    }
    setSoapLoading(true);
    debounceRef.current = setTimeout(() => {
      runClassify(intakeText);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [intakeText, runClassify]);

  // Clear badge after message is sent
  useEffect(() => {
    if (!isSendingIntake) {
      setSoapResult(null);
      setSoapLoading(false);
    }
  }, [isSendingIntake]);

  return (
    <>
      {/* Start Visit Card on Dashboard */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8E7E0',
          borderRadius: 16,
          padding: '1.25rem 1.5rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', zIndex: 1, maxWidth: 540 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#EAF5EC',
              color: '#1E432F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid #D2E4D6',
            }}
          >
            <Stethoscope size={22} color="#10B981" />
          </div>
          <div>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#63806F',
                display: 'block',
              }}
            >
              CONSULTATION
            </span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#142A1F', margin: '2px 0 0 0', lineHeight: 1.25 }}>
              Start a new visit
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#52705E', margin: '4px 0 0 0', lineHeight: 1.45 }}>
              Select a specialist, complete your AI triage questionnaire, and your results will be sent to the doctor.
            </p>
          </div>
        </div>

        {/* Doctor Selection & CTA Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', zIndex: 1 }}>
          <select
            id="doctor-select-dropdown"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            style={{
              height: 42,
              padding: '0 0.85rem',
              borderRadius: 10,
              backgroundColor: '#F4F6F2',
              border: '1px solid #D8E0D7',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: '#142A1F',
              outline: 'none',
              minWidth: 220,
              fontFamily: 'inherit',
            }}
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
            style={{
              height: 42,
              padding: '0 1.25rem',
              borderRadius: 10,
              border: 'none',
              backgroundColor: selectedDoctorId ? '#142A1F' : '#A3B0A7',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: selectedDoctorId ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Begin Intake</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Decorative corner accent */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 120,
            height: 120,
            backgroundColor: '#EAF5EC',
            opacity: 0.4,
            borderRadius: '50%',
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* AI Clinical Consultation Dialog Modal */}
      {intakeOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(20, 46, 31, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 22,
              width: '100%',
              maxWidth: 620,
              maxHeight: 'min(86vh, 680px)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(20, 46, 31, 0.2), 0 4px 12px rgba(0,0,0,0.06)',
              border: '1px solid #E4ECE3',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '0.9rem 1.25rem',
                borderBottom: '1px solid #E8ECE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAF7',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#142A1F',
                    color: '#86EFAC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={18} color="#86EFAC" />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#142A1F', margin: 0, lineHeight: 1.25 }}>
                    AI Clinical Intake Assistant
                  </h3>
                  <p style={{ fontSize: '0.7rem', color: '#63806F', margin: '2px 0 0 0' }}>
                    Conversational triage & symptom evaluation · PubMedBERT SOAP classification
                  </p>
                </div>
              </div>
              <button
                id="close-intake-modal-btn"
                onClick={() => setIntakeOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#7A9183',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EAEFEA')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <X size={16} />
              </button>
            </div>

            {/* Emergency & Red-Flag Warnings */}
            {emergencyMessage && (
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: '#FEF2F2',
                  borderBottom: '1px solid #FCA5A5',
                  fontSize: '0.75rem',
                  color: '#991B1B',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ display: 'block', fontWeight: 700 }}>EMERGENCY RED FLAG DETECTED:</strong>
                  <p style={{ margin: '2px 0 0 0' }}>{emergencyMessage}</p>
                  {emergencyHospitals.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>Nearest Emergency Care:</span>
                      {emergencyHospitals.slice(0, 2).map((h, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: '0.7rem',
                            backgroundColor: '#FFFFFF',
                            padding: '0.35rem 0.5rem',
                            borderRadius: 6,
                            border: '1px solid rgba(252,165,165,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>{h.name}</span>
                          <span style={{ fontWeight: 700 }}>{h.phone || 'Call 911'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Advisory note */}
            {intakeAdvisory && (
              <div
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  borderBottom: '1px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{intakeAdvisory}</span>
              </div>
            )}

            {/* SOAP Coverage Strip */}
            <SOAPCoverageStrip messages={intakeMessages} />

            {/* Message Thread */}
            <div
              style={{
                flex: '1 1 auto',
                overflowY: 'auto',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                backgroundColor: '#FAFBF9',
                minHeight: 180,
                maxHeight: 380,
              }}
            >
              {intakeMessages.map((msg, i) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.65rem',
                      justifyContent: isAssistant ? 'flex-start' : 'flex-end',
                    }}
                  >
                    {isAssistant && (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          backgroundColor: '#142A1F',
                          color: '#86EFAC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Bot size={15} color="#86EFAC" />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isAssistant ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
                      <div
                        style={{
                          borderRadius: 14,
                          padding: '0.65rem 0.95rem',
                          fontSize: '0.8rem',
                          lineHeight: 1.5,
                          backgroundColor: isAssistant ? '#FFFFFF' : '#142A1F',
                          color: isAssistant ? '#142A1F' : '#FFFFFF',
                          border: isAssistant ? '1px solid #E3E8E3' : 'none',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        {msg.text}
                      </div>
                      {/* SOAP mini tag on user messages */}
                      {!isAssistant && msg.soapLabel && msg.soapLabel !== 'Unclear' && msg.soapConfidence !== undefined && (
                        <MessageSOAPTag label={msg.soapLabel} confidence={msg.soapConfidence} />
                      )}
                    </div>
                    {!isAssistant && (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <User size={15} />
                      </div>
                    )}
                  </div>
                );
              })}

              {isSendingIntake && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#63806F',
                    fontStyle: 'italic',
                  }}
                >
                  <Sparkles size={14} color="#10B981" />
                  <span>AI assistant is analyzing symptoms...</span>
                </div>
              )}
            </div>

            {/* Input Controls & Voice Recorder */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                backgroundColor: '#FFFFFF',
                borderTop: '1px solid #E8ECE7',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                flexShrink: 0,
                boxSizing: 'border-box',
              }}
            >
              {/* Real-time SOAP badge — shown above the input */}
              <div style={{ minHeight: 26, display: 'flex', alignItems: 'center' }}>
                <SOAPBadge result={soapResult} isLoading={soapLoading && intakeText.trim().length >= 8} />
                {soapResult?.feedback && (
                  <span
                    style={{
                      marginLeft: '0.6rem',
                      fontSize: '0.67rem',
                      color: '#92400E',
                      fontStyle: 'italic',
                    }}
                  >
                    {soapResult.feedback}
                  </span>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSendIntakeMessage();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#F4F6F2',
                    border: '1px solid #D8E0D7',
                    borderRadius: 12,
                    padding: '0 0.85rem',
                    height: 42,
                    boxSizing: 'border-box',
                  }}
                >
                  <input
                    id="intake-message-input"
                    type="text"
                    placeholder={isRecording ? 'Listening to voice...' : 'Type your symptoms or how you feel…'}
                    value={intakeText}
                    onChange={(e) => setIntakeText(e.target.value)}
                    style={{
                      width: '100%',
                      minWidth: 0,
                      border: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '0.82rem',
                      color: '#142A1F',
                      outline: 'none',
                      padding: 0,
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={onToggleRecording}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    border: isRecording ? '1px solid #DC2626' : '1px solid #D8E0D7',
                    backgroundColor: isRecording ? '#FEF2F2' : '#F4F6F2',
                    color: isRecording ? '#DC2626' : '#2D5A43',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                  title={isRecording ? 'Stop Voice Recording' : 'Start Voice Input (Groq Whisper)'}
                >
                  {isRecording ? <MicOff size={17} /> : <Mic size={17} />}
                </button>

                {/* Send Button */}
                <button
                  id="intake-send-btn"
                  type="submit"
                  disabled={!intakeText.trim() || isSendingIntake}
                  style={{
                    height: 42,
                    padding: '0 1rem',
                    borderRadius: 12,
                    border: 'none',
                    backgroundColor: !intakeText.trim() || isSendingIntake ? '#A8B5AC' : '#142A1F',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    cursor: !intakeText.trim() || isSendingIntake ? 'not-allowed' : 'pointer',
                    flexShrink: 0,
                    transition: 'background-color 0.15s',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <span>Send</span>
                  <Send size={14} />
                </button>
              </form>

              {/* Bottom Finish Action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#63806F',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 240,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  {isTranscribing ? 'Transcribing speech audio...' : intakeStatus}
                </span>

                <button
                  id="finish-intake-btn"
                  type="button"
                  onClick={() => onFinishIntake()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 8,
                    border: '1px solid #10B981',
                    backgroundColor: '#ECFDF5',
                    color: '#065F46',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#10B981';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ECFDF5';
                    e.currentTarget.style.color = '#065F46';
                  }}
                >
                  <span>Complete Intake & Generate SOAP</span>
                  <CheckCircle2 size={14} />
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
