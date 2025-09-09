import { useState, useEffect } from "react";
import VPE_Navbar from "./VPE_Navbar";
import ProfileMenu from "../ProfileMenu";
import axios from "axios";
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function VPE_AuditTrail() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [logsPerPage] = useState(10);
  const navigate = useNavigate();
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  // Map backend action values to user-friendly labels
  const actionLabelMap = {
    'Login': 'Login',
    'Create Account': 'Create Account',
    'Archive Account': 'Archive Account',
    'Upload Material': 'Upload Material',
    'Add Class': 'Add Class',
    'Upload': 'Upload',
    // Backend variants:
    'ADMIN_CREATE_ACCOUNT': 'Create Account',
    'ADMIN_ARCHIVE_ACCOUNT': 'Archive Account',
    'ADMIN_UPLOAD': 'Upload',
    'STUDENT_UPLOAD_MATERIAL': 'Upload Material',
    'STUDENT_ADD_CLASS': 'Add Class',
    'FACULTY_UPLOAD_MATERIAL': 'Upload Material',
    'FACULTY_ADD_CLASS': 'Add Class',
    'PRINCIPAL_UPLOAD_MATERIAL': 'Upload Material',
    'PRINCIPAL_ADD_CLASS': 'Add Class',
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || (user.role !== 'admin' && user.role !== 'principal' && user.role !== 'vice president of education')) {
      navigate('/');
      return;
    }
    fetchAuditLogs();
  }, [currentPage, navigate]);

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

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await axios.get(`${API_BASE}/audit-logs?page=${currentPage}&limit=${logsPerPage}`, {
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
        navigate('/');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        let errMsg = err.response?.data?.message || 'Failed to fetch audit logs';
        if (typeof errMsg === 'string' && errMsg.includes('Admin/Director only')) {
          errMsg = errMsg.replace('Admin/Director only', 'Admin/Principal/VPE only');
        }
        setError(errMsg);
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

  // Export audit logs to Excel (VPE users can export to Excel)
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await fetch(`${API_BASE}/audit-logs/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export audit logs');
      }

      const blob = await response.blob();
      
      // Get filename from Content-Disposition header
      let filename = 'audit_logs_export.xlsx';
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error exporting audit logs:', err);
      alert('Failed to export audit logs. Please try again.');
    }
  };

  const getActionLabel = (action) => {
    return actionLabelMap[action] || action || 'Unknown Action';
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      <VPE_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">VPE Audit Trail</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              {currentTerm ? `${currentTerm.termName}` : "Loading..."} | 
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <ProfileMenu />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">System Audit Logs</h3>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Export to Excel
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-4">
              <p>{error}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="p-3 border font-semibold">Timestamp</th>
                      <th className="p-3 border font-semibold">User</th>
                      <th className="p-3 border font-semibold">Action</th>
                      <th className="p-3 border font-semibold">Details</th>
                      <th className="p-3 border font-semibold">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-400 p-4">
                          No audit logs found
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log, index) => (
                        <tr key={log._id || index} className="hover:bg-gray-50 border-b">
                          <td className="p-3 border text-sm">
                            {formatDate(log.timestamp)}
                          </td>
                          <td className="p-3 border text-sm font-medium">
                            {log.userName || log.user || '-'}
                          </td>
                          <td className="p-3 border text-sm">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              {getActionLabel(log.action)}
                            </span>
                          </td>
                          <td className="p-3 border text-sm">
                            {log.details || log.description || '-'}
                          </td>
                          <td className="p-3 border text-sm text-gray-500">
                            {log.ipAddress || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
