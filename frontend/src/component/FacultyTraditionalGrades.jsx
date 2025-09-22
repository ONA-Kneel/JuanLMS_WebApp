import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './FacultyTraditionalGrades.css';
import ValidationModal from './ValidationModal';

const FacultyTraditionalGrades = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  useEffect(() => {
    const initializeData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch academic year
        const academicYearResponse = await axios.get('/api/schoolyears/active', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAcademicYear(academicYearResponse.data);
        
        // Fetch active term after academic year is set (using same approach as Faculty_Dashboard)
        const schoolYearName = `${academicYearResponse.data.schoolYearStart}-${academicYearResponse.data.schoolYearEnd}`;
        const termResponse = await axios.get(`/api/terms/schoolyear/${schoolYearName}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const terms = termResponse.data;
        const activeTerm = terms.find((t) => t.status === "active");
        setCurrentTerm(activeTerm || null);
        
        // Fetch faculty classes
        const classesResponse = await axios.get('/api/classes/faculty-classes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClasses(classesResponse.data);
        
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchStudents();
    }
  }, [selectedClass, selectedSubject]);


  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/subjects/class/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubjects(response.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/students/class/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const showValidationModal = (type, title, message) => {
    setValidationModal({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeValidationModal = () => {
    setValidationModal({
      isOpen: false,
      type: 'error',
      title: '',
      message: ''
    });
  };

  return (
    <div className="faculty-traditional-grades">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Faculty Traditional Grades</h1>
        
        {/* Selection Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Select Class and Subject</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year
              </label>
              <input
                type="text"
                value={academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Term
              </label>
              <input
                type="text"
                value={currentTerm ? currentTerm.termName : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
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
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedClass}
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.subjectCode} - {subject.subjectName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students List */}
        {selectedClass && selectedSubject && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Students in {subjects.find(s => s._id === selectedSubject)?.subjectCode}
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
                <p>No students found for this class and subject.</p>
              </div>
            )}
          </div>
        )}

        {/* Placeholder for future grade functionality */}
        {selectedClass && selectedSubject && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Grade Management</h2>
            <div className="text-center py-8 text-gray-600">
              <p>Grade management functionality will be implemented here.</p>
              <p className="text-sm mt-2">Selected: {students.length} students in {subjects.find(s => s._id === selectedSubject)?.subjectCode}</p>
            </div>
          </div>
        )}
      </div>

      {/* Validation Modal */}
      <ValidationModal
        isOpen={validationModal.isOpen}
        onClose={closeValidationModal}
        type={validationModal.type}
        title={validationModal.title}
        message={validationModal.message}
      />
    </div>
  );
};

export default FacultyTraditionalGrades;