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
    <div className="bg-[#FFFFFF] border border-[#E8ECE7] rounded-3xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#F0F4F0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#EFF7ED] text-[#1E432F] flex items-center justify-center">
            <History className="w-4 h-4 text-[#10B981]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#142A1F]">Visit Timeline & Clinical SOAP Notes</h3>
            <span className="text-[10px] text-[#63806F]">Physician consultation history & generated documentation</span>
          </div>
        </div>
        <button className="text-[11px] font-semibold text-[#142A1F] hover:text-[#059669] flex items-center gap-1 transition-colors">
          <span>View all</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Timeline Items */}
      <div className="space-y-4">
        {defaultVisits.map((visit) => {
          const isExpanded = expandedVisitId === visit.id;

          return (
            <div
              key={visit.id}
              className="border border-[#E4ECE3] rounded-2xl overflow-hidden transition-all bg-[#FAFBF9]"
            >
              {/* Visit Row Header */}
              <div
                onClick={() => setExpandedVisitId(isExpanded ? '' : visit.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#F3F7F4] transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E1E8E0] flex flex-col items-center justify-center text-center shrink-0">
                    <span className="text-[9px] font-bold text-[#63806F] uppercase leading-none">
                      {visit.date.split(' ')[0]}
                    </span>
                    <span className="text-sm font-bold text-[#142A1F] leading-none mt-0.5">
                      {visit.date.split(' ')[1].replace(',', '')}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-[#142A1F]">{visit.type}</h4>
                    <span className="text-[10px] text-[#63806F] block mt-0.5">
                      {visit.time} • {visit.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                    {visit.status}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#7A9183]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#7A9183]" />
                  )}
                </div>
              </div>

              {/* Expandable SOAP Details */}
              {isExpanded && (
                <div className="p-4 pt-0 border-t border-[#E8ECE7] bg-white animate-in fade-in duration-200">
                  <div className="pt-3 pb-2 flex items-center justify-between text-xs">
                    <div className="font-bold text-[#142A1F] flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>{visit.doctor}</span>
                    </div>
                    <span className="text-[10px] text-[#7A9183]">Clinical Summary (SOAP)</span>
                  </div>

                  {/* 4 SOAP Boxes in Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
                    
                    {/* S: Subjective */}
                    <div className="p-3 bg-[#F8FAF8] border border-[#E5ECE5] rounded-xl flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-[#E5EFE7] text-[#1B382B] font-bold text-xs flex items-center justify-center shrink-0">
                        S
                      </span>
                      <div className="text-[11px] leading-relaxed">
                        <strong className="block text-[#142A1F] font-bold">Subjective</strong>
                        <p className="text-[#3E5C4B] mt-0.5">{visit.soap.subjective}</p>
                      </div>
                    </div>

                    {/* O: Objective */}
                    <div className="p-3 bg-[#F8FAF8] border border-[#E5ECE5] rounded-xl flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-[#EFF6FF] text-[#1E40AF] font-bold text-xs flex items-center justify-center shrink-0">
                        O
                      </span>
                      <div className="text-[11px] leading-relaxed">
                        <strong className="block text-[#142A1F] font-bold">Objective</strong>
                        <p className="text-[#3E5C4B] mt-0.5">{visit.soap.objective}</p>
                      </div>
                    </div>

                    {/* A: Assessment */}
                    <div className="p-3 bg-[#F8FAF8] border border-[#E5ECE5] rounded-xl flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-[#FEF3C7] text-[#92400E] font-bold text-xs flex items-center justify-center shrink-0">
                        A
                      </span>
                      <div className="text-[11px] leading-relaxed">
                        <strong className="block text-[#142A1F] font-bold">Assessment</strong>
                        <p className="text-[#3E5C4B] mt-0.5">{visit.soap.assessment}</p>
                      </div>
                    </div>

                    {/* P: Plan */}
                    <div className="p-3 bg-[#F8FAF8] border border-[#E5ECE5] rounded-xl flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-[#F3E8FF] text-[#6B21A8] font-bold text-xs flex items-center justify-center shrink-0">
                        P
                      </span>
                      <div className="text-[11px] leading-relaxed">
                        <strong className="block text-[#142A1F] font-bold">Plan</strong>
                        <p className="text-[#3E5C4B] mt-0.5">{visit.soap.plan}</p>
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
