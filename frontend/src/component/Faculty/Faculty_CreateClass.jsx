import React, { useState, useEffect } from "react";
import ProfileMenu from "../ProfileMenu";
import Faculty_Navbar from "./Faculty_Navbar";
import archiveIcon from "../../assets/archive.png";
import createEventIcon from "../../assets/createEvent.png";
import * as XLSX from "xlsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function FacultyCreateClass() {
  const [studentName, setStudentName] = useState("");
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [classDesc, setClassDesc] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState('');
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [gradeLevels] = useState(["Grade 11", "Grade 12"]);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState("");
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  // Fetch all school years on mount
  useEffect(() => {
    async function fetchSchoolYears() {
      try {
        const res = await fetch(`${API_BASE}/api/schoolyears`);
        const data = await res.json();
        setSchoolYears(data);
      } catch {
        setSchoolYears([]);
      }
    }
    fetchSchoolYears();
  }, []);

  // Fetch terms when school year changes
  useEffect(() => {
    async function fetchTerms() {
      if (!selectedSchoolYear) return setTerms([]);
      try {
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${selectedSchoolYear}`);
        const data = await res.json();
        setTerms(data);
      } catch {
        setTerms([]);
      }
    }
    fetchTerms();
  }, [selectedSchoolYear]);

  // Fetch faculty assignments on mount
  useEffect(() => {
    async function fetchAssignments() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/faculty-assignments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setFacultyAssignments(data);
      } catch {
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

  // Filter assignments when filters change
  useEffect(() => {
    // Debug: log all assignments and current filters
    console.log('All facultyAssignments:', facultyAssignments);
    if (facultyAssignments.length > 0) {
      console.log('Sample facultyAssignment:', facultyAssignments[0]);
      console.log('Assignment schoolYear:', facultyAssignments[0].schoolYear);
      console.log('Assignment termId:', facultyAssignments[0].termId);
    }
    console.log('Current filters:', {
      userMongoId,
      selectedSchoolYear,
      selectedTerm,
      selectedGradeLevel
    });
    let filtered = facultyAssignments.filter(a =>
      (
        String(a.facultyId) === String(userMongoId) ||
        (a.facultyId && a.facultyId.$oid && String(a.facultyId.$oid) === String(userMongoId))
      ) &&
      (!selectedSchoolYear || String(a.schoolYear) === String(selectedSchoolYear)) &&
      (
        !selectedTerm ||
        String(a.termId) === String(selectedTerm) ||
        (a.termId && a.termId.$oid && String(a.termId.$oid) === String(selectedTerm))
      ) &&
      (!selectedGradeLevel || String(a.gradeLevel) === String(selectedGradeLevel))
    );
    // Debug: log filtered assignments
    console.log('Filtered assignments:', filtered);
    setFilteredAssignments(filtered);
    // Subjects
    const uniqueSubjects = [...new Set(filtered.map(a => a.subjectName))];
    setSubjects(uniqueSubjects);
    // Reset subject/section if not in filtered
    if (!uniqueSubjects.includes(selectedSubject)) setSelectedSubject("");
  }, [facultyAssignments, selectedSchoolYear, selectedTerm, selectedGradeLevel]);

  // Filter sections when subject changes
  useEffect(() => {
    const filtered = filteredAssignments.filter(a =>
      (!selectedSubject || a.subjectName === selectedSubject)
    );
    const uniqueSections = [...new Set(filtered.map(a => a.sectionName))];
    setSections(uniqueSections);
    if (!uniqueSections.includes(selectedSection)) setSelectedSection("");
  }, [filteredAssignments, selectedSubject]);

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

  const handleAddStudent = (student) => {
    setSelectedStudents(prev => [...prev, student]);
    setStudentName("");
    setStudents([]);
  };

  const handleRemoveStudent = (studentId) => {
    setSelectedStudents(prev => prev.filter(student => student._id !== studentId));
  };

  const handleCreateClass = async () => {
    // Generate classID: C + 3 random digits
    const randomNum = Math.floor(100 + Math.random() * 900);
    const classID = `C${randomNum}`;
    const members = selectedStudents.map(s => s.userID);
    const facultyID = localStorage.getItem("userID"); // get the faculty's userID
    const token = localStorage.getItem("token"); // or whatever you use for auth

    // Use dropdown values for className and classCode
    if (!selectedSubject || !selectedSection || !classDesc || members.length === 0) {
      alert("Please fill in all fields and add at least one member.");
      return;
    }

    const classData = {
      classID,
      className: selectedSubject,
      classCode: selectedSection,
      classDesc,
      members,
      facultyID, // <-- include this
    };

    try {
      const res = await fetch(`${API_BASE}/classes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(classData),
      });
      if (res.ok) {
        alert("Class created successfully!");
        setSelectedSubject("");
        setSelectedSection("");
        setClassDesc("");
        setSelectedStudents([]);
      } else {
        const data = await res.json();
        alert("Error: " + (data.error || "Failed to create class"));
      }
    } catch {
      console.error("Error creating class:");
      alert("Something went wrong.");
    }
  };

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
      for (const row of json) {
        const email = (row.Email || row["email"] || row["School Email"] || row["school email"] || "").trim();
        if (!email) {
          console.log('No email found in row:', row);
          continue;
        }
        try {
          const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(email)}`);
          const users = await res.json();
          console.log('Searching for:', email, 'Got:', users);
          const found = users.find(
            (u) => u.email.toLowerCase() === email.toLowerCase()
          );
          if (found && !selectedStudents.some(s => s._id === found._id)) {
            setSelectedStudents(prev => [...prev, found]);
            added++;
          } else {
            console.log('No match for:', email, 'in', users);
          }
        } catch {
          console.error("Error searching for user:");
        }
      }
      setBatchLoading(false);
      setBatchMessage(added > 0 ? `${added} member(s) added from Excel.` : 'No matching users found.');
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
            <p className="text-base md:text-lg"> Academic Year and Term here | 
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <ProfileMenu />
        </div>
        <h3 className="text-4xl font-bold mt-5">Create Class</h3>

        <div className="mt-6 flex flex-col space-y-6 ml-5">
          {/* School Year Dropdown */}
          <label className="text-xl font-bold">School Year</label>
          <select
            className="w-1/2 px-3 py-2 border rounded"
            value={selectedSchoolYear}
            onChange={e => setSelectedSchoolYear(e.target.value)}
          >
            <option value="">Select School Year</option>
            {schoolYears.map(sy => (
              <option key={sy._id} value={`${sy.schoolYearStart}-${sy.schoolYearEnd}`}>{sy.schoolYearStart}-{sy.schoolYearEnd}</option>
            ))}
          </select>
          {/* Term Dropdown */}
          <label className="text-xl font-bold">Term</label>
          <select
            className="w-1/2 px-3 py-2 border rounded"
            value={selectedTerm}
            onChange={e => setSelectedTerm(e.target.value)}
            disabled={!selectedSchoolYear}
          >
            <option value="">Select Term</option>
            {terms.map(term => (
              <option key={term._id} value={term._id}>{term.termName}</option>
            ))}
          </select>
          {/* Grade Level Dropdown */}
          <label className="text-xl font-bold">Grade Level</label>
          <select
            className="w-1/2 px-3 py-2 border rounded"
            value={selectedGradeLevel}
            onChange={e => setSelectedGradeLevel(e.target.value)}
            disabled={!selectedTerm}
          >
            <option value="">Select Grade Level</option>
            {gradeLevels.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          {/* Subject Dropdown (Class Name) */}
          <label className="text-xl font-bold">Class Name (Subject)</label>
          <select
            className="w-1/2 px-3 py-2 border rounded"
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            disabled={!selectedGradeLevel}
          >
            <option value="">Select Subject</option>
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {/* Section Dropdown (Class Code) */}
          <label className="text-xl font-bold">Class Code (Section)</label>
          <select
            className="w-1/2 px-3 py-2 border rounded"
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value)}
            disabled={!selectedSubject}
          >
            <option value="">Select Section</option>
            {sections.map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
          {/* Class Description */}
          <label className="text-4xl font-bold mt-5" htmlFor="classDescription">Class Description</label>
          <textarea
            id="classDescription"
            placeholder="Enter class description..."
            className="w-1/2 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00418b] text-base resize-none"
            rows={3}
            value={classDesc}
            onChange={e => setClassDesc(e.target.value)}
          />

          <h3 className="text-4xl font-bold mt-5">Members</h3>
          {/* Batch Upload Input */}
          <p className=" font-bold ">
            Batch Upload Members (Excel File)
            {batchLoading && <p className="text-blue-600">Processing batch upload...</p>}
            {batchMessage && <p className="text-green-600">{batchMessage}</p>}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleBatchUpload}
              className="mb-4 pl-2 bg-blue-950 font-normal text-white rounded-md"
              
            />
          </p>

          <input
            type="text"
            placeholder="Enter Student Name"
            className="w-1/2 px-0 pb-2 text-xl border-b-2 border-black focus:outline-none transition-colors"
            value={studentName}
            onChange={handleSearch}
            onFocus={(e) => (e.target.style.borderBottomColor = "#00418b")}
            onBlur={(e) => (e.target.style.borderBottomColor = "black")}
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
                      <th className="p-3 border w-1/6">User ID</th>
                      <th className="p-3 border w-1/6">Last Name</th>
                      <th className="p-3 border w-1/6">First Name</th>
                      <th className="p-3 border w-1/6">Middle Name</th>
                      <th className="p-3 border w-1/6">Email</th>
                      <th className="p-3 border w-1/6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudents.map((student) => (
                      <tr key={student._id}>
                        <td className="p-3 border">{student.userID || '-'}</td>
                        <td className="p-3 border">{student.lastname}</td>
                        <td className="p-3 border">{student.firstname}</td>
                        <td className="p-3 border">{student.middlename}</td>
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
      </div>
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-center">
        <button
          className="bg-blue-900 hover:bg-blue-800 rounded-full w-20 h-20 flex items-center justify-center shadow-lg transition-colors"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          onClick={handleCreateClass}
          disabled={batchLoading}
        >
          <img src={createEventIcon} alt="Create" className="w-10 h-10" />
        </button>
        <span className="mt-2 font-semibold text-blue-900">Create</span>
      </div>
    </div>
  );
}
