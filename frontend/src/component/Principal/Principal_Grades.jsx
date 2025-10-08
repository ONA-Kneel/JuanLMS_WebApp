import { useState, useEffect } from "react";
import Principal_Navbar from "./Principal_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Principal_Grades() {
  const [isLoading, setIsLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState({});
  const [students, setStudents] = useState([]);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState("");
  const [availableSections, setAvailableSections] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [showStudentResults, setShowStudentResults] = useState(false);
  const [studentSubjectRows, setStudentSubjectRows] = useState([]);

  // Loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

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

  // Build sections when grade level changes (fetch from Sections API for current year/term)
  useEffect(() => {
    const run = async () => {
      if (!selectedGradeLevel || !academicYear || !currentTerm) {
        setAvailableSections([]);
        setSelectedSection(null);
        setStudents([]);
        setSelectedStudentId("");
        setStudentSearch("");
        setStudentSubjectRows([]);
        return;
      }
      try {
        const normalized = normalizeGradeLevel(selectedGradeLevel);
        const token = localStorage.getItem("token");
        const yearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const res = await fetch(`${API_BASE}/api/sections?schoolYear=${encodeURIComponent(yearName)}&termName=${encodeURIComponent(currentTerm.termName)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.ok ? await res.json() : [];
        const sections = Array.from(new Set(
          (Array.isArray(data) ? data : [])
            .filter(s => normalizeGradeLevel(s.gradeLevel) === normalized)
            .map(s => s.sectionName || s.section || "default")
        ));
        setAvailableSections(sections);
        setSelectedSection("");
        setStudents([]);
        setSelectedStudentId("");
        setStudentSearch("");
        setStudentSubjectRows([]);
      } catch {
        setAvailableSections([]);
      }
    };
    run();
  }, [selectedGradeLevel, academicYear, currentTerm]);

  // Fetch students when grade and section are chosen (new flow)
  useEffect(() => {
    if (!selectedGradeLevel || !selectedSection) return;
    fetchStudentsForGradeSection();
  }, [selectedGradeLevel, selectedSection]);

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
        
        // Get the actual student ID from schoolID (like 25-20000)
        const actualStudentID = student.schoolID || student.userID || student.studentID || 'STU-ID';
        
        return {
          _id: `student_${actualStudentID}`, // Create clean ID
          originalId: student._id || student.userID || student.studentID, // Keep original for API calls
          userID: student.userID || student.studentID || student._id,
          name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
          schoolID: actualStudentID, // Use actual student ID
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

  // New: fetch students for selected grade level and section (using first matching class)
  const fetchStudentsForGradeSection = async () => {
    try {
      const token = localStorage.getItem("token");
      // Fetch directly by section (backend aggregates StudentAssignments)
      const yearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
      const res = await fetch(`${API_BASE}/users/students/by-section?sectionName=${encodeURIComponent(selectedSection)}&termName=${encodeURIComponent(currentTerm?.termName || '')}&schoolYear=${encodeURIComponent(yearName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const studentsData = res.ok ? await res.json() : [];

      const transformed = studentsData.map((student, index) => {
        return {
          _id: `student_${index}_${student.schoolID || student.userID}`, // Create clean ID
          originalId: student._id, // Keep original for API calls
          userID: student.userID || student.studentID || student._id,
          name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
          schoolID: student.schoolID || student.userID || `STU-${index + 1}`, // Use schoolID from backend
          section: student.section || student.sectionName || 'default',
          grades: currentTerm?.termName === 'Term 2'
            ? { quarter3: '', quarter4: '', semesterFinal: '', remarks: '' }
            : { quarter1: '', quarter2: '', semesterFinal: '', remarks: '' }
        };
      });

      setStudents(transformed);
      const initial = {};
      transformed.forEach(s => { initial[s._id] = { ...s.grades }; });
      setGrades(initial);
      if (transformed.length > 0) {
        // Prefer loading grades by section (no classes involved)
        await loadSectionGrades(selectedSection, transformed);
      }
    } catch {
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
          const studentSchoolID = student.schoolID || student.originalId;
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
              const classGrades = data.grades[0];
              
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

  // Load grades for an entire section
  const loadSectionGrades = async (sectionName, studentsList) => {
    try {
      const token = localStorage.getItem("token");
      const yearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
      // Attempt section-based grades endpoint (if available)
      const res = await fetch(`${API_BASE}/api/semestral-grades/section/${encodeURIComponent(sectionName)}?termName=${encodeURIComponent(currentTerm.termName)}&academicYear=${encodeURIComponent(yearName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.grades) ? data.grades : Array.isArray(data) ? data : [];
        if (list.length > 0) {
          setGrades(prev => {
            const updated = { ...prev };
            studentsList.forEach(student => {
              const rec = list.find(g => g.studentID === student._id || g.schoolID === student.schoolID);
              if (rec && rec.grades) {
                const sg = rec.grades;
                const mapped = {
                  quarter1: sg.quarter1 || sg.q1 || '',
                  quarter2: sg.quarter2 || sg.q2 || '',
                  quarter3: sg.quarter3 || sg.q3 || '',
                  quarter4: sg.quarter4 || sg.q4 || '',
                  semesterFinal: sg.semesterFinal || sg.final || sg.semester || '',
                  remarks: sg.remarks || sg.remark || ''
                };
                updated[student._id] = { ...(updated[student._id] || {}), ...mapped, isLocked: !!rec.isLocked };
              }
            });
            return updated;
          });
          return;
        }
      }
    } catch { /* noop */ }

    // Fallback to per-student lookup
    await loadGradesByIndividualStudents(studentsList);
  };

  // Legacy: kept for reference; not used in grade/section flow (intentionally unused)
  // const handleClassChange = () => {};

  const handleSectionChange = (e) => {
    const section = e.target.value;
    setSelectedSection(section);
    setSelectedStudentId("");
    setStudentSearch("");
    setStudentSubjectRows([]);
  };

  // Normalize any grade level value into one of the two supported values
  const normalizeGradeLevel = (value) => {
    const s = String(value || '').toLowerCase();
    if (s.includes('11')) return 'Grade 11';
    if (s.includes('12')) return 'Grade 12';
    return '';
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen h-screen max-h-screen">
        <Principal_Navbar />
        <div className="flex-1 flex flex-col bg-gray-100 font-poppinsr overflow-hidden md:ml-64 h-full min-h-screen">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading grades...</p>
            <p className="text-gray-500 text-sm mt-2">Initializing grade management system</p>
          </div>
        </div>
      </div>
    );
  }

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


        {/* Grade Level Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Grade Level:</label>
          <select
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedGradeLevel}
            onChange={(e) => setSelectedGradeLevel(e.target.value)}
            disabled={loading}
          >
            <option value="">Choose a grade level...</option>
            {['Grade 11','Grade 12'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
              </div>

        {/* Section Selection (by Grade Level) */}
        {selectedGradeLevel && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Section (Grade {selectedGradeLevel}):</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedSection || ""}
              onChange={handleSectionChange}
            >
              <option value="">Choose a section...</option>
              {availableSections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
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

        {/* Student Search (by name or school ID) */}
        {selectedGradeLevel && selectedSection && students.length > 0 && (
          <div className="mb-6 relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Student (Name or School ID):</label>
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => { setStudentSearch(e.target.value); setShowStudentResults(true); }}
              onFocus={() => setShowStudentResults(true)}
              placeholder="Type name or school ID..."
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showStudentResults && studentSearch.trim() !== '' && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow max-h-60 overflow-auto">
                {students
                  .filter(s => {
                    const q = studentSearch.toLowerCase();
                    const name = (s.name || '').toLowerCase();
                    const id = String(s.schoolID || s.userID || s._id || '').toLowerCase();
                    return name.includes(q) || id.includes(q);
                  })
                  .slice(0, 20)
                  .map(s => (
                    <button
                      key={s._id}
                      onClick={() => { setSelectedStudentId(s._id); setStudentSearch(s.name); setShowStudentResults(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100"
                    >
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.schoolID || 'Student ID'}</div>
                    </button>
                  ))}
                {students.filter(s => {
                  const q = studentSearch.toLowerCase();
                  const name = (s.name || '').toLowerCase();
                  const id = String(s.schoolID || s.userID || s._id || '').toLowerCase();
                  return name.includes(q) || id.includes(q);
                }).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                )}
              </div>
            )}
            {selectedStudentId && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-gray-600">Viewing grades for:</span>
                <strong>{(students.find(s => s._id === selectedStudentId)?.name) || 'Selected student'}</strong>
                <button
                  onClick={() => { setSelectedStudentId(''); setStudentSearch(''); setShowStudentResults(false); }}
                  className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Grades Status Summary */}
        {selectedGradeLevel && selectedSection && students.length > 0 && (
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

        {/* Student-per-subject table when a student is selected */}
        {selectedGradeLevel && selectedSection && selectedStudentId && (
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {currentTerm?.termName === 'Term 2' ? 'Second Semester (Q3 & Q4)' : 'First Semester (Q1 & Q2)'}
                <span className="text-sm font-normal text-gray-600 ml-2">- Student: {(students.find(s => s._id === selectedStudentId)?.name) || ''}</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Subject Description</th>
                    {currentTerm?.termName === 'Term 2' ? (
                      <>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">3rd Quarter</th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">4th Quarter</th>
                      </>
                    ) : (
                      <>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">1st Quarter</th>
                        <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">2nd Quarter</th>
                      </>
                    )}
                    <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Semester Final Grade</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {studentSubjectRows.length > 0 ? (
                    studentSubjectRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2">{row.subject}</td>
                        {currentTerm?.termName === 'Term 2' ? (
                          <>
                            <td className="border border-gray-300 p-2 text-center bg-gray-100">{row.quarter3 || '-'}</td>
                            <td className="border border-gray-300 p-2 text-center bg-gray-100">{row.quarter4 || '-'}</td>
                          </>
                        ) : (
                          <>
                            <td className="border border-gray-300 p-2 text-center bg-gray-100">{row.quarter1 || '-'}</td>
                            <td className="border border-gray-300 p-2 text-center bg-gray-100">{row.quarter2 || '-'}</td>
                          </>
                        )}
                        <td className="border border-gray-300 p-2 text-center bg-gray-100">{row.final || '-'}</td>
                        <td className="border border-gray-300 p-2 text-center bg-gray-100">{row.remarks || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="border border-gray-300 p-4 text-center text-gray-500">
                        No grade records found for this student in Grade {selectedGradeLevel} - {selectedSection}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Only show tables when both class and section are selected (legacy view) */}
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
                        (selectedStudentId ? students.filter(st => st._id === selectedStudentId) : students).map((student) => {
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
                          {students.length > 0 ? (selectedStudentId ? (grades[selectedStudentId]?.quarter1 || '') : calculateGeneralAverage('quarter1')) : ''}
                        </td>
                        <td className="border border-gray-300 p-2 text-center font-bold">
                          {students.length > 0 ? (selectedStudentId ? (grades[selectedStudentId]?.quarter2 || '') : calculateGeneralAverage('quarter2')) : ''}
                        </td>
                        <td className="border border-gray-300 p-2 text-center font-bold">
                          {students.length > 0 ? (selectedStudentId ? (grades[selectedStudentId]?.semesterFinal || calculateSemesterGrade(grades[selectedStudentId]?.quarter1, grades[selectedStudentId]?.quarter2) || '') : calculateGeneralAverage('semesterFinal')) : ''}
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
                        (selectedStudentId ? students.filter(st => st._id === selectedStudentId) : students).map((student) => {
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
                          {students.length > 0 ? (selectedStudentId ? (grades[selectedStudentId]?.quarter3 || '') : calculateGeneralAverage('quarter3')) : ''}
                        </td>
                        <td className="border border-gray-300 p-2 text-center font-bold">
                          {students.length > 0 ? (selectedStudentId ? (grades[selectedStudentId]?.quarter4 || '') : calculateGeneralAverage('quarter4')) : ''}
                        </td>
                        <td className="border border-gray-300 p-2 text-center font-bold">
                          {students.length > 0 ? (selectedStudentId ? (grades[selectedStudentId]?.semesterFinal || calculateSemesterGrade(grades[selectedStudentId]?.quarter3, grades[selectedStudentId]?.quarter4) || '') : calculateGeneralAverage('semesterFinal')) : ''}
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

        {/* Show message when grade or section not selected (new flow) */}
        {((!selectedGradeLevel || !selectedSection) && selectedClass === null) && (
          <div className="text-center py-8 text-gray-600">
            {!selectedGradeLevel ? (
              <p>Please select a grade level to view available sections.</p>
            ) : !selectedSection ? (
              <p>Please select a section to search for a student and view grades.</p>
            ) : null}
          </div>
        )}

        {/* Instructions */}
        {((!selectedGradeLevel || !selectedSection) && selectedClass === null) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">How to View Grades</h3>
            <p className="text-blue-700">
              1. Select a <strong>Grade Level</strong><br/>
              2. Choose a <strong>Section</strong><br/>
              3. Search a <strong>Student</strong> to view grades per subject
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