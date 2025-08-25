import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import Principal_Navbar from "./Principal_Navbar";
import ProfileMenu from "../ProfileMenu";

// Switch to localhost for local testing
const API_BASE = "https://juanlms-webapp-server.onrender.com";

export default function Principal_FacultyReport() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [loading, setLoading] = useState(false);
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
  const [allAssignments, setAllAssignments] = useState([]);
  const [allQuizzes, setAllQuizzes] = useState([]);

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

  // Fetch all assignments and quizzes directly from collections
  useEffect(() => {
    async function fetchAllActivities() {
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
        
        // Fetch all classes first; the per-class endpoints return data
        console.log("Fetching classes from:", `${API_BASE}/classes`);
        const classesRes = await fetch(`${API_BASE}/classes`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const classes = classesRes.ok ? await classesRes.json() : [];
        console.log("Total classes:", Array.isArray(classes) ? classes.length : 0);

        // Fetch faculty assignments to enrich metadata (faculty name, track, strand, subject)
        console.log("Fetching faculty assignments from:", `${API_BASE}/api/faculty-assignments`);
        const facAssignRes = await fetch(`${API_BASE}/api/faculty-assignments`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const allFacultyAssignments = facAssignRes.ok ? await facAssignRes.json() : [];
        // Filter by selected term and school year if present
        const facultyAssignments = (allFacultyAssignments || []).filter(a => {
          const matchesYear = selectedSchoolYear ? a.schoolYear === selectedSchoolYear : true;
          const matchesTerm = selectedTerm ? a.termName === selectedTerm : true;
          return matchesYear && matchesTerm && a.status !== 'archived';
        });
        console.log("Faculty assignments loaded:", facultyAssignments.length);
        console.log("Sample faculty assignment:", facultyAssignments[0]);

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
    
    fetchAllActivities();
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

  // Extract unique values for filter dropdowns
  const uniqueTracks = [...new Set(facultyActivities.map(a => a.trackName).filter(Boolean))].sort();
  const uniqueStrands = [...new Set(facultyActivities.map(a => a.strandName).filter(Boolean))].sort();
  const uniqueSections = [...new Set(facultyActivities.map(a => a.sectionName).filter(Boolean))].sort();
  const uniqueCourses = [...new Set(facultyActivities.map(a => a.subject).filter(Boolean))].sort();
  const uniqueFaculty = [...new Set(facultyActivities.map(a => a.facultyName).filter(Boolean))].sort();

  // Calculate summary statistics
  const totalActivities = filteredActivities.length;
  const assignmentsCount = filteredActivities.filter(a => a._kind === 'assignment').length;
  const quizzesCount = filteredActivities.filter(a => a._kind === 'quiz').length;
  const postedCount = filteredActivities.filter(a => a.postAt && new Date(a.postAt) <= new Date()).length;
  const pendingCount = filteredActivities.filter(a => !a.postAt || new Date(a.postAt) > new Date()).length;

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Principal_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Principal Faculty Activity Audit</h2>
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
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Faculty Activity Audit Log</h3>
            
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
              </select>

              {/* Term Filter */}
              <select
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
              </select>

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

        {/* Faculty Audit Log Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Faculty Audit Log</h3>
          </div>

          {/* Faculty Audit Log Content */}
          {(() => {
            // Component-level state for filters and derived data
            // We keep them in closures to avoid polluting top-level with a lot of vars; values are recomputed via simple patterns
            // Definitions
            const sections = ["All Sections", "12 - A", "12 - B"];
            const activities = [
              { id: "all", title: "All Activities", sectionName: "*" },
              { id: "act1", title: "Module 1: Introduction", sectionName: "12 - A" },
              { id: "act2", title: "Quiz 1: Basics", sectionName: "12 - A" },
              { id: "act3", title: "Assignment 1: Reflection", sectionName: "12 - B" },
            ];
            
            // Use React state via a tiny helper component
            function AuditUI() {
              const [selectedSection, setSelectedSection] = useState("All Sections");
              const [selectedActivityId, setSelectedActivityId] = useState("all");
              const [statusFilter, setStatusFilter] = useState("not_viewed"); // default focus
              const [studentSearch, setStudentSearch] = useState("");

              const allRows = [
                { studentId: "s1", studentName: "Dela Cruz, Juan", sectionName: "12 - A", activityId: "act1", status: "not_viewed", lastViewedAt: null, submittedAt: null },
                { studentId: "s2", studentName: "Santos, Maria", sectionName: "12 - A", activityId: "act1", status: "viewed", lastViewedAt: "2025-08-25T10:00:00Z", submittedAt: null },
                { studentId: "s3", studentName: "Reyes, Ana", sectionName: "12 - A", activityId: "act2", status: "missed", lastViewedAt: null, submittedAt: null },
                { studentId: "s4", studentName: "Garcia, Pedro", sectionName: "12 - B", activityId: "act3", status: "not_viewed", lastViewedAt: null, submittedAt: null },
                { studentId: "s5", studentName: "Lopez, Carla", sectionName: "12 - B", activityId: "act3", status: "submitted", lastViewedAt: "2025-08-28T08:20:00Z", submittedAt: "2025-08-28T08:40:00Z" },
              ];
              const activityById = new Map([
                ["act1", { id: "act1", title: "Module 1: Introduction", type: "module", sectionName: "12 - A", dueDate: "2025-08-31" }],
                ["act2", { id: "act2", title: "Quiz 1: Basics", type: "quiz", sectionName: "12 - A", dueDate: "2025-09-02" }],
                ["act3", { id: "act3", title: "Assignment 1: Reflection", type: "assignment", sectionName: "12 - B", dueDate: "2025-08-29" }],
              ]);

              const filteredActivities = activities.filter(a => selectedSection === "All Sections" || a.sectionName === "*" || a.sectionName === selectedSection);

              const filteredRows = allRows.filter(r => {
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
                const ws = XLSX.utils.json_to_sheet(exportRows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Audit");
                XLSX.writeFile(wb, "FacultyAuditLog.xlsx");
              };

              return (
                <>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                    <h3 className="text-lg font-semibold">Activity Visibility & Submission Audit</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={exportToExcel} type="button" className="px-4 py-2 rounded bg-[#010a51] text-white hover:bg-[#1a237e]">Export</button>
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
                          <th className="p-3 border-b font-semibold text-gray-700">Due Date</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Status</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Last Viewed</th>
                          <th className="p-3 border-b font-semibold text-gray-700">Submitted At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td className="p-4 text-center text-gray-500" colSpan={7}>No results for current filters.</td>
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
                                    r.status === 'not_viewed' ? 'bg-red-100 text-red-700 border border-red-200' :
                                    r.status === 'missed' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                    'bg-green-100 text-green-700 border border-green-200'
                                  }`}>
                                    {r.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="p-3 border-b">{r.lastViewedAt ? new Date(r.lastViewedAt).toLocaleString() : '-'}</td>
                                <td className="p-3 border-b">{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Note */}
                  <p className="mt-4 text-xs text-gray-500">Frontend-only prototype. This view will connect to real activities and student engagement data once backend endpoints are available.</p>
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