import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Admin_AcademicSettings() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [schoolYears, setSchoolYears] = useState([]);
  const [showView, setShowView] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showViewModal, setShowViewModal] = useState(false);
  const [terms, setTerms] = useState([]);
  const [showAddTermModal, setShowAddTermModal] = useState(false);
  const [termFormData, setTermFormData] = useState({
    startDate: '',
    endDate: ''
  });
  const [termError, setTermError] = useState('');
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

  const [formData, setFormData] = useState({
    schoolYearStart: "",
    status: "inactive"
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerms, setSearchTerms] = useState({ start: '', end: '' });

  // Fetch school years on mount
  useEffect(() => {
      fetchSchoolYears();
  }, []);

  // Fetch terms when a school year is selected
  useEffect(() => {
    if (selectedYear) {
      fetchTerms(selectedYear);
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
        const activeYears = data.filter(year => year.status !== 'archived');
        setSchoolYears(activeYears);
        computeArchivedCountsForYears(activeYears);
      } else {
        setError("Failed to fetch school years");
      }
    } catch {
      setError("Error fetching school years");
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
          } catch {}
          return [name, 0];
        })
      );
      setArchivedCounts(Object.fromEntries(entries));
    } catch {}
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
    } catch {}
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
        alert("School year created successfully");
        setFormData({ schoolYearStart: "", status: "inactive" });
        fetchSchoolYears();
        setShowActivateModal(false);
        setShowCreateModal(false);
        setIsEditMode(false);
        setEditingYear(null);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to create school year");
      }
    } catch {
      setError("Error creating school year");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.schoolYearStart) {
      setError("Please enter a school year start");
      return;
    }

    const startYear = parseInt(formData.schoolYearStart);
    if (startYear < 1900 || startYear > 2100) {
      setError("School year must be between 1900 and 2100");
      return;
    }

    const yearExists = schoolYears.some(year =>
      year.schoolYearStart === startYear &&
      year.status !== 'archived' &&
      (!isEditMode || year._id !== editingYear?._id)
    );

    if (yearExists) {
      setError("This school year already exists");
      return;
    }

    // ✏️ Edit Mode
    if (isEditMode) {
      const hasChanges =
        formData.schoolYearStart !== editingYear.schoolYearStart.toString() ||
        formData.status !== editingYear.status;

      if (!hasChanges) {
        setError("No changes were made to the school year.");
        return;
      }

      // Optional: Replace with a custom edit confirmation modal if needed
      const confirmEdit = window.confirm("Save changes to this school year?");
      if (!confirmEdit) return;

      try {
        console.log('Sending edit request:', {
          schoolYearStart: startYear,
          status: formData.status
        });
        const res = await fetch(`${API_BASE}/api/schoolyears/${editingYear._id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            schoolYearStart: startYear,
            status: formData.status
          })
        });

        if (res.ok) {
          console.log('Edit successful');
          alert("School year updated successfully");
          fetchSchoolYears(); // Refresh from database
          setIsEditMode(false);
          setEditingYear(null);
          setFormData({ schoolYearStart: "", status: "inactive" });
          setShowCreateModal(false); // Close the modal
        } else {
          const data = await res.json();
          console.log('Edit failed:', data);
          setError(data.message || "Failed to update school year");
        }
      } catch {
        setError("Error updating school year");
      }

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
    createSchoolYear(startYear, true);
  };

  const handleEdit = (year) => {
    // Prevent editing inactive school years
    if (year.status === 'inactive') {
      alert('Cannot edit inactive school years. Only status changes are allowed.');
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

  const handleBack = () => {
    setShowView(false);
    setSelectedYear(null);
  };

  const handleArchiveTerm = async (term) => {
    // Prevent archiving terms of inactive school years
    if (selectedYear && selectedYear.status !== 'active') {
      alert('Cannot archive terms of inactive school years. Only terms of active school years can be archived.');
      return;
    }
    
    if (window.confirm(`Are you sure you want to archive ${term.termName}?`)) {
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
          alert(`${term.termName} has been archived`);
          fetchTerms(selectedYear);
          refreshArchivedCountForYear(selectedYear);
        } else {
          const data = await res.json();
          setTermError(data.message || 'Failed to archive term');
        }
      } catch {
        setTermError('Error archiving term');
      }
    }
  };

  const handleActivateTerm = async (term) => {
    // Prevent activating terms of inactive school years
    if (selectedYear && selectedYear.status !== 'active') {
      alert('Cannot activate terms of inactive school years. Please activate the school year first.');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to activate ${term.termName}?`)) return;
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
        alert(`${term.termName} has been activated`);
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

  const handleAddTerm = async (e) => {
    e.preventDefault();
    setTermError('');

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
        alert('Term created successfully');
        fetchTerms(selectedYear);
      } else {
        const data = await res.json();
        setTermError(data.message || 'Failed to create term');
      }
    } catch {
      setTermError('Error creating term');
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
          alert(`School year set as ${newStatus}`);
        }
        // If no terms or not activating, just refresh
        fetchSchoolYears();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to update school year status');
      }
    } catch {
      setError('Error updating school year status');
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
      alert('Term activated successfully.');
    } catch {
      setError('Failed to activate term.');
    }
  };

  // Handler for keeping all terms inactive
  const handleKeepTermsInactive = () => {
    setShowTermActivationPrompt(false);
    setPromptTerms([]);
    setPromptSchoolYear(null);
    setSelectedPromptTerm("");
    fetchSchoolYears();
    alert('School year activated. All terms remain inactive.');
  };

  // Handler for adding school year as inactive
  const handleAddSchoolYearInactive = async () => {
    if (!pendingSchoolYear) return;
    try {
      await createSchoolYear(pendingSchoolYear.schoolYearStart, false); // false = not active
      setShowActivateModal(false);
      setPendingSchoolYear(null);
      alert('School year added as inactive.');
    } catch {
      setError('Failed to add school year as inactive.');
    }
  };

  // Term editing functions
  const handleEditTerm = (term) => {
    // Prevent editing terms of inactive school years
    if (selectedYear && selectedYear.status !== 'active') {
      alert('Cannot edit terms of inactive school years. Only status changes are allowed.');
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
        headers: { 'Content-Type': 'application/json' },
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
        alert('Term updated successfully');
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
    
    // Show confirmation modal instead of window.confirm
    if (!window.confirm(`Are you sure you want to ${action} ${term.termName}?`)) return;
    
    try {
      console.log('Sending status update:', { status: newStatus });
      const res = await fetch(`${API_BASE}/api/terms/${term._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        const updatedTerm = await res.json();
        console.log('Status updated successfully:', updatedTerm);
        setTerms(terms.map(t => t._id === term._id ? updatedTerm : t));
        
        // Update alert message to reflect that inactive terms are now archived
        const alertMessage = newStatus === 'active' ? 
          `${term.termName} has been activated` : 
          `${term.termName} has been archived`;
        alert(alertMessage);
        
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

  // Archive (delete) a school year
  const handleDelete = async (year) => {
    // Prevent archiving inactive school years
    if (year.status === 'inactive') {
      alert('Cannot archive inactive school years. Only active school years can be archived.');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to archive school year ${year.schoolYearStart}-${year.schoolYearEnd}? This will also archive all its terms and assignments.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/schoolyears/${year._id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'archived' })
      });
      if (res.ok) {
        fetchSchoolYears();
        alert(`School year ${year.schoolYearStart}-${year.schoolYearEnd} archived.`);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to archive school year');
      }
    } catch {
      setError('Error archiving school year');
    }
  };

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
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <input type="text" placeholder="Search Start Year" className="w-full sm:w-1/2 p-2 border rounded px-2 py-1 text-sm" value={searchTerms.start} onChange={e => setSearchTerms(prev => ({ ...prev, start: e.target.value }))} />
                  <input type="text" placeholder="Search End Year" className="w-full sm:w-1/2 p-2 border rounded px-2 py-1 text-sm" value={searchTerms.end} onChange={e => setSearchTerms(prev => ({ ...prev, end: e.target.value }))} />
                </div>
                <div className="bg-white p-4 rounded-xl shadow mb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                    <h4 className="text-xl md:text-2xl font-semibold">School Years</h4>
                    <button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
                      onClick={() => setShowCreateModal(true)}
                    >
                      Add New School Year
                    </button>
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
                      <tr className="bg-white text-left">
                        <th className="p-2 border-b">
                          <input type="text" placeholder="Search Start Year" className="w-full border rounded px-2 py-1 text-sm" value={searchTerms.start} onChange={e => setSearchTerms(prev => ({ ...prev, start: e.target.value }))} />
                        </th>
                        <th className="p-2 border-b">
                          <input type="text" placeholder="Search End Year" className="w-full border rounded px-2 py-1 text-sm" value={searchTerms.end} onChange={e => setSearchTerms(prev => ({ ...prev, end: e.target.value }))} />
                        </th>
                        <th className="p-2 border-b"></th>
                        <th className="p-2 border-b"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {schoolYears
                        .filter(year => year.status !== 'archived')
                        .filter(year =>
                          (searchTerms.start === '' || year.schoolYearStart.toString().includes(searchTerms.start)) &&
                          (searchTerms.end === '' || year.schoolYearEnd.toString().includes(searchTerms.end))
                        )
                        .length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-3 border text-center text-gray-500">
                            No school years found
                          </td>
                        </tr>
                      ) : (
                        schoolYears
                          .filter(year => year.status !== 'archived')
                          .filter(year =>
                            (searchTerms.start === '' || year.schoolYearStart.toString().includes(searchTerms.start)) &&
                            (searchTerms.end === '' || year.schoolYearEnd.toString().includes(searchTerms.end))
                          )
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
                                  {year.status === 'active' ? (
                                    <>
                                      <button
                                        onClick={() => { handleEdit(year); setShowCreateModal(true); }}
                                        className="p-1 rounded hover:bg-yellow-100 group relative"
                                        title="Edit"
                                      >
                                        {/* Heroicons Pencil Square (black) */}
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleDelete(year)}
                                        className="p-1 rounded hover:bg-red-100 group relative"
                                        title="Archive"
                                      >
                                        {/* Heroicons Trash (red) */}
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                        </svg>
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        disabled
                                        className="p-1 rounded bg-gray-200 text-gray-600 cursor-not-allowed"
                                        title="Cannot edit inactive school year"
                                      >
                                        {/* Heroicons Pencil Square (gray) */}
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-600">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                                        </svg>
                                      </button>
                                      <button
                                        disabled
                                        className="p-1 rounded bg-gray-200 text-gray-600 cursor-not-allowed"
                                        title="Cannot archive inactive school year"
                                      >
                                        {/* Heroicons Trash (gray) */}
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-600">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                        </svg>
                                      </button>
                                    </>
                                  )}
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
                        {selectedYear.status === 'active' ? (
                          <button
                            onClick={() => setShowAddTermModal(true)}
                            className={`px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-2 ${
                        selectedYear.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={selectedYear.status !== 'active'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Term
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed flex items-center gap-2"
                            title="Cannot add terms to inactive school year"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Term
                          </button>
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

                {/* Terms Table */}
                <div className="flex-1 overflow-y-auto p-4">
                    {selectedYear.status !== 'active' && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-blue-800 text-sm">
                            <strong>Note:</strong> This school year is inactive. All terms are automatically archived and cannot be edited.
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
                  
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Term Name</th>
                        <th className="p-3 border">Start Date</th>
                        <th className="p-3 border">End Date</th>
                        <th className="p-3 border">Status</th>
                          <th className="p-3 border">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                      {terms.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-3 border text-center text-gray-500">
                            No terms found
                            </td>
                          </tr>
                      ) : (
                        terms.map((term) => (
                          <tr key={term._id}>
                            <td className="p-3 border">{term.termName}</td>
                            <td className="p-3 border">
                              {new Date(term.startDate).toLocaleDateString()}
                            </td>
                            <td className="p-3 border">
                              {new Date(term.endDate).toLocaleDateString()}
                            </td>
                            <td className="p-3 border">
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
                            </td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                        <button
                                  onClick={() => handleViewTerm(term)}
                                  className="p-1 rounded hover:bg-blue-100 group relative"
                                  title="View"
                                >
                                  {/* Heroicons Eye (black) */}
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                                  </svg>
                        </button>
                      {selectedYear.status === 'active' ? (
                        <button
                          onClick={() => handleEditTerm(term)}
                          className={`p-1 rounded hover:bg-yellow-100 group relative ${
                          selectedYear.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                          title="Edit"
                        disabled={selectedYear.status !== 'active'}
                        >
                          {/* Heroicons Pencil Square (black) */}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="p-1 rounded bg-gray-200 text-gray-600 cursor-not-allowed"
                          title="Cannot edit terms of inactive school year"
                        >
                          {/* Heroicons Pencil Square (gray) */}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                          </svg>
                        </button>
                      )}
                                  {term.status === 'archived' && selectedYear.status === 'active' ? (
                                    <button
                                      onClick={() => handleActivateTerm(term)}
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
                                      {/* Heroicons Minus (gray) */}
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                                      </svg>
                                    </button>
                                  ) : term.status === 'active' ? (
                                    <button
                                      onClick={() => handleArchiveTerm(term)}
                                      className="p-1 rounded hover:bg-red-100 group relative"
                                      title="Archive"
                                    >
                                      {/* Heroicons Trash (red) */}
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                      </svg>
                                    </button>
                                  ) : term.status === 'inactive' ? (
                                    <button
                                      onClick={() => handleArchiveTerm(term)}
                                      className="p-1 rounded hover:bg-red-100 group relative"
                                      title="Archive"
                                    >
                                      {/* Heroicons Trash (red) */}
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                      </svg>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleActivateTerm(term)}
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
                      </div>
          )}

          {/* Add Term Modal */}
          {showAddTermModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-96 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Add New Term</h3>
                                    <button
                    onClick={() => setShowAddTermModal(false)}
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
                    onClick={() => setShowAddTermModal(false)}
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
                    Add Term
                    </button>
                  </div>
                </form>
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
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
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
        </div>
      
    </>
  );
} 