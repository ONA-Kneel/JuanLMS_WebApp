import React, { useState, useEffect } from 'react';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

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
  const [sections, setSections] = useState([]);
  const [allSections, setAllSections] = useState([]); // Store all sections
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationType, setValidationType] = useState('error');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch academic year and term
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
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { Authorization: `Bearer ${token}` }
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

  // Fetch sections for the current term
  useEffect(() => {
    async function fetchSections() {
      if (!currentTerm) return;
      try {
        const token = localStorage.getItem("token");
        console.log('Fetching sections for term:', currentTerm._id);
        console.log('API URL:', `${API_BASE}/api/terms/${currentTerm._id}/sections`);
        
        const response = await fetch(`${API_BASE}/api/terms/${currentTerm._id}/sections`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Sections response status:', response.status);
        console.log('Sections response headers:', response.headers);
        
        if (response.ok) {
          const sectionsData = await response.json();
          console.log('Fetched all sections:', sectionsData);
          setAllSections(sectionsData); // Store all sections
          setSections(sectionsData); // Initially show all sections
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch sections. Status:', response.status);
          console.error('Error response:', errorText);
          
          // Fallback: try to get all sections for the current term
          console.log('Trying fallback: fetch all sections for current term');
          const fallbackResponse = await fetch(`${API_BASE}/api/sections`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (fallbackResponse.ok) {
            const allSectionsData = await fallbackResponse.json();
            console.log('Fallback sections data:', allSectionsData);
            
            // Filter sections by current term
            const filteredSections = allSectionsData.filter(section => 
              section.termName === currentTerm.termName && 
              section.schoolYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`
            );
            console.log('Filtered sections for current term:', filteredSections);
            
            setAllSections(filteredSections);
            setSections(filteredSections);
          } else {
            console.error('Fallback also failed. Status:', fallbackResponse.status);
          }
        }
      } catch (error) {
        console.error('Failed to fetch sections:', error);
      }
    }
    fetchSections();
  }, [currentTerm, academicYear]);

  // Filter sections based on selected class
  useEffect(() => {
    if (selectedClass !== '' && allSections.length > 0) {
      const selectedClassObj = facultyClasses[selectedClass];
      if (selectedClassObj && selectedClassObj.section) {
        // Filter sections to only show those that match the selected class's section
        const filteredSections = allSections.filter(section => 
          section.sectionName === selectedClassObj.section
        );
        console.log('Filtering sections for class:', selectedClassObj.className);
        console.log('Class section:', selectedClassObj.section);
        console.log('Filtered sections:', filteredSections);
        setSections(filteredSections);
      } else {
        // If no section found, show all sections
        setSections(allSections);
      }
    } else {
      // If no class selected, show all sections
      setSections(allSections);
    }
  }, [selectedClass, allSections, facultyClasses]);

  // Fetch faculty classes with sections and assignments
  const fetchFacultyClasses = async () => {
    try {
      setLoading(true);
      console.log('Fetching faculty classes...');
      
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Faculty classes data:', data);
        console.log('Number of classes:', data.length);
        
        // Filter classes: only show active classes for current faculty in current term
        const currentFacultyID = localStorage.getItem("userID");
        let filteredClasses = [];
        
        if (academicYear && currentTerm) {
          filteredClasses = data.filter(cls => 
            cls.facultyID === currentFacultyID && 
            cls.isArchived !== true &&
            cls.academicYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` &&
            cls.termName === currentTerm.termName
          );
          console.log('Filtered classes by term:', filteredClasses);
        }
        
        if (filteredClasses.length > 0) {
          console.log('First class:', filteredClasses[0]);
        }
        setFacultyClasses(filteredClasses);
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

  // Only fetch classes when we have both academic year and term
  useEffect(() => {
    if (academicYear && currentTerm) {
      fetchFacultyClasses();
    }
  }, [academicYear, currentTerm]);

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
      const selectedClassObj = facultyClasses[selectedClass];
      if (!selectedClassObj) {
        setValidationMessage('Selected class not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      // For now, show a message that this feature needs to be implemented
      // since we don't have the detailed assignment/quiz data in the current class structure
      setValidationMessage('Grade export feature will be implemented once assignment and quiz data is integrated with the class structure.');
      setValidationType('info');
      setShowValidationModal(true);

    } catch (error) {
      console.error('Error exporting grades:', error);
      setValidationMessage(`Error exporting grades: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setExportLoading(false);
    }
  };

  // Add effect to log state changes for debugging
  useEffect(() => {
    console.log('State updated:', {
      facultyClasses: facultyClasses.length,
      selectedClass,
      selectedSection
    });
  }, [facultyClasses, selectedClass, selectedSection]);

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
      const selectedClassObj = facultyClasses[selectedClass];
      if (!selectedClassObj) {
        setValidationMessage('Selected class not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      // For now, show a message that this feature needs to be implemented
      setValidationMessage('Template download feature will be implemented once student data is integrated with the class structure.');
      setValidationType('info');
      setShowValidationModal(true);

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
      const selectedClassObj = facultyClasses[selectedClass];
      if (!selectedClassObj) {
        setValidationMessage('Selected class not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      // For now, show a message that this feature needs to be implemented
      setValidationMessage('Grade upload feature will be implemented once the backend integration is complete.');
      setValidationType('info');
      setShowValidationModal(true);

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
      const selectedClassObj = facultyClasses[selectedClass];
      if (!selectedClassObj) {
        setValidationMessage('Selected class not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      // For now, show a message that this feature needs to be implemented
      setValidationMessage('Student debug feature will be implemented once student data is integrated with the class structure.');
      setValidationType('info');
      setShowValidationModal(true);

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
              <p className="text-lg font-semibold text-gray-900">
                {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Loading...'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Term</label>
              <p className="text-lg font-semibold text-gray-900">
                {currentTerm ? currentTerm.termName : 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {/* Class Selection */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Select Class</h3>
          <div className="flex gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject (Class):</label>
              <select 
                className="border rounded px-3 py-2 min-w-[200px]"
                value={selectedClass || ""}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection(''); // Reset section when class changes
                }}
              >
                <option value="">Select a subject</option>
                {facultyClasses.map((cls, index) => (
                  <option key={cls.classID} value={index}>
                    {cls.className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Section:</label>
              <select 
                className="border rounded px-3 py-2 min-w-[200px]"
                value={selectedSection || ""}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                <option value="">Select a section</option>
                {sections.map((section) => (
                  <option key={section._id} value={section.sectionName}>
                    {section.sectionName} ({section.trackName} - {section.strandName})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Debug Info */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <p><strong>Selected Subject:</strong> {selectedClass !== '' ? facultyClasses[selectedClass]?.className : 'None'}</p>
            <p><strong>Selected Section:</strong> {selectedSection || 'None'}</p>
            <p><strong>Class Section:</strong> {selectedClass !== '' ? facultyClasses[selectedClass]?.section || 'None' : 'None'}</p>
            <p><strong>Class Code:</strong> {selectedClass !== '' ? facultyClasses[selectedClass]?.classCode : 'None'}</p>
            <p><strong>Total Classes:</strong> {facultyClasses.length}</p>
            <p><strong>Total Sections Available:</strong> {sections.length}</p>
            <p><strong>All Sections:</strong> {allSections.length}</p>
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            <p><strong>Academic Year:</strong> {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Loading...'}</p>
            <p><strong>Current Term:</strong> {currentTerm ? currentTerm.termName : 'Loading...'}</p>
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
            {import.meta.env.MODE === 'development' && (
              <div className="mt-4 p-4 bg-gray-100 rounded-md text-sm">
                <h4 className="font-semibold mb-2">Debug Info:</h4>
                <p>Selected Class: {selectedClass !== '' ? facultyClasses[selectedClass]?.className : 'None'}</p>
                <p>Selected Section: {selectedSection || 'None'}</p>
                <p>Class Section: {selectedClass !== '' ? facultyClasses[selectedClass]?.section || 'None' : 'None'}</p>
                <p>Class Code: {selectedClass !== '' ? facultyClasses[selectedClass]?.classCode : 'None'}</p>
                <p>Total Classes: {facultyClasses.length}</p>
                <p>Total Sections Available: {sections.length}</p>
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