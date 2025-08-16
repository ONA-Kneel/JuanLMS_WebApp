import { useState, useEffect } from "react";
import VPE_Navbar from "./VPE_Navbar";
import ProfileModal from "../ProfileModal";
import { useNavigate } from "react-router-dom";
import ProfileMenu from "../ProfileMenu";

const API_BASE = "https://juanlms-webapp-server.onrender.com";

export default function VPE_FacultyReport() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [facultyReports, setFacultyReports] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("");
  const [selectedStrand, setSelectedStrand] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [schoolYears, setSchoolYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [facultyAssignments, setFacultyAssignments] = useState([]);

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
              const activeTerm = activeTerms.find(term => {
                // Add fallback logic in case the data structure is different
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
        // Add fallback logic in case the data structure is different
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

  // Fetch faculty reports sent to VPE
  useEffect(() => {
    async function fetchFacultyReports() {
      if (!selectedTerm || !selectedSchoolYear) return;
      
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API_BASE}/api/studentreports?termName=${encodeURIComponent(selectedTerm)}&schoolYear=${encodeURIComponent(selectedSchoolYear)}&show=yes&limit=10000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const reports = data.reports || data || [];
          
          // Group reports by faculty
          const facultyReportMap = {};
          reports.forEach(report => {
            const facultyId = report.facultyId?._id || report.facultyId;
            if (!facultyId) return;
            
            if (!facultyReportMap[facultyId]) {
              facultyReportMap[facultyId] = {
                facultyId,
                facultyName: report.facultyName || 'Unknown Faculty',
                reports: [],
                totalReports: 0,
                latestDate: null
              };
            }
            
            facultyReportMap[facultyId].reports.push(report);
            facultyReportMap[facultyId].totalReports += 1;
            
            const reportDate = new Date(report.date);
            if (!facultyReportMap[facultyId].latestDate || reportDate > new Date(facultyReportMap[facultyId].latestDate)) {
              facultyReportMap[facultyId].latestDate = report.date;
            }
          });
          
          setFacultyReports(Object.values(facultyReportMap));
        } else {
          setFacultyReports([]);
        }
      } catch (err) {
        console.error("Failed to fetch faculty reports:", err);
        setFacultyReports([]);
      } finally {
        setLoading(false);
      }
    }
    fetchFacultyReports();
  }, [selectedTerm, selectedSchoolYear]);

  // Fetch faculty assignments for filtering
  useEffect(() => {
    async function fetchFacultyAssignments() {
      if (!selectedTerm || !selectedSchoolYear) return;
      
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
      }
    }
    fetchFacultyAssignments();
  }, [selectedTerm, selectedSchoolYear]);

  // Handle faculty selection
  const handleFacultyView = (faculty) => {
    setSelectedFaculty(faculty);
    setSelectedReport(null);
  };

  // Handle report selection
  const handleReportSelect = (report) => {
    setSelectedReport(report);
  };

  // Go back to faculty list
  const handleBackToList = () => {
    setSelectedFaculty(null);
    setSelectedReport(null);
  };

  // Filter faculty reports based on search and filters
  const filteredFacultyReports = facultyReports.filter(faculty => {
    const facultyName = faculty.facultyName.toLowerCase();
    const matchesSearch = !searchTerm || facultyName.includes(searchTerm.toLowerCase());
    
    // Track filter: faculty must have assignments in the selected track
    let matchesTrack = true;
    if (selectedTrack) {
      const facultyAssignmentsForFaculty = facultyAssignments.filter(assignment => 
        assignment.facultyId === faculty.facultyId
      );
      matchesTrack = facultyAssignmentsForFaculty.some(assignment => 
        assignment.trackName === selectedTrack
      );
    }
    
    // Strand filter: if a track is selected, strand must belong to that track
    let matchesStrand = true;
    if (selectedStrand) {
      const facultyAssignmentsForFaculty = facultyAssignments.filter(assignment => 
        assignment.facultyId === faculty.facultyId
      );
      if (selectedTrack) {
        // Confirm there is an assignment with both selected track and strand
        matchesStrand = facultyAssignmentsForFaculty.some(assignment => 
          assignment.trackName === selectedTrack && assignment.strandName === selectedStrand
        );
      } else {
        matchesStrand = facultyAssignmentsForFaculty.some(assignment => 
          assignment.strandName === selectedStrand
        );
      }
    }

    // Section filter: if track/strand selected, require matching triple
    let matchesSection = true;
    if (selectedSection) {
      const facultyAssignmentsForFaculty = facultyAssignments.filter(assignment => 
        assignment.facultyId === faculty.facultyId
      );
      if (selectedTrack && selectedStrand) {
        matchesSection = facultyAssignmentsForFaculty.some(assignment => 
          assignment.trackName === selectedTrack && 
          assignment.strandName === selectedStrand && 
          assignment.sectionName === selectedSection
        );
      } else if (selectedTrack && !selectedStrand) {
        matchesSection = facultyAssignmentsForFaculty.some(assignment => 
          assignment.trackName === selectedTrack && 
          assignment.sectionName === selectedSection
        );
      } else if (!selectedTrack && selectedStrand) {
        matchesSection = facultyAssignmentsForFaculty.some(assignment => 
          assignment.strandName === selectedStrand && 
          assignment.sectionName === selectedSection
        );
      } else {
        matchesSection = facultyAssignmentsForFaculty.some(assignment => 
          assignment.sectionName === selectedSection
        );
      }
    }
    
    return matchesSearch && matchesTrack && matchesStrand && matchesSection;
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <VPE_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">VPE Faculty Report</h2>
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
            <ProfileMenu />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {!selectedFaculty ? (
            <>
              {/* Header Row */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Faculty Reports Sent to VPE</h3>
                
                
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
                      .filter(term => {
                        // Add fallback logic in case the data structure is different
                        const termSchoolYear = term.schoolYear || term.schoolYearName || term.year;
                        const matches = termSchoolYear === selectedSchoolYear;
                        return matches;
                      })
                      .map(term => (
                        <option key={term._id} value={term.termName}>
                          {term.termName}
                        </option>
                      ))}
                  </select>

                  {/* Search Bar */}
                  <input
                    type="text"
                    placeholder="Search faculty..."
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
                  
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Reset to Current Term
                  </button>
                </div>
              </div>

              {/* Faculty Table */}
              <div className="mt-8">
                {!selectedTerm || !selectedSchoolYear ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-lg mb-2">Select a School Year and Term</p>
                    <p className="text-gray-400 text-sm">Choose a school year and term from the filters above to view faculty reports sent to VPE.</p>
                  </div>
                ) : loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-gray-600">Loading faculty reports...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-red-600">{error}</p>
                  </div>
                ) : (
                  <>
                    {/* Results Summary */}
                    <div className="mb-4 text-sm text-gray-600">
                      Showing {filteredFacultyReports.length} faculty members with reports in {selectedTerm} ({selectedSchoolYear})
                      {selectedTrack && ` in ${selectedTrack}`}
                      {selectedStrand && ` in ${selectedStrand}`}
                      {selectedSection && ` in ${selectedSection}`}
                    </div>
                    
                    <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-left">
                          <th className="p-3 border">Faculty Name</th>
                          <th className="p-3 border">Track</th>
                          <th className="p-3 border">Strand</th>
                          <th className="p-3 border">Total Reports</th>
                          <th className="p-3 border">Latest Report Date</th>
                          <th className="p-3 border">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFacultyReports.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-gray-500">
                              {searchTerm || selectedTrack || selectedStrand || selectedSection
                                ? 'No faculty found matching your filters.' 
                                : 'No faculty reports found for the selected term and school year.'}
                            </td>
                          </tr>
                        ) : (
                          filteredFacultyReports.map((faculty, index) => {
                            // Get faculty assignments for display
                            const facultyAssignmentsForFaculty = facultyAssignments.filter(assignment => 
                              assignment.facultyId === faculty.facultyId
                            );
                            
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
                            
                            const trackNames = [...new Set(Object.values(uniqueAssignments).map(a => a.trackName).filter(Boolean))];
                            const strandNames = [...new Set(Object.values(uniqueAssignments).map(a => a.strandName).filter(Boolean))];
                            
                            return (
                              <tr key={faculty.facultyId || index} className="hover:bg-gray-50">
                                <td className="p-3 border text-gray-900 whitespace-nowrap">
                                  {faculty.facultyName}
                                </td>
                                <td className="p-3 border text-gray-900 whitespace-normal break-words">
                                  {trackNames.length > 0 ? trackNames.join(', ') : '-'}
                                </td>
                                <td className="p-3 border text-gray-900 whitespace-normal break-words">
                                  {strandNames.length > 0 ? strandNames.join(', ') : '-'}
                                </td>
                                <td className="p-3 border text-gray-900 whitespace-nowrap">
                                  {faculty.totalReports}
                                </td>
                                <td className="p-3 border text-gray-900 whitespace-nowrap">
                                  {faculty.latestDate ? new Date(faculty.latestDate).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="p-3 border text-gray-900 whitespace-nowrap">
                                  <button 
                                    onClick={() => handleFacultyView(faculty)}
                                    className="text-blue-500 hover:text-blue-700 underline"
                                  >
                                    View Reports
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
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
                    {selectedFaculty.facultyName}'s Reports
                  </h3>
                </div>
              </div>

              {/* Reports Content */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Side - Reports List */}
                <div className="lg:w-1/3">
                  <h4 className="text-lg font-medium text-gray-700 mb-4">Reports List</h4>
                  {selectedFaculty.reports.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500 text-sm">No reports found</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto border rounded-lg">
                      {selectedFaculty.reports.map((report, index) => (
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
