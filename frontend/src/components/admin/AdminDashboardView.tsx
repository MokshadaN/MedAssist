import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle,
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
  FileText
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
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage(null);
    }, 4000);
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

  const handleReview = async (userId: string, action: 'approve' | 'reject') => {
    setActionLoading(userId);
    try {
      const note = reviewNotes[userId] || (action === 'approve' ? 'Approved by admin' : 'Rejected by admin');
      const res = await api.reviewDoctorVerification(userId, action, note, authToken);
      showNotification(res.message || `Doctor ${action}d successfully`);
      await loadData();
    } catch (err: any) {
      showNotification(err.message || `Failed to ${action} doctor`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDoctor = async (doctorId: string, doctorName?: string | null) => {
    if (!window.confirm(`Are you sure you want to delete doctor ${doctorName || doctorId}? This action cannot be undone.`)) {
      return;
    }
    setActionLoading(doctorId);
    try {
      const res = await api.deleteAdminDoctor(doctorId, authToken);
      showNotification(res.message || 'Doctor deleted successfully');
      await loadData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete doctor', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePatient = async (patientId: string, patientName?: string | null) => {
    if (!window.confirm(`Are you sure you want to delete patient ${patientName || patientId}? All their clinical records will be removed.`)) {
      return;
    }
    setActionLoading(patientId);
    try {
      const res = await api.deleteAdminPatient(patientId, authToken);
      showNotification(res.message || 'Patient deleted successfully');
      await loadData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete patient', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredDoctors = allDoctors.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      (doc.name || '').toLowerCase().includes(q) ||
      (doc.email || '').toLowerCase().includes(q) ||
      (doc.specialization || '').toLowerCase().includes(q) ||
      (doc.license_number || '').toLowerCase().includes(q)
    );
  });

  const filteredPatients = allPatients.filter((pat) => {
    const q = searchQuery.toLowerCase();
    return (
      (pat.name || '').toLowerCase().includes(q) ||
      (pat.email || '').toLowerCase().includes(q) ||
      (pat.phone || '').toLowerCase().includes(q) ||
      (pat.address || '').toLowerCase().includes(q)
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
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          borderColor: 'rgba(224, 226, 216, 0.9)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#173324] flex items-center justify-center text-white shadow-md">
              <Shield className="w-5 h-5 text-[#86efac]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-[#162c1c] tracking-tight">MedAssist</span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#e2ebde] text-[#23452a] border border-[#c8d6c3]">
                  Admin Control
                </span>
              </div>
              <p className="text-xs text-[#525C50]">
                Logged in as <strong className="text-[#192018]">{user.name || user.email}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#d2dbd0] bg-white hover:bg-[#f3f6f1] text-[#2d4232] transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#dc2626] text-white hover:bg-[#b91c1c] transition-all cursor-pointer shadow-sm"
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
            className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-2 border transition-all ${
              actionMessage.type === 'success'
                ? 'bg-[#dcfce7] border-[#86efac] text-[#166534]'
                : 'bg-[#fee2e2] border-[#fca5a5] text-[#991b1b]'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-[#16a34a]" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[#dc2626]" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Metric Cards Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-[#e2e5dc] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#eef2eb] flex items-center justify-center text-[#173324]">
              <Clock className="w-6 h-6 text-[#d97706]" />
            </div>
            <div>
              <p className="text-xs text-[#525C50] font-medium">Pending Approvals</p>
              <h3 className="text-2xl font-extrabold text-[#192018]">
                {stats ? stats.pending_doctors : pendingDoctors.length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e2e5dc] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#eef2eb] flex items-center justify-center text-[#173324]">
              <UserCheck className="w-6 h-6 text-[#16a34a]" />
            </div>
            <div>
              <p className="text-xs text-[#525C50] font-medium">Verified Doctors</p>
              <h3 className="text-2xl font-extrabold text-[#192018]">
                {stats ? stats.verified_doctors : allDoctors.filter((d) => d.is_verified).length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e2e5dc] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#eef2eb] flex items-center justify-center text-[#173324]">
              <Users className="w-6 h-6 text-[#2563eb]" />
            </div>
            <div>
              <p className="text-xs text-[#525C50] font-medium">Total Patients</p>
              <h3 className="text-2xl font-extrabold text-[#192018]">
                {stats ? stats.total_patients : allPatients.length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e2e5dc] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#eef2eb] flex items-center justify-center text-[#173324]">
              <HeartPulse className="w-6 h-6 text-[#9333ea]" />
            </div>
            <div>
              <p className="text-xs text-[#525C50] font-medium">Total Visits</p>
              <h3 className="text-2xl font-extrabold text-[#192018]">
                {stats ? stats.total_visits : 0}
              </h3>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-[#dfe3d8] pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-[#173324] text-white shadow-md'
                  : 'bg-white text-[#525C50] hover:bg-[#eaf0e8] border border-[#e0e4da]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Pending Doctor Reviews</span>
              {pendingDoctors.length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[#f59e0b] text-white font-bold">
                  {pendingDoctors.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('doctors')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'doctors'
                  ? 'bg-[#173324] text-white shadow-md'
                  : 'bg-white text-[#525C50] hover:bg-[#eaf0e8] border border-[#e0e4da]'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>All Doctors ({allDoctors.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('patients')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'patients'
                  ? 'bg-[#173324] text-white shadow-md'
                  : 'bg-white text-[#525C50] hover:bg-[#eaf0e8] border border-[#e0e4da]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>All Patients ({allPatients.length})</span>
            </button>
          </div>

          {(activeTab === 'doctors' || activeTab === 'patients') && (
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8A7C]" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#d2dbd0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#173324]"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Pending Doctor Approvals */}
        {activeTab === 'pending' && (
          <div>
            {pendingDoctors.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-[#e0e4da] shadow-sm">
                <CheckCircle className="w-12 h-12 text-[#16a34a] mx-auto mb-3" />
                <h4 className="text-lg font-bold text-[#192018]">No Pending Reviews</h4>
                <p className="text-sm text-[#525C50] mt-1">
                  All submitted doctor registrations have been processed.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingDoctors.map((doc) => (
                  <div
                    key={doc.user_id}
                    className="bg-white rounded-2xl p-6 border border-[#d8ded4] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                            Pending Verification
                          </span>
                          <h4 className="text-lg font-bold text-[#192018] mt-2">
                            {doc.name || 'Unnamed Doctor'}
                          </h4>
                          <p className="text-xs text-[#525C50]">{doc.email}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#eef2eb] flex items-center justify-center text-[#173324]">
                          <Award className="w-5 h-5 text-[#2b988f]" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#f9faf7] rounded-xl text-xs mb-4 border border-[#ebf0e6]">
                        <div>
                          <span className="text-[#7F8A7C] block font-medium">Specialization</span>
                          <span className="font-semibold text-[#192018]">
                            {doc.specialization || 'Not specified'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#7F8A7C] block font-medium">Medical Reg / License</span>
                          <span className="font-mono font-bold text-[#173324]">
                            {doc.license_number || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#7F8A7C] block font-medium">State Council</span>
                          <span className="font-semibold text-[#192018]">
                            {doc.state_council || 'Standard Medical Registry'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#7F8A7C] block font-medium">Experience</span>
                          <span className="font-semibold text-[#192018]">
                            {doc.experience_years ? `${doc.experience_years} years` : 'N/A'}
                          </span>
                        </div>
                        {doc.hospital_affiliation && (
                          <div className="col-span-2">
                            <span className="text-[#7F8A7C] block font-medium">Affiliation</span>
                            <span className="font-semibold text-[#192018]">
                              {doc.hospital_affiliation}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-[#525C50] mb-1">
                          Review / Audit Note (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. License checked with state registry"
                          value={reviewNotes[doc.user_id] || ''}
                          onChange={(e) =>
                            setReviewNotes({ ...reviewNotes, [doc.user_id]: e.target.value })
                          }
                          className="w-full text-xs px-3 py-2 bg-white border border-[#d2dbd0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#173324]"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-[#ebf0e6]">
                      <button
                        onClick={() => handleReview(doc.user_id, 'approve')}
                        disabled={actionLoading === doc.user_id}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve License</span>
                      </button>
                      <button
                        onClick={() => handleReview(doc.user_id, 'reject')}
                        disabled={actionLoading === doc.user_id}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#fee2e2] hover:bg-[#fca5a5] text-[#991b1b] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: All Doctors */}
        {activeTab === 'doctors' && (
          <div className="bg-white rounded-2xl border border-[#e0e4da] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f7f2] text-[#525C50] border-b border-[#e2e6dc] uppercase font-bold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Doctor</th>
                    <th className="py-3.5 px-4">Specialization</th>
                    <th className="py-3.5 px-4">License No.</th>
                    <th className="py-3.5 px-4">Hospital</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0e8]">
                  {filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#7F8A7C]">
                        No doctors match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map((doc) => (
                      <tr key={doc.user_id} className="hover:bg-[#fcfdfa] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#192018]">{doc.name || 'Unnamed'}</div>
                          <div className="text-[11px] text-[#7F8A7C]">{doc.email}</div>
                          {doc.phone && <div className="text-[10px] text-[#7F8A7C]">{doc.phone}</div>}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#192018]">
                          {doc.specialization || 'General'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#173324]">
                          {doc.license_number || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-[#525C50]">
                          {doc.hospital_affiliation || 'Independent'}
                        </td>
                        <td className="py-3.5 px-4">
                          {doc.is_verified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#dcfce7] text-[#166534] border border-[#86efac]">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </span>
                          ) : doc.verification_status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5]">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!doc.is_verified && (
                              <button
                                onClick={() => handleReview(doc.user_id, 'approve')}
                                disabled={actionLoading === doc.user_id}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#dcfce7] hover:bg-[#bbf7d0] text-[#166534] transition-all cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteDoctor(doc.user_id, doc.name)}
                              disabled={actionLoading === doc.user_id}
                              className="p-1.5 text-[#dc2626] hover:bg-[#fee2e2] rounded-lg transition-colors cursor-pointer"
                              title="Delete Doctor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: All Patients */}
        {activeTab === 'patients' && (
          <div className="bg-white rounded-2xl border border-[#e0e4da] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f7f2] text-[#525C50] border-b border-[#e2e6dc] uppercase font-bold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Patient</th>
                    <th className="py-3.5 px-4">Age / Gender</th>
                    <th className="py-3.5 px-4">Address</th>
                    <th className="py-3.5 px-4">Allergies</th>
                    <th className="py-3.5 px-4">Chronic Conditions</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0e8]">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#7F8A7C]">
                        No patients match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((pat) => (
                      <tr key={pat.user_id} className="hover:bg-[#fcfdfa] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#192018]">{pat.name || 'Unnamed'}</div>
                          <div className="text-[11px] text-[#7F8A7C]">{pat.email}</div>
                          {pat.phone && <div className="text-[10px] text-[#7F8A7C]">{pat.phone}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-[#192018]">
                          {pat.age ? `${pat.age} yrs` : 'N/A'}{' '}
                          {pat.gender ? `• ${pat.gender}` : ''}
                        </td>
                        <td className="py-3.5 px-4 text-[#525C50]">
                          {pat.address || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-[#dc2626]">
                          {pat.allergies || 'None recorded'}
                        </td>
                        <td className="py-3.5 px-4 text-[#525C50]">
                          {pat.chronic_conditions || 'None recorded'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeletePatient(pat.user_id, pat.name)}
                            disabled={actionLoading === pat.user_id}
                            className="p-1.5 text-[#dc2626] hover:bg-[#fee2e2] rounded-lg transition-colors cursor-pointer"
                            title="Delete Patient"
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
    </div>
  );
};

export default AdminDashboardView;
