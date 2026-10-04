import React, { useState } from 'react';
import { History, Calendar, CheckCircle2, ChevronDown, ChevronUp, UserCheck, Stethoscope, ArrowRight } from 'lucide-react';
import { DoctorVisit, AISummary } from '../../api';

interface PatientVisitTimelineProps {
  visits: DoctorVisit[];
}

export const PatientVisitTimeline: React.FC<PatientVisitTimelineProps> = ({
  visits,
}) => {
  const [expandedVisitId, setExpandedVisitId] = useState<string>('visit-1');

  const defaultVisits = [
    {
      id: 'visit-1',
      date: 'Oct 1, 2026',
      time: '7:47 AM',
      doctor: 'Dr. Evelyn Reed, MD',
      type: 'Consultation with Dr. Evelyn Reed, MD',
      location: 'MedAssist Clinic, Pune • 1 visit',
      status: 'Completed',
      soap: {
        subjective: 'Patient reports acute onset of exertional dyspnea, wheezing, and dry cough following exercise. Rescue inhaler provided transient relief. Denies orthopnea or palpitations.',
        objective: 'Vitals reported stable. Past history of mild persistent asthma and allergy to penicillin. Physical exam unremarkable for acute distress.',
        assessment: 'Acute asthma exacerbation triggered by exercise/environmental exposure with mild bronchospasm.',
        plan: 'Prescribe maintenance inhaled corticosteroid (Flovent) and continue Albuterol PRN. Check peak flow metrics daily. Schedule follow-up in 2 weeks.'
      }
    },
    {
      id: 'visit-2',
      date: 'Sep 12, 2026',
      time: '9:30 AM',
      doctor: 'Dr. Evelyn Reed, MD',
      type: 'Follow-up Visit',
      location: 'MedAssist Clinic, Pune',
      status: 'Completed',
      soap: {
        subjective: 'Routine follow-up for asthma and seasonal rhinitis management.',
        objective: 'Lungs clear to auscultation bilaterally. SpO2 99% on room air.',
        assessment: 'Stable controlled asthma on maintenance therapy.',
        plan: 'Continue current medication regimen. Reassess in 1 month.'
      }
    },
    {
      id: 'visit-3',
      date: 'Aug 5, 2026',
      time: '11:15 AM',
      doctor: 'Dr. Evelyn Reed, MD',
      type: 'Initial Consultation',
      location: 'MedAssist Clinic, Pune',
      status: 'Completed',
      soap: {
        subjective: 'Initial presentation of recurring shortness of breath after mild cardio.',
        objective: 'Blood pressure 124/82 mmHg, HR 74 bpm.',
        assessment: 'Suspected exercise-induced asthma.',
        plan: 'Ordered pulmonary function tests and prescribed rescue inhaler.'
      }
    }
  ];

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #E8E7E0',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #F0F4F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#EFF7ED',
              color: '#1E432F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <History size={16} color="#10B981" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#142A1F', margin: 0, lineHeight: 1.2 }}>
              Visit Timeline & Clinical SOAP Notes
            </h3>
            <span style={{ fontSize: '0.7rem', color: '#63806F' }}>
              Physician consultation history & generated documentation
            </span>
          </div>
        </div>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); }}
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: '#78716C',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <span>View all</span>
          <ArrowRight size={13} />
        </a>
      </div>

      {/* Timeline Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {defaultVisits.map((visit) => {
          const isExpanded = expandedVisitId === visit.id;

          return (
            <div
              key={visit.id}
              style={{
                border: '1px solid #E4ECE3',
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: '#FAFBF9',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Visit Row Header */}
              <div
                onClick={() => setExpandedVisitId(isExpanded ? '' : visit.id)}
                style={{
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  backgroundColor: isExpanded ? '#F4F7F4' : '#FAFBF9',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E1E8E0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#63806F', textTransform: 'uppercase', lineHeight: 1 }}>
                      {visit.date.split(' ')[0]}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#142A1F', lineHeight: 1, marginTop: 2 }}>
                      {visit.date.split(' ')[1].replace(',', '')}
                    </span>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#142A1F', margin: 0 }}>{visit.type}</h4>
                    <span style={{ fontSize: '0.7rem', color: '#63806F', display: 'block', marginTop: 2 }}>
                      {visit.time} • {visit.location}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: 999,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      border: '1px solid #A7F3D0',
                    }}
                  >
                    {visit.status}
                  </span>
                  {isExpanded ? (
                    <ChevronUp size={16} color="#7A9183" />
                  ) : (
                    <ChevronDown size={16} color="#7A9183" />
                  )}
                </div>
              </div>

              {/* Expandable SOAP Details */}
              {isExpanded && (
                <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid #E8ECE7', backgroundColor: '#FFFFFF' }}>
                  <div style={{ paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 600, color: '#142A1F', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <UserCheck size={14} color="#10B981" />
                      <span>{visit.doctor}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#7A9183' }}>Clinical Summary (SOAP)</span>
                  </div>

                  {/* 4 SOAP Boxes in Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem', marginTop: '0.35rem' }}>
                    {/* S: Subjective */}
                    <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#F8FAF8', border: '1px solid #E5ECE5', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: '#E5EFE7', color: '#1B382B', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        S
                      </span>
                      <div style={{ fontSize: '0.74rem', lineHeight: 1.45 }}>
                        <strong style={{ display: 'block', color: '#142A1F', fontWeight: 600 }}>Subjective</strong>
                        <p style={{ color: '#3E5C4B', margin: '2px 0 0 0' }}>{visit.soap.subjective}</p>
                      </div>
                    </div>

                    {/* O: Objective */}
                    <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#F8FAF8', border: '1px solid #E5ECE5', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#1E40AF', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        O
                      </span>
                      <div style={{ fontSize: '0.74rem', lineHeight: 1.45 }}>
                        <strong style={{ display: 'block', color: '#142A1F', fontWeight: 600 }}>Objective</strong>
                        <p style={{ color: '#3E5C4B', margin: '2px 0 0 0' }}>{visit.soap.objective}</p>
                      </div>
                    </div>

                    {/* A: Assessment */}
                    <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#F8FAF8', border: '1px solid #E5ECE5', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        A
                      </span>
                      <div style={{ fontSize: '0.74rem', lineHeight: 1.45 }}>
                        <strong style={{ display: 'block', color: '#142A1F', fontWeight: 600 }}>Assessment</strong>
                        <p style={{ color: '#3E5C4B', margin: '2px 0 0 0' }}>{visit.soap.assessment}</p>
                      </div>
                    </div>

                    {/* P: Plan */}
                    <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#F8FAF8', border: '1px solid #E5ECE5', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: '#F3E8FF', color: '#6B21A8', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        P
                      </span>
                      <div style={{ fontSize: '0.74rem', lineHeight: 1.45 }}>
                        <strong style={{ display: 'block', color: '#142A1F', fontWeight: 600 }}>Plan</strong>
                        <p style={{ color: '#3E5C4B', margin: '2px 0 0 0' }}>{visit.soap.plan}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PatientVisitTimeline;
