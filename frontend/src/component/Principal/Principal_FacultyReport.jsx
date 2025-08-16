import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import Principal_Navbar from "./Principal_Navbar";
import ProfileModal from "../ProfileModal";
import { useNavigate } from "react-router-dom";
import ProfileMenu from "../ProfileMenu";

const API_BASE = "http://localhost:5000";

export default function Principal_FacultyReport() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [facultyData, setFacultyData] = useState([]);
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("");
  const [selectedStrand, setSelectedStrand] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [facultyReports, setFacultyReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [termReportsByFaculty, setTermReportsByFaculty] = useState({});
  const [studentFilter, setStudentFilter] = useState("");
  const [schoolYears, setSchoolYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [loadingTermData, setLoadingTermData] = useState(false);

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

  // Fetch all school years and terms
  useEffect(() => {
    async function fetchSchoolYearsAndTerms() {
      try {
        const token = localStorage.getItem("token");
        
        // Fetch all school years first
        const yearRes = await fetch(`${API_BASE}/api/schoolyears`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const years = await yearRes.json();
          const activeYears = years.filter(year => year.status !== 'archived');
          setSchoolYears(activeYears);
          
          // Auto-select the active school year
          const activeYear = activeYears.find(year => year.status === 'active');
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
              const activeTerm = activeTerms.find(term => 
                term.schoolYear === yearString && term.status === 'active'
              );
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
      const activeTerm = terms.find(term => 
        term.schoolYear === selectedSchoolYear && term.status === 'active'
      );
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

  // Periodically refresh active school year and term so the Status column reflects changes
  useEffect(() => {
    let isCancelled = false;
    const POLL_MS = 15000;

    async function refreshActiveYearAndTerm() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!yearRes.ok) return;
        const year = await yearRes.json();
        if (!isCancelled) {
          setAcademicYear((prev) => {
            const changed =
              !prev ||
              prev._id !== year._id ||
              prev.schoolYearStart !== year.schoolYearStart ||
              prev.schoolYearEnd !== year.schoolYearEnd;
            return changed ? year : prev;
          });
        }

        const schoolYearName = `${year.schoolYearStart}-${year.schoolYearEnd}`;
        const termRes = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!termRes.ok) return;
        const terms = await termRes.json();
        const active = terms.find((t) => t.status === "active") || null;
        if (!isCancelled) {
          setCurrentTerm((prev) => {
            const changed = !prev || (active && prev._id !== active._id) || (!active && prev !== null);
            return changed ? active : prev;
          });
        }
      } catch (e) {
        // ignore transient errors; next poll will retry
      }
    }

    refreshActiveYearAndTerm();
    const id = setInterval(refreshActiveYearAndTerm, POLL_MS);
    return () => {
      isCancelled = true;
      clearInterval(id);
    };
  }, []);

  // Fetch all student reports for the selected term and school year to compute per-faculty status
  useEffect(() => {
    async function fetchReportsForTerm() {
      if (!selectedTerm || !selectedSchoolYear) return;
      
      setLoadingTermData(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API_BASE}/api/studentreports?termName=${encodeURIComponent(selectedTerm)}&schoolYear=${encodeURIComponent(selectedSchoolYear)}&limit=10000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const reports = data.reports || data || [];
          const index = {};
          for (const r of reports) {
            const fid = r.facultyId?._id || r.facultyId; // handle populated or raw id
            if (!fid) continue;
            const existing = index[fid];
            const rDate = new Date(r.date).getTime();
            if (!existing) {
              index[fid] = { 
                count: 1, 
                latestDate: r.date,
                hasVisibleReports: r.show === 'yes'
              };
            } else {
              existing.count += 1;
              if (rDate > new Date(existing.latestDate).getTime()) {
                existing.latestDate = r.date;
              }
              // Update visibility status if any report is visible
              if (r.show === 'yes') {
                existing.hasVisibleReports = true;
              }
            }
          }
          setTermReportsByFaculty(index);
        } else {
          setTermReportsByFaculty({});
        }
      } catch (e) {
        setTermReportsByFaculty({});
      } finally {
        setLoadingTermData(false);
      }
    }
    fetchReportsForTerm();
  }, [selectedTerm, selectedSchoolYear]);

  // Fetch faculty data
  useEffect(() => {
    async function fetchFacultyData() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/users/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
          const users = await response.json();
          // Filter only faculty members
          const faculty = users.filter(user => user.role === 'faculty');
          setFacultyData(faculty);
        } else {
          console.error("Failed to fetch faculty data:", response.status);
          setError("Failed to fetch faculty data");
        }
      } catch (err) {
        console.error("Failed to fetch faculty data:", err);
        setError("Failed to fetch faculty data");
      } finally {
        setLoading(false);
      }
    }
    fetchFacultyData();
  }, []);

  // Fetch faculty assignments
  useEffect(() => {
    async function fetchFacultyAssignments() {
      if (!selectedTerm || !selectedSchoolYear) return;
      
      setLoadingTermData(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/api/faculty-assignments`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
          const assignments = await response.json();
          // Filter assignments by selected term and school year
          const filteredAssignments = assignments.filter(assignment => 
            assignment.termName === selectedTerm && assignment.schoolYear === selectedSchoolYear
          );
          setFacultyAssignments(filteredAssignments);
        } else {
          console.error("Failed to fetch faculty assignments:", response.status);
        }
      } catch (err) {
        console.error("Failed to fetch faculty assignments:", err);
      } finally {
        setLoadingTermData(false);
      }
    }
    fetchFacultyAssignments();
  }, [selectedTerm, selectedSchoolYear]);

  // Combine faculty data with assignments
  const facultyWithAssignments = facultyData.map(faculty => {
    // Find assignments for this faculty in the selected term and school year
    const facultyAssignmentsForFaculty = facultyAssignments.filter(assignment => 
      assignment.facultyId === faculty._id
    );

    // Only include faculty who have assignments in the selected term
    if (facultyAssignmentsForFaculty.length === 0) {
      return null;
    }

    // Get unique track and strand combinations
    const uniqueAssignments = facultyAssignmentsForFaculty.reduce((acc, assignment) => {
      const key = `${assignment.trackName}-${assignment.strandName}`;
      if (!acc[key]) {
        acc[key] = {
          trackName: assignment.trackName,
          strandName: assignment.strandName
        };
      }
      return acc;
    }, {});

    const assignments = Object.values(uniqueAssignments);
    const trackNames = [...new Set(assignments.map(a => a.trackName).filter(Boolean))];
    const strandNames = [...new Set(assignments.map(a => a.strandName).filter(Boolean))];
    const sectionNames = [...new Set(facultyAssignmentsForFaculty.map(a => a.sectionName).filter(Boolean))];
    const rawAssignments = facultyAssignmentsForFaculty.map(a => ({
      trackName: a.trackName,
      strandName: a.strandName,
      sectionName: a.sectionName,
      schoolYear: a.schoolYear,
      termName: a.termName
    }));

    return {
      ...faculty,
      assignments,
      primaryTrack: assignments.length > 0 ? assignments[0].trackName : '',
      primaryStrand: assignments.length > 0 ? assignments[0].strandName : '',
      trackNames,
      strandNames,
      sectionNames,
      rawAssignments
    };
  }).filter(Boolean); // Remove null entries

  // Build lookup maps for cascading filters
  const filteredAssignments = facultyAssignments.filter(a => {
    if (selectedSchoolYear && a.schoolYear !== selectedSchoolYear) return false;
    if (selectedTerm && a.termName !== selectedTerm) return false;
    return true;
  });

  const uniqueTracks = [...new Set(filteredAssignments.map(a => a.trackName).filter(Boolean))].sort();
  const strandsByTrack = filteredAssignments.reduce((acc, a) => {
    if (!a.trackName || !a.strandName) return acc;
    if (!acc[a.trackName]) acc[a.trackName] = new Set();
    acc[a.trackName].add(a.strandName);
    return acc;
  }, {});
  const sectionsByTrackStrand = filteredAssignments.reduce((acc, a) => {
    if (!a.trackName || !a.strandName || !a.sectionName) return acc;
    const key = `${a.trackName}|${a.strandName}`;
    if (!acc[key]) acc[key] = new Set();
    acc[key].add(a.sectionName);
    return acc;
  }, {});
  const uniqueStrands = selectedTrack
    ? [...(strandsByTrack[selectedTrack] || new Set())].sort()
    : [];
  const uniqueSections = (selectedTrack && selectedStrand)
    ? [...(sectionsByTrackStrand[`${selectedTrack}|${selectedStrand}`] || new Set())].sort()
    : [];

  // Filter faculty based on search term and dropdowns
  const filteredFaculty = facultyWithAssignments.filter(faculty => {
    const fullName = `${faculty.firstname || ''} ${faculty.lastname || ''}`.toLowerCase();
    const schoolID = (faculty.schoolID || '').toLowerCase();
    const trackList = (faculty.trackNames || []).map(t => (t || '').toLowerCase());
    const strandList = (faculty.strandNames || []).map(s => (s || '').toLowerCase());
    const sectionList = (faculty.sectionNames || []).map(s => (s || '').toLowerCase());
    
    // Text search filter
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                         schoolID.includes(searchTerm.toLowerCase()) ||
                         trackList.some(t => t.includes(searchTerm.toLowerCase())) ||
                         strandList.some(s => s.includes(searchTerm.toLowerCase())) ||
                         sectionList.some(sec => sec.includes(searchTerm.toLowerCase()));
    
    // Track filter: faculty must have at least one assignment in the selected track
    const matchesTrack = !selectedTrack || trackList.includes(selectedTrack.toLowerCase());
    
    // Strand filter: if a track is selected, strand must belong to that track; else any matching strand
    let matchesStrand = true;
    if (selectedStrand) {
      if (selectedTrack) {
        // Confirm there is an assignment with both selected track and strand
        const hasCombo = faculty.assignments?.some(a => a.trackName === selectedTrack && a.strandName === selectedStrand);
        matchesStrand = !!hasCombo;
      } else {
        matchesStrand = strandList.includes(selectedStrand.toLowerCase());
      }
    }

    // Section filter: if track/strand selected, require matching triple; otherwise any section match
    let matchesSection = true;
    if (selectedSection) {
      const inSection = (a) => (a.sectionName || '').toLowerCase() === selectedSection.toLowerCase();
      if (selectedTrack && selectedStrand) {
        matchesSection = faculty.rawAssignments?.some(a => a.trackName === selectedTrack && a.strandName === selectedStrand && inSection(a));
      } else if (selectedTrack && !selectedStrand) {
        matchesSection = faculty.rawAssignments?.some(a => a.trackName === selectedTrack && inSection(a));
      } else if (!selectedTrack && selectedStrand) {
        matchesSection = faculty.rawAssignments?.some(a => a.strandName === selectedStrand && inSection(a));
      } else {
        matchesSection = sectionList.includes(selectedSection.toLowerCase());
      }
    }

    // School Year filter: faculty must have assignments in the selected school year
    let matchesSchoolYear = true;
    if (selectedSchoolYear) {
      matchesSchoolYear = faculty.rawAssignments?.some(a => a.schoolYear === selectedSchoolYear);
    }

    // Term filter: faculty must have assignments in the selected term
    let matchesTerm = true;
    if (selectedTerm) {
      matchesTerm = faculty.rawAssignments?.some(a => a.termName === selectedTerm);
    }
    
    return matchesSearch && matchesTrack && matchesStrand && matchesSection && matchesSchoolYear && matchesTerm;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTrack("");
    setSelectedStrand("");
    setSelectedSection("");
    
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
  };

  // Fetch faculty reports
  const fetchFacultyReports = async (facultyId) => {
    setLoadingReports(true);
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_BASE}/api/studentreports?facultyId=${facultyId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response - extract reports array
        const reports = data.reports || data;
        setFacultyReports(reports);
      } else {
        console.error("Failed to fetch faculty reports:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        setFacultyReports([]);
      }
    } catch (err) {
      console.error("Failed to fetch faculty reports:", err);
      setFacultyReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  // Handle faculty selection
  const handleFacultyView = (faculty) => {
    setSelectedFaculty(faculty);
    setSelectedReport(null);
    setStudentFilter("");
    fetchFacultyReports(faculty._id);
  };

  // Handle report selection
  const handleReportSelect = (report) => {
    setSelectedReport(report);
  };

  // Go back to faculty list
  const handleBackToList = () => {
    setSelectedFaculty(null);
    setSelectedReport(null);
    setFacultyReports([]);
  };

  // Export all reports for the selected faculty into an Excel workbook
  const exportAllReports = () => {
    if (!selectedFaculty) return;
    const reports = Array.isArray(facultyReports) ? facultyReports : [];
    if (reports.length === 0) return;

    const workbook = XLSX.utils.book_new();

    const currentYearLabel = selectedSchoolYear || (academicYear
      ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`
      : "");
    const currentTermLabel = selectedTerm || currentTerm?.termName || "";
    const currentKey = currentTermLabel && currentYearLabel
      ? `${currentTermLabel} (${currentYearLabel})`
      : "Current";

    // Group reports by Term (SchoolYear)
    const groups = new Map();
    for (const r of reports) {
      const key = `${r.termName || "Unknown Term"} (${r.schoolYear || "Unknown Year"})`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }

    // Determine sheet order: current term/year first, then others by descending date
    const keys = Array.from(groups.keys());
    keys.sort((a, b) => a.localeCompare(b));
    const orderedKeys = [
      ...([currentKey].filter(k => groups.has(k))),
      ...keys.filter(k => k !== currentKey),
    ];

    for (const key of orderedKeys) {
      const rows = groups.get(key)
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((r) => ({
          Date: r.date ? new Date(r.date).toLocaleDateString() : "",
          Term: r.termName || "",
          SchoolYear: r.schoolYear || "",
          Student: r.studentName || "",
          Faculty: r.facultyName || `${selectedFaculty.firstname || ""} ${selectedFaculty.lastname || ""}`.trim(),
          Report: r.studentReport || "",
        }));

      const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: ["Date", "Term", "SchoolYear", "Student", "Faculty", "Report"],
        skipHeader: false,
      });
      XLSX.utils.book_append_sheet(workbook, worksheet, key.substring(0, 31));
    }

    const filename = `${(selectedFaculty.firstname || "").trim()}_${(selectedFaculty.lastname || "").trim()}_Reports.xlsx`;
    XLSX.writeFile(workbook, filename || "Faculty_Reports.xlsx");
  };

  // Send faculty reports to VPE
  const sendToVPE = async (faculty) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/studentreports/send-to-vpe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          facultyId: faculty._id,
          facultyName: `${faculty.firstname} ${faculty.lastname}`,
          termName: selectedTerm || currentTerm?.termName,
          schoolYear: selectedSchoolYear || (academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : '')
        })
      });

      if (response.ok) {
        alert(`Reports from ${faculty.firstname} ${faculty.lastname} have been sent to VPE successfully!`);
        // Refresh the faculty data to update status
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Failed to send reports to VPE: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending reports to VPE:', error);
      alert('Failed to send reports to VPE. Please try again.');
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Principal_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Faculty Report</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              {currentTerm ? `${currentTerm.termName}` : "Loading..."} | 
              {new Date().toLocaleDateString("en-US", {
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
          {!selectedFaculty ? (
            <>
              {/* Header Row */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Faculty Details</h3>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                  {/* School Year Filter */}
                  <select
                    value={selectedSchoolYear}
                    onChange={(e) => { 
                      setSelectedSchoolYear(e.target.value); 
                      setSelectedTerm(""); 
                      setSelectedTrack(""); 
                      setSelectedStrand(""); 
                      setSelectedSection(""); 
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">All School Years</option>
                    {schoolYears.map(year => (
                      <option key={year._id} value={`${year.schoolYearStart}-${year.schoolYearEnd}`}>
                        {year.schoolYearStart}-{year.schoolYearEnd}
                      </option>
                    ))}
                  </select>

                  {/* Term Filter (depends on selected School Year) */}
                  <select
                    value={selectedTerm}
                    onChange={(e) => { 
                      setSelectedTerm(e.target.value); 
                      setSelectedTrack(""); 
                      setSelectedStrand(""); 
                      setSelectedSection(""); 
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    disabled={!selectedSchoolYear}
                  >
                    <option value="">All Terms</option>
                    {selectedSchoolYear && terms
                      .filter(term => term.schoolYear === selectedSchoolYear)
                      .map(term => (
                        <option key={term._id} value={term.termName}>
                          {term.termName}
                        </option>
                      ))}
                  </select>

                  {/* Search Bar */}
                  <input
                    type="text"
                    placeholder="Search faculty, track, or strand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {/* Track Filter */}
                  <select
                    value={selectedTrack}
                    onChange={(e) => { setSelectedTrack(e.target.value); setSelectedStrand(""); setSelectedSection(""); }}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">All Tracks</option>
                    {uniqueTracks.map(track => (
                      <option key={track} value={track}>{track}</option>
                    ))}
                  </select>
                  
                  {/* Strand Filter (depends on selected Track) */}
                  <select
                    value={selectedStrand}
                    onChange={(e) => { setSelectedStrand(e.target.value); setSelectedSection(""); }}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    disabled={!selectedTrack}
                  >
                    <option value="">All Strands</option>
                    {uniqueStrands.map(strand => (
                      <option key={strand} value={strand}>{strand}</option>
                    ))}
                  </select>

                  {/* Section Filter (depends on selected Strand) */}
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    disabled={!selectedStrand}
                  >
                    <option value="">All Sections</option>
                    {uniqueSections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
                >
                  Reset to Current Term
                </button>
              </div>

              {/* Faculty Table */}
              <div className="mt-8">
                {!selectedTerm || !selectedSchoolYear ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-lg mb-2">Select a School Year and Term</p>
                    <p className="text-gray-400 text-sm">Choose a school year and term from the filters above to view faculty assignments and their evaluation status.</p>
                  </div>
                ) : loading || loadingTermData ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-gray-600">
                      {loading ? "Loading faculty data..." : "Loading term data..."}
                    </p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-red-600">{error}</p>
                  </div>
                ) : (
                  <>
                    {/* Results Summary */}
                    <div className="mb-4 text-sm text-gray-600">
                      {selectedTerm && selectedSchoolYear ? (
                        <>
                          Showing {filteredFaculty.length} faculty members with assignments in {selectedTerm} ({selectedSchoolYear})
                          {selectedTrack && ` in ${selectedTrack}`}
                          {selectedStrand && ` in ${selectedStrand}`}
                          {selectedSection && ` in ${selectedSection}`}
                        </>
                      ) : (
                        <>
                          Showing {filteredFaculty.length} of {facultyData.length} faculty members
                          {selectedSchoolYear && ` in ${selectedSchoolYear}`}
                          {selectedTerm && ` in ${selectedTerm}`}
                          {selectedTrack && ` in ${selectedTrack}`}
                          {selectedStrand && ` in ${selectedStrand}`}
                          {selectedSection && ` in ${selectedSection}`}
                        </>
                      )}
                    </div>
                    
                    <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-left">
                          <th className="p-3 border">Name</th>
                          <th className="p-3 border">Track</th>
                          <th className="p-3 border">Strand</th>
                          <th className="p-3 border">Section</th>
                          <th className="p-3 border">Status</th>
                          <th className="p-3 border">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFaculty.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-gray-500">
                              {!selectedTerm || !selectedSchoolYear 
                                ? 'Please select a school year and term to view faculty.' 
                                : searchTerm || selectedTrack || selectedStrand || selectedSection
                                ? 'No faculty found matching your filters.' 
                                : 'No faculty have assignments in the selected term.'}
                            </td>
                          </tr>
                        ) : (
                          filteredFaculty.map((faculty, index) => (
                            <tr key={faculty._id || index} className="hover:bg-gray-50">
                              <td className="p-3 border text-gray-900 whitespace-nowrap">
                                {faculty.firstname} {faculty.lastname}
                              </td>
                              <td className="p-3 border text-gray-900 whitespace-normal break-words">
                                {faculty.trackNames && faculty.trackNames.length > 0 ? faculty.trackNames.join(', ') : '-'}
                              </td>
                              <td className="p-3 border text-gray-900 whitespace-normal break-words">
                                {faculty.strandNames && faculty.strandNames.length > 0 ? faculty.strandNames.join(', ') : '-'}
                              </td>
                              <td className="p-3 border text-gray-900 whitespace-normal break-words">
                                {faculty.sectionNames && faculty.sectionNames.length > 0 ? faculty.sectionNames.join(', ') : '-'}
                              </td>
                              <td className="p-3 border text-gray-900 whitespace-nowrap">
                                {(() => {
                                  // Check if faculty has assignments in the selected term
                                  const hasAssignments = faculty.rawAssignments && faculty.rawAssignments.length > 0;
                                  
                                  if (!hasAssignments) {
                                    return <span className="text-gray-500">No Assignments</span>;
                                  }
                                  
                                  // Check if faculty has submitted reports for the selected term
                                  if (termReportsByFaculty[faculty._id]) {
                                    return (
                                      <>
                                        <span className="text-green-600 font-medium">
                                          Submitted - {new Date(termReportsByFaculty[faculty._id].latestDate).toLocaleDateString()}
                                        </span>
                                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                          termReportsByFaculty[faculty._id].hasVisibleReports 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {termReportsByFaculty[faculty._id].hasVisibleReports 
                                            ? 'Visible to VPE' 
                                            : 'Not visible to VPE'}
                                        </span>
                                      </>
                                    );
                                  } else {
                                    return <span className="text-orange-600 font-medium">Pending</span>;
                                  }
                                })()}
                              </td>
                              <td className="p-3 border text-gray-900 whitespace-nowrap">
                                <button 
                                  onClick={() => handleFacultyView(faculty)}
                                  className="text-blue-500 hover:text-blue-700 underline mr-2"
                                >
                                  View
                                </button>
                                <button 
                                  onClick={() => sendToVPE(faculty)}
                                  className="text-green-600 hover:text-green-800 underline"
                                  title="Send faculty reports to VPE"
                                >
                                  Send to VPE
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <div className="flex justify-center items-center gap-4 mt-4">
                      <button
                        className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
                        disabled={true}
                      >
                        Previous
                      </button>
                      <span className="text-sm">Page 1 of 1</span>
                      <button
                        className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
                        disabled={true}
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            /* Faculty Reports View */
            <div>
              {/* Back Button and Header */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleBackToList}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    ← Back to Faculty List
                  </button>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {selectedFaculty.firstname} {selectedFaculty.lastname}'s Reports
                  </h3>
                </div>
                {/* Static Export button */}
                <button
                  type="button"
                  onClick={exportAllReports}
                  disabled={!facultyReports || facultyReports.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Export All Reports
                </button>
              </div>

              {/* Reports Content */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Side - Reports List */}
                <div className="lg:w-1/3">
                  <h4 className="text-lg font-medium text-gray-700 mb-4">Reports List</h4>
                  {/* Search just above the list */}
                  <div className="flex flex-col gap-2 mb-3">
                    <input
                      type="text"
                      value={studentFilter}
                      onChange={(e) => setStudentFilter(e.target.value)}
                      placeholder="Search student name..."
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {loadingReports ? (
                    <div className="text-center py-4">
                      <div className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-2 text-sm text-gray-600">Loading reports...</p>
                    </div>
                  ) : facultyReports.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500 text-sm">No reports found</p>
                      <p className="text-gray-400 text-xs mt-1">This faculty hasn't made any reports yet</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto border rounded-lg">
                      {facultyReports
                        .filter(r => !studentFilter || (r.studentName || '').toLowerCase().includes(studentFilter.toLowerCase()))
                        .map((report, index) => (
                        <div
                          key={report._id || index}
                          onClick={() => handleReportSelect(report)}
                          className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedReport?._id === report._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900">
                            {report.studentName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {report.termName} • {report.schoolYear}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(report.date).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Side - Report Details */}
                <div className="lg:w-2/3">
                  <h4 className="text-lg font-medium text-gray-700 mb-4">Report Details</h4>
                  {!selectedReport ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Select a report from the list to view details</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="text-xs text-gray-500 mb-3">
                        1 - very poor 2 - below average 3 - average 4 - good 5 - excellent
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                          <p className="text-gray-900">{selectedReport.termName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">School Year</label>
                          <p className="text-gray-900">{selectedReport.schoolYear}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subject (Student Name)</label>
                          <p className="text-gray-900">{selectedReport.studentName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                          <p className="text-gray-900">{new Date(selectedReport.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Behavior</label>
                          <p className="text-gray-900">{selectedReport.behavior ?? '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Class Participation</label>
                          <p className="text-gray-900">{selectedReport.classParticipation ?? '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Class Activity</label>
                          <p className="text-gray-900">{selectedReport.classActivity ?? '-'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Report</label>
                        <div className="bg-white p-4 rounded border min-h-32">
                          <p className="text-gray-900 whitespace-pre-wrap">{selectedReport.studentReport}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 