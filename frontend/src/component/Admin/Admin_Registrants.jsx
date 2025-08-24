import { useState, useEffect } from 'react';
import axios from 'axios';
import Admin_Navbar from './Admin_Navbar';
import ProfileMenu from '../ProfileMenu';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  if (user.length <= 1) return '*@' + domain;
  return user[0] + '*'.repeat(Math.max(1, user.length - 1)) + '@' + domain;
}

function formatSchoolId(schoolId) {
  if (!schoolId) return '-';
  if (/^\d{2}-\d{5}$/.test(schoolId)) return `${schoolId} (Student Number)`;
  if (/^F00/.test(schoolId)) return `${schoolId} (Faculty)`;
  if (/^A00/.test(schoolId)) return `${schoolId} (Admin)`;
  return schoolId;
}

export default function Admin_Registrants() {
  const [registrants, setRegistrants] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('Application requirements not met');
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
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/registrants`, { params, headers: { Authorization: `Bearer ${token}` } });
      setRegistrants(res.data);
    } catch (err) {
      console.error('Error fetching registrants:', err);
      let errorMessage = 'Failed to fetch registrants. Please try again.';
      
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'You do not have permission to view registrants.';
        } else if (status === 404) {
          errorMessage = 'Registrants not found.';
        } else if (status >= 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        } else {
          errorMessage = data.message || `Failed to fetch registrants (${status}).`;
        }
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = err.message || 'An unexpected error occurred.';
      }
      
      setError(errorMessage);
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
  }, [selectedDate]);

  // Approve registrant
  const handleApprove = async (id) => {
    setActionLoading(id);
    setError('');
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/registrants/${id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setRegistrants(registrants => registrants.map(r => r._id === id ? { ...r, status: 'approved', rejectionNote: '' } : r));
    } catch (err) {
      console.error('Error approving registrant:', err);
      let errorMessage = 'Failed to approve registrant. Please try again.';
      
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 400) {
          errorMessage = data.message || 'Invalid registrant data.';
        } else if (status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'You do not have permission to approve registrants.';
        } else if (status === 404) {
          errorMessage = 'Registrant not found.';
        } else if (status >= 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        } else {
          errorMessage = data.message || `Failed to approve registrant (${status}).`;
        }
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = err.message || 'An unexpected error occurred.';
      }
      
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  // Reject registrant
  const handleReject = (id) => {
    setRejectingId(id);
    setRejectionNote('Application requirements not met');
    setShowRejectModal(true);
  };
  const confirmReject = async () => {
    setActionLoading(rejectingId);
    setError('');
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/registrants/${rejectingId}/reject`, { note: rejectionNote }, { headers: { Authorization: `Bearer ${token}` } });
      setRegistrants(registrants => registrants.map(r => r._id === rejectingId ? { ...r, status: 'rejected', rejectionNote } : r));
      setShowRejectModal(false);
      setRejectingId(null);
    } catch (err) {
      console.error('Error rejecting registrant:', err);
      let errorMessage = 'Failed to reject registrant. Please try again.';
      
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 400) {
          errorMessage = data.message || 'Invalid rejection data.';
        } else if (status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'You do not have permission to reject registrants.';
        } else if (status === 404) {
          errorMessage = 'Registrant not found.';
        } else if (status >= 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        } else {
          errorMessage = data.message || `Failed to reject registrant (${status}).`;
        }
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = err.message || 'An unexpected error occurred.';
      }
      
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  // Export registrants
  const handleExport = async () => {
    setError('');
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const params = [];
      if (selectedDate) params.push(`date=${encodeURIComponent(selectedDate)}`);
      const query = params.length ? `?${params.join('&')}` : '';
      
      const response = await fetch(`${API_BASE}/api/registrants/export${query}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else if (response.status === 403) {
          setError('You do not have permission to export registrants.');
        } else {
          throw new Error(`Failed to export registrants (${response.status}).`);
        }
        return;
      }
      
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
      console.error('Export error:', err);
      setError('Failed to export registrants. Please try again.');
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
              <span> </span>{academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} |
              <span> </span>{currentTerm ? `${currentTerm.termName}` : "Loading..."} |
              <span> </span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <ProfileMenu />
        </div>
        
        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Export
              </button>
              <button 
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition" 
                onClick={fetchRegistrants}
              >
                Refresh
              </button>
            </div>
          </div>
          
          {/* Re-registration Info */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Re-registration Process</p>
                <p className="text-blue-700">
                  Applicants who were previously rejected can re-register using the same email. 
                  Re-registrations are marked with "Re-registration" and "Updated" indicators. 
                  Check the "Rejection History" column to review previous rejection reasons.
                </p>
              </div>
            </div>
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
                  <th className="p-3 border-b font-semibold text-gray-700">School ID</th>
                  <th className="p-3 border-b font-semibold text-gray-700">First Name</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Middle Name</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Last Name</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Personal Email</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Contact No.</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Date</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Status</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Rejection History</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Actions</th>
                </tr>
                <tr className="bg-white text-left">
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search School ID" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search First Name" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Middle Name" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Last Name" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Personal Email" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Contact No." /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Date" /></th>
                  <th className="p-2 border-b">
                    <select 
                      className="w-full border rounded px-2 py-1 text-sm"
                      value="all" // Default to all status
                      onChange={(e) => {
                        // This onChange is no longer directly tied to a state variable,
                        // so it doesn't need to update a state.
                        // The filtering is handled by the backend.
                      }}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </th>
                  <th className="p-2 border-b"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center p-4 text-gray-500">No registrants found.</td></tr>
                ) : (
                  filtered.map((r, idx) => (
                    <tr key={r._id} className={idx % 2 === 0 ? "bg-white hover:bg-gray-50 transition" : "bg-gray-50 hover:bg-gray-100 transition"}>
                      <td className="p-3 border-b align-middle">{formatSchoolId(r.schoolID)}</td>
                      <td className="p-3 border-b align-middle">{r.firstName}</td>
                      <td className="p-3 border-b align-middle">{r.middleName}</td>
                      <td className="p-3 border-b align-middle">{r.lastName}</td>
                      <td className="p-3 border-b align-middle">
                        <div className="flex flex-col">
                          <span>{maskEmail(r.personalEmail)}</span>
                          {r.processedAt && r.status === 'pending' && (
                            <span className="text-xs text-blue-600 font-medium">Re-registration</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 border-b align-middle">{r.contactNo}</td>
                      <td className="p-3 border-b align-middle">
                        <div className="flex flex-col">
                          <span>{r.registrationDate ? r.registrationDate.slice(0, 10) : ''}</span>
                          {r.processedAt && r.status === 'pending' && (
                            <span className="text-xs text-gray-500">
                              Previously: {new Date(r.processedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`p-3 border-b align-middle font-semibold ${statusColors[r.status]}`}>
                        <div className="flex flex-col">
                          <span>{r.status}</span>
                          {r.processedAt && r.status === 'pending' && (
                            <span className="text-xs text-blue-600">Updated</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 border-b align-middle">
                        <div className="flex flex-col">
                          {r.rejectionHistory && r.rejectionHistory.length > 0 ? (
                            r.rejectionHistory.map((history, hIdx) => (
                              <div key={hIdx} className="text-xs text-gray-600 mb-1">
                                <span className="font-medium">{new Date(history.date).toLocaleDateString()}:</span>
                                <br />
                                <span className="text-gray-500">{history.note}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-500 text-xs">No rejection history</span>
                          )}
                        </div>
                      </td>
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
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
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