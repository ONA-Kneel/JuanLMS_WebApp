import { useState, useEffect } from "react";
import Principal_Navbar from "./Principal_Navbar";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  const [schoolYears, setSchoolYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [loadingTermData, setLoadingTermData] = useState(false);
  const [facultyActivities, setFacultyActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

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

  // Fetch activities for faculty assignments
  useEffect(() => {
    async function fetchFacultyActivities() {
      if (!selectedTerm || !selectedSchoolYear || !facultyAssignments.length) return;
      
      setLoadingActivities(true);
      try {
        const token = localStorage.getItem("token");
        const allActivities = [];
        
        // Fetch assignments and quizzes for each faculty assignment
        for (const assignment of facultyAssignments) {
          try {
            // Get classes for this faculty assignment
            const classesRes = await fetch(`${API_BASE}/classes`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (classesRes.ok) {
              const classes = await classesRes.json();
              const relevantClasses = classes.filter(cls => 
                cls.facultyID === assignment.facultyId &&
                cls.trackName === assignment.trackName &&
                cls.strandName === assignment.strandName &&
                cls.section === assignment.sectionName &&
                !cls.isArchived
              );
              
              // Fetch activities for each relevant class
              for (const cls of relevantClasses) {
                const [assignmentsRes, quizzesRes] = await Promise.all([
                  fetch(`${API_BASE}/assignments?classID=${cls.classID}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                  }),
                  fetch(`${API_BASE}/api/quizzes?classID=${cls.classID}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                  })
                ]);
                
                const assignments = assignmentsRes.ok ? await assignmentsRes.json() : [];
                const quizzes = quizzesRes.ok ? await quizzesRes.json() : [];
                
                // Add activities with faculty assignment context
                assignments.forEach(ass => {
                  allActivities.push({
                    ...ass,
                    _kind: 'assignment',
                    facultyId: assignment.facultyId,
                    facultyName: assignment.facultyName || 'Unknown',
                    trackName: assignment.trackName,
                    strandName: assignment.strandName,
                    sectionName: assignment.sectionName,
                    className: cls.className || cls.classCode || 'Unknown Class'
                  });
                });
                
                quizzes.forEach(quiz => {
                  allActivities.push({
                    ...quiz,
                    _kind: 'quiz',
                    facultyId: assignment.facultyId,
                    facultyName: assignment.facultyName || 'Unknown',
                    trackName: assignment.trackName,
                    strandName: assignment.strandName,
                    sectionName: assignment.sectionName,
                    className: cls.className || cls.classCode || 'Unknown Class'
                  });
                });
              }
            }
          } catch (err) {
            console.error(`Failed to fetch activities for faculty assignment:`, err);
          }
        }
        
        setFacultyActivities(allActivities);
      } catch (err) {
        console.error("Failed to fetch faculty activities:", err);
      } finally {
        setLoadingActivities(false);
      }
    }
    
    fetchFacultyActivities();
  }, [facultyAssignments, selectedTerm, selectedSchoolYear]);

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

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Principal_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Faculty Activities Audit</h2>
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
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Faculty Activities Audit</h3>
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

           {/* Faculty Activities Table */}
          <div className="mt-8">
            {!selectedTerm || !selectedSchoolYear ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-lg mb-2">Select a School Year and Term</p>
                <p className="text-gray-400 text-sm">Choose a school year and term from the filters above to view faculty activities and assignments.</p>
              </div>
            ) : loadingActivities ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-gray-600">Loading faculty activities...</p>
              </div>
            ) : facultyActivities.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No activities found for the selected term and school year.</p>
              </div>
            ) : (
              <>
                {/* Results Summary */}
                <div className="mb-4 text-sm text-gray-600">
                  Showing {facultyActivities.length} activities created by faculty in {selectedTerm} ({selectedSchoolYear})
                  {selectedTrack && ` in ${selectedTrack}`}
                  {selectedStrand && ` in ${selectedStrand}`}
                  {selectedSection && ` in ${selectedSection}`}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Faculty</th>
                        <th className="p-3 border">Track</th>
                        <th className="p-3 border">Strand</th>
                        <th className="p-3 border">Class</th>
                        <th className="p-3 border">Activity Name</th>
                        <th className="p-3 border">Type</th>
                        <th className="p-3 border">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultyActivities.map((activity, index) => (
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
                            {activity.className}
                          </td>
                          <td className="p-3 border text-gray-900 whitespace-normal break-words">
                            {activity.title}
                          </td>
                          <td className="p-3 border text-gray-900 whitespace-nowrap">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              activity._kind === 'assignment' 
                                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                : 'bg-purple-100 text-purple-700 border border-purple-200'
                            }`}>
                              {activity._kind === 'assignment' ? 'Assignment' : 'Quiz'}
                            </span>
                          </td>
                          <td className="p-3 border text-gray-900 whitespace-nowrap">
                            {activity.dueDate ? new Date(activity.dueDate).toLocaleDateString("en-US") : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}