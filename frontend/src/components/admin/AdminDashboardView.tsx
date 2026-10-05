import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Trash2,
  Users,
  UserCheck,
  Clock,
  LogOut,
  Search,
  RefreshCw,
  AlertTriangle,
  Stethoscope,
  HeartPulse,
  Award,
  Building2,
  Calendar,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Filter,
  X,
  Phone,
  Mail,
  Sparkles,
  ChevronRight,
  BadgeCheck,
  AlertCircle,
  HelpCircle,
  Activity
} from 'lucide-react';
import {
  api,
  AuthUser,
  AdminStats,
  PendingDoctor,
  AdminDoctor,
  AdminPatient
} from '../../api';

interface AdminDashboardViewProps {
  user: AuthUser;
  authToken: string;
  onSignOut: () => void;
}

type AdminTab = 'pending' | 'doctors' | 'patients';
type DoctorStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const QUICK_APPROVAL_TEMPLATES = [
  'Verified against National Medical Register (NMC)',
  'State Council registration confirmed & valid',
  'Hospital affiliation & credentials verified',
  'Syntactic and council format match confirmed'
];

const QUICK_REJECTION_TEMPLATES = [
  'Registration number not found in State/NMC registry',
  'State Council mismatch with provided credentials',
  'Incomplete hospital affiliation / contact verification',
  'Duplicate doctor registration'
];

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  user,
  authToken,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('pending');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [allDoctors, setAllDoctors] = useState<AdminDoctor[]>([]);
  const [allPatients, setAllPatients] = useState<AdminPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorFilter, setDoctorFilter] = useState<DoctorStatusFilter>('all');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal states
  const [selectedDoctorForModal, setSelectedDoctorForModal] = useState<PendingDoctor | AdminDoctor | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<{ userId: string; name: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    licenseFormat: true,
    councilMatch: false,
    affiliationCheck: false,
    identityCheck: false
  });

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage(null);
    }, 4500);
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, pendingData, doctorsData, patientsData] = await Promise.all([
        api.getAdminStats(authToken).catch(() => null),
        api.listPendingDoctors(authToken).catch(() => []),
        api.listAdminDoctors(authToken).catch(() => []),
        api.listAdminPatients(authToken).catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setPendingDoctors(pendingData);
      setAllDoctors(doctorsData);
      setAllPatients(patientsData);
    } catch (err: any) {
      showNotification(err.message || 'Failed to fetch admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      loadData();
    }
  }, [authToken]);

  const handleReview = async (userId: string, action: 'approve' | 'reject', customNote?: string) => {
    setActionLoading(userId);
    try {
      const note = customNote !== undefined 
        ? customNote 
        : (reviewNotes[userId] || (action === 'approve' ? 'Approved by admin review' : 'Rejected by admin review'));
      
      const res = await api.reviewDoctorVerification(userId, action, note, authToken);
      showNotification(res.message || `Doctor ${action === 'approve' ? 'approved' : 'rejected'} successfully`, action === 'approve' ? 'success' : 'info');
      
      // Close any open modals
      if (selectedDoctorForModal?.user_id === userId) {
        setSelectedDoctorForModal(null);
      }
      if (rejectionTarget?.userId === userId) {
        setRejectionTarget(null);
        setRejectionReason('');
      }

      await loadData();
    } catch (err: any) {
      showNotification(err.message || `Failed to ${action} doctor`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDoctor = async (doctorId: string, doctorName?: string | null) => {
    if (!window.confirm(`Are you sure you want to permanently delete doctor "${doctorName || doctorId}"? This will remove all their profiles, visits, and assigned cases.`)) {
      return;
    }
    setActionLoading(doctorId);
    try {
      const res = await api.deleteAdminDoctor(doctorId, authToken);
      showNotification(res.message || 'Doctor deleted successfully', 'success');
      await loadData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete doctor', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePatient = async (patientId: string, patientName?: string | null) => {
    if (!window.confirm(`Are you sure you want to permanently delete patient "${patientName || patientId}"? All associated clinical sessions and medical records will be deleted.`)) {
      return;
    }
    setActionLoading(patientId);
    try {
      const res = await api.deleteAdminPatient(patientId, authToken);
      showNotification(res.message || 'Patient deleted successfully', 'success');
      await loadData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete patient', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const filteredDoctors = allDoctors.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (
      (doc.name || '').toLowerCase().includes(q) ||
      (doc.email || '').toLowerCase().includes(q) ||
      (doc.specialization || '').toLowerCase().includes(q) ||
      (doc.license_number || '').toLowerCase().includes(q) ||
      (doc.state_council || '').toLowerCase().includes(q) ||
      (doc.hospital_affiliation || '').toLowerCase().includes(q)
    );

    if (!matchesSearch) return false;
    if (doctorFilter === 'all') return true;
    if (doctorFilter === 'approved') return doc.is_verified || doc.verification_status === 'approved';
    if (doctorFilter === 'pending') return !doc.is_verified && doc.verification_status === 'pending';
    if (doctorFilter === 'rejected') return doc.verification_status === 'rejected';
    return true;
  });

  const filteredPending = pendingDoctors.filter((doc) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (doc.name || '').toLowerCase().includes(q) ||
      (doc.email || '').toLowerCase().includes(q) ||
      (doc.specialization || '').toLowerCase().includes(q) ||
      (doc.license_number || '').toLowerCase().includes(q) ||
      (doc.state_council || '').toLowerCase().includes(q) ||
      (doc.hospital_affiliation || '').toLowerCase().includes(q)
    );
  });

  const filteredPatients = allPatients.filter((pat) => {
    const q = searchQuery.toLowerCase();
    return (
      (pat.name || '').toLowerCase().includes(q) ||
      (pat.email || '').toLowerCase().includes(q) ||
      (pat.phone || '').toLowerCase().includes(q) ||
      (pat.address || '').toLowerCase().includes(q) ||
      (pat.chronic_conditions || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="min-h-screen w-full flex flex-col font-sans"
      style={{
        backgroundColor: '#F5F6F0',
        color: '#102213',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
      }}
    >
      {/* Top Navigation Bar */}
      <header
        className="w-full border-b sticky top-0 z-30 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          borderColor: 'rgba(224, 226, 216, 0.9)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#173324] to-[#0d1f15] flex items-center justify-center text-white shadow-md shadow-[#173324]/15 ring-2 ring-[#86efac]/20">
              <Shield className="w-6 h-6 text-[#86efac]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-xl text-[#162c1c] tracking-tight">MedAssist</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#e2ebde] text-[#1e4526] border border-[#c2d4be]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                  Admin Authority
                </span>
              </div>
              <p className="text-xs text-[#525C50] mt-0.5">
                Logged in as <strong className="text-[#192018]">{user.name || user.email}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-[#d2dbd0] bg-white hover:bg-[#f3f6f1] text-[#2d4232] transition-all cursor-pointer shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
              title="Refresh all data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#173324]' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#dc2626] text-white hover:bg-[#b91c1c] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Flash Notifications */}
        {actionMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl text-sm font-medium flex items-center justify-between gap-3 border shadow-sm transition-all animate-fadeIn ${
              actionMessage.type === 'success'
                ? 'bg-[#dcfce7] border-[#86efac] text-[#14532d]'
                : actionMessage.type === 'error'
                ? 'bg-[#fee2e2] border-[#fca5a5] text-[#991b1b]'
                : 'bg-[#e0f2fe] border-[#bae6fd] text-[#0369a1]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#16a34a]" />
              ) : actionMessage.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[#dc2626]" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#0284c7]" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-[#525C50] hover:text-[#192018] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metric Cards Overview (Clickable Filters) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div
            onClick={() => setActiveTab('pending')}
            className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md active:scale-98 ${
              activeTab === 'pending'
                ? 'border-[#f59e0b] ring-2 ring-[#f59e0b]/20 shadow-md'
                : 'border-[#e2e5dc] hover:border-[#f59e0b]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#525C50]">Pending Doctor Reviews</span>
              <div className="w-9 h-9 rounded-xl bg-[#fef3c7] flex items-center justify-center text-[#d97706]">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-[#192018]">
                {stats ? stats.pending_doctors : pendingDoctors.length}
              </h3>
              {(stats?.pending_doctors || pendingDoctors.length) > 0 && (
                <span className="text-[11px] font-bold text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#7F8A7C] mt-2 flex items-center gap-1">
              Click to review applications <ChevronRight className="w-3 h-3" />
            </p>
          </div>

          <div
            onClick={() => {
              setActiveTab('doctors');
              setDoctorFilter('approved');
            }}
            className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md active:scale-98 ${
              activeTab === 'doctors' && doctorFilter === 'approved'
                ? 'border-[#16a34a] ring-2 ring-[#16a34a]/20 shadow-md'
                : 'border-[#e2e5dc] hover:border-[#16a34a]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#525C50]">Verified Doctors</span>
              <div className="w-9 h-9 rounded-xl bg-[#dcfce7] flex items-center justify-center text-[#16a34a]">
                <BadgeCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-[#192018]">
                {stats ? stats.verified_doctors : allDoctors.filter((d) => d.is_verified).length}
              </h3>
              <span className="text-[11px] font-bold text-[#15803d] bg-[#dcfce7] px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <p className="text-[11px] text-[#7F8A7C] mt-2 flex items-center gap-1">
              View verified directory <ChevronRight className="w-3 h-3" />
            </p>
          </div>

          <div
            onClick={() => setActiveTab('patients')}
            className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md active:scale-98 ${
              activeTab === 'patients'
                ? 'border-[#2563eb] ring-2 ring-[#2563eb]/20 shadow-md'
                : 'border-[#e2e5dc] hover:border-[#2563eb]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#525C50]">Total Patients</span>
              <div className="w-9 h-9 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb]">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-[#192018]">
                {stats ? stats.total_patients : allPatients.length}
              </h3>
            </div>
            <p className="text-[11px] text-[#7F8A7C] mt-2 flex items-center gap-1">
              Registered patient profiles <ChevronRight className="w-3 h-3" />
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e2e5dc] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#525C50]">Total Consultations</span>
              <div className="w-9 h-9 rounded-xl bg-[#faf5ff] flex items-center justify-center text-[#9333ea]">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-[#192018]">
                {stats ? stats.total_visits : 0}
              </h3>
              <span className="text-[11px] font-medium text-[#6b21a8] bg-[#f3e8ff] px-2 py-0.5 rounded-full">
                Clinical Visits
              </span>
            </div>
            <p className="text-[11px] text-[#7F8A7C] mt-2">Platform clinical activity</p>
          </div>
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-[#dfe3d8] pb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-[#173324] text-white shadow-md'
                  : 'bg-white text-[#525C50] hover:bg-[#eaf0e8] border border-[#e0e4da]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Pending Reviews</span>
              {pendingDoctors.length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[#f59e0b] text-white font-extrabold animate-pulse">
                  {pendingDoctors.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('doctors')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'doctors'
                  ? 'bg-[#173324] text-white shadow-md'
                  : 'bg-white text-[#525C50] hover:bg-[#eaf0e8] border border-[#e0e4da]'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor Directory ({allDoctors.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('patients')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'patients'
                  ? 'bg-[#173324] text-white shadow-md'
                  : 'bg-white text-[#525C50] hover:bg-[#eaf0e8] border border-[#e0e4da]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Patients ({allPatients.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px] max-w-md flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7F8A7C]" />
            <input
              type="text"
              placeholder={`Search ${
                activeTab === 'pending'
                  ? 'pending doctor applications...'
                  : activeTab === 'doctors'
                  ? 'doctors by name, license, specialization...'
                  : 'patients by name, email, phone...'
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-[#d2dbd0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#173324] shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7F8A7C] hover:text-[#192018]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Tab 1: Pending Doctor Approvals Workflow ───────────────────────── */}
        {activeTab === 'pending' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#192018] flex items-center gap-2">
                  <span>Doctor Verification Queue</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                    P0 Compliance Workflow
                  </span>
                </h3>
                <p className="text-xs text-[#525C50]">
                  Every medical practitioner registration requires authoritative administrator verification before they are granted clinical access.
                </p>
              </div>
            </div>

            {filteredPending.length === 0 ? (
              <div className="bg-white rounded-3xl p-14 text-center border border-[#e0e4da] shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-[#dcfce7] flex items-center justify-center text-[#16a34a] mx-auto mb-4 ring-8 ring-[#f0fdf4]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-[#192018]">Verification Queue Clear</h4>
                <p className="text-sm text-[#525C50] max-w-md mx-auto mt-2">
                  {searchQuery
                    ? `No pending doctors match "${searchQuery}".`
                    : 'All submitted doctor registrations have been reviewed and processed.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-[#173324] bg-[#eef2eb] rounded-xl hover:bg-[#e2ebde]"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPending.map((doc) => {
                  const isProcessing = actionLoading === doc.user_id;
                  const currentNote = reviewNotes[doc.user_id] || '';

                  return (
                    <div
                      key={doc.user_id}
                      className="bg-white rounded-3xl border border-[#d8ded4] shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative"
                    >
                      {/* Top Accent Strip */}
                      <div className="h-1.5 w-full bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#10b981]" />

                      <div className="p-6">
                        {/* Header Profile Section */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-[#173324] text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                              {doc.name ? doc.name.charAt(0).toUpperCase() : 'D'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-lg font-extrabold text-[#192018] tracking-tight">
                                  {doc.name || 'Dr. Unnamed Practitioner'}
                                </h4>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                                  <Clock className="w-3 h-3" />
                                  Pending
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#525C50]">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3.5 h-3.5 text-[#7F8A7C]" />
                                  <span>{doc.email}</span>
                                </span>
                                {doc.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5 text-[#7F8A7C]" />
                                    <span>{doc.phone}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedDoctorForModal(doc);
                              setChecklist({
                                licenseFormat: true,
                                councilMatch: false,
                                affiliationCheck: false,
                                identityCheck: false
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#173324] bg-[#eef2eb] hover:bg-[#e2ebde] rounded-xl transition-all cursor-pointer"
                            title="Inspect complete dossier & verification checklist"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Dossier</span>
                          </button>
                        </div>

                        {/* Credentials Grid */}
                        <div className="grid grid-cols-2 gap-3 p-4 bg-[#f8f9f6] rounded-2xl text-xs mb-4 border border-[#e8ece3]">
                          <div>
                            <span className="text-[#7F8A7C] font-semibold block text-[11px] mb-0.5">
                              Medical License / Reg No.
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[#173324] text-sm bg-white px-2.5 py-1 rounded-lg border border-[#d2dbd0] shadow-2xs">
                                {doc.license_number || 'NOT PROVIDED'}
                              </span>
                              {doc.license_number && (
                                <button
                                  onClick={() => copyToClipboard(doc.license_number!, `license_${doc.user_id}`)}
                                  className="p-1 text-[#7F8A7C] hover:text-[#173324] rounded transition-colors"
                                  title="Copy license number"
                                >
                                  {copiedKey === `license_${doc.user_id}` ? (
                                    <Check className="w-3.5 h-3.5 text-[#16a34a]" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[#7F8A7C] font-semibold block text-[11px] mb-0.5">
                              State Medical Council
                            </span>
                            <span className="font-semibold text-[#192018] bg-white px-2.5 py-1 rounded-lg border border-[#d2dbd0] block truncate">
                              {doc.state_council || 'National Medical Commission (MCI)'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[#7F8A7C] font-semibold block text-[11px] mb-0.5">
                              Specialization
                            </span>
                            <span className="font-bold text-[#173324] inline-flex items-center gap-1">
                              <Stethoscope className="w-3.5 h-3.5 text-[#16a34a]" />
                              {doc.specialization || 'General Physician'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[#7F8A7C] font-semibold block text-[11px] mb-0.5">
                              Experience
                            </span>
                            <span className="font-semibold text-[#192018]">
                              {doc.experience_years ? `${doc.experience_years} Years Practice` : 'Not specified'}
                            </span>
                          </div>

                          <div className="col-span-2 border-t border-[#e2e6dc] pt-2.5 mt-0.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <span className="text-[#525C50] flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-[#7F8A7C]" />
                              <span>{doc.hospital_affiliation || 'Independent Clinical Practice'}</span>
                            </span>
                            <span className="text-[#7F8A7C] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Submitted: {formatDateTime(doc.submitted_at || doc.created_at)}</span>
                            </span>
                          </div>
                        </div>

                        {/* Quick Audit Templates */}
                        <div className="mb-3">
                          <label className="text-[11px] font-bold text-[#525C50] block mb-1.5">
                            Quick Audit Note Templates:
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {QUICK_APPROVAL_TEMPLATES.map((tmpl, idx) => (
                              <button
                                key={idx}
                                onClick={() => setReviewNotes({ ...reviewNotes, [doc.user_id]: tmpl })}
                                className="text-[10px] font-medium px-2 py-1 rounded-lg bg-[#eef2eb] hover:bg-[#dfe7db] text-[#1e4526] transition-all cursor-pointer"
                              >
                                {tmpl}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Audit Note Input */}
                        <div className="mb-4">
                          <label className="text-[11px] font-bold text-[#525C50] block mb-1">
                            Review & Audit Note (Logged in Compliance Audit Trail)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Verified with state council database / MCI registry record confirmed"
                            value={currentNote}
                            onChange={(e) =>
                              setReviewNotes({ ...reviewNotes, [doc.user_id]: e.target.value })
                            }
                            className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#d2dbd0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#173324] shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="p-4 bg-[#fbfcf9] border-t border-[#ebf0e6] flex items-center gap-3">
                        <button
                          onClick={() => handleReview(doc.user_id, 'approve')}
                          disabled={isProcessing}
                          className="flex-1 py-3 px-4 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow active:scale-98 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          <span>{isProcessing ? 'Processing...' : 'Accept & Verify Doctor'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setRejectionTarget({ userId: doc.user_id, name: doc.name || 'Doctor' });
                            setRejectionReason(currentNote || QUICK_REJECTION_TEMPLATES[0]);
                          }}
                          disabled={isProcessing}
                          className="py-3 px-4 rounded-xl bg-white border border-[#fca5a5] hover:bg-[#fee2e2] text-[#dc2626] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: All Doctors Directory ──────────────────────────────────── */}
        {activeTab === 'doctors' && (
          <div className="space-y-4">
            {/* Status Filter Chips */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#e0e4da]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#525C50] flex items-center gap-1.5 pl-2">
                  <Filter className="w-3.5 h-3.5" />
                  Filter Status:
                </span>
                {(['all', 'approved', 'pending', 'rejected'] as DoctorStatusFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setDoctorFilter(f)}
                    className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      doctorFilter === f
                        ? 'bg-[#173324] text-white shadow-sm'
                        : 'bg-[#f4f6f1] text-[#525C50] hover:bg-[#e6ece2]'
                    }`}
                  >
                    {f === 'all'
                      ? `All (${allDoctors.length})`
                      : f === 'approved'
                      ? `Verified (${allDoctors.filter((d) => d.is_verified).length})`
                      : f === 'pending'
                      ? `Pending (${allDoctors.filter((d) => !d.is_verified && d.verification_status === 'pending').length})`
                      : `Rejected (${allDoctors.filter((d) => d.verification_status === 'rejected').length})`}
                  </button>
                ))}
              </div>

              <span className="text-xs text-[#7F8A7C] pr-2">
                Showing {filteredDoctors.length} doctors
              </span>
            </div>

            {/* Doctors Table */}
            <div className="bg-white rounded-3xl border border-[#e0e4da] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f5f7f2] text-[#525C50] border-b border-[#e2e6dc] uppercase font-bold text-[11px] tracking-wider">
                    <tr>
                      <th className="py-4 px-5">Practitioner</th>
                      <th className="py-4 px-4">Specialization & Exp</th>
                      <th className="py-4 px-4">License & Council</th>
                      <th className="py-4 px-4">Affiliation</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0e8]">
                    {filteredDoctors.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#7F8A7C]">
                          No doctors match your search or selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredDoctors.map((doc) => {
                        const isProcessing = actionLoading === doc.user_id;

                        return (
                          <tr key={doc.user_id} className="hover:bg-[#fcfdfa] transition-colors">
                            <td className="py-4 px-5">
                              <div className="font-extrabold text-[#192018] text-sm">
                                {doc.name || 'Unnamed Doctor'}
                              </div>
                              <div className="text-[11px] text-[#7F8A7C] flex items-center gap-1.5 mt-0.5">
                                <Mail className="w-3 h-3" />
                                <span>{doc.email}</span>
                              </div>
                              {doc.phone && (
                                <div className="text-[10px] text-[#7F8A7C] flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  <span>{doc.phone}</span>
                                </div>
                              )}
                            </td>

                            <td className="py-4 px-4">
                              <div className="font-bold text-[#173324]">{doc.specialization || 'General'}</div>
                              <div className="text-[11px] text-[#525C50]">
                                {doc.experience_years ? `${doc.experience_years} yrs experience` : 'N/A'}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="font-mono font-bold text-[#173324]">
                                {doc.license_number || 'N/A'}
                              </div>
                              <div className="text-[11px] text-[#525C50] truncate max-w-[180px]">
                                {doc.state_council || 'NMC / Standard'}
                              </div>
                            </td>

                            <td className="py-4 px-4 text-[#525C50]">
                              {doc.hospital_affiliation || 'Independent'}
                            </td>

                            <td className="py-4 px-4">
                              {doc.is_verified || doc.verification_status === 'approved' ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#dcfce7] text-[#166534] border border-[#86efac]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Verified
                                </span>
                              ) : doc.verification_status === 'rejected' ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5]">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Rejected
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                                  <Clock className="w-3.5 h-3.5" />
                                  Pending
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {(!doc.is_verified && doc.verification_status !== 'approved') ? (
                                  <button
                                    onClick={() => handleReview(doc.user_id, 'approve')}
                                    disabled={isProcessing}
                                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setRejectionTarget({ userId: doc.user_id, name: doc.name || 'Doctor' });
                                      setRejectionReason('Revoked verification status by administrator');
                                    }}
                                    disabled={isProcessing}
                                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#fee2e2] hover:bg-[#fca5a5] text-[#991b1b] transition-all cursor-pointer"
                                    title="Revoke Verification"
                                  >
                                    Revoke
                                  </button>
                                )}

                                <button
                                  onClick={() => setSelectedDoctorForModal(doc)}
                                  className="p-1.5 text-[#525C50] hover:text-[#173324] hover:bg-[#eef2eb] rounded-lg transition-colors cursor-pointer"
                                  title="View full credentials"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleDeleteDoctor(doc.user_id, doc.name)}
                                  disabled={isProcessing}
                                  className="p-1.5 text-[#dc2626] hover:bg-[#fee2e2] rounded-lg transition-colors cursor-pointer"
                                  title="Delete Doctor Account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 3: All Patients Directory ─────────────────────────────────── */}
        {activeTab === 'patients' && (
          <div className="bg-white rounded-3xl border border-[#e0e4da] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f7f2] text-[#525C50] border-b border-[#e2e6dc] uppercase font-bold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-4 px-5">Patient Name</th>
                    <th className="py-4 px-4">Age / Gender</th>
                    <th className="py-4 px-4">Contact & Address</th>
                    <th className="py-4 px-4">Allergies</th>
                    <th className="py-4 px-4">Chronic Conditions</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0e8]">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#7F8A7C]">
                        No patients match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((pat) => (
                      <tr key={pat.user_id} className="hover:bg-[#fcfdfa] transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-extrabold text-[#192018] text-sm">
                            {pat.name || 'Unnamed Patient'}
                          </div>
                          <div className="text-[11px] text-[#7F8A7C]">{pat.email}</div>
                          {pat.phone && <div className="text-[10px] text-[#7F8A7C]">{pat.phone}</div>}
                        </td>
                        <td className="py-4 px-4 text-[#192018] font-medium">
                          {pat.age ? `${pat.age} yrs` : 'N/A'}{' '}
                          {pat.gender ? `• ${pat.gender}` : ''}
                        </td>
                        <td className="py-4 px-4 text-[#525C50]">
                          {pat.address || 'Address not registered'}
                        </td>
                        <td className="py-4 px-4">
                          {pat.allergies ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-[#fee2e2] text-[#991b1b] font-medium text-[11px]">
                              {pat.allergies}
                            </span>
                          ) : (
                            <span className="text-[#7F8A7C]">None recorded</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-[#525C50]">
                          {pat.chronic_conditions || 'None recorded'}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => handleDeletePatient(pat.user_id, pat.name)}
                            disabled={actionLoading === pat.user_id}
                            className="p-1.5 text-[#dc2626] hover:bg-[#fee2e2] rounded-lg transition-colors cursor-pointer"
                            title="Delete Patient Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── Doctor Dossier & Verification Checklist Modal ────────────────────── */}
      {selectedDoctorForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#e0e4da] animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#e2e6dc] flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#173324] text-white flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-[#86efac]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#192018]">Doctor Credential Dossier</h3>
                  <p className="text-xs text-[#525C50]">Authoritative Verification & Compliance Audit</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoctorForModal(null)}
                className="p-2 text-[#7F8A7C] hover:text-[#192018] rounded-xl hover:bg-[#f0f3eb] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Doctor Details */}
              <div className="p-5 bg-[#f8f9f6] rounded-2xl border border-[#e4e8df]">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xl font-extrabold text-[#192018]">
                      {selectedDoctorForModal.name || 'Unnamed Doctor'}
                    </h4>
                    <p className="text-xs text-[#525C50] mt-0.5">{selectedDoctorForModal.email}</p>
                    {selectedDoctorForModal.phone && (
                      <p className="text-xs text-[#525C50] mt-0.5">Phone: {selectedDoctorForModal.phone}</p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                      (selectedDoctorForModal as AdminDoctor).is_verified
                        ? 'bg-[#dcfce7] text-[#166534]'
                        : selectedDoctorForModal.verification_status === 'rejected'
                        ? 'bg-[#fee2e2] text-[#991b1b]'
                        : 'bg-[#fef3c7] text-[#92400e]'
                    }`}
                  >
                    {selectedDoctorForModal.verification_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-[#d8ded4]">
                    <span className="text-[#7F8A7C] block text-[10px] uppercase font-bold">License Number</span>
                    <span className="font-mono font-bold text-[#173324] text-sm">
                      {selectedDoctorForModal.license_number || 'N/A'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#d8ded4]">
                    <span className="text-[#7F8A7C] block text-[10px] uppercase font-bold">State Council</span>
                    <span className="font-bold text-[#192018]">
                      {selectedDoctorForModal.state_council || 'NMC / Standard'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#d8ded4]">
                    <span className="text-[#7F8A7C] block text-[10px] uppercase font-bold">Specialization</span>
                    <span className="font-bold text-[#192018]">
                      {selectedDoctorForModal.specialization || 'General Practice'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#d8ded4]">
                    <span className="text-[#7F8A7C] block text-[10px] uppercase font-bold">Experience</span>
                    <span className="font-bold text-[#192018]">
                      {selectedDoctorForModal.experience_years ? `${selectedDoctorForModal.experience_years} Years` : 'N/A'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#d8ded4] col-span-2">
                    <span className="text-[#7F8A7C] block text-[10px] uppercase font-bold">Hospital Affiliation</span>
                    <span className="font-bold text-[#192018]">
                      {selectedDoctorForModal.hospital_affiliation || 'Independent Clinic'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification Checklist */}
              <div>
                <h5 className="font-bold text-sm text-[#192018] mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#16a34a]" />
                  <span>Admin Verification Checklist</span>
                </h5>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#d8ded4] hover:bg-[#fcfdfa] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.licenseFormat}
                      onChange={(e) => setChecklist({ ...checklist, licenseFormat: e.target.checked })}
                      className="w-4 h-4 rounded text-[#16a34a] focus:ring-[#173324]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[#192018] block">Medical License Syntax Validated</span>
                      <span className="text-[#525C50]">Format matches Indian Medical Council pattern requirements.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#d8ded4] hover:bg-[#fcfdfa] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.councilMatch}
                      onChange={(e) => setChecklist({ ...checklist, councilMatch: e.target.checked })}
                      className="w-4 h-4 rounded text-[#16a34a] focus:ring-[#173324]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[#192018] block">State Council Jurisdiction Verified</span>
                      <span className="text-[#525C50]">Registration confirmed against state council or NMC records.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#d8ded4] hover:bg-[#fcfdfa] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.affiliationCheck}
                      onChange={(e) => setChecklist({ ...checklist, affiliationCheck: e.target.checked })}
                      className="w-4 h-4 rounded text-[#16a34a] focus:ring-[#173324]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[#192018] block">Hospital / Practice Affiliation Confirmed</span>
                      <span className="text-[#525C50]">Clinical workplace and experience validated.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-[#fbfcf9] border-t border-[#ebf0e6] flex items-center justify-between gap-3 sticky bottom-0">
              <button
                onClick={() => setSelectedDoctorForModal(null)}
                className="px-4 py-2.5 text-xs font-semibold text-[#525C50] hover:bg-[#eef2eb] rounded-xl transition-all"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRejectionTarget({
                      userId: selectedDoctorForModal.user_id,
                      name: selectedDoctorForModal.name || 'Doctor'
                    });
                  }}
                  className="px-4 py-2.5 text-xs font-bold bg-[#fee2e2] text-[#991b1b] hover:bg-[#fca5a5] rounded-xl transition-all flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Application</span>
                </button>

                <button
                  onClick={() => handleReview(selectedDoctorForModal.user_id, 'approve', 'Approved via admin dossier review')}
                  disabled={actionLoading === selectedDoctorForModal.user_id}
                  className="px-5 py-2.5 text-xs font-extrabold bg-[#16a34a] text-white hover:bg-[#15803d] rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept & Verify Doctor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Confirmation Dialog ─────────────────────────────────── */}
      {rejectionTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e0e4da] animate-scaleUp">
            <div className="flex items-center gap-3 mb-4 text-[#dc2626]">
              <div className="w-10 h-10 rounded-2xl bg-[#fee2e2] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-lg text-[#192018]">Reject Registration</h4>
                <p className="text-xs text-[#525C50]">For {rejectionTarget.name}</p>
              </div>
            </div>

            <p className="text-xs text-[#525C50] mb-4">
              Select or type the compliance reason for rejecting this medical practitioner's registration:
            </p>

            {/* Quick Rejection Templates */}
            <div className="space-y-1.5 mb-4">
              {QUICK_REJECTION_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setRejectionReason(tmpl)}
                  className={`w-full text-left text-xs p-2.5 rounded-xl border transition-all cursor-pointer ${
                    rejectionReason === tmpl
                      ? 'bg-[#fee2e2] border-[#fca5a5] text-[#991b1b] font-semibold'
                      : 'bg-[#fcfdfa] border-[#e2e6dc] text-[#525C50] hover:bg-[#f4f7f1]'
                  }`}
                >
                  {tmpl}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Or write custom rejection note..."
              className="w-full text-xs p-3 bg-white border border-[#d2dbd0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#dc2626] mb-5"
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  setRejectionTarget(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-xs font-semibold text-[#525C50] hover:bg-[#eef2eb] rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(rejectionTarget.userId, 'reject', rejectionReason)}
                disabled={actionLoading === rejectionTarget.userId}
                className="px-4 py-2 text-xs font-bold bg-[#dc2626] text-white hover:bg-[#b91c1c] rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {actionLoading === rejectionTarget.userId ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardView;
