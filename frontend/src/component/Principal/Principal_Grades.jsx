import { useState, useEffect } from "react";
import Principal_Navbar from "./Principal_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Principal_Grades() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [strands, setStrands] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  
  // Selection states
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [selectedStrand, setSelectedStrand] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);

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

  // Fetch grade levels
  useEffect(() => {
    async function fetchGradeLevels() {
      try {
        // Use hardcoded grade levels since we don't have a specific endpoint
        setGradeLevels(['Grade 11', 'Grade 12']);
      } catch (error) {
        console.error('Error setting grade levels:', error);
        setGradeLevels(['Grade 11', 'Grade 12']);
      }
    }
    fetchGradeLevels();
  }, []);

  // Fetch strands when grade level changes
  useEffect(() => {
    if (!selectedGradeLevel) {
      setStrands([]);
      setSelectedStrand('');
      return;
    }

    async function fetchStrands() {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        
        // Read from the dedicated sections collection instead of grades
        const response = await fetch(`${API_BASE}/api/sections?schoolYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}&termName=${currentTerm?.termName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
          const sections = await response.json();
          if (sections && sections.length > 0) {
            // Extract unique strands from sections that match our grade level
            const matchingStrands = [...new Set(sections
              .filter(section => section.gradeLevel === selectedGradeLevel)
              .map(section => section.strandName)
              .filter(strand => strand && strand.trim() !== '')
            )];
            
            if (matchingStrands.length > 0) {
              setStrands(matchingStrands.sort());
            } else {
              // Fallback to standard strands
              setStrands(['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL']);
            }
          } else {
            // Fallback to standard strands
            setStrands(['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL']);
          }
        } else {
          // Fallback to standard strands
          setStrands(['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL']);
        }
      } catch (error) {
        console.error('Error fetching strands:', error);
        // Fallback to standard strands
        setStrands(['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL']);
      } finally {
        setLoading(false);
      }
    }
    fetchStrands();
  }, [selectedGradeLevel, currentTerm, academicYear]);

  // Fetch sections when strand changes
  useEffect(() => {
    if (!selectedStrand) {
      setSections([]);
      setSelectedSection('');
      return;
    }

    async function fetchSections() {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        
        // Read from the dedicated sections collection instead of grades
        const response = await fetch(`${API_BASE}/api/sections?schoolYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}&termName=${currentTerm?.termName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
          const sections = await response.json();
          if (sections && sections.length > 0) {
            // Extract unique sections that match our grade level and strand
            const matchingSections = [...new Set(sections
              .filter(section => 
                section.gradeLevel === selectedGradeLevel && 
                section.strandName.toLowerCase().includes(selectedStrand.toLowerCase())
              )
              .map(section => section.sectionName)
              .filter(section => section && section.trim() !== '')
            )];
            
            if (matchingSections.length > 0) {
              setSections(matchingSections.sort());
            } else {
              // Fallback to sample sections
              setSections(['Section A', 'Section B', 'Section C', 'Section D']);
            }
          } else {
            // Fallback to sample sections
            setSections(['Section A', 'Section B', 'Section C', 'Section D']);
          }
        } else {
          // Fallback to sample sections
          setSections(['Section A', 'Section B', 'Section C', 'Section D']);
        }
      } catch (error) {
        console.error('Error fetching sections:', error);
        // Fallback to sample sections
        setSections(['Section A', 'Section B', 'Section C', 'Section D']);
      } finally {
        setLoading(false);
      }
    }
    fetchSections();
  }, [selectedStrand, selectedGradeLevel, currentTerm, academicYear]);

  // Fetch subjects when section changes
  useEffect(() => {
    if (!selectedSection) {
      setSubjects([]);
      setSelectedSubject('');
      return;
    }

    async function fetchSubjects() {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        
        // Read from the dedicated subjects collection instead of grades
        const response = await fetch(`${API_BASE}/api/subjects?schoolYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}&termName=${currentTerm?.termName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
          const subjects = await response.json();
          if (subjects && subjects.length > 0) {
            // Filter subjects based on our selection criteria
            const matchingSubjects = subjects.filter(subject => {
              // Match grade level
              const gradeLevelMatch = subject.gradeLevel === selectedGradeLevel;
              
              // Match strand (case-insensitive)
              const strandMatch = subject.strandName?.toLowerCase().includes(selectedStrand.toLowerCase());
              
              // Match section by checking if the subject is taught in the selected section
              // We'll need to check if this subject is available for the selected section
              // For now, we'll include all subjects that match grade level and strand
              // The section filtering will happen when we fetch grades
              
              return gradeLevelMatch && strandMatch;
            });
            
            if (matchingSubjects.length > 0) {
              // Extract unique subject names
              const uniqueSubjects = [...new Set(matchingSubjects
                .map(subject => subject.subjectName)
                .filter(subject => subject && subject.trim() !== '')
              )];
              
              setSubjects(uniqueSubjects.sort());
              return;
            }
          }
        }
        
        // Fallback to sample subjects if no data found
        setSubjects(['Mathematics', 'Science', 'English', 'Filipino', 'Social Studies', 'Physical Education', 'Values Education']);
        
      } catch (error) {
        console.error('Error fetching subjects:', error);
        // Fallback to sample subjects
        setSubjects(['Mathematics', 'Science', 'English', 'Filipino', 'Social Studies', 'Physical Education', 'Values Education']);
      } finally {
        setLoading(false);
      }
    }
    fetchSubjects();
  }, [selectedSection, selectedStrand, selectedGradeLevel, currentTerm, academicYear]);

  // Fetch grades when subject is selected
  useEffect(() => {
    if (!selectedSubject || !selectedSection || !selectedStrand || !selectedGradeLevel) {
      setGrades([]);
      setStudents([]);
      return;
    }

    async function fetchGrades() {
      try {
        setLoadingGrades(true);
        const token = localStorage.getItem("token");
        
        // Debug: Check what's in the token
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('🔍 JWT Token Payload:', payload);
            console.log('🔍 User Role:', payload.role);
            console.log('🔍 User ID:', payload._id);
          } catch (e) {
            console.log('🔍 Could not decode JWT token:', e);
          }
        }
        
        // Use the same approach as GradingSystem.jsx - fetch students first, then their grades
        let grades = [];
        
        try {
          console.log('🔍 Using GradingSystem.jsx approach to fetch grades...');
          
          // Step 1: Try to get students from the comprehensive endpoint (same as GradingSystem.jsx)
          const comprehensiveResponse = await fetch(
            `${API_BASE}/api/grading/class/all/section/${selectedSection}/comprehensive?` +
            `trackName=${selectedStrand}&` +
            `strandName=${selectedStrand}&` +
            `gradeLevel=${selectedGradeLevel}&` +
            `schoolYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}&` +
            `termName=${currentTerm?.termName}`,
            {
              headers: { "Authorization": `Bearer ${token}` }
            }
          );
          
          if (comprehensiveResponse.ok) {
            const comprehensiveData = await comprehensiveResponse.json();
            console.log('🔍 Comprehensive endpoint response:', comprehensiveData);
            
            if (comprehensiveData.success && comprehensiveData.data && comprehensiveData.data.students) {
              const students = comprehensiveData.data.students;
              console.log(`🔍 Found ${students.length} students from comprehensive endpoint`);
              
              // Step 2: For each student, fetch their grades using the student endpoint (same as GradingSystem.jsx)
              for (const student of students.slice(0, 20)) { // Limit to first 20 for performance
                try {
                  const studentID = student.userID || student.studentID || student._id || student.id;
                  if (studentID) {
                    const gradeResponse = await fetch(`${API_BASE}/api/semestral-grades/student/${studentID}`, {
                      headers: { "Authorization": `Bearer ${token}` }
                    });
                    
                    if (gradeResponse.ok) {
                      const gradeData = await gradeResponse.json();
                      if (gradeData.success && gradeData.grades) {
                        // Filter grades by our criteria (same filtering logic as GradingSystem.jsx)
                        const filteredGrades = gradeData.grades.filter(grade => {
                          const subjectMatch = grade.subjectName?.toLowerCase().includes(selectedSubject.toLowerCase()) ||
                                             grade.subjectCode?.toLowerCase().includes(selectedSubject.toLowerCase());
                          const sectionMatch = !grade.section || grade.section === selectedSection;
                          const termMatch = grade.termName === currentTerm?.termName;
                          const yearMatch = grade.academicYear === `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`;
                          
                          return subjectMatch && sectionMatch && termMatch && yearMatch;
                        });
                        
                        if (filteredGrades.length > 0) {
                          // Transform the data to match our expected format
                          const transformedGrades = filteredGrades.map(grade => ({
                            _id: student._id || studentID,
                            studentName: student.name || student.studentName || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
                            schoolID: studentID,
                            grades: {
                              quarter1: grade.quarter1 || grade.first_quarter || '-',
                              quarter2: grade.quarter2 || grade.second_quarter || '-',
                              quarter3: grade.quarter3 || grade.third_quarter || '-',
                              quarter4: grade.quarter4 || grade.fourth_quarter || '-',
                              semesterFinal: grade.semesterFinal || grade.final_grade || '-',
                              remarks: grade.remarks || grade.remark || '-'
                            },
                            subjectName: grade.subjectName,
                            subjectCode: grade.subjectCode,
                            section: grade.section || selectedSection
                          }));
                          
                          grades.push(...transformedGrades);
                        }
                      }
                    }
                  }
                } catch (error) {
                  console.log(`🔍 Error fetching grades for student ${student.name}:`, error);
                }
              }
            }
          } else {
            console.log('🔍 Comprehensive endpoint failed, trying alternative approach...');
          }
        } catch (error) {
          console.log('🔍 Comprehensive approach failed:', error);
        }
        
        // If no grades found, try the sections approach (same as GradingSystem.jsx fallback)
        if (grades.length === 0) {
          try {
            console.log('🔍 Trying sections approach as fallback...');
            const sectionsResponse = await fetch(`${API_BASE}/api/sections?schoolYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}&termName=${currentTerm?.termName}`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (sectionsResponse.ok) {
              const sections = await sectionsResponse.json();
              console.log('🔍 Sections found:', sections);
              
              // Look for grades in the sections data
              if (sections && sections.length > 0) {
                const matchingSection = sections.find(section => 
                  section.sectionName === selectedSection && 
                  section.strandName === selectedStrand &&
                  section.gradeLevel === selectedGradeLevel
                );
                
                if (matchingSection && matchingSection.grades) {
                  console.log('🔍 Found grades in section data:', matchingSection.grades);
                  grades = matchingSection.grades;
                }
              }
            }
          } catch (error) {
            console.log('🔍 Sections approach failed:', error);
          }
        }

        console.log('🔍 Final grades found:', grades);
        
        if (grades.length > 0) {
          // Filter grades on the frontend based on our selection criteria
          const filteredGrades = grades.filter(grade => {
            // Filter by subject name or code (case-insensitive)
            const subjectMatch = grade.subjectName?.toLowerCase().includes(selectedSubject.toLowerCase()) ||
                               grade.subjectCode?.toLowerCase().includes(selectedSubject.toLowerCase());
            
            // Filter by section (use section field from database)
            const sectionMatch = !grade.section || grade.section === selectedSection;
            
            return subjectMatch && sectionMatch;
          });
          
          setGrades(filteredGrades);
          
          // Extract unique students from filtered grades
          const uniqueStudents = [...new Set(filteredGrades.map(grade => ({
            _id: grade._id,
            name: grade.studentName,
            schoolID: grade.schoolID
          })))];
          
          setStudents(uniqueStudents);
        } else {
          // If no grades found, set empty arrays
          setGrades([]);
          setStudents([]);
        }

      } catch (error) {
        console.error('Error fetching grades:', error);
        setGrades([]);
        setStudents([]);
      } finally {
        setLoadingGrades(false);
      }
    }

    fetchGrades();
  }, [selectedSubject, selectedSection, selectedStrand, selectedGradeLevel, currentTerm, academicYear]);

  // Reset selections when higher level changes
  const handleGradeLevelChange = (gradeLevel) => {
    setSelectedGradeLevel(gradeLevel);
    setSelectedStrand('');
    setSelectedSection('');
    setSelectedSubject('');
    setGrades([]);
    setStudents([]);
  };

  const handleStrandChange = (strand) => {
    setSelectedStrand(strand);
    setSelectedSection('');
    setSelectedSubject('');
    setGrades([]);
    setStudents([]);
  };

  const handleSectionChange = (section) => {
    setSelectedSection(section);
    setSelectedSubject('');
    setGrades([]);
    setStudents([]);
  };

  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject);
  };

  // Helper function to get grade display based on term
  const getGradeDisplay = (studentGrades) => {
    if (currentTerm?.termName === 'Term 1') {
      return {
        quarter1: studentGrades.quarter1 || '-',
        quarter2: studentGrades.quarter2 || '-',
        semesterFinal: studentGrades.semesterFinal || '-',
        remarks: studentGrades.remarks || '-'
      };
    } else if (currentTerm?.termName === 'Term 2') {
      return {
        quarter3: studentGrades.quarter3 || '-',
        quarter4: studentGrades.quarter4 || '-',
        semesterFinal: studentGrades.semesterFinal || '-',
        remarks: studentGrades.remarks || '-'
      };
    } else {
      // Fallback to traditional grades
      return {
        prelims: studentGrades.prelims || '-',
        midterms: studentGrades.midterms || '-',
        final: studentGrades.final || '-',
        finalGrade: studentGrades.finalGrade || '-',
        remark: studentGrades.remark || '-'
      };
    }
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
          <ProfileMenu/>
        </div>

        {/* Grade Selection Controls */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">Select Grade View Parameters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Grade Level Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
              <select
                value={selectedGradeLevel}
                onChange={(e) => handleGradeLevelChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Grade Level</option>
                {gradeLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* Strand Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Strand</label>
              <select
                value={selectedStrand}
                onChange={(e) => handleStrandChange(e.target.value)}
                disabled={!selectedGradeLevel || loading}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Strand</option>
                {strands.map((strand) => (
                  <option key={strand} value={strand}>{strand}</option>
                ))}
              </select>
            </div>

            {/* Section Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => handleSectionChange(e.target.value)}
                disabled={!selectedStrand || loading}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Section</option>
                {sections.map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="label text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                disabled={!selectedSection || loading}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>

          {loading && (
            <div className="mt-4 text-center text-gray-600">
              <p>Loading options...</p>
            </div>
          )}
        </div>

        {/* Grades Table */}
        {selectedSubject && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {academicYear?.schoolYearStart}-{academicYear?.schoolYearEnd} {currentTerm?.termName === 'Term 1' ? '1st Semester' : currentTerm?.termName === 'Term 2' ? '2nd Semester' : currentTerm?.termName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedGradeLevel} - {selectedStrand} - {selectedSection} - {selectedSubject}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Showing {grades.length} student grade(s) for {selectedSubject}
              </p>
            </div>

            {loadingGrades ? (
              <div className="p-8 text-center">
                <p className="text-gray-600">Loading grades...</p>
              </div>
            ) : grades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-3 text-left font-medium text-gray-700">Student Name</th>
                      <th className="p-3 text-left font-medium text-gray-700">Student ID</th>
                      <th className="p-3 text-center font-medium text-gray-700">1st Quarter</th>
                      <th className="p-3 text-center font-medium text-gray-700">2nd Quarter</th>
                      <th className="p-3 text-center font-medium text-gray-700">Semestral Grade</th>
                      <th className="p-3 text-center font-medium text-gray-700">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((grade, index) => {
                      return (
                        <tr key={grade._id || index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-medium">{grade.studentName || 'N/A'}</td>
                          <td className="p-3 text-gray-600">{grade.schoolID || 'N/A'}</td>
                          <td className="p-3 text-center">{grade.grades?.quarter1 || '-'}</td>
                          <td className="p-3 text-center">{grade.grades?.quarter2 || '-'}</td>
                          <td className="p-3 text-center font-semibold">{grade.grades?.semesterFinal || '-'}</td>
                          <td className="p-3 text-center">{grade.grades?.remarks || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>No grades found for the selected criteria.</p>
                <p className="text-sm mt-2">Please ensure all parameters are selected and grades have been posted.</p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!selectedSubject && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">How to View Grades</h3>
            <p className="text-blue-700">
              1. Select a <strong>Grade Level</strong> (e.g., Grade 11)<br/>
              2. Choose a <strong>Strand</strong> (e.g., ABM, STEM, HUMSS)<br/>
              3. Pick a <strong>Section</strong> (e.g., ABM111, STEM112)<br/>
              4. Select a <strong>Subject</strong> to view student grades
            </p>
            <p className="text-sm text-blue-600 mt-2">
              💡 <strong>Data Source:</strong> Now reading from actual database collections (Sections, Subjects, SemestralGrades)
            </p>
            <p className="text-sm text-blue-600 mt-1">
              🔄 <strong>Data Fetching:</strong> Using the same approach as GradingSystem.jsx to avoid role restrictions
            </p>
          </div>
        )}

        {/* Debug Information - Remove this in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">🔍 Debug Info</h3>
            <div className="text-sm space-y-2">
              <p><strong>Current Term:</strong> {currentTerm?.termName || 'Not set'}</p>
              <p><strong>Academic Year:</strong> {academicYear ? `${academicYear.schoolYearStart}-${academicYear?.schoolYearEnd}` : 'Not set'}</p>
              <p><strong>Selected Grade Level:</strong> {selectedGradeLevel || 'None'}</p>
              <p><strong>Selected Strand:</strong> {selectedStrand || 'None'}</p>
              <p><strong>Selected Section:</strong> {selectedSection || 'None'}</p>
              <p><strong>Selected Subject:</strong> {selectedSubject || 'None'}</p>
              <p><strong>Grades Found:</strong> {grades.length}</p>
              <p><strong>Students Found:</strong> {students.length}</p>
              <p><strong>Loading Grades:</strong> {loadingGrades ? 'Yes' : 'No'}</p>
              <p><strong>API Base:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{API_BASE}</code></p>
              
              <div className="mt-4">
                <button
                  onClick={() => {
                    const token = localStorage.getItem("token");
                    if (token) {
                      try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        alert(`🔍 JWT Token Debug:\n\nUser ID: ${payload._id}\nUser Role: ${payload.role}\nEmail: ${payload.email}\nFull Token: ${token.substring(0, 50)}...`);
                      } catch (e) {
                        alert(`❌ Could not decode JWT token:\n\nError: ${e.message}`);
                      }
                    } else {
                      alert('❌ No token found in localStorage');
                    }
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  🔍 Check User Role
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("token");
                      const response = await fetch(`${API_BASE}/api/sections?schoolYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}&termName=${currentTerm?.termName}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        alert(`✅ Sections API Test Successful!\n\nFound ${data.length || 0} sections\n\nResponse: ${JSON.stringify(data, null, 2)}`);
                      } else {
                        const errorData = await response.json();
                        alert(`❌ Sections API Test Failed!\n\nStatus: ${response.status}\n\nError: ${errorData.message || response.statusText}`);
                      }
                    } catch (error) {
                      alert(`❌ Sections API Test Error!\n\nError: ${error.message}`);
                    }
                  }}
                  className="ml-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                >
                  🧪 Test Sections API
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("token");
                      const response = await fetch(`${API_BASE}/api/subjects?schoolYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}&termName=${currentTerm?.termName}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        alert(`✅ Subjects API Test Successful!\n\nFound ${data.length || 0} subjects\n\nResponse: ${JSON.stringify(data, null, 2)}`);
                      } else {
                        const errorData = await response.json();
                        alert(`❌ Subjects API Test Failed!\n\nStatus: ${response.status}\n\nError: ${errorData.message || response.statusText}`);
                      }
                    } catch (error) {
                      alert(`❌ Subjects API Test Error!\n\nError: ${error.message}`);
                    }
                  }}
                  className="ml-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  🧪 Test Subjects API
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("token");
                      const response = await fetch(`${API_BASE}/api/classes`, {
                        headers: { "Authorization": `Bearer ${token}` }
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        alert(`✅ Classes API Test Successful!\n\nFound ${data.length || 0} classes\n\nResponse: ${JSON.stringify(data, null, 2)}`);
                      } else {
                        const errorData = await response.json();
                        alert(`❌ Classes API Test Failed!\n\nStatus: ${response.status}\n\nError: ${errorData.message || response.statusText}`);
                      }
                    } catch (error) {
                      alert(`❌ Classes API Test Error!\n\nError: ${error.message}`);
                    }
                  }}
                  className="ml-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                >
                  🧪 Test Classes API
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("token");
                      const response = await fetch(`${API_BASE}/api/semestral-grades/class/list?termName=${currentTerm?.termName}&academicYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        alert(`✅ Class List API Test Successful!\n\nFound ${data.classes?.length || 0} classes\n\nResponse: ${JSON.stringify(data, null, 2)}`);
                      } else {
                        const errorData = await response.json();
                        alert(`❌ Class List API Test Failed!\n\nStatus: ${response.status}\n\nError: ${errorData.message || response.statusText}`);
                      }
                    } catch (error) {
                      alert(`❌ Class List API Test Error!\n\nError: ${error.message}`);
                    }
                  }}
                  className="ml-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  🧪 Test Class List API
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("token");
                      const response = await fetch(`${API_BASE}/api/semestral-grades?termName=${currentTerm?.termName}&academicYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        alert(`✅ Semestral Grades API Test Successful!\n\nFound ${data.grades?.length || 0} grades\n\nResponse: ${JSON.stringify(data, null, 2)}`);
                      } else {
                        const errorData = await response.json();
                        alert(`❌ Semestral Grades API Test Failed!\n\nStatus: ${response.status}\n\nError: ${errorData.message || response.statusText}`);
                      }
                    } catch (error) {
                      alert(`❌ Semestral Grades API Test Error!\n\nError: ${error.message}`);
                    }
                  }}
                  className="ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  🧪 Test Semestral Grades API
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("token");
                      const response = await fetch(`${API_BASE}/api/semestral-grades/class/all?termName=${currentTerm?.termName}&academicYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        alert(`✅ Class All API Test Successful!\n\nFound ${data.grades?.length || 0} grades\n\nResponse: ${JSON.stringify(data, null, 2)}`);
                      } else {
                        const errorData = await response.json();
                        alert(`❌ Class All API Test Failed!\n\nStatus: ${response.status}\n\nError: ${errorData.message || response.statusText}`);
                      }
                    } catch (error) {
                      alert(`❌ Class All API Test Error!\n\nError: ${error.message}`);
                    }
                  }}
                  className="ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  🧪 Test Class All API
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("token");
                      const response = await fetch(`${API_BASE}/api/traditional-grades/all?termName=${currentTerm?.termName}&academicYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        alert(`✅ Traditional Grades API Test Successful!\n\nFound ${data.grades?.length || 0} grades\n\nResponse: ${JSON.stringify(data, null, 2)}`);
                      } else {
                        const errorData = await response.json();
                        alert(`❌ Traditional Grades API Test Failed!\n\nStatus: ${response.status}\n\nError: ${errorData.message || response.statusText}`);
                      }
                    } catch (error) {
                      alert(`❌ Traditional Grades API Test Error!\n\nError: ${error.message}`);
                    }
                  }}
                  className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  🧪 Test Traditional Grades API
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("token");
                      const response = await fetch(`${API_BASE}/api/semestral-grades/principal-view?gradeLevel=${selectedGradeLevel || 'Grade 11'}&strand=${selectedStrand || 'Cookery'}&section=${selectedSection || 'CKYIII'}&subject=${selectedSubject || 'Introduction to Cooking'}&termName=${currentTerm?.termName}&academicYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        alert(`✅ Principal View API Test Successful!\n\nFound ${data.grades?.length || 0} grades\n\nResponse: ${JSON.stringify(data, null, 2)}`);
                      } else {
                        const errorData = await response.json();
                        alert(`❌ Principal View API Test Failed!\n\nStatus: ${response.status}\n\nError: ${errorData.message || response.statusText}`);
                      }
                    } catch (error) {
                      alert(`❌ Principal View API Test Error!\n\nError: ${error.message}`);
                    }
                  }}
                  className="ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  🧪 Test Principal View API
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("token");
                      // Test the comprehensive endpoint that GradingSystem.jsx uses
                      const response = await fetch(
                        `${API_BASE}/api/grading/class/all/section/${selectedSection || 'CKYIII'}/comprehensive?` +
                        `trackName=${selectedStrand || 'Cookery'}&` +
                        `strandName=${selectedStrand || 'Cookery'}&` +
                        `gradeLevel=${selectedGradeLevel || 'Grade 11'}&` +
                        `schoolYear=${academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : '2025-2026'}&` +
                        `termName=${currentTerm ? currentTerm.termName : 'Term 1'}`,
                        {
                          headers: { "Authorization": `Bearer ${token}` }
                        }
                      );
                      
                      if (response.ok) {
                        const data = await response.json();
                        alert(`✅ Comprehensive Endpoint Test Successful!\n\nFound ${data.data?.students?.length || 0} students\n\nResponse: ${JSON.stringify(data, null, 2)}`);
                      } else {
                        const errorData = await response.json();
                        alert(`❌ Comprehensive Endpoint Test Failed!\n\nStatus: ${response.status}\n\nError: ${errorData.message || response.statusText}`);
                      }
                    } catch (error) {
                      alert(`❌ Comprehensive Endpoint Test Error!\n\nError: ${error.message}`);
                    }
                  }}
                  className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                  🧪 Test Comprehensive Endpoint
                </button>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <h4 className="font-semibold mb-2">📊 Data Summary:</h4>
                <p><strong>Available Grade Levels:</strong> {gradeLevels.join(', ')}</p>
                <p><strong>Available Strands:</strong> {strands.join(', ')}</p>
                <p><strong>Available Sections:</strong> {sections.join(', ')}</p>
                <p><strong>Available Subjects:</strong> {subjects.join(', ')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}