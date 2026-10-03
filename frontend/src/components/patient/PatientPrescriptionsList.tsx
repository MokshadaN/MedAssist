import React from 'react';
import { Pill, ArrowRight, ShieldCheck, Check, Sparkles, UserCheck } from 'lucide-react';
import { Prescription } from '../../api';

interface PatientPrescriptionsListProps {
  prescriptions: Prescription[];
}

export const PatientPrescriptionsList: React.FC<PatientPrescriptionsListProps> = ({
  prescriptions,
}) => {
  const defaultItems = [
    {
      name: 'Flovent Diskus (Fluticasone)',
      details: '100 mcg • 1 puff twice daily',
      status: 'Active',
      color: 'text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]',
    },
    {
      name: 'Ventolin HFA (Albuterol)',
      details: '90 mcg • 2 puffs every 4–6 hours PRN',
      status: 'Active',
      color: 'text-[#10B981] bg-[#ECFDF5] border-[#A7F3D0]',
    },
    {
      name: 'Montelukast (Singulair)',
      details: '10 mg • 1 tablet once daily (Evening)',
      status: 'Active',
      color: 'text-[#DC2626] bg-[#FEF2F2] border-[#FCA5A5]',
    },
  ];

  return (
    <div className="bg-[#FFFFFF] border border-[#E8ECE7] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F0F4F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EFF7ED] text-[#1E432F] flex items-center justify-center">
              <Pill className="w-4 h-4 text-[#059669]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#142A1F]">Active Prescriptions</h3>
              <span className="text-[10px] text-[#63806F]">Verified medical treatments</span>
            </div>
          </div>
          <button className="text-[11px] font-semibold text-[#142A1F] hover:text-[#059669] flex items-center gap-1 transition-colors">
            <span>View all</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Doctor Clinical Instruction Banner */}
        <div className="mt-4 p-3 bg-[#F9FAF7] border border-[#E4EBE2] rounded-2xl flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#E3EFE6] text-[#1B382B] flex items-center justify-center shrink-0 mt-0.5">
            <UserCheck className="w-3.5 h-3.5 text-[#10B981]" />
          </div>
          <div className="text-[11px] text-[#335341] leading-relaxed">
            <span className="font-bold block text-[#142A1F]">Dr. Evelyn Reed, MD</span>
            <p className="mt-0.5">Continue peak-flow monitoring twice daily. Avoid known outdoor allergens and carry rescue inhaler.</p>
          </div>
        </div>

        {/* Medication Cards */}
        <div className="mt-3 space-y-2.5">
          {defaultItems.map((med, index) => (
            <div
              key={index}
              className="p-3 bg-[#FAFBF9] hover:bg-[#F3F7F4] border border-[#E6EBE5] rounded-2xl flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#E2E8E2] flex items-center justify-center shrink-0 shadow-2xs">
                  <Pill className="w-4 h-4 text-[#2D5A43]" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#142A1F]">{med.name}</h4>
                  <span className="text-[11px] text-[#63806F] block">{med.details}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                  {med.status}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#8AA293] group-hover:text-[#142A1F] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Refill pill */}
      <div className="pt-4 mt-4 border-t border-[#F0F4F0] flex items-center justify-between text-xs">
        <span className="text-[11px] text-[#7A9183]">3 active medicines prescribed</span>
        <button className="text-xs font-semibold text-[#142A1F] hover:text-[#059669] transition-colors">
          Request Refill →
        </button>
      </div>
    </div>
  );
};

export default PatientPrescriptionsList;
