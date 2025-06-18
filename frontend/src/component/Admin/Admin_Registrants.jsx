import { useState, useEffect } from 'react';
import axios from 'axios';
import Admin_Navbar from './Admin_Navbar';

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
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Admin_Navbar />
      <div className="flex-1 p-4 sm:p-6 md:p-10 md:ml-64">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">Registrants</h2>
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
            <table className="min-w-full bg-white rounded shadow">
              <thead>
                <tr className="bg-gray-200">
                  <th className="py-2 px-4">First Name</th>
                  <th className="py-2 px-4">Middle Name</th>
                  <th className="py-2 px-4">Last Name</th>
                  <th className="py-2 px-4">Email</th>
                  <th className="py-2 px-4">Contact No.</th>
                  <th className="py-2 px-4">Date</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Note</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-4">No registrants found.</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r._id} className="border-b">
                    <td className="py-2 px-4">{r.firstName}</td>
                    <td className="py-2 px-4">{r.middleName}</td>
                    <td className="py-2 px-4">{r.lastName}</td>
                    <td className="py-2 px-4">{r.personalEmail}</td>
                    <td className="py-2 px-4">{r.contactNo}</td>
                    <td className="py-2 px-4">{r.registrationDate ? r.registrationDate.slice(0, 10) : ''}</td>
                    <td className={`py-2 px-4 font-semibold ${statusColors[r.status]}`}>{r.status}</td>
                    <td className="py-2 px-4">{r.note || '-'}</td>
                    <td className="py-2 px-4">
                      {r.status === 'pending' && (
                        <>
                          <button
                            className="bg-green-600 text-white px-2 py-1 rounded mr-2 hover:bg-green-700 disabled:opacity-50"
                            onClick={() => handleApprove(r._id)}
                            disabled={actionLoading === r._id}
                          >
                            {actionLoading === r._id ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                            onClick={() => handleReject(r._id)}
                            disabled={actionLoading === r._id}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
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