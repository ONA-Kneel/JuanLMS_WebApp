import Faculty_Navbar from "./Faculty_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";
import React, { useEffect, useState } from 'react';
import GradingSystem from '../GradingSystem';

/**
 * Faculty Grades Component
 * 
 * Features:
 * - Grading Table: Class-based grade management with student selection
 * - Excel Grading System: Bulk grade management
 * - Individual Student Grade Management: Select specific students to manage their grades
 * - File Upload: Upload grades via CSV/Excel files for individual students
 * - Real-time Grade Calculation: Automatic calculation of final grades and remarks
 */

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Faculty_Grades() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [activeTab, setActiveTab] = useState('traditional'); // 'traditional' or 'excel'
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState({});
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [studentGrades, setStudentGrades] = useState({});
  const [uploadingStudentGrades, setUploadingStudentGrades] = useState(false);
  const [selectedStudentFile, setSelectedStudentFile] = useState(null);
  const [showIndividualManagement, setShowIndividualManagement] = useState(false);
  

  const currentFacultyID = localStorage.getItem("userID");

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

  useEffect(() => {
    async function fetchClasses() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/classes`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await res.json();
        
        // Filter classes: only show classes created by current faculty in current term
        const filtered = data.filter(cls => 
          cls.facultyID === currentFacultyID && 
          cls.isArchived !== true &&
          cls.academicYear === `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}` &&
          cls.termName === currentTerm?.termName
        );
        
        setClasses(filtered);
        console.log("Faculty Grades - Filtered classes:", filtered);
        // Log class details including sections
        filtered.forEach(cls => {
          console.log(`Class: ${cls.className}, Section: ${cls.section}, Class Code: ${cls.classCode}`);
        });
      } catch (err) {
        console.error("Failed to fetch classes", err);
      } finally {
        setLoading(false);
      }
    }
    
    // Only fetch classes when we have both academic year and term
    if (academicYear && currentTerm) {
      fetchClasses();
    }
  }, [currentFacultyID, academicYear, currentTerm]);

  useEffect(() => {
    if (selectedClass !== null) {
      fetchSubjects();
      fetchStudents();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass !== null && selectedSection) {
      // Filter students by section if needed
      // This will be handled in the render logic
    }
  }, [selectedClass, selectedSection]);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const selectedClassObj = classes[selectedClass];
      
      // Try to fetch subjects for the selected class
      try {
        const response = await fetch(`${API_BASE}/api/classes/${selectedClassObj.classID}/subjects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.subjects) {
            setSubjects(data.subjects);
          } else {
            // Create default subjects based on class
            createDefaultSubjects();
          }
        } else {
          createDefaultSubjects();
        }
      } catch {
        console.log('Subjects endpoint failed, creating defaults');
        createDefaultSubjects();
      }
    } catch {
      console.error('Error fetching subjects');
      createDefaultSubjects();
    }
  };

  const createDefaultSubjects = () => {
    const selectedClassObj = classes[selectedClass];
    const defaultSubjects = [
      {
        _id: 'subject_1',
        subjectCode: selectedClassObj.className,
        subjectDescription: selectedClassObj.className,
        trackName: selectedClassObj.trackName || 'STEM',
        gradeLevel: selectedClassObj.gradeLevel || '12'
      }
    ];
    setSubjects(defaultSubjects);
    
    // Initialize grades for default subjects based on current term
    const initialGrades = {};
    defaultSubjects.forEach(subject => {
      if (currentTerm?.termName === 'Term 1') {
        initialGrades[subject._id] = {
          quarter1: '',
          quarter2: '',
          semesterFinal: ''
        };
      } else if (currentTerm?.termName === 'Term 2') {
        initialGrades[subject._id] = {
          quarter3: '',
          quarter4: '',
          semesterFinal: ''
        };
      } else {
        // Default fallback
        initialGrades[subject._id] = {
          quarter1: '',
          quarter2: '',
          semesterFinal: ''
        };
      }
    });
    setGrades(initialGrades);
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const selectedClassObj = classes[selectedClass];
      
      // Try multiple endpoints to get students
      let studentsData = [];
      
      try {
        // Try class members endpoint first
        const response = await fetch(`${API_BASE}/classes/${selectedClassObj.classID}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.students) {
            studentsData = data.students;
          }
        }
      } catch {
        console.log('Class members endpoint failed, trying alternatives');
      }
      
      // If no students found, try alternative endpoints
      if (studentsData.length === 0) {
        try {
          const altResponse = await fetch(`${API_BASE}/api/students/class/${selectedClassObj.classCode || selectedClassObj.classID}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (altResponse.ok) {
            const data = await altResponse.json();
            if (data) {
              studentsData = data;
            }
          }
        } catch {
          console.log('Alternative endpoint also failed');
        }
      }
      
      // Transform students data to include grades structure
      const transformedStudents = studentsData.map(student => {
        let gradesStructure = {};
        
        if (currentTerm?.termName === 'Term 1') {
          gradesStructure = {
            quarter1: '',
            quarter2: '',
            semesterFinal: '',
            remarks: ''
          };
        } else if (currentTerm?.termName === 'Term 2') {
          gradesStructure = {
            quarter3: '',
            quarter4: '',
            semesterFinal: '',
            remarks: ''
          };
        } else {
          // Default structure
          gradesStructure = {
            quarter1: '',
            quarter2: '',
            semesterFinal: '',
            remarks: ''
          };
        }
        
        return {
          _id: student._id || student.userID || student.studentID,
          name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
          schoolID: student.schoolID || student.userID || student.studentID,
          section: student.section || student.sectionName || 'default',
          grades: gradesStructure
        };
      });
      
      setStudents(transformedStudents);
    } catch {
      console.error('Error fetching students');
      setStudents([]);
    }
  };

  const handleClassChange = (e) => {
    const classIndex = parseInt(e.target.value);
    setSelectedClass(classIndex);
    
    // Reset section selection to null when class changes
    setSelectedSection(null);
    
    setSubjects([]);
    setGrades({});
    setStudents([]);
    setSelectedStudent(null);
    setSelectedStudentName('');
    setStudentGrades({});
    setShowIndividualManagement(false);
  };

  const handleSectionChange = (e) => {
    const section = e.target.value;
    setSelectedSection(section);
    setSelectedStudent(null);
    setSelectedStudentName('');
    setStudentGrades({});
    setShowIndividualManagement(false);
  };



  const handleStudentGradeChange = (field, value) => {
    setStudentGrades(prevGrades => {
      const updatedGrades = {
        ...prevGrades,
        [field]: value
      };
      
      // Calculate semester final grade based on current term
      if (currentTerm?.termName === 'Term 1') {
        // Term 1: Calculate average of Q1 and Q2
        if (field === 'quarter1' || field === 'quarter2') {
          const quarter1 = field === 'quarter1' ? value : prevGrades.quarter1;
          const quarter2 = field === 'quarter2' ? value : prevGrades.quarter2;
          
          if (quarter1 && quarter2) {
            const q1Num = parseFloat(quarter1) || 0;
            const q2Num = parseFloat(quarter2) || 0;
            
            const semesterGrade = (q1Num + q2Num) / 2;
            const remarks = semesterGrade >= 75 ? 'PASSED' : 'FAILED';
            
            updatedGrades.semesterFinal = semesterGrade.toFixed(2);
            updatedGrades.remarks = remarks;
          }
        }
      } else if (currentTerm?.termName === 'Term 2') {
        // Term 2: Calculate average of Q3 and Q4
        if (field === 'quarter3' || field === 'quarter4') {
          const quarter3 = field === 'quarter3' ? value : prevGrades.quarter3;
          const quarter4 = field === 'quarter4' ? value : prevGrades.quarter4;
          
          if (quarter3 && quarter4) {
            const q3Num = parseFloat(quarter3) || 0;
            const q4Num = parseFloat(quarter4) || 0;
            
            const semesterGrade = (q3Num + q4Num) / 2;
            const remarks = semesterGrade >= 75 ? 'PASSED' : 'FAILED';
            
            updatedGrades.semesterFinal = semesterGrade.toFixed(2);
            updatedGrades.remarks = remarks;
          }
        }
      } else {
        // Default: Calculate average of Q1 and Q2 (fallback)
        if (field === 'quarter1' || field === 'quarter2') {
          const quarter1 = field === 'quarter1' ? value : prevGrades.quarter1;
          const quarter2 = field === 'quarter2' ? value : prevGrades.quarter2;
          
          if (quarter1 && quarter2) {
            const q1Num = parseFloat(quarter1) || 0;
            const q2Num = parseFloat(quarter2) || 0;
            
            const semesterGrade = (q1Num + q2Num) / 2;
            const remarks = semesterGrade >= 75 ? 'PASSED' : 'FAILED';
            
            updatedGrades.semesterFinal = semesterGrade.toFixed(2);
            updatedGrades.remarks = remarks;
          }
        }
      }
      
      return updatedGrades;
    });
    
    // Also update the main grades state to sync with the table
    if (selectedStudentName) {
      // Find the student by name to get their ID
      const student = students.find(s => s.name === selectedStudentName);
      if (student) {
        setGrades(prevGrades => ({
          ...prevGrades,
          [student._id]: {
            ...prevGrades[student._id],
            [field]: value
          }
        }));
      }
    }
  };

  const handleStudentFileSelect = (e) => {
    setSelectedStudentFile(e.target.files[0]);
  };

  const uploadStudentGrades = async () => {
    if (!selectedStudentFile || !selectedStudentName || !selectedClass) {
      alert('Please select a file, student, and class first');
      return;
    }

    try {
      setUploadingStudentGrades(true);
      const token = localStorage.getItem("token");
      // Find the student by name to get their ID
      const student = students.find(s => s.name === selectedStudentName);
      if (!student) {
        alert('Student not found');
        return;
      }
      
      const formData = new FormData();
      formData.append('file', selectedStudentFile);
      formData.append('studentId', student._id);
      formData.append('classId', classes[selectedClass].classID);

      const response = await fetch(`${API_BASE}/api/traditional-grades/faculty/upload-student`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message || 'Student grades uploaded successfully!');
        setSelectedStudentFile(null);
        document.getElementById('student-file-input').value = '';
        
        // Refresh students list to show updated grades
        fetchStudents();
      } else {
        const errorData = await response.json();
        alert(`Failed to upload grades: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading student grades:', error);
      alert('Failed to upload grades. Please try again.');
    } finally {
      setUploadingStudentGrades(false);
    }
  };

  const saveStudentGrades = async () => {
    if (!selectedStudentName || !selectedClass) {
      alert('Please select a student and class first');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const selectedClassObj = classes[selectedClass];
      
      // Find the student by name to get their ID
      const student = students.find(s => s.name === selectedStudentName);
      if (!student) {
        alert('Student not found');
        return;
      }
      
      const gradesData = {
        studentId: student._id,
        classId: selectedClassObj.classID,
        academicYear: `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`,
        termName: currentTerm?.termName,
        facultyID: currentFacultyID,
        grades: studentGrades
      };

      const response = await fetch(`${API_BASE}/api/traditional-grades/faculty/update-student`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gradesData)
      });

      if (response.ok) {
        alert('Student grades saved successfully!');
        // Update local state
        const updatedStudents = students.map(student => {
          if (student.name === selectedStudentName) {
            return { 
              ...student, 
              grades: {
                ...student.grades,
                ...studentGrades
              }
            };
          }
          return student;
        });
        setStudents(updatedStudents);
      } else {
        const errorData = await response.json();
        alert(`Failed to save grades: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving student grades:', error);
      alert('Failed to save grades. Please try again.');
    }
  };

  const handleGradeChange = (subjectId, quarter, value) => {
    setGrades(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [quarter]: value
      }
    }));
  };

  const calculateSemesterGrade = (quarter1, quarter2) => {
    if (!quarter1 || !quarter2) return '';
    
    const q1 = parseFloat(quarter1) || 0;
    const q2 = parseFloat(quarter2) || 0;
    
    const semesterGrade = (q1 + q2) / 2;
    return semesterGrade.toFixed(2);
  };

  const calculateGeneralAverage = (quarter) => {
    const validGrades = subjects
      .map(subject => {
        const subjectGrades = grades[subject._id];
        if (!subjectGrades) return null;
        
        if (currentTerm?.termName === 'Term 1') {
          if (quarter === 'quarter1') return parseFloat(subjectGrades.quarter1) || null;
          if (quarter === 'quarter2') return parseFloat(subjectGrades.quarter2) || null;
        } else if (currentTerm?.termName === 'Term 2') {
          if (quarter === 'quarter3') return parseFloat(subjectGrades.quarter3) || null;
          if (quarter === 'quarter4') return parseFloat(subjectGrades.quarter4) || null;
        } else {
          // Default fallback
          if (quarter === 'quarter1') return parseFloat(subjectGrades.quarter1) || null;
          if (quarter === 'quarter2') return parseFloat(subjectGrades.quarter2) || null;
        }
        
        if (quarter === 'semesterFinal') return parseFloat(subjectGrades.semesterFinal) || null;
        return null;
      })
      .filter(grade => grade !== null);
    
    if (validGrades.length === 0) return '';
    
    const average = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
    return average.toFixed(2);
  };



  // Download current grades as CSV
  const downloadGrades = () => {
    if (!selectedClass || subjects.length === 0) return;
    
    const selectedClassObj = classes[selectedClass];
    let csvContent = '';
    
    if (currentTerm?.termName === 'Term 1') {
      csvContent = 'Subject Code,Subject Description,1st Quarter,2nd Quarter,Semester Final Grade\n';
      subjects.forEach(subject => {
        const subjectGrades = grades[subject._id] || {};
        csvContent += `${subject.subjectCode},${subject.subjectDescription},${subjectGrades.quarter1 || ''},${subjectGrades.quarter2 || ''},${subjectGrades.semesterFinal || ''}\n`;
      });
      csvContent += `General Average,,${calculateGeneralAverage('quarter1')},${calculateGeneralAverage('quarter2')},${calculateGeneralAverage('semesterFinal')}\n`;
    } else if (currentTerm?.termName === 'Term 2') {
      csvContent = 'Subject Code,Subject Description,3rd Quarter,4th Quarter,Semester Final Grade\n';
      subjects.forEach(subject => {
        const subjectGrades = grades[subject._id] || {};
        csvContent += `${subject.subjectCode},${subject.subjectDescription},${subjectGrades.quarter3 || ''},${subjectGrades.quarter4 || ''},${subjectGrades.semesterFinal || ''}\n`;
      });
      csvContent += `General Average,,${calculateGeneralAverage('quarter3')},${calculateGeneralAverage('quarter4')},${calculateGeneralAverage('semesterFinal')}\n`;
    } else {
      // Default fallback
      csvContent = 'Subject Code,Subject Description,Quarter 1,Quarter 2,Semester Final Grade\n';
      subjects.forEach(subject => {
        const subjectGrades = grades[subject._id] || {};
        csvContent += `${subject.subjectCode},${subject.subjectDescription},${subjectGrades.quarter1 || ''},${subjectGrades.quarter2 || ''},${subjectGrades.semesterFinal || ''}\n`;
      });
      csvContent += `General Average,,${calculateGeneralAverage('quarter1')},${calculateGeneralAverage('quarter2')},${calculateGeneralAverage('semesterFinal')}\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sectionInfo = selectedSection && selectedSection !== 'default' ? `_${selectedSection}` : '';
    link.setAttribute('download', `${selectedClassObj.className}${sectionInfo}_${currentTerm?.termName || 'Semester'}_Grades.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };



  // Save grades to backend
  const saveGrades = async () => {
    if (!selectedClass || subjects.length === 0) return;
    
    try {
      const selectedClassObj = classes[selectedClass];
      const token = localStorage.getItem("token");
      
      // Prepare grades data based on current term
      const gradesData = {
        classID: selectedClassObj.classID,
        academicYear: `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`,
        termName: currentTerm?.termName,
        facultyID: currentFacultyID,
        subjects: subjects.map(subject => {
          const subjectGrades = grades[subject._id] || {};
          let gradesStructure = {};
          
          if (currentTerm?.termName === 'Term 1') {
            gradesStructure = {
              quarter1: subjectGrades.quarter1 || '',
              quarter2: subjectGrades.quarter2 || '',
              semesterFinal: subjectGrades.semesterFinal || ''
            };
          } else if (currentTerm?.termName === 'Term 2') {
            gradesStructure = {
              quarter3: subjectGrades.quarter3 || '',
              quarter4: subjectGrades.quarter4 || '',
              semesterFinal: subjectGrades.semesterFinal || ''
            };
          } else {
            // Default fallback
            gradesStructure = {
              quarter1: subjectGrades.quarter1 || '',
              quarter2: subjectGrades.quarter2 || '',
              semesterFinal: subjectGrades.semesterFinal || ''
            };
          }
          
          return {
            subjectID: subject._id,
            subjectCode: subject.subjectCode,
            subjectDescription: subject.subjectDescription,
            grades: gradesStructure
          };
        })
      };

      // Save to backend
      const response = await fetch(`${API_BASE}/api/grades/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gradesData)
      });

      if (response.ok) {
        alert('Grades saved successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to save grades: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving grades:', error);
      alert('Failed to save grades. Please try again.');
    }
  };





  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />
      
      

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Grades</h2>
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
          <ProfileMenu/>
        </div>

        
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex gap-4 border-b">
            <button
              className={`pb-2 px-4 ${activeTab === 'traditional' ? 'border-b-2 border-blue-900 font-bold' : ''}`}
              onClick={() => setActiveTab('traditional')}
            >
              Grading Table
            </button>
            <button
              className={`pb-2 px-4 ${activeTab === 'excel' ? 'border-b-2 border-blue-900 font-bold' : ''}`}
              onClick={() => setActiveTab('excel')}
            >
              Excel Grading System
            </button>
          </div>
        </div>

        {/* Content based on activeTab */}
        {activeTab === 'traditional' ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
                                      {/* Class Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class:</label>
               <select
                 className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 value={selectedClass !== null ? selectedClass : ""}
                 onChange={handleClassChange}
                 disabled={loading}
               >
                 <option value="">Choose a class...</option>
                 {classes.map((cls, index) => (
                   <option key={cls.classID} value={index}>
                     {cls.className}
                   </option>
                 ))}
               </select>
               {/* Warning when no classes available */}
               {!loading && classes.length === 0 && (
                 <p className="mt-2 text-sm text-orange-600">
                   ⚠️ No classes available for the current term ({currentTerm?.termName || 'Unknown'}) and academic year ({academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Unknown'}).
                 </p>
               )}
             </div>

                           {/* Section Selection */}
              {selectedClass !== null && classes[selectedClass] && classes[selectedClass].section && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Section:</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedSection || ""}
                    onChange={handleSectionChange}
                  >
                    <option value="">Choose a section...</option>
                    {/* Show the class's assigned section */}
                    <option key={classes[selectedClass].section} value={classes[selectedClass].section}>
                      {classes[selectedClass].section}
                    </option>
                    {/* Also show any additional sections from students if they exist */}
                    {students.length > 0 && Array.from(new Set(students.map(student => student.section || 'default')))
                      .filter(section => section !== classes[selectedClass].section && section !== 'default')
                      .map(section => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                  </select>
                </div>
              )}
             
             {/* Warning when no sections available for the selected class */}
             {selectedClass !== null && classes[selectedClass] && !classes[selectedClass].section && (
               <div className="mb-6">
                 <p className="text-sm text-orange-600">
                   ⚠️ The selected class "{classes[selectedClass].className}" does not have any sections assigned to it.
                 </p>
               </div>
             )}

                                                   {/* Student Search */}
              {selectedClass !== null && selectedSection && students.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Student:</label>
                  <input
                    type="text"
                    placeholder="Search by student name or ID..."
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedStudent || ""}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Type student name or ID to search, then click on a student to select them
                  </p>
                  
                  {/* Search Results Dropdown */}
                  {selectedStudent && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md bg-white shadow-lg">
                      {students
                        .filter(student => {
                          const searchTerm = selectedStudent.toLowerCase();
                          const studentName = student.name.toLowerCase();
                          const studentID = (student.schoolID || '').toLowerCase();
                          return studentName.includes(searchTerm) || studentID.includes(searchTerm);
                        })
                        .map((student) => (
                          <div
                            key={student._id}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                                                                                       onClick={() => {
                                setSelectedStudent(student._id);
                                setSelectedStudentName(student.name);
                                // Set the student grades to the selected student's existing grades
                                const existingGrades = grades[student._id] || {};
                                setStudentGrades({
                                  quarter1: existingGrades.quarter1 || '',
                                  quarter2: existingGrades.quarter2 || '',
                                  quarter3: existingGrades.quarter3 || '',
                                  quarter4: existingGrades.quarter4 || '',
                                  semesterFinal: existingGrades.semesterFinal || '',
                                  remarks: existingGrades.remarks || ''
                                });
                                // Clear the search input after selection
                                setSelectedStudent('');
                                // Show the individual management section
                                setShowIndividualManagement(true);
                              }}
                          >
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-gray-600">ID: {student.schoolID || 'N/A'}</div>
                          </div>
                        ))}
                      {students.filter(student => {
                        const searchTerm = selectedStudent.toLowerCase();
                        const studentName = student.name.toLowerCase();
                        const studentID = (student.schoolID || '').toLowerCase();
                        return studentName.includes(searchTerm) || studentID.includes(searchTerm);
                      }).length === 0 && (
                        <div className="p-3 text-gray-500 text-center">
                          No students found matching your search
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

                                                   {/* Individual Student Grade Management */}
              {selectedStudentName && showIndividualManagement && (
                <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50 relative">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Individual Student Grade Management - {currentTerm?.termName || 'Current Term'}
                      {selectedSection && selectedSection !== 'default' && (
                        <span className="text-sm font-normal text-gray-600 ml-2">
                          (Section: {selectedSection})
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => setShowIndividualManagement(false)}
                      className="text-gray-500 hover:text-gray-700 text-xl font-bold leading-none p-1 rounded-full hover:bg-gray-200 transition-colors"
                      title="Close Individual Student Grade Management"
                    >
                      ×
                    </button>
                  </div>
                 
                                   {/* Student Name and ID Display */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-800 mb-1">
                      <strong>Student Name:</strong> {selectedStudentName}
                    </p>
                    <p className="text-xs text-blue-700">
                      <strong>Student ID:</strong> {(() => {
                        const student = students.find(s => s.name === selectedStudentName);
                        return student ? (student.schoolID || 'N/A') : 'N/A';
                      })()}
                    </p>
                  </div>
                 
                 {/* Student Grade Inputs */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                   {currentTerm?.termName === 'Term 1' ? (
                     <>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">1st Quarter</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Grade"
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={studentGrades.quarter1 || ''}
                          onChange={(e) => handleStudentGradeChange('quarter1', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">2nd Quarter</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Grade"
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={studentGrades.quarter2 || ''}
                          onChange={(e) => handleStudentGradeChange('quarter2', e.target.value)}
                        />
                      </div>
                    </>
                  ) : currentTerm?.termName === 'Term 2' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">3rd Quarter</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Grade"
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={studentGrades.quarter3 || ''}
                          onChange={(e) => handleStudentGradeChange('quarter3', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">4th Quarter</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Grade"
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={studentGrades.quarter4 || ''}
                          onChange={(e) => handleStudentGradeChange('quarter4', e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quarter 1</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Grade"
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={studentGrades.quarter1 || ''}
                          onChange={(e) => handleStudentGradeChange('quarter1', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quarter 2</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Grade"
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={studentGrades.quarter2 || ''}
                          onChange={(e) => handleStudentGradeChange('quarter2', e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester Final Grade</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                      value={studentGrades.semesterFinal || ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                      value={studentGrades.remarks || ''}
                    />
                  </div>
                </div>

                {/* Student Grade Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={saveStudentGrades}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Save Student Grades
                  </button>
                  
                  {/* File Upload for Student */}
                  <div className="flex items-center gap-2">
                    <input
                      id="student-file-input"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleStudentFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="student-file-input"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Choose File
                    </label>
                    {selectedStudentFile && (
                      <span className="text-sm text-gray-600">{selectedStudentFile.name}</span>
                    )}
                  </div>
                  
                  {selectedStudentFile && (
                    <button
                      onClick={uploadStudentGrades}
                      disabled={uploadingStudentGrades}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        uploadingStudentGrades 
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                      }`}
                    >
                      {uploadingStudentGrades ? 'Uploading...' : 'Upload Student Grades'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Main Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
                Report on Learning Progress and Achievement
              </h1>
            </div>

            {/* Only show tables when both class and section are selected */}
            {selectedClass !== null && selectedSection && selectedSection !== 'default' && (
              <>
                {/* First Semester Section - Only show if Term 1 is active */}
                {currentTerm?.termName === 'Term 1' && (
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">
                          First Semester (Q1 & Q2)
                          {selectedSection && selectedSection !== 'default' && (
                            <span className="text-sm font-normal text-gray-600 ml-2">
                              - Section: {selectedSection}
                            </span>
                          )}
                        </h2>
                        {/* Subject information below the semester title */}
                        {selectedClass !== null && classes[selectedClass] && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p><strong>Subject:</strong> {classes[selectedClass].className}</p>
                            <p><strong>Subject Code:</strong> {classes[selectedClass].classCode}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveGrades}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            students.length > 0 
                              ? 'bg-orange-600 text-white hover:bg-orange-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          title="Save all grades to database"
                          disabled={students.length === 0}
                        >
                          Save Grades
                        </button>
                        <button
                          onClick={downloadGrades}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            students.length > 0 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          title="Download current grades as CSV"
                          disabled={students.length === 0}
                        >
                          Download Grades
                        </button>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 text-sm">
                                                 <thead>
                           <tr>
                             <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Student ID</th>
                             <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Students</th>
                             <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50" colSpan="2">Quarter</th>
                             <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Semester Final Grade</th>
                           </tr>
                           <tr>
                             <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                             <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                             <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">1</th>
                             <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">2</th>
                             <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                           </tr>
                         </thead>
                                                 <tbody>
                           {students.length > 0 ? (
                             students.map((student) => {
                               const studentGrades = grades[student._id] || {};
                               const semesterGrade = calculateSemesterGrade(studentGrades.quarter1, studentGrades.quarter2);
                               
                               return (
                                 <tr key={student._id} className="hover:bg-gray-50">
                                   <td className="border border-gray-300 p-2 h-12 font-medium text-sm">
                                     {student.schoolID || 'N/A'}
                                   </td>
                                   <td className="border border-gray-300 p-2 h-12 font-medium">
                                     <div className="flex items-center gap-2">
                                       {student.name}
                                     </div>
                                   </td>
                                   <td className="border border-gray-300 p-2 text-center">
                                     <input
                                       type="number"
                                       min="0"
                                       max="100"
                                       step="0.01"
                                       placeholder="Grade"
                                       className="w-20 p-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       value={studentGrades.quarter1 || ''}
                                       onChange={(e) => handleGradeChange(student._id, 'quarter1', e.target.value)}
                                     />
                                   </td>
                                   <td className="border border-gray-300 p-2 text-center">
                                     <input
                                       type="number"
                                       min="0"
                                       max="100"
                                       step="0.01"
                                       placeholder="Grade"
                                       className="w-20 p-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       value={studentGrades.quarter2 || ''}
                                       onChange={(e) => handleGradeChange(student._id, 'quarter2', e.target.value)}
                                     />
                                   </td>
                                   <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                     {semesterGrade}
                                   </td>
                                 </tr>
                               );
                             })
                           ) : (
                             <tr>
                               <td colSpan="5" className="border border-gray-300 p-4 text-center text-gray-500">
                                 No students available in this class and section.
                               </td>
                             </tr>
                           )}
                           
                           {/* General Average */}
                           <tr className="bg-gray-50">
                             <td className="border border-gray-300 p-2 font-bold text-gray-800" colSpan="2">General Average</td>
                             <td className="border border-gray-300 p-2 text-center font-bold">
                               {students.length > 0 ? calculateGeneralAverage('quarter1') : ''}
                             </td>
                             <td className="border border-gray-300 p-2 text-center font-bold">
                               {students.length > 0 ? calculateGeneralAverage('quarter2') : ''}
                             </td>
                             <td className="border border-gray-300 p-2 text-center font-bold">
                               {students.length > 0 ? calculateGeneralAverage('semesterFinal') : ''}
                             </td>
                           </tr>
                         </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Second Semester Section - Only show if Term 2 is active */}
                {currentTerm?.termName === 'Term 2' && (
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">
                          Second Semester (Q3 & Q4)
                          {selectedSection && selectedSection !== 'default' && (
                            <span className="text-sm font-normal text-gray-600 ml-2">
                              - Section: {selectedSection}
                            </span>
                          )}
                        </h2>
                        {/* Subject information below the semester title */}
                        {selectedClass !== null && classes[selectedClass] && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p><strong>Subject:</strong> {classes[selectedClass].className}</p>
                            <p><strong>Subject Code:</strong> {classes[selectedClass].classCode}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveGrades}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            students.length > 0 
                              ? 'bg-orange-600 text-white hover:bg-orange-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          title="Save all grades to database"
                          disabled={students.length === 0}
                        >
                          Save Grades
                        </button>
                        <button
                          onClick={downloadGrades}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            students.length > 0 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          title="Download current grades as CSV"
                          disabled={students.length === 0}
                        >
                          Download Grades
                        </button>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 text-sm">
                                                 <thead>
                           <tr>
                             <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Student ID</th>
                             <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Students</th>
                             <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50" colSpan="2">Quarter</th>
                             <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Semester Final Grade</th>
                           </tr>
                           <tr>
                             <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                             <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                             <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">3</th>
                             <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">4</th>
                             <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                           </tr>
                         </thead>
                                                 <tbody>
                           {students.length > 0 ? (
                             students.map((student) => {
                               const studentGrades = grades[student._id] || {};
                               const semesterGrade = calculateSemesterGrade(studentGrades.quarter3, studentGrades.quarter4);
                               
                               return (
                                 <tr key={student._id} className="hover:bg-gray-50">
                                   <td className="border border-gray-300 p-2 h-12 font-medium text-sm">
                                     {student.schoolID || 'N/A'}
                                   </td>
                                   <td className="border border-gray-300 p-2 h-12 font-medium">
                                     <div className="flex items-center gap-2">
                                       {student.name}
                                     </div>
                                   </td>
                                   <td className="border border-gray-300 p-2 text-center">
                                     <input
                                       type="number"
                                       min="0"
                                       max="100"
                                       step="0.01"
                                       placeholder="Grade"
                                       className="w-20 p-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       value={studentGrades.quarter3 || ''}
                                       onChange={(e) => handleGradeChange(student._id, 'quarter3', e.target.value)}
                                     />
                                   </td>
                                   <td className="border border-gray-300 p-2 text-center">
                                     <input
                                       type="number"
                                       min="0"
                                       max="100"
                                       step="0.01"
                                       placeholder="Grade"
                                       className="w-20 p-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       value={studentGrades.quarter4 || ''}
                                       onChange={(e) => handleGradeChange(student._id, 'quarter4', e.target.value)}
                                     />
                                   </td>
                                   <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                     {semesterGrade}
                                   </td>
                                 </tr>
                               );
                             })
                           ) : (
                             <tr>
                               <td colSpan="5" className="border border-gray-300 p-4 text-center text-gray-500">
                                 No students available in this class and section.
                               </td>
                             </tr>
                           )}
                           
                           {/* General Average */}
                           <tr className="bg-gray-50">
                             <td className="border border-gray-300 p-2 font-bold text-gray-800" colSpan="2">General Average</td>
                             <td className="border border-gray-300 p-2 text-center font-bold">
                               {students.length > 0 ? calculateGeneralAverage('quarter3') : ''}
                             </td>
                             <td className="border border-gray-300 p-2 text-center font-bold">
                               {students.length > 0 ? calculateGeneralAverage('quarter4') : ''}
                             </td>
                             <td className="border border-gray-300 p-2 text-center font-bold">
                               {students.length > 0 ? calculateGeneralAverage('semesterFinal') : ''}
                             </td>
                           </tr>
                         </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Show message when no active term matches */}
                {!currentTerm?.termName || (currentTerm?.termName !== 'Term 1' && currentTerm?.termName !== 'Term 2') && (
                  <div className="text-center py-8 text-gray-600">
                    <p>No active term found. Please check your academic term settings.</p>
                  </div>
                )}
              </>
            )}

                         {/* Show message when class or section not selected */}
             {(selectedClass === null || !selectedSection || selectedSection === 'default') && (
               <div className="text-center py-8 text-gray-600">
                 {selectedClass === null ? (
                   <p>Please select a class to view available sections and the grading table.</p>
                 ) : !selectedSection ? (
                   <p>Please select a section to view the grading table for the selected class.</p>
                 ) : (
                   <p>Please select both a class and section to view the grading table.</p>
                 )}
               </div>
             )}
          </div>
        ) : (
          <GradingSystem />
        )}

        


      </div>
    </div>
  );
}
