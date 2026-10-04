import React from 'react';
import { Pill, Folder, CircleDot, Droplet, Plus, ChevronDown } from 'lucide-react';
import { DoctorVisit, PrescriptionItem } from '../../api';

export type FrequencyOption = 'once' | 'twice' | 'thrice' | 'prn';

const SAP = '#142E1F';
const SAP_HOVER = '#0E2116';
const STONE50 = '#FAFAF9';
const STONE100 = '#F5F5F4';
const STONE200 = '#E7E5E4';
const STONE400 = '#A8A29E';
const STONE500 = '#78716C';
const STONE600 = '#57534E';
const STONE700 = '#44403C';
const STONE800 = '#292524';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.78rem',
  border: `1px solid ${STONE200}`, borderRadius: 10, background: STONE50,
  color: STONE800, outline: 'none', fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.62rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.07em', color: STONE500, marginBottom: 4,
};

interface DoctorPrescriptionStudioProps {
  selectedVisit: DoctorVisit | null;
  prescriptionId: string;
  prescriptionNotes: string;
  setPrescriptionNotes: (val: string) => void;
  createPrescription: () => Promise<void>;
  prescriptionStatus: string;
  currentPrescriptionItems: PrescriptionItem[];
  medicationName: string;
  setMedicationName: (val: string) => void;
  medicineType: 'tablet' | 'syrup';
  setMedicineType: (val: 'tablet' | 'syrup') => void;
  dosage: string;
  setDosage: (val: string) => void;
  syrupQuantity: string;
  setSyrupQuantity: (val: string) => void;
  frequency: FrequencyOption;
  setFrequency: (val: FrequencyOption) => void;
  duration: string;
  setDuration: (val: string) => void;
  customInstructions: string;
  setCustomInstructions: (val: string) => void;
  addMedication: () => Promise<void>;
  medicationStatus: string;
}

export const DoctorPrescriptionStudio: React.FC<DoctorPrescriptionStudioProps> = ({
  selectedVisit,
  prescriptionId,
  prescriptionNotes,
  setPrescriptionNotes,
  createPrescription,
  prescriptionStatus,
  currentPrescriptionItems,
  medicationName,
  setMedicationName,
  medicineType,
  setMedicineType,
  dosage,
  setDosage,
  syrupQuantity,
  setSyrupQuantity,
  frequency,
  setFrequency,
  duration,
  setDuration,
  customInstructions,
  setCustomInstructions,
  addMedication,
  medicationStatus,
}) => {
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionId && selectedVisit) await createPrescription();
    await addMedication();
  };

  const typeBtn = (type: 'tablet' | 'syrup', Icon: React.ElementType, label: string) => {
    const active = medicineType === type;
    return (
      <button type="button" onClick={() => setMedicineType(type)}
        style={{ flex: 1, padding: '0.45rem', borderRadius: 8, border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: active ? SAP : 'transparent', color: active ? '#fff' : STONE600, transition: 'all 0.15s' }}>
        <Icon size={12} /> {label}
      </button>
    );
  };

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: `1px solid ${STONE100}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Pill size={16} color={SAP} />
          <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: SAP, fontSize: '0.95rem' }}>Prescription Studio</span>
        </div>
        <button type="button"
          onClick={() => { if (!prescriptionId && selectedVisit) void createPrescription(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.65rem', borderRadius: 8, border: `1px solid ${STONE200}`, background: STONE50, color: STONE600, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}>
          <Folder size={11} color={STONE400} />
          {prescriptionId ? 'Prescription Active' : 'Load from Previous'}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={e => void handleAdd(e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Row 1: Medicine + Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Medicine Name</label>
            <input value={medicationName} onChange={e => setMedicationName(e.target.value)}
              placeholder="Search medicine (e.g. Paracetamol, Amoxicillin)..."
              type="text" style={inputStyle} />
          </div>
          <div style={{ minWidth: 120 }}>
            <label style={labelStyle}>Type</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: STONE100, padding: 3, borderRadius: 10 }}>
              {typeBtn('tablet', CircleDot, 'Tablet')}
              {typeBtn('syrup', Droplet, 'Syrup')}
            </div>
          </div>
        </div>

        {/* Row 2: Dosage + Frequency + Duration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Dosage</label>
            <input value={medicineType === 'tablet' ? dosage : syrupQuantity}
              onChange={e => medicineType === 'tablet' ? setDosage(e.target.value) : setSyrupQuantity(e.target.value)}
              placeholder={medicineType === 'tablet' ? 'e.g. 500mg' : 'e.g. 5ml'}
              type="text" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Frequency</label>
            <div style={{ position: 'relative' }}>
              <select value={frequency} onChange={e => setFrequency(e.target.value as FrequencyOption)}
                style={{ ...inputStyle, appearance: 'none', paddingRight: '2rem' }}>
                <option value="once">Once a day</option>
                <option value="twice">Twice a day</option>
                <option value="thrice">Thrice a day</option>
                <option value="prn">As needed (PRN)</option>
              </select>
              <ChevronDown size={13} color={STONE400} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Duration</label>
            <input value={duration} onChange={e => setDuration(e.target.value)}
              placeholder="e.g. 5 days" type="text" style={inputStyle} />
          </div>
        </div>

        {/* Row 3: Instructions + Submit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Instructions (Optional)</label>
            <input value={customInstructions} onChange={e => setCustomInstructions(e.target.value)}
              placeholder="Add special instructions or notes..."
              type="text" style={inputStyle} />
          </div>
          <button type="submit" disabled={!medicationName}
            style={{ padding: '0.55rem 1rem', background: SAP, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.75rem', fontWeight: 700, cursor: medicationName ? 'pointer' : 'not-allowed', opacity: medicationName ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            <Plus size={13} /> Add to Prescription
          </button>
        </div>
      </form>

      {/* Prescription items list */}
      {currentPrescriptionItems.length > 0 && (
        <div style={{ paddingTop: '0.75rem', borderTop: `1px solid ${STONE100}` }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: STONE500, marginBottom: '0.5rem' }}>
            Active Prescription Items ({currentPrescriptionItems.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {currentPrescriptionItems.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.65rem', background: STONE50, border: `1px solid ${STONE200}`, borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: SAP, fontSize: '0.78rem' }}>{item.medicine_name}</div>
                  <div style={{ fontSize: '0.62rem', color: STONE600, marginTop: 1 }}>
                    {item.dosage || 'Standard'} · {item.frequency} · {item.duration}
                  </div>
                </div>
                <span style={{ padding: '2px 8px', fontSize: '0.6rem', fontWeight: 700, background: '#ecfdf5', color: '#065f46', borderRadius: 999 }}>
                  PRESCRIBED
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {medicationStatus && <p style={{ fontSize: '0.72rem', color: '#059669', textAlign: 'center', margin: 0 }}>{medicationStatus}</p>}
      {prescriptionStatus && <p style={{ fontSize: '0.72rem', color: STONE500, textAlign: 'center', margin: 0 }}>{prescriptionStatus}</p>}
    </div>
  );
};

export default DoctorPrescriptionStudio;
