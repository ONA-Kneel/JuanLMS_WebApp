import { useState, useEffect } from "react";
import Principal_Navbar from "./Principal_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Principal_Grades() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState({});
  const [students, setStudents] = useState([]);

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
          headers: { "Authorization": `Bearer ${token}` }
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
        // Fetch all classes for the current term and academic year
        const res = await fetch(`${API_BASE}/api/classes?schoolYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}&termName=${currentTerm?.termName}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await res.json();
        
        console.log("🔍 Fetched classes:", data);
        
        // Filter classes for current term and academic year
        const filtered = data.filter(cls => 
          cls.isArchived !== true &&
          cls.academicYear === `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}` &&
          cls.termName === currentTerm?.termName
        );
        
        console.log("✅ Filtered classes for grades:", filtered);
        setClasses(filtered);
      } catch (err) {
        console.error("❌ Failed to fetch classes", err);
        setClasses([]);
      } finally {
        setLoading(false);
      }
    }
    
    // Only fetch classes when we have both academic year and term
    if (academicYear && currentTerm) {
      fetchClasses();
    }
  }, [academicYear, currentTerm]);

  useEffect(() => {
    if (selectedClass !== null) {
      fetchSubjects();
      fetchStudents();
    }
  }, [selectedClass]);

  const fetchSubjects = async () => {
    try {
      const selectedClassObj = classes[selectedClass];
      
      // Create default subjects based on the selected class
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
      
      // Initialize grades structure
      const initialGrades = {};
      defaultSubjects.forEach(subject => {
        if (currentTerm?.termName === 'Term 1') {
          initialGrades[subject._id] = {
            quarter1: '',
            quarter2: '',
            semesterFinal: '',
            remarks: ''
          };
        } else if (currentTerm?.termName === 'Term 2') {
          initialGrades[subject._id] = {
            quarter3: '',
            quarter4: '',
            semesterFinal: '',
            remarks: ''
          };
        } else {
          initialGrades[subject._id] = {
            quarter1: '',
            quarter2: '',
            semesterFinal: '',
            remarks: ''
          };
        }
      });
      setGrades(initialGrades);
    } catch (error) {
      console.error('Error in fetchSubjects:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const selectedClassObj = classes[selectedClass];
      
      if (!selectedClassObj) {
        console.log('❌ No class object found for selected class index:', selectedClass);
        setStudents([]);
        return;
      }
      
      console.log('🔍 Fetching students for class:', selectedClassObj.classID);
      
      // Try multiple endpoints to get students
      let studentsData = [];
      
      try {
        // Try class members endpoint first
        const response = await fetch(`${API_BASE}/classes/${selectedClassObj.classID}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Class members response:', data);
          if (data && data.students) {
            studentsData = (data.students || []).filter(s => {
              const role = (s.role || '').toLowerCase();
              return role === 'student' || role === 'students';
            });
          } else if (data && Array.isArray(data)) {
            studentsData = (data || []).filter(s => {
              const role = (s.role || '').toLowerCase();
              return role === 'student' || role === 'students';
            });
          }
        }
      } catch (error) {
        console.log('❌ Class members endpoint error:', error);
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
        } catch (error) {
          console.log('❌ Alternative endpoint error:', error);
        }
      }
      
      // If still no students, try to get from semestral grades
      if (studentsData.length === 0) {
        try {
          const gradesResponse = await fetch(`${API_BASE}/api/semestral-grades/class/${selectedClassObj.classID}?termName=${currentTerm?.termName}&academicYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (gradesResponse.ok) {
            const gradesData = await gradesResponse.json();
            if (gradesData.success && gradesData.grades) {
              // Extract unique students from grades data
              const uniqueStudents = [];
              const seenStudents = new Set();
              
              gradesData.grades.forEach(grade => {
                if (!seenStudents.has(grade.studentID)) {
                  seenStudents.add(grade.studentID);
                  uniqueStudents.push({
                    _id: grade.studentID,
                    userID: grade.studentID,
                    name: grade.studentName,
                    schoolID: grade.schoolID,
                    section: grade.section || 'default'
                  });
                }
              });
              
              studentsData = uniqueStudents;
            }
          }
        } catch (error) {
          console.log('❌ Semestral grades endpoint error:', error);
        }
      }
      
      // If still no students, try a more generic approach
      if (studentsData.length === 0) {
        try {
          const genericResponse = await fetch(`${API_BASE}/api/students`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (genericResponse.ok) {
            const data = await genericResponse.json();
            if (data && Array.isArray(data)) {
              studentsData = data.slice(0, 10); // Limit to first 10 for testing
            }
          }
        } catch (error) {
          console.log('❌ Generic students endpoint error:', error);
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
          gradesStructure = {
            quarter1: '',
            quarter2: '',
            semesterFinal: '',
            remarks: ''
          };
        }
        
        return {
          _id: student._id || student.userID || student.studentID,
          userID: student.userID || student.studentID || student._id,
          name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
          schoolID: student.schoolID || student.userID || student.studentID,
          section: student.section || student.sectionName || 'default',
          grades: gradesStructure
        };
      });
      
      console.log('✅ Transformed students:', transformedStudents);
      setStudents(transformedStudents);
      
      // Initialize grades state for all students
      const initialGrades = {};
      transformedStudents.forEach(student => {
        initialGrades[student._id] = { ...student.grades };
      });
      setGrades(initialGrades);

      // Load previously saved grades from database
      if (transformedStudents.length > 0) {
        loadSavedGradesFromDatabase(selectedClassObj.classID, transformedStudents);
      }
      
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      setStudents([]);
    }
  };

  // Load saved grades from database
  const loadSavedGradesFromDatabase = async (classID, studentsList) => {
    try {
      const token = localStorage.getItem("token");
      const selectedClassObj = classes[selectedClass];
      
      if (!selectedClassObj || !academicYear || !currentTerm) return;
      
      console.log('🔍 Loading saved grades for class:', classID);
      console.log('🔍 Class details:', {
        classID: selectedClassObj.classID,
        className: selectedClassObj.className,
        termName: currentTerm.termName,
        academicYear: `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`
      });
      
      // Fetch grades from database for this class and term
      const response = await fetch(`${API_BASE}/api/semestral-grades/class/${selectedClassObj.classID}?termName=${currentTerm.termName}&academicYear=${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('🔍 API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Grades loaded from database:', data);
        
        if (data.success && data.grades && data.grades.length > 0) {
          console.log(`✅ Found ${data.grades.length} grade records in database`);
          
          // Update grades state with database data
          setGrades(prevGrades => {
            const updatedGrades = { ...prevGrades };
            
                         studentsList.forEach(student => {
               // Find matching grade record for this student
               const studentGradeRecord = data.grades.find(g => 
                 g.studentID === student._id || 
                 g.schoolID === student.schoolID ||
                 g.studentID === student.schoolID ||
                 g.schoolID === student._id
               );
               
               if (studentGradeRecord) {
                 console.log('✅ Found grades for student:', student.name, studentGradeRecord);
                 console.log('✅ Student grades structure:', studentGradeRecord.grades);
                 
                 // Extract the nested grades object and flatten it
                 const studentGrades = studentGradeRecord.grades || {};
                 console.log('🔍 Extracted grades object:', studentGrades);
                 
                 // Map the grades to the expected structure
                 const mappedGrades = {
                   quarter1: studentGrades.quarter1 || studentGrades.q1 || '',
                   quarter2: studentGrades.quarter2 || studentGrades.q2 || '',
                   quarter3: studentGrades.quarter3 || studentGrades.q3 || '',
                   quarter4: studentGrades.quarter4 || studentGrades.q4 || '',
                   semesterFinal: studentGrades.semesterFinal || studentGrades.final || studentGrades.semester || '',
                   remarks: studentGrades.remarks || studentGrades.remark || ''
                 };
                 
                 console.log('✅ Mapped grades for display:', mappedGrades);
                 
                 updatedGrades[student._id] = {
                   ...updatedGrades[student._id],
                   ...mappedGrades,
                   isLocked: studentGradeRecord.isLocked || false
                 };
               } else {
                 console.log('⚠️ No grades found for student:', student.name, student.schoolID);
               }
             });
            
            console.log('✅ Updated grades state:', updatedGrades);
            return updatedGrades;
          });
        } else {
          console.log('⚠️ No grades found in database response or empty grades array');
          // Try alternative approach - fetch grades by individual students
          await loadGradesByIndividualStudents(studentsList);
        }
      } else {
        console.log('❌ Failed to load grades from database:', response.status, response.statusText);
        // Try alternative approach - fetch grades by individual students
        await loadGradesByIndividualStudents(studentsList);
      }
      
    } catch (error) {
      console.error('❌ Error loading saved grades from database:', error);
      // Try alternative approach
      await loadGradesByIndividualStudents(studentsList);
    }
  };

  // Alternative approach: Load grades by individual students
  const loadGradesByIndividualStudents = async (studentsList) => {
    try {
      const token = localStorage.getItem("token");
      console.log('🔍 Trying to load grades by individual students...');
      
      const updatedGrades = { ...grades };
      let gradesLoaded = 0;
      
      for (const student of studentsList) {
        try {
          const studentSchoolID = student.schoolID || student._id;
          console.log(`🔍 Fetching grades for student: ${student.name} (ID: ${studentSchoolID})`);
          
          const response = await fetch(`${API_BASE}/api/semestral-grades/student/${studentSchoolID}?termName=${currentTerm.termName}&academicYear=${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log(`🔍 Student grades API response for ${student.name}:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`🔍 Student grades data for ${student.name}:`, data);
            
            if (data.success && data.grades && data.grades.length > 0) {
              // Find grades for this specific class
              const classGrades = data.grades.find(g => 
                g.classID === classes[selectedClass].classID ||
                g.subjectCode === classes[selectedClass].classCode ||
                g.subjectName === classes[selectedClass].className ||
                g.className === classes[selectedClass].className
              );
              
                             if (classGrades) {
                 console.log('✅ Found grades for student:', student.name, classGrades);
                 console.log('✅ Class grades structure:', classGrades.grades);
                 
                 // Extract the nested grades object and flatten it
                 const studentGrades = classGrades.grades || {};
                 console.log('🔍 Extracted grades object:', studentGrades);
                 
                 // Map the grades to the expected structure
                 const mappedGrades = {
                   quarter1: studentGrades.quarter1 || studentGrades.q1 || '',
                   quarter2: studentGrades.quarter2 || studentGrades.q2 || '',
                   quarter3: studentGrades.quarter3 || studentGrades.q3 || '',
                   quarter4: studentGrades.quarter4 || studentGrades.q4 || '',
                   semesterFinal: studentGrades.semesterFinal || studentGrades.final || studentGrades.semester || '',
                   remarks: studentGrades.remarks || studentGrades.remark || ''
                 };
                 
                 console.log('✅ Mapped grades for display:', mappedGrades);
                 
                 updatedGrades[student._id] = {
                   ...updatedGrades[student._id],
                   ...mappedGrades,
                   isLocked: classGrades.isLocked || false
                 };
                 gradesLoaded++;
               } else {
                console.log(`⚠️ No matching class grades found for student ${student.name} in class ${classes[selectedClass].className}`);
                console.log(`🔍 Available grades for this student:`, data.grades);
              }
            } else {
              console.log(`⚠️ No grades data for student ${student.name}`);
            }
          } else {
            console.log(`❌ Failed to fetch grades for student ${student.name}:`, response.status, response.statusText);
          }
        } catch (error) {
          console.log(`❌ Error loading grades for student ${student.name}:`, error);
        }
      }
      
      if (gradesLoaded > 0) {
        console.log(`✅ Loaded grades for ${gradesLoaded} students`);
        setGrades(updatedGrades);
      } else {
        console.log('⚠️ No grades loaded from individual student approach');
      }
      
    } catch (error) {
      console.error('❌ Error in loadGradesByIndividualStudents:', error);
    }
  };

  const handleClassChange = (e) => {
    const classIndex = parseInt(e.target.value);
    setSelectedClass(classIndex);
    setSelectedSection(null);
    setSubjects([]);
    setGrades({});
    setStudents([]);
  };

  const handleSectionChange = (e) => {
    const section = e.target.value;
    setSelectedSection(section);
  };

  // Helper function to calculate semester grade
  const calculateSemesterGrade = (quarter1, quarter2) => {
    if (!quarter1 || !quarter2) return '';
    
    const q1 = parseFloat(quarter1) || 0;
    const q2 = parseFloat(quarter2) || 0;
    
    const semesterGrade = (q1 + q2) / 2;
    return semesterGrade.toFixed(2);
  };

  // Helper function to calculate remarks
  const calculateRemarks = (semesterGrade) => {
    if (!semesterGrade) return '';
    
    const grade = parseFloat(semesterGrade) || 0;
    
    if (grade >= 85) {
      return 'PASSED';
    } else if (grade >= 80) {
      return 'INCOMPLETE';
    } else if (grade >= 75) {
      return 'REPEAT';
    } else {
      return 'FAILED';
    }
  };

  // Helper function to calculate general average
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Principal_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Principal Grade View</h2>
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
                      <div className="flex items-center gap-4">
              <ProfileMenu/>
            </div>
        </div>


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
                {cls.className} - {cls.section || cls.classCode || 'No Section'}
              </option>
            ))}
          </select>
          
          {/* Loading state */}
          {loading && (
            <p className="mt-2 text-sm text-blue-600">
              🔄 Loading classes for {currentTerm?.termName || 'current term'}...
            </p>
          )}
          
          {/* Warning when no classes available */}
          {!loading && classes.length === 0 && (
            <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800 font-medium">
                ⚠️ No classes available for the current term and academic year.
              </p>
              <div className="text-xs text-orange-700 mt-1 space-y-1">
                <p>• Current Term: {currentTerm?.termName || 'Not set'}</p>
                <p>• Academic Year: {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Not set'}</p>
              </div>
            </div>
          )}
          
          {/* Success message when classes are found */}
          {!loading && classes.length > 0 && (
            <p className="mt-2 text-sm text-green-600">
              ✅ Found {classes.length} class{classes.length !== 1 ? 'es' : ''} for {currentTerm?.termName || 'current term'}
            </p>
          )}
        </div>

        {/* Section Selection */}
        {selectedClass !== null && classes[selectedClass] && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Section:</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedSection || ""}
              onChange={handleSectionChange}
            >
              <option value="">Choose a section...</option>
              {/* Show the class's assigned section */}
              {classes[selectedClass].section && (
                <option key={classes[selectedClass].section} value={classes[selectedClass].section}>
                  {classes[selectedClass].section}
                </option>
              )}
              {/* Also show any additional sections from students if they exist */}
              {students.length > 0 && Array.from(new Set(students.map(student => student.section || 'default')))
                .filter(section => section !== classes[selectedClass].section && section !== 'default')
                .map(section => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              {/* Add a default section option if no sections are available */}
              {(!classes[selectedClass].section || classes[selectedClass].section === '') && (
                <option value="default">Default Section</option>
              )}
            </select>
            
            {/* Show section info */}
            {selectedSection && (
              <p className="mt-1 text-sm text-gray-600">
                Selected section: <strong>{selectedSection}</strong>
                {selectedSection === 'default' && (
                  <span className="text-orange-600 ml-2">⚠️ Using default section</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Warning when no sections available for the selected class */}
        {selectedClass !== null && classes[selectedClass] && !classes[selectedClass].section && (
          <div className="mb-6">
            <p className="text-sm text-orange-600">
              ⚠️ The selected class "{classes[selectedClass].className}" does not have any sections assigned to it.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              💡 You can still proceed by selecting "Default Section" from the dropdown above.
            </p>
          </div>
        )}

        {/* Grades Status Summary */}
        {selectedClass !== null && selectedSection && students.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Posted to Students: {students.filter(student => grades[student._id]?.isLocked).length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Pending: {students.filter(student => !grades[student._id]?.isLocked).length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Total Students: {students.length}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                💡 This is a read-only view. You can view all grades but cannot edit them.
              </div>
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
        {selectedClass !== null && selectedSection && (
          <>
            {/* First Semester Section - Only show if Term 1 is active */}
            {currentTerm?.termName === 'Term 1' && (
              <div className="mb-8">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    First Semester (Q1 & Q2)
                    {selectedSection && selectedSection !== 'default' && (
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        - Section: {selectedSection}
                      </span>
                    )}
                    {selectedSection === 'default' && (
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        - Default Section
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
                
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300 text-sm">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Student ID</th>
                        <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Students</th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50" colSpan="2">Quarter</th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Semester Final Grade</th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Remarks</th>
                      </tr>
                      <tr>
                        <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                        <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">1</th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">2</th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length > 0 ? (
                        students.map((student) => {
                          const studentGrades = grades[student._id] || {};
                          const semesterGrade = calculateSemesterGrade(studentGrades.quarter1, studentGrades.quarter2);
                          const remarks = calculateRemarks(semesterGrade);
                          const isLocked = studentGrades.isLocked;
                          
                          return (
                            <tr key={student._id} className={`hover:bg-gray-50 ${isLocked ? 'bg-green-50' : ''}`}>
                              <td className="border border-gray-300 p-2 h-12 font-medium text-sm">
                                {student.schoolID || 'N/A'}
                              </td>
                              <td className="border border-gray-300 p-2 h-12 font-medium">
                                <div className="flex items-center gap-2">
                                  {student.name}
                                  {isLocked && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                      ✅ Posted
                                    </span>
                                  )}

                                </div>
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                {studentGrades.quarter1 || '-'}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                {studentGrades.quarter2 || '-'}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                {studentGrades.semesterFinal || semesterGrade || '-'}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                {studentGrades.remarks || remarks || '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="border border-gray-300 p-4 text-center text-gray-500">
                            No students available in this class and section.
                          </td>
                        </tr>
                      )}
                      
                      {/* General Average */}
                      <tr className="bg-yellow-100">
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
                        <td className="border border-gray-300 p-2 text-center font-bold">
                          {/* Remarks column for General Average */}
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
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    Second Semester (Q3 & Q4)
                    {selectedSection && selectedSection !== 'default' && (
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        - Section: {selectedSection}
                      </span>
                    )}
                    {selectedSection === 'default' && (
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        - Default Section
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
                
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300 text-sm">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Student ID</th>
                        <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Students</th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50" colSpan="2">Quarter</th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Semester Final Grade</th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Remarks</th>
                      </tr>
                      <tr>
                        <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                        <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">3</th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">4</th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length > 0 ? (
                        students.map((student) => {
                          const studentGrades = grades[student._id] || {};
                          const semesterGrade = calculateSemesterGrade(studentGrades.quarter3, studentGrades.quarter4);
                          const remarks = calculateRemarks(semesterGrade);
                          const isLocked = studentGrades.isLocked;
                          
                          return (
                            <tr key={student._id} className={`hover:bg-gray-50 ${isLocked ? 'bg-green-50' : ''}`}>
                              <td className="border border-gray-300 p-2 h-12 font-medium text-sm">
                                {student.schoolID || 'N/A'}
                              </td>
                              <td className="border border-gray-300 p-2 h-12 font-medium">
                                <div className="flex items-center gap-2">
                                  {student.name}
                                  {isLocked && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                      ✅ Posted
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                {studentGrades.quarter3 || '-'}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                {studentGrades.quarter4 || '-'}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                {studentGrades.semesterFinal || semesterGrade || '-'}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                {studentGrades.remarks || remarks || '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="border border-gray-300 p-4 text-center text-gray-500">
                            No students available in this class and section.
                          </td>
                        </tr>
                      )}
                      
                      {/* General Average */}
                      <tr className="bg-yellow-100">
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
                        <td className="border border-gray-300 p-2 text-center font-bold">
                          {/* Remarks column for General Average */}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Show message when no active term matches */}
            {(!currentTerm?.termName || (currentTerm?.termName !== 'Term 1' && currentTerm?.termName !== 'Term 2')) && (
              <div className="text-center py-8 text-gray-600">
                <p>No active term found. Please check your academic term settings.</p>
              </div>
            )}
          </>
        )}

        {/* Show message when class or section not selected */}
        {(selectedClass === null || !selectedSection) && (
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

        {/* Instructions */}
        {(!selectedClass || !selectedSection) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">How to View Grades</h3>
            <p className="text-blue-700">
              1. Select a <strong>Class</strong> from the dropdown above<br/>
              2. Choose a <strong>Section</strong> for that class<br/>
              3. View the grading table with all student grades
            </p>
            <p className="text-sm text-blue-600 mt-2">
              💡 <strong>Read-Only View:</strong> As a Principal, you can view all grades but cannot edit them
            </p>
            <p className="text-sm text-blue-600 mt-1">
              📊 <strong>Grade Status:</strong> Green checkmarks indicate grades that have been posted to students
            </p>
            <p className="text-sm text-blue-600 mt-1">
              🔒 <strong>Data Source:</strong> Grades are loaded from the Semestral_Grades_Collection database
            </p>
            <p className="text-sm text-blue-600 mt-1">
              📋 <strong>Principal Access:</strong> You have read-only access to view all faculty grades across all classes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}