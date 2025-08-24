import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";

// API base: prefer local in dev when not explicitly configured
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'https://juanlms-webapp-server.onrender.com' : 'https://juanlms-webapp-server.onrender.com');

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

  // Dynamic audit data
  const [facultyClasses, setFacultyClasses] = useState([]);
  const [activities, setActivities] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [classStudentRoster, setClassStudentRoster] = useState({});

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

  // Load faculty classes for current term
  useEffect(() => {
    async function fetchFacultyClasses() {
      if (!academicYear || !currentTerm) return;
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userID');
        const res = await fetch(`${API_BASE}/classes`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) { setFacultyClasses([]); return; }
        const data = await res.json();
        const yearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const filtered = (Array.isArray(data) ? data : []).filter(cls => {
          if (cls.facultyID !== userId) return false;
          if (cls.isArchived === true) return false;
          // Include if class matches current year/term OR if either field is missing (fallback for older/local data)
          const matchesExact = cls.academicYear === yearName && cls.termName === currentTerm.termName;
          const missingMeta = !cls.academicYear || !cls.termName;
          return matchesExact || missingMeta;
        });
        setFacultyClasses(filtered);
      } catch {
        setFacultyClasses([]);
      }
    }
    fetchFacultyClasses();
  }, [academicYear, currentTerm]);

  // Load activities for those classes
  useEffect(() => {
    async function loadActivities() {
      if (!facultyClasses.length) { setActivities([]); return; }
      try {
        const token = localStorage.getItem('token');
        const results = await Promise.all(facultyClasses.map(async (cls) => {
          const [aRes, qRes] = await Promise.all([
            fetch(`${API_BASE}/assignments?classID=${cls.classID}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/quizzes?classID=${cls.classID}`, { headers: { 'Authorization': `Bearer ${token}` } })
          ]);
          const assignments = aRes.ok ? await aRes.json() : [];
          const quizzes = qRes.ok ? await qRes.json() : [];
          
          console.log(`[DEBUG] Raw assignments for class ${cls.classID}:`, assignments);
          console.log(`[DEBUG] Raw quizzes for class ${cls.classID}:`, quizzes);
          
          const withClass = [];
          (Array.isArray(assignments) ? assignments : []).forEach(a => withClass.push({ ...a, classID: cls.classID, classSection: cls.section || cls.classCode, _kind: 'assignment' }));
          (Array.isArray(quizzes) ? quizzes : []).forEach(q => withClass.push({ ...q, classID: cls.classID, classSection: cls.section || cls.classCode, _kind: 'quiz' }));
          return withClass;
        }));
        setActivities(results.flat());
      } catch {
        setActivities([]);
      }
    }
    loadActivities();
  }, [facultyClasses]);

  // Load class rosters from backend members endpoint
  useEffect(() => {
    async function loadRosters() {
      if (!facultyClasses.length) { setClassStudentRoster({}); return; }
      const token = localStorage.getItem('token');
      const pairs = await Promise.all(facultyClasses.map(async (cls) => {
        try {
          const res = await fetch(`${API_BASE}/classes/${cls.classID}/members`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (!res.ok) return [cls.classID, []];
          const data = await res.json();
          return [cls.classID, Array.isArray(data.students) ? data.students : []];
        } catch {
          return [cls.classID, []];
        }
      }));
      const map = {};
      for (const [cid, students] of pairs) map[cid] = students;
      setClassStudentRoster(map);
    }
    loadRosters();
  }, [facultyClasses]);

  // Build dynamic audit rows
  useEffect(() => {
    async function buildRows() {
      if (!activities.length) { setAuditRows([]); return; }
      const token = localStorage.getItem('token');
      const byAct = new Map();
      await Promise.all(activities.map(async act => {
        if (act._kind !== 'assignment') { byAct.set(act._id, []); return; }
        try {
          const r = await fetch(`${API_BASE}/assignments/${act._id}/submissions`, { headers: { 'Authorization': `Bearer ${token}` } });
          const subs = r.ok ? await r.json() : [];
          byAct.set(act._id, Array.isArray(subs) ? subs : []);
        } catch {
          byAct.set(act._id, []);
        }
      }));

      // Get detailed assignment information including views
      const detailedAssignments = new Map();
      await Promise.all(activities.filter(act => act._kind === 'assignment').map(async act => {
        try {
          const r = await fetch(`${API_BASE}/assignments/${act._id}`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (r.ok) {
            const detailed = await r.json();
            detailedAssignments.set(act._id, detailed);
            console.log(`[DEBUG] Detailed assignment ${act._id}:`, detailed);
          }
        } catch (err) {
          console.error(`[DEBUG] Failed to get detailed assignment ${act._id}:`, err);
        }
      }));

      const now = new Date();
      const rows = [];
      let totalStudents = 0;
      let viewedStudents = 0;
      let reportedStudents = 0;

      for (const act of activities) {
        // Prefer precise class roster from backend; fallback to allowedStudents by section
        const roster = (classStudentRoster[act.classID] && classStudentRoster[act.classID].length)
          ? classStudentRoster[act.classID]
          : (allowedStudents.filter(s => s.sectionName === act.classSection));
        
        totalStudents += roster.length;
        const due = act.dueDate ? new Date(act.dueDate) : null;
        const subs = byAct.get(act._id) || [];
        const submittedIds = new Set(subs.map(s => String(s.studentId || s.studentID || s.userID || s.student?._id)));
        
        // Use detailed assignment info for views if available, otherwise fall back to activity data
        const detailedAct = detailedAssignments.get(act._id);
        const views = detailedAct ? (Array.isArray(detailedAct.views) ? detailedAct.views : []) : (Array.isArray(act.views) ? act.views : []);
        const viewIds = new Set(views.map(v => String(v?.studentId || v?.studentID || v?.userID || v?._id || v)));

        console.log(`[AUDIT] Activity: ${act.title} (${act._id})`);
        console.log(`[AUDIT] Views array:`, views);
        console.log(`[AUDIT] View IDs:`, Array.from(viewIds));
        console.log(`[AUDIT] Roster size: ${roster.length}`);

        for (const stu of roster) {
          const canonicalId = String(stu.userID || stu.schoolID || (stu._id && stu._id.$oid) || stu._id || stu.studentId || stu.id);
          const submitted = submittedIds.has(canonicalId);
          
          // More robust view checking - try multiple ID formats
          let hasViewed = false;
          const studentIdVariants = [
            canonicalId,
            stu.userID,
            stu.schoolID,
            stu._id,
            stu.studentId,
            stu.id
          ].filter(Boolean).map(id => String(id));
          
          for (const viewId of viewIds) {
            if (studentIdVariants.includes(viewId)) {
              hasViewed = true;
              break;
            }
          }

          console.log(`[AUDIT] Student: ${stu.displayName || `${stu.lastname}, ${stu.firstname}`}`);
          console.log(`[AUDIT] Student canonical ID: ${canonicalId}`);
          console.log(`[AUDIT] Student raw data:`, stu);
          console.log(`[AUDIT] Student ID variants:`, studentIdVariants);
          console.log(`[AUDIT] Has submitted: ${submitted}`);
          console.log(`[AUDIT] Has viewed: ${hasViewed}`);
          console.log(`[AUDIT] View IDs contains student ID: ${viewIds.has(canonicalId)}`);
          console.log(`[AUDIT] All view IDs:`, Array.from(viewIds));
          console.log(`[AUDIT] Direct comparison check:`, Array.from(viewIds).map(vid => `${vid} === ${canonicalId} = ${vid === canonicalId}`));

          // Skip students who have already viewed the assignment
          // The purpose is to show who hasn't viewed it and who missed it
          if (hasViewed) {
            viewedStudents++;
            console.log(`[AUDIT] Skipping ${stu.displayName || `${stu.lastname}, ${stu.firstname}`} - already viewed`);
            continue;
          }

          // Missed: past due and not submitted (and not viewed)
          if (!submitted && due && due < now) {
            rows.push({
              studentId: canonicalId,
              studentName: stu.displayName || `${stu.lastname}, ${stu.firstname}`,
              sectionName: stu.sectionName || act.classSection,
              activityId: act._id,
              activityTitle: act.title,
              dueDate: act.dueDate || null,
              status: 'missed'
            });
            reportedStudents++;
          }

          // Not viewed: rostered student who hasn't viewed (and hasn't submitted)
          // Only add if not already added as "missed" for this activity
          if (!submitted && (!due || due >= now)) {
            rows.push({
              studentId: canonicalId,
              studentName: stu.displayName || `${stu.lastname}, ${stu.firstname}`,
              sectionName: stu.sectionName || act.classSection,
              activityId: act._id,
              activityTitle: act.title,
              dueDate: act.dueDate || null,
              status: 'not_viewed'
            });
            reportedStudents++;
          }
        }
      }

      console.log(`[AUDIT] Summary: Total students: ${totalStudents}, Already viewed: ${viewedStudents}, Reported: ${reportedStudents}`);
      setAuditRows(rows);
    }
    buildRows();
  }, [activities, allowedStudents, classStudentRoster]);

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

  // Preload allowed students when the active term becomes available so
  // section-based fallbacks work even if class members endpoint returns empty
  useEffect(() => {
    if (currentTerm) {
      fetchAllowedStudents().catch(() => {});
    }
  }, [currentTerm]);

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
            <h2 className="text-2xl md:text-3xl font-bold">Student Activity Audit</h2>
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

        {/* Main Content Area - Student Activity Audit (dynamic) */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Filters */}
          {(() => {
            // Component-level state for filters and derived data
            // We keep them in closures to avoid polluting top-level with a lot of vars; values are recomputed via simple patterns
            // Definitions
            const sections = ["All Sections", ...Array.from(new Set((facultyClasses || []).map(c => c.section || c.classCode).filter(Boolean)))];
            const activitiesOpts = [{ id: 'all', title: 'All Activities', sectionName: '*' }, ...activities.map(a => ({ id: a._id, title: a.title, sectionName: a.classSection }))];
            
            // Use React state via a tiny helper component
            function AuditUI() {
              const [selectedSection, setSelectedSection] = useState("All Sections");
              const [selectedActivityId, setSelectedActivityId] = useState("all");
              const [statusFilter, setStatusFilter] = useState("all"); // default to show all
              const [studentSearch, setStudentSearch] = useState("");

              const activityById = new Map(activities.map(a => [a._id, { id: a._id, title: a.title, sectionName: a.classSection, dueDate: a.dueDate } ]));

              const filteredActivities = activitiesOpts.filter(a => selectedSection === "All Sections" || a.sectionName === "*" || a.sectionName === selectedSection);

              const filteredRows = auditRows.filter(r => {
                const inSection = selectedSection === "All Sections" || r.sectionName === selectedSection;
                const inActivity = selectedActivityId === "all" || r.activityId === selectedActivityId;
                const inStatus = statusFilter === "all" ? true : r.status === statusFilter;
                const inSearch = studentSearch.trim() === "" || r.studentName.toLowerCase().includes(studentSearch.trim().toLowerCase());
                return inSection && inActivity && inStatus && inSearch;
              });

              const notViewedCount = filteredRows.filter(r => r.status === "not_viewed").length;
              const missedCount = filteredRows.filter(r => r.status === "missed").length;

              const exportToExcel = () => {
                const exportRows = filteredRows.map(r => {
                  const act = activityById.get(r.activityId) || {};
                  return {
                    "Student Name": r.studentName,
                    Section: r.sectionName,
                    Activity: act.title || r.activityId,
                    "Due Date": act.dueDate ? new Date(act.dueDate).toLocaleDateString("en-US") : "-",
                    Status: r.status.replace("_", " "),
                    "Last Viewed": r.lastViewedAt ? new Date(r.lastViewedAt).toLocaleString() : "-",
                    "Submitted At": r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "-",
                  };
                });

                // Calculate summary counts
                const notViewedCount = filteredRows.filter(r => r.status === "not_viewed").length;
                const missedCount = filteredRows.filter(r => r.status === "missed").length;
                
                // Calculate already viewed count
                let viewedStudents = 0;
                for (const act of activities) {
                  const roster = (classStudentRoster[act.classID] && classStudentRoster[act.classID].length)
                    ? classStudentRoster[act.classID]
                    : (allowedStudents.filter(s => s.sectionName === act.classSection));
                  
                  const views = Array.isArray(act.views) ? act.views : [];
                  const viewIds = new Set(views.map(v => String(v?.studentId || v?.studentID || v?.userID || v?._id || v)));
                  
                  for (const stu of roster) {
                    const canonicalId = String(stu.userID || stu.schoolID || (stu._id && stu._id.$oid) || stu._id || stu.studentId || stu.id);
                    if (viewIds.has(canonicalId)) {
                      viewedStudents++;
                    }
                  }
                }

                const wb = XLSX.utils.book_new();
                
                // Sheet 1: Summary
                const summaryData = [
                  { Category: "Not Viewed", Count: notViewedCount, Description: "Students who haven't opened the assignment" },
                  { Category: "Missed", Count: missedCount, Description: "Students who haven't submitted and assignment is past due" },
                  { Category: "Already Viewed", Count: viewedStudents, Description: "Students who have opened the assignment (excluded from reports)" },
                  { Category: "Total Reported", Count: filteredRows.length, Description: "Total students in the audit report" }
                ];
                const ws1 = XLSX.utils.json_to_sheet(summaryData);
                XLSX.utils.book_append_sheet(wb, ws1, "Summary");

                // Sheet 2: Audit Details
                const ws2 = XLSX.utils.json_to_sheet(exportRows);
                XLSX.utils.book_append_sheet(wb, ws2, "Audit Details");
                
                XLSX.writeFile(wb, "StudentActivityAudit.xlsx");
              };

              return (
                <>
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                    <h3 className="text-lg font-semibold">Activity Visibility & Submission Audit</h3>
          </div>

                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                      <select value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setSelectedActivityId("all"); }} className="w-full border rounded px-3 py-2">
                        {sections.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                 </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
                      <select value={selectedActivityId} onChange={e => setSelectedActivityId(e.target.value)} className="w-full border rounded px-3 py-2">
                        {filteredActivities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                      </select>
            </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full border rounded px-3 py-2">
                        <option value="all">All</option>
                        <option value="not_viewed">Not Viewed</option>
                        <option value="missed">Missed</option>
                      </select>
                   </div>
            <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Search Student</label>
                      <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="e.g. Dela Cruz" className="w-full border rounded px-3 py-2" />
              </div>
            </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="p-3 border-b font-semibold text-gray-700">Student Name</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Section</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Activity</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Due Date</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Status</th>
                          
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td className="p-4 text-center text-gray-500" colSpan={5}>No results for current filters.</td>
                          </tr>
                        ) : (
                          filteredRows.map((r) => {
                            const act = activityById.get(r.activityId) || {};
                            return (
                              <tr key={`${r.activityId}-${r.studentId}`} className="odd:bg-white even:bg-gray-50">
                                <td className="p-3 border-b">{r.studentName}</td>
                                <td className="p-3 border-b">{r.sectionName}</td>
                                <td className="p-3 border-b">{act.title || r.activityId}</td>
                                <td className="p-3 border-b">{act.dueDate ? new Date(act.dueDate).toLocaleDateString("en-US") : '-'}</td>
                                <td className="p-3 border-b">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                    r.status === 'not_viewed' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                    'bg-red-100 text-red-700 border border-red-200'
                                  }`}>
                                    {r.status.replace('_', ' ')}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
            </div>
                </>
              );
            }

            return <AuditUI />;
          })()}
        </div>
      </div>
    </div>
  );
}
