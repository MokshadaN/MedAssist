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
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex justify-end select-none animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-[#E8ECE7] flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F4F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EFF7ED] text-[#1E432F] flex items-center justify-center">
                  <Pill className="w-4 h-4 text-[#10B981]" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#63806F]">DRUG REFERENCE</span>
                  <h3 className="font-bold text-base text-[#142A1F]">Medicine Info</h3>
                </div>
              </div>
              <button
                id="close-medicine-drawer-btn"
                onClick={() => { setShowMedicineBox(false); setSelectedMedicine(null); setMedicineQuery(''); }}
                className="p-2 rounded-xl text-[#7A9183] hover:bg-[#F2F6F3] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Box */}
            <div className="mt-4 relative">
              <Search className="w-4 h-4 text-[#8AA293] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search medication name e.g. Paracetamol..."
                value={medicineQuery}
                onChange={(e) => { setMedicineQuery(e.target.value); setSelectedMedicine(null); }}
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#F4F6F2] border border-[#E3E8E3] focus:border-[#2D5A43] focus:bg-white text-xs text-[#142A1F] placeholder:text-[#8AA293] focus:outline-none"
                autoFocus
              />
              {medicineQuery && (
                <button
                  onClick={() => { setMedicineQuery(''); setSelectedMedicine(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A9183] hover:text-[#142A1F]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Chips (when not searching) */}
            {!medicineQuery && !selectedMedicine && (
              <div className="mt-5 space-y-3">
                <span className="text-[11px] font-bold uppercase text-[#63806F] block tracking-wider">
                  Browse by Category
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMedicineQuery(cat)}
                      className="px-3 py-1.5 rounded-xl bg-[#F4F6F2] hover:bg-[#EAF3EC] text-[#2C4A38] text-xs font-semibold border border-[#E1E8E0] transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results List */}
            {medicineQuery && !selectedMedicine && (
              <div className="mt-4 space-y-2 overflow-y-auto flex-1">
                {filteredMeds.length > 0 ? (
                  filteredMeds.map((med) => (
                    <div
                      key={med.name}
                      onClick={() => setSelectedMedicine(med)}
                      className="p-3.5 bg-[#FAFBF9] hover:bg-[#F2F6F3] border border-[#E6EBE5] rounded-2xl cursor-pointer transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-[#142A1F]">{med.name}</h4>
                        <span className="text-[10px] font-semibold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                          {med.category}
                        </span>
                      </div>
                      {med.generic && (
                        <span className="text-[11px] text-[#63806F] block">
                          Generic: {med.generic}
                        </span>
                      )}
                      <p className="text-[11px] text-[#335341] line-clamp-1">{med.purpose}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-[#7A9183] text-xs">
                    No medications matching "{medicineQuery}"
                  </div>
                )}
              </div>
            )}

            {/* Detailed Medicine View */}
            {selectedMedicine && (
              <div className="mt-4 space-y-4 flex-1 overflow-y-auto">
                <button
                  onClick={() => setSelectedMedicine(null)}
                  className="text-xs font-semibold text-[#2D5A43] hover:underline"
                >
                  ← Back to search results
                </button>

                <div className="p-4 bg-[#F8FAF7] border border-[#E4ECE3] rounded-2xl space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-[#142A1F]">{selectedMedicine.name}</h3>
                    {selectedMedicine.generic && (
                      <span className="text-xs text-[#63806F] font-medium block mt-0.5">
                        Generic: {selectedMedicine.generic}
                      </span>
                    )}
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                      {selectedMedicine.category}
                    </span>
                  </div>

                  {/* Purpose */}
                  <div className="p-3 bg-white rounded-xl border border-[#E3EAE2] space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase text-[#63806F]">Purpose & Indications</span>
                    <p className="text-[#142A1F]">{selectedMedicine.purpose}</p>
                  </div>

                  {/* How to take */}
                  <div className="p-3 bg-white rounded-xl border border-[#E3EAE2] space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase text-[#63806F]">Usage & Administration</span>
                    <p className="text-[#142A1F]">{selectedMedicine.usage}</p>
                  </div>

                  {/* Side effects */}
                  <div className="p-3 bg-white rounded-xl border border-[#E3EAE2] space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase text-[#63806F]">Common Side Effects</span>
                    <p className="text-[#142A1F]">{selectedMedicine.sideEffects}</p>
                  </div>

                  {/* Warnings */}
                  {selectedMedicine.warnings && (
                    <div className="p-3 bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] space-y-1 text-xs text-[#991B1B]">
                      <span className="text-[10px] font-bold uppercase text-[#DC2626] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Important Warnings</span>
                      </span>
                      <p className="font-medium">{selectedMedicine.warnings}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#F0F4F0] text-[10px] text-[#7A9183] text-center">
              This reference is for informational guidance only. Always follow your physician's prescription.
            </div>
          </div>
        </div>
      )}

      {/* 2. NOTIFICATIONS SLIDE-OVER DRAWER */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex justify-end select-none animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-[#E8ECE7] flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F4F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EFF7ED] text-[#1E432F] flex items-center justify-center">
                  <Bell className="w-4 h-4 text-[#10B981]" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#63806F]">UPDATES</span>
                  <h3 className="font-bold text-base text-[#142A1F]">Notifications</h3>
                </div>
              </div>
              <button
                id="close-notifications-drawer-btn"
                onClick={() => setShowNotifications(false)}
                className="p-2 rounded-xl text-[#7A9183] hover:bg-[#F2F6F3] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 flex-1 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onMarkNotificationRead(n)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      n.is_read
                        ? 'bg-white border-[#E6EBE5] opacity-75'
                        : 'bg-[#F4F9F5] border-[#D2E4D6] shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#142A1F]">{n.type || 'Clinical Update'}</span>
                      <span className="text-[10px] text-[#7A9183]">Just now</span>
                    </div>
                    <p className="text-xs text-[#335341] mt-1 leading-relaxed">{n.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-[#7A9183] text-xs">
                  No new notifications. You're all caught up!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. EMERGENCY QR MODAL */}
      {showQR && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E8ECE7] text-center relative space-y-4">
            <button
              id="close-qr-modal-btn"
              onClick={() => setShowQR(false)}
              className="absolute right-4 top-4 p-2 rounded-xl text-[#7A9183] hover:bg-[#F2F6F3]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mx-auto border border-[#FCA5A5]/40">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-[#142A1F]">Emergency Medical Access</h3>
              <p className="text-xs text-[#52705E] mt-1">
                Scan with any smartphone camera to view critical allergies, blood group, and emergency contacts.
              </p>
            </div>

            {/* QR Code Graphic Box */}
            <div className="p-4 bg-white rounded-2xl border-2 border-[#142A1F] inline-block shadow-md">
              <QRCodeSVG
                value={publicProfileUrl || window.location.origin}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={copyUrl}
                className="w-full py-2.5 px-4 rounded-xl bg-[#142A1F] hover:bg-[#0B1A13] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#86EFAC]" /> : <Copy className="w-3.5 h-3.5" />}
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
