import { useState, useEffect } from 'react';
import axios from 'axios';
import Admin_Navbar from './Admin_Navbar';
import ProfileMenu from '../ProfileMenu';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function Admin_Registrants() {
  const [registrants, setRegistrants] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('incomplete credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // id of row being processed
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  // Fetch registrants from backend
  const fetchRegistrants = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedDate) params.date = selectedDate;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const res = await axios.get(`${API_BASE}/api/registrants`, { params });
      setRegistrants(res.data);
    } catch (err) {
      setError('Failed to fetch registrants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const year = await yearRes.json();
          setAcademicYear(year);
        }
      } catch (err) {
        console.error("Failed to fetch academic year", err);
      }
    }
    fetchAcademicYear();
  }, []);

  useEffect(() => {
    async function fetchActiveTermForYear() {
      if (!academicYear) return;
      try {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const terms = await res.json();
          const active = terms.find(term => term.status === 'active');
          setCurrentTerm(active || null);
        } else {
          setCurrentTerm(null);
        }
      } catch {
        setCurrentTerm(null);
      }
    }
    fetchActiveTermForYear();
  }, [academicYear]);

  useEffect(() => {
    fetchRegistrants();
  }, [selectedDate, statusFilter]);

  // Approve registrant
  const handleApprove = async (id) => {
    setActionLoading(id);
    setError('');
    try {
      await axios.post(`${API_BASE}/api/registrants/${id}/approve`);
      setRegistrants(registrants => registrants.map(r => r._id === id ? { ...r, status: 'approved', rejectionNote: '' } : r));
    } catch (err) {
      setError('Failed to approve registrant.');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject registrant
  const handleReject = (id) => {
    setRejectingId(id);
    setRejectionNote('incomplete credentials');
    setShowRejectModal(true);
  };
  const confirmReject = async () => {
    setActionLoading(rejectingId);
    setError('');
    try {
      await axios.post(`${API_BASE}/api/registrants/${rejectingId}/reject`, { note: rejectionNote });
      setRegistrants(registrants => registrants.map(r => r._id === rejectingId ? { ...r, status: 'rejected', rejectionNote } : r));
      setShowRejectModal(false);
      setRejectingId(null);
    } catch (err) {
      setError('Failed to reject registrant.');
    } finally {
      setActionLoading(null);
    }
  };

  // Export registrants
  const handleExport = async () => {
    setError('');
    try {
      const params = [];
      if (selectedDate) params.push(`date=${encodeURIComponent(selectedDate)}`);
      if (statusFilter && statusFilter !== 'all') params.push(`status=${encodeURIComponent(statusFilter)}`);
      const query = params.length ? `?${params.join('&')}` : '';
      const response = await fetch(`${API_BASE}/api/registrants/export${query}`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Failed to export registrants.');
      const blob = await response.blob();
      // Get filename from Content-Disposition header
      let filename = 'registrants_export.xlsx';
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export registrants.');
    }
  };

  // Filtered registrants (already filtered by backend)
  const filtered = registrants;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-poppinsr">
      <Admin_Navbar />
      <div className="flex-1 p-4 sm:p-6 md:p-10 md:ml-64 font-poppinsr">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Registrants</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `AY: ${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} |
              {currentTerm ? `${currentTerm.termName}` : "Loading..."} |
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <ProfileMenu />
        </div>
        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex gap-2 items-center">
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border rounded px-2 py-1" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 transition" onClick={handleExport}>Export</button>
            <button className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition" onClick={fetchRegistrants}>Refresh</button>
          </div>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-3 border-b font-semibold text-gray-700">First Name</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Middle Name</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Last Name</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Email</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Contact No.</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Date</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Status</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Note</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Actions</th>
                </tr>
                <tr className="bg-white text-left">
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search First Name" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Middle Name" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Last Name" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Email" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Contact No." /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Date" /></th>
                  <th className="p-2 border-b"><select className="w-full border rounded px-2 py-1 text-sm"><option>All Status</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></th>
                  <th className="p-2 border-b"></th>
                  <th className="p-2 border-b"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center p-4 text-gray-500">No registrants found.</td></tr>
                ) : (
                  filtered.map((r, idx) => (
                    <tr key={r._id} className={idx % 2 === 0 ? "bg-white hover:bg-gray-50 transition" : "bg-gray-50 hover:bg-gray-100 transition"}>
                      <td className="p-3 border-b align-middle">{r.firstName}</td>
                      <td className="p-3 border-b align-middle">{r.middleName}</td>
                      <td className="p-3 border-b align-middle">{r.lastName}</td>
                      <td className="p-3 border-b align-middle">{r.personalEmail}</td>
                      <td className="p-3 border-b align-middle">{r.contactNo}</td>
                      <td className="p-3 border-b align-middle">{r.registrationDate ? r.registrationDate.slice(0, 10) : ''}</td>
                      <td className={`p-3 border-b align-middle font-semibold ${statusColors[r.status]}`}>{r.status}</td>
                      <td className="p-3 border-b align-middle">{r.note || '-'}</td>
                      <td className="p-3 border-b align-middle">
                        <div className="inline-flex space-x-2">
                          {r.status === 'pending' && (
                            <>
                              <button
                                className="p-1 rounded hover:bg-yellow-100 group relative"
                                onClick={() => handleApprove(r._id)}
                                disabled={actionLoading === r._id}
                                title="Approve"
                              >
                                {/* Heroicons Check Circle */}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-600">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                </svg>
                                <span className="absolute left-1/2 -translate-x-1/2 top-8 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">Approve</span>
                              </button>
                              <button
                                className="p-1 rounded hover:bg-red-100 group relative"
                                onClick={() => handleReject(r._id)}
                                disabled={actionLoading === r._id}
                                title="Reject"
                              >
                                {/* Heroicons Trash (reject) */}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="absolute left-1/2 -translate-x-1/2 top-8 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4 text-red-600">Reject Registrant</h3>
              <p className="mb-2">Add a note for rejection:</p>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 mb-4"
                value={rejectionNote}
                onChange={e => setRejectionNote(e.target.value)}
                id="rejection-note-input"
                name="rejectionNote"
              />
              <div className="flex gap-2">
                <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={confirmReject} disabled={actionLoading === rejectingId}>
                  {actionLoading === rejectingId ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 