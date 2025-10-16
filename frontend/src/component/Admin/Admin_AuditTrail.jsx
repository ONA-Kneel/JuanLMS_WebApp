import { useState, useEffect } from "react";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { getLogoBase64, getFooterLogoBase64 } from '../../utils/imageToBase64';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com"; 

export default function Admin_AuditTrail() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [logsPerPage] = useState(10);
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const navigate = useNavigate();
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search terms for filtering
  const [searchTerms, setSearchTerms] = useState({
    userName: "",
  });

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

  // All possible actions for the filter
  const actionTypes = {
    all: 'All Actions',
    'Login': 'Login',
    'Create Account': 'Create Account',
    'Archive Account': 'Archive Account',
    'Upload Material': 'Upload Material',
    'Add Class': 'Add Class',
    'Upload': 'Upload',
  };

  const roleTypes = {
    all: 'All Roles',
    student: 'Student',
    faculty: 'Faculty',
    principal: 'Principal',
    'vice president of education': 'Vice President of Education',
    admin: 'Admin'
  };

  // Map user-friendly action names to all possible backend action values
  const actionBackendMap = {
    all: [],
    'Login': ['Login'],
    'Create Account': ['Create Account', 'ADMIN_CREATE_ACCOUNT'],
    'Archive Account': ['Archive Account', 'ADMIN_ARCHIVE_ACCOUNT'],
    'Upload Material': [
      'Upload Material',
      'STUDENT_UPLOAD_MATERIAL',
      'FACULTY_UPLOAD_MATERIAL',
      'PRINCIPAL_UPLOAD_MATERIAL',
    ],
    'Add Class': [
      'Add Class',
      'STUDENT_ADD_CLASS',
      'FACULTY_ADD_CLASS',
      'PRINCIPAL_ADD_CLASS',
    ],
    'Upload': ['Upload', 'ADMIN_UPLOAD'],
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || (user.role !== 'admin' && user.role !== 'principal')) {
      navigate('/login');
      return;
    }
    fetchInitialData();
  }, [currentPage, selectedAction, selectedRole, navigate]);

  // Consolidated data fetching function
  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const [auditRes, yearRes] = await Promise.allSettled([
        axios.get(
          `${API_BASE}/audit-logs?page=${currentPage}&limit=${logsPerPage}&action=${selectedAction}&role=${selectedRole}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        ),
        fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ]);

      // Process audit logs
      if (auditRes.status === 'fulfilled') {
        if (auditRes.value.data && auditRes.value.data.logs) {
          setAuditLogs(auditRes.value.data.logs);
          setTotalPages(auditRes.value.data.pagination.totalPages || 1);
          setError(null);
        } else {
          setError('Invalid data format received from server');
        }
      } else {
        console.error('Error fetching audit logs:', auditRes.reason);
        if (auditRes.reason?.response?.status === 401) {
          navigate('/login');
        } else if (auditRes.reason?.response?.status === 500) {
          setError('Server error. Please try again later.');
        } else {
          setError(auditRes.reason?.response?.data?.message || 'Failed to fetch audit logs');
        }
        setAuditLogs([]);
        setTotalPages(1);
      }

      // Process academic year
      if (yearRes.status === 'fulfilled' && yearRes.value.ok) {
        const year = await yearRes.value.json();
        setAcademicYear(year);
      } else {
        console.error("Failed to fetch academic year", yearRes.reason);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setError('Error fetching audit trail data');
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

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

  // Export audit logs to Excel
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Build query parameters for export
      const params = [];
      if (selectedAction && selectedAction !== 'all') params.push(`action=${encodeURIComponent(selectedAction)}`);
      if (selectedRole && selectedRole !== 'all') params.push(`role=${encodeURIComponent(selectedRole)}`);
      const query = params.length ? `?${params.join('&')}` : '';

      const response = await fetch(`${API_BASE}/audit-logs/export${query}`, {
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

  // Export audit logs to PDF (Admin only) - Frontend HTML generation
  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Get base64 encoded logos
      const logoBase64 = await getLogoBase64();
      const footerLogoBase64 = await getFooterLogoBase64();

      // Build query parameters for export
      const params = [];
      if (selectedAction && selectedAction !== 'all') params.push(`action=${encodeURIComponent(selectedAction)}`);
      if (selectedRole && selectedRole !== 'all') params.push(`role=${encodeURIComponent(selectedRole)}`);
      const query = params.length ? `?${params.join('&')}` : '';

      const response = await fetch(`${API_BASE}/audit-logs/export-pdf${query}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export audit logs to PDF');
      }

      const data = await response.json();
      const { logs, totalLogs, filters, generatedAt } = data;

      // Create HTML content matching ClassContent.jsx format exactly
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Audit Trail Report</title>
          <style>
            @page {
              size: A4;
              margin: 0.5in;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              font-size: 12px;
            }
            * {
              box-sizing: border-box;
            }
            .header {
              display: flex;
              align-items: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .logo {
              width: 80px;
              height: 80px;
              margin-right: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .institution-info {
              flex: 1;
              text-align: center;
            }
            .institution-name {
              font-size: 18px;
              text-align: center;
              font-weight: bold;
              margin: 0;
            }
            .institution-address {
              font-size: 16px;
              text-align: center;
              margin: 0;
            }
            .institution-accreditation {
              font-size: 13px;
              text-align: center;
              margin: 0;
            }
            .report-info {
              text-align: right;
              margin-left: auto;
            }
            .report-title {
              font-weight: bold;
              margin: 0;
              font-size: 14px;
            }
            .report-date {
              margin: 5px 0 0 0;
              font-size: 12px;
            }
            .audit-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              table-layout: fixed;
            }
            .audit-table th,
            .audit-table td {
              border: 1px solid #333;
              padding: 6px;
              text-align: left;
              font-size: 10px;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .audit-table th {
              background-color: #f0f0f0;
              font-weight: bold;
              text-align: center;
            }
            .audit-table .timestamp-col {
              width: 20%;
            }
            .audit-table .user-col {
              width: 20%;
            }
            .audit-table .role-col {
              width: 15%;
            }
            .audit-table .action-col {
              width: 20%;
            }
            .audit-table .details-col {
              width: 45%;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #333;
              padding-top: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              color: #333;
            }
            .footer-left {
              text-align: left;
            }
            .footer-right {
              text-align: right;
            }
            .footer-logo {
              width: 30px;
              height: 30px;
            }
            .footer-logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <div class="logo">
                <img src="${logoBase64}" alt="San Juan de Dios Hospital Seal" />
              </div>
            </div>
            <div class="institution-info">
              <h1 class="institution-name">SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.</h1>
              <p class="institution-address">2772-2774 Roxas Boulevard, Pasay City 1300 Philippines</p>
              <p class="institution-accreditation">PAASCU Accredited - COLLEGE</p>
            </div>
            <div class="report-info">
              <p class="report-title">Audit Trail Report</p>
              <p class="report-date">Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <div style="margin: 20px 0;">
            <p><strong>Total Logs:</strong> ${totalLogs}</p>
            <p><strong>Filters:</strong> Action=${filters.action}, Role=${filters.role}</p>
          </div>
          
          <table class="audit-table">
            <thead>
              <tr>
                <th class="timestamp-col">Timestamp</th>
                <th class="user-col">User Name</th>
                <th class="role-col">User Role</th>
                <th class="action-col">Action</th>
                <th class="details-col">Details</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(log => `
                <tr>
                  <td class="timestamp-col">${new Date(log.timestamp).toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}</td>
                  <td class="user-col">${log.userName || 'Unknown'}</td>
                  <td class="role-col">${log.userRole || 'Unknown'}</td>
                  <td class="action-col">${log.action || 'Unknown'}</td>
                  <td class="details-col">${log.details || 'No details'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <div class="footer-left">
              <p>Hospital Tel. Nos: 831-9731/36;831-5641/49 www.sanjuandedios.org College Tel.Nos.: 551-2756; 551-2763 www.sjdefi.edu.ph</p>
            </div>
            <div class="footer-right">
              <div class="footer-logo"> 
                <img src="${footerLogoBase64}" alt="San Juan de Dios Hospital Seal" />
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };

    } catch (err) {
      console.error('Error exporting audit logs to PDF:', err);
      alert('Failed to export audit logs to PDF. Please try again.');
    }
  };

  // Filter logs on the frontend based on selected action, role, and search terms
  const filteredLogs = auditLogs.filter(log => {
    // Action filter
    if (selectedAction !== 'all') {
      const backendActions = actionBackendMap[selectedAction] || [selectedAction];
      if (!backendActions.includes(log.action)) return false;
    }
    // Role filter
    if (selectedRole !== 'all' && log.userRole !== selectedRole) return false;
    
    // Search filters
    const matchesUserName = log.userName?.toLowerCase().includes(searchTerms.userName.toLowerCase());
    
    return matchesUserName;
  });

  // Loading screen
  if (isLoading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Admin_Navbar />
        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading audit trail...</p>
            <p className="text-gray-500 text-sm mt-2">Fetching audit logs and academic year information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Admin_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Audit Trail</h2>
            <p className="text-base md:text-lg">
              <span> </span>{academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              <span> </span>{currentTerm ? `${currentTerm.termName}` : "Loading..."} | 
              <span> </span>{new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <ProfileMenu />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
          <h4 className="text-xl md:text-2xl font-semibold">Audit Logs</h4>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Export to Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Export to PDF
            </button>
          </div>
        </div>
        
        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredLogs.length} of {auditLogs.length} logs | Page {currentPage} of {totalPages}
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white p-4 rounded-xl shadow mb-4 border-2 border-[#00418B]">
          <table className="min-w-full bg-white border-2 border-[#00418B] rounded-lg text-sm table-fixed overflow-visible">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3 border-b border-[#00418B] w-1/6 font-semibold text-gray-700 whitespace-nowrap">Timestamp</th>
                <th className="p-3 border-b border-[#00418B] w-1/6 font-semibold text-gray-700 whitespace-nowrap">User</th>
                <th className="p-3 border-b border-[#00418B] w-1/6 font-semibold text-gray-700 whitespace-nowrap">Role</th>
                <th className="p-3 border-b border-[#00418B] w-1/6 font-semibold text-gray-700 whitespace-nowrap">Action</th>
                <th className="p-3 border-b border-[#00418B] w-2/6 font-semibold text-gray-700 whitespace-nowrap">Details</th>
              </tr>
              {/* Search row */}
              <tr className="bg-white text-left">
                <th className="p-2 border-b border-[#00418B]"></th>
                <th className="p-2 border-b border-[#00418B]">
                  <input 
                    type="text" 
                    placeholder="Search User" 
                    className="w-full border border-[#00418B] rounded px-2 py-1 text-sm" 
                    value={searchTerms.userName}
                    onChange={(e) => setSearchTerms({...searchTerms, userName: e.target.value})}
                  />
                </th>
                <th className="p-2 border-b border-[#00418B]">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full border border-[#00418B] rounded px-2 py-1 text-sm"
                  >
                    {Object.entries(roleTypes).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </th>
                <th className="p-2 border-b border-[#00418B]">
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="w-full border border-[#00418B] rounded px-2 py-1 text-sm"
                  >
                    {Object.entries(actionTypes).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </th>
                <th className="p-2 border-b border-[#00418B]">
                  <button
                    onClick={() => {
                      setSelectedAction('all');
                      setSelectedRole('all');
                      setSearchTerms({ userName: "" });
                    }}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm px-2 py-1 rounded"
                  >
                    Clear All Filters
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center p-4 text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="text-center p-4 text-red-500">
                    <div className="font-medium">Error</div>
                    <div className="text-sm mt-1">{error}</div>
                    <button
                      onClick={fetchInitialData}
                      className="mt-2 text-blue-500 hover:text-blue-700 underline"
                    >
                      Try Again
                    </button>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-4 text-gray-500">
                    No audit logs found. System actions will be recorded here.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log._id} className={idx % 2 === 0 ? "bg-white hover:bg-gray-50 transition" : "bg-gray-50 hover:bg-gray-100 transition"}>
                    <td className="p-3 border-b border-[#00418B] text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="p-3 border-b border-[#00418B] text-gray-900 whitespace-nowrap">{log.userName}</td>
                    <td className="p-3 border-b border-[#00418B] text-gray-900 whitespace-nowrap">
                      <span className={`inline-block w-auto max-w-fit px-2 py-0.5 rounded text-xs font-semibold
                        ${log.userRole === 'student' ? 'bg-green-100 text-green-700 border border-green-300' :
                          log.userRole === 'faculty' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                          log.userRole === 'admin' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                          log.userRole === 'principal' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                          log.userRole === 'vice president of education' ? 'bg-pink-100 text-pink-700 border border-pink-300' :
                          'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                        {log.userRole === 'vice president of education' ? 'Vice President of Education' : log.userRole || 'Unknown'}
                      </span>
                    </td>
                    <td className="p-3 border-b border-[#00418B] text-gray-900 whitespace-nowrap">{actionLabelMap[log.action] || log.action}</td>
                    <td className="p-3 border-b border-[#00418B] text-gray-500">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
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
              className="px-4 py-2 rounded bg-[#00418B] hover:bg-[#003166] text-white disabled:opacity-50"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}