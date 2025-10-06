import { useState, useEffect, useCallback, useRef } from "react";
import { Chart, ArcElement, Tooltip, Legend, PieController } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend, PieController);
import * as XLSX from "xlsx";
import VPE_Navbar from "./VPE_Navbar";
import ProfileMenu from "../ProfileMenu";
import { getLogoBase64, getFooterLogoBase64 } from "../../utils/imageToBase64";

// PDF generation function with pie chart (Assignments vs Quizzes)
const downloadAsPDF = async (content, filename, chartData) => {
  // Get base64 encoded logos
  const logoBase64 = await getLogoBase64();
  const footerLogoBase64 = await getFooterLogoBase64();
  
  // Create a new window with the content, then auto-generate and download a PDF via html2pdf.js
  const printWindow = window.open('', '_blank');
  // Note: Heading variants are defined inline where used to avoid unused var
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
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
        .chart-section {
          margin: 20px 0;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fafafa;
        }
        .chart-title {
          font-weight: bold;
          margin-bottom: 8px;
          text-align: center;
        }
        .content { 
          white-space: pre-wrap; 
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
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
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
        <p class="report-title">${filename}</p>
        <p class="report-date">Generated on: ${new Date().toLocaleDateString()}</p>
      </div>
      <div id="contentBefore" class="content"></div>
      <div class="chart-section" id="chartContainer" style="display:none;">
        <div class="chart-title">Distribution of Activities</div>
        <canvas id="activityPieChart" width="220" height="220" style="max-width:220px; max-height:220px; margin: 0 auto; display:block;"></canvas>
      </div>
      <div id="contentAfter" class="content"></div>
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
      <div class="no-print" style="display:none"></div>
      <script>
        (function(){
          const encode = (s) => s
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#39;');
          const rawContent = encode(${JSON.stringify(content)});
          const keywords = ${JSON.stringify([
            'Faculty Performance & Activity Levels Analysis',
            'Faculty Performance & Activity Levels',
            'Faculty Performance and Activity Levels'
          ])};
          let idx = -1; let used = '';
          for (const k of keywords) { const i = rawContent.indexOf(k); if (i !== -1) { idx = i; used = k; break; } }
          let before = rawContent;
          let after = '';
          if (idx !== -1) {
            const headingEnd = idx + used.length;
            before = rawContent.slice(0, headingEnd);
            after = rawContent.slice(headingEnd);
            document.getElementById('chartContainer').style.display = 'block';
          }
          document.getElementById('contentBefore').textContent = before;
          document.getElementById('contentAfter').textContent = after;

          const values = [${(chartData && chartData.assignmentsCount) || 0}, ${(chartData && chartData.quizzesCount) || 0}];
          const hasData = (values[0] + values[1]) > 0;
          if (hasData && window.Chart) {
            const ctx = document.getElementById('activityPieChart');
            new window.Chart(ctx, {
              type: 'pie',
              data: {
                labels: ['Assignments','Quizzes'],
                datasets: [{
                  data: values,
                  backgroundColor: ['#f59e0b', '#3b82f6'],
                  borderColor: '#ffffff',
                  borderWidth: 2
                }]
              },
              options: { plugins: { legend: { position: 'bottom' } } }
            });
          } else {
            document.getElementById('chartContainer').style.display = 'none';
          }

          // After layout and charts are ready, generate and download the PDF automatically
          const doDownload = () => {
            if (!window.html2pdf) { setTimeout(doDownload, 200); return; }
            const safeName = encodeURIComponent(${JSON.stringify(filename)});
            const opt = {
              margin: 0.5,
              filename: safeName + '.pdf',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, allowTaint: true },
              jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            window.html2pdf().set(opt).from(document.body).save().then(() => {
              window.close();
            }).catch(() => {
              // Fallback: open print dialog if direct save fails
              window.print();
              setTimeout(() => window.close(), 500);
            });
          };
          // Give charts a moment to render before capturing
          setTimeout(doDownload, 600);
        })();
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

// Use environment variable or fallback to localhost
const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function VPE_FacultyReport() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [error, setError] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("");
  const [selectedStrand, setSelectedStrand] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [schoolYears, setSchoolYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  
  // Faculty activities data
  const [facultyActivities, setFacultyActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Student activity audit states
  const [auditData, setAuditData] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState(null);

  // Faculty last logins states
  const [facultyLastLogins, setFacultyLastLogins] = useState([]);
  const [loadingFacultyLogins, setLoadingFacultyLogins] = useState(false);
  const [facultyLoginsError, setFacultyLoginsError] = useState(null);
  const [facultyLoginsPage, setFacultyLoginsPage] = useState(1);
  const FACULTY_LOGINS_PER_PAGE = 7;

  // AI Analytics states
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const chartCanvasRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const sectionChartCanvasRef = useRef(null);
  const trackChartCanvasRef = useRef(null);
  const strandChartCanvasRef = useRef(null);
  const sectionChartInstanceRef = useRef(null);
  const trackChartInstanceRef = useRef(null);
  const strandChartInstanceRef = useRef(null);
  const [analysisMeta, setAnalysisMeta] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('activities');

  // VPE Reports states
  const [receivedReports, setReceivedReports] = useState([]);
  const [loadingReceivedReports, setLoadingReceivedReports] = useState(false);
  const [receivedReportsError, setReceivedReportsError] = useState(null);

  // Fetch received reports from principals
  const fetchReceivedReports = useCallback(async () => {
    try {
      setLoadingReceivedReports(true);
      setReceivedReportsError(null);
      const token = localStorage.getItem("token");
      
      console.log("VPE fetchReceivedReports - Token:", token ? "Present" : "Missing");
      
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }
      
      const res = await fetch(`${API_BASE}/api/vpe-reports/received`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.error || 'Failed to load received reports');
      }
      const data = await res.json();
      console.log("VPE Received reports data:", data);
      console.log("VPE Reports array:", data.reports);
      if (data.reports && data.reports.length > 0) {
        console.log("First report sample:", data.reports[0]);
      }
      setReceivedReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (e) {
      setReceivedReportsError(e.message);
      setReceivedReports([]);
    } finally {
      setLoadingReceivedReports(false);
    }
  }, []);

  // VPE: fetch analyses shared to VPE when tab active
  const fetchAnalysisHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      setHistoryError(null);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/ai-analytics/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.error || 'Failed to load analysis history');
      }
      const data = await res.json();
      setAnalysisHistory(Array.isArray(data.history) ? data.history : []);
    } catch (e) {
      setHistoryError(e.message);
      setAnalysisHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'vpe-reports') {
      fetchReceivedReports();
    }
  }, [activeTab, fetchReceivedReports]);

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("VPE Component - Token check:", token ? "Present" : "Missing");
    
    if (!token) {
      console.error("VPE Component - No token found, user needs to log in");
      // You could redirect to login here if needed
    } else {
      // Decode token to check role
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log("VPE Component - Token payload:", {
          role: payload.role,
          name: payload.name,
          email: payload.email
        });
      } catch (e) {
        console.error("VPE Component - Invalid token format:", e);
      }
    }
  }, []);

  const viewAnalysisById = useCallback(async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/ai-analytics/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.error || 'Failed to load analysis');
      }
      const data = await res.json();
      setAiAnalysis(data.analysis?.aiAnalysis || '');
      setAnalysisMeta({
        reportType: data.analysis?.reportType,
        filters: data.analysis?.filters,
      });
      setShowAnalysisModal(true);
    } catch (e) {
      setAnalysisError(e.message);
    }
  }, []);

  const downloadAnalysisPdfById = useCallback(async (id, filename) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/ai-analytics/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.error || 'Failed to load analysis');
      }
      const data = await res.json();
      const content = data.analysis?.aiAnalysis || '';
      const aCount = data.analysis?.analysisData?.activitySummary?.assignmentsCount || 0;
      const qCount = data.analysis?.analysisData?.activitySummary?.quizzesCount || 0;
      downloadAsPDF(content, filename, { assignmentsCount: aCount, quizzesCount: qCount });
    } catch (e) {
      setAnalysisError(e.message);
    }
  }, []);

  // New: report type modal state
  const [showReportTypeModal, setShowReportTypeModal] = useState(false);
  const [reportType, setReportType] = useState('year'); // 'year' | 'strand' | 'section'
  const [modalStrand, setModalStrand] = useState('');
  const [modalSection, setModalSection] = useState('');

  // Convert simple markdown-like text to safe HTML (no raw # or *)
  const formatAnalysisToHtml = useCallback((input) => {
    if (!input) return '';
    const escapeHtml = (s) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const lines = escapeHtml(input).split(/\r?\n/);
    const html = [];
    let inUl = false;
    let inOl = false;
    const closeLists = () => {
      if (inUl) { html.push('</ul>'); inUl = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
    };

    for (let raw of lines) {
      let line = raw.trimEnd();
      if (!line.trim()) { closeLists(); html.push('<p style="margin: 0 0 8px 0;">&nbsp;</p>'); continue; }
      if (/^[-*_]{3,}$/.test(line)) { closeLists(); html.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;"/>'); continue; }
      const hMatch = line.match(/^(#{1,6})\s*(.+)$/);
      if (hMatch) { 
        closeLists(); 
        const text = hMatch[2]
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>');
        html.push(`<h4 style="font-size:16px;font-weight:700;margin:14px 0 8px;">${text}</h4>`); 
        continue; 
      }
      const olMatch = line.match(/^\d+\.\s+(.+)$/);
      if (olMatch) { if (!inOl) { closeLists(); html.push('<ol style="margin:6px 0 8px 20px;">'); inOl = true; } html.push(`<li style="margin:2px 0;">${olMatch[1]}</li>`); continue; }
      const ulMatch = line.match(/^[-•]\s+(.+)$/);
      if (ulMatch) { if (!inUl) { closeLists(); html.push('<ul style="margin:6px 0 8px 20px;">'); inUl = true; } html.push(`<li style="margin:2px 0;">${ulMatch[1]}</li>`); continue; }
      let paragraph = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:0 4px;border-radius:4px;">$1</code>');
      closeLists();
      html.push(`<p style="margin: 0 0 8px 0;">${paragraph}</p>`);
    }
    closeLists();
    return html.join('');
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);

  // Helper: normalize possible Mongo ObjectId representations to plain string
  const toObjectIdString = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    // Common shapes: { _id: "..." } or { $oid: "..." }
    if (typeof value === "object") {
      if (value.$oid) return String(value.$oid);
      if (value._id) return typeof value._id === "object" && value._id.$oid ? String(value._id.$oid) : String(value._id);
    }
    try { return String(value); } catch { return ""; }
  };

  // Fetch academic year and current term
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
        console.log('[DEBUG] Fetching terms for school year:', schoolYearName);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const terms = await res.json();
          console.log('[DEBUG] Found terms:', terms);
          const active = terms.find(term => term.status === 'active');
          console.log('[DEBUG] Active term:', active);
          setCurrentTerm(active || null);
        } else {
          console.log('[DEBUG] Failed to fetch terms');
          setCurrentTerm(null);
        }
      } catch (err) {
        console.log('[DEBUG] Error fetching terms:', err);
        setCurrentTerm(null);
      }
    }
    fetchActiveTermForYear();
  }, [academicYear]);

  // Fetch all school years and terms
  useEffect(() => {
    async function fetchSchoolYearsAndTerms() {
      try {
        const token = localStorage.getItem("token");
        
        // Fetch all school years first
        const yearRes = await fetch(`${API_BASE}/api/schoolyears`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        let activeYear = null;
        
        if (yearRes.ok) {
          const years = await yearRes.json();
          const activeYears = years.filter(year => year.status !== 'archived');
          setSchoolYears(activeYears);
          
          // Auto-select the active school year
          activeYear = activeYears.find(year => year.status === 'active');
          
          if (activeYear) {
            const yearString = `${activeYear.schoolYearStart}-${activeYear.schoolYearEnd}`;
            setSelectedSchoolYear(yearString);
            
            // Now fetch terms for this school year
            const termRes = await fetch(`${API_BASE}/api/terms`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (termRes.ok) {
              const allTerms = await termRes.json();
              const activeTerms = allTerms.filter(term => term.status !== 'archived');
              setTerms(activeTerms);
              
              // Auto-select the active term for this school year
              const activeTerm = activeTerms.find(term => {
                const termSchoolYear = term.schoolYear || term.schoolYearName || term.year;
                return termSchoolYear === yearString && term.status === 'active';
              });
              if (activeTerm) {
                setSelectedTerm(activeTerm.termName);
              }
            }
          }
        }
        
        // If no active school year found, still fetch all terms for manual selection
        if (!activeYear) {
          const termRes = await fetch(`${API_BASE}/api/terms`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (termRes.ok) {
            const allTerms = await termRes.json();
            const activeTerms = allTerms.filter(term => term.status !== 'archived');
            setTerms(activeTerms);
          }
        }
      } catch (err) {
        console.error("Failed to fetch school years and terms", err);
      }
    }
    fetchSchoolYearsAndTerms();
  }, []);

  // Handle manual school year changes
  useEffect(() => {
    if (selectedSchoolYear && terms.length > 0) {
      // Auto-select the active term for the selected school year
      const activeTerm = terms.find(term => {
        const termSchoolYear = term.schoolYear || term.schoolYearName || term.year;
        const matches = termSchoolYear === selectedSchoolYear && term.status === 'active';
        return matches;
      });
      
      if (activeTerm) {
        setSelectedTerm(activeTerm.termName);
      } else {
        setSelectedTerm(""); // Clear term if no active term found
      }
    }
  }, [selectedSchoolYear, terms]);

  // Update filters when current term changes
  useEffect(() => {
    if (currentTerm && academicYear) {
      const yearString = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
      setSelectedSchoolYear(yearString);
      setSelectedTerm(currentTerm.termName);
    }
  }, [currentTerm, academicYear]);

  // Fetch activities for specific term and academic year only
  useEffect(() => {
    async function fetchActivitiesForTerm() {
      if (!selectedTerm || !selectedSchoolYear) return;
      
      setLoadingActivities(true);
      try {
        const token = localStorage.getItem("token");
        
        // Test server connectivity first
        console.log("Testing server connectivity...");
        try {
          const testRes = await fetch(`${API_BASE}/api/health`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          console.log("Server health check:", testRes.status);
        } catch (err) {
          console.warn("Server health check failed:", err);
        }
        
        // Fetch only classes for the specific term and school year
        console.log("Fetching classes for term:", selectedTerm, "and year:", selectedSchoolYear);
        const classesRes = await fetch(`${API_BASE}/classes`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const allClasses = classesRes.ok ? await classesRes.json() : [];
        
        // Filter classes by term and school year
        const classes = (allClasses || []).filter(cls => {
          if (cls?.isArchived) return false;
          // Check if class belongs to the selected term and school year
          const classYear = cls.schoolYear || cls.academicYear;
          const classTerm = cls.termName || cls.term;
          return classYear === selectedSchoolYear && classTerm === selectedTerm;
        });
        console.log("Filtered classes for term/year:", classes.length);

        // Fetch faculty assignments for the specific term and school year only
        console.log("Fetching faculty assignments for term:", selectedTerm, "and year:", selectedSchoolYear);
        const facAssignRes = await fetch(`${API_BASE}/api/faculty-assignments`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const allFacultyAssignments = facAssignRes.ok ? await facAssignRes.json() : [];
        // Filter by selected term and school year
        const facultyAssignments = (allFacultyAssignments || []).filter(a => {
          const matchesYear = a.schoolYear === selectedSchoolYear;
          const matchesTerm = a.termName === selectedTerm;
          return matchesYear && matchesTerm && a.status !== 'archived';
        });
        console.log("Faculty assignments for term/year:", facultyAssignments.length);

        const enrichedActivities = [];
        for (const cls of (classes || [])) {
          if (cls?.isArchived) continue;
          const classId = toObjectIdString(cls.classID || cls._id || (cls._id && cls._id.$oid));
          if (!classId) continue;
          
          console.log("Processing class:", {
            classId,
            facultyID: cls.facultyID,
            trackName: cls.trackName,
            strandName: cls.strandName,
            section: cls.section,
            className: cls.className
          });

          // Find matching faculty assignment for this class (by facultyId + section, more flexible)
          const match = facultyAssignments.find(a => {
            const facIdMatch = toObjectIdString(a.facultyId) === toObjectIdString(cls.facultyID);
            // If class has section data, try to match it
            const sectionMatch = cls.section ? (a.sectionName === cls.section) : true;
            // If class has track/strand data, try to match it, otherwise accept any
            const trackMatch = cls.trackName ? (a.trackName === cls.trackName) : true;
            const strandMatch = cls.strandName ? (a.strandName === cls.strandName) : true;
            
            const result = facIdMatch && sectionMatch && trackMatch && strandMatch;
            if (facIdMatch) {
              console.log("Faculty ID match found:", {
                classFacultyId: toObjectIdString(cls.facultyID),
                assignmentFacultyId: toObjectIdString(a.facultyId),
                classTrack: cls.trackName,
                assignmentTrack: a.trackName,
                classStrand: cls.strandName,
                assignmentStrand: a.strandName,
                classSection: cls.section,
                assignmentSection: a.sectionName,
                match: result,
                facultyName: a.facultyName
              });
            }
            return result;
          });
          
          console.log("Match result for class:", classId, match ? "FOUND" : "NOT FOUND");
          if (match) {
            console.log("Matched faculty assignment:", match);
          }

          try {
            const [aRes, qRes] = await Promise.all([
              fetch(`${API_BASE}/assignments?classID=${classId}`, { headers: { "Authorization": `Bearer ${token}` } }),
              fetch(`${API_BASE}/api/quizzes?classID=${classId}`, { headers: { "Authorization": `Bearer ${token}` } })
            ]);
            const assignments = aRes.ok ? await aRes.json() : [];
            const quizzes = qRes.ok ? await qRes.json() : [];

            assignments.forEach(assignment => {
              const createdById = toObjectIdString(assignment.createdBy || assignment.created_by || assignment.creatorId);
              const activityData = {
                _id: assignment._id,
                _kind: 'assignment',
                title: assignment.title,
                createdBy: createdById,
                facultyName: match?.facultyName || cls.facultyName || cls.facultyFullName || '',
                classID: classId,
                className: cls.className || cls.classCode || 'Unknown Class',
                trackName: match?.trackName || cls.trackName || '',
                strandName: match?.strandName || cls.strandName || '',
                sectionName: match?.sectionName || cls.section || '',
                subject: match?.subjectName || cls.subject || '',
                postAt: assignment.postAt,
                createdAt: assignment.createdAt,
                dueDate: assignment.dueDate,
                points: assignment.points,
              };
              console.log("Assignment activity data:", activityData);
              enrichedActivities.push(activityData);
            });

            quizzes.forEach(quiz => {
              const createdById = toObjectIdString(quiz.createdBy || quiz.created_by || quiz.creatorId);
              const activityData = {
                _id: quiz._id,
                _kind: 'quiz',
                title: quiz.title,
                createdBy: createdById,
                facultyName: match?.facultyName || cls.facultyName || cls.facultyFullName || '',
                classID: classId,
                className: cls.className || cls.classCode || 'Unknown Class',
                trackName: match?.trackName || cls.trackName || '',
                strandName: match?.strandName || cls.strandName || '',
                sectionName: match?.sectionName || cls.section || '',
                subject: match?.subjectName || cls.subject || '',
                postAt: quiz.postAt,
                createdAt: quiz.createdAt,
                dueDate: quiz.dueDate,
                points: quiz.points,
              };
              console.log("Quiz activity data:", activityData);
              enrichedActivities.push(activityData);
            });
          } catch (err) {
            console.warn("Failed to fetch activities for class", classId, err);
          }
        }

        console.log("Enriched activities:", enrichedActivities.length);
        setFacultyActivities(enrichedActivities);
        
      } catch (err) {
        console.error("Failed to fetch faculty activities:", err);
        setError("Failed to fetch faculty activities. Please try again.");
      } finally {
        setLoadingActivities(false);
      }
    }
    
    fetchActivitiesForTerm();
  }, [selectedTerm, selectedSchoolYear]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTrack("");
    setSelectedStrand("");
    setSelectedSection("");
    setSelectedCourse("");
    
    // Reset to current active school year and term
    if (academicYear) {
      const yearString = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
      setSelectedSchoolYear(yearString);
      
      if (currentTerm) {
        setSelectedTerm(currentTerm.termName);
      } else {
        setSelectedTerm("");
      }
    } else {
      setSelectedSchoolYear("");
      setSelectedTerm("");
    }
    setCurrentPage(1); // Reset pagination
  };

  // Build lookup maps for cascading filters
  const filteredActivities = facultyActivities.filter(activity => {
    // Filter by search term (faculty name)
    if (searchTerm && !activity.facultyName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by track
    if (selectedTrack && activity.trackName !== selectedTrack) {
      return false;
    }
    
    // Filter by strand
    if (selectedStrand && activity.strandName !== selectedStrand) {
      return false;
    }
    
    // Filter by section
    if (selectedSection && activity.sectionName !== selectedSection) {
      return false;
    }
    
    // Filter by course/subject
    if (selectedCourse && activity.subject !== selectedCourse) {
      return false;
    }
    
    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredActivities.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentActivities = filteredActivities.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTrack, selectedStrand, selectedSection, selectedCourse]);

  // Fetch student activity audit data
  const fetchAuditData = useCallback(async () => {
    if (!currentTerm) {
      console.log('[DEBUG] No currentTerm, skipping audit fetch');
      return;
    }
    
    try {
      setLoadingAudit(true);
      setAuditError(null);
      
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/assignments/audit/student-activity?termId=${currentTerm._id}`;
      console.log('[DEBUG] Fetching audit data from:', url);
      console.log('[DEBUG] Current term:', currentTerm);
      console.log('[DEBUG] Token exists:', !!token);
      
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      console.log('[DEBUG] Response status:', response.status);
      console.log('[DEBUG] Response ok:', response.ok);
      
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
        console.log('[DEBUG] Error response:', errorData);
        setAuditError(errorData.error || 'Failed to fetch audit data');
      }
    } catch (err) {
      console.error("Failed to fetch audit data:", err);
      setAuditError('Network error while fetching audit data');
    } finally {
      setLoadingAudit(false);
    }
  }, [currentTerm]);

  // Load audit data when term changes
  useEffect(() => {
    if (currentTerm) {
      // Test server connectivity first
      const testServer = async () => {
        try {
          const token = localStorage.getItem("token");
          const testRes = await fetch(`${API_BASE}/api/health`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          console.log('[DEBUG] Server health check:', testRes.status);
          if (testRes.ok) {
            fetchAuditData();
            fetchFacultyLastLogins();
          } else {
            console.error('[DEBUG] Server health check failed');
            setAuditError('Server is not accessible');
          }
        } catch (err) {
          console.error('[DEBUG] Server health check error:', err);
          setAuditError('Cannot connect to server');
        }
      };
      testServer();
    }
  }, [currentTerm, fetchAuditData]);

  // Fetch faculty last logins
  const fetchFacultyLastLogins = useCallback(async () => {
    try {
      setLoadingFacultyLogins(true);
      setFacultyLoginsError(null);
      
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/audit-logs/faculty-last-logins`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.facultyLogins)) {
          setFacultyLastLogins(data.facultyLogins);
        } else {
          setFacultyLastLogins([]);
        }
      } else {
        const errorData = await response.json();
        setFacultyLoginsError(errorData.error || 'Failed to fetch faculty login data');
      }
    } catch (err) {
      console.error("Failed to fetch faculty last logins:", err);
      setFacultyLoginsError('Network error while fetching faculty login data');
    } finally {
      setLoadingFacultyLogins(false);
    }
  }, []);

  // Extract unique values for filter dropdowns
  const uniqueTracks = [...new Set(facultyActivities.map(a => a.trackName).filter(Boolean))].sort();
  const uniqueStrands = [...new Set(facultyActivities.map(a => a.strandName).filter(Boolean))].sort();
  const uniqueSections = [...new Set(facultyActivities.map(a => a.sectionName).filter(Boolean))].sort();
  const uniqueCourses = [...new Set(facultyActivities.map(a => a.subject).filter(Boolean))].sort();

  // AI Analysis function
  const createAIAnalysis = async () => {
    if (!selectedSchoolYear || !selectedTerm) {
      setAnalysisError("Please select both school year and term before creating analysis.");
      return;
    }

    // Open report type modal first
    setShowReportTypeModal(true);
  };

  const confirmCreateAnalysis = async () => {
    setShowReportTypeModal(false);

    setLoadingAnalysis(true);
    setAnalysisError(null);
    setAiAnalysis(null);

    try {
      const token = localStorage.getItem("token");

      // Derive filters based on selection
      const body = {
        schoolYear: selectedSchoolYear,
        termName: selectedTerm,
        sectionFilter: null,
        trackFilter: null,
        strandFilter: null,
      };

      if (reportType === 'strand') {
        body.strandFilter = modalStrand || selectedStrand || null;
      } else if (reportType === 'section') {
        body.sectionFilter = modalSection || selectedSection || null;
      }

      const response = await fetch(`${API_BASE}/api/ai-analytics/create-analysis`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create AI analysis");
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);
      setAnalysisMeta(data.metadata || null);
      setShowAnalysisModal(true);
    } catch (error) {
      console.error("AI Analysis Error:", error);
      setAnalysisError(error.message || "Failed to create AI analysis");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Calculate summary statistics
  const assignmentsCount = filteredActivities.filter(a => a._kind === 'assignment').length;
  const quizzesCount = filteredActivities.filter(a => a._kind === 'quiz').length;

  // Helper functions for faculty last logins
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  // Helper for row color based on days since last login
  const getRowColor = (lastLogin) => {
    if (!lastLogin) return '';
    const now = new Date();
    const loginDate = new Date(lastLogin);
    const diffDays = Math.floor((now - loginDate) / (1000 * 60 * 60 * 24));
    if (diffDays >= 3) return 'bg-red-100';
    if (diffDays === 2) return 'bg-yellow-100';
    if (diffDays <= 1) return 'bg-green-100';
    return '';
  };

  // Sort faculty logins: reds first, then yellow, then green, then by most recent lastLogin
  const sortedFacultyLogins = [...facultyLastLogins].sort((a, b) => {
    const getPriority = (log) => {
      if (!log.lastLogin) return 3;
      const now = new Date();
      const loginDate = new Date(log.lastLogin);
      const diffDays = Math.floor((now - loginDate) / (1000 * 60 * 60 * 24));
      if (diffDays >= 3) return 0; // red
      if (diffDays === 2) return 1; // yellow
      if (diffDays <= 1) return 2; // green
      return 3;
    };
    const pa = getPriority(a);
    const pb = getPriority(b);
    if (pa !== pb) return pa - pb;
    // If same priority, sort by most recent lastLogin (descending)
    return new Date(b.lastLogin) - new Date(a.lastLogin);
  });

  // Pagination logic for faculty logins
  const totalFacultyLoginsPages = Math.ceil(sortedFacultyLogins.length / FACULTY_LOGINS_PER_PAGE);
  const paginatedFacultyLogins = sortedFacultyLogins.slice(
    (facultyLoginsPage - 1) * FACULTY_LOGINS_PER_PAGE,
    facultyLoginsPage * FACULTY_LOGINS_PER_PAGE
  );
  // Render inline chart in modal when visible
  useEffect(() => {
    if (!showAnalysisModal) return;
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Determine report type
    const rType = analysisMeta?.reportType || (modalStrand ? 'strand' : (modalSection ? 'section' : 'year'));

    // Base counts
    const totalAssign = assignmentsCount;
    const totalQuiz = quizzesCount;

    if (rType === 'year') {
      if (totalAssign + totalQuiz === 0) return;
      chartInstanceRef.current = new Chart(context, {
        type: 'pie',
        data: {
          labels: ['Assignments', 'Quizzes'],
          datasets: [{ data: [totalAssign, totalQuiz], backgroundColor: ['#f59e0b', '#3b82f6'], borderColor: '#ffffff', borderWidth: 2 }]
        },
        options: { plugins: { legend: { position: 'bottom' } }, responsive: false }
      });
    } else if (rType === 'strand') {
      // Show distribution by section within the strand
      const inStrand = filteredActivities.filter(a => a.strandName === (analysisMeta?.filters?.strand || modalStrand || selectedStrand));
      const bySection = new Map();
      for (const it of inStrand) {
        const key = it.sectionName || 'Unknown';
        bySection.set(key, (bySection.get(key) || 0) + 1);
      }
      const labels = Array.from(bySection.keys());
      const data = Array.from(bySection.values());
      if (data.reduce((a,b)=>a+b,0) === 0) return;
      chartInstanceRef.current = new Chart(context, {
        type: 'pie',
        data: {
          labels,
          datasets: [{ data, backgroundColor: labels.map((_,i)=>['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316'][i%8]), borderColor: '#ffffff', borderWidth: 2 }]
        },
        options: { plugins: { legend: { position: 'bottom' } }, responsive: false }
      });
    } else if (rType === 'section') {
      // Show distribution by activity status within the section
      const section = analysisMeta?.filters?.section || modalSection || selectedSection;
      const inSection = filteredActivities.filter(a => a.sectionName === section);
      const posted = inSection.filter(a => a.postAt && new Date(a.postAt) <= new Date()).length;
      const pending = inSection.filter(a => !a.postAt || new Date(a.postAt) > new Date()).length;
      if (posted + pending === 0) return;
      chartInstanceRef.current = new Chart(context, {
        type: 'pie',
        data: {
          labels: ['Posted', 'Pending'],
          datasets: [{ data: [posted, pending], backgroundColor: ['#10b981','#f59e0b'], borderColor: '#ffffff', borderWidth: 2 }]
        },
        options: { plugins: { legend: { position: 'bottom' } }, responsive: false }
      });
    }

    // Secondary pies: re-purpose based on rType
    const secCanvas = sectionChartCanvasRef.current;
    const trkCanvas = trackChartCanvasRef.current;
    const strCanvas = strandChartCanvasRef.current;

    if (sectionChartInstanceRef.current) sectionChartInstanceRef.current.destroy();
    if (trackChartInstanceRef.current) trackChartInstanceRef.current.destroy();
    if (strandChartInstanceRef.current) strandChartInstanceRef.current.destroy();

    const palette = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316','#22c55e','#6366f1'];
    const toColors = (n) => Array.from({ length: n }, (_, i) => palette[i % palette.length]);

    if (rType === 'year') {
      // Section distribution, Track distribution, Strand distribution
      const buildCounts = (items, key) => {
        const map = new Map();
        for (const it of items) { const k = it[key] || 'Unknown'; map.set(k, (map.get(k)||0)+1); }
        return { labels: Array.from(map.keys()), data: Array.from(map.values()) };
      };
      const sectionDist = buildCounts(filteredActivities, 'sectionName');
      const trackDist = buildCounts(filteredActivities, 'trackName');
      const strandDist = buildCounts(filteredActivities, 'strandName');
      if (secCanvas && sectionDist.data.reduce((a,b)=>a+b,0) > 0) {
        sectionChartInstanceRef.current = new Chart(secCanvas.getContext('2d'), { type: 'pie', data: { labels: sectionDist.labels, datasets: [{ data: sectionDist.data, backgroundColor: toColors(sectionDist.data.length), borderColor: '#ffffff', borderWidth: 2 }] }, options: { plugins: { legend: { position: 'bottom' } }, responsive: false } });
      }
      if (trkCanvas && trackDist.data.reduce((a,b)=>a+b,0) > 0) {
        trackChartInstanceRef.current = new Chart(trkCanvas.getContext('2d'), { type: 'pie', data: { labels: trackDist.labels, datasets: [{ data: trackDist.data, backgroundColor: toColors(trackDist.data.length), borderColor: '#ffffff', borderWidth: 2 }] }, options: { plugins: { legend: { position: 'bottom' } }, responsive: false } });
      }
      if (strCanvas && strandDist.data.reduce((a,b)=>a+b,0) > 0) {
        strandChartInstanceRef.current = new Chart(strCanvas.getContext('2d'), { type: 'pie', data: { labels: strandDist.labels, datasets: [{ data: strandDist.data, backgroundColor: toColors(strandDist.data.length), borderColor: '#ffffff', borderWidth: 2 }] }, options: { plugins: { legend: { position: 'bottom' } }, responsive: false } });
      }
    } else if (rType === 'strand') {
      // Within the strand: Activities by Section, and assignment vs quiz within the strand
      const strandVal = analysisMeta?.filters?.strand || modalStrand || selectedStrand;
      const inStrand = filteredActivities.filter(a => a.strandName === strandVal);
      const bySection = new Map();
      let aCount = 0, qCount = 0;
      for (const it of inStrand) {
        const sec = it.sectionName || 'Unknown';
        bySection.set(sec, (bySection.get(sec)||0) + 1);
        if (it._kind === 'assignment') aCount++; else if (it._kind === 'quiz') qCount++;
      }
      if (sectionChartCanvasRef.current) {
        const labels = Array.from(bySection.keys()); const data = Array.from(bySection.values());
        if (data.reduce((a,b)=>a+b,0) > 0) {
          sectionChartInstanceRef.current = new Chart(sectionChartCanvasRef.current.getContext('2d'), { type: 'pie', data: { labels, datasets: [{ data, backgroundColor: toColors(data.length), borderColor: '#ffffff', borderWidth: 2 }] }, options: { plugins: { legend: { position: 'bottom' } }, responsive: false } });
        }
      }
      if (trackChartCanvasRef.current && (aCount+qCount)>0) {
        trackChartInstanceRef.current = new Chart(trackChartCanvasRef.current.getContext('2d'), { type: 'pie', data: { labels: ['Assignments','Quizzes'], datasets: [{ data: [aCount,qCount], backgroundColor: ['#f59e0b','#3b82f6'], borderColor: '#ffffff', borderWidth: 2 }] }, options: { plugins: { legend: { position: 'bottom' } }, responsive: false } });
      }
      // Leave strand pie empty or mirror bySection if needed
    } else if (rType === 'section') {
      // Within the section: By subject/course, and status distribution
      const sectionVal = analysisMeta?.filters?.section || modalSection || selectedSection;
      const inSection = filteredActivities.filter(a => a.sectionName === sectionVal);
      const byCourse = new Map();
      let posted = 0, pending = 0;
      for (const it of inSection) {
        const course = it.subject || 'Unknown';
        byCourse.set(course, (byCourse.get(course)||0) + 1);
        if (it.postAt && new Date(it.postAt) <= new Date()) posted++; else pending++;
      }
      if (sectionChartCanvasRef.current) {
        const labels = Array.from(byCourse.keys()); const data = Array.from(byCourse.values());
        if (data.reduce((a,b)=>a+b,0) > 0) {
          sectionChartInstanceRef.current = new Chart(sectionChartCanvasRef.current.getContext('2d'), { type: 'pie', data: { labels, datasets: [{ data, backgroundColor: toColors(data.length), borderColor: '#ffffff', borderWidth: 2 }] }, options: { plugins: { legend: { position: 'bottom' } }, responsive: false } });
        }
      }
      if (trackChartCanvasRef.current && (posted+pending)>0) {
        trackChartInstanceRef.current = new Chart(trackChartCanvasRef.current.getContext('2d'), { type: 'pie', data: { labels: ['Posted','Pending'], datasets: [{ data: [posted,pending], backgroundColor: ['#10b981','#f59e0b'], borderColor: '#ffffff', borderWidth: 2 }] }, options: { plugins: { legend: { position: 'bottom' } }, responsive: false } });
      }
      // Use strand chart to show assignment vs quiz in the section
      if (strandChartCanvasRef.current) {
        const aCount = inSection.filter(a => a._kind==='assignment').length;
        const qCount = inSection.filter(a => a._kind==='quiz').length;
        if (aCount+qCount>0) {
          strandChartInstanceRef.current = new Chart(strandChartCanvasRef.current.getContext('2d'), { type: 'pie', data: { labels: ['Assignments','Quizzes'], datasets: [{ data: [aCount,qCount], backgroundColor: ['#f59e0b','#3b82f6'], borderColor: '#ffffff', borderWidth: 2 }] }, options: { plugins: { legend: { position: 'bottom' } }, responsive: false } });
        }
      }
    }

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
      if (sectionChartInstanceRef.current) sectionChartInstanceRef.current.destroy();
      if (trackChartInstanceRef.current) trackChartInstanceRef.current.destroy();
      if (strandChartInstanceRef.current) strandChartInstanceRef.current.destroy();
    };
  }, [showAnalysisModal, assignmentsCount, quizzesCount, filteredActivities, analysisMeta, modalStrand, modalSection, selectedStrand, selectedSection]);
  

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <VPE_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">VPE Faculty Activity Audit</h2>
            <p className="text-base md:text-lg">
              {selectedSchoolYear || (academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading...")} | 
              {selectedTerm || (currentTerm ? `${currentTerm.termName}` : "Loading...")} | 
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* VPE cannot create analyses; view-only */}
            <ProfileMenu />
          </div>
        </div>

        {/* Main Content Area */}
        <div >
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-300">
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-4 py-2 rounded-t-lg text-sm md:text-base font-medium ${
                activeTab === 'activities'
                  ? "bg-white text-blue-900 border border-gray-300 border-b-0"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              }`}
            >
              Faculty Activities
            </button>
            <button
              onClick={() => setActiveTab('student-audit')}
              className={`px-4 py-2 rounded-t-lg text-sm md:text-base font-medium ${
                activeTab === 'student-audit'
                  ? "bg-white text-blue-900 border border-gray-300 border-b-0"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              }`}
            >
              Student Activity Audit
            </button>
            <button
              onClick={() => setActiveTab('faculty-logins')}
              className={`px-4 py-2 rounded-t-lg text-sm md:text-base font-medium ${
                activeTab === 'faculty-logins'
                  ? "bg-white text-blue-900 border border-gray-300 border-b-0"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              }`}
            >
              Faculty Last Logins
            </button>
            <button
              onClick={() => setActiveTab('vpe-reports')}
              className={`px-4 py-2 rounded-t-lg text-sm md:text-base font-medium ${
                activeTab === 'vpe-reports'
                  ? "bg-white text-blue-900 border border-gray-300 border-b-0"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              }`}
            >
              Received Reports
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 bg-white rounded-lg shadow-md">
            {activeTab === 'activities' && (
              <div>
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Faculty Activity Audit Log</h3>
            
            
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              {/* School Year Filter */}
              {/* <select
                value={selectedSchoolYear}
                onChange={(e) => { 
                  setSelectedSchoolYear(e.target.value); 
                  setSelectedTerm(""); 
                  setSelectedTrack(""); 
                  setSelectedStrand(""); 
                  setSelectedSection(""); 
                  setSelectedCourse(""); 
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All School Years</option>
                {schoolYears.map(year => (
                  <option key={year._id} value={`${year.schoolYearStart}-${year.schoolYearEnd}`}>
                    {year.schoolYearStart}-{year.schoolYearEnd}
                  </option>
                ))}
              </select> */}

              {/* Term Filter */}
              {/* <select
                value={selectedTerm}
                onChange={(e) => { 
                  setSelectedTerm(e.target.value); 
                  setSelectedTrack(""); 
                  setSelectedStrand(""); 
                  setSelectedSection(""); 
                  setSelectedCourse(""); 
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                disabled={!selectedSchoolYear}
              >
                <option value="">All Terms</option>
                {selectedSchoolYear && terms
                  .filter(term => {
                    const termSchoolYear = term.schoolYear || term.schoolYearName || term.year;
                    const matches = termSchoolYear === selectedSchoolYear;
                    return matches;
                  })
                  .map(term => (
                    <option key={term._id} value={term.termName}>
                      {term.termName}
                    </option>
                  ))}
              </select> */}

              {/* Faculty Name Search */}
              <input
                type="text"
                placeholder="Search faculty name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {/* Track Filter */}
              <select
                value={selectedTrack}
                onChange={(e) => { setSelectedTrack(e.target.value); setSelectedStrand(""); setSelectedSection(""); setSelectedCourse(""); }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Tracks</option>
                {uniqueTracks.map(track => (
                  <option key={track} value={track}>{track}</option>
                ))}
              </select>
              
              {/* Strand Filter */}
              <select
                value={selectedStrand}
                onChange={(e) => { setSelectedStrand(e.target.value); setSelectedSection(""); setSelectedCourse(""); }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Strands</option>
                {uniqueStrands.map(strand => (
                  <option key={strand} value={strand}>{strand}</option>
                ))}
              </select>

              {/* Section Filter */}
              <select
                value={selectedSection}
                onChange={(e) => { setSelectedSection(e.target.value); setSelectedCourse(""); }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Sections</option>
                {uniqueSections.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>

              {/* Course/Subject Filter */}
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Courses</option>
                {uniqueCourses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
              
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>


          {/* Faculty Activities Table */}
          <div className="mt-8">
            {!selectedTerm || !selectedSchoolYear ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-lg mb-2">Select a School Year and Term</p>
                <p className="text-gray-400 text-sm">Choose a school year and term from the filters above to view faculty activities.</p>
              </div>
            ) : loadingActivities ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-gray-600">Loading faculty activities...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 bg-red-50 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No activities found for the selected filters.</p>
              </div>
            ) : (
              <>
                {/* Results Summary */}
                <div className="mb-4 text-sm text-gray-600">
                  Showing {filteredActivities.length} activities
                  {searchTerm && ` for faculty matching "${searchTerm}"`}
                  {selectedTrack && ` in ${selectedTrack}`}
                  {selectedStrand && ` in ${selectedStrand}`}
                  {selectedSection && ` in ${selectedSection}`}
                  {selectedCourse && ` in ${selectedCourse}`}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Faculty Name</th>
                        <th className="p-3 border">Track</th>
                        <th className="p-3 border">Strand</th>
                        <th className="p-3 border">Section</th>
                        <th className="p-3 border">Course</th>
                        <th className="p-3 border">Activity Title</th>
                        <th className="p-3 border">Created At</th>
                        <th className="p-3 border">Posted At</th>
                        <th className="p-3 border">Due Date</th>
                        <th className="p-3 border">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentActivities.map((activity, index) => (
                        <tr key={`${activity._id}-${index}`} className="hover:bg-gray-50">
                          <td className="p-3 border text-gray-900 whitespace-nowrap">
                            {activity.facultyName}
                          </td>
                          <td className="p-3 border text-gray-900 whitespace-nowrap">
                            {activity.trackName}
                          </td>
                          <td className="p-3 border text-gray-900 whitespace-nowrap">
                            {activity.strandName}
                          </td>
                          <td className="p-3 border text-gray-900 whitespace-nowrap">
                            {activity.sectionName}
                          </td>
                          <td className="p-3 border text-gray-900 whitespace-nowrap">
                            {activity.subject}
                          </td>
                          <td className="p-3 border text-gray-900 whitespace-normal break-words">
                            {activity.title}
                          </td>
                          <td className="p-3 border text-gray-900 whitespace-nowrap text-xs">
                            {activity.createdAt ? new Date(activity.createdAt).toLocaleString("en-US") : '-'}
                          </td>
                          <td className="p-3 border text-gray-900 whitespace-nowrap text-xs">
                            {activity.postAt ? new Date(activity.postAt).toLocaleString("en-US") : '-'}
                          </td>
                          <td className="p-3 border text-gray-900 whitespace-nowrap text-xs">
                            {activity.dueDate ? new Date(activity.dueDate).toLocaleDateString("en-US") : '-'}
                          </td>
                          <td className="p-3 border text-gray-900 whitespace-nowrap">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              activity.postAt && new Date(activity.postAt) <= new Date()
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                            }`}>
                              {activity.postAt && new Date(activity.postAt) <= new Date() ? 'Posted' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-700">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredActivities.length)} of {filteredActivities.length} entries
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm border rounded ${
                            currentPage === pageNum
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
            )}

            {activeTab === 'student-audit' && (
              <div>
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Student Activity Audit</h3>
          </div>

          {/* Student Activity Audit Content */}
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

              const exportToExcel = () => {
                // Create workbook
                const wb = XLSX.utils.book_new();
                
                // Create header information
                const headerData = [
                  ["SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC."],
                  ["2772-2774 Roxas Boulevard, Pasay City 1300 Philippines"],
                  ["PAASCU Accredited - COLLEGE"],
                  [""], // Empty row
                  ["FACULTY PERFORMANCE & ACTIVITY LEVELS ANALYSIS"],
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
                  ["FACULTY ACTIVITY AUDIT DATA:"],
                  [""], // Empty row
                ];
                
                // Create data rows with headers
                const dataHeaders = [
                  "Student Name",
                  "Section", 
                  "Activity",
                  "Faculty",
                  "Activity Type",
                  "Due Date",
                  "Status",
                  "Last Viewed"
                ];
                
                const dataRows = filteredRows.map(item => [
                  item.studentName,
                  item.sectionName,
                  item.activityTitle,
                  item.facultyName || "Current User",
                  item.activityType,
                  item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-US") : "-",
                  item.status.replace("_", " "),
                  item.lastViewedAt ? new Date(item.lastViewedAt).toLocaleString() : "-"
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
                  { wch: 20 }, // Faculty
                  { wch: 15 }, // Activity Type
                  { wch: 12 }, // Due Date
                  { wch: 15 }, // Status
                  { wch: 20 }  // Last Viewed
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
                XLSX.utils.book_append_sheet(wb, ws, "Faculty Performance Analysis");
                
                // Generate filename with timestamp
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                const filename = `FacultyPerformanceAnalysis_${timestamp}.xlsx`;
                
                // Write file
                XLSX.writeFile(wb, filename);
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
                    <p className="text-sm text-gray-500 mt-2">Make sure faculty have created assignments/quizzes and assigned them to students.</p>
                  </div>
                );
              }

              return (
                <>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                    <h3 className="text-lg font-semibold">Activity Visibility & Submission Audit</h3>
                    <div className="flex items-center gap-2">
                      {/* <button 
                        onClick={fetchAuditData} 
                        disabled={loadingAudit}
                        type="button" 
                        className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingAudit ? 'Refreshing...' : 'Refresh'}
                      </button> */}
                      {/* <button onClick={exportToExcel} type="button" className="px-4 py-2 rounded bg-[#010a51] text-white hover:bg-[#1a237e]">Export</button> */}
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

                  {/* Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="p-4 rounded border bg-red-50 border-red-200">
                      <div className="text-sm text-red-700">Not Viewed</div>
                      <div className="text-2xl font-bold text-red-800">{notViewedCount}</div>
                    </div>
                    <div className="p-4 rounded border bg-yellow-50 border-yellow-200">
                      <div className="text-sm text-yellow-700">Missed</div>
                      <div className="text-2xl font-bold text-yellow-800">{missedCount}</div>
                    </div>
                    <div className="p-4 rounded border bg-gray-50 border-gray-200">
                      <div className="text-sm text-gray-700">Total (Filtered)</div>
                      <div className="text-2xl font-bold text-gray-800">{filteredRows.length}</div>
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
                          <th className="p-3 border-b font-semibold text-gray-700">Faculty</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Type</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Due Date</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Status</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Last Viewed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td className="p-4 text-center text-gray-500" colSpan={8}>No results for current filters.</td>
                          </tr>
                        ) : (
                          filteredRows.map((item) => (
                            <tr key={`${item.activityId}-${item.studentId}`} className="odd:bg-white even:bg-gray-50">
                              <td className="p-3 border-b">{item.studentName}</td>
                              <td className="p-3 border-b">{item.sectionName}</td>
                              <td className="p-3 border-b">{item.activityTitle}</td>
                              <td className="p-3 border-b">{item.facultyName || 'Current User'}</td>
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
                    This view shows real-time data from assignments and quizzes. 
                    Students are marked as "not viewed" if they haven't accessed the activity yet, 
                    and "missed" if the due date has passed without them viewing it.
                  </p>
                </>
              );
            }

            return <AuditUI />;
          })()}
              </div>
            )}

            {activeTab === 'faculty-logins' && (
              <div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Faculty Last Logins</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={fetchFacultyLastLogins} 
                      disabled={loadingFacultyLogins}
                      type="button" 
                      className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingFacultyLogins ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </div>

          {loadingFacultyLogins ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#010a51] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading faculty login data...</p>
            </div>
          ) : facultyLoginsError ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">Error: {facultyLoginsError}</div>
              <button 
                onClick={fetchFacultyLastLogins}
                className="px-4 py-2 bg-[#010a51] text-white rounded hover:bg-[#1a237e]"
              >
                Retry
              </button>
            </div>
          ) : facultyLastLogins.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No faculty login data found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="p-3 border-b font-semibold text-gray-700">Faculty Name</th>
                      <th className="p-3 border-b font-semibold text-gray-700">Role</th>
                      <th className="p-3 border-b font-semibold text-gray-700">Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFacultyLogins.map((log) => (
                      <tr key={log._id} className={getRowColor(log.lastLogin)}>
                        <td className="p-3 border-b text-gray-900 whitespace-nowrap">{log.userName}</td>
                        <td className="p-3 border-b text-gray-700 whitespace-nowrap">{log.userRole}</td>
                        <td className="p-3 border-b text-gray-500 whitespace-nowrap">{formatDate(log.lastLogin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination controls */}
              {totalFacultyLoginsPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <button
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    onClick={() => setFacultyLoginsPage((p) => Math.max(1, p - 1))}
                    disabled={facultyLoginsPage === 1}
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-700">
                    Page {facultyLoginsPage} of {totalFacultyLoginsPages}
                  </span>
                  
                  <button
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    onClick={() => setFacultyLoginsPage((p) => Math.min(totalFacultyLoginsPages, p + 1))}
                    disabled={facultyLoginsPage === totalFacultyLoginsPages}
                  >
                    Next
                  </button>
                </div>
              )}


              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                  <span>3+ days inactive</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                  <span>2 days inactive</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                  <span>Active (≤1 day)</span>
                </div>
              </div>
            </>
          )}
              </div>
            )}

            {activeTab === 'vpe-reports' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Reports from Principals</h3>
                  <button 
                    onClick={fetchReceivedReports}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>

                {loadingReceivedReports ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-8 h-8 border-4 border-blue-500 border-top-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-gray-600">Loading received reports...</p>
                  </div>
                ) : receivedReportsError ? (
                  <div className="text-center py-8 bg-red-50 rounded-lg">
                    <p className="text-red-600">{receivedReportsError}</p>
                    <button onClick={fetchReceivedReports} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      Retry
                    </button>
                  </div>
                ) : receivedReports.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">No reports received from principals yet.</p>
                    <p className="text-sm text-gray-500 mt-2">Reports sent by principals will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-left">
                          <th className="p-3 border">Received Date</th>
                          <th className="p-3 border">From Principal</th>
                          <th className="p-3 border">School Year</th>
                          <th className="p-3 border">Term</th>
                          <th className="p-3 border">Report Name</th>
                          <th className="p-3 border">Message</th>
                          <th className="p-3 border">Status</th>
                          <th className="p-3 border">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receivedReports.map(report => (
                          <tr key={report.id} className="hover:bg-gray-50">
                            <td className="p-3 border whitespace-nowrap">
                              {report.sentAt ? new Date(report.sentAt).toLocaleString('en-US') : '-'}
                            </td>
                            <td className="p-3 border whitespace-nowrap">{report.sentBy}</td>
                            <td className="p-3 border whitespace-nowrap">{report.schoolYear}</td>
                            <td className="p-3 border whitespace-nowrap">{report.termName}</td>
                            <td className="p-3 border whitespace-nowrap">{report.reportName}</td>
                            <td className="p-3 border whitespace-normal max-w-xs truncate">
                              {report.message || '-'}
                            </td>
                            <td className="p-3 border whitespace-nowrap">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                report.status === 'sent' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                report.status === 'delivered' ? 'bg-green-100 text-green-700 border border-green-200' :
                                'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}>
                                {report.status}
                              </span>
                            </td>
                            <td className="p-3 border whitespace-nowrap">
                            <button 
                              onClick={async () => {
                                console.log("VPE Download button clicked!");
                                console.log("Report object:", report);
                                
                                try {
                                  const token = localStorage.getItem('token');
                                  if (!token) {
                                    alert('Please log in to download reports.');
                                    return;
                                  }
                                  
                                  // Use backend download route for proper authentication and filename handling
                                  const response = await fetch(`${API_BASE}/api/vpe-reports/download/${report.id}`, {
                                    method: 'GET',
                                    headers: {
                                      'Authorization': `Bearer ${token}`
                                    }
                                  });
                                  
                                  if (!response.ok) {
                                    const errorData = await response.json();
                                    throw new Error(errorData.error || 'Failed to download report');
                                  }
                                  
                                  // Get the blob from response
                                  const blob = await response.blob();
                                  
                                  // Create download link with proper filename
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = report.reportName;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                  
                                } catch (error) {
                                  console.error('Download error:', error);
                                  alert(`Failed to download report: ${error.message}`);
                                }
                              }}
                              className="px-2 py-1 text-xs border rounded hover:bg-gray-50 flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">
                AI Analysis Report - {selectedSchoolYear} - {selectedTerm}
              </h3>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {aiAnalysis ? (() => {
                const variants = [
                  'Faculty Performance & Activity Levels Analysis',
                  'Faculty Performance & Activity Levels',
                  'Faculty Performance and Activity Levels'
                ];
                let idx = -1; let used = '';
                for (const v of variants) { const i = aiAnalysis.indexOf(v); if (i !== -1) { idx = i; used = v; break; } }
                const headEnd = idx === -1 ? -1 : idx + used.length;
                const before = idx === -1 ? aiAnalysis : aiAnalysis.slice(0, headEnd);
                const after = idx === -1 ? '' : aiAnalysis.slice(headEnd);
                return (
                <div className="prose max-w-none">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-6 border-l-4 border-blue-500">
                    <h4 className="text-lg font-semibold text-blue-800 mb-2">Analysis Summary</h4>
                    <p className="text-blue-700">
                      This AI-powered analysis provides insights into faculty performance, student engagement, 
                      and recommendations for improving academic outcomes.
                    </p>
                  </div>
                  <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatAnalysisToHtml(before) }} />
                  {idx !== -1 && (
                    <div className="flex flex-col gap-6 py-3">
                      <div className="flex items-center justify-center">
                        <canvas ref={chartCanvasRef} width={180} height={180} style={{ width: 180, height: 180 }} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex flex-col items-center">
                          <div className="text-sm font-medium mb-2">By Section</div>
                          <canvas ref={sectionChartCanvasRef} width={180} height={180} style={{ width: 180, height: 180 }} />
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="text-sm font-medium mb-2">By Track</div>
                          <canvas ref={trackChartCanvasRef} width={180} height={180} style={{ width: 180, height: 180 }} />
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="text-sm font-medium mb-2">By Strand</div>
                          <canvas ref={strandChartCanvasRef} width={180} height={180} style={{ width: 180, height: 180 }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatAnalysisToHtml(after) }} />
                </div>
                );
              })() : (
                <div className="text-center py-8">
                  <div className="text-red-600">No analysis data available</div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors bg-white"
              >
                Close
              </button>
              {aiAnalysis && (
                <>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiAnalysis);
                      // You could add a toast notification here
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => downloadAsPDF(
                      aiAnalysis,
                      `AI_Analysis_${selectedSchoolYear}_${selectedTerm}`,
                      { assignmentsCount, quizzesCount }
                    )}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Download as PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {analysisError && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium">Analysis Error</h4>
              <p className="text-sm mt-1">{analysisError}</p>
            </div>
            <button
              onClick={() => setAnalysisError(null)}
              className="ml-4 text-red-400 hover:text-red-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Report Type Modal */}
      {showReportTypeModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold">Choose report type</h3>
              <p className="text-sm text-gray-600 mt-1">How should the analysis be generated?</p>
            </div>
            <div className="p-5 space-y-3">
              <label className="flex items-center gap-3">
                <input type="radio" name="reportType" value="year" checked={reportType==='year'} onChange={() => setReportType('year')} />
                <span>For the whole active academic year</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="reportType" value="strand" checked={reportType==='strand'} onChange={() => setReportType('strand')} />
                <span>For a specific strand</span>
              </label>
              {reportType==='strand' && (
                <select value={modalStrand} onChange={e=>setModalStrand(e.target.value)} className="w-full border rounded px-3 py-2">
                  <option value="">Select strand</option>
                  {[...new Set(facultyActivities.map(a=>a.strandName).filter(Boolean))].sort().map(s=> (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              <label className="flex items-center gap-3">
                <input type="radio" name="reportType" value="section" checked={reportType==='section'} onChange={() => setReportType('section')} />
                <span>For a specific section within the active term</span>
              </label>
              {reportType==='section' && (
                <select value={modalSection} onChange={e=>setModalSection(e.target.value)} className="w-full border rounded px-3 py-2">
                  <option value="">Select section</option>
                  {[...new Set(facultyActivities.map(a=>a.sectionName).filter(Boolean))].sort().map(s=> (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="p-5 border-t flex justify-end gap-2 bg-gray-50">
              <button onClick={()=>setShowReportTypeModal(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={confirmCreateAnalysis} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50" disabled={loadingAnalysis || (reportType==='strand' && !modalStrand && !selectedStrand) || (reportType==='section' && !modalSection && !selectedSection)}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
