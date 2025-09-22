import Faculty_Navbar from "./Faculty_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";
import React, { useEffect, useState } from 'react';
import { useQuarter } from "../../context/QuarterContext.jsx";

/**
 * Faculty Grades Component
 * 
 * Basic structure for grade management
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Modal Component
const Modal = ({ isOpen, onClose, title, children, type = 'info' }) => {
  if (!isOpen) return null;

  const getModalStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border-2 ${getModalStyles()}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getIcon()}</span>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Faculty_Grades() {
  // Get quarter context (keeping for future use)
  const { globalQuarter: _globalQuarter, globalTerm: _globalTerm, globalAcademicYear: _globalAcademicYear } = useQuarter();
  
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [_currentFacultyID, setCurrentFacultyID] = useState(null);

  const showModal = (title, message, type = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: '', message: '', type: 'info' });
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Get current faculty ID from token (no need for separate API call)
        const token = localStorage.getItem('token');
        if (token) {
          // Decode token to get user info
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentFacultyID(payload._id);
        }

        // Fetch academic year
        const academicYearResponse = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (academicYearResponse.ok) {
          const academicYearData = await academicYearResponse.json();
          setAcademicYear(academicYearData);
          
          // Fetch active term after academic year is set (using same approach as Faculty_Dashboard)
          const schoolYearName = `${academicYearData.schoolYearStart}-${academicYearData.schoolYearEnd}`;
          const termResponse = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (termResponse.ok) {
            const terms = await termResponse.json();
            const activeTerm = terms.find((t) => t.status === "active");
            setCurrentTerm(activeTerm || null);
          } else {
            console.error('Error fetching terms:', termResponse.status, termResponse.statusText);
            setCurrentTerm(null);
          }
        }

        // Fetch classes
        const classesResponse = await fetch(`${API_BASE}/api/classes/faculty-classes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (classesResponse.ok) {
          const classesData = await classesResponse.json();
          setClasses(classesData);
        }

      } catch (error) {
        console.error('Error initializing data:', error);
        showModal('Error', 'Failed to load initial data', 'error');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []); // Remove academicYear dependency to prevent infinite loop

  const fetchSubjects = async () => {
    if (!selectedClass) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/subjects/class/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const subjectsData = await response.json();
        // Subjects data fetched but not stored in state since not used in current UI
        console.log('Subjects fetched:', subjectsData);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/students/class/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const studentsData = await response.json();
        setStudents(studentsData);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setSelectedSection(null);
    setStudents([]);
    
    if (classId) {
      fetchSubjects();
    }
  };

  const handleSectionChange = (e) => {
    const section = e.target.value;
    setSelectedSection(section);
    setStudents([]);
    
    if (section) {
      fetchStudents();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Faculty_Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr md:ml-64">
      <Faculty_Navbar />
      
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Grades</h2>
            <p className="text-base md:text-lg">
              {academicYear
                ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`
                : "Loading..."}{" "}
              | {currentTerm ? currentTerm.termName : "No active term"} |{" "}
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ProfileMenu />
          </div>
        </div>

        {/* Selection Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Select Class and Section</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class
              </label>
              <select
                value={selectedClass || ''}
                onChange={handleClassChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.className}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section
              </label>
              <select
                value={selectedSection || ''}
                onChange={handleSectionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedClass}
              >
                <option value="">Select Section</option>
                {selectedClass && classes.find(c => c._id === selectedClass)?.sections?.map((section, index) => (
                  <option key={index} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students List */}
        {selectedClass && selectedSection && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Students in {classes.find(c => c._id === selectedClass)?.className} - {selectedSection}
            </h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading students...</p>
              </div>
            ) : students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Student ID</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">{student.schoolID}</td>
                        <td className="border border-gray-300 px-4 py-2">{student.name}</td>
                        <td className="border border-gray-300 px-4 py-2">{student.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">
                <p>No students found for this class and section.</p>
              </div>
            )}
          </div>
        )}

        {/* Placeholder for future grade functionality */}
        {selectedClass && selectedSection && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Grade Management</h2>
            <div className="text-center py-8 text-gray-600">
              <p>Grade management functionality will be implemented here.</p>
              <p className="text-sm mt-2">Selected: {students.length} students in {classes.find(c => c._id === selectedClass)?.className} - {selectedSection}</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        type={modal.type}
      >
        <p>{modal.message}</p>
      </Modal>
    </div>
  );
}
