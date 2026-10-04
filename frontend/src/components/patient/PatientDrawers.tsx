import React, { useState } from 'react';
import {
  X,
  Search,
  Pill,
  Bell,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Info
} from 'lucide-react';
import { Notification, PatientProfile } from '../../api';
import { QRCodeSVG } from 'qrcode.react';

interface MedicineInfo {
  name: string;
  generic?: string;
  purpose: string;
  sideEffects: string;
  usage: string;
  category: string;
  warnings?: string;
}

interface PatientDrawersProps {
  showMedicineBox: boolean;
  setShowMedicineBox: (show: boolean) => void;
  medicineDb: MedicineInfo[];
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  notifications: Notification[];
  onMarkNotificationRead: (n: Notification) => void;
  showQR: boolean;
  setShowQR: (show: boolean) => void;
  patientProfile: PatientProfile | null;
  publicProfileUrl?: string;
}

export const PatientDrawers: React.FC<PatientDrawersProps> = ({
  showMedicineBox,
  setShowMedicineBox,
  medicineDb,
  showNotifications,
  setShowNotifications,
  notifications,
  onMarkNotificationRead,
  showQR,
  setShowQR,
  patientProfile,
  publicProfileUrl,
}) => {
  const [medicineQuery, setMedicineQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter medicines
  const filteredMeds = medicineQuery
    ? medicineDb.filter(
        (m) =>
          m.name.toLowerCase().includes(medicineQuery.toLowerCase()) ||
          (m.generic || '').toLowerCase().includes(medicineQuery.toLowerCase()) ||
          m.purpose.toLowerCase().includes(medicineQuery.toLowerCase()) ||
          m.category.toLowerCase().includes(medicineQuery.toLowerCase())
      )
    : [];

  const categories = Array.from(new Set(medicineDb.map((m) => m.category.split(' ')[0])));

  const copyUrl = () => {
    if (publicProfileUrl) {
      navigator.clipboard.writeText(publicProfileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* 1. MEDICINE INFO SLIDE-OVER DRAWER */}
      {showMedicineBox && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(20, 46, 31, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'flex-end',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: 440,
              height: '100%',
              boxShadow: '-8px 0 35px rgba(20, 46, 31, 0.18)',
              borderLeft: '1px solid #E8ECE7',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '1.1rem 1.25rem',
                borderBottom: '1px solid #F0F4F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAF7',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: '#EFF7ED',
                    color: '#1E432F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Pill size={17} color="#10B981" />
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#63806F',
                      display: 'block',
                    }}
                  >
                    DRUG REFERENCE
                  </span>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#142A1F', margin: 0, lineHeight: 1.25 }}>
                    Medicine Info
                  </h3>
                </div>
              </div>
              <button
                id="close-medicine-drawer-btn"
                onClick={() => {
                  setShowMedicineBox(false);
                  setSelectedMedicine(null);
                  setMedicineQuery('');
                }}
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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2F6F3')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Box */}
            <div style={{ padding: '1rem 1.25rem 0.5rem 1.25rem', flexShrink: 0 }}>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  backgroundColor: '#F4F6F2',
                  border: '1px solid #D8E0D7',
                  borderRadius: 12,
                  padding: '0 0.85rem 0 2.5rem',
                  height: 42,
                  boxSizing: 'border-box',
                }}
              >
                <Search size={16} color="#63806F" style={{ position: 'absolute', left: 12 }} />
                <input
                  type="text"
                  placeholder="Search medication name e.g. Paracetamol..."
                  value={medicineQuery}
                  onChange={(e) => {
                    setMedicineQuery(e.target.value);
                    setSelectedMedicine(null);
                  }}
                  style={{
                    width: '100%',
                    minWidth: 0,
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '0.82rem',
                    color: '#142A1F',
                    outline: 'none',
                    fontFamily: 'inherit',
                    padding: 0,
                  }}
                  autoFocus
                />
                {medicineQuery && (
                  <button
                    onClick={() => {
                      setMedicineQuery('');
                      setSelectedMedicine(null);
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      color: '#7A9183',
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div
              style={{
                flex: '1 1 auto',
                overflowY: 'auto',
                padding: '0.5rem 1.25rem 1.25rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              {/* Category Chips (when not searching) */}
              {!medicineQuery && !selectedMedicine && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#63806F',
                    }}
                  >
                    Browse by Category
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setMedicineQuery(cat)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 8,
                          backgroundColor: '#F4F6F2',
                          border: '1px solid #E1E8E0',
                          color: '#2C4A38',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#EAF3EC';
                          e.currentTarget.style.borderColor = '#A7F3D0';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F4F6F2';
                          e.currentTarget.style.borderColor = '#E1E8E0';
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results List */}
              {medicineQuery && !selectedMedicine && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {filteredMeds.length > 0 ? (
                    filteredMeds.map((med) => (
                      <div
                        key={med.name}
                        onClick={() => setSelectedMedicine(med)}
                        style={{
                          padding: '0.85rem 1rem',
                          backgroundColor: '#FAFBF9',
                          border: '1px solid #E6EBE5',
                          borderRadius: 12,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.3rem',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F2F6F3';
                          e.currentTarget.style.borderColor = '#C5DAC9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FAFBF9';
                          e.currentTarget.style.borderColor = '#E6EBE5';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <h4 style={{ fontSize: '0.84rem', fontWeight: 600, color: '#142A1F', margin: 0 }}>
                            {med.name}
                          </h4>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: '#059669',
                              backgroundColor: '#ECFDF5',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 999,
                              border: '1px solid #A7F3D0',
                            }}
                          >
                            {med.category}
                          </span>
                        </div>
                        {med.generic && (
                          <span style={{ fontSize: '0.72rem', color: '#63806F' }}>Generic: {med.generic}</span>
                        )}
                        <p
                          style={{
                            fontSize: '0.72rem',
                            color: '#335341',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {med.purpose}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#7A9183', fontSize: '0.8rem' }}>
                      No medications matching "{medicineQuery}"
                    </div>
                  )}
                </div>
              )}

              {/* Detailed Medicine View */}
              {selectedMedicine && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <button
                    onClick={() => setSelectedMedicine(null)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#2D5A43',
                      cursor: 'pointer',
                      alignSelf: 'flex-start',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <span>← Back to search results</span>
                  </button>

                  <div
                    style={{
                      padding: '1rem',
                      backgroundColor: '#F8FAF7',
                      border: '1px solid #E4ECE3',
                      borderRadius: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#142A1F', margin: 0 }}>
                        {selectedMedicine.name}
                      </h3>
                      {selectedMedicine.generic && (
                        <span style={{ fontSize: '0.75rem', color: '#63806F', display: 'block', marginTop: 2 }}>
                          Generic: {selectedMedicine.generic}
                        </span>
                      )}
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '0.5rem',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#059669',
                          backgroundColor: '#ECFDF5',
                          padding: '0.15rem 0.55rem',
                          borderRadius: 999,
                          border: '1px solid #A7F3D0',
                        }}
                      >
                        {selectedMedicine.category}
                      </span>
                    </div>

                    {/* Purpose */}
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 10,
                        border: '1px solid #E3EAE2',
                        fontSize: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#63806F' }}>
                        Purpose & Indications
                      </span>
                      <p style={{ color: '#142A1F', margin: 0, lineHeight: 1.45 }}>{selectedMedicine.purpose}</p>
                    </div>

                    {/* Usage */}
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 10,
                        border: '1px solid #E3EAE2',
                        fontSize: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#63806F' }}>
                        Usage & Administration
                      </span>
                      <p style={{ color: '#142A1F', margin: 0, lineHeight: 1.45 }}>{selectedMedicine.usage}</p>
                    </div>

                    {/* Side effects */}
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 10,
                        border: '1px solid #E3EAE2',
                        fontSize: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#63806F' }}>
                        Common Side Effects
                      </span>
                      <p style={{ color: '#142A1F', margin: 0, lineHeight: 1.45 }}>{selectedMedicine.sideEffects}</p>
                    </div>

                    {/* Warnings */}
                    {selectedMedicine.warnings && (
                      <div
                        style={{
                          padding: '0.75rem',
                          backgroundColor: '#FEF2F2',
                          borderRadius: 10,
                          border: '1px solid #FCA5A5',
                          fontSize: '0.75rem',
                          color: '#991B1B',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: '#DC2626',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <AlertTriangle size={13} />
                          <span>Important Warnings</span>
                        </span>
                        <p style={{ margin: 0, fontWeight: 500, lineHeight: 1.45 }}>{selectedMedicine.warnings}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid #F0F4F0',
                fontSize: '0.7rem',
                color: '#7A9183',
                textAlign: 'center',
                backgroundColor: '#FAFBFA',
                flexShrink: 0,
              }}
            >
              This reference is for informational guidance only. Always follow your physician's prescription.
            </div>
          </div>
        </div>
      )}

      {/* 2. EMERGENCY QR MODAL */}
      {showQR && (
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
              borderRadius: 20,
              maxWidth: 360,
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 50px rgba(20, 46, 31, 0.2), 0 4px 12px rgba(0,0,0,0.06)',
              border: '1px solid #E8E7E0',
              textAlign: 'center',
              position: 'relative',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <button
              id="close-qr-modal-btn"
              onClick={() => setShowQR(false)}
              style={{
                position: 'absolute',
                right: 12,
                top: 12,
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
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2F6F3')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <X size={16} />
            </button>

            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(252,165,165,0.4)',
                marginTop: '0.25rem',
              }}
            >
              <QrCode size={22} />
            </div>

            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#142A1F', margin: 0, lineHeight: 1.25 }}>
                Emergency Medical Access
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#52705E', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                Scan with any smartphone camera to view critical allergies, blood group, and emergency contacts.
              </p>
            </div>

            {/* QR Code Graphic Box */}
            <div
              style={{
                padding: '0.85rem',
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                border: '2px solid #142A1F',
                display: 'inline-block',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              }}
            >
              <QRCodeSVG
                value={publicProfileUrl || window.location.origin}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>

            <div style={{ width: '100%', marginTop: '0.25rem' }}>
              <button
                onClick={copyUrl}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 1rem',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: '#142A1F',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0B1A13')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#142A1F')}
              >
                {copied ? <CheckCircle2 size={15} color="#86EFAC" /> : <Copy size={15} />}
                <span>{copied ? 'Link Copied!' : 'Copy Emergency Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PatientDrawers;
