import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";


export default function Admin_AcademicSettings() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingYear, setEditingYear] = useState(null);


  const [schoolYears, setSchoolYears] = useState([]);
  const [showView, setShowView] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showViewModal, setShowViewModal] = useState(false);
  const [terms, setTerms] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [showAddTermModal, setShowAddTermModal] = useState(false);
  const [showAddQuarterModal, setShowAddQuarterModal] = useState(false);
  const [termFormData, setTermFormData] = useState({
    startDate: '',
    endDate: ''
  });
  const [quarterFormData, setQuarterFormData] = useState({
    quarterName: '',
    termName: '',
    startDate: '',
    endDate: ''
  });
  const [availableQuarters, setAvailableQuarters] = useState([]);
  const [termError, setTermError] = useState('');
  const [quarterError, setQuarterError] = useState('');
  const navigate = useNavigate();
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [archivedCounts, setArchivedCounts] = useState({});

  const [showActivateModal, setShowActivateModal] = useState(false);
  const [pendingSchoolYear, setPendingSchoolYear] = useState(null);
  const [showTermActivationPrompt, setShowTermActivationPrompt] = useState(false);
  const [promptTerms, setPromptTerms] = useState([]);
  const [promptSchoolYear, setPromptSchoolYear] = useState(null);
  const [selectedPromptTerm, setSelectedPromptTerm] = useState("");
  
  // Status toggle confirmation modal state
  const [showStatusToggleModal, setShowStatusToggleModal] = useState(false);
  const [pendingStatusToggle, setPendingStatusToggle] = useState(null);
  
  // Term editing states
  const [showEditTermModal, setShowEditTermModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [editTermFormData, setEditTermFormData] = useState({
    startDate: '',
    endDate: ''
  });
  const [editTermError, setEditTermError] = useState('');

  // Delete warning modal states
  const [showDeleteWarningModal, setShowDeleteWarningModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteWarningMessage, setDeleteWarningMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Success/Error modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const [formData, setFormData] = useState({
    schoolYearStart: "",
    status: "inactive"
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for validation results modal (commented out for now)
  // const [validationModalOpen, setValidationModalOpen] = useState(false);
  // const [validationResults, setValidationResults] = useState({
  //   schoolYears: { valid: 0, invalid: 0, details: [] },
  //   terms: { valid: 0, invalid: 0, details: [] }
  // });

  // Fetch school years on mount
  useEffect(() => {
      fetchSchoolYears();
  }, []);

  // Fetch terms and quarters when a school year is selected
  useEffect(() => {
    if (selectedYear) {
      fetchTerms(selectedYear);
      fetchQuarters(selectedYear);
    }
  }, [selectedYear]);

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
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
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

  const fetchSchoolYears = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/schoolyears`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        const activeYears = data.filter(year => year.status === 'active');
        setSchoolYears(activeYears);
        computeArchivedCountsForYears(activeYears);
      } else {
        setErrorMessage("Failed to fetch school years");
        setShowErrorModal(true);
      }
    } catch {
      setErrorMessage("Error fetching school years");
      setShowErrorModal(true);
    }
  };

  const fetchTerms = async (year) => {
    try {
      const schoolYearName = `${year.schoolYearStart}-${year.schoolYearEnd}`;
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTerms(data);
      } else {
        const data = await res.json();
        console.error('Failed to fetch terms:', data.message);
      }
    } catch (err) {
      console.error('Error fetching terms:', err);
    }
  };

  const fetchQuarters = async (year) => {
    try {
      const schoolYearName = `${year.schoolYearStart}-${year.schoolYearEnd}`;
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/quarters/schoolyear/${schoolYearName}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setQuarters(data);
      } else {
        const data = await res.json();
        console.error('Failed to fetch quarters:', data.message);
      }
    } catch (err) {
      console.error('Error fetching quarters:', err);
    }
  };

  // Compute archived term counts per school year for consistent display
  const computeArchivedCountsForYears = async (years) => {
    try {
      const token = localStorage.getItem('token');
      const entries = await Promise.all(
        years.map(async (y) => {
          const name = `${y.schoolYearStart}-${y.schoolYearEnd}`;
          try {
            const res = await fetch(`${API_BASE}/api/terms/schoolyear/${name}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const list = await res.json();
              const count = list.filter(t => t.status === 'archived').length;
              return [name, count];
            }
          } catch (error) {
            console.error('Error fetching terms for archived count:', error);
          }
          return [name, 0];
        })
      );
      setArchivedCounts(Object.fromEntries(entries));
    } catch (error) {
      console.error('Error computing archived counts:', error);
    }
  };

  // Refresh archived count for a single school year
  const refreshArchivedCountForYear = async (year) => {
    if (!year) return;
    const name = `${year.schoolYearStart}-${year.schoolYearEnd}`;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/terms/schoolyear/${name}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        const count = list.filter(t => t.status === 'archived').length;
        setArchivedCounts(prev => ({ ...prev, [name]: count }));
      }
    } catch (error) {
      console.error('Error refreshing archived count:', error);
    }
  };

  const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (checked ? 'active' : 'inactive') : value
      }));
    };

    const createSchoolYear = async (startYear, setAsActive) => {
    try {
      console.info('[AcademicSettings] createSchoolYear(): start', { startYear, setAsActive });
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/schoolyears`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          schoolYearStart: startYear,
          setAsActive
        })
      });

      if (res.ok) {
        const data = await res.json();
        console.info('[AcademicSettings] createSchoolYear(): success', { id: data?._id, start: data?.schoolYearStart, end: data?.schoolYearEnd, status: data?.status });

        // Audit logging handled by backend; no client-side POST to avoid duplicates
        setSuccessMessage("School year created successfully");
        setShowSuccessModal(true);
        setFormData({ schoolYearStart: "", status: "inactive" });
        fetchSchoolYears();
        setShowActivateModal(false);
        setShowCreateModal(false);
        setIsEditMode(false);
        setEditingYear(null);
      } else {
        const data = await res.json();
        console.warn('[AcademicSettings] createSchoolYear(): failed', { status: res.status, message: data?.message });
        setErrorMessage(data.message || "Failed to create school year");
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('[AcademicSettings] createSchoolYear(): error', error);
      setErrorMessage("Error creating school year");
      setShowErrorModal(true);
    }
  };

  // Internal edit submission function (called after confirmation)
  const handleEditSubmitInternal = async () => {
    try {
      console.log('Sending edit request:', {
        schoolYearStart: parseInt(formData.schoolYearStart),
        status: formData.status
      });
      const res = await fetch(`${API_BASE}/api/schoolyears/${editingYear._id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          schoolYearStart: parseInt(formData.schoolYearStart),
          status: formData.status
        })
      });

      if (res.ok) {
        console.log('Edit successful');
        setSuccessMessage("School year updated successfully");
        setShowSuccessModal(true);
        fetchSchoolYears(); // Refresh from database
        setIsEditMode(false);
        setEditingYear(null);
        setFormData({ schoolYearStart: "", status: "inactive" });
        setShowCreateModal(false); // Close the modal
      } else {
        const data = await res.json();
        console.log('Edit failed:', data);
        setErrorMessage(data.message || "Failed to update school year");
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error updating school year:', error);
      setErrorMessage("Error updating school year");
      setShowErrorModal(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    console.info('[AcademicSettings] Submit school year form');

    if (!formData.schoolYearStart) {
      setErrorMessage("Please enter a school year start");
      setShowErrorModal(true);
      return;
    }

    const startYear = parseInt(formData.schoolYearStart);
    if (startYear < 1900 || startYear > 2100) {
      setErrorMessage("School year must be between 1900 and 2100");
      setShowErrorModal(true);
      return;
    }

    const yearExists = schoolYears.some(year =>
      year.schoolYearStart === startYear &&
      year.status !== 'archived' &&
      (!isEditMode || year._id !== editingYear?._id)
    );

    if (yearExists) {
      setErrorMessage("This school year already exists");
      setShowErrorModal(true);
      return;
    }

    // ✏️ Edit Mode
    if (isEditMode) {
      const hasChanges =
        formData.schoolYearStart !== editingYear.schoolYearStart.toString() ||
        formData.status !== editingYear.status;

      if (!hasChanges) {
        setErrorMessage("No changes were made to the school year.");
        setShowErrorModal(true);
        return;
      }

      // Show confirmation modal
      setConfirmMessage("Save changes to this school year?");
      setConfirmAction(() => () => {
        // This will be executed when confirmed
        handleEditSubmitInternal();
      });
      setShowConfirmModal(true);
      return;
    }

    // ➕ Create Mode
    const activeYearExists = schoolYears.some(year => year.status === 'active');
    if (activeYearExists) {
      // Show modal asking if the user wants to activate this new year
      setPendingSchoolYear({
        schoolYearStart: startYear,
        schoolYearEnd: startYear + 1
      });
      setShowActivateModal(true);
      return;
    }

    // If no active year, proceed immediately
    console.info('[AcademicSettings] Creating new school year', { startYear, setAsActive: true });
    createSchoolYear(startYear, true);
  };

  const handleEdit = (year) => {
         // Prevent editing inactive school years
     if (year.status === 'inactive') {
       setErrorMessage('Cannot edit inactive school years. Only status changes are allowed.');
       setShowErrorModal(true);
       return;
     }
    
    console.log('Edit clicked for year:', year);
    setIsEditMode(true);
    setEditingYear(year);
    setFormData({
      schoolYearStart: year.schoolYearStart.toString(),
      status: year.status
    });
    console.log('Form data set to:', {
      schoolYearStart: year.schoolYearStart.toString(),
      status: year.status
    });
  };

  const handleView = (year) => {
    setSelectedYear(year);
    setShowViewModal(true);
  };

  const handleViewTerm = (term) => {
    navigate(`/admin/academic-settings/terms/${term._id}`, { state: { term } });
  };

  const handleViewQuarter = (quarter) => {
    navigate(`/admin/academic-settings/quarters/${quarter._id}`, { 
      state: { 
        quarter,
        schoolYear: selectedYear,
        quarterName: quarter.quarterName
      } 
    });
  };

  const handleBack = () => {
    setShowView(false);
    setSelectedYear(null);
  };

  const handleArchiveTerm = async (term) => {
         // Prevent archiving terms of inactive school years
     if (selectedYear && selectedYear.status !== 'active') {
       setErrorMessage('Cannot archive terms of inactive school years. Only terms of active school years can be archived.');
       setShowErrorModal(true);
       return;
     }
    
         // Show confirmation modal
     setConfirmMessage(`Are you sure you want to archive ${term.termName}?`);
     setConfirmAction(() => () => {
       handleArchiveTermInternal(term);
     });
     setShowConfirmModal(true);
   };

   const handleArchiveTermInternal = async (term) => {
     try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/terms/${term._id}/archive`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

                 if (res.ok) {
           const updatedTerm = await res.json();
           setTerms(terms.map(t => t._id === term._id ? updatedTerm : t));
           setSuccessMessage(`${term.termName} has been archived`);
           setShowSuccessModal(true);
           fetchTerms(selectedYear);
           refreshArchivedCountForYear(selectedYear);
         } else {
          const data = await res.json();
          setTermError(data.message || 'Failed to archive term');
        }
      } catch {
        setTermError('Error archiving term');
      }
  };

  const handleActivateTerm = async (term) => {
         // Prevent activating terms of inactive school years
     if (selectedYear && selectedYear.status !== 'active') {
       setErrorMessage('Cannot activate terms of inactive school years. Please activate the school year first.');
       setShowErrorModal(true);
       return;
     }
    
         // Show confirmation modal
     setConfirmMessage(`Are you sure you want to activate ${term.termName}?`);
     setConfirmAction(() => () => {
       handleActivateTermInternal(term);
     });
     setShowConfirmModal(true);
   };

   const handleActivateTermInternal = async (term) => {
     try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/terms/${term._id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'active' })
      });
             if (res.ok) {
         const updatedTerm = await res.json();
         setTerms(terms.map(t => t._id === term._id ? updatedTerm : t));
         setSuccessMessage(`${term.termName} has been activated`);
         setShowSuccessModal(true);
         fetchTerms(selectedYear);
         refreshArchivedCountForYear(selectedYear);
       } else {
        const data = await res.json();
        setTermError(data.message || 'Failed to activate term');
      }
    } catch {
      setTermError('Error activating term');
    }
  };


  const handleToggleStatus = async (year) => {
    const newStatus = year.status === 'active' ? 'inactive' : 'active';
    
    // Set pending status toggle and show confirmation modal
    setPendingStatusToggle({ year, newStatus });
    setShowStatusToggleModal(true);
  };

  // Handle the actual status toggle after confirmation
  const handleConfirmStatusToggle = async () => {
    if (!pendingStatusToggle) return;
    
    const { year, newStatus } = pendingStatusToggle;
    
    try {
      const res = await fetch(`${API_BASE}/api/schoolyears/${year._id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        // If activating, check for terms in the response
        if (newStatus === 'active') {
          const data = await res.json();
          if (data.terms && data.terms.length > 0) {
            setPromptTerms(data.terms);
            setPromptSchoolYear(data.schoolYear);
            setShowTermActivationPrompt(true);
            setShowStatusToggleModal(false);
            setPendingStatusToggle(null);
            return; // Wait for admin to choose
          }
                 } else {
           // If deactivating, refresh terms to show archived status
           if (selectedYear && selectedYear._id === year._id) {
             fetchTerms(selectedYear);
           }
           fetchSchoolYears();
           setSuccessMessage(`School year set as ${newStatus}`);
           setShowSuccessModal(true);
         }
        // If no terms or not activating, just refresh
        fetchSchoolYears();
      } else {
        const data = await res.json();
        setErrorMessage(data.message || 'Failed to update school year status');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error updating school year status:', error);
      setErrorMessage('Error updating school year status');
      setShowErrorModal(true);
    }
    
    // Close modal and clear pending toggle
    setShowStatusToggleModal(false);
    setPendingStatusToggle(null);
  };

  // Handler for activating a term from the prompt
  const handleActivatePromptTerm = async () => {
    if (!selectedPromptTerm) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/terms/${selectedPromptTerm}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'active' })
      });
             setShowTermActivationPrompt(false);
       setPromptTerms([]);
       setPromptSchoolYear(null);
       setSelectedPromptTerm("");
       fetchSchoolYears();
       setSuccessMessage('Term activated successfully.');
       setShowSuccessModal(true);
     } catch (error) {
       console.error('Error activating term:', error);
       setErrorMessage('Failed to activate term.');
       setShowErrorModal(true);
     }
  };

  // Handler for keeping all terms inactive
  const handleKeepTermsInactive = () => {
    setShowTermActivationPrompt(false);
    setPromptTerms([]);
    setPromptSchoolYear(null);
    setSelectedPromptTerm("");
    fetchSchoolYears();
    setSuccessMessage('School year activated. All terms remain inactive.');
    setShowSuccessModal(true);
  };

  // Handler for adding school year as inactive
  const handleAddSchoolYearInactive = async () => {
    if (!pendingSchoolYear) return;
    try {
      await createSchoolYear(pendingSchoolYear.schoolYearStart, false); // false = not active
      setShowActivateModal(false);
      setPendingSchoolYear(null);
      setSuccessMessage('School year added as inactive.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error adding school year as inactive:', error);
      setErrorMessage('Failed to add school year as inactive.');
      setShowErrorModal(true);
    }
  };

  // Term editing functions
  const handleEditTerm = (term) => {
    // Prevent editing terms of inactive school years
    if (selectedYear && selectedYear.status !== 'active') {
      setErrorMessage('Cannot edit terms of inactive school years. Only status changes are allowed.');
      setShowErrorModal(true);
      return;
    }
    
    setEditingTerm(term);
    setEditTermFormData({
      startDate: term.startDate.split('T')[0], // Convert to YYYY-MM-DD format
      endDate: term.endDate.split('T')[0]
    });
    setEditTermError('');
    setShowEditTermModal(true);
  };

  const handleEditTermSubmit = async (e) => {
    e.preventDefault();
    setEditTermError('');

    if (!editTermFormData.startDate || !editTermFormData.endDate) {
      setEditTermError('Please fill in all fields');
      return;
    }

    // Validate term dates are within school year bounds
    if (selectedYear) {
      const schoolYearStart = selectedYear.schoolYearStart;
      const schoolYearEnd = selectedYear.schoolYearEnd;
      const startDate = new Date(editTermFormData.startDate);
      const endDate = new Date(editTermFormData.endDate);
      const minDate = new Date(`${schoolYearStart}-01-01`);
      const maxDate = new Date(`${schoolYearEnd}-12-31`);
      if (startDate < minDate || startDate > maxDate || endDate < minDate || endDate > maxDate) {
        setEditTermError(`Term dates must be within the school year bounds (${schoolYearStart} to ${schoolYearEnd}).`);
        return;
      }
    }

    if (new Date(editTermFormData.endDate) <= new Date(editTermFormData.startDate)) {
      setEditTermError('End date must be after start date');
      return;
    }

    // Check for overlapping terms in the same school year
    const overlappingTerms = terms.filter(t => 
      t._id !== editingTerm._id && // Exclude current term being edited
      t.status !== 'archived' && // Only check active/inactive terms
      (
        // New term starts during an existing term
        (new Date(t.startDate) <= new Date(editTermFormData.startDate) && 
         new Date(t.endDate) > new Date(editTermFormData.startDate)) ||
        // New term ends during an existing term
        (new Date(t.startDate) < new Date(editTermFormData.endDate) && 
         new Date(t.endDate) >= new Date(editTermFormData.endDate)) ||
        // New term completely contains an existing term
        (new Date(t.startDate) >= new Date(editTermFormData.startDate) && 
         new Date(t.endDate) <= new Date(editTermFormData.endDate))
      )
    );

    if (overlappingTerms.length > 0) {
      const overlappingTermNames = overlappingTerms.map(t => t.termName).join(', ');
      setEditTermError(`Term dates overlap with existing terms: ${overlappingTermNames}. Please choose different dates.`);
      return;
    }

    try {
      console.log('Sending term update:', {
        startDate: editTermFormData.startDate,
        endDate: editTermFormData.endDate
      });
      const res = await fetch(`${API_BASE}/api/terms/${editingTerm._id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: editTermFormData.startDate,
          endDate: editTermFormData.endDate
        })
      });

      if (res.ok) {
        const updatedTerm = await res.json();
        console.log('Term updated successfully:', updatedTerm);
        setTerms(terms.map(t => t._id === editingTerm._id ? updatedTerm : t));
        setShowEditTermModal(false);
        setEditingTerm(null);
        setEditTermFormData({ startDate: '', endDate: '' });
        setSuccessMessage('Term updated successfully');
        setShowSuccessModal(true);
        fetchTerms(selectedYear);
      } else {
        const data = await res.json();
        console.log('Term update failed:', data);
        setEditTermError(data.message || 'Failed to update term');
      }
    } catch (error) {
      console.log('Term update error:', error);
      setEditTermError('Error updating term');
    }
  };

  const handleToggleTermStatus = async (term) => {
    const newStatus = term.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
         // Show confirmation modal
     setConfirmMessage(`Are you sure you want to ${action} ${term.termName}?`);
     setConfirmAction(() => {
       handleToggleTermStatusInternal(term, newStatus, action);
     });
     setShowConfirmModal(true);
   };

   const handleToggleTermStatusInternal = async (term, newStatus, action) => {
     try {
      console.log('Sending status update:', { status: newStatus });
      const res = await fetch(`${API_BASE}/api/terms/${term._id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        const updatedTerm = await res.json();
        console.log('Status updated successfully:', updatedTerm);
        setTerms(terms.map(t => t._id === term._id ? updatedTerm : t));
        
        // Update success message to reflect that inactive terms are now archived
        const successMessage = newStatus === 'active' ? 
          `${term.termName} has been activated` : 
          `${term.termName} has been archived`;
        setSuccessMessage(successMessage);
        setShowSuccessModal(true);
        
        fetchTerms(selectedYear);
        refreshArchivedCountForYear(selectedYear);
      } else {
        const data = await res.json();
        console.log('Status update failed:', data);
        setTermError(data.message || `Failed to ${action} term`);
      }
    } catch (error) {
      console.log('Status update error:', error);
      setTermError(`Error ${action}ing term`);
    }
  };

  // Quarter handler functions
  const handleToggleQuarterStatus = async (quarter) => {
    const newStatus = quarter.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    // Show confirmation modal
    setConfirmMessage(`Are you sure you want to ${action} ${quarter.quarterName}?`);
    setConfirmAction(() => {
      handleToggleQuarterStatusInternal(quarter, newStatus, action);
    });
    setShowConfirmModal(true);
  };

  const handleToggleQuarterStatusInternal = async (quarter, newStatus, action) => {
    try {
      console.log('Sending quarter status update:', { status: newStatus });
      const res = await fetch(`${API_BASE}/api/quarters/${quarter._id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        const updatedQuarter = await res.json();
        console.log('Quarter status updated successfully:', updatedQuarter);
        setQuarters(quarters.map(q => q._id === quarter._id ? updatedQuarter : q));
        
        // Update success message to reflect that inactive quarters are now archived
        const successMessage = newStatus === 'active' ? 
          `${quarter.quarterName} has been activated` : 
          `${quarter.quarterName} has been archived`;
        setSuccessMessage(successMessage);
        setShowSuccessModal(true);
        
        fetchQuarters(selectedYear);
      } else {
        const data = await res.json();
        console.log('Quarter status update failed:', data);
        setTermError(data.message || `Failed to ${action} quarter`);
      }
    } catch (error) {
      console.log('Quarter status update error:', error);
      setTermError(`Error ${action}ing quarter`);
    }
  };

  const handleEditQuarter = (quarter) => {
    // Prevent editing quarters of inactive school years
    if (selectedYear && selectedYear.status !== 'active') {
      setErrorMessage('Cannot edit quarters of inactive school years. Only status changes are allowed.');
      setShowErrorModal(true);
      return;
    }
    
    setEditingTerm(quarter);
    setEditTermFormData({
      startDate: quarter.startDate.split('T')[0], // Convert to YYYY-MM-DD format
      endDate: quarter.endDate.split('T')[0]
    });
    setEditTermError('');
    setShowEditTermModal(true);
  };

  const handleActivateQuarter = async (quarter) => {
    // Prevent activating quarters of inactive school years
    if (selectedYear && selectedYear.status !== 'active') {
      setErrorMessage('Cannot activate quarters of inactive school years. Please activate the school year first.');
      setShowErrorModal(true);
      return;
    }
    
    // Show confirmation modal
    setConfirmMessage(`Are you sure you want to activate ${quarter.quarterName}?`);
    setConfirmAction(() => () => {
      handleActivateQuarterInternal(quarter);
    });
    setShowConfirmModal(true);
  };

  const handleActivateQuarterInternal = async (quarter) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/quarters/${quarter._id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'active' })
      });
      if (res.ok) {
        const updatedQuarter = await res.json();
        setQuarters(quarters.map(q => q._id === quarter._id ? updatedQuarter : q));
        setSuccessMessage(`${quarter.quarterName} has been activated`);
        setShowSuccessModal(true);
        fetchQuarters(selectedYear);
      } else {
        const data = await res.json();
        setTermError(data.message || 'Failed to activate quarter');
      }
    } catch {
      setTermError('Error activating quarter');
    }
  };

  const handleArchiveQuarter = async (quarter) => {
    // Prevent archiving quarters of inactive school years
    if (selectedYear && selectedYear.status !== 'active') {
      setErrorMessage('Cannot archive quarters of inactive school years. Only quarters of active school years can be archived.');
      setShowErrorModal(true);
      return;
    }
    
    // Show confirmation modal
    setConfirmMessage(`Are you sure you want to archive ${quarter.quarterName}?`);
    setConfirmAction(() => () => {
      handleArchiveQuarterInternal(quarter);
    });
    setShowConfirmModal(true);
  };

  const handleArchiveQuarterInternal = async (quarter) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/quarters/${quarter._id}/archive`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const updatedQuarter = await res.json();
        setQuarters(quarters.map(q => q._id === quarter._id ? updatedQuarter : q));
        setSuccessMessage(`${quarter.quarterName} has been archived`);
        setShowSuccessModal(true);
        fetchQuarters(selectedYear);
      } else {
        const data = await res.json();
        setTermError(data.message || 'Failed to archive quarter');
      }
    } catch {
      setTermError('Error archiving quarter');
    }
  };

  // Add Term handler
  const handleAddTerm = async (e) => {
    e.preventDefault();
    setTermError('');

    // Limit to 2 total terms per school year
    const totalTermsCount = terms.length;
    if (totalTermsCount >= 2) {
      setTermError('This school year already has 2 terms. You cannot add another.');
      return;
    }

    // Prevent adding terms to inactive school years
    if (selectedYear && selectedYear.status !== 'active') {
      setTermError('Cannot add terms to inactive school years. Please activate the school year first.');
      return;
    }

    if (!termFormData.startDate || !termFormData.endDate) {
      setTermError('Please fill in all fields');
      return;
    }

    // Validate term dates are within school year bounds
    if (selectedYear) {
      const schoolYearStart = selectedYear.schoolYearStart;
      const schoolYearEnd = selectedYear.schoolYearEnd;
      const startDate = new Date(termFormData.startDate);
      const endDate = new Date(termFormData.endDate);
      const minDate = new Date(`${schoolYearStart}-01-01`);
      const maxDate = new Date(`${schoolYearEnd}-12-31`);
      if (startDate < minDate || startDate > maxDate || endDate < minDate || endDate > maxDate) {
        setTermError(`Term dates must be within the school year bounds (${schoolYearStart} to ${schoolYearEnd}).`);
        return;
      }
    }

    if (new Date(termFormData.endDate) <= new Date(termFormData.startDate)) {
      setTermError('End date must be after start date');
      return;
    }

    // Check for overlapping terms in the same school year
    const overlappingTerms = terms.filter(t => 
      t.status !== 'archived' && // Only check active/inactive terms
      (
        // New term starts during an existing term
        (new Date(t.startDate) <= new Date(termFormData.startDate) && 
         new Date(t.endDate) > new Date(termFormData.startDate)) ||
        // New term ends during an existing term
        (new Date(t.startDate) < new Date(termFormData.endDate) && 
         new Date(t.endDate) >= new Date(termFormData.endDate)) ||
        // New term completely contains an existing term
        (new Date(t.startDate) >= new Date(termFormData.startDate) && 
         new Date(t.endDate) <= new Date(termFormData.endDate))
      )
    );

    if (overlappingTerms.length > 0) {
      const overlappingTermNames = overlappingTerms.map(t => t.termName).join(', ');
      setTermError(`Term dates overlap with existing terms: ${overlappingTermNames}. Please choose different dates.`);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/terms`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          schoolYearId: selectedYear._id,
          startDate: termFormData.startDate,
          endDate: termFormData.endDate
        })
      });

      if (res.ok) {
        const newTerm = await res.json();
        setTerms([...terms, newTerm]);
        setShowAddTermModal(false);
        setTermFormData({ startDate: '', endDate: '' });
        setSuccessMessage('Term created successfully');
        setShowSuccessModal(true);
        fetchTerms(selectedYear);
      } else {
        const data = await res.json();
        setTermError(data.message || 'Failed to create term');
      }
    } catch {
      setTermError('Error creating term');
    }
  };

  // Add Quarter handler
  const handleAddQuarter = async (e) => {
    e.preventDefault();
    setQuarterError('');

    // Prevent adding quarters to inactive school years
    if (selectedYear && selectedYear.status !== 'active') {
      setQuarterError('Cannot add quarters to inactive school years. Please activate the school year first.');
      return;
    }

    if (!quarterFormData.quarterName || !quarterFormData.termName || !quarterFormData.startDate || !quarterFormData.endDate) {
      setQuarterError('Please fill in all fields');
      return;
    }

    // Validate quarter belongs to correct term
    const term1Quarters = ['Quarter 1', 'Quarter 2'];
    const term2Quarters = ['Quarter 3', 'Quarter 4'];
    
    if (quarterFormData.termName === 'Term 1' && !term1Quarters.includes(quarterFormData.quarterName)) {
      setQuarterError('Quarter 1 and Quarter 2 must belong to Term 1');
      return;
    }
    
    if (quarterFormData.termName === 'Term 2' && !term2Quarters.includes(quarterFormData.quarterName)) {
      setQuarterError('Quarter 3 and Quarter 4 must belong to Term 2');
      return;
    }

    // Check if quarter already exists for this school year and term
    const existingQuarter = quarters.find(q => 
      q.quarterName === quarterFormData.quarterName && 
      q.termName === quarterFormData.termName
    );
    
    if (existingQuarter) {
      setQuarterError(`${quarterFormData.quarterName} already exists for ${quarterFormData.termName}`);
      return;
    }

    // Validate quarter dates are within school year bounds
    if (selectedYear) {
      const schoolYearStart = selectedYear.schoolYearStart;
      const schoolYearEnd = selectedYear.schoolYearEnd;
      const startDate = new Date(quarterFormData.startDate);
      const endDate = new Date(quarterFormData.endDate);
      const minDate = new Date(`${schoolYearStart}-01-01`);
      const maxDate = new Date(`${schoolYearEnd}-12-31`);
      if (startDate < minDate || startDate > maxDate || endDate < minDate || endDate > maxDate) {
        setQuarterError(`Quarter dates must be within the school year bounds (${schoolYearStart} to ${schoolYearEnd}).`);
        return;
      }
    }

    if (new Date(quarterFormData.endDate) <= new Date(quarterFormData.startDate)) {
      setQuarterError('End date must be after start date');
      return;
    }

    // Check for overlapping quarters in the same term
    const overlappingQuarters = quarters.filter(q => 
      q.termName === quarterFormData.termName &&
      q.status !== 'archived' && // Only check active/inactive quarters
      (
        // New quarter starts during an existing quarter
        (new Date(q.startDate) <= new Date(quarterFormData.startDate) && 
         new Date(q.endDate) > new Date(quarterFormData.startDate)) ||
        // New quarter ends during an existing quarter
        (new Date(q.startDate) < new Date(quarterFormData.endDate) && 
         new Date(q.endDate) >= new Date(quarterFormData.endDate)) ||
        // New quarter completely contains an existing quarter
        (new Date(q.startDate) >= new Date(quarterFormData.startDate) && 
         new Date(q.endDate) <= new Date(quarterFormData.endDate))
      )
    );

    if (overlappingQuarters.length > 0) {
      const overlappingQuarterNames = overlappingQuarters.map(q => q.quarterName).join(', ');
      setQuarterError(`Quarter dates overlap with existing quarters: ${overlappingQuarterNames}. Please choose different dates.`);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/quarters`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          schoolYearId: selectedYear._id,
          quarterName: quarterFormData.quarterName,
          termName: quarterFormData.termName,
          startDate: quarterFormData.startDate,
          endDate: quarterFormData.endDate
        })
      });

      if (res.ok) {
        const newQuarter = await res.json();
        setQuarters([...quarters, newQuarter]);
        setShowAddQuarterModal(false);
        setQuarterFormData({ quarterName: '', termName: '', startDate: '', endDate: '' });
        setSuccessMessage('Quarter created successfully');
        setShowSuccessModal(true);
        fetchQuarters(selectedYear);
      } else {
        const data = await res.json();
        setQuarterError(data.message || 'Failed to create quarter');
      }
    } catch {
      setQuarterError('Error creating quarter');
    }
  };

  // Archive (delete) a school year
  const handleDelete = async (year) => {
    // Allow deletion for both active and inactive school years, but always warn about permanence
    setPendingDelete(year);
    setDeleteWarningMessage(`Are you sure you want to DELETE school year ${year.schoolYearStart}-${year.schoolYearEnd}? This will permanently delete ALL data including terms, tracks, strands, sections, subjects, and assignments. This action cannot be undone.`);
    setShowDeleteWarningModal(true);
  };

  // Handle actual deletion after confirmation
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/schoolyears/${pendingDelete._id}?confirmCascade=true`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (res.ok) {
        fetchSchoolYears();
        setSuccessMessage(`School year ${pendingDelete.schoolYearStart}-${pendingDelete.schoolYearEnd} and all its data have been permanently deleted.`);
        setShowSuccessModal(true);
      } else {
        const data = await res.json();
        setErrorMessage(data.message || 'Failed to delete school year');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error deleting school year:', error);
      setErrorMessage('Error deleting school year');
      setShowErrorModal(true);
    } finally {
      setIsDeleting(false);
      setShowDeleteWarningModal(false);
      setPendingDelete(null);
    }
  };

  // Cancel deletion
  const handleCancelDelete = () => {
    setShowDeleteWarningModal(false);
    setPendingDelete(null);
    setDeleteWarningMessage('');
  };

  // Prepare validation results for modal display (commented out for now)
  // const prepareValidationResults = () => {
  //   const results = {
  //     schoolYears: { valid: 0, invalid: 0, details: [] },
  //     terms: { valid: 0, invalid: 0, details: [] }
  //   };

  //   // Process school years
  //   schoolYears.forEach(year => {
  //     if (year.status === 'active') {
  //       results.schoolYears.valid++;
  //       results.schoolYears.details.push({
  //         name: `${year.schoolYearStart}-${year.schoolYearEnd}`,
  //         status: 'valid',
  //         message: '✓ Active'
  //       });
  //     } else if (year.status === 'inactive') {
  //       results.schoolYears.invalid++;
  //       results.schoolYears.details.push({
  //         name: `${year.schoolYearStart}-${year.schoolYearEnd}`,
  //         status: 'invalid',
  //         message: '✗ Inactive'
  //       });
  //     }
  //   });

  //   // Process terms for selected year
  //   if (selectedYear && terms.length > 0) {
  //       terms.forEach(term => {
  //         if (term.status === 'active') {
  //           results.terms.valid++;
  //           results.terms.details.push({
  //             name: term.termName,
  //             status: 'valid',
  //             message: '✓ Active'
  //           });
  //         } else if (term.status === 'inactive') {
  //           results.terms.invalid++;
  //           results.terms.details.push({
  //             name: term.termName,
  //             status: 'invalid',
  //             message: '✗ Inactive'
  //           });
  //         } else if (term.status === 'archived') {
  //           results.terms.invalid++;
  //           results.terms.details.push({
  //             name: term.termName,
  //             status: 'invalid',
  //             message: '✗ Archived'
  //           });
  //         }
  //       });
  //     }

  //   setValidationResults(results);
  //   setValidationModalOpen(true);
  // };

  const tabs = [
    { id: 'dashboard', label: 'School Year Dashboard' },
    { id: 'terms', label: 'Term/Semester' },
    { id: 'tracks', label: 'Tracks' },
    { id: 'strands', label: 'Strands' },
    { id: 'sections', label: 'Sections' },
    { id: 'faculty', label: 'Faculty Assignment' },
    { id: 'students', label: 'Student Assignment' }
  ];

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Admin_Navbar />

        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {showView ? `School Year ${selectedYear?.schoolYearStart}-${selectedYear?.schoolYearEnd}` : 'Academic Settings'}
              </h2>
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

          {showView ? (
            // View Section
            <div className="bg-white rounded-lg shadow-md">
              {/* Back Button */}
              <div className="p-4 border-b">
                <button
                  onClick={handleBack}
                  className="flex items-center text-gray-600 hover:text-gray-800"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to School Years
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b">
                <div className="flex overflow-x-auto">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
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

              {/* Tab Content */}
              <div className="p-4">
                {/* Content will be added later */}
                <div className="text-gray-500 text-center py-8">
                  {activeTab} content will be implemented here
                </div>
              </div>
            </div>
          ) : (
            // Original School Year Management Section
            <>
              {/* School Years List */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">School Years</h2>
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700 text-sm">
                      <strong>Note:</strong> Terms are automatically archived when a school year becomes inactive. Inactive school years cannot be edited.
                    </span>
                  </div>
                </div>
                <div className="mb-4">
                  <input 
                    type="text" 
                    placeholder="Search by year (e.g., 2024, 2023-2024)" 
                    className="w-full p-2 border rounded px-2 py-1 text-sm" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
                </div>
                <div className="bg-white p-4 rounded-xl shadow mb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                    <h4 className="text-xl md:text-2xl font-semibold">School Years</h4>
                                         <div className="flex gap-2">
                       {/* <button
                         className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                         onClick={prepareValidationResults}
                       >
                         View Validation Results
                       </button> */}
                       <button
                         className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
                         onClick={() => setShowCreateModal(true)}
                       >
                         Add New School Year
                       </button>
                     </div>
                  </div>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Start Year</th>
                        <th className="p-3 border">End Year</th>
                        <th className="p-3 border">Status</th>
                        <th className="p-3 border">Archived Terms</th>
                        <th className="p-3 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schoolYears
                        .filter(year => year.status === 'active')
                        .filter(year => {
                          if (searchTerm === '') return true;
                          const searchLower = searchTerm.toLowerCase();
                          const startYear = year.schoolYearStart.toString();
                          const endYear = year.schoolYearEnd.toString();
                          const fullYear = `${startYear}-${endYear}`;
                          return startYear.includes(searchLower) || 
                                 endYear.includes(searchLower) || 
                                 fullYear.includes(searchLower);
                        })
                        .length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-3 border text-center text-gray-500">
                            No school years found
                          </td>
                        </tr>
                      ) : (
                        schoolYears
                          .filter(year => year.status === 'active')
                          .filter(year => {
                            if (searchTerm === '') return true;
                            const searchLower = searchTerm.toLowerCase();
                            const startYear = year.schoolYearStart.toString();
                            const endYear = year.schoolYearEnd.toString();
                            const fullYear = `${startYear}-${endYear}`;
                            return startYear.includes(searchLower) || 
                                   endYear.includes(searchLower) || 
                                   fullYear.includes(searchLower);
                          })
                          .map((year) => (
                            <tr key={year._id} className="hover:bg-gray-50 transition">
                              <td className="p-3 border">{year.schoolYearStart}</td>
                              <td className="p-3 border">{year.schoolYearEnd}</td>
                              <td className="p-3 border">
                                <button
                                  onClick={() => handleToggleStatus(year)}
                                  className={`px-3 py-1 rounded-full text-xs font-semibold border border-gray-300
                                    ${year.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800 hover:bg-green-200'}
                                    hover:shadow`}
                                  title={year.status === 'active' ? 'Set as inactive' : 'Set as active'}
                                >
                                  {year.status === 'active' ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                              <td className="p-3 border">
                                {(() => {
                                  const schoolYearName = `${year.schoolYearStart}-${year.schoolYearEnd}`;
                                  return archivedCounts[schoolYearName] ?? 0;
                                })()}
                              </td>
                              <td className="p-3 border">
                                <div className="inline-flex space-x-2">
                                  <button
                                    onClick={() => handleDelete(year)}
                                    className="p-1 rounded hover:bg-red-100 group relative"
                                    title={year.status === 'active' ? 'Archive' : 'Delete'}
                                  >
                                    {/* Heroicons Trash (red) */}
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleView(year)}
                                    className="p-1 rounded hover:bg-blue-100 group relative"
                                    title="View"
                                  >
                                    {/* Heroicons Eye (black) */}
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12Z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                                    </svg>
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
            </>
          )}

          {/* View Modal */}
          {showViewModal && selectedYear && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-6xl max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="text-xl font-semibold">
                    School Year {selectedYear.schoolYearStart}-{selectedYear.schoolYearEnd}
                  </h3>
                  <div className="flex items-center gap-4">
                      {selectedYear.status === 'active' && (
                        <>
                          <button
                            onClick={() => setShowAddTermModal(true)}
                            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 ${
                              terms.length >= 2 ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            disabled={terms.length >= 2}
                            title={terms.length >= 2 ? 'Maximum 2 terms allowed per school year' : 'Add New Term'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Term
                          </button>
                          <button
                            onClick={() => setShowAddQuarterModal(true)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-2"
                            title="Add New Quarter"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Quarter
                          </button>
                        </>
                      )}
                      <button
                      onClick={() => setShowViewModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                      >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      </button>
                    </div>
                </div>

                {/* Terms and Quarters Display */}
                <div className="flex-1 overflow-y-auto p-4">
                    {selectedYear.status !== 'active' && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-blue-800 text-sm">
                            <strong>Note:</strong> This school year is inactive. All terms and quarters are automatically archived and cannot be edited.
                          </span>
                        </div>
                      </div>
                    )}
                  
                  {/* Show archived message when school year is not active */}
                  {selectedYear.status !== 'active' && (
                    <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded text-center font-semibold">
                      This school year is archived. Editing is disabled.
                    </div>
                  )}
                  
                  {/* Terms and Quarters Sections */}
                  {terms.map((term) => {
                    const termQuarters = quarters.filter(q => q.termName === term.termName);
                    return (
                      <div key={term._id} className="mb-6 bg-white border rounded-lg overflow-hidden">
                        {/* Term Header */}
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{term.termName}</h4>
                              <p className="text-sm text-gray-600">
                                {new Date(term.startDate).toLocaleDateString()} - {new Date(term.endDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedYear.status !== 'active' ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  archived
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleToggleTermStatus(term)}
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:shadow ${
                                    term.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800' : 'bg-gray-100 text-gray-800 hover:bg-green-100 hover:text-green-800'
                                  }`}
                                  title={`Click to ${term.status === 'active' ? 'deactivate' : 'activate'} ${term.termName}`}
                                >
                                  {term.status === 'archived' ? 'archived' : term.status}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Quarters Table */}
                        <div className="p-4">
                          <table className="min-w-full bg-white text-sm">
                            <thead>
                              <tr className="bg-gray-100 text-left">
                                <th className="p-3 border">Quarter Name</th>
                                <th className="p-3 border">Start Date</th>
                                <th className="p-3 border">End Date</th>
                                <th className="p-3 border">Status</th>
                                <th className="p-3 border">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {termQuarters.length === 0 ? (
                                <tr>
                                  <td colSpan="5" className="p-3 border text-center text-gray-500">
                                    No quarters found for {term.termName}
                                  </td>
                                </tr>
                              ) : (
                                termQuarters.map((quarter) => (
                                  <tr key={quarter._id}>
                                    <td className="p-3 border font-medium">{quarter.quarterName}</td>
                                    <td className="p-3 border">
                                      {new Date(quarter.startDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-3 border">
                                      {new Date(quarter.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-3 border">
                                      {selectedYear.status !== 'active' ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                          archived
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => handleToggleQuarterStatus(quarter)}
                                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:shadow ${
                                            quarter.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800' : 'bg-gray-100 text-gray-800 hover:bg-green-100 hover:text-green-800'
                                          }`}
                                          title={`Click to ${quarter.status === 'active' ? 'deactivate' : 'activate'} ${quarter.quarterName}`}
                                        >
                                          {quarter.status === 'archived' ? 'archived' : quarter.status}
                                        </button>
                                      )}
                                    </td>
                                    <td className="p-3 border">
                                      <div className="inline-flex space-x-2">
                                        <button
                                          onClick={() => handleViewQuarter(quarter)}
                                          className="p-1 rounded hover:bg-blue-100 group relative"
                                          title="View"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                                          </svg>
                                        </button>
                                        {selectedYear.status === 'active' ? (
                                          <button
                                            onClick={() => handleEditQuarter(quarter)}
                                            className="p-1 rounded hover:bg-yellow-100 group relative"
                                            title="Edit"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                                            </svg>
                                          </button>
                                        ) : (
                                          <button
                                            disabled
                                            className="p-1 rounded bg-gray-200 text-gray-600 cursor-not-allowed"
                                            title="Cannot edit quarters of inactive school year"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-600">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                                            </svg>
                                          </button>
                                        )}
                                        {quarter.status === 'archived' && selectedYear.status === 'active' ? (
                                          <button
                                            onClick={() => handleActivateQuarter(quarter)}
                                            className="bg-green-500 hover:bg-green-800 text-white px-2 py-1 text-xs rounded"
                                            title="Activate"
                                          >
                                            <svg className="w-6 h-6 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                          </button>
                                        ) : selectedYear.status !== 'active' ? (
                                          <button
                                            disabled
                                            className="p-1 rounded bg-gray-200 text-gray-600 cursor-not-allowed"
                                            title="School year is archived"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-600">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                                            </svg>
                                          </button>
                                        ) : quarter.status === 'active' ? (
                                          <button
                                            onClick={() => handleArchiveQuarter(quarter)}
                                            className="p-1 rounded hover:bg-red-100 group relative"
                                            title="Archive"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                            </svg>
                                          </button>
                                        ) : quarter.status === 'inactive' ? (
                                          <button
                                            onClick={() => handleArchiveQuarter(quarter)}
                                            className="p-1 rounded hover:bg-red-100 group relative"
                                            title="Archive"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                            </svg>
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleActivateQuarter(quarter)}
                                            className="bg-green-500 hover:bg-green-800 text-white px-2 py-1 text-xs rounded"
                                            title="Activate"
                                          >
                                            <svg className="w-6 h-6 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                          </button>
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
                    );
                  })}
                </div>
              </div>
                      </div>
          )}

              </div>

          {showCreateModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-2xl w-full relative">
                <button
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-3xl font-bold"
                  onClick={() => {
                    setShowCreateModal(false);
                    setIsEditMode(false);
                    setEditingYear(null);
                    setFormData({ schoolYearStart: '', status: 'inactive' });
                  }}
                  aria-label="Close"
                >
                  &times;
                </button>
                <h3 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit School Year' : 'Add New School Year'}</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-1">
                      School Year Start
                    </label>
                    <select
                      name="schoolYearStart"
                      value={formData.schoolYearStart}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      required
                    >
                      <option value="" disabled>Select year</option>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-base text-blue-600 font-bold">
                      School year will be {formData.schoolYearStart}-{formData.schoolYearStart ? parseInt(formData.schoolYearStart) + 1 : ''}
                    </p>
                  </div>
                  <input type="hidden" id="active" name="status" value="active" />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-md text-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      {isEditMode ? 'Save Changes' : 'Add School Year'}
                    </button>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditMode(false);
                          setEditingYear(null);
                          setFormData({ schoolYearStart: '', status: 'inactive' });
                          setShowCreateModal(false);
                        }}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-md text-lg"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {showActivateModal && pendingSchoolYear && (
            <div className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-xl min-w-[500px] w-full">
                <h2 className="text-xl font-semibold mb-4">Add the School Year?</h2>
                <p className="text-gray-700 mb-6 text-center">
                  Are you sure you want to add the School Year <strong>{pendingSchoolYear.schoolYearStart}-{pendingSchoolYear.schoolYearEnd}</strong>?
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                    onClick={() => {
                      setShowActivateModal(false);
                      setPendingSchoolYear(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={handleAddSchoolYearInactive}
                  >
                    Add as Inactive SY
                  </button>
                  <button
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    onClick={() => {
                      createSchoolYear(pendingSchoolYear.schoolYearStart, true);
                    }}
                  >
                    Add and set is as Active SY
                  </button>
                </div>
              </div>
            </div>
          )}

          {showTermActivationPrompt && promptSchoolYear && (
            <div className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">Activate Terms for School Year {promptSchoolYear.schoolYearStart}-{promptSchoolYear.schoolYearEnd}</h2>
                <p className="text-gray-700 mb-6">
                  The following terms are currently inactive for this school year. Do you want to activate them?
                </p>
                <div className="grid gap-2 mb-4">
                  {promptTerms.map(term => (
                    <div key={term._id} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                      <span>{term.termName}</span>
                      <button
                        onClick={() => setSelectedPromptTerm(term._id)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-md text-xs hover:bg-emerald-700"
                      >
                        Activate
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                    onClick={handleKeepTermsInactive}
                  >
                    Keep All Inactive
                  </button>
                  <button
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    onClick={handleActivatePromptTerm}
                  >
                    Activate Selected
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Term Modal */}
          {showAddTermModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-96 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Add New Term</h3>
                  <button
                    onClick={() => {
                      setShowAddTermModal(false);
                      setTermFormData({ startDate: '', endDate: '' });
                      setTermError('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAddTerm}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={termFormData.startDate}
                      onChange={(e) => setTermFormData({ ...termFormData, startDate: e.target.value })}
                      className={`w-full p-2 border rounded-md ${
                        selectedYear && selectedYear.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      required
                      disabled={selectedYear && selectedYear.status !== 'active'}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={termFormData.endDate}
                      onChange={(e) => setTermFormData({ ...termFormData, endDate: e.target.value })}
                      className={`w-full p-2 border rounded-md ${
                        selectedYear && selectedYear.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      required
                      disabled={selectedYear && selectedYear.status !== 'active'}
                    />
                  </div>

                  {termError && (
                    <div className="mb-4 text-red-500 text-sm">
                      {termError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddTermModal(false);
                        setTermFormData({ startDate: '', endDate: '' });
                        setTermError('');
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${
                        selectedYear && (selectedYear.status !== 'active' || terms.length >= 2) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={selectedYear && (selectedYear.status !== 'active' || terms.length >= 2)}
                    >
                      Add Term
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Quarter Modal */}
          {showAddQuarterModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-96 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Add New Quarter</h3>
                  <button
                    onClick={() => {
                      setShowAddQuarterModal(false);
                      setQuarterFormData({ quarterName: '', termName: '', startDate: '', endDate: '' });
                      setQuarterError('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAddQuarter}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Term
                    </label>
                    <select
                      value={quarterFormData.termName}
                      onChange={(e) => {
                        const selectedTerm = e.target.value;
                        setQuarterFormData({ ...quarterFormData, termName: selectedTerm, quarterName: '' });
                        
                        // Set available quarters based on selected term
                        if (selectedTerm === 'Term 1') {
                          setAvailableQuarters([
                            { value: 'Quarter 1', label: 'Quarter 1' },
                            { value: 'Quarter 2', label: 'Quarter 2' }
                          ]);
                        } else if (selectedTerm === 'Term 2') {
                          setAvailableQuarters([
                            { value: 'Quarter 3', label: 'Quarter 3' },
                            { value: 'Quarter 4', label: 'Quarter 4' }
                          ]);
                        } else {
                          setAvailableQuarters([]);
                        }
                      }}
                      className="w-full p-2 border rounded-md"
                      required
                    >
                      <option value="">Select Term First</option>
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quarter Name
                    </label>
                    <select
                      value={quarterFormData.quarterName}
                      onChange={(e) => setQuarterFormData({ ...quarterFormData, quarterName: e.target.value })}
                      className="w-full p-2 border rounded-md"
                      required
                      disabled={!quarterFormData.termName}
                    >
                      <option value="">
                        {quarterFormData.termName ? 'Select Quarter' : 'Select Term First'}
                      </option>
                      {availableQuarters.map(quarter => (
                        <option key={quarter.value} value={quarter.value}>
                          {quarter.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={quarterFormData.startDate}
                      onChange={(e) => setQuarterFormData({ ...quarterFormData, startDate: e.target.value })}
                      className={`w-full p-2 border rounded-md ${
                        selectedYear && selectedYear.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      required
                      disabled={selectedYear && selectedYear.status !== 'active'}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={quarterFormData.endDate}
                      onChange={(e) => setQuarterFormData({ ...quarterFormData, endDate: e.target.value })}
                      className={`w-full p-2 border rounded-md ${
                        selectedYear && selectedYear.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      required
                      disabled={selectedYear && selectedYear.status !== 'active'}
                    />
                  </div>

                  {quarterError && (
                    <div className="mb-4 text-red-500 text-sm">
                      {quarterError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddQuarterModal(false);
                        setQuarterFormData({ quarterName: '', termName: '', startDate: '', endDate: '' });
                        setQuarterError('');
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 ${
                        selectedYear && selectedYear.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={selectedYear && selectedYear.status !== 'active'}
                    >
                      Add Quarter
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Term Modal */}
          {showEditTermModal && editingTerm && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-96 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Edit Term: {editingTerm.termName}</h3>
                  <button
                    onClick={() => {
                      setShowEditTermModal(false);
                      setEditingTerm(null);
                      setEditTermFormData({ startDate: '', endDate: '' });
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleEditTermSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={editTermFormData.startDate}
                      onChange={(e) => setEditTermFormData({ ...editTermFormData, startDate: e.target.value })}
                      className={`w-full p-2 border rounded-md ${
                        selectedYear && selectedYear.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      required
                      disabled={selectedYear && selectedYear.status !== 'active'}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={editTermFormData.endDate}
                      onChange={(e) => setEditTermFormData({ ...editTermFormData, endDate: e.target.value })}
                      className={`w-full p-2 border rounded-md ${
                        selectedYear && selectedYear.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      required
                      disabled={selectedYear && selectedYear.status !== 'active'}
                    />
                  </div>

                  {editTermError && (
                    <div className="mb-4 text-red-500 text-sm">
                      {editTermError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditTermModal(false);
                        setEditingTerm(null);
                        setEditTermFormData({ startDate: '', endDate: '' });
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 ${
                        selectedYear && selectedYear.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={selectedYear && selectedYear.status !== 'active'}
                    >
                      Update Term
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Status Toggle Confirmation Modal */}
          {showStatusToggleModal && pendingStatusToggle && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h3 className="text-lg font-semibold mb-4">Confirm Status Change</h3>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to set School Year {pendingStatusToggle.year.schoolYearStart}-{pendingStatusToggle.year.schoolYearEnd} as {pendingStatusToggle.newStatus}?
                </p>
                
                {pendingStatusToggle.newStatus === 'active' && (
                  <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-yellow-800 font-medium">WARNING! Will deactivate the previous Active SY</span>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-3">
                  <button
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                    onClick={() => {
                      setShowStatusToggleModal(false);
                      setPendingStatusToggle(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    onClick={handleConfirmStatusToggle}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Validation Results Modal (commented out for now) */}
          {/* 
          {validationModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Validation Results</h2>
                  <p className="text-gray-600 mt-2">Review the validation status of your academic settings</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      School Years
                    </h3>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setValidationModalOpen(false)}
                    className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          */}

          {/* Delete Warning Modal */}
          {showDeleteWarningModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <div className="flex items-center mb-4">
                  <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-red-600">Warning: Permanent Deletion</h3>
                </div>
                <p className="text-gray-700 mb-6">{deleteWarningMessage}</p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCancelDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      'Delete Permanently'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Modal */}
          {showSuccessModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <div className="flex items-center mb-4">
                  <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <h3 className="text-lg font-semibold text-green-600">Success</h3>
                </div>
                <p className="text-gray-700 mb-6">{successMessage}</p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Modal */}
          {showErrorModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <div className="flex items-center mb-4">
                  <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-red-600">Error</h3>
                </div>
                <p className="text-gray-700 mb-6">{errorMessage}</p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowErrorModal(false)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <div className="flex items-center mb-4">
                  <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-blue-600">Confirm Action</h3>
                </div>
                <p className="text-gray-700 mb-6">{confirmMessage}</p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (confirmAction) confirmAction();
                      setShowConfirmModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      
    </>
  );
} 