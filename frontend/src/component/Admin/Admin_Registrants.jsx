import { useState, useEffect } from 'react';
import axios from 'axios';
import Admin_Navbar from './Admin_Navbar';
import ProfileMenu from '../ProfileMenu';
import ExportModal from './ExportModal';

const API_BASE = import.meta.env.VITE_API_BASE || "https://juanlms-webapp-server.onrender.com";

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
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('Application requirements not met');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // id of row being processed
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch registrants from backend
  const fetchRegistrants = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (selectedDate) params.date = selectedDate;
      if (statusFilter !== 'all') params.status = statusFilter;
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/registrants`, { params, headers: { Authorization: `Bearer ${token}` } });
      setRegistrants(res.data?.data || []);
      if (res.data?.pagination) setPagination(res.data.pagination);
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

  // Consolidated data fetching function
  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const [registrantsRes, yearRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/api/registrants`, { 
          params: { page: pagination.page, limit: pagination.limit },
          headers: { Authorization: `Bearer ${token}` } 
        }),
        fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ]);

      // Process registrants
      if (registrantsRes.status === 'fulfilled') {
        setRegistrants(registrantsRes.value.data?.data || []);
        if (registrantsRes.value.data?.pagination) setPagination(registrantsRes.value.data.pagination);
        setError('');
      } else {
        console.error('Error fetching registrants:', registrantsRes.reason);
        setError('Failed to fetch registrants. Please try again.');
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
      setError('Error fetching registrants data');
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
          console.log('Available terms:', terms);
          const active = terms.find(term => term.status === 'active');
          console.log('Active term found:', active);
          setCurrentTerm(active || null);
        } else {
          console.log('Failed to fetch terms, status:', res.status);
          setCurrentTerm(null);
        }
      } catch {
        setCurrentTerm(null);
      }
    }
    fetchActiveTermForYear();
  }, [academicYear]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchRegistrants();
  }, [selectedDate, statusFilter, pagination.page, pagination.limit]);

  // Fetch student assignments for the active term to validate registrants
  useEffect(() => {
    async function fetchStudentAssignments() {
      if (!currentTerm) {
        console.log('No current term available for fetching student assignments');
        return;
      }
      try {
        console.log('Fetching student assignments for term:', currentTerm);
        console.log('Term ID:', currentTerm._id);
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/student-assignments`, {
          params: { termId: currentTerm._id },
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Student assignments response status:', res.status);
        console.log('Fetched student assignments:', res.data);
        setStudentAssignments(res.data || []);
      } catch (err) {
        // Silent fail; validation column will show unknown
        console.warn('Failed to fetch student assignments for validation:', err);
        console.warn('Error details:', err.response?.data);
        setStudentAssignments([]);
      }
    }
    fetchStudentAssignments();
  }, [currentTerm]);

  // Fetch students to get school IDs for validation
  useEffect(() => {
    async function fetchStudents() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/users/active`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Fetched users:', res.data);
        // Filter to only get students
        const studentUsers = (res.data || []).filter(user => user.role === 'students');
        console.log('Filtered students:', studentUsers);
        setStudents(studentUsers);
      } catch (err) {
        console.warn('Failed to fetch students for validation:', err);
        setStudents([]);
      }
    }
    fetchStudents();
  }, []);

  const normalizeName = (first, middle, last) => {
    const parts = [first || '', middle || '', last || '']
      .map(s => (s || '').trim())
      .filter(Boolean);
    return parts.join(' ').replace(/\s+/g, ' ').toLowerCase();
  };

  const validateAgainstAssignments = (r) => {
    const registrantName = normalizeName(r.firstName, r.middleName, r.lastName);
    const registrantSchoolId = (r.schoolID || '').trim();
    
    console.log('=== VALIDATION DEBUG ===');
    console.log('Registrant:', {
      name: registrantName,
      schoolId: registrantSchoolId,
      firstName: r.firstName,
      middleName: r.middleName,
      lastName: r.lastName
    });
    console.log('Available student assignments:', studentAssignments.length);
    console.log('Student assignments data:', studentAssignments);
    
    // Try multiple matching strategies
    const matched = studentAssignments.find(a => {
      // Get all possible school ID fields
      let assignmentSchoolId = (a.schoolID || a.studentSchoolID || a.schoolID || '').trim();
      
      // If no school ID in assignment, try to get it from the linked student record
      if (!assignmentSchoolId && a.studentId) {
        const linkedStudent = students.find(s => s._id === a.studentId);
        if (linkedStudent) {
          assignmentSchoolId = (linkedStudent.schoolID || '').trim();
          console.log('Found school ID from linked student:', assignmentSchoolId);
        }
      }
      
      // Get all possible name fields and normalize them
      const assignmentFullName = (a.studentName || '').trim().toLowerCase();
      const assignmentFirstName = (a.firstname || a.firstName || '').trim().toLowerCase();
      const assignmentLastName = (a.lastname || a.lastName || '').trim().toLowerCase();
      const assignmentNormalizedName = normalizeName(assignmentFirstName, '', assignmentLastName);
      
      console.log('Checking assignment:', {
        assignmentFullName,
        assignmentFirstName,
        assignmentLastName,
        assignmentNormalizedName,
        assignmentSchoolId,
        registrantName,
        registrantSchoolId,
        fullAssignmentObject: a
      });
      
      // Check school ID match first
      const schoolIdMatch = assignmentSchoolId === registrantSchoolId;
      
      if (!schoolIdMatch) {
        console.log('School ID does not match');
        return false;
      }
      
      // If school ID matches, check name matches
      const nameMatch = assignmentFullName === registrantName || 
                       assignmentNormalizedName === registrantName ||
                       (assignmentFirstName === r.firstName?.toLowerCase() && 
                        assignmentLastName === r.lastName?.toLowerCase());
      
      console.log('Match results:', { schoolIdMatch, nameMatch });
      
      return nameMatch;
    });
    
    console.log('Primary match result:', matched);
    
    // If no exact match found, try to find by school ID only (fallback)
    if (!matched) {
      const schoolIdMatch = studentAssignments.find(a => {
        let assignmentSchoolId = (a.schoolID || a.studentSchoolID || a.schoolID || '').trim();
        
        // If no school ID in assignment, try to get it from the linked student record
        if (!assignmentSchoolId && a.studentId) {
          const linkedStudent = students.find(s => s._id === a.studentId);
          if (linkedStudent) {
            assignmentSchoolId = (linkedStudent.schoolID || '').trim();
          }
        }
        
        console.log('Fallback check - assignment school ID:', assignmentSchoolId, 'vs registrant:', registrantSchoolId);
        return assignmentSchoolId === registrantSchoolId;
      });
      console.log('Fallback match result:', schoolIdMatch);
      return !!schoolIdMatch;
    }
    
    console.log('Final result:', !!matched);
    console.log('=== END VALIDATION DEBUG ===');
    return !!matched;
  };

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

  // Show export modal
  const handleExportClick = () => {
    setShowExportModal(true);
  };

  // Export registrants with specific status
  const handleExport = async (exportStatus) => {
    setExportLoading(true);
    setError('');
    setShowExportModal(false);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const params = [];
      if (selectedDate) params.push(`date=${encodeURIComponent(selectedDate)}`);
      if (exportStatus !== 'all') params.push(`status=${encodeURIComponent(exportStatus)}`);
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
    } finally {
      setExportLoading(false);
    }
  };

  // Filter registrants based on status
  const getFilteredRegistrants = () => {
    if (statusFilter === 'all') {
      return registrants;
    }
    return registrants.filter(registrant => registrant.status === statusFilter);
  };

  const filteredRegistrants = getFilteredRegistrants();

  // Reset filters
  const resetFilters = () => {
    setSelectedDate('');
    setStatusFilter('all');
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100 font-poppinsr">
        <Admin_Navbar />
        <div className="flex-1 p-4 sm:p-6 md:p-10 md:ml-64 font-poppinsr">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading registrants...</p>
            <p className="text-gray-500 text-sm mt-2">Fetching registration data and academic year information</p>
          </div>
        </div>
      </div>
    );
  }

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
                onClick={handleExportClick}
                className="bg-[#00418B] hover:bg-[#003166] text-white px-4 py-2 rounded transition"
              >
                Export
              </button>
              <button 
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition" 
                onClick={fetchRegistrants}
              >
                Refresh
              </button>
              <button 
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition" 
                onClick={resetFilters}
              >
                Reset Filters
              </button>
            </div>
          </div>
          
          {/* Re-registration Info */}
          <div className="mt-4 p-3 bg-[#E3F2FD] border border-[#00418B] rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-[#00418B] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-[#00418B]">
                <p className="font-medium mb-1">Re-registration Process</p>
                <p className="text-[#003166]">
                  Applicants who were previously rejected can re-register using the same email. 
                  Re-registrations are marked with "Re-registration" and "Updated" indicators. 
                  Check the "Rejection History" column to review previous rejection reasons.
                </p>
              </div>
            </div>
          </div>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        
        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {registrants.length} of {pagination.total} registrants | Page {pagination.page} of {pagination.totalPages}
          {statusFilter !== 'all' && (
            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2 text-xs">
              Status: {statusFilter}
            </span>
          )}
          {selectedDate && (
            <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded ml-2 text-xs">
              Date: {selectedDate}
            </span>
          )}
        </div>
        
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-white p-4 rounded-xl shadow mb-4">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-3 border-b font-semibold text-gray-700">School ID</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Track</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Strand</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Section</th>
                  <th className="p-3 border-b font-semibold text-gray-700">Validation</th>
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
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Track" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Strand" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Section" /></th>
                  <th className="p-2 border-b"></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search First Name" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Middle Name" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Last Name" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Personal Email" /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Contact No." /></th>
                  <th className="p-2 border-b"><input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search Date" /></th>
                  <th className="p-2 border-b">
                    <select 
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
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
                {filteredRegistrants.length === 0 ? (
                  <tr><td colSpan={12} className="text-center p-4 text-gray-500">No registrants found.</td></tr>
                ) : (
                  filteredRegistrants.map((r, idx) => (
                    <tr key={r._id} className={idx % 2 === 0 ? "bg-white hover:bg-gray-50 transition" : "bg-gray-50 hover:bg-gray-100 transition"}>
                      <td className="p-3 border-b align-middle">{formatSchoolId(r.schoolID)}</td>
                      <td className="p-3 border-b align-middle">{r.trackName || '-'}</td>
                      <td className="p-3 border-b align-middle">{r.strandName || '-'}</td>
                      <td className="p-3 border-b align-middle">{r.sectionName || '-'}</td>
                      <td className="p-3 border-b align-middle">
                        {validateAgainstAssignments(r) ? (
                          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Student is enrolled</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Student not enrolled</span>
                        )}
                      </td>
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
                      <td className="p-3 border-b">
                        <div className="inline-flex space-x-2">
                      {r.status === 'pending' && (
                        <>
                          <button
                            className="bg-green-500 hover:bg-green-600 p-2.5 rounded-md transition-colors shadow-sm"
                            onClick={() => handleApprove(r._id)}
                            disabled={actionLoading === r._id}
                            title="Approve"
                          >
                            {/* Heroicons Check Circle */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-black">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            className="bg-red-500 hover:bg-red-600 p-2.5 rounded-md transition-colors shadow-sm"
                            onClick={() => handleReject(r._id)}
                            disabled={actionLoading === r._id}
                            title="Reject"
                          >
                            {/* Heroicons X Circle */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-black">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
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
          </div>
        )}
        
        {/* Pagination Controls */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-4">
            <button 
              className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50" 
              onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))} 
              disabled={pagination.page === 1}
            >
              Previous
            </button>
            <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
            <button 
              className="px-4 py-2 rounded bg-[#00418B] hover:bg-[#003166] text-white disabled:opacity-50" 
              onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))} 
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </button>
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
        
        {/* Export Modal */}
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          loading={exportLoading}
        />
      </div>
    </div>
  );
} 