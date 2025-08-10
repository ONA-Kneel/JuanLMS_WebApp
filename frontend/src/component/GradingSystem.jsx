import React, { useState, useEffect } from 'react';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function GradingSystem() {
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [gradingData, setGradingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationType, setValidationType] = useState('error');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch faculty assignments from database
  const fetchFacultyAssignments = async () => {
    try {
      setLoading(true);
      console.log('Fetching faculty assignments...');
      
      const response = await fetch(`${API_BASE}/api/grading/my-assignments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched faculty assignments:', data);
        setFacultyAssignments(data.assignments || []);
        
        // Auto-select first assignment if available
        if (data.assignments && data.assignments.length > 0) {
          console.log('Auto-selecting first assignment:', data.assignments[0]);
          setSelectedAssignment(data.assignments[0]._id);
          setSelectedSection(data.assignments[0]);
        } else {
          console.log('No assignments found for this faculty');
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch faculty assignments:', errorData);
        setValidationMessage(errorData.message || 'Failed to fetch faculty assignments');
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error('Error fetching faculty assignments:', error);
      setValidationMessage('Error fetching faculty assignments: ' + error.message);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch actual faculty assignments from database
    fetchFacultyAssignments();
    
    // Set academic year and term (you might want to fetch these from API too)
    setAcademicYear({ schoolYearStart: 2025, schoolYearEnd: 2026 });
    setCurrentTerm({ termName: 'Term 1' });
  }, []);

  // Show a message if no assignments are found
  if (!loading && facultyAssignments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Faculty_Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Grading System</h1>
            <p className="text-gray-600">
              Upload Excel files containing student grades for your assignments
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center py-8">
              <p className="text-gray-600 text-lg mb-4">
                No assignments found for this faculty member.
              </p>
              <p className="text-gray-500 mb-4">
                Please contact your administrator to assign classes to your account.
              </p>
              <button
                onClick={fetchFacultyAssignments}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Refresh Assignments
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleAssignmentSelect = (assignmentId) => {
    setSelectedAssignment(assignmentId);
    setSelectedSection('');
    setGradingData([]);
    
    // Find the selected assignment and set it as the section
    const assignment = facultyAssignments.find(a => a._id === assignmentId);
    if (assignment) {
      setSelectedSection(assignment);
      // Fetch grading data for this assignment
      fetchGradingData(assignmentId);
    }
  };

  const handleSectionSelect = (assignmentId) => {
    const assignment = facultyAssignments.find(a => a._id === assignmentId);
    if (assignment) {
      setSelectedSection(assignment);
      // Fetch grading data for this assignment
      fetchGradingData(assignmentId);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      // Check file extension
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const allowedExtensions = ['xlsx', 'xls', 'csv'];
      
      if (allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension)) {
        setExcelFile(file);
        setSuccessMessage(`File selected: ${file.name}`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setValidationMessage('Please select a valid Excel file (.xlsx, .xls) or CSV file.');
        setValidationType('error');
        setShowValidationModal(true);
        // Clear the file input
        e.target.value = '';
      }
    }
  };

  const downloadTemplate = async () => {
    if (!selectedAssignment || !selectedSection) {
      setValidationMessage('Please select both an assignment and a section first.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }

    try {
      const selectedAssignmentObj = facultyAssignments.find(a => a._id === selectedAssignment);
      if (!selectedAssignmentObj) {
        setValidationMessage('Selected assignment not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      const queryParams = new URLSearchParams({
        sectionName: selectedAssignmentObj.sectionName,
        trackName: selectedAssignmentObj.trackName,
        strandName: selectedAssignmentObj.strandName,
        gradeLevel: selectedAssignmentObj.gradeLevel,
        schoolYear: selectedAssignmentObj.schoolYear,
        termName: selectedAssignmentObj.termName
      });

      const response = await fetch(`${API_BASE}/api/grading/template/${selectedAssignment}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grading_template_${selectedAssignmentObj.sectionName}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSuccessMessage('Template downloaded successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setValidationMessage(errorData.message || 'Failed to download template');
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      setValidationMessage('Error downloading template. Please try again.');
      setValidationType('error');
      setShowValidationModal(true);
    }
  };

  const handleUpload = async () => {
    if (!excelFile) {
      setValidationMessage('Please select a file to upload.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }

    if (!selectedAssignment || !selectedSection) {
      setValidationMessage('Please select both an assignment and a section first.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('excelFile', excelFile);

      // Add required fields to form data
      const selectedAssignmentObj = facultyAssignments.find(a => a._id === selectedAssignment);
      if (!selectedAssignmentObj) {
        setValidationMessage('Selected assignment not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      formData.append('sectionName', selectedAssignmentObj.sectionName);
      formData.append('trackName', selectedAssignmentObj.trackName);
      formData.append('strandName', selectedAssignmentObj.strandName);
      formData.append('gradeLevel', selectedAssignmentObj.gradeLevel);
      formData.append('schoolYear', selectedAssignmentObj.schoolYear);
      formData.append('termName', selectedAssignmentObj.termName);

      console.log('Uploading file:', excelFile.name);
      console.log('Form data:', {
        sectionName: selectedAssignmentObj.sectionName,
        trackName: selectedAssignmentObj.trackName,
        strandName: selectedAssignmentObj.strandName,
        gradeLevel: selectedAssignmentObj.gradeLevel,
        schoolYear: selectedAssignmentObj.schoolYear,
        termName: selectedAssignmentObj.termName
      });

      const response = await fetch(`${API_BASE}/api/grading/upload/${selectedAssignment}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      console.log('Upload response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Upload success:', data);
        setSuccessMessage(`Grades uploaded successfully! ${data.data.totalProcessed} students processed.`);
        setExcelFile(null);
        
        // Refresh grading data
        fetchGradingData(selectedAssignment);
      } else {
        const errorData = await response.json();
        console.error('Upload error:', errorData);
        
        // If there are student matching errors, show a helpful message
        if (errorData.errors && errorData.errors.some(err => err.includes('not found in database'))) {
          setValidationMessage(`Student matching errors found. Please check the student names in your Excel file. ${errorData.errors.join(', ')}`);
        } else {
          setValidationMessage(errorData.message || 'Failed to upload grades');
        }
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error('Error uploading grades:', error);
      setValidationMessage(`Error uploading grades: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setUploadLoading(false);
    }
  };

  // Debug function to check students in section
  const debugStudents = async () => {
    if (!selectedSection) {
      setValidationMessage('Please select a section first.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }

    try {
      const selectedAssignmentObj = facultyAssignments.find(a => a._id === selectedAssignment);
      if (!selectedAssignmentObj) {
        setValidationMessage('Selected assignment not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      const queryParams = new URLSearchParams({
        trackName: selectedAssignmentObj.trackName,
        strandName: selectedAssignmentObj.strandName,
        gradeLevel: selectedAssignmentObj.gradeLevel,
        schoolYear: selectedAssignmentObj.schoolYear,
        termName: selectedAssignmentObj.termName
      });

      const response = await fetch(`${API_BASE}/api/grading/debug/students/${selectedAssignmentObj.sectionName}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Debug data:', data);
        
        const sectionStudents = data.sectionStudents.map(s => s.name).join(', ');
        const allStudents = data.allStudents.map(s => s.name).join(', ');
        
        setValidationMessage(`Section Students: ${sectionStudents}\n\nAll Students: ${allStudents}`);
        setValidationType('info');
        setShowValidationModal(true);
      } else {
        const errorData = await response.json();
        setValidationMessage(`Debug failed: ${errorData.message}`);
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error('Error debugging students:', error);
      setValidationMessage(`Error debugging students: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    }
  };

  const fetchGradingData = async (assignmentId) => {
    try {
      setLoading(true);
      console.log('Fetching grading data for assignment:', assignmentId);
      
      const response = await fetch(`${API_BASE}/api/grading/data/${assignmentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Grading data fetched:', data);
        setGradingData(data.data || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch grading data:', errorData);
      }
    } catch (error) {
      console.error('Error fetching grading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteGradingData = async (gradingDataId) => {
    if (!confirm('Are you sure you want to delete this grading data? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/grading/data/${gradingDataId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSuccessMessage('Grading data deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Refresh grading data
        fetchGradingData(selectedAssignment);
      } else {
        const errorData = await response.json();
        setValidationMessage(errorData.message || 'Failed to delete grading data');
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error('Error deleting grading data:', error);
      setValidationMessage('Error deleting grading data. Please try again.');
      setValidationType('error');
      setShowValidationModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Faculty_Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Grading System</h1>
          <p className="text-gray-600">
            Upload Excel files containing student grades for your assignments
          </p>
        </div>

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
            <button
              onClick={() => setSuccessMessage('')}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center py-8">
              <p className="text-gray-600">Loading faculty assignments...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Current Academic Period */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Current Academic Period</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                  <div className="text-gray-900">
                    {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Loading...'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Term</label>
                  <div className="text-gray-900">
                    {currentTerm ? currentTerm.termName : 'Loading...'}
                  </div>
                </div>
              </div>
            </div>

            {/* Assignment & Section Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Select Assignment & Section</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignment</label>
                  <select
                    value={selectedAssignment}
                    onChange={(e) => handleAssignmentSelect(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">Select an assignment</option>
                    {facultyAssignments.map((assignment) => (
                      <option key={assignment._id} value={assignment._id}>
                        {assignment.subjectName} - {assignment.sectionName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                  <select
                    value={selectedSection ? selectedSection._id : ''}
                    onChange={(e) => handleSectionSelect(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!selectedAssignment}
                  >
                    <option value="">Select a section</option>
                    {facultyAssignments.map((assignment) => (
                      <option key={assignment._id} value={assignment._id}>
                        {assignment.sectionName} ({assignment.trackName} - {assignment.strandName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Upload Grading File - Always show when both are selected */}
            {selectedAssignment && selectedSection && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Upload Grading File</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Excel File</label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Upload an Excel file with columns: Student Name, Grade, Feedback (optional)
                    </p>
                    {excelFile && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">
                          <strong>Selected file:</strong> {excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={downloadTemplate}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                    >
                      Download Template
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={!excelFile || uploadLoading}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {uploadLoading ? 'Uploading...' : 'Upload Grades'}
                    </button>
                    <button
                      onClick={debugStudents}
                      className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
                    >
                      Debug Students
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Grading Data Display */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Grading Data</h3>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading grading data...</p>
                </div>
              ) : gradingData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Section
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Upload Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Students Graded
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {gradingData.map((data) => (
                        <tr key={data._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {data.sectionName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(data.uploadedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {data.grades.length} students
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              data.status === 'processed' 
                                ? 'bg-green-100 text-green-800'
                                : data.status === 'error'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {data.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => deleteGradingData(data._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    {selectedAssignment && selectedSection 
                      ? `No grading data available for ${selectedSection.sectionName}`
                      : 'Select an assignment and section to view grading data'
                    }
                  </p>
                  {selectedAssignment && selectedSection && (
                    <p className="text-sm text-gray-500 mt-2">
                      Upload an Excel file to see grading data here
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Validation Modal */}
      <ValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        type={validationType}
        title={validationType === 'error' ? 'Error' : 'Warning'}
        message={validationMessage}
        confirmText="OK"
      />
    </div>
  );
} 