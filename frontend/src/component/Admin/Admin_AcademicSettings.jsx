import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";


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
  const [selectedPromptTermName, setSelectedPromptTermName] = useState("");
  const [promptQuarters, setPromptQuarters] = useState([]);
  const [selectedPromptQuarterName, setSelectedPromptQuarterName] = useState("");
  // Term-activation (within SY view) quarter chooser
  const [showActivateTermQuarterPrompt, setShowActivateTermQuarterPrompt] = useState(false);
  const [pendingTermToActivate, setPendingTermToActivate] = useState(null);
  const [pendingTermQuarterName, setPendingTermQuarterName] = useState("");
  
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
        // Store all school years (active and inactive)
        setSchoolYears(data);
        computeArchivedCountsForYears(data);
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
        
        // Validate and fix multiple active quarters automatically
        const activeQuarters = data.filter(q => q.status === 'active');
        if (activeQuarters.length > 1) {
          console.warn(`🚨 SYSTEM VALIDATION: Found ${activeQuarters.length} active quarters. Only one quarter should be active at a time. Auto-correcting...`);
          
          // Keep only the most recently updated active quarter, deactivate the rest
          const sortedActiveQuarters = activeQuarters.sort((a, b) => 
            new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
          );
          const quartersToDeactivate = sortedActiveQuarters.slice(1);
          
          for (const quarter of quartersToDeactivate) {
            try {
              await fetch(`${API_BASE}/api/quarters/${quarter._id}`, {
                method: 'PATCH',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'inactive' })
              });
              console.log(`✅ Auto-corrected: Deactivated ${quarter.quarterName} (${quarter.termName})`);
            } catch (error) {
              console.error(`❌ Error auto-correcting ${quarter.quarterName}:`, error);
            }
          }
          
          // Show system correction message
          setSuccessMessage(`🔧 SYSTEM CORRECTION: Found ${activeQuarters.length} active quarters. Kept ${sortedActiveQuarters[0].quarterName} active and auto-deactivated ${quartersToDeactivate.length} others. Only one quarter can be active at a time.`);
          setShowSuccessModal(true);
          
          // Refresh quarters after auto-correction
          setTimeout(() => fetchQuarters(year), 1000);
        } else if (activeQuarters.length === 1 && selectedYear && selectedYear.status === 'active') {
          // Auto-rollover: if the single active quarter ended today or earlier, move to the next chronological quarter
          try {
            const activeQuarter = activeQuarters[0];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const activeEnd = new Date(activeQuarter.endDate);
            activeEnd.setHours(0, 0, 0, 0);

            if (activeEnd <= today) {
              // Determine next quarter by chronological order within same school year (status not archived)
              const candidates = (data || [])
                .filter(q => q._id !== activeQuarter._id && q.status !== 'archived')
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

              // Next is first quarter whose start is after or on the day after current ends; if none, try the next by index
              let nextQuarter = candidates.find(q => new Date(q.startDate) > activeEnd) || null;
              if (!nextQuarter && candidates.length > 0) {
                // Fallback: pick the immediate next in the list relative to activeQuarter position
                const byStart = (data || [])
                  .filter(q => q.status !== 'archived')
                  .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                const idx = byStart.findIndex(q => q._id === activeQuarter._id);
                if (idx >= 0 && idx + 1 < byStart.length) {
                  nextQuarter = byStart[idx + 1];
                }
              }

              if (nextQuarter) {
                // Deactivate current active quarter
                await fetch(`${API_BASE}/api/quarters/${activeQuarter._id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ status: 'inactive' })
                });

                // Activate next quarter (and ensure others are inactive per invariant)
                // In case any other quarter is active due to race, deactivate all others first
                for (const q of data) {
                  if (q._id !== nextQuarter._id && q.status !== 'archived' && q.status === 'active') {
                    try {
                      await fetch(`${API_BASE}/api/quarters/${q._id}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ status: 'inactive' })
                      });
                    } catch (e) {
                      console.warn('Failed to deactivate other active quarter during rollover', q._id);
                    }
                  }
                }

                await fetch(`${API_BASE}/api/quarters/${nextQuarter._id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ status: 'active' })
                });

                setSuccessMessage(`${activeQuarter.quarterName} ended. Automatically activated ${nextQuarter.quarterName}.`);
                setShowSuccessModal(true);
                // Refresh list after rollover
                setTimeout(() => fetchQuarters(year), 500);
              }
            }
          } catch (rollErr) {
            console.warn('Quarter auto-rollover failed:', rollErr);
          }
        }
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
              // Show number of INACTIVE terms for the SY
              const count = list.filter(t => t.status === 'inactive').length;
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
        const count = list.filter(t => t.status === 'inactive').length;
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

  const createSchoolYear = async (startYear, setAsActive, activeTermName, activeQuarterName) => {
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
          setAsActive,
          ...(setAsActive && activeTermName ? { activeTermName } : {}),
          ...(setAsActive && activeQuarterName ? { activeQuarterName } : {})
        })
      });

      if (res.ok) {
        await res.json();
        console.info('[AcademicSettings] createSchoolYear(): success');

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

    // ➕ Create Mode: Always create as INACTIVE to avoid any automatic term/quarter creation
    console.info('[AcademicSettings] Creating new school year', { startYear, setAsActive: false });
    createSchoolYear(startYear, false);
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

  // Open Add Quarter modal with smart defaults
  const openAddQuarterModal = () => {
    // Consider only non-archived terms
    const liveTerms = terms.filter(t => t.status !== 'archived');
    // Prefer an active term; if none, pick the term with the fewest existing quarters (newest/empty first)
    let chosenTerm = liveTerms.find(t => t.status === 'active') || null;
    if (!chosenTerm) {
      const termToQuarterCount = liveTerms.map(t => ({
        term: t,
        count: quarters.filter(q => q.termName === t.termName && q.status !== 'archived').length
      }));
      termToQuarterCount.sort((a, b) => {
        if (a.count !== b.count) return a.count - b.count; // fewest quarters first
        return a.term.termName.localeCompare(b.term.termName); // stable by name
      });
      chosenTerm = termToQuarterCount[0]?.term || null;
    }

    const defaultTermName = chosenTerm ? chosenTerm.termName : '';

    // Decide available quarter choices for that term
    let defaultAvailable = [];
    if (defaultTermName === 'Term 1') {
      defaultAvailable = [
        { value: 'Quarter 1', label: 'Quarter 1' },
        { value: 'Quarter 2', label: 'Quarter 2' }
      ];
    } else if (defaultTermName === 'Term 2') {
      defaultAvailable = [
        { value: 'Quarter 3', label: 'Quarter 3' },
        { value: 'Quarter 4', label: 'Quarter 4' }
      ];
    }

    // Autoselect first quarter for the chosen term; if Q1/Q3 exists, pick Q2/Q4
    const existingForTerm = quarters
      .filter(q => q.termName === defaultTermName && q.status !== 'archived')
      .map(q => q.quarterName);
    let defaultQuarterName = '';
    if (defaultTermName === 'Term 1') {
      defaultQuarterName = existingForTerm.includes('Quarter 1') ? 'Quarter 2' : 'Quarter 1';
    } else if (defaultTermName === 'Term 2') {
      defaultQuarterName = existingForTerm.includes('Quarter 3') ? 'Quarter 4' : 'Quarter 3';
    }

    setAvailableQuarters(defaultAvailable);
    setQuarterFormData({
      quarterName: defaultQuarterName,
      termName: defaultTermName,
      startDate: '',
      endDate: ''
    });
    setQuarterError('');
    setShowAddQuarterModal(true);
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
         fetchQuarters(selectedYear); // Refresh quarters to reflect backend changes
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
    // Block turning active year to inactive from UI
    const newStatus = year.status === 'active' ? 'active' : 'active';
    if (year.status === 'active') {
      setErrorMessage('You cannot set the active school year to inactive. Activate another year instead.');
      setShowErrorModal(true);
      return;
    }
    
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
            // Default to first term name
            const defaultTerm = data.terms[0];
            setSelectedPromptTerm(defaultTerm._id);
            setSelectedPromptTermName(defaultTerm.termName);
            // Fetch quarters for this SY and preselect earliest for the default term
            try {
              const qRes = await fetch(`${API_BASE}/api/quarters/schoolyear-id/${data.schoolYear._id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
              });
              if (qRes.ok) {
                const qList = await qRes.json();
                const termQs = (qList || []).filter(q => q.termName === defaultTerm.termName)
                  .sort((a,b)=> new Date(a.startDate)-new Date(b.startDate));
                setPromptQuarters(termQs);
                if (termQs.length > 0) setSelectedPromptQuarterName(termQs[0].quarterName);
              }
            } catch (e) { console.warn('Failed to load quarters for prompt:', e?.message || e); }
            setShowTermActivationPrompt(true);
            setShowStatusToggleModal(false);
            setPendingStatusToggle(null);
            return; // Wait for admin to choose
          }
                 } else {
           // If deactivating, refresh terms to show archived status
           if (selectedYear && selectedYear._id === year._id) {
             fetchTerms(selectedYear);
             fetchQuarters(selectedYear); // Refresh quarters to reflect backend changes
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

  // Handler for activating a term + quarter from the prompt (activates SY with selection)
  const handleActivatePromptTerm = async () => {
    if (!promptSchoolYear || !selectedPromptTermName) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/schoolyears/${promptSchoolYear._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'active',
          activeTermName: selectedPromptTermName,
          activeQuarterName: selectedPromptQuarterName || undefined
        })
      });
      if (!res.ok) throw new Error('Bad response');
      setShowTermActivationPrompt(false);
      setPromptTerms([]);
      setPromptSchoolYear(null);
      setSelectedPromptTerm("");
      setSelectedPromptTermName("");
      setSelectedPromptQuarterName("");
      fetchSchoolYears();
      setSuccessMessage('Activated school year with selected term and quarter.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error activating selection:', error);
      setErrorMessage('Failed to activate with selected term and quarter.');
      setShowErrorModal(true);
    }
  };

  // Handler for keeping all terms inactive
  const handleKeepTermsInactive = () => {
    setShowTermActivationPrompt(false);
    setPromptTerms([]);
    setPromptSchoolYear(null);
    setSelectedPromptTerm("");
    setSelectedPromptTermName("");
    setSelectedPromptQuarterName("");
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

    // For quarter edits: allow editing while active but enforce validations
    // Disallow editing dates in the past (only today onwards). If original start already passed, allow keeping same start but not moving earlier.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const editStart = new Date(editTermFormData.startDate);
    const editEnd = new Date(editTermFormData.endDate);
    const originalStart = editingTerm ? new Date(editingTerm.startDate) : null;
    const originalStartInPast = originalStart ? (new Date(originalStart.setHours(0,0,0,0)) < today) : false;
    const startInvalid = originalStartInPast ? (editStart < new Date(new Date(editingTerm.startDate).setHours(0,0,0,0))) : (editStart < today);
    if (startInvalid || editEnd < today) {
      setEditTermError('Dates cannot be in the past. Choose today or a future date.');
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

    // If editing a quarter, also check for overlapping quarters across ALL terms
    if (editingTerm && editingTerm.quarterName) {
      // Validate quarter dates within selected term bounds
      const parentTerm = terms.find(t => t.termName === editingTerm.termName && t.status !== 'archived');
      if (parentTerm) {
        const tStart = new Date(parentTerm.startDate);
        const tEnd = new Date(parentTerm.endDate);
        if (editStart < tStart || editEnd > tEnd) {
          setEditTermError(`Quarter dates must be within ${parentTerm.termName} (${tStart.toLocaleDateString()} - ${tEnd.toLocaleDateString()}).`);
          return;
        }
      }

      // Validate within school year bounds as well
      if (selectedYear) {
        const minDate = new Date(`${selectedYear.schoolYearStart}-01-01`);
        const maxDate = new Date(`${selectedYear.schoolYearEnd}-12-31`);
        if (editStart < minDate || editStart > maxDate || editEnd < minDate || editEnd > maxDate) {
          setEditTermError(`Quarter dates must be within the school year bounds (${selectedYear.schoolYearStart} to ${selectedYear.schoolYearEnd}).`);
          return;
        }
      }

      const overlappingQuarters = quarters.filter(q => 
        q._id !== editingTerm._id && // Exclude current quarter being edited
        q.status !== 'archived' && // Only check active/inactive quarters
        (
          // New quarter starts during an existing quarter
          (new Date(q.startDate) <= new Date(editTermFormData.startDate) && 
           new Date(q.endDate) > new Date(editTermFormData.startDate)) ||
          // New quarter ends during an existing quarter
          (new Date(q.startDate) < new Date(editTermFormData.endDate) && 
           new Date(q.endDate) >= new Date(editTermFormData.endDate)) ||
          // New quarter completely contains an existing quarter
          (new Date(q.startDate) >= new Date(editTermFormData.startDate) && 
           new Date(q.endDate) <= new Date(editTermFormData.endDate))
        )
      );

      if (overlappingQuarters.length > 0) {
        const overlappingQuarterNames = overlappingQuarters.map(q => q.quarterName).join(', ');
        setEditTermError(`Quarter dates overlap with existing quarters: ${overlappingQuarterNames}. Please choose different dates.`);
        return;
      }
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
        fetchQuarters(selectedYear);
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
    // If the term is already active, we handle via explicit deactivate flow
    if (term.status === 'active') {
      handleDeactivateActiveTerm(term);
      return;
    }
    // Simple on/off activation with confirmation (no quarter requirement)
    setConfirmMessage(`Set ${term.termName} to active? This will activate all quarters and their related entities (tracks, strands, sections, subjects, faculty assignments, and student assignments).`);
    setConfirmAction(() => () => handleToggleTermStatusInternal(term, 'active', 'activate'));
    setShowConfirmModal(true);
  };

  // Deactivate currently active term (set inactive) with confirmation
  const handleDeactivateActiveTerm = (term) => {
    if (selectedYear && selectedYear.status !== 'active') {
      setErrorMessage('Cannot modify terms of inactive school years.');
          setShowErrorModal(true);
          return;
        }
    setConfirmMessage(`Set ${term.termName} to inactive? This will deactivate all quarters and their related entities (tracks, strands, sections, subjects, faculty assignments, and student assignments).`);
    setConfirmAction(() => () => handleToggleTermStatusInternal(term, 'inactive', 'deactivate'));
    setShowConfirmModal(true);
  };

  const handleToggleTermStatusInternal = async (term, newStatus, action, activeQuarterName) => {
     try {
      console.log('Sending status update:', { status: newStatus });
      const res = await fetch(`${API_BASE}/api/terms/${term._id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus, ...(activeQuarterName ? { activeQuarterName } : {}) })
      });
      
      if (res.ok) {
        const updatedTerm = await res.json();
        console.log('Status updated successfully:', updatedTerm);
        setTerms(terms.map(t => t._id === term._id ? updatedTerm : t));
        
        // Cascade status update to all quarters and their related entities
        const schoolYearName = selectedYear ? `${selectedYear.schoolYearStart}-${selectedYear.schoolYearEnd}` : '';
        await cascadeTermStatusUpdate(term.termName, schoolYearName, newStatus);
        
        // Update success message for on/off behavior
        const successMessage = newStatus === 'active' ? 
          `${term.termName} has been activated. All quarters and their related entities have been activated.` : 
          `${term.termName} has been set to inactive. All quarters and their related entities have been deactivated.`;
        setSuccessMessage(successMessage);
        setShowSuccessModal(true);
        
        fetchTerms(selectedYear);
        fetchQuarters(selectedYear); // Refresh quarters to reflect backend changes
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
  // Function to cascade status updates to all entities related to a term and its quarters
  const cascadeTermStatusUpdate = async (termName, schoolYear, status) => {
    const token = localStorage.getItem('token');
    
    try {
      console.log(`Cascading ${status} status for term: ${termName}`);
      
      // Get all quarters for this term
      const termQuarters = quarters.filter(q => 
        q.termName === termName && 
        q.schoolYear === schoolYear
      );
      
      // Update all quarters for this term
      for (const quarter of termQuarters) {
        try {
          await fetch(`${API_BASE}/api/quarters/${quarter._id}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
          });
          
          // Cascade to all related entities for each quarter
          await cascadeQuarterStatusUpdate(quarter.quarterName, status);
        } catch (error) {
          console.error(`Error updating quarter ${quarter.quarterName} for term ${termName}:`, error);
        }
      }
      
      console.log(`Successfully cascaded ${status} status for term ${termName} and its quarters`);
    } catch (error) {
      console.error(`Error cascading status update for term ${termName}:`, error);
    }
  };

  // Function to cascade status updates to all entities related to a quarter
  const cascadeQuarterStatusUpdate = async (quarterName, status) => {
    const token = localStorage.getItem('token');
    const schoolYearName = selectedYear ? `${selectedYear.schoolYearStart}-${selectedYear.schoolYearEnd}` : '';
    
    try {
      console.log(`Cascading ${status} status for quarter: ${quarterName}`);
      
      // Update tracks
      try {
        const tracksRes = await fetch(`${API_BASE}/api/tracks/quarter/${quarterName}/schoolyear/${schoolYearName}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
        if (tracksRes.ok) {
          console.log(`Updated tracks status to ${status} for quarter ${quarterName}`);
        }
      } catch (error) {
        console.error(`Error updating tracks for quarter ${quarterName}:`, error);
      }

      // Update strands
      try {
        const strandsRes = await fetch(`${API_BASE}/api/strands/quarter/${quarterName}/schoolyear/${schoolYearName}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
        if (strandsRes.ok) {
          console.log(`Updated strands status to ${status} for quarter ${quarterName}`);
        }
      } catch (error) {
        console.error(`Error updating strands for quarter ${quarterName}:`, error);
      }

      // Update sections
      try {
        const sectionsRes = await fetch(`${API_BASE}/api/sections/quarter/${quarterName}/schoolyear/${schoolYearName}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
        if (sectionsRes.ok) {
          console.log(`Updated sections status to ${status} for quarter ${quarterName}`);
        }
      } catch (error) {
        console.error(`Error updating sections for quarter ${quarterName}:`, error);
      }

      // Update subjects
      try {
        const subjectsRes = await fetch(`${API_BASE}/api/subjects/quarter/${quarterName}/schoolyear/${schoolYearName}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
        if (subjectsRes.ok) {
          console.log(`Updated subjects status to ${status} for quarter ${quarterName}`);
        }
      } catch (error) {
        console.error(`Error updating subjects for quarter ${quarterName}:`, error);
      }

      // Update faculty assignments
      try {
        const facultyAssignmentsRes = await fetch(`${API_BASE}/api/faculty-assignments/quarter/${quarterName}/schoolyear/${schoolYearName}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
        if (facultyAssignmentsRes.ok) {
          console.log(`Updated faculty assignments status to ${status} for quarter ${quarterName}`);
        }
      } catch (error) {
        console.error(`Error updating faculty assignments for quarter ${quarterName}:`, error);
      }

      // Update student assignments
      try {
        const studentAssignmentsRes = await fetch(`${API_BASE}/api/student-assignments/quarter/${quarterName}/schoolyear/${schoolYearName}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
        if (studentAssignmentsRes.ok) {
          console.log(`Updated student assignments status to ${status} for quarter ${quarterName}`);
        }
      } catch (error) {
        console.error(`Error updating student assignments for quarter ${quarterName}:`, error);
      }

    } catch (error) {
      console.error(`Error cascading status update for quarter ${quarterName}:`, error);
    }
  };

  const handleToggleQuarterStatus = async (quarter) => {
    const newStatus = quarter.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    // Show confirmation modal
    setConfirmMessage(`Are you sure you want to ${action} ${quarter.quarterName}? This will ${action} all related tracks, strands, sections, subjects, faculty assignments, and student assignments.`);
    setConfirmAction(() => {
      handleToggleQuarterStatusInternal(quarter, newStatus, action);
    });
    setShowConfirmModal(true);
  };

  const handleToggleQuarterStatusInternal = async (quarter, newStatus, action) => {
    try {
      console.log('Sending quarter status update:', { status: newStatus });
      
      // If activating a quarter, first deactivate other quarters across ALL terms
      if (newStatus === 'active') {
        const otherQuarters = quarters.filter(q => 
          q._id !== quarter._id && 
          q.status !== 'archived'
        );
        
        // Deactivate other quarters and their related entities
        for (const otherQuarter of otherQuarters) {
          try {
            await fetch(`${API_BASE}/api/quarters/${otherQuarter._id}`, {
              method: 'PATCH',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ status: 'inactive' })
            });
            
            // Deactivate all related entities for the other quarter
            await cascadeQuarterStatusUpdate(otherQuarter.quarterName, 'inactive');
          } catch (error) {
            console.error(`Error deactivating quarter ${otherQuarter.quarterName}:`, error);
          }
        }
      }
      
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
        
        // Cascade status update to all related entities
        await cascadeQuarterStatusUpdate(quarter.quarterName, newStatus);
        
        // Update success message to reflect the action and auto-deactivation
        const successMessage = newStatus === 'active' ? 
          `${quarter.quarterName} has been activated. All other quarters and their related entities have been set to inactive.` : 
          `${quarter.quarterName} and all its related entities have been deactivated`;
        setSuccessMessage(successMessage);
        setShowSuccessModal(true);
        
        // Trigger a storage event to notify other components of the quarter status change
        localStorage.setItem('quarterStatusChanged', Date.now().toString());
        
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
    setConfirmMessage(`Are you sure you want to activate ${quarter.quarterName}? This will activate all related tracks, strands, sections, subjects, faculty assignments, and student assignments, and automatically set all other quarters and their related entities to inactive.`);
    setConfirmAction(() => () => {
      handleActivateQuarterInternal(quarter);
    });
    setShowConfirmModal(true);
  };

  const handleActivateQuarterInternal = async (quarter) => {
    try {
      const token = localStorage.getItem('token');
      
      // First, deactivate all other quarters across ALL terms
      const otherQuarters = quarters.filter(q => 
        q._id !== quarter._id && 
        q.status !== 'archived'
      );
      
      // Deactivate other quarters and their related entities
      for (const otherQuarter of otherQuarters) {
        try {
          await fetch(`${API_BASE}/api/quarters/${otherQuarter._id}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'inactive' })
          });
          
          // Deactivate all related entities for the other quarter
          await cascadeQuarterStatusUpdate(otherQuarter.quarterName, 'inactive');
        } catch (error) {
          console.error(`Error deactivating quarter ${otherQuarter.quarterName}:`, error);
        }
      }
      
      // Then activate the selected quarter
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
        
        // Activate all related entities for the selected quarter
        await cascadeQuarterStatusUpdate(quarter.quarterName, 'active');
        
        setSuccessMessage(`${quarter.quarterName} has been activated. All other quarters and their related entities have been set to inactive.`);
        setShowSuccessModal(true);
        
        // Trigger a storage event to notify other components of the quarter status change
        localStorage.setItem('quarterStatusChanged', Date.now().toString());
        
        fetchQuarters(selectedYear);
      } else {
        const data = await res.json();
        setTermError(data.message || 'Failed to activate quarter');
      }
    } catch {
      setTermError('Error activating quarter');
    }
  };

  // Validation function to ensure only one quarter is active at a time
  const validateSingleActiveQuarter = async (quartersData) => {
    const activeQuarters = quartersData.filter(q => q.status === 'active');
    if (activeQuarters.length > 1) {
      console.warn(`🚨 VALIDATION FAILED: ${activeQuarters.length} quarters are active. Only one should be active.`);
      return false;
    }
    return true;
  };

  const handleArchiveQuarter = async (quarter) => {
    // Prevent deactivating quarters of inactive school years
    if (selectedYear && selectedYear.status !== 'active') {
      setErrorMessage('Cannot deactivate quarters of inactive school years. Only quarters of active school years can be deactivated.');
      setShowErrorModal(true);
      return;
    }
    
    // Show confirmation modal
    setConfirmMessage(`Are you sure you want to deactivate ${quarter.quarterName}?`);
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
        setSuccessMessage(`${quarter.quarterName} has been deactivated`);
        setShowSuccessModal(true);
        fetchQuarters(selectedYear);
      } else {
        const data = await res.json();
        setTermError(data.message || 'Failed to deactivate quarter');
      }
    } catch {
      setTermError('Error deactivating quarter');
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

    // Require the existing term to be inactive before adding a second term
    if (terms.length >= 1 && terms.some(t => t.status !== 'inactive' && t.status !== 'archived')) {
      setTermError('Inactivate the previous term before adding a new one.');
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

    // Disallow creating terms with past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newStart = new Date(termFormData.startDate);
    const newEnd = new Date(termFormData.endDate);
    if (newStart < today || newEnd < today) {
      setTermError('Dates cannot be in the past. Choose today or a future date.');
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

  // Delete Term handlers
  const handleDeleteTerm = (term) => {
    // Only allow deletion when SY is active
    if (selectedYear && selectedYear.status !== 'active') {
      setErrorMessage('Cannot delete terms of inactive school years.');
      setShowErrorModal(true);
      return;
    }
    // Prevent deleting active terms
    if (term.status === 'active') {
      setErrorMessage('Cannot delete an active term. Please set it inactive first.');
      setShowErrorModal(true);
      return;
    }
    setConfirmMessage(`Are you sure you want to DELETE ${term.termName}? This will remove connected data (tracks, strands, sections, subjects, assignments) for this term.`);
    setConfirmAction(() => () => handleDeleteTermInternal(term));
    setShowConfirmModal(true);
  };

  const handleDeleteTermInternal = async (term) => {
    try {
      const res = await fetch(`${API_BASE}/api/terms/${term._id}?confirmCascade=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        setTerms(terms.filter(t => t._id !== term._id));
        setSuccessMessage(`${term.termName} deleted successfully.`);
        setShowSuccessModal(true);
        fetchTerms(selectedYear);
        refreshArchivedCountForYear(selectedYear);
      } else {
        const data = await res.json();
        setErrorMessage(data.message || 'Failed to delete term');
        setShowErrorModal(true);
      }
    } catch (err) {
      setErrorMessage('Error deleting term');
      setShowErrorModal(true);
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

    // Enforce sequential quarter availability
    const existingForTerm = quarters
      .filter(q => q.termName === quarterFormData.termName && q.status !== 'archived')
      .map(q => q.quarterName);
    if (quarterFormData.termName === 'Term 1' && quarterFormData.quarterName === 'Quarter 2' && !existingForTerm.includes('Quarter 1')) {
      setQuarterError('Quarter 2 requires Quarter 1 to exist first.');
      return;
    }
    if (quarterFormData.termName === 'Term 2' && quarterFormData.quarterName === 'Quarter 4' && !existingForTerm.includes('Quarter 3')) {
      setQuarterError('Quarter 4 requires Quarter 3 to exist first.');
      return;
    }

    // Disallow creating quarters with past dates (same rule as school year/term)
    const todayQ = new Date();
    todayQ.setHours(0, 0, 0, 0);
    const qStart = new Date(quarterFormData.startDate);
    const qEnd = new Date(quarterFormData.endDate);
    if (qStart < todayQ || qEnd < todayQ) {
      setQuarterError('Dates cannot be in the past. Choose today or a future date.');
      return;
    }

    // Validate quarter belongs to correct term (by conventional mapping)
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

    // Validate quarter dates are within the chosen term's date range
    const chosenTerm = terms.find(t => t.termName === quarterFormData.termName && t.status !== 'archived');
    if (chosenTerm) {
      const termStart = new Date(chosenTerm.startDate);
      const termEnd = new Date(chosenTerm.endDate);
      if (qStart < termStart || qEnd > termEnd) {
        setQuarterError(`Quarter dates must be within ${chosenTerm.termName} (${new Date(chosenTerm.startDate).toLocaleDateString()} - ${new Date(chosenTerm.endDate).toLocaleDateString()}).`);
        return;
      }
      // Prevent a quarter from exactly matching the term's full range
      if (qStart.getTime() === termStart.getTime() && qEnd.getTime() === termEnd.getTime()) {
        setQuarterError('Quarter dates cannot be the exact same range as the term.');
        return;
      }
    }

    // Check if a non-archived quarter already exists for this school year and term
    const existingQuarter = quarters.find(q => 
      q.quarterName === quarterFormData.quarterName && 
      q.termName === quarterFormData.termName &&
      q.status !== 'archived'
    );
    
    if (existingQuarter) {
      setQuarterError(`${quarterFormData.quarterName} already exists for ${quarterFormData.termName}`);
      return;
    }

    // Allow adding quarters even if first quarter is active, but new quarters will be set as inactive
    // This allows admins to prepare quarters in advance

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

    // Check for overlapping quarters across ALL terms
    const overlappingQuarters = quarters.filter(q => 
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
          endDate: quarterFormData.endDate,
          status: 'inactive' // Always create new quarters as inactive
        })
      });

      if (res.ok) {
        const newQuarter = await res.json();
        setQuarters([...quarters, newQuarter]);
        
        // Deactivate all other quarters and their related entities when creating a new quarter
        const otherQuarters = quarters.filter(q => 
          q._id !== newQuarter._id && 
          q.status !== 'archived'
        );
        
        for (const otherQuarter of otherQuarters) {
          try {
            await fetch(`${API_BASE}/api/quarters/${otherQuarter._id}`, {
              method: 'PATCH',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ status: 'inactive' })
            });
            
            // Deactivate all related entities for the other quarter
            await cascadeQuarterStatusUpdate(otherQuarter.quarterName, 'inactive');
          } catch (error) {
            console.error(`Error deactivating quarter ${otherQuarter.quarterName}:`, error);
          }
        }
        
        setShowAddQuarterModal(false);
        setQuarterFormData({ quarterName: '', termName: '', startDate: '', endDate: '' });
        setSuccessMessage(`✅ ${quarterFormData.quarterName} created successfully as inactive. All other quarters and their related entities have been deactivated. You can now edit the details and activate it when ready. Only one quarter can be active at a time.`);
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
                        <th className="p-3 border">Inactive Terms</th>
                        <th className="p-3 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schoolYears
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
                              (terms.length >= 2 || (terms.length >= 1 && terms.some(t => t.status !== 'inactive' && t.status !== 'archived'))) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            disabled={terms.length >= 2 || (terms.length >= 1 && terms.some(t => t.status !== 'inactive' && t.status !== 'archived'))}
                            title={
                              terms.length >= 2
                                ? 'Maximum 2 terms allowed per school year'
                                : (terms.length >= 1 && terms.some(t => t.status !== 'inactive' && t.status !== 'archived'))
                                  ? 'Inactivate the previous term before adding a new one'
                                  : 'Add New Term'
                            }
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Term
                          </button>
                          <button
                            onClick={openAddQuarterModal}
                            className={`px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-2 ${
                              (quarters.filter(q => q.status !== 'archived').length >= 4) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            disabled={quarters.filter(q => q.status !== 'archived').length >= 4}
                            title={(quarters.filter(q => q.status !== 'archived').length >= 4) ? 'Maximum of 4 quarters per school year reached' : 'Add New Quarter'}
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
                    // Dedupe quarters client-side by (termName, quarterName)
                    const termQuartersRaw = quarters.filter(q => q.termName === term.termName);
                    const termQuartersMap = new Map();
                    for (const q of termQuartersRaw) {
                      const key = `${q.termName}::${q.quarterName}`;
                      const existing = termQuartersMap.get(key);
                      // Prefer the most recently updated record if duplicates exist
                      if (!existing || new Date(q.updatedAt || 0) > new Date(existing?.updatedAt || 0)) {
                        termQuartersMap.set(key, q);
                      }
                    }
                    const termQuarters = Array.from(termQuartersMap.values()).sort((a,b)=>
                      new Date(a.startDate) - new Date(b.startDate)
                    );
                    return (
                      <div key={term._id} className="mb-6 bg-white border rounded-lg overflow-hidden">
                        {/* Term Header */}
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{term.termName}</h4>
                              <p className="text-sm text-gray-600">
                                {new Date(term.startDate).toLocaleDateString()} - {new Date(term.endDate).toLocaleDateString()}
                              </p>
                              </div>
                              {selectedYear.status === 'active' && (
                                <button
                                  onClick={() => handleEditTerm(term)}
                                  className="p-2 rounded hover:bg-yellow-100"
                                  title="Edit term dates"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-800">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedYear.status !== 'active' ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  archived
                                </span>
                              ) : (
                                term.status === 'active' ? (
                                  <button
                                    onClick={() => handleDeactivateActiveTerm(term)}
                                    className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:shadow bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800"
                                    title={`Click to set ${term.termName} inactive`}
                                  >
                                    active
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleTermStatus(term)}
                                    className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:shadow bg-gray-100 text-gray-800 hover:bg-green-100 hover:text-green-800"
                                    title={`Click to activate ${term.termName}`}
                                  >
                                    {term.status === 'archived' ? 'archived' : term.status}
                                  </button>
                                )
                              )}
                              {/* Moved edit button next to date range for better accessibility */}
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
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">archived</span>
                                      ) : term.status !== 'active' ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-400" title="Enable the term to toggle quarter status">{quarter.status}</span>
                                      ) : (
                                        <button
                                          onClick={() => handleToggleQuarterStatus(quarter)}
                                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:shadow ${
                                            quarter.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800' : 'bg-gray-100 text-gray-800 hover:bg-green-100 hover:text-green-800'
                                          }`}
                                          title={`Click to ${quarter.status === 'active' ? 'deactivate' : 'activate'} ${quarter.quarterName}`}
                                        >
                                          {quarter.status === 'archived' ? 'inactive' : quarter.status}
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
                                            title="Edit quarter dates"
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
                                        {/* Removed quarter activate action button */}
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
                  {/* Ensure new SY is created as inactive - remove hidden active status */}
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

          {/* Removed activate-on-create pathway to prevent auto-creation of terms/quarters */}
          {false && showActivateModal && pendingSchoolYear && (
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
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Choose Term</label>
                  <select
                    className="w-full border rounded p-2"
                    value={selectedPromptTerm}
                    onChange={async (e) => {
                      const termId = e.target.value;
                      setSelectedPromptTerm(termId);
                      const term = promptTerms.find(t => t._id === termId);
                      setSelectedPromptTermName(term?.termName || "");
                      // Load quarters for this term
                      try {
                        const qRes = await fetch(`${API_BASE}/api/quarters/schoolyear-id/${promptSchoolYear._id}`, {
                          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                        });
                        if (qRes.ok) {
                          const qList = await qRes.json();
                          const termQs = (qList || []).filter(q => q.termName === term?.termName)
                            .sort((a,b)=> new Date(a.startDate)-new Date(b.startDate));
                          setPromptQuarters(termQs);
                          setSelectedPromptQuarterName(termQs[0]?.quarterName || "");
                        }
                      } catch (e) { console.warn('Failed to load quarters for chosen term:', e?.message || e); }
                    }}
                  >
                    {promptTerms.map(term => (
                      <option key={term._id} value={term._id}>{term.termName}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Choose Quarter</label>
                  <select
                    className="w-full border rounded p-2"
                    value={selectedPromptQuarterName}
                    onChange={(e)=> setSelectedPromptQuarterName(e.target.value)}
                  >
                    {promptQuarters.map(q => (
                      <option key={q._id} value={q.quarterName}>{q.quarterName}</option>
                    ))}
                  </select>
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

          {/* Activate Term → Choose Quarter Prompt */}
          {showActivateTermQuarterPrompt && pendingTermToActivate && (
            <div className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">Activate {pendingTermToActivate.termName}</h2>
                <p className="text-gray-700 mb-4">Choose the quarter to activate for this term.</p>
                <select
                  className="w-full border rounded p-2 mb-6"
                  value={pendingTermQuarterName}
                  onChange={(e)=> setPendingTermQuarterName(e.target.value)}
                >
                  {promptQuarters.map(q => (
                    <option key={q._id} value={q.quarterName}>{q.quarterName}</option>
                  ))}
                </select>
                <div className="flex justify-end gap-3">
                  <button
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                    onClick={()=>{
                      setShowActivateTermQuarterPrompt(false);
                      setPendingTermToActivate(null);
                      setPendingTermQuarterName("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    onClick={()=>{
                      const term = pendingTermToActivate;
                      setShowActivateTermQuarterPrompt(false);
                      handleToggleTermStatusInternal(term, 'active', 'activate', pendingTermQuarterName);
                      setPendingTermToActivate(null);
                      setPendingTermQuarterName('');
                    }}
                  >
                    Activate
                  </button>
                </div>
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
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> New quarters are created as inactive by default. You can edit the details and activate them when ready.
            </p>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Important:</strong> Only one quarter can be active at a time across all terms. Activating a quarter will automatically deactivate all other quarters.
            </p>
          </div>
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
                      disabled
                    >
                      <option value="">{quarterFormData.termName || 'No terms available'}</option>
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
                      disabled
                    >
                      <option value="">{quarterFormData.quarterName || 'Select Quarter'}</option>
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
                        selectedYear && selectedYear.status !== 'active' ? 'opacity-50 cursor-not-allowed' : (editingTerm && new Date(editingTerm.startDate) < new Date(new Date().setHours(0,0,0,0)) ? 'opacity-50 cursor-not-allowed' : '')
                      }`}
                      required
                      disabled={(selectedYear && selectedYear.status !== 'active') || (editingTerm && new Date(editingTerm.startDate) < new Date(new Date().setHours(0,0,0,0)))}
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
                    onClick={() => {
                      setShowConfirmModal(false);
                      setConfirmAction(null); // Clear the action to prevent execution
                    }}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (confirmAction) confirmAction();
                      setShowConfirmModal(false);
                      setConfirmAction(null); // Clear the action after execution
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