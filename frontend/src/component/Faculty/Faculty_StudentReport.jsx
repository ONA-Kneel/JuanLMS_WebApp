import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";
import { getLogoBase64, getFooterLogoBase64 } from "../../utils/imageToBase64";

// Use localhost for development - local server is running on port 5000
const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

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

  // Student activity audit states
  const [auditData, setAuditData] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState(null);

  // Export loading states
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

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

  // Fetch student activity audit data
  const fetchAuditData = async () => {
    if (!currentTerm) return;
    
    try {
      setLoadingAudit(true);
      setAuditError(null);
      
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/assignments/audit/student-activity?termId=${currentTerm._id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Raw audit data:", data);
        
        // Ensure we have an array and remove any potential duplicates
        const rawData = data.auditData || [];
        const uniqueData = rawData.filter((item, index, self) => 
          index === self.findIndex(t => 
            t.studentId === item.studentId && t.activityId === item.activityId
          )
        );
        
        console.log("Filtered unique data:", uniqueData);
        setAuditData(uniqueData);
      } else {
        const errorData = await response.json();
        setAuditError(errorData.error || 'Failed to fetch audit data');
      }
    } catch (err) {
      console.error("Failed to fetch audit data:", err);
      setAuditError('Network error while fetching audit data');
    } finally {
      setLoadingAudit(false);
    }
  };

  // Load audit data when term changes
  useEffect(() => {
    if (currentTerm) {
      fetchAuditData();
    }
  }, [currentTerm]);

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

        {/* Main Content Area - Student Activity Audit */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Student Activity Audit UI */}
          {(() => {
            function AuditUI() {
              const [selectedSection, setSelectedSection] = useState("All Sections");
              const [selectedActivityId, setSelectedActivityId] = useState("all");
              const [statusFilter, setStatusFilter] = useState("not_viewed"); // default focus
              const [studentSearch, setStudentSearch] = useState("");

              // Get unique sections and activities from audit data
              const sections = ["All Sections", ...new Set(auditData.map(item => item.sectionName))];
              
              // Create unique activities by using a Map to deduplicate by activityId
              const uniqueActivitiesMap = new Map();
              auditData.forEach(item => {
                if (!uniqueActivitiesMap.has(item.activityId)) {
                  uniqueActivitiesMap.set(item.activityId, {
                  id: item.activityId,
                  title: item.activityTitle,
                  sectionName: item.sectionName
                  });
                }
              });
              
              const activities = [
                { id: "all", title: "All Activities", sectionName: "*" },
                ...Array.from(uniqueActivitiesMap.values())
              ];

              // Filter audit data based on selections
              const filteredRows = auditData.filter(item => {
                const inSection = selectedSection === "All Sections" || item.sectionName === selectedSection;
                const inActivity = selectedActivityId === "all" || item.activityId === selectedActivityId;
                const inStatus = statusFilter === "all" ? true : item.status === statusFilter;
                const inSearch = studentSearch.trim() === "" || item.studentName.toLowerCase().includes(studentSearch.trim().toLowerCase());
                return inSection && inActivity && inStatus && inSearch;
              });

              const notViewedCount = filteredRows.filter(item => item.status === "not_viewed").length;
              const missedCount = filteredRows.filter(item => item.status === "missed").length;

              const exportToExcel = async () => {
                try {
                  setExportingExcel(true);
                  
                  // Create workbook
                const wb = XLSX.utils.book_new();
                  
                  // Create header information
                  const headerData = [
                    ["SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC."],
                    ["2772-2774 Roxas Boulevard, Pasay City 1300 Philippines"],
                    ["PAASCU Accredited - COLLEGE"],
                    [""], // Empty row
                    ["STUDENT ACTIVITY AUDIT REPORT"],
                    [`Generated on: ${new Date().toLocaleDateString()}`],
                    [""], // Empty row
                    ["REPORT DETAILS:"],
                    [`Academic Year: ${academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "N/A"}`],
                    [`Term: ${currentTerm ? currentTerm.termName : "N/A"}`],
                    [`Total Records: ${filteredRows.length}`],
                    [`Filters Applied:`],
                    [`  - Section: ${selectedSection}`],
                    [`  - Activity: ${selectedActivityId === "all" ? "All Activities" : activities.find(a => a.id === selectedActivityId)?.title || "All"}`],
                    [`  - Status: ${statusFilter === "all" ? "All" : statusFilter.replace("_", " ")}`],
                    [`  - Search: ${studentSearch || "None"}`],
                    [""], // Empty row
                    ["ACTIVITY AUDIT DATA:"],
                    [""], // Empty row
                  ];
                  
                  // Create data rows with headers
                  const dataHeaders = [
                    "Student Name",
                    "Section", 
                    "Activity",
                    "Activity Type",
                    "Due Date",
                    "Status",
                    "Last Viewed",
                    "Submitted At"
                  ];
                  
                  const dataRows = filteredRows.map(item => [
                    item.studentName,
                    item.sectionName,
                    item.activityTitle,
                    item.activityType,
                    item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-US") : "-",
                    item.status.replace("_", " "),
                    item.lastViewedAt ? new Date(item.lastViewedAt).toLocaleString() : "-",
                    item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "-"
                  ]);
                  
                  // Combine header, data headers, and data rows
                  const allData = [
                    ...headerData,
                    dataHeaders,
                    ...dataRows,
                    [""], // Empty row
                    ["FOOTER INFORMATION:"],
                    ["Hospital Tel. Nos: 831-9731/36;831-5641/49 www.sanjuandedios.org"],
                    ["College Tel.Nos.: 551-2756; 551-2763 www.sjdefi.edu.ph"],
                    [`Report generated by JuanLMS System - ${new Date().toLocaleString()}`]
                  ];
                  
                  // Create worksheet
                  const ws = XLSX.utils.aoa_to_sheet(allData);
                  
                  // Set column widths for better formatting
                  const colWidths = [
                    { wch: 25 }, // Student Name
                    { wch: 15 }, // Section
                    { wch: 30 }, // Activity
                    { wch: 15 }, // Activity Type
                    { wch: 12 }, // Due Date
                    { wch: 15 }, // Status
                    { wch: 20 }, // Last Viewed
                    { wch: 20 }  // Submitted At
                  ];
                  ws['!cols'] = colWidths;
                  
                  // Style the header rows (merge cells for institution name)
                  const mergeRanges = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Institution name
                    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Address
                    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }, // Accreditation
                    { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } }, // Report title
                    { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } }, // Generated date
                  ];
                  ws['!merges'] = mergeRanges;
                  
                  // Add worksheet to workbook
                  XLSX.utils.book_append_sheet(wb, ws, "Student Activity Audit");
                  
                  // Generate filename with timestamp
                  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                  const filename = `StudentActivityAudit_${timestamp}.xlsx`;
                  
                  // Write file
                  XLSX.writeFile(wb, filename);
                  
                } catch (error) {
                  console.error("Error exporting to Excel:", error);
                  alert("Failed to export to Excel. Please try again.");
                } finally {
                  setExportingExcel(false);
                }
              };

              const exportToPDF = async () => {
                try {
                  setExportingPDF(true);
                  
                  // Get base64 encoded logos
                  const logoBase64 = await getLogoBase64();
                  const footerLogoBase64 = await getFooterLogoBase64();
                  
                  // Create HTML content for PDF
                  const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Student Activity Audit Report</title>
                      <style>
                        @page {
                          size: A4;
                          margin: 0.5in;
                        }
                        body { 
                          font-family: Arial, sans-serif; 
                          line-height: 1.6; 
                          margin: 0; 
                          padding: 0;
                          color: #333;
                          background: white;
                        }
                        .header {
                          display: flex;
                          align-items: center;
                          margin-bottom: 30px;
                          border-bottom: 2px solid #333;
                          padding-bottom: 20px;
                        }
                        .logo {
                          width: 80px;
                          height: 80px;
                          margin-right: 20px;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                        }
                        .logo img {
                          width: 100%;
                          height: 100%;
                          object-fit: contain;
                        }
                        .institution-info {
                          flex: 1;
                          text-align: center;
                        }
                        .institution-name {
                          font-size: 18px;
                          text-align: center;
                          font-weight: bold;
                          margin: 0;
                        }
                        .institution-address {
                          font-size: 16px;
                          text-align: center;
                          margin: 0;
                        }
                        .institution-accreditation {
                          font-size: 13px;
                          text-align: center;
                          margin: 0;
                        }
                        .report-info {
                          text-align: right;
                          margin-left: auto;
                        }
                        .report-title {
                          font-weight: bold;
                          margin: 0;
                          font-size: 14px;
                        }
                        .report-date {
                          margin: 5px 0 0 0;
                          font-size: 12px;
                        }
                        .content { 
                          
                          font-size: 14px;
                        }
                        .footer {
                          margin-top: 30px;
                          border-top: 1px solid #333;
                          padding-top: 15px;
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                          font-size: 10px;
                          color: #333;
                        }
                        .footer-left {
                          text-align: left;
                        }
                        .footer-right {
                          text-align: right;
                        }
                        .footer-logo {
                          width: 30px;
                          height: 30px;
                        }
                        .footer-logo img {
                          width: 100%;
                          height: 100%;
                          object-fit: contain;
                        }
                        table {
                          width: 100%;
                          border-collapse: collapse;
                          margin: 20px 0;
                          font-size: 12px;
                        }
                        th, td {
                          border: 1px solid #333;
                          padding: 8px;
                          text-align: left;
                        }
                        th {
                          background-color: #f5f5f5;
                          font-weight: bold;
                        }
                        .status-not_viewed {
                          background-color: #fee2e2;
                          color: #dc2626;
                          padding: 2px 6px;
                          border-radius: 4px;
                          font-size: 10px;
                        }
                        .status-missed {
                          background-color: #fef3c7;
                          color: #d97706;
                          padding: 2px 6px;
                          border-radius: 4px;
                          font-size: 10px;
                        }
                        .status-viewed {
                          background-color: #d1fae5;
                          color: #059669;
                          padding: 2px 6px;
                          border-radius: 4px;
                          font-size: 10px;
                        }
                        .activity-assignment {
                          background-color: #dbeafe;
                          color: #1d4ed8;
                          padding: 2px 6px;
                          border-radius: 4px;
                          font-size: 10px;
                        }
                        .activity-quiz {
                          background-color: #e9d5ff;
                          color: #7c3aed;
                          padding: 2px 6px;
                          border-radius: 4px;
                          font-size: 10px;
                        }
                        @media print {
                          body { margin: 0; }
                          .no-print { display: none; }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <div class="logo-section">
                          <div class="logo">
                            <img src="${logoBase64}" alt="San Juan de Dios Hospital Seal" />
                          </div>
                        </div>
                        <div class="institution-info">
                          <h1 class="institution-name">SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.</h1>
                          <p class="institution-address">2772-2774 Roxas Boulevard, Pasay City 1300 Philippines</p>
                          <p class="institution-accreditation">PAASCU Accredited - COLLEGE</p>
                        </div>
                      </div>
                      <div class="report-info">
                        <p class="report-title">Student Activity Audit Report</p>
                        <p class="report-date">Generated on: ${new Date().toLocaleDateString()}</p>
                      </div>
                      
                      <div class="content">
                        <h2>Activity Visibility & Submission Audit</h2>
                        <p><strong>Academic Year:</strong> ${academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "N/A"}</p>
                        <p><strong>Term:</strong> ${currentTerm ? currentTerm.termName : "N/A"}</p>
                        <p><strong>Total Records:</strong> ${filteredRows.length}</p>
                        <p><strong>Filters Applied:</strong> Section: ${selectedSection}, Activity: ${selectedActivityId === "all" ? "All Activities" : activities.find(a => a.id === selectedActivityId)?.title || "All"}, Status: ${statusFilter === "all" ? "All" : statusFilter.replace("_", " ")}, Search: ${studentSearch || "None"}</p>
                        
                        <table>
                          <thead>
                            <tr>
                              <th>Student Name</th>
                              <th>Section</th>
                              <th>Activity</th>
                              <th>Type</th>
                              <th>Due Date</th>
                              <th>Status</th>
                              <th>Last Viewed</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${filteredRows.map(item => `
                              <tr>
                                <td>${item.studentName}</td>
                                <td>${item.sectionName}</td>
                                <td>${item.activityTitle}</td>
                                <td><span class="activity-${item.activityType}">${item.activityType}</span></td>
                                <td>${item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-US") : '-'}</td>
                                <td><span class="status-${item.status}">${item.status.replace('_', ' ')}</span></td>
                                <td>${item.lastViewedAt ? new Date(item.lastViewedAt).toLocaleString() : '-'}</td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </div>
                      
                      <div class="footer">
                        <div class="footer-left">
                          <p>Hospital Tel. Nos: 831-9731/36;831-5641/49 www.sanjuandedios.org College Tel.Nos.: 551-2756; 551-2763 www.sjdefi.edu.ph</p>
                        </div>
                        <div class="footer-right">
                          <div class="footer-logo"> 
                            <img src="${footerLogoBase64}" alt="San Juan de Dios Hospital Seal" />
                          </div>
                        </div>
                      </div>
                      <div class="no-print">
                        <button onclick="window.print()">Print / Save as PDF</button>
                        <button onclick="window.close()">Close</button>
                      </div>
                    </body>
                    </html>
                  `;
                  
                  // Open print window
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(htmlContent);
                  printWindow.document.close();
                  
                  // Wait for images to load before printing
                  printWindow.onload = () => {
                    setTimeout(() => {
                      printWindow.print();
                    }, 500);
                  };
                  
                } catch (error) {
                  console.error("Error exporting to PDF:", error);
                  alert("Failed to export to PDF. Please try again.");
                } finally {
                  setExportingPDF(false);
                }
              };

              if (loadingAudit) {
                return (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#010a51] mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading student activity data...</p>
                  </div>
                );
              }

              if (auditError) {
                return (
                  <div className="text-center py-8">
                    <div className="text-red-600 mb-4">Error: {auditError}</div>
                    <button 
                      onClick={fetchAuditData}
                      className="px-4 py-2 bg-[#010a51] text-white rounded hover:bg-[#1a237e]"
                    >
                      Retry
                    </button>
                  </div>
                );
              }

              if (auditData.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No student activity data found for the current term.</p>
                    <p className="text-sm text-gray-500 mt-2">Make sure you have created assignments/quizzes and assigned them to students.</p>
                  </div>
                );
              }

              return (
                <>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                    <h3 className="text-lg font-semibold">Activity Visibility & Submission Audit</h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={fetchAuditData} 
                        disabled={loadingAudit}
                        type="button" 
                        className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingAudit ? 'Refreshing...' : 'Refresh'}
                      </button>
                      <button
                        onClick={exportToExcel}
                        disabled={exportingExcel || exportingPDF}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          exportingExcel || exportingPDF
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {exportingExcel ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export to Excel
                          </>
                        )}
                      </button>
                      <button
                        onClick={exportToPDF}
                        disabled={exportingExcel || exportingPDF}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          exportingExcel || exportingPDF
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {exportingPDF ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Export to PDF
                          </>
                        )}
                      </button>
                    </div>
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
                        {activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full border rounded px-3 py-2">
                        <option value="all">All</option>
                        <option value="not_viewed">Not Viewed</option>
                        <option value="missed">Missed</option>
                        <option value="viewed">Viewed</option>
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
                          <th className="p-3 border-b font-semibold text-gray-700">Type</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Due Date</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Status</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Last Viewed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td className="p-4 text-center text-gray-500" colSpan={7}>No results for current filters.</td>
                          </tr>
                        ) : (
                          filteredRows.map((item) => (
                            <tr key={`${item.activityId}-${item.studentId}`} className="odd:bg-white even:bg-gray-50">
                              <td className="p-3 border-b">{item.studentName}</td>
                              <td className="p-3 border-b">{item.sectionName}</td>
                              <td className="p-3 border-b">{item.activityTitle}</td>
                              <td className="p-3 border-b">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                  item.activityType === 'assignment' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                  'bg-purple-100 text-purple-700 border border-purple-200'
                                }`}>
                                  {item.activityType}
                                </span>
                              </td>
                              <td className="p-3 border-b">{item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-US") : '-'}</td>
                              <td className="p-3 border-b">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                  item.status === 'not_viewed' ? 'bg-red-100 text-red-700 border border-red-200' :
                                  item.status === 'missed' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                  'bg-green-100 text-green-700 border border-green-200'
                                }`}>
                                  {item.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-3 border-b">{item.lastViewedAt ? new Date(item.lastViewedAt).toLocaleString() : '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Note */}
                  <p className="mt-4 text-xs text-gray-500">
                    This view shows real-time data from your assignments and quizzes. 
                    Students are marked as "not viewed" if they haven't accessed the activity yet, 
                    and "missed" if the due date has passed without them viewing it.
                  </p>
                  
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
