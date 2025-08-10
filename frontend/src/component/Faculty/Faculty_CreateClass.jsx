import React, { useState, useEffect } from "react";
import ProfileMenu from "../ProfileMenu";
import Faculty_Navbar from "./Faculty_Navbar";
import archiveIcon from "../../assets/archive.png";
import createEventIcon from "../../assets/createEvent.png";
import * as XLSX from "xlsx";
import ValidationModal from "../ValidationModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function FacultyCreateClass() {
  const [studentName, setStudentName] = useState("");
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState("");
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [classImage, setClassImage] = useState(null);
  const [classDesc, setClassDesc] = useState("");
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  // Fetch faculty assignments on mount
  useEffect(() => {
    async function fetchAssignments() {
      try {
        const token = localStorage.getItem('token');
        let facultyID = localStorage.getItem('userID');
        
        // If userID is not in localStorage, try to get it from JWT token
        if (!facultyID && token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            facultyID = payload._id;
          } catch (e) {
            console.error('Failed to parse JWT token');
          }
        }
        
        if (!facultyID) {
          console.error('No faculty ID available');
          setFacultyAssignments([]);
          return;
        }
        
        // Get all faculty assignments and filter by current user
        const res = await fetch(`${API_BASE}/api/faculty-assignments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          // Filter assignments for the current faculty user
          const userAssignments = data.filter(assignment => 
            assignment.facultyId === facultyID || assignment.facultyId === userMongoId
          );
          setFacultyAssignments(userAssignments);
        } else {
          console.error('Failed to fetch faculty assignments');
          setFacultyAssignments([]);
        }
      } catch (error) {
        console.error('Error fetching faculty assignments:', error);
        setFacultyAssignments([]);
      }
    }
    fetchAssignments();
  }, []);

  // Debug: Log token and user info
  const token = localStorage.getItem('token');
  console.log('Token:', token);
  let userMongoId = "";
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('JWT payload:', payload);
      userMongoId = payload._id;
      console.log('userID:', localStorage.getItem('userID'));
      console.log('_id:', userMongoId);
    } catch {
      userMongoId = "";
    }
  }

  // When academicYear and currentTerm are loaded, filter assignments for those
  useEffect(() => {
    if (!academicYear || !currentTerm) return;
    
    console.log('Filtering assignments for:', { academicYear, currentTerm, facultyAssignments });
    
    // Filter assignments for current year and term
    const yearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
    const filtered = facultyAssignments.filter(a =>
      String(a.schoolYear) === String(yearName) &&
      (String(a.termId) === String(currentTerm._id) || (a.termId && a.termId.$oid && String(a.termId.$oid) === String(currentTerm._id)))
    );
    
    console.log('Filtered assignments:', filtered);
    setFilteredAssignments(filtered);
    
    // Get unique grade levels for this faculty in this year/term
    const uniqueGradeLevels = [...new Set(filtered.map(a => a.gradeLevel))];
    console.log('Available grade levels:', uniqueGradeLevels);
    
    // Auto-select the first grade level if only one exists
    if (uniqueGradeLevels.length === 1) {
      setSelectedGradeLevel(uniqueGradeLevels[0]);
    } else if (uniqueGradeLevels.length > 0 && !selectedGradeLevel) {
      setSelectedGradeLevel(uniqueGradeLevels[0]);
    }
    
    // Reset subject/section if not in filtered
    if (!filtered.some(a => a.gradeLevel === selectedGradeLevel)) {
      setSelectedSubject("");
      setSelectedSection("");
    }
  }, [academicYear, currentTerm, facultyAssignments, selectedGradeLevel]);

  // When grade level changes, update subjects
  useEffect(() => {
    if (!selectedGradeLevel) {
      setSubjects([]);
      setSelectedSubject("");
      return;
    }
    
    console.log('Updating subjects for grade level:', selectedGradeLevel);
    
    const filtered = filteredAssignments.filter(a =>
      String(a.gradeLevel) === String(selectedGradeLevel)
    );
    
    const uniqueSubjects = [...new Set(filtered.map(a => a.subjectName))];
    console.log('Available subjects:', uniqueSubjects);
    setSubjects(uniqueSubjects);
    
    // Reset subject if current selection is not available
    if (!uniqueSubjects.includes(selectedSubject)) {
      setSelectedSubject("");
    }
  }, [filteredAssignments, selectedGradeLevel, selectedSubject]);

  // When subject changes, update sections
  useEffect(() => {
    if (!selectedSubject) {
      setSections([]);
      setSelectedSection("");
      return;
    }
    
    console.log('Updating sections for subject:', selectedSubject);
    
    const filtered = filteredAssignments.filter(a =>
      String(a.gradeLevel) === String(selectedGradeLevel) &&
      a.subjectName === selectedSubject
    );
    
    const uniqueSections = [...new Set(filtered.map(a => a.sectionName))];
    console.log('Available sections:', uniqueSections);
    setSections(uniqueSections);
    
    // Reset section if current selection is not available
    if (!uniqueSections.includes(selectedSection)) {
      setSelectedSection("");
    }
  }, [filteredAssignments, selectedGradeLevel, selectedSubject, selectedSection]);

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
    async function fetchSectionStudents() {
      if (!selectedSection || !currentTerm || !academicYear) {
        setSelectedStudents([]);
        return;
      }
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/student-assignments?termId=${currentTerm._id}&sectionName=${selectedSection}&schoolYear=${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}&status=active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const assignments = await res.json();
        setSelectedStudents(assignments.map(a => a.studentId));
      } else {
        setSelectedStudents([]);
      }
    }
    fetchSectionStudents();
  }, [selectedSection, currentTerm, academicYear]);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setStudentName(query);

    if (!query) {
      setStudents([]);
      setError("");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/users/search?q=${query}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          setError("Session expired. Please log in again.");
          // Optionally: window.location.href = '/login';
        } else {
          setError("Error fetching student data");
        }
        setStudents([]);
        return;
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        setError("Unexpected response from server");
        setStudents([]);
        return;
      }
      const filteredStudents = data
        .filter(student => student.role === 'students')
        .filter(student => !selectedStudents.some(sel => sel._id === student._id));

      if (filteredStudents.length === 0) {
        setError("No student found");
      } else {
        setStudents(filteredStudents);
        setError("");
      }
    } catch {
      console.error("Error fetching student data:");
      setError("Error fetching student data");
    }
  };

  // Helper to check if a student is assigned to the selected section
  async function isStudentAssignedToSection(studentId) {
    if (!selectedSection || !currentTerm || !academicYear) return false;
    const token = localStorage.getItem('token');
    const res = await fetch(
      `${API_BASE}/api/student-assignments?studentId=${studentId}&termId=${currentTerm._id}&sectionName=${selectedSection}&schoolYear=${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}&status=active`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const assignments = await res.json();
    return assignments.length > 0;
  }

  // Update handleAddStudent to check assignment
  const handleAddStudent = async (student) => {
    const assigned = await isStudentAssignedToSection(student._id);
    if (assigned) {
      setSelectedStudents(prev => [...prev, student]);
      setStudentName("");
      setStudents([]);
      setError("");
    } else {
      setError("Student is not assigned to this section.");
    }
  };

  const handleRemoveStudent = (studentId) => {
    setSelectedStudents(prev => prev.filter(student => student._id !== studentId));
  };

  const handleCreateClass = async () => {
    // Generate classID: C + 3 random digits
    const randomNum = Math.floor(100 + Math.random() * 900);
    const classID = `C${randomNum}`;
    
    // Auto-generate class code
    let autoClassCode = "";
    if (selectedSubject && selectedSection && academicYear) {
      const subjectCode = selectedSubject.substring(0, 3).toUpperCase();
      const sectionCode = selectedSection.substring(0, 2).toUpperCase();
      const yearCode = academicYear.schoolYearStart.toString().slice(-2);
      autoClassCode = `${subjectCode}-${sectionCode}-${yearCode}`;
    }
    
    // Use userID if present, otherwise _id, and filter out any falsy values
    const members = selectedStudents.map(s => s.userID || s._id).filter(Boolean);
    const facultyID = localStorage.getItem("userID"); // get the faculty's userID
    const token = localStorage.getItem("token"); // or whatever you use for auth

    // Use dropdown values for className and classCode
    if (!selectedSubject || !selectedSection || !classDesc.trim() || members.length === 0) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: "Please fill in all fields and add at least one member."
      });
      return;
    }

    const formData = new FormData();
    formData.append('classID', classID);
    formData.append('className', selectedSubject);
    formData.append('classCode', autoClassCode);
    formData.append('classDesc', classDesc.trim());
    formData.append('members', JSON.stringify(members));
    formData.append('facultyID', facultyID);
    if (classImage) {
      formData.append('image', classImage);
    }

    try {
      const res = await fetch(`${API_BASE}/classes`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData,
      });
      if (res.ok) {
        setValidationModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: "Class created successfully!"
        });
        setSelectedSubject("");
        setSelectedSection("");
        setClassDesc("");
        setSelectedStudents([]);
        setClassImage(null);
      } else {
        const data = await res.json();
        let errorMessage = data.error || "Failed to create class";
        
        // Handle specific error cases
        if (res.status === 400) {
          errorMessage = data.error || 'Invalid class data. Please check your input.';
        } else if (res.status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (res.status === 403) {
          errorMessage = 'You do not have permission to create classes.';
        } else if (res.status === 409) {
          errorMessage = data.error || 'A class with this name already exists.';
        } else if (res.status >= 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        }
        
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Creation Failed',
          message: "Error: " + errorMessage
        });
      }
    } catch (err) {
      console.error("Error creating class:", err);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: "Network error. Please check your connection and try again."
      });
    }
  };

  // Update batch upload logic
  const handleBatchUpload = async (e) => {
    setBatchLoading(true);
    setBatchMessage('');
    const file = e.target.files[0];
    if (!file) {
      setBatchLoading(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      let added = 0;
      let skipped = 0;
      let skippedNames = [];
      for (const row of json) {
        const email = (row.Email || row["email"] || row["School Email"] || row["school email"] || "").trim();
        if (!email) {
          continue;
        }
        try {
          const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(email)}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const users = await res.json();
          const found = users[0];
          if (found && !selectedStudents.some(s => s._id === found._id)) {
            const assigned = await isStudentAssignedToSection(found._id);
            if (assigned) {
              setSelectedStudents(prev => [...prev, found]);
              added++;
            } else {
              skipped++;
              skippedNames.push(`${found.lastname}, ${found.firstname}`);
            }
          }
        } catch {
          // skip on error
        }
      }
      setBatchLoading(false);
      let msg = added > 0 ? `${added} member(s) added from Excel.` : '';
      if (skipped > 0) {
        msg += ` ${skipped} not added (not assigned to this section): ${skippedNames.join(', ')}`;
      }
      setBatchMessage(msg);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Classes</h2>
            <p className="text-base md:text-lg"> AY: {academicYear?.schoolYearStart}-{academicYear?.schoolYearEnd} | {currentTerm?.termName} | {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
          </div>

          <ProfileMenu />
        </div>
        <h3 className="text-4xl font-bold mt-5">Create Class</h3>

        {/* Responsive form layout to reduce right white space */}
        <div className="mt-6 flex flex-col md:flex-row md:space-x-8 space-y-6 md:space-y-0 ml-5">
          {/* Left column: image upload and class description */}
          <div className="flex-1 flex flex-col space-y-6">
            <label className="text-xl font-bold">Class Image</label>
            <input
              type="file"
              accept="image/*"
              className="w-full px-3 py-2 border rounded"
              onChange={e => setClassImage(e.target.files[0])}
            />
            
            <label className="text-xl font-bold">Class Description</label>
            <input
              type="text"
              placeholder="Enter class description..."
              className="w-full px-3 py-2 border rounded"
              value={classDesc}
              onChange={e => setClassDesc(e.target.value)}
            />
          </div>
          
          {/* Right column: dropdowns */}
          <div className="flex-1 flex flex-col space-y-6">
            <label className="text-xl font-bold">Grade Level</label>
            <select
              className="w-full px-3 py-2 border rounded"
              value={selectedGradeLevel}
              onChange={e => setSelectedGradeLevel(e.target.value)}
            >
              <option value="">Select Grade Level</option>
              {filteredAssignments
                .map(a => a.gradeLevel)
                .filter((value, index, self) => self.indexOf(value) === index)
                .map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))
              }
            </select>

            <label className="text-xl font-bold">Class Name (Subject)</label>
            <select
              className="w-full px-3 py-2 border rounded"
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              disabled={!selectedGradeLevel}
            >
              <option value="">Select Subject</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <label className="text-xl font-bold">Class Code (Section)</label>
            <select
              className="w-full px-3 py-2 border rounded"
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              disabled={!selectedSubject}
            >
              <option value="">Select Section</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
            
            {selectedSubject && selectedSection && academicYear && (
              <div className="bg-blue-50 p-3 rounded border">
                <p className="text-sm text-blue-800">
                  <strong>Auto-generated Class Code:</strong> {
                    selectedSubject.substring(0, 3).toUpperCase() + 
                    "-" + 
                    selectedSection.substring(0, 2).toUpperCase() + 
                    "-" + 
                    academicYear.schoolYearStart.toString().slice(-2)
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Debug Information - Remove this in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 ml-5 p-4 bg-gray-100 rounded border">
            <h4 className="font-bold mb-2">Debug Info:</h4>
            <div className="text-sm space-y-1">
              <p><strong>Faculty Assignments:</strong> {facultyAssignments.length}</p>
              <p><strong>Filtered Assignments:</strong> {filteredAssignments.length}</p>
              <p><strong>Available Grade Levels:</strong> {filteredAssignments.map(a => a.gradeLevel).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</p>
              <p><strong>Available Subjects:</strong> {subjects.join(', ')}</p>
              <p><strong>Available Sections:</strong> {sections.join(', ')}</p>
              <p><strong>Selected Grade Level:</strong> {selectedGradeLevel}</p>
              <p><strong>Selected Subject:</strong> {selectedSubject}</p>
              <p><strong>Selected Section:</strong> {selectedSection}</p>
            </div>
          </div>
        )}

        <h3 className="text-4xl font-bold mt-10 mb-7">Members</h3>
          {/* Batch Upload Input - restyled to match Bulk Assign Students UI */}
          <div className="md:space-x-8 space-y-6 md:space-y-0 ml-5">

          
            <div className="border rounded-lg p-4 bg-white mb-4 w-full ">
              <div className="font-bold mb-2">Bulk Assign Students</div>
              <div className="text-sm text-gray-600 mb-2">Upload Excel File</div>
              <div className="flex items-center gap-4 mb-2">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBatchUpload}
                  className="border rounded px-2 py-1 text-sm w-full"
                />
                <button
                  type="button"
                  className="bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded px-4 py-2 text-sm"
                  onClick={() => window.open('/path/to/template.xlsx', '_blank')}
                >
                  Download Template
                </button>
              </div>
              {batchLoading && <span className="text-blue-600 block mt-2">Processing batch upload...</span>}
              {batchMessage && <span className="text-green-600 block mt-2">{batchMessage}</span>}
              
            </div>
            <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="mx-4 text-gray-400 text-sm">Or assign manually</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

            {/* Manual Student Name Input - styled */}
            <label className="block text-gray-700 text-sm font-semibold mb-1 mt-2">Student Name</label>
            <input
              type="text"
              placeholder="Search Student..."
              className="w-full px-3 py-2 rounded border border-gray-300 bg-gray-50 text-base focus:outline-none focus:ring-2 focus:ring-[#00418b] mb-4"
              value={studentName}
              onChange={handleSearch}
            />

              <div className="mt-4 w-1/2">
                {error && <p className="text-red-500">{error}</p>}
                <ul className="space-y-2 w-full">
                  {students.map((student) => (
                    <li
                      key={student._id}
                      className="flex items-center bg-gray-300 hover:bg-gray-400 transition-colors cursor-pointer px-4 py-2 rounded font-poppinsr"
                      onClick={() => handleAddStudent(student)}
                    >
                      <span className="font-bold mr-2">{student.lastname}, {student.firstname}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedStudents.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-4">Class Members:</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 border w-1/6">School ID</th>
                          <th className="p-3 border w-1/6">Last Name</th>
                          <th className="p-3 border w-1/6">First Name</th>
                          <th className="p-3 border w-1/6">Middle Name</th>
                          <th className="p-3 border w-1/6">Section</th>
                          <th className="p-3 border w-1/6">Email</th>
                          <th className="p-3 border w-1/6">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudents
                          .filter(student => student && student.firstname && student.lastname)
                          .map(student => (
                            <tr key={student._id}>
                              <td className="p-3 border">{student.schoolID || '-'}</td>
                              <td className="p-3 border">{student.lastname}</td>
                              <td className="p-3 border">{student.firstname}</td>
                              <td className="p-3 border">{student.middlename}</td>
                              <td className="p-3 border">{selectedSection || '-'}</td>
                              <td className="p-3 border">{student.email}</td>
                              <td className="p-3 border">
                                <button
                                  onClick={() => handleRemoveStudent(student._id)}
                                  className="bg-white hover:bg-gray-200 text-red-600 rounded px-2 py-1 text-xs"
                                  style={{ transition: 'background 0.2s' }}
                                >
                                  <img src={archiveIcon} alt="Remove" className="w-8 h-8 inline-block" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          <button
          className="bg-blue-900 hover:bg-blue-800 rounded-2xl  w-full h-15 flex items-center justify-center shadow-lg transition-colors mt-10"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          onClick={handleCreateClass}
          disabled={batchLoading}
        >
          <img src={createEventIcon} alt="Create" className="w-7 h-7 mr-2" />
          <span className="mt-2 font-semibold text-white">Create</span>
        </button>
        
        </div>

        
      
        <ValidationModal
        isOpen={validationModal.isOpen}
        onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
        type={validationModal.type}
        title={validationModal.title}
        message={validationModal.message}
      />

      </div>
      
      
  );
}
