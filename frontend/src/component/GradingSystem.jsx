import React, { useState, useEffect } from 'react';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GradingSystem() {
  const [facultyClasses, setFacultyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
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

  // Export all grades for the selected section
  const exportAllGrades = async () => {
    if (!selectedSection) {
      setValidationMessage('Please select a section first.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }

    try {
      setExportLoading(true);
      const selectedSectionObj = facultyClasses[selectedClass]?.sections[selectedSection];
      if (!selectedSectionObj) {
        setValidationMessage('Selected section not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      // Get all assignments, activities, and quizzes for this section
      const assignments = selectedSectionObj.assignments || [];
      const activities = selectedSectionObj.activities || [];
      const quizzes = selectedSectionObj.quizzes || [];

      if (assignments.length === 0 && activities.length === 0 && quizzes.length === 0) {
        setValidationMessage('No assignments, activities, or quizzes found for this section.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      // Fetch all grades for this section
      const token = localStorage.getItem('token');
      const allGrades = [];

      // Fetch grades for assignments
      for (const assignment of assignments) {
        try {
          const response = await fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
            const submissions = await response.json();
            submissions.forEach(submission => {
              if (submission.grade !== undefined) {
                allGrades.push({
                  type: 'Assignment',
                  title: assignment.title,
                  studentName: submission.studentName || 'Unknown Student',
                  studentId: submission.student,
                  grade: submission.grade,
                  feedback: submission.feedback || '',
                  submittedAt: submission.submittedAt,
                  status: submission.status
                });
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching grades for assignment ${assignment._id}:`, error);
        }
      }

      // Fetch grades for activities (if they have a different endpoint)
      for (const activity of activities) {
        try {
          const response = await fetch(`${API_BASE}/assignments/${activity._id}/submissions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
            const submissions = await response.json();
            submissions.forEach(submission => {
              if (submission.grade !== undefined) {
                allGrades.push({
                  type: 'Activity',
                  title: activity.title,
                  studentName: submission.studentName || 'Unknown Student',
                  studentId: submission.student,
                  grade: submission.grade,
                  feedback: submission.feedback || '',
                  submittedAt: submission.submittedAt,
                  status: submission.status
                });
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching grades for activity ${activity._id}:`, error);
        }
      }

      // Fetch grades for quizzes
      for (const quiz of quizzes) {
        try {
          const response = await fetch(`${API_BASE}/api/quizzes/${quiz._id}/responses`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
            const responses = await response.json();
            responses.forEach(response => {
              if (response.grade !== undefined) {
                allGrades.push({
                  type: 'Quiz',
                  title: quiz.title,
                  studentName: response.studentName || 'Unknown Student',
                  studentId: response.student,
                  grade: response.grade,
                  feedback: response.feedback || '',
                  submittedAt: response.submittedAt,
                  status: response.status
                });
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching grades for quiz ${quiz._id}:`, error);
        }
      }

      if (allGrades.length === 0) {
        setValidationMessage('No graded submissions found for this section.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      // Create CSV content
      const csvHeader = 'Type,Title,Student Name,Student ID,Grade,Feedback,Submitted At,Status\n';
      const csvRows = allGrades.map(grade => {
        const submittedAt = grade.submittedAt ? new Date(grade.submittedAt).toLocaleDateString() : '';
        return `"${grade.type}","${grade.title}","${grade.studentName}","${grade.studentId}","${grade.grade}","${grade.feedback}","${submittedAt}","${grade.status}"`;
      }).join('\n');

      const csvContent = csvHeader + csvRows;

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grades_${selectedSectionObj.sectionName}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage(`Successfully exported ${allGrades.length} grades for ${selectedSectionObj.sectionName}!`);
      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      console.error('Error exporting grades:', error);
      setValidationMessage(`Error exporting grades: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setExportLoading(false);
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
      selectedSection
    });
  }, [facultyClasses, selectedClass, selectedSection]);

  const handleClassSelect = (classIndex) => {
    setSelectedClass(classIndex);
    setSelectedSection('');
  };

  const handleSectionSelect = (sectionIndex) => {
    setSelectedSection(sectionIndex);
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

      // Get students in the section
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/grading/debug/students/${selectedSectionObj.sectionName}?trackName=${selectedSectionObj.trackName}&strandName=${selectedSectionObj.strandName}&gradeLevel=${selectedSectionObj.gradeLevel}&schoolYear=${selectedSectionObj.schoolYear}&termName=${selectedSectionObj.termName}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create CSV template with all students
        const csvHeader = 'Student Name,Student ID,Assignment/Activity/Quiz,Grade,Feedback\n';
        const csvRows = data.students.map(student => {
          return `"${student.firstname} ${student.lastname}","${student._id}","","",""`;
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        // Create and download the template
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grading_template_${selectedSectionObj.sectionName}.csv`;
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
    if (!selectedSection) {
      setValidationMessage('Please select a section first.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('excelFile', excelFile);

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

      // For now, we'll use a generic upload endpoint
      // You may need to create a new endpoint for bulk grade uploads
      const response = await fetch(`${API_BASE}/api/grading/upload-bulk`, {
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
        setSuccessMessage(`Grades uploaded successfully! ${data.data?.totalProcessed || 0} students processed.`);
        setExcelFile(null);
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
              Export and manage grades for your assignments, activities, and quizzes
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
            Export and manage grades for your assignments, activities, and quizzes
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

        {/* Export All Grades */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Export All Grades</h3>
          <div className="space-y-4">
            <p className="text-gray-600">
              Export all grades for assignments, activities, and quizzes in the selected section.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-end">
                <button
                  onClick={exportAllGrades}
                  disabled={!selectedSection || exportLoading}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {exportLoading ? 'Exporting...' : 'Export All Grades'}
                </button>
              </div>
              <div className="flex items-end">
                <button
                  onClick={downloadTemplate}
                  disabled={!selectedSection}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
                <p>Activities Count: {facultyClasses[selectedClass]?.sections[selectedSection]?.activities?.length || 0}</p>
                <p>Quizzes Count: {facultyClasses[selectedClass]?.sections[selectedSection]?.quizzes?.length || 0}</p>
                <p>Total Classes: {facultyClasses.length}</p>
                <p>Total Sections: {facultyClasses[selectedClass]?.sections?.length || 0}</p>
              </div>
            )}
          </div>
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
                disabled={!selectedSection}
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload an Excel file with columns: Student Name, Student ID, Assignment/Activity/Quiz, Grade, Feedback (optional).
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={uploadGrades}
                disabled={!excelFile || !selectedSection}
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