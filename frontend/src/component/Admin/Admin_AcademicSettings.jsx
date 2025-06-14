import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import axios from 'axios';
import editIcon from "../../assets/editing.png";
import archiveIcon from "../../assets/archive.png";
import viewIcon from "../../assets/view.png";

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

  const [formData, setFormData] = useState({
    schoolYearStart: "",
    status: "inactive"
  });

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

  const fetchSchoolYears = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/schoolyears');
      const data = await res.json();
      if (res.ok) {
        setSchoolYears(data);
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
      const res = await fetch(`http://localhost:5000/api/terms/schoolyear/${schoolYearName}`);
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

    // Check if school year already exists
    const yearExists = schoolYears.some(year => 
      year.schoolYearStart === startYear && 
      (!isEditMode || year._id !== editingYear?._id)
    );

    if (yearExists) {
      setError("This school year already exists");
      return;
    }

    if (isEditMode) {
      // Validate if any changes were made
      const hasChanges = 
        formData.schoolYearStart !== editingYear.schoolYearStart.toString() ||
        formData.status !== editingYear.status;

      if (!hasChanges) {
        setError("No changes were made to the school year.");
      return;
    }

      if (window.confirm("Save changes to this school year?")) {
        try {
          const res = await fetch(`http://localhost:5000/api/schoolyears/${editingYear._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              schoolYearStart: parseInt(formData.schoolYearStart),
              status: formData.status
            })
          });

          if (res.ok) {
            alert("School year updated successfully");
            // Update the school years array with the edited year
            setSchoolYears(prevYears => 
              prevYears.map(year => 
                year._id === editingYear._id 
                  ? { 
                      ...year, 
                      schoolYearStart: parseInt(formData.schoolYearStart),
                      schoolYearEnd: parseInt(formData.schoolYearStart) + 1,
                      status: formData.status 
                    }
                  : year
              )
            );
            
            setIsEditMode(false);
            setEditingYear(null);
            setFormData({
              schoolYearStart: "",
              status: "inactive"
            });
          } else {
            const data = await res.json();
            setError(data.message || "Failed to update school year");
          }
        } catch (err) {
          setError("Error updating school year");
        }
      }
    } else {
      try {
        const res = await fetch('http://localhost:5000/api/schoolyears', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolYearStart: parseInt(formData.schoolYearStart),
            status: formData.status
          })
        });

        if (res.ok) {
          alert("School year created successfully");
          // Clear form after successful creation
          setFormData({
            schoolYearStart: "",
            status: "inactive"
          });
          fetchSchoolYears();
      } else {
          const data = await res.json();
          setError(data.message || "Failed to create school year");
        }
      } catch (err) {
        setError("Error creating school year");
      }
    }
  };

  const handleDelete = async (year) => {
    // Check if trying to delete active school year
    if (year.status === 'active') {
      alert("Cannot set an active school year to inactive. Please set another year as active first if you want to archive this.");
      return;
    }

    if (window.confirm("Are you sure you want to set this school year to inactive?")) {
      try {
        const res = await fetch(`http://localhost:5000/api/schoolyears/${year._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'inactive' })
        });

        if (res.ok) {
          const updatedYear = await res.json();
          setSchoolYears(prevYears =>
            prevYears.map(sy => (sy._id === updatedYear._id ? updatedYear : sy))
          );
          alert("School year status set to inactive successfully");
          } else {
          const data = await res.json();
          setError(data.message || "Failed to set school year status to inactive");
        }
      } catch (err) {
        setError("Error setting school year status to inactive");
      }
    }
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
        const res = await fetch(`http://localhost:5000/api/terms/${term._id}/archive`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
          const updatedTerm = await res.json();
          setTerms(terms.map(t => t._id === term._id ? updatedTerm : t));
          alert(`${term.termName} has been archived`);
        } else {
          const data = await res.json();
          setTermError(data.message || 'Failed to archive term');
        }
      } catch (err) {
        setTermError('Error archiving term');
      }
    }
  };

  const handleAddTerm = async (e) => {
    e.preventDefault();
    setTermError('');

    if (!termFormData.startDate || !termFormData.endDate) {
      setTermError('Please fill in all fields');
      return;
    }

    if (new Date(termFormData.endDate) <= new Date(termFormData.startDate)) {
      setTermError('End date must be after start date');
        return;
      }

    try {
      const res = await fetch('http://localhost:5000/api/terms', {
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
      } else {
        const data = await res.json();
        setTermError(data.message || 'Failed to create term');
      }
    } catch (err) {
      setTermError('Error creating term');
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
            {/* School Year Form */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">{isEditMode ? 'Edit School Year' : 'Add New School Year'}</h3>
              {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
              {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    School Year Start
                    </label>
                    <input
                    type="number"
                    name="schoolYearStart"
                    value={formData.schoolYearStart}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1900"
                    max="2100"
                      required
                    />
                  <p className="mt-1 text-sm text-gray-500">
                    School year will be {formData.schoolYearStart}-{formData.schoolYearStart ? parseInt(formData.schoolYearStart) + 1 : ''}
                  </p>
                  </div>

                    <div className="flex items-center">
                      <input
                        type="hidden"
                        id="active"
                        name="status"
                        value="active"
                      />
                    </div>

                    <div className="flex gap-2">
                    <button
                      type="submit"
                    className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                    {isEditMode ? 'Save Changes' : 'Add School Year'}
                    </button>
                    {isEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                          setIsEditMode(false);
                        setEditingYear(null);
                        setFormData({
                          schoolYearStart: "",
                          status: "inactive"
                        });
                      }}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                        >
                          Cancel Edit
                        </button>
                      )}
                  </div>
                </form>
              </div>

            {/* School Years List */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-2">School Years</h4>
              <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Start Year</th>
                        <th className="p-3 border">End Year</th>
                        <th className="p-3 border">Status</th>
                        <th className="p-3 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                  {schoolYears.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-3 border text-center text-gray-500">
                        No school years found
                          </td>
                        </tr>
                  ) : (
                    schoolYears.map((year) => (
                      <tr key={year._id}>
                        <td className="p-3 border">{year.schoolYearStart}</td>
                        <td className="p-3 border">{year.schoolYearEnd}</td>
                            <td className="p-3 border">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            year.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                            {year.status}
                              </span>
                            </td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button
                              onClick={() => handleEdit(year)}
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                              title="Edit"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                              onClick={() => handleView(year)}
                              className="bg-blue-400 hover:bg-blue-500 text-white px-2 py-1 text-xs rounded"
                              title="View"
                                >
                              <img src={viewIcon} alt="View" className="w-8 h-8 inline-block" />
                                </button>
                      <button
                              onClick={() => handleDelete(year)}
                                  className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded"
                              title="Delete"
                                >
                              <img src={archiveIcon} alt="Delete" className="w-8 h-8 inline-block" />
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
                    Add Term
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
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              term.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {term.status}
                            </span>
                          </td>
                          <td className="p-3 border">
                            <div className="inline-flex space-x-2">
                      <button
                                onClick={() => handleViewTerm(term)}
                                className="bg-blue-400 hover:bg-blue-500 text-white px-2 py-1 text-xs rounded"
                                title="View"
                              >
                                <img src={viewIcon} alt="View" className="w-8 h-8 inline-block" />
                      </button>
                    <button
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                                title="Edit"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                                onClick={() => handleArchiveTerm(term)}
                                  className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded"
                                title="Archive"
                                disabled={term.status === 'archived'}
                                >
                                  <img src={archiveIcon} alt="Archive" className="w-8 h-8 inline-block" />
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
    </div>
  );
} 