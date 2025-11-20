import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Admin_Navbar from './Admin_Navbar';
import ProfileMenu from '../ProfileMenu';
import ExportModal from './ExportModal';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

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
  const [statusFilter, setStatusFilter] = useState('all'); // Default to 'all' to show all registrants
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

  // Add state for active tab
  const [activeTab, setActiveTab] = useState('all');

  // Add search terms state similar to Admin_Accounts
  const [searchTerms, setSearchTerms] = useState({
    schoolID: "",
    firstName: "",
    middleName: "",
    lastName: "",
    personalEmail: "",
    track: "",
    strand: "",
    section: "",
    status: "all"
  });
  
  // Check if any search field has input
  const isSearching = searchTerms.schoolID || searchTerms.firstName || searchTerms.middleName || searchTerms.lastName || searchTerms.personalEmail || searchTerms.track || searchTerms.strand || searchTerms.section;
  
  const normalizeSearchValue = (value) => {
    if (value === null || value === undefined) return '';
    try {
      return String(value).trim().toLowerCase();
    } catch (_) {
      return '';
    }
  };

  // Client-side filtering for search
  const displayedRegistrants = registrants.filter(registrant => {
    const normalizedRegistrant = {
      schoolID: normalizeSearchValue(registrant.schoolID),
      firstName: normalizeSearchValue(registrant.firstName),
      middleName: normalizeSearchValue(registrant.middleName),
      lastName: normalizeSearchValue(registrant.lastName),
      personalEmail: normalizeSearchValue(registrant.personalEmail),
      trackName: normalizeSearchValue(registrant.trackName),
      strandName: normalizeSearchValue(registrant.strandName),
      sectionName: normalizeSearchValue(registrant.sectionName),
      status: normalizeSearchValue(registrant.status)
    };

    const normalizedSearch = {
      schoolID: normalizeSearchValue(searchTerms.schoolID),
      firstName: normalizeSearchValue(searchTerms.firstName),
      middleName: normalizeSearchValue(searchTerms.middleName),
      lastName: normalizeSearchValue(searchTerms.lastName),
      personalEmail: normalizeSearchValue(searchTerms.personalEmail),
      track: normalizeSearchValue(searchTerms.track),
      strand: normalizeSearchValue(searchTerms.strand),
      section: normalizeSearchValue(searchTerms.section),
      status: normalizeSearchValue(searchTerms.status)
    };

    const matchesSchoolID = !normalizedSearch.schoolID || normalizedRegistrant.schoolID.includes(normalizedSearch.schoolID);
    const matchesFirstName = !normalizedSearch.firstName || normalizedRegistrant.firstName.includes(normalizedSearch.firstName);
    const matchesMiddleName = !normalizedSearch.middleName || normalizedRegistrant.middleName.includes(normalizedSearch.middleName);
    const matchesLastName = !normalizedSearch.lastName || normalizedRegistrant.lastName.includes(normalizedSearch.lastName);
    const matchesPersonalEmail = !normalizedSearch.personalEmail || normalizedRegistrant.personalEmail.includes(normalizedSearch.personalEmail);
    const matchesTrack = !normalizedSearch.track || normalizedRegistrant.trackName.includes(normalizedSearch.track);
    const matchesStrand = !normalizedSearch.strand || normalizedRegistrant.strandName.includes(normalizedSearch.strand);
    const matchesSection = !normalizedSearch.section || normalizedRegistrant.sectionName.includes(normalizedSearch.section);
    const matchesStatus = normalizedSearch.status === '' || normalizedSearch.status === 'all' || normalizedRegistrant.status === normalizedSearch.status;

    return matchesSchoolID && matchesFirstName && matchesMiddleName && matchesLastName && matchesPersonalEmail && matchesTrack && matchesStrand && matchesSection && matchesStatus;
  });

  // Define tabs for status filtering
  const tabs = [
    { id: 'all', label: 'All', icon: null },
    { id: 'pending', label: 'Pending', icon: null },
    { id: 'approved', label: 'Approved', icon: null },
    { id: 'rejected', label: 'Rejected', icon: null },
  ];

  // Fetch registrants from backend with search functionality
  const fetchRegistrants = async () => {
    // Don't show loading spinner during search - only show on initial load
    if (!isSearching) {
      setLoading(true);
    }
    setError('');
    try {
      // Check if currently searching
      const isCurrentlySearching = searchTerms.schoolID || searchTerms.firstName || searchTerms.middleName || searchTerms.lastName || searchTerms.personalEmail || searchTerms.track || searchTerms.strand || searchTerms.section;
      
      const params = {
        page: isCurrentlySearching ? 1 : pagination.page,
        limit: isCurrentlySearching ? 10000 : pagination.limit // Fetch all when searching
      };
      
      if (selectedDate) params.date = selectedDate;
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/registrants`, { params, headers: { Authorization: `Bearer ${token}` } });
      setRegistrants(res.data?.data || []);
      if (res.data?.pagination && !isCurrentlySearching) {
        setPagination(res.data.pagination);
      } else if (isCurrentlySearching) {
        // When searching, update pagination to show we have all data
        setPagination(prev => ({ ...prev, totalPages: 1, page: 1, total: res.data?.data?.length || 0 }));
      }
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
          params: { page: 1, limit: pagination.limit, status: 'all' }, // Always fetch all on initial load
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
    fetchInitialData();
  }, []);

  // Create a ref to store the refresh function so it can be called from anywhere
  const refreshRegistrantsRef = useRef(null);
  
  // Listen for storage events to refresh when new registrants are created
  useEffect(() => {
    let lastCheckedTime = 0;
    let isRefreshing = false;
    
    const performRefresh = async () => {
      // Prevent multiple simultaneous refreshes
      if (isRefreshing) {
        return;
      }
      
      isRefreshing = true;
      
      try {
        // Clear all filters first
        setSearchTerms({
          schoolID: "",
          firstName: "",
          middleName: "",
          lastName: "",
          personalEmail: "",
          track: "",
          strand: "",
          section: "",
          status: "all"
        });
        setSelectedDate('');
        setStatusFilter('all');
        setActiveTab('all');
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
        
        // Wait a tiny bit for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force immediate refresh with fresh API call
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/registrants`, { 
          params: { page: 1, limit: 10, status: 'all' },
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        // Force update registrants state
        const fetchedRegistrants = res.data?.data || [];
        setRegistrants(fetchedRegistrants);
        
        // Force update pagination
        if (res.data?.pagination) {
          setPagination(res.data.pagination);
        } else {
          // If no pagination, create one
          setPagination({
            page: 1,
            limit: 10,
            total: fetchedRegistrants.length,
            totalPages: Math.ceil(fetchedRegistrants.length / 10)
          });
        }
        
        // Update the ref for polling
        if (fetchedRegistrants.length > 0) {
          lastFirstRegistrantIdRef.current = fetchedRegistrants[0]._id;
        }
      } catch (err) {
        console.error('Refresh error:', err);
        setError('Failed to refresh registrants');
      } finally {
        setLoading(false);
        isRefreshing = false;
      }
    };
    
    // Store the refresh function in ref so it can be called from polling
    refreshRegistrantsRef.current = performRefresh;
    
    const handleStorageChange = (e) => {
      if (e.key === 'newRegistrantCreated' || e.key === 'registrantUpdated') {
        performRefresh();
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (from same window)
    const handleCustomEvent = () => {
      performRefresh();
    };
    window.addEventListener('registrantCreated', handleCustomEvent);

    // Also listen for localStorage changes in the same window
    const handleLocalStorageChange = () => {
      const lastCreated = localStorage.getItem('newRegistrantCreated');
      if (lastCreated) {
        const lastCreatedTime = parseInt(lastCreated);
        const now = Date.now();
        // Only refresh if the event happened in the last 15 seconds and we haven't checked this timestamp yet
        if (now - lastCreatedTime < 15000 && lastCreatedTime > lastCheckedTime) {
          lastCheckedTime = lastCreatedTime;
          performRefresh();
        }
      }
    };

    // Check for new registrants every 500ms (very fast checking)
    const checkInterval = setInterval(() => {
      handleLocalStorageChange();
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('registrantCreated', handleCustomEvent);
      clearInterval(checkInterval);
      refreshRegistrantsRef.current = null;
    };
  }, []);

  // Track the first registrant ID to detect new registrants
  const lastFirstRegistrantIdRef = useRef(null);
  
  // Initialize with current first registrant
  useEffect(() => {
    if (registrants.length > 0 && !lastFirstRegistrantIdRef.current) {
      lastFirstRegistrantIdRef.current = registrants[0]?._id;
    }
  }, [registrants]);

  // Poll for new registrants every 2 seconds (very frequent for immediate updates)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only poll if not currently searching and on the first page with no filters
      if (!isSearching && pagination.page === 1 && statusFilter === 'all' && !selectedDate) {
        // Direct API call to ensure fresh data
        const token = localStorage.getItem("token");
        axios.get(`${API_BASE}/api/registrants`, { 
          params: { page: 1, limit: 10, status: 'all' },
          headers: { Authorization: `Bearer ${token}` } 
        }).then(res => {
          const newRegistrants = res.data?.data || [];
          const firstRegistrantId = newRegistrants[0]?._id;
          
          // Always update if first registrant changed (new one appeared at top) or if list is empty
          if (firstRegistrantId !== lastFirstRegistrantIdRef.current || registrants.length === 0) {
            if (firstRegistrantId !== lastFirstRegistrantIdRef.current && lastFirstRegistrantIdRef.current !== null) {
              // Also trigger the refresh function to ensure everything is updated
              if (refreshRegistrantsRef.current) {
                refreshRegistrantsRef.current();
              }
            } else {
              // Just update the list if it's different
              lastFirstRegistrantIdRef.current = firstRegistrantId;
              setRegistrants(newRegistrants);
              if (res.data?.pagination) {
                setPagination(res.data.pagination);
              }
            }
          }
        }).catch(err => {
          console.error('Polling error:', err);
        });
      }
    }, 2000); // Poll every 2 seconds for very fast updates

    return () => clearInterval(interval);
  }, [isSearching, pagination.page, statusFilter, selectedDate]);

  useEffect(() => {
    // Reset to first page when switching tabs to get correct pagination per status
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [activeTab]);

  useEffect(() => {
    fetchRegistrants();
  }, [selectedDate, statusFilter, pagination.page, pagination.limit, searchTerms.schoolID, searchTerms.firstName, searchTerms.middleName, searchTerms.lastName, searchTerms.personalEmail, searchTerms.track, searchTerms.strand, searchTerms.section, searchTerms.status]);

  // Update statusFilter when activeTab changes
  useEffect(() => {
    setStatusFilter(activeTab);
  }, [activeTab]);

  // Fetch student assignments for the active term to validate registrants
  useEffect(() => {
    async function fetchStudentAssignments() {
      if (!currentTerm) {
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/student-assignments`, {
          params: { termId: currentTerm._id },
          headers: { Authorization: `Bearer ${token}` }
        });
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
        // Filter to only get students
        const studentUsers = (res.data || []).filter(user => user.role === 'students');
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
    
    // Try multiple matching strategies
    const matched = studentAssignments.find(a => {
      // Get all possible school ID fields
      let assignmentSchoolId = (a.schoolID || a.studentSchoolID || a.schoolID || '').trim();
      
      // If no school ID in assignment, try to get it from the linked student record
      if (!assignmentSchoolId && a.studentId) {
        const linkedStudent = students.find(s => s._id === a.studentId);
        if (linkedStudent) {
          assignmentSchoolId = (linkedStudent.schoolID || '').trim();
        }
      }
      
      // Get all possible name fields and normalize them
      const assignmentFullName = (a.studentName || '').trim().toLowerCase();
      const assignmentFirstName = (a.firstname || a.firstName || '').trim().toLowerCase();
      const assignmentLastName = (a.lastname || a.lastName || '').trim().toLowerCase();
      const assignmentNormalizedName = normalizeName(assignmentFirstName, '', assignmentLastName);
      
      // Check school ID match first
      const schoolIdMatch = assignmentSchoolId === registrantSchoolId;
      
      if (!schoolIdMatch) {
        return false;
      }
      
      // If school ID matches, check name matches
      const nameMatch = assignmentFullName === registrantName || 
                       assignmentNormalizedName === registrantName ||
                       (assignmentFirstName === r.firstName?.toLowerCase() && 
                        assignmentLastName === r.lastName?.toLowerCase());
      
      return nameMatch;
    });
    
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
        
        return assignmentSchoolId === registrantSchoolId;
      });
      return !!schoolIdMatch;
    }
    
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

  // Filter registrants based on status (for tabs) and then apply search filtering
  const getFilteredRegistrants = () => {
    let filtered = registrants;
    if (statusFilter !== 'all') {
      filtered = registrants.filter(registrant => registrant.status === statusFilter);
    }
    return filtered;
  };

  const filteredRegistrants = displayedRegistrants; // Use search-filtered results

  // Reset filters
  const resetFilters = () => {
    setSelectedDate('');
    setStatusFilter('all');
    setActiveTab('all');
    setSearchTerms({
      schoolID: "",
      firstName: "",
      middleName: "",
      lastName: "",
      personalEmail: "",
      track: "",
      strand: "",
      section: "",
      status: "all"
    });
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
        
        {/* Registrants section with tabs and controls */}
        <div className="mt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
            <h4 className="text-xl md:text-2xl font-semibold">Registrants</h4>
            <div className="flex gap-2">
              <button
                onClick={handleExportClick}
                className="bg-[#00418B] hover:bg-[#003166] text-white px-4 py-2 rounded transition"
              >
                Export
              </button>
              <button 
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition" 
                onClick={async () => {
                  // Reset to first page and refresh
                  setSearchTerms({
                    schoolID: "",
                    firstName: "",
                    middleName: "",
                    lastName: "",
                    personalEmail: "",
                    track: "",
                    strand: "",
                    section: "",
                    status: "all"
                  });
                  setSelectedDate('');
                  setStatusFilter('all');
                  setActiveTab('all');
                  setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
                  
                  // Force immediate refresh with fresh params
                  try {
                    setLoading(true);
                    const token = localStorage.getItem("token");
                    const res = await axios.get(`${API_BASE}/api/registrants`, { 
                      params: { page: 1, limit: 10, status: 'all' },
                      headers: { Authorization: `Bearer ${token}` } 
                    });
                    setRegistrants(res.data?.data || []);
                    if (res.data?.pagination) {
                      setPagination(res.data.pagination);
                    }
                  } catch (err) {
                    console.error('Manual refresh error:', err);
                    setError('Failed to refresh registrants');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-[#00418B]">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-[#00418B] rounded px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
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
            {isSearching ? (
              <span>Showing {displayedRegistrants.length} result{displayedRegistrants.length !== 1 ? 's' : ''} across all pages</span>
            ) : (
              <span>Showing {registrants.length} of {pagination.total} registrants | Page {pagination.page} of {pagination.totalPages}</span>
            )}
            {activeTab !== 'all' && (
              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2 text-xs">
                Status: {tabs.find(t => t.id === activeTab)?.label}
              </span>
            )}
            {selectedDate && (
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded ml-2 text-xs">
                Date: {selectedDate}
              </span>
            )}
          </div>
        
          {loading && !registrants.length ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="bg-white p-4 rounded-xl shadow mb-4 border-2 border-[#00418B]">
              {/* Tabs for status (inside the table card) - Mini Navigation Header */}
              <div className="border-b border-[#00418B] mb-4">
                <div className="flex overflow-x-auto">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 text-sm font-medium whitespace-nowrap flex items-center ${
                        activeTab === tab.id 
                          ? 'border-b-2 border-[#00418B] text-[#00418B]' 
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <table className="min-w-full bg-white border-2 border-[#00418B] rounded-lg text-sm table-fixed overflow-visible">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">School ID</th>
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">Track</th>
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">Strand</th>
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">Section</th>
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">Validation</th>
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">First Name</th>
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">Middle Name</th>
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">Last Name</th>
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">Personal Email</th>
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">Date</th>
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">Status</th>
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">Rejection History</th>
                    <th className="p-3 border-b border-[#00418B] font-semibold text-gray-700 whitespace-nowrap">Actions</th>
                  </tr>
                  {/* New row for search inputs */}
                  <tr className="bg-white text-left">
                    <th className="p-2 border-b border-[#00418B] font-normal">
                      <input type="text" placeholder="Search School ID" className="w-full border border-[#00418B] rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, schoolID: e.target.value }))} value={searchTerms.schoolID} />
                    </th>
                    <th className="p-2 border-b border-[#00418B] font-normal">
                      <input type="text" placeholder="Search Track" className="w-full border border-[#00418B] rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, track: e.target.value }))} value={searchTerms.track} />
                    </th>
                    <th className="p-2 border-b border-[#00418B] font-normal">
                      <input type="text" placeholder="Search Strand" className="w-full border border-[#00418B] rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, strand: e.target.value }))} value={searchTerms.strand} />
                    </th>
                    <th className="p-2 border-b border-[#00418B] font-normal">
                      <input type="text" placeholder="Search Section" className="w-full border border-[#00418B] rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, section: e.target.value }))} value={searchTerms.section} />
                    </th>
                    <th className="p-2 border-b border-[#00418B] font-normal"></th>
                    <th className="p-2 border-b border-[#00418B] font-normal">
                      <input type="text" placeholder="Search First Name" className="w-full border border-[#00418B] rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, firstName: e.target.value }))} value={searchTerms.firstName} />
                    </th>
                    <th className="p-2 border-b border-[#00418B] font-normal">
                      <input type="text" placeholder="Search Middle Name" className="w-full border border-[#00418B] rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, middleName: e.target.value }))} value={searchTerms.middleName} />
                    </th>
                    <th className="p-2 border-b border-[#00418B] font-normal">
                      <input type="text" placeholder="Search Last Name" className="w-full border border-[#00418B] rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, lastName: e.target.value }))} value={searchTerms.lastName} />
                    </th>
                    <th className="p-2 border-b border-[#00418B] font-normal">
                      <input type="text" placeholder="Search Personal Email" className="w-full border border-[#00418B] rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, personalEmail: e.target.value }))} value={searchTerms.personalEmail} />
                    </th>
                    <th className="p-2 border-b border-[#00418B] font-normal">
                      <input type="text" placeholder="Search Date" className="w-full border border-[#00418B] rounded px-2 py-1 text-sm" />
                    </th>
                    <th className="p-2 border-b border-[#00418B] font-normal">
                      <select 
                        className="w-full border border-[#00418B] rounded px-2 py-1 text-sm"
                        value={searchTerms.status}
                        onChange={(e) => setSearchTerms((prev) => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </th>
                    <th className="p-2 border-b border-[#00418B] font-normal"></th>
                    <th className="p-2 border-b border-[#00418B] font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrants.length === 0 ? (
                    <tr>
                      <td colSpan="13" className="text-center p-4 text-gray-500">
                        No registrants found.
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrants.map((r, idx) => (
                      <tr key={r._id} className={idx % 2 === 0 ? "bg-white hover:bg-gray-50 transition" : "bg-gray-50 hover:bg-gray-100 transition"}>
                        <td className="p-3 border-b border-[#00418B]">{formatSchoolId(r.schoolID)}</td>
                        <td className="p-3 border-b border-[#00418B]">{r.trackName || '-'}</td>
                        <td className="p-3 border-b border-[#00418B]">{r.strandName || '-'}</td>
                        <td className="p-3 border-b border-[#00418B]">{r.sectionName || '-'}</td>
                        <td className="p-3 border-b border-[#00418B]">
                          {validateAgainstAssignments(r) ? (
                            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Student is enrolled</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Student not enrolled</span>
                          )}
                        </td>
                        <td className="p-3 border-b border-[#00418B]">{r.firstName}</td>
                        <td className="p-3 border-b border-[#00418B]">{r.middleName}</td>
                        <td className="p-3 border-b border-[#00418B]">{r.lastName}</td>
                        <td className="p-3 border-b border-[#00418B]">
                          <div className="flex flex-col">
                            <span>{maskEmail(r.personalEmail)}</span>
                            {r.processedAt && r.status === 'pending' && (
                              <span className="text-xs text-blue-600 font-medium">Re-registration</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 border-b border-[#00418B]">
                          <div className="flex flex-col">
                            <span>{r.registrationDate ? r.registrationDate.slice(0, 10) : ''}</span>
                            {r.processedAt && r.status === 'pending' && (
                              <span className="text-xs text-gray-500">
                                Previously: {new Date(r.processedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 border-b border-[#00418B]">
                          <div className="flex flex-col">
                            <span className={`inline-block w-auto max-w-fit px-2 py-0.5 rounded text-xs font-semibold
                              ${ r.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                                r.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-300' :
                                r.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-300' :
                                'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                              {r.status}
                            </span>
                            {r.processedAt && r.status === 'pending' && (
                              <span className="text-xs text-blue-600 mt-1">Updated</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 border-b border-[#00418B]">
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
                        <td className="p-3 border-b border-[#00418B]">
                          <div className="inline-flex space-x-2">
                            {r.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(r._id)}
                                  className="bg-green-200 hover:bg-green-300 p-2.5 rounded-md transition-colors shadow-sm"
                                  disabled={actionLoading === r._id}
                                  title="Approve"
                                >
                                  {/* Heroicons Check Circle */}
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-black">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleReject(r._id)}
                                  className="bg-red-200 hover:bg-red-300 p-2.5 rounded-md transition-colors shadow-sm"
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
          )}
        </div>
        
        {/* Pagination Controls */}
        {!loading && !isSearching && pagination.totalPages > 1 && (
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