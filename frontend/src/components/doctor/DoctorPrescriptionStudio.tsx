import React from 'react';
import { DoctorVisit, PrescriptionItem } from '../../api';

export type FrequencyOption = 'once' | 'twice' | 'thrice';

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
  return (
    <section className="panel wide">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Care Plan</div>
          <h2>Prescription Studio</h2>
        </div>
      </div>
      <div className="stack compact">
        <div className="row" style={{ gap: '1rem' }}>
          <div style={{ flex: 2 }}>
            <textarea
              rows={2}
              value={prescriptionNotes}
              onChange={(e) => setPrescriptionNotes(e.target.value)}
              placeholder="Overall prescription notes..."
            />
          </div>
          <div style={{ flex: 1 }}>
            <button
              className="secondary"
              style={{ height: '100%', width: '100%' }}
              onClick={() => void createPrescription()}
              disabled={!selectedVisit || Boolean(prescriptionId)}
            >
              {prescriptionId ? 'Prescription loaded' : 'Create ID'}
            </button>
          </div>
        </div>
        {prescriptionStatus && <div className="flash subtle">{prescriptionStatus}</div>}

        {prescriptionId && (
          <div
            className="panel animate-in"
            style={{
              background: 'var(--surface-soft)',
              padding: '1rem',
              border: '1px dashed var(--border)',
            }}
          >
            {currentPrescriptionItems.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="eyebrow">Added Items</div>
                <div className="stack compact" style={{ marginTop: '0.5rem' }}>
                  {currentPrescriptionItems.map((item) => (
                    <div
                      key={item.id}
                      className="record-card"
                      style={{
                        padding: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#fff' }}>{item.medicine_name}</strong>
                        <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                          {item.dosage || 'No dosage'} • {item.frequency} • {item.duration}
                        </div>
                      </div>
                      <span className="pill">Added</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="eyebrow">Add Items</div>
            <div className="stack compact" style={{ marginTop: '0.5rem' }}>
              <label className="field">
                <span>Medicine Name</span>
                <input
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  placeholder="Medicine name"
                />
              </label>
              <div className="row" style={{ gap: '0.75rem' }}>
                <label className={`pill ${medicineType === 'tablet' ? 'active-pill' : ''}`} style={{ cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="medicineType"
                    checked={medicineType === 'tablet'}
                    onChange={() => setMedicineType('tablet')}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Tablet
                </label>
                <label className={`pill ${medicineType === 'syrup' ? 'active-pill' : ''}`} style={{ cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="medicineType"
                    checked={medicineType === 'syrup'}
                    onChange={() => setMedicineType('syrup')}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Syrup
                </label>
              </div>
              {medicineType === 'tablet' ? (
                <label className="field">
                  <span>Dosage</span>
                  <input
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="Dosage (e.g. 500mg)"
                  />
                </label>
              ) : (
                <label className="field">
                  <span>Quantity</span>
                  <input
                    value={syrupQuantity}
                    onChange={(e) => setSyrupQuantity(e.target.value)}
                    placeholder="Quantity (e.g. 5 ml)"
                  />
                </label>
              )}
              <div className="field">
                <span>Frequency</span>
                <div className="row" style={{ gap: '0.75rem' }}>
                  {(
                    [
                      ['once', 'Once a day'],
                      ['twice', 'Twice a day'],
                      ['thrice', 'Thrice a day'],
                    ] as Array<[FrequencyOption, string]>
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className={`pill ${frequency === value ? 'active-pill' : ''}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        type="radio"
                        name="frequency"
                        checked={frequency === value}
                        onChange={() => setFrequency(value)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <label className="field">
                <span>Duration</span>
                <input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Duration (e.g. 5 days)"
                />
              </label>
              <label className="field">
                <span>Custom Instructions</span>
                <textarea
                  rows={2}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Add special instructions or notes"
                />
              </label>
            </div>
            <button
              className="primary"
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => void addMedication()}
              disabled={!medicationName || !duration}
            >
              Add Item
            </button>
            {medicationStatus && <div className="flash subtle" style={{ marginTop: '0.75rem' }}>{medicationStatus}</div>}
          </div>
        )}
      </div>
    </section>
  );
};

export default DoctorPrescriptionStudio;
