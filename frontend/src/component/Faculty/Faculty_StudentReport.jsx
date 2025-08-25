import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'http://localhost:5000');

export default function Faculty_StudentReport() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Search functionality states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Report form states
  const [reportContent, setReportContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStoredReports, setShowStoredReports] = useState(false);
  const [storedReports, setStoredReports] = useState([]);
  // Rubric states
  const [behavior, setBehavior] = useState(null);
  const [classParticipation, setClassParticipation] = useState(null);
  const [classActivity, setClassActivity] = useState(null);
  // Batch upload states
  const [showBatch, setShowBatch] = useState(false);
  const [allowedStudents, setAllowedStudents] = useState([]);
  const [loadingAllowed, setLoadingAllowed] = useState(false);
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  
  const searchTimeoutRef = useRef(null);

  // Report limits
  const MIN_CHARS = 1;
  const MAX_CHARS = 120;
  const MIN_WORDS = 1;
  const MAX_WORDS = 25;
  const charCount = reportContent.length;
  const wordCount = reportContent.trim() ? reportContent.trim().split(/\s+/).length : 0;
  const charsLeft = Math.max(0, MAX_CHARS - charCount);
  const withinCharRange = charCount >= MIN_CHARS && charCount <= MAX_CHARS;
  const withinWordRange = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS;
  const canSubmit = !!selectedStudent && !isSubmitting && withinCharRange && withinWordRange;

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

  // Fetch allowed students for batch template (students in faculty's sections for the active term)
  const fetchAllowedStudents = async () => {
    try {
      setLoadingAllowed(true);
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !currentTerm) return [];

      // 1) Fetch faculty assignments for the term
      const faRes = await fetch(`${API_BASE}/api/faculty-assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const facultyAssignments = faRes.ok ? await faRes.json() : [];
      const myAssignments = facultyAssignments.filter(
        (a) => a.facultyId === user._id && a.termId === currentTerm._id
      );
      const mySections = new Set(myAssignments.map((a) => a.sectionName).filter(Boolean));

      if (mySections.size === 0) {
        setAllowedStudents([]);
        return [];
      }

      // 2) Fetch student assignments for the term (then filter by our sections)
      const saRes = await fetch(`${API_BASE}/api/student-assignments?termId=${currentTerm._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allStudentAssignments = saRes.ok ? await saRes.json() : [];
      const filtered = allStudentAssignments.filter((s) => mySections.has(s.sectionName));

      // 3) Map to unique students
      const byStudentId = new Map();
      for (const a of filtered) {
        const id = a.studentId;
        if (!byStudentId.has(id)) {
          byStudentId.set(id, a);
        }
      }
      const unique = Array.from(byStudentId.values()).map((a) => ({
        studentId: a.studentId,
        lastname: a.lastname,
        firstname: a.firstname,
        email: a.email,
        sectionName: a.sectionName,
        trackName: a.trackName,
        strandName: a.strandName,
        schoolID: a.schoolID,
        displayName: `${a.lastname}, ${a.firstname}`,
      }));

      setAllowedStudents(unique);
      return unique;
    } catch (e) {
      console.error("Failed to fetch allowed students:", e);
      setAllowedStudents([]);
      return [];
    } finally {
      setLoadingAllowed(false);
    }
  };

  const ensureAllowedStudentsLoaded = async () => {
    if (allowedStudents.length === 0) {
      await fetchAllowedStudents();
    }
  };

  // Download Excel template with two sheets
  const downloadBatchTemplate = async () => {
    await ensureAllowedStudentsLoaded();
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template headers only
    const templateRows = [{ "Student Name": "", Report: "", Behavior: "", "Class Participation": "", "Class Activity": "" }];
    const ws1 = XLSX.utils.json_to_sheet(templateRows, { header: ["Student Name", "Report", "Behavior", "Class Participation", "Class Activity"], skipHeader: false });
    XLSX.utils.book_append_sheet(wb, ws1, "Template");

    // Sheet 2: Allowed Students for guidance
    const ws2 = XLSX.utils.json_to_sheet(
      allowedStudents.map((s) => ({
        "Student Name": s.displayName,
        Email: s.email || "",
        Section: s.sectionName || "",
        Track: s.trackName || "",
        Strand: s.strandName || "",
        "School ID": s.schoolID || "",
        "Scoring Guide": "1-very poor, 2-below average, 3-average, 4-good, 5-excellent"
      })),
      { header: ["Student Name", "Email", "Section", "Track", "Strand", "School ID", "Scoring Guide"], skipHeader: false }
    );
    XLSX.utils.book_append_sheet(wb, ws2, "Allowed Students");

    const filename = "StudentReports_BatchTemplate.xlsx";
    XLSX.writeFile(wb, filename);
  };

  // Upload and process Excel file
  const handleBatchFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await ensureAllowedStudentsLoaded();

    setUploadingBatch(true);
    setUploadSummary(null);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");
      const results = { created: 0, skipped: 0, errors: [] };

      // Create a fast lookup map for allowed students by normalized display name
      const normalize = (s) => (s || "").trim().toLowerCase();
      const nameMap = new Map(allowedStudents.map((s) => [normalize(s.displayName), s]));

      for (const row of rows) {
        const studentNameRaw = row["Student Name"] || row["student name"] || row["Student"] || "";
        const reportText = row["Report"] || row["report"] || "";
        const b = row["Behavior"] ?? row["behavior"] ?? null;
        const cp = row["Class Participation"] ?? row["classParticipation"] ?? null;
        const ca = row["Class Activity"] ?? row["classActivity"] ?? null;

        if (!studentNameRaw || !reportText) {
          results.skipped += 1;
          continue;
        }

        const match = nameMap.get(normalize(studentNameRaw));
        if (!match) {
          results.errors.push({ studentName: studentNameRaw, error: "Student not in your assigned sections" });
          results.skipped += 1;
          continue;
        }

        const payload = {
          facultyName: `${user.firstname} ${user.lastname}`,
          studentName: match.displayName,
          studentReport: String(reportText).slice(0, 120),
          termName: currentTerm ? currentTerm.termName : "Unknown",
          schoolYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Unknown",
          studentId: match.studentId,
          behavior: typeof b === 'number' ? b : (b ? Number(b) : undefined),
          classParticipation: typeof cp === 'number' ? cp : (cp ? Number(cp) : undefined),
          classActivity: typeof ca === 'number' ? ca : (ca ? Number(ca) : undefined),
        };

        try {
          const resp = await fetch(`${API_BASE}/api/studentreports`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
          if (resp.ok) {
            results.created += 1;
          } else {
            const t = await resp.text();
            results.errors.push({ studentName: match.displayName, error: t || resp.status });
          }
        } catch (err) {
          results.errors.push({ studentName: match.displayName, error: err?.message || "Network error" });
        }
      }

      setUploadSummary(results);
      if (results.created > 0) {
        await fetchStoredReports();
      }
    } catch (err) {
      console.error("Failed processing batch file:", err);
      setUploadSummary({ created: 0, skipped: 0, errors: [{ error: err?.message || "File read error" }] });
    } finally {
      setUploadingBatch(false);
      // reset file input value so same file can be re-selected if needed
      e.target.value = "";
    }
  };

  // Search students function
  const searchStudents = async (query) => {
    if (!query.trim()) {
      // If no query, try to get all students
      setIsSearching(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/users/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
          const users = await response.json();
          const students = users.filter(user => user.role === 'students');
          console.log("All students (no search query):", students);
          setSearchResults(students);
          setShowDropdown(students.length > 0);
        }
      } catch (err) {
        console.error("Failed to fetch all students:", err);
      } finally {
        setIsSearching(false);
      }
      return;
    }

    setIsSearching(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const users = await response.json();
        console.log("All users from search:", users); // Debug log
        
        // Filter only students (users with role 'students')
        const students = users.filter(user => user.role === 'students');
        
        console.log("Filtered students:", students); // Debug log
        console.log("Students with role 'students':", users.filter(u => u.role === 'students')); // Debug log
        console.log("Students with @students in email:", users.filter(u => u.email && u.email.includes('@students'))); // Debug log
        
        setSearchResults(students);
        setShowDropdown(students.length > 0);
      } else {
        console.error("Search response not ok:", response.status, response.statusText);
      }
    } catch (err) {
      console.error("Failed to search students:", err);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change with debouncing
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchStudents(value);
    }, 300);
  };

  // Handle student selection
  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setSearchTerm(`${student.lastname}, ${student.firstname}`);
    setShowDropdown(false);
    setSearchResults([]);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedStudent) {
      alert("Please select a student first.");
      return;
    }
    
    if (!reportContent.trim()) {
      alert("Please write a report.");
      return;
    }
    // Validate limits before submitting
    if (!withinCharRange) {
      alert(`Report must be between ${MIN_CHARS}-${MAX_CHARS} characters. Currently ${charCount}.`);
      return;
    }
    if (!withinWordRange) {
      alert(`Report must be between ${MIN_WORDS}-${MAX_WORDS} words. Currently ${wordCount}.`);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));
      
      const reportData = {
        facultyName: `${user.firstname} ${user.lastname}`,
        studentName: `${selectedStudent.lastname}, ${selectedStudent.firstname}`,
        studentReport: reportContent,
        termName: currentTerm ? currentTerm.termName : "Unknown",
        schoolYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Unknown",
        studentId: selectedStudent._id,
        behavior: behavior ?? undefined,
        classParticipation: classParticipation ?? undefined,
        classActivity: classActivity ?? undefined
      };
      
      console.log("Sending request to:", `${API_BASE}/api/studentreports`);
      console.log("Request data:", reportData);
      
      // Call the API to store in database
      console.log("Attempting to call API...");
      const response = await fetch(`${API_BASE}/api/studentreports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportData)
      });
      
      if (response.ok) {
        console.log("API call successful!");
        const result = await response.json();
        alert("Report submitted!");
        setReportContent("");
        setSelectedStudent(null);
        setSearchTerm("");
        setBehavior(null);
        setClassParticipation(null);
        setClassActivity(null);
        
        // Refresh stored reports list from database
        await fetchStoredReports();
      } else {
        const errorData = await response.json();
        alert(`Failed to submit report: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Failed to submit report:", err);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to fetch reports from database
  const fetchStoredReports = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/studentreports`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStoredReports(data.reports || []);
      } else {
        console.error("Failed to fetch reports:", response.status);
        setStoredReports([]);
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setStoredReports([]);
    }
  };

  // Load stored reports on component mount
  useEffect(() => {
    fetchStoredReports();
  }, []);

  // Clear search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Student Reports</h2>
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
            <ProfileMenu />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Card header actions */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Create Student Report</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  setShowBatch(true);
                  await ensureAllowedStudentsLoaded();
                }}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Batch Upload
              </button>
            </div>
          </div>

          {showBatch && (
            <div className="mb-6 border rounded p-4 bg-gray-50">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <div>
                  <p className="font-medium text-gray-800">Batch Upload Reports</p>
                  <p className="text-sm text-gray-600">Download the template, fill it, then upload. Only students assigned to your sections for the active term are allowed.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={downloadBatchTemplate}
                    disabled={loadingAllowed}
                    className="px-3 py-2 rounded bg-[#010a51] text-white hover:bg-[#1a237e] disabled:opacity-50"
                  >
                    {loadingAllowed ? "Preparing..." : "Download Template"}
                  </button>
                  <label className="cursor-pointer px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700">
                    {uploadingBatch ? "Uploading..." : "Upload Template"}
                    <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBatchFile} disabled={uploadingBatch} />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowBatch(false)}
                    className="px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-white"
                  >
                    Close
                  </button>
                </div>
              </div>
              {uploadSummary && (
                <div className="mt-3 text-sm text-gray-700">
                  <p>Created: {uploadSummary.created} | Skipped: {uploadSummary.skipped}</p>
                  {uploadSummary.errors?.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer">View errors ({uploadSummary.errors.length})</summary>
                      <ul className="list-disc ml-6 mt-1">
                        {uploadSummary.errors.map((e, idx) => (
                          <li key={idx}>{e.studentName ? `${e.studentName}: ` : ""}{e.error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
                         {/* Search Student Section */}
             <div className="search-container relative">
               <label htmlFor="studentSearch" className="block text-sm font-medium text-gray-700 mb-2">
                 Search Student
               </label>
               <div className="relative">
                 <input
                   type="text"
                   id="studentSearch"
                   value={searchTerm}
                   onChange={handleSearchChange}
                   placeholder="Search by name or email..."
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#010a51] focus:border-transparent"
                 />
                 {isSearching && (
                   <div className="absolute right-3 top-2">
                     <div className="w-5 h-5 border-2 border-[#010a51] border-t-transparent rounded-full animate-spin"></div>
                   </div>
                 )}
               </div>
              
                             {/* Search Results Dropdown */}
               {showDropdown && searchResults.length > 0 && (
                 <div className="absolute z-10 w-full bg-white border border-gray-300 border-t-0 max-h-60 overflow-y-auto">
                   {searchResults.map((student, index) => (
                     <button
                       key={student._id || index}
                       type="button"
                       onClick={() => handleStudentSelect(student)}
                       className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-200 last:border-b-0 text-sm"
                     >
                       {student.lastname}, {student.firstname}
                     </button>
                   ))}
                 </div>
               )}
            </div>

                         {/* Selected Student Display */}
             {selectedStudent && (
               <div className="bg-[#010a51]/10 border border-[#010a51]/20 rounded-md p-4">
                 <div className="flex items-center justify-between">
                   <div>
                     <h3 className="font-medium text-[#010a51]">Selected Student:</h3>
                     <p className="text-[#010a51]">{selectedStudent.lastname}, {selectedStudent.firstname}</p>
                     <p className="text-sm text-[#010a51]/70">{selectedStudent.email}</p>
                   </div>
                   <button
                     type="button"
                     onClick={() => {
                       setSelectedStudent(null);
                       setSearchTerm("");
                     }}
                     className="text-[#010a51] hover:text-[#1a237e] text-sm"
                   >
                     Change Student
                   </button>
                 </div>
               </div>
             )}

            {/* Rubric Section */}
            <div className="mb-2 text-xs sm:text-sm text-gray-600">
              <span className="mr-4">1 - very poor</span>
              <span className="mr-4">2 - below average</span>
              <span className="mr-4">3 - average</span>
              <span className="mr-4">4 - good</span>
              <span>5 - excellent</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4">
                <label className="w-48 text-base font-semibold text-gray-800">Behavior</label>
                <div className="flex items-center gap-4">
                  {[1,2,3,4,5].map(n => (
                    <label key={`beh-${n}`} className="flex items-center gap-2 text-sm">
                      <input className="w-5 h-5" type="radio" name="behavior" value={n} checked={behavior===n} onChange={() => setBehavior(n)} />
                      <span>{n === 1 ? '1' : n === 2 ? '2' : n === 3 ? '3' : n === 4 ? '4' : '5'}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="w-48 text-base font-semibold text-gray-800">Class Participation</label>
                <div className="flex items-center gap-4">
                  {[1,2,3,4,5].map(n => (
                    <label key={`cp-${n}`} className="flex items-center gap-2 text-sm">
                      <input className="w-5 h-5" type="radio" name="classParticipation" value={n} checked={classParticipation===n} onChange={() => setClassParticipation(n)} />
                      <span>{n === 1 ? '1 ' : n === 2 ? '2' : n === 3 ? '3' : n === 4 ? '4' : '5'}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="w-48 text-base font-semibold text-gray-800">Class Activity</label>
                <div className="flex items-center gap-4">
                  {[1,2,3,4,5].map(n => (
                    <label key={`ca-${n}`} className="flex items-center gap-2 text-sm">
                      <input className="w-5 h-5" type="radio" name="classActivity" value={n} checked={classActivity===n} onChange={() => setClassActivity(n)} />
                      <span>{n === 1 ? '1' : n === 2 ? '2' : n === 3 ? '3' : n === 4 ? '4' : '5'}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Report Content Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="reportContent" className="block text-sm font-medium text-gray-700">
                  Report Content
                </label>
                <span className={`text-xs ${withinCharRange ? 'text-[#010a51]' : 'text-red-600'}`}>
                  {charsLeft} left
                </span>
              </div>
              <textarea
                id="reportContent"
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                placeholder="Write your report here..."
                rows={10}
                maxLength={MAX_CHARS}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#010a51] focus:border-transparent resize-vertical ${
                  withinCharRange && withinWordRange ? 'border-gray-300' : 'border-red-500'
                }`}
                required
              />

            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!canSubmit}
                className={`px-6 py-2 rounded-md text-white font-medium ${
                  !canSubmit
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#010a51] hover:bg-[#1a237e] focus:outline-none focus:ring-2 focus:ring-[#010a51] focus:ring-offset-2'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
          
          {/* Stored Reports Display */}
          {showStoredReports && (
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Stored Reports ({storedReports.length})</h3>
              {storedReports.length === 0 ? (
                <p className="text-gray-500">No reports stored yet.</p>
              ) : (
                <div className="space-y-4">
                  {storedReports.map((report, index) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Report for {report.studentName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Faculty: {report.facultyName} | Term: {report.termName} | Year: {report.schoolYear}
                          </p>
                          <p className="text-xs text-gray-500">
                            Created: {new Date(report.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.studentReport}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
