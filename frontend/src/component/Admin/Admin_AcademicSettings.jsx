import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import editIcon from "../../assets/editing.png";
import archiveIcon from "../../assets/archive.png";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Admin_AcademicSettings() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
  const [showCreateSuccess, setShowCreateSuccess] = useState(false);
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

  const [showActivateModal, setShowActivateModal] = useState(false);
  const [pendingSchoolYear, setPendingSchoolYear] = useState(null);

  const [formData, setFormData] = useState({
    schoolYearStart: "",
    status: "inactive"
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerms, setSearchTerms] = useState({ start: '', end: '' });

  // Add state for the prompt
  const [showTermActivationPrompt, setShowTermActivationPrompt] = useState(false);
  const [promptTerms, setPromptTerms] = useState([]);
  const [promptSchoolYear, setPromptSchoolYear] = useState(null);
  const [selectedPromptTerm, setSelectedPromptTerm] = useState("");

  // Generate years for dropdown (from 1900 to current year + 10)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = 1900; year <= currentYear + 10; year++) {
      years.push(year);
    }
    return years;
  };

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
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`);
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
      const res = await fetch(`${API_BASE}/api/schoolyears`);
      const data = await res.json();
      if (res.ok) {
        setSchoolYears(data.filter(year => year.status !== 'archived'));
      } else {
        setError("Failed to fetch school years");
      }
    } catch (err) {
      setError("Error fetching school years");
    }
  };

  const fetchTerms = async (year) => {
    try {
      const schoolYearName = `${year.schoolYearStart}-${year.schoolYearEnd}`;
      const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`);
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

  const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (checked ? 'active' : 'inactive') : value
      }));
    };

    const createSchoolYear = async (startYear, setAsActive) => {
    try {
      const res = await fetch(`${API_BASE}/api/schoolyears`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      } else {
        const data = await res.json();
        setError(data.message || "Failed to create school year");
      }
    } catch (err) {
      setError("Error creating school year");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.schoolYearStart) {
      setError("Please select a school year start");
      return;
    }

    const startYear = parseInt(formData.schoolYearStart);
    if (startYear < 1900 || startYear > 2100) {
      setError("School year must be between 1900 and 2100");
      return;
    }

    const yearExists = schoolYears.some(year =>
      year.schoolYearStart === startYear &&
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
        const res = await fetch(`${API_BASE}/api/schoolyears/${editingYear._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolYearStart: startYear,
            status: formData.status
          })
        });

        if (res.ok) {
          alert("School year updated successfully");
          setSchoolYears(prevYears =>
            prevYears
              .map(year =>
                year._id === editingYear._id
                  ? {
                      ...year,
                      schoolYearStart: startYear,
                      schoolYearEnd: startYear + 1,
                      status: formData.status
                    }
                  : year
              )
              .filter(year => year.status !== 'archived')
          );
          setIsEditMode(false);
          setEditingYear(null);
          setFormData({ schoolYearStart: "", status: "inactive" });
        } else {
          const data = await res.json();
          setError(data.message || "Failed to update school year");
        }
      } catch (err) {
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
    setIsEditMode(true);
    setEditingYear(year);
    setFormData({
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
    if (window.confirm(`Are you sure you want to archive ${term.termName}?`)) {
      try {
        const res = await fetch(`${API_BASE}/api/terms/${term._id}/archive`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
          const updatedTerm = await res.json();
          setTerms(terms.map(t => t._id === term._id ? updatedTerm : t));
          alert(`${term.termName} has been archived`);
          fetchTerms(selectedYear);
        } else {
          const data = await res.json();
          setTermError(data.message || 'Failed to archive term');
        }
      } catch (err) {
        setTermError('Error archiving term');
      }
    }
  };

  const handleActivateTerm = async (term) => {
    if (!window.confirm(`Are you sure you want to activate ${term.termName}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/terms/${term._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      if (res.ok) {
        const updatedTerm = await res.json();
        setTerms(terms.map(t => t._id === term._id ? updatedTerm : t));
        alert(`${term.termName} has been activated`);
        fetchTerms(selectedYear);
      } else {
        const data = await res.json();
        setTermError(data.message || 'Failed to activate term');
      }
    } catch (err) {
      setTermError('Error activating term');
    }
  };

  const handleAddTerm = async (e) => {
    e.preventDefault();
    setTermError('');

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

    try {
      const res = await fetch(`${API_BASE}/api/terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (err) {
      setTermError('Error creating term');
    }
  };

  const handleToggleStatus = async (year) => {
    const newStatus = year.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Set school year ${year.schoolYearStart}-${year.schoolYearEnd} as ${newStatus}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/schoolyears/${year._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
            return; // Wait for admin to choose
          }
        } else {
          fetchSchoolYears();
          alert(`School year set as ${newStatus}`);
        }
        // If no terms or not activating, just refresh
        fetchSchoolYears();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to update school year status');
      }
    } catch (err) {
      setError('Error updating school year status');
    }
  };

  // Handler for activating a term from the prompt
  const handleActivatePromptTerm = async () => {
    if (!selectedPromptTerm) return;
    try {
      await fetch(`${API_BASE}/api/terms/${selectedPromptTerm}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      setShowTermActivationPrompt(false);
      setPromptTerms([]);
      setPromptSchoolYear(null);
      setSelectedPromptTerm("");
      fetchSchoolYears();
      alert('Term activated successfully.');
    } catch (err) {
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

  // Archive (delete) a school year
  const handleDelete = async (year) => {
    if (!window.confirm(`Are you sure you want to archive school year ${year.schoolYearStart}-${year.schoolYearEnd}? This will also archive all its terms and assignments.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/schoolyears/${year._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
      });
      if (res.ok) {
        fetchSchoolYears();
        alert(`School year ${year.schoolYearStart}-${year.schoolYearEnd} archived.`);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to archive school year');
      }
    } catch (err) {
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
                {academicYear ? `AY: ${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
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
                        <td colSpan="4" className="p-3 border text-center text-gray-500">
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
                              <div className="inline-flex space-x-2">
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
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
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
                        <button
                      onClick={() => setShowAddTermModal(true)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                        </button>
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
                                  inactive
                                </span>
                              ) : (
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  term.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {term.status}
                                </span>
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
                      <button
                                    className="p-1 rounded hover:bg-yellow-100 group relative"
                                  title="Edit"
                                  >
                                    {/* Heroicons Pencil Square (black) */}
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                                    </svg>
                                  </button>
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
                                  ) : selectedYear.status !== 'active' || term.status === 'archived' ? (
                                    <button
                                      disabled
                                      className="p-1 rounded bg-gray-200 text-green-600 cursor-not-allowed"
                                      title="Archived"
                                    >
                                      {/* Heroicons Check (green) */}
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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
                    className="w-full p-2 border rounded-md"
                    required
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
                    className="w-full p-2 border rounded-md"
                    required
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
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
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
                      <option value="" disabled={!!formData.schoolYearStart}>Select School Year Start</option>
                      {generateYearOptions().map(year => (
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
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">Activate New School Year</h2>
                <p className="text-gray-700 mb-6">
                  Do you want to activate the new school year <strong>{pendingSchoolYear.schoolYearStart}-{pendingSchoolYear.schoolYearEnd}</strong>? 
                  The currently active school year will be archived.
                </p>
                <div className="flex justify-end gap-3">
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
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    onClick={() => {
                      createSchoolYear(pendingSchoolYear.schoolYearStart, true);
                    }}
                  >
                    Yes, Activate
                  </button>
                </div>
              </div>
            </div>
          )}

          {showTermActivationPrompt && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Activate a Term</h2>
                <p className="mb-4">This school year has existing terms. Would you like to set one as active, or keep all terms inactive?</p>
                <select
                  className="w-full border rounded px-3 py-2 mb-4"
                  value={selectedPromptTerm}
                  onChange={e => setSelectedPromptTerm(e.target.value)}
                >
                  <option value="">Select a term to activate</option>
                  {promptTerms.map(term => (
                    <option key={term._id} value={term._id}>{term.termName}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded hover:bg-emerald-700"
                    onClick={handleActivatePromptTerm}
                    disabled={!selectedPromptTerm}
                  >
                    Activate Selected Term
                  </button>
                  <button
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                    onClick={handleKeepTermsInactive}
                  >
                    Keep All Inactive
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      
    </>
  );
} 