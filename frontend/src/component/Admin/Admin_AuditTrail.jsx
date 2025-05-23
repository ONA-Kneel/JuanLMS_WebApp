import { useState, useEffect } from "react";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import axios from "axios";
import { useNavigate } from 'react-router-dom';

export default function Admin_AuditTrail() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [logsPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || (user.role !== 'admin' && user.role !== 'director')) {
      navigate('/login');
      return;
    }
    fetchAuditLogs();
  }, [currentPage, navigate]);

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`http://localhost:5000/audit-logs?page=${currentPage}&limit=${logsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data && response.data.logs) {
        setAuditLogs(response.data.logs);
        setTotalPages(response.data.pagination.totalPages || 1);
        setError(null);
      } else {
        setError('Invalid data format received from server');
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch audit logs');
      }
      setAuditLogs([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Admin_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Audit Trail</h2>
            <p className="text-base md:text-lg">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchAuditLogs}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Refresh
            </button>
            <ProfileMenu />
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="mt-8">
          <h4 className="text-lg font-semibold mb-2">Audit Logs</h4>
          <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3 border w-1/5">Timestamp</th>
                <th className="p-3 border w-1/5">User</th>
                <th className="p-3 border w-1/5">Action</th>
                <th className="p-3 border w-2/5">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center p-4 text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="4" className="text-center p-4 text-red-500">
                    <div className="font-medium">Error</div>
                    <div className="text-sm mt-1">{error}</div>
                    <button
                      onClick={fetchAuditLogs}
                      className="mt-2 text-blue-500 hover:text-blue-700 underline"
                    >
                      Try Again
                    </button>
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center p-4 text-gray-500">
                    No audit logs found. System actions will be recorded here.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="p-3 border text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="p-3 border text-gray-900 whitespace-nowrap">{log.userName}</td>
                    <td className="p-3 border text-gray-900 whitespace-nowrap">{log.action}</td>
                    <td className="p-3 border text-gray-500">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {!loading && !error && auditLogs.length > 0 && totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <button
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="text-sm">Page {currentPage} of {totalPages}</span>
              <button
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 