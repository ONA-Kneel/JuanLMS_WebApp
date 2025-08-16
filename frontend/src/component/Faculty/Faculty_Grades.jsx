import Faculty_Navbar from "./Faculty_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";
import React, { useEffect, useState } from 'react';
import GradingSystem from '../GradingSystem';



const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
    }
  }, [selectedClass]);

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
      } catch (error) {
        console.log('Subjects endpoint failed, creating defaults');
        createDefaultSubjects();
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
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
    
    // Initialize grades for default subjects
    const initialGrades = {};
    defaultSubjects.forEach(subject => {
      initialGrades[subject._id] = {
        quarter1: '',
        quarter2: '',
        semesterFinal: ''
      };
    });
    setGrades(initialGrades);
  };

  const handleClassChange = (e) => {
    const classIndex = parseInt(e.target.value);
    setSelectedClass(classIndex);
    setSelectedSection(null);
    setSubjects([]);
    setGrades({});
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
        
        if (quarter === 'quarter1') return parseFloat(subjectGrades.quarter1) || null;
        if (quarter === 'quarter2') return parseFloat(subjectGrades.quarter2) || null;
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
    let csvContent = 'Subject Code,Subject Description,Quarter 1,Quarter 2,Semester Final Grade\n';
    
    subjects.forEach(subject => {
      const subjectGrades = grades[subject._id] || {};
      csvContent += `${subject.subjectCode},${subject.subjectDescription},${subjectGrades.quarter1 || ''},${subjectGrades.quarter2 || ''},${subjectGrades.semesterFinal || ''}\n`;
    });
    
    csvContent += `General Average,,${calculateGeneralAverage('quarter1')},${calculateGeneralAverage('quarter2')},${calculateGeneralAverage('semesterFinal')}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedClassObj.className}_FirstSemester_Grades.csv`);
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
      
      // Prepare grades data
      const gradesData = {
        classID: selectedClassObj.classID,
        academicYear: `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`,
        termName: currentTerm?.termName,
        facultyID: currentFacultyID,
        subjects: subjects.map(subject => ({
          subjectID: subject._id,
          subjectCode: subject.subjectCode,
          subjectDescription: subject.subjectDescription,
          grades: grades[subject._id] || {}
        }))
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
              Traditional Grades
            </button>
            <button
              className={`pb-2 px-4 ${activeTab === 'excel' ? 'border-b-2 border-blue-900 font-bold' : ''}`}
              onClick={() => setActiveTab('excel')}
            >
              Excel Grading System
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
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
                    {cls.className} - {cls.sectionName || 'No Section'} ({cls.trackName || 'N/A'} | {cls.strandName || 'N/A'} | {cls.gradeLevel || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            {/* Main Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
                Report on Learning Progress and Achievement
              </h1>
            </div>

            {/* First Semester Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">First Semester</h2>
                <div className="flex gap-2">
                    

                    <button
                      onClick={saveGrades}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        selectedClass !== null && subjects.length > 0 
                          ? 'bg-orange-600 text-white hover:bg-orange-700' 
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      }`}
                      title="Save all grades to database"
                      disabled={selectedClass === null || subjects.length === 0}
                    >
                      Save Grades
                    </button>
                    <button
                      onClick={downloadGrades}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        selectedClass !== null && subjects.length > 0 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      }`}
                      title="Download current grades as CSV"
                      disabled={selectedClass === null || subjects.length === 0}
                    >
                      Download Grades
                    </button>
                  </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Subjects</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50" colSpan="2">Quarter</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Semester Final Grade</th>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">1</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">2</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClass !== null && subjects.length > 0 ? (
                      subjects.map((subject) => {
                                                 const subjectGrades = grades[subject._id] || {};
                         const semesterGrade = calculateSemesterGrade(subjectGrades.quarter1, subjectGrades.quarter2);
                         
                         return (
                           <tr key={subject._id} className="hover:bg-gray-50">
                             <td className="border border-gray-300 p-2 h-12 font-medium">
                               <div className="flex items-center gap-2">
                                 {subject.subjectCode} - {subject.subjectDescription}
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
                                 value={subjectGrades.quarter1 || ''}
                                 onChange={(e) => handleGradeChange(subject._id, 'quarter1', e.target.value)}
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
                                 value={subjectGrades.quarter2 || ''}
                                 onChange={(e) => handleGradeChange(subject._id, 'quarter2', e.target.value)}
                               />
                             </td>
                            <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                              {semesterGrade}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      // Empty rows when no class selected or no subjects
                      Array.from({ length: 10 }).map((_, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 p-2 h-12"></td>
                          <td className="border border-gray-300 p-2 text-center"></td>
                          <td className="border border-gray-300 p-2 text-center"></td>
                          <td className="border border-gray-300 p-2 text-center"></td>
                        </tr>
                      ))
                    )}
                    
                    {/* General Average */}
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-2 font-bold text-gray-800">General Average</td>
                      <td className="border border-gray-300 p-2 text-center font-bold">
                        {selectedClass !== null && subjects.length > 0 ? calculateGeneralAverage('quarter1') : ''}
                      </td>
                      <td className="border border-gray-300 p-2 text-center font-bold">
                        {selectedClass !== null && subjects.length > 0 ? calculateGeneralAverage('quarter2') : ''}
                      </td>
                      <td className="border border-gray-300 p-2 text-center font-bold">
                        {selectedClass !== null && subjects.length > 0 ? calculateGeneralAverage('semesterFinal') : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Second Semester Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Second Semester</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Subjects</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50" colSpan="2">Quarter</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Semester Final Grade</th>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">3</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">4</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Empty rows for dynamic content */}
                    {Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2 h-12"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                    ))}
                    
                    {/* General Average */}
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-2 font-bold text-gray-800">General Average</td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2 text-center font-bold"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <GradingSystem />
        )}

        


      </div>
    </div>
  );
}
