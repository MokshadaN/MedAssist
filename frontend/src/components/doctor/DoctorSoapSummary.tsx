import React from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';
import { AISummary, SessionState } from '../../api';
import { formatSummary } from '../../utils/formatters';

const SAP = '#142E1F';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';

// ─── SOAP colour palette ──────────────────────────────────────────────────────
const SOAP_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; label: string }> = {
  Subjective:  { color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981', label: 'S — Subjective'  },
  Objective:   { color: '#1E3A8A', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6', label: 'O — Objective'   },
  Assessment:  { color: '#713F12', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B', label: 'A — Assessment'  },
  Plan:        { color: '#4C1D95', bg: '#F5F3FF', border: '#DDD6FE', dot: '#8B5CF6', label: 'P — Plan'        },
  Unclear:     { color: '#374151', bg: '#F9FAFB', border: '#E5E7EB', dot: '#9CA3AF', label: '? — Unclear'     },
};

// Coverage strip showing which SOAP sections appear in this session
function SOAPCoverageBar({ messages }: { messages: SessionState['messages'] }) {
  const patientMessages = messages.filter((m) => m.sender === 'patient' && m.soap_label);
  const covered = new Set(patientMessages.map((m) => m.soap_label as string).filter((l) => l !== 'Unclear'));
  const sections = ['Subjective', 'Objective', 'Assessment', 'Plan'];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.65rem 0.85rem',
        backgroundColor: '#F8FAF7',
        borderRadius: 8,
        border: '1px solid #E8ECE7',
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#63806F', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: '0.25rem' }}>
        SOAP Coverage
      </span>
      {sections.map((s) => {
        const ok = covered.has(s);
        const cfg = SOAP_CONFIG[s];
        return (
          <span
            key={s}
            title={`${cfg.label}: ${ok ? '✓ captured' : '✗ not found in transcript'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.15rem 0.5rem',
              borderRadius: 999,
              backgroundColor: ok ? cfg.bg : '#F3F4F6',
              border: `1px solid ${ok ? cfg.border : '#E5E7EB'}`,
              fontSize: '0.65rem',
              color: ok ? cfg.color : '#9CA3AF',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: ok ? cfg.dot : '#D1D5DB',
                flexShrink: 0,
              }}
            />
            {s.charAt(0)}
            {ok ? ' ✓' : ''}
          </span>
        );
      })}
    </div>
  );
}

// Annotated transcript showing each patient message with its SOAP label
function AnnotatedTranscript({ messages }: { messages: SessionState['messages'] }) {
  if (!messages.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {messages.map((msg) => {
        const isPatient = msg.sender === 'patient';
        const cfg = msg.soap_label ? SOAP_CONFIG[msg.soap_label] : null;
        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              justifyContent: isPatient ? 'flex-end' : 'flex-start',
            }}
          >
            {!isPatient && (
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  backgroundColor: '#142A1F',
                  color: '#86EFAC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  marginTop: 2,
                }}
              >
                AI
              </span>
            )}
            <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: isPatient ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 10,
                  fontSize: '0.76rem',
                  lineHeight: 1.55,
                  backgroundColor: isPatient ? '#142A1F' : '#FFFFFF',
                  color: isPatient ? '#FFFFFF' : '#1C1C1E',
                  border: isPatient ? 'none' : `1px solid ${STONE200}`,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                {msg.message}
              </div>
              {/* SOAP label badge on patient messages */}
              {isPatient && cfg && msg.soap_label !== 'Unclear' && (
                <span
                  title={`${cfg.label} — ${msg.soap_confidence !== undefined ? Math.round((msg.soap_confidence ?? 0) * 100) : '?'}% confidence`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    marginTop: '0.25rem',
                    padding: '0.12rem 0.48rem',
                    borderRadius: 999,
                    backgroundColor: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    fontSize: '0.62rem',
                    color: cfg.color,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: cfg.dot, flexShrink: 0 }} />
                  {cfg.label}
                  {msg.soap_confidence !== undefined && (
                    <span style={{ opacity: 0.65 }}>{Math.round((msg.soap_confidence ?? 0) * 100)}%</span>
                  )}
                </span>
              )}
            </div>
            {isPatient && (
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  marginTop: 2,
                }}
              >
                PT
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface DoctorSoapSummaryProps {
  doctorSummary: AISummary | null;
  sessionSnapshot?: SessionState | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const DoctorSoapSummary: React.FC<DoctorSoapSummaryProps> = ({ doctorSummary, sessionSnapshot }) => {
  const [tab, setTab] = React.useState<'summary' | 'transcript'>('summary');

  const hasTranscript = sessionSnapshot && sessionSnapshot.messages.length > 0;

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '0.65rem',
          borderBottom: `1px solid ${STONE100}`,
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={14} color={SAP} />
          </div>
          <span
            style={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 700,
              color: SAP,
              fontSize: '0.95rem',
            }}
          >
            AI Clinical SOAP Summary
          </span>
        </div>

        {/* Tab switcher */}
        {hasTranscript && (
          <div
            style={{
              display: 'flex',
              border: `1px solid ${STONE200}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {(['summary', 'transcript'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: tab === t ? SAP : 'transparent',
                  color: tab === t ? '#FFFFFF' : '#6B7280',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'transcript' && <MessageSquare size={10} />}
                {t === 'summary' && <Sparkles size={10} />}
                {t}
              </button>
            ))}
          </div>
        )}

        <span
          style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#065f46',
            background: '#ecfdf5',
            padding: '2px 8px',
            borderRadius: 999,
            border: '1px solid #a7f3d0',
          }}
        >
          Generated from Visit
        </span>
      </div>

      {/* Tab: SOAP Summary */}
      {tab === 'summary' && (
        <>
          {doctorSummary ? (
            <div
              style={{
                background: STONE50,
                border: `1px solid ${STONE200}`,
                borderRadius: 10,
                padding: '0.85rem',
                fontSize: '0.78rem',
                color: '#44403C',
                lineHeight: 1.65,
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
              }}
            >
              {formatSummary(doctorSummary)}
            </div>
          ) : (
            <p style={{ fontSize: '0.76rem', color: '#9CA3AF', fontStyle: 'italic' }}>
              No SOAP summary available for this visit yet.
            </p>
          )}
        </>
      )}

      {/* Tab: Annotated Transcript */}
      {tab === 'transcript' && hasTranscript && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <SOAPCoverageBar messages={sessionSnapshot.messages} />
          <div
            style={{
              background: STONE50,
              border: `1px solid ${STONE200}`,
              borderRadius: 10,
              padding: '0.85rem',
              maxHeight: 380,
              overflowY: 'auto',
            }}
          >
            <AnnotatedTranscript messages={sessionSnapshot.messages} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorSoapSummary;
