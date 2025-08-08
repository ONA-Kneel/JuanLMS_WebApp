import React, { useState, useEffect } from 'react';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function GradingSystem() {
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('1'); // Pre-select Business Math
  const [selectedSection, setSelectedSection] = useState('1'); // Pre-select ABM111
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

  // Mock data for testing - matches the image
  const mockAssignments = [
    {
      _id: '1',
      subjectName: 'Business Math',
      sectionName: 'ABM111',
      trackName: 'Academic Track',
      strandName: 'ABM',
      gradeLevel: 'Grade 11',
      schoolYear: '2025-2026',
      termName: 'Term 1'
    },
    {
      _id: '2',
      subjectName: 'English',
      sectionName: 'STEM111',
      trackName: 'Academic Track',
      strandName: 'STEM',
      gradeLevel: 'Grade 11',
      schoolYear: '2025-2026',
      termName: 'Term 1'
    }
  ];

  useEffect(() => {
    // Set mock data and pre-select the values from the image
    setFacultyAssignments(mockAssignments);
    setAcademicYear({ schoolYearStart: 2025, schoolYearEnd: 2026 });
    setCurrentTerm({ termName: 'Term 1' });
    
    // Pre-select the assignment and section as shown in the image
    setSelectedAssignment('1'); // Business Math - ABM111
    setSelectedSection(mockAssignments[0]); // ABM111 (Academic Track - ABM)
  }, []);

  const handleAssignmentSelect = (assignmentId) => {
    setSelectedAssignment(assignmentId);
    setSelectedSection('');
    setGradingData([]);
  };

  const handleSectionSelect = (assignmentId) => {
    const assignment = facultyAssignments.find(a => a._id === assignmentId);
    if (assignment) {
      setSelectedSection(assignment);
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
      
      if (allowedTypes.includes(file.type) || 
          file.name.endsWith('.xlsx') || 
          file.name.endsWith('.xls') || 
          file.name.endsWith('.csv')) {
        setExcelFile(file);
      } else {
        setValidationMessage('Please select a valid Excel file (.xlsx, .xls) or CSV file.');
        setValidationType('error');
        setShowValidationModal(true);
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

    // Mock download - just show success message
    setSuccessMessage('Template downloaded successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
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

    // Mock upload - just show success message
    setUploadLoading(true);
    setTimeout(() => {
      setSuccessMessage(`Grades uploaded successfully! File: ${excelFile.name}`);
      setExcelFile(null);
      setUploadLoading(false);
      setTimeout(() => setSuccessMessage(''), 5000);
    }, 2000);
  };

  const deleteGradingData = async (gradingDataId) => {
    if (!confirm('Are you sure you want to delete this grading data? This action cannot be undone.')) {
      return;
    }

    // Mock delete - just show success message
    setSuccessMessage('Grading data deleted successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
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
                </div>
              </div>
            </div>
          )}

          {/* Grading Data Display */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Grading Data</h3>
            {gradingData.length > 0 ? (
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