import { useState, useEffect, useRef } from "react";
import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  
  const searchTimeoutRef = useRef(null);

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
        studentId: selectedStudent._id
      };
      
      console.log("Sending request to:", `${API_BASE}/api/studentreports`);
      console.log("Request data:", reportData);
      
      // Temporary solution: Store in localStorage until backend is deployed
      console.log("Storing report data locally (temporary solution)");
      
      // Create a unique ID for the report
      const reportId = Date.now().toString();
      
      // Store the report in localStorage
      const storedReports = JSON.parse(localStorage.getItem('studentReports') || '[]');
      const newReport = {
        id: reportId,
        ...reportData,
        createdAt: new Date().toISOString()
      };
      
      storedReports.push(newReport);
      localStorage.setItem('studentReports', JSON.stringify(storedReports));
      
      console.log("Report stored successfully:", newReport);
      
      // Simulate API response
      const response = {
        ok: true,
        json: async () => ({ message: "Report submitted successfully", report: newReport })
      };
      
      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);
      
      if (response.ok) {
        const result = await response.json();
        alert("Report submitted successfully!");
        setReportContent("");
        setSelectedStudent(null);
        setSearchTerm("");
        
        // Refresh stored reports list
        const reports = JSON.parse(localStorage.getItem('studentReports') || '[]');
        setStoredReports(reports);
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

  // Load stored reports on component mount
  useEffect(() => {
    const reports = JSON.parse(localStorage.getItem('studentReports') || '[]');
    setStoredReports(reports);
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
                                     <button
              onClick={() => setShowStoredReports(!showStoredReports)}
              className="px-4 py-2 bg-[#010a51] text-white rounded hover:bg-[#1a237e] transition-colors"
            >
              {showStoredReports ? 'Hide Reports' : `View Reports (${storedReports.length})`}
            </button>
            <ProfileMenu />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-lg shadow-md p-6">
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

            {/* Report Content Section */}
            <div>
              <label htmlFor="reportContent" className="block text-sm font-medium text-gray-700 mb-2">
                Report Content
              </label>
                             <textarea
                 id="reportContent"
                 value={reportContent}
                 onChange={(e) => setReportContent(e.target.value)}
                 placeholder="Write your report here..."
                 rows={10}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#010a51] focus:border-transparent resize-vertical"
                 required
               />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
                           <button
               type="submit"
               disabled={isSubmitting || !selectedStudent}
               className={`px-6 py-2 rounded-md text-white font-medium ${
                 isSubmitting || !selectedStudent
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
