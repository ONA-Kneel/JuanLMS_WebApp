import React, { useState, useEffect } from 'react';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GradingSystem() {
  const [facultyClasses, setFacultyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState('');
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

  // Fetch faculty classes with sections and assignments
  const fetchFacultyClasses = async () => {
    try {
      setLoading(true);
      console.log('Fetching faculty classes...');
      
      const response = await fetch(`${API_BASE}/api/grading/faculty-classes-alt/${localStorage.getItem('userId') || 'me'}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Faculty classes data:', data);
        console.log('Classes array:', data.classes);
        console.log('Number of classes:', data.classes?.length || 0);
        if (data.classes && data.classes.length > 0) {
          console.log('First class:', data.classes[0]);
          console.log('First class sections:', data.classes[0].sections);
        }
        setFacultyClasses(data.classes || []);
      } else {
        console.error('Failed to fetch faculty classes');
        setValidationMessage('Failed to fetch faculty classes');
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error('Error fetching faculty classes:', error);
      setValidationMessage(`Error fetching faculty classes: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch grading data for selected assignment
  const fetchGradingData = async (assignmentId) => {
    if (!assignmentId) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/grading/data/${assignmentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGradingData(data.gradingData || []);
      } else {
        setGradingData([]);
      }
    } catch (error) {
      console.error('Error fetching grading data:', error);
      setGradingData([]);
    }
  };

  useEffect(() => {
    fetchFacultyClasses();
  }, []);

  // Add effect to log state changes for debugging
  useEffect(() => {
    console.log('State updated:', {
      facultyClasses: facultyClasses.length,
      selectedClass,
      selectedSection,
      selectedAssignment
    });
  }, [facultyClasses, selectedClass, selectedSection, selectedAssignment]);

  const handleClassSelect = (classIndex) => {
    setSelectedClass(classIndex);
    setSelectedSection('');
    setSelectedAssignment('');
    setGradingData([]);
  };

  const handleSectionSelect = (sectionIndex) => {
    setSelectedSection(sectionIndex);
    setSelectedAssignment('');
    setGradingData([]);
  };

  const handleAssignmentSelect = (assignmentId) => {
    setSelectedAssignment(assignmentId);
    fetchGradingData(assignmentId);
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
      const selectedAssignmentObj = facultyClasses[selectedClass]?.sections[selectedSection]?.assignments.find(a => a._id === selectedAssignment);
      if (!selectedAssignmentObj) {
        setValidationMessage('Selected assignment not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      const response = await fetch(`${API_BASE}/api/grading/template/${selectedAssignment}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grading_template_${selectedAssignmentObj.title}.xlsx`;
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
      setValidationMessage(`Error downloading template: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    }
  };

  const uploadGrades = async () => {
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
      const selectedAssignmentObj = facultyClasses[selectedClass]?.sections[selectedSection]?.assignments.find(a => a._id === selectedAssignment);
      if (!selectedAssignmentObj) {
        setValidationMessage('Selected assignment not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      // Get section details from the selected class
      const selectedSectionObj = facultyClasses[selectedClass]?.sections[selectedSection];
      if (!selectedSectionObj) {
        setValidationMessage('Selected section not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      formData.append('sectionName', selectedSectionObj.sectionName);
      formData.append('trackName', selectedSectionObj.trackName);
      formData.append('strandName', selectedSectionObj.strandName);
      formData.append('gradeLevel', selectedSectionObj.gradeLevel);
      formData.append('schoolYear', selectedSectionObj.schoolYear);
      formData.append('termName', selectedSectionObj.termName);

      console.log('Uploading file:', excelFile.name);
      console.log('Form data:', {
        sectionName: selectedSectionObj.sectionName,
        trackName: selectedSectionObj.trackName,
        strandName: selectedSectionObj.strandName,
        gradeLevel: selectedSectionObj.gradeLevel,
        schoolYear: selectedSectionObj.schoolYear,
        termName: selectedSectionObj.termName
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
      const selectedSectionObj = facultyClasses[selectedClass]?.sections[selectedSection];
      if (!selectedSectionObj) {
        setValidationMessage('Selected section not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      const response = await fetch(`${API_BASE}/api/grading/debug/students/${selectedSectionObj.sectionName}?trackName=${selectedSectionObj.trackName}&strandName=${selectedSectionObj.strandName}&gradeLevel=${selectedSectionObj.gradeLevel}&schoolYear=${selectedSectionObj.schoolYear}&termName=${selectedSectionObj.termName}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Debug students response:', data);
        setSuccessMessage(`Found ${data.students.length} students in section ${selectedSectionObj.sectionName}`);
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const errorData = await response.json();
        setValidationMessage(errorData.message || 'Failed to debug students');
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

  const deleteGradingData = async (gradingDataId) => {
    if (!confirm('Are you sure you want to delete this grading data?')) {
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
      setValidationMessage(`Error deleting grading data: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Faculty_Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-gray-600 text-lg">Loading faculty classes...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no classes found
  if (!loading && facultyClasses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Faculty_Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Grades</h1>
            <p className="text-gray-600">
              Upload Excel files containing student grades for your assignments
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center py-8">
              <p className="text-gray-600 text-lg mb-4">
                No classes found for this faculty member.
              </p>
              <p className="text-gray-500 mb-4">
                Please contact your administrator to assign classes to your account.
              </p>
              <button
                onClick={fetchFacultyClasses}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Refresh Classes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Faculty_Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Grades</h1>
          <p className="text-gray-600">
            Upload Excel files containing student grades for your assignments
          </p>
        </div>

        {/* Current Academic Period */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Current Academic Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Academic Year</label>
              <p className="text-lg font-semibold text-gray-900">2025-2026</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Term</label>
              <p className="text-lg font-semibold text-gray-900">Term 1</p>
            </div>
          </div>
        </div>

        {/* Class Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Select Class</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => handleClassSelect(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Select a class</option>
                {facultyClasses.map((cls, index) => (
                  <option key={index} value={index}>
                    {cls.subjectName || cls.className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => handleSectionSelect(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedClass}
              >
                <option value="">Select a section</option>
                {facultyClasses[selectedClass]?.sections?.map((section, index) => (
                  <option key={index} value={index}>
                    {section.sectionName} ({section.trackName} - {section.strandName})
                  </option>
                )) || []}
              </select>
            </div>
          </div>
        </div>

        {/* Assignment Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Select Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assignment</label>
              <select
                value={selectedAssignment}
                onChange={(e) => handleAssignmentSelect(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-500"
                disabled={!selectedSection}
              >
                <option value="">Select an assignment</option>
                {facultyClasses[selectedClass]?.sections[selectedSection]?.assignments?.map((assignment) => (
                  <option key={assignment._id} value={assignment._id}>
                    {assignment.title} ({assignment.type})
                  </option>
                )) || []}
              </select>
              {selectedSection && facultyClasses[selectedClass]?.sections[selectedSection]?.assignments?.length === 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  No assignments found for this section. Please contact your administrator.
                </p>
              )}
            </div>
            <div className="flex items-end">
              <button
                onClick={downloadTemplate}
                disabled={!selectedSection}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Download Template
              </button>
            </div>
          </div>
          
          {/* Debug Information */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md text-sm">
              <h4 className="font-semibold mb-2">Debug Info:</h4>
              <p>Selected Class: {selectedClass !== '' ? facultyClasses[selectedClass]?.subjectName : 'None'}</p>
              <p>Selected Section: {selectedSection !== '' ? facultyClasses[selectedClass]?.sections[selectedSection]?.sectionName : 'None'}</p>
              <p>Assignments Count: {facultyClasses[selectedClass]?.sections[selectedSection]?.assignments?.length || 0}</p>
              <p>Total Classes: {facultyClasses.length}</p>
              <p>Total Sections: {facultyClasses[selectedClass]?.sections?.length || 0}</p>
            </div>
          )}
        </div>

        {/* Upload Grading File */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Upload Grading File</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Excel File</label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedAssignment || !selectedSection}
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload an Excel file with columns: Student Name, Grade, Feedback (optional).
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={uploadGrades}
                disabled={!excelFile || !selectedAssignment || !selectedSection}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {uploadLoading ? 'Uploading...' : 'Upload Grades'}
              </button>
              
              <button
                onClick={debugStudents}
                disabled={!selectedSection}
                className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Debug Students
              </button>
            </div>
          </div>
        </div>

        {/* Grading Data */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Grading Data</h3>
          {gradingData.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gradingData.map((grade) => (
                    <tr key={grade._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {grade.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grade.grade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grade.feedback || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteGradingData(grade._id)}
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
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">
                {selectedAssignment && selectedSection 
                  ? `No grading data available for ${facultyClasses[selectedClass]?.sections[selectedSection]?.sectionName}`
                  : 'Select a class, section, and assignment to view grading data'
                }
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Upload an Excel file to see grading data here.
              </p>
            </div>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-50">
            {successMessage}
          </div>
        )}

        {/* Validation Modal */}
        <ValidationModal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          message={validationMessage}
          type={validationType}
        />
      </div>
    </div>
  );
} 