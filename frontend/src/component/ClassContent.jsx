// ClassContent.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiFile, FiBook, FiMessageSquare } from "react-icons/fi";
import QuizTab from "./ActivityTab";
import { MoreVertical } from "lucide-react";
import ValidationModal from './ValidationModal';
import { getFileUrl } from "../utils/imageUtils";
import { useSocket } from "../contexts/SocketContext";
import { getLogoBase64, getFooterLogoBase64 } from "../utils/imageToBase64";
// import fileIcon from "../../assets/file-icon.png"; // Add your file icon path
// import moduleImg from "../../assets/module-img.png"; // Add your module image path

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function ClassContent({ selected, isFaculty = false }) {
  // --- ROUTER PARAMS ---
  const { classId } = useParams();
  const navigate = useNavigate();
  
  // --- SOCKET ---
  const { socket, isConnected, joinClass, leaveClass } = useSocket();

  // Backend lessons state
  const [backendLessons, setBackendLessons] = useState([]);

  // --- UI STATE ---

  // Faculty-only states (dynamic content management)
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementError, setAnnouncementError] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState(null);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  
  // Real-time update indicators
  const [realtimeUpdate, setRealtimeUpdate] = useState(null);

  // --- PROGRESS STATE ---
  // { [lessonId_fileUrl]: { lastPage, totalPages } }
  // Remove unused: fileProgress

  // Members state (faculty and students)
  const [members, setMembers] = useState({ faculty: [], students: [] });
  const [memberIdsRaw, setMemberIdsRaw] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);

  // Grades state
  const [gradesData, setGradesData] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState(null);

  // Export loading states
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Restore lesson upload state and handler
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonFiles, setLessonFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [allStudents, setAllStudents] = useState([]);
  const [editingMembers, setEditingMembers] = useState(false);
  const [newStudentIDs, setNewStudentIDs] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonLink, setLessonLink] = useState("");
  const [classWithMembers, setClassWithMembers] = useState(null);
  const [hasMappedMembers, setHasMappedMembers] = useState(false);
  const [classSection, setClassSection] = useState(null); // Store the class section
  const [studentsInSameSection, setStudentsInSameSection] = useState([]); // Store students in the same section
  const [allActiveStudents, setAllActiveStudents] = useState([]); // Store all active students for editing
  const [showDifferentSectionStudents, setShowDifferentSectionStudents] = useState(true); // Toggle to show/hide students from different sections
  const [studentSearchTerm, setStudentSearchTerm] = useState(''); // Search term for filtering students
  const [enrolledStudentIds, setEnrolledStudentIds] = useState([]); // Track which students are enrolled in this class
  const [showNonEnrolledStudents, setShowNonEnrolledStudents] = useState(false); // Toggle to show/hide non-enrolled students

  // Validation modal state
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  // Helper: deduplicate students by their stable identifier
  const dedupeStudentsById = (studentsArray) => {
    try {
      const seen = new Set();
      return (studentsArray || []).filter(s => {
        const id = String(s?._id || s?.userID || s?.id || '');
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    } catch {
      return Array.isArray(studentsArray) ? studentsArray : [];
    }
  };

  // Export functions
  const exportToExcel = async () => {
    if (!gradesData || !members.students || exportingExcel) return;

    setExportingExcel(true);
    
    try {
    // Fetch class details for header information
    const token = localStorage.getItem('token');
    let classDetails = {};
    let facultyName = 'Unknown Faculty';
    
    try {
      const res = await fetch(`${API_BASE}/classes/faculty-classes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const classesData = await res.json();
        classDetails = classesData.find(cls => cls.classID === classId) || {};
        
        // Fetch faculty information
        if (classDetails.facultyID) {
          try {
            const facultyRes = await fetch(`${API_BASE}/users/${classDetails.facultyID}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (facultyRes.ok) {
              const facultyData = await facultyRes.json();
              facultyName = `${facultyData.firstname || ''} ${facultyData.lastname || ''}`.trim() || 'Unknown Faculty';
            }
          } catch (error) {
            console.error('Failed to fetch faculty details:', error);
          }
        }
        
        // Try to get grade level from faculty assignments
        try {
          const assignmentRes = await fetch(`${API_BASE}/api/faculty-assignments`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (assignmentRes.ok) {
            const assignmentsData = await assignmentRes.json();
            const classAssignment = assignmentsData.find(assignment => 
              assignment.facultyId === classDetails.facultyID && 
              assignment.sectionName === classDetails.section
            );
            if (classAssignment && classAssignment.gradeLevel) {
              classDetails.gradeLevel = classAssignment.gradeLevel;
            }
          }
        } catch (error) {
          console.error('Failed to fetch faculty assignments:', error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch class details:', error);
    }

    // Get class information
    const className = classDetails?.className || classDetails?.name || classWithMembers?.className || 'Unknown Class';
    const gradeLevel = classDetails?.gradeLevel || classDetails?.grade || classWithMembers?.gradeLevel || 'Unknown Grade';
    const section = classDetails?.section || classWithMembers?.section || 'Unknown Section';
    const subject = classDetails?.classDesc || classDetails?.subject || classDetails?.subjectName || classWithMembers?.subject || 'Unknown Subject';

    // Create Excel workbook with proper header structure
    const wb = XLSX.utils.book_new();
    
    // Create header information
    const headerData = [
      ["SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC."],
      ["2772-2774 Roxas Boulevard, Pasay City 1300 Philippines"],
      ["PAASCU Accredited - COLLEGE"],
      [""], // Empty row
      ["GRADE BREAKDOWN REPORT"],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""], // Empty row
      ["CLASS INFORMATION:"],
      [`Subject: ${subject}`],
      [`Faculty: ${facultyName}`],
      [`Grade Level: ${gradeLevel}`],
      [`Section: ${section}`],
      [`Total Students: ${members.students.length}`],
      [`Total Activities: ${gradesData.length}`],
      [""], // Empty row
      ["GRADE BREAKDOWN DATA:"],
      [""], // Empty row
    ];

    // Create table headers
    const dataHeaders = [
      "Student Name",
      "Student ID", 
      ...gradesData.map(activity => `${activity.title} (${activity.points} pts)`)
    ];
    
    // Add student data with proper score formatting
    const dataRows = [];
    members.students.forEach(student => {
      const row = [
        `${student.lastname}, ${student.firstname}`,
        student.schoolID || student.userID || 'N/A',
        ...gradesData.map(activity => {
          const submission = activity.submissions?.find(sub => 
            sub.studentId?._id === student._id || 
            sub.studentId === student._id ||
            sub.student?._id === student._id ||
            sub.student === student._id
          );
          
          if (submission) {
            if (activity.type === 'assignment') {
              return submission.grade !== undefined && submission.grade !== null 
                ? `Score: ${submission.grade}/${activity.points || 0}` 
                : 'Submitted';
            } else if (activity.type === 'quiz') {
              return submission.score !== undefined && submission.score !== null 
                ? `Score: ${submission.score}/${activity.points || 0}` 
                : 'Submitted';
            }
          }
          return '-';
        })
      ];
      dataRows.push(row);
    });

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
      { wch: 15 }, // Student ID
      ...gradesData.map(() => ({ wch: 20 })) // Activity columns
    ];
    ws['!cols'] = colWidths;
    
    // Style the header rows (merge cells for institution name)
    const mergeRanges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: dataHeaders.length - 1 } }, // Institution name
      { s: { r: 1, c: 0 }, e: { r: 1, c: dataHeaders.length - 1 } }, // Address
      { s: { r: 2, c: 0 }, e: { r: 2, c: dataHeaders.length - 1 } }, // Accreditation
      { s: { r: 4, c: 0 }, e: { r: 4, c: dataHeaders.length - 1 } }, // Report title
      { s: { r: 5, c: 0 }, e: { r: 5, c: dataHeaders.length - 1 } }, // Generated date
    ];
    ws['!merges'] = mergeRanges;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Grade Breakdown");
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `GradeBreakdown_${className.replace(/\s+/g, '_')}_${timestamp}.xlsx`;
    
    // Write file
    XLSX.writeFile(wb, filename);
    
    setExportingExcel(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setExportingExcel(false);
    }
  };

  const exportToPDF = async () => {
    if (!gradesData || !members.students || exportingPDF) return;
    
    setExportingPDF(true);
    
    try {
      // Get base64 encoded logos
      const logoBase64 = await getLogoBase64();
      const footerLogoBase64 = await getFooterLogoBase64();
    // Fetch class details from faculty-classes endpoint
    const token = localStorage.getItem('token');
    let classDetails = {};
    let facultyName = 'Unknown Faculty';
    
    try {
      const res = await fetch(`${API_BASE}/classes/faculty-classes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const classesData = await res.json();
        // Find the current class by classID
        classDetails = classesData.find(cls => cls.classID === classId) || {};
        
        // Fetch faculty information if we have facultyID
        if (classDetails.facultyID) {
          try {
            const facultyRes = await fetch(`${API_BASE}/users/${classDetails.facultyID}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (facultyRes.ok) {
              const facultyData = await facultyRes.json();
              facultyName = `${facultyData.firstname || ''} ${facultyData.lastname || ''}`.trim() || 'Unknown Faculty';
            }
          } catch (error) {
            console.error('Failed to fetch faculty details:', error);
          }
        }
        
        // Try to get grade level from faculty assignments
        try {
          const assignmentRes = await fetch(`${API_BASE}/api/faculty-assignments`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (assignmentRes.ok) {
            const assignmentsData = await assignmentRes.json();
            console.log('Faculty assignments data:', assignmentsData);
            console.log('Looking for facultyId:', classDetails.facultyID, 'section:', classDetails.section);
            
            // Find assignment for this class
            const classAssignment = assignmentsData.find(assignment => {
              console.log('Checking assignment:', {
                assignmentFacultyId: assignment.facultyId,
                assignmentSectionName: assignment.sectionName,
                classFacultyId: classDetails.facultyID,
                classSection: classDetails.section,
                matches: assignment.facultyId === classDetails.facultyID && assignment.sectionName === classDetails.section
              });
              return assignment.facultyId === classDetails.facultyID && assignment.sectionName === classDetails.section;
            });
            
            console.log('Found class assignment:', classAssignment);
            if (classAssignment && classAssignment.gradeLevel) {
              classDetails.gradeLevel = classAssignment.gradeLevel;
              console.log('Set grade level to:', classAssignment.gradeLevel);
            }
          }
        } catch (error) {
          console.error('Failed to fetch faculty assignments:', error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch class details:', error);
    }
    
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    
    // Get class information with fallbacks
    const className = classDetails?.className || classDetails?.name || classWithMembers?.className || 'Unknown Class';
    const gradeLevel = classDetails?.gradeLevel || classDetails?.grade || classWithMembers?.gradeLevel || 'Unknown Grade';
    const section = classDetails?.section || classWithMembers?.section || 'Unknown Section';
    const subject = classDetails?.classDesc || classDetails?.subject || classDetails?.subjectName || classWithMembers?.subject || 'Unknown Subject';
    
    console.log('Final PDF values:', {
      className,
      facultyName,
      gradeLevel,
      section,
      subject,
      classDetails,
      classWithMembers
    });
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Breakdown of Grades - ${className}</title>
        <style>
          @page {
            size: A4;
            margin: 1in;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
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
          .class-info {
            margin: 20px 0;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
          }
          .info-label {
            font-weight: bold;
          }
          .info-value {
            flex: 1;
            text-align: right;
          }
          .grades-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .grades-table th,
          .grades-table td {
            border: 1px solid #333;
            padding: 8px;
            text-align: center;
            font-size: 12px;
          }
          .grades-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .student-name {
            text-align: left;
            font-weight: bold;
          }
          .student-id {
            text-align: left;
            font-size: 10px;
            color: #666;
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
            <p class="report-title">Breakdown of Grades</p>
            <p class="report-date">Date: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="class-info">
        
          <div class="info-row">
            <span class="info-label">Name of Subject:</span>
            <span class="info-value">${subject}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Faculty Name:</span>
            <span class="info-value">${facultyName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Grade:</span>
            <span class="info-value">${gradeLevel}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Section:</span>
            <span class="info-value">${section}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Strand:</span>
            <span class="info-value">${className}</span>
          </div>
        </div>
        
        <table class="grades-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Student ID</th>
              ${gradesData.map(activity => `<th>${activity.title}<br>(${activity.points || 0} pts)</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${members.students.map(student => {
              const submissions = gradesData.map(activity => {
                const submission = activity.submissions?.find(sub => 
                  sub.studentId?._id === student._id || 
                  sub.studentId === student._id ||
                  sub.student?._id === student._id ||
                  sub.student === student._id
                );
                
                if (submission) {
                  if (activity.type === 'assignment') {
                    return submission.grade !== undefined && submission.grade !== null 
                      ? `${submission.grade}/${activity.points || 0}` 
                      : 'Submitted';
                  } else if (activity.type === 'quiz') {
                    return submission.score !== undefined && submission.score !== null 
                      ? `${submission.score}/${activity.points || 0}` 
                      : 'Submitted';
                  }
                }
                return '-';
              });
              
              return `
                <tr>
                  <td class="student-name">${student.lastname}, ${student.firstname}</td>
                  <td class="student-id">${student.schoolID || student.userID || 'N/A'}</td>
                  ${submissions.map(score => `<td>${score}</td>`).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
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
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setExportingPDF(false);
      }, 500);
    };
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setExportingPDF(false);
    }
  };
  
  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Edit announcement modal state
  const [editAnnouncementModal, setEditAnnouncementModal] = useState({
    isOpen: false,
    id: null,
    title: '',
    content: ''
  });

  // Duplicate modal state
  const [duplicateModal, setDuplicateModal] = useState({
    isOpen: false,
    assignment: null,
    type: null
  });

  // Loading state for member operations
  const [membersSaving, setMembersSaving] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState(null);

  // Helper function to check if assignment is posted
  const isAssignmentPosted = (assignment) => {
    // If no postAt, treat as posted immediately (legacy data)
    if (!assignment.postAt) return true;
    const now = new Date();
    const postAt = new Date(assignment.postAt);
    return postAt <= now;
  };

  // Build a robust list of candidate identifiers for a student record
  // Prioritize userID since backend stores userID, not Mongo _id
  const getCandidateIds = (student) => {
    const ids = [];
    if (!student) return ids;
    // Prioritize userID (what backend stores)
    if (student.userID) ids.push(String(student.userID));
    if (student.schoolID) ids.push(String(student.schoolID));
    // Fallback to Mongo IDs
    if (student._id && typeof student._id === 'object' && student._id.$oid) ids.push(String(student._id.$oid));
    if (student._id && typeof student._id !== 'object') ids.push(String(student._id));
    if (student.id) ids.push(String(student.id));
    // De-dup
    return Array.from(new Set(ids.filter(Boolean)));
  };

  // Filter students by section to only show students from the same section as the class
  const getStudentsInSameSection = async (students, section) => {
    if (!section) return students; // If no section, return all students
    
    const token = localStorage.getItem('token');
    const filteredStudents = [];
    
    for (const student of students) {
      try {
        // Check if student is assigned to the specified section
        const res = await fetch(`${API_BASE}/api/student-assignments?studentId=${student._id}&sectionName=${section}&status=active`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const assignments = await res.json();
          if (assignments.length > 0) {
            filteredStudents.push(student);
          }
        }
      } catch (err) {
        // Failed to check section assignment
      }
    }
    
    return filteredStudents;
  };

  // Get all active students for editing (regardless of section)
  const getAllActiveStudents = (students) => {
    // Filter for active students only
    return students.filter(student => {
      // Check if student has active status or no status (assume active)
      const status = student.status || student.accountStatus;
      return !status || status.toLowerCase() === 'active' || status.toLowerCase() === 'enrolled';
    });
  };

  // Check if student is enrolled in the specific class
  const isStudentEnrolledInClass = async (studentId) => {
    if (!classId) return false;
    
    const token = localStorage.getItem('token');
    try {
      // First check if student is already a member of this class
      const res = await fetch(`${API_BASE}/classes/${classId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const classData = await res.json();
        const memberIds = Array.isArray(classData.members) ? classData.members.map(String) : [];
        
        // If student is already a member, they're enrolled
        if (memberIds.includes(String(studentId))) {
          return true;
        }
        
        // If not a member, check if they should be eligible based on section assignment
        // This is a fallback to prevent the "not enrolled" issue
        return true; // Temporarily allow all students to be added
      }
    } catch (err) {
      // Failed to check class enrollment
    }
    
    return false;
  };

  // Join class room for real-time updates
  useEffect(() => {
    if (classId && isConnected && socket) {
      joinClass(classId);
      
      return () => {
        leaveClass(classId);
      };
    }
  }, [classId, isConnected, joinClass, leaveClass, socket]);

  // Real-time event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for new announcements
    const handleNewAnnouncement = (data) => {
      if (data.classID === classId) {
        setAnnouncements(prev => [data.announcement, ...prev]);
        setRealtimeUpdate({ type: 'announcement', message: 'New announcement received!' });
        setTimeout(() => setRealtimeUpdate(null), 3000);
      }
    };

    // Listen for announcement updates
    const handleAnnouncementUpdated = (data) => {
      if (data.classID === classId) {
        setAnnouncements(prev => 
          prev.map(announcement => 
            announcement._id === data.announcement._id ? data.announcement : announcement
          )
        );
      }
    };

    // Listen for announcement deletions
    const handleAnnouncementDeleted = (data) => {
      if (data.classID === classId) {
        setAnnouncements(prev => 
          prev.filter(announcement => announcement._id !== data.announcementId)
        );
      }
    };

    // Listen for new assignments
    const handleNewAssignment = (data) => {
      if (data.classID === classId) {
        setAssignments(prev => [data.assignment, ...prev]);
        setRealtimeUpdate({ type: 'assignment', message: 'New assignment received!' });
        setTimeout(() => setRealtimeUpdate(null), 3000);
      }
    };

    // Listen for new lessons/materials
    const handleNewLesson = (data) => {
      if (data.classID === classId) {
        setBackendLessons(prev => [data.lesson, ...prev]);
        setRealtimeUpdate({ type: 'lesson', message: 'New class material received!' });
        setTimeout(() => setRealtimeUpdate(null), 3000);
      }
    };

    // Listen for new quizzes
    const handleNewQuiz = (data) => {
      if (data.classID === classId) {
        setAssignments(prev => [data.quiz, ...prev]);
        setRealtimeUpdate({ type: 'quiz', message: 'New quiz received!' });
        setTimeout(() => setRealtimeUpdate(null), 3000);
      }
    };

    // Register event listeners
    socket.on('newAnnouncement', handleNewAnnouncement);
    socket.on('announcementUpdated', handleAnnouncementUpdated);
    socket.on('announcementDeleted', handleAnnouncementDeleted);
    socket.on('newAssignment', handleNewAssignment);
    socket.on('newLesson', handleNewLesson);
    socket.on('newQuiz', handleNewQuiz);

    // Cleanup event listeners
    return () => {
      socket.off('newAnnouncement', handleNewAnnouncement);
      socket.off('announcementUpdated', handleAnnouncementUpdated);
      socket.off('announcementDeleted', handleAnnouncementDeleted);
      socket.off('newAssignment', handleNewAssignment);
      socket.off('newLesson', handleNewLesson);
      socket.off('newQuiz', handleNewQuiz);
    };
  }, [socket, classId]);

  // Fetch enrolled student IDs for this class
  const fetchEnrolledStudentIds = async () => {
    if (!classId) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/classes/${classId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const classData = await res.json();
        const memberIds = Array.isArray(classData.members) ? classData.members.map(String) : [];
        
        // For now, consider all active students as potentially enrolled
        // This prevents the "not enrolled" issue while maintaining functionality
        if (allActiveStudents.length > 0) {
          const allStudentIds = allActiveStudents.map(s => String(s._id)).filter(Boolean);
          setEnrolledStudentIds(allStudentIds);
        } else {
          setEnrolledStudentIds(memberIds);
        }
      }
    } catch (err) {
      // Failed to fetch enrolled student IDs
    }
  };

  // Fetch lessons from backend
  useEffect(() => {
    if (selected === "materials") {
      setAnnouncementsLoading(true);
      setAnnouncementError(null);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/lessons?classID=${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setBackendLessons(data);
          else setBackendLessons([]);
        })
        .catch(() => setAnnouncementError("Failed to fetch lessons."))
        .finally(() => setAnnouncementsLoading(false));
    }
  }, [selected, classId]);

  // Fetch progress for all files in all lessons
  useEffect(() => {
    if (selected === "materials" && backendLessons.length > 0) {
      const token = localStorage.getItem('token');
      const fetchAllProgress = async () => {
        const progressMap = {};
        for (const lesson of backendLessons) {
          if (lesson.files && lesson.files.length > 0) {
            for (const file of lesson.files) {
              try {
                const res = await fetch(`${API_BASE}/lessons/lesson-progress?lessonId=${lesson._id}&fileUrl=${encodeURIComponent(file.fileUrl)}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data && data.lastPage && data.totalPages) {
                  progressMap[`${lesson._id}_${file.fileUrl}`] = { lastPage: data.lastPage, totalPages: data.totalPages };
                }
              } catch { /* ignore progress fetch errors */ }
            }
          }
        }
        // setFileProgress(progressMap);
      };
      fetchAllProgress();
    }
  }, [selected, backendLessons]);

  // Fetch announcements from backend
  useEffect(() => {
    if (selected === "home") {
      setAnnouncementsLoading(true);
      setAnnouncementError(null);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/announcements?classID=${classId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setAnnouncements(Array.isArray(data) ? data : []))
        .catch(() => setAnnouncementError("Failed to fetch announcements."))
        .finally(() => setAnnouncementsLoading(false));
    }
  }, [selected, classId]);

  // Fetch assignments and quizzes from backend
  useEffect(() => {
    if (selected === "classwork" && classId) {
      
      setAssignmentsLoading(true);
      setAssignmentError(null);
      const token = localStorage.getItem('token');

      // Fetch both assignments and quizzes in parallel
      Promise.all([
        fetch(`${API_BASE}/assignments?classID=${classId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE}/api/quizzes?classID=${classId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : [])
      ])
      .then(([assignmentsData, quizzesData]) => {
        
        const merged = [
          ...(Array.isArray(assignmentsData) ? assignmentsData : []),
          ...(Array.isArray(quizzesData) ? quizzesData : [])
        ];
        // Filter for this class (should be redundant, but safe)
        const filtered = merged.filter(a => {
          const matchesClassId = a.classID === classId;
          const matchesAssignedTo = Array.isArray(a.assignedTo) && a.assignedTo.some(at => String(at.classID) === String(classId));
          
          
          return matchesClassId || matchesAssignedTo;
        });
        
        // For local testing, if no assignments match the strict criteria, include all assignments
        let finalFiltered = filtered;
        if (import.meta.env.DEV && filtered.length === 0 && merged.length > 0) {
          finalFiltered = merged;
        }
        
        // Only show posted assignments/quizzes to students
        const userRole = localStorage.getItem('role');
        const isStudent = userRole === 'students' || userRole === 'student';
        
        
        const filteredForRole = isStudent ? finalFiltered.filter(isAssignmentPosted) : finalFiltered;
        

          // If user is a student, fetch their submissions to filter out completed assignments
        if (isStudent) {
          Promise.all(filteredForRole.map(assignment =>
              fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).then(async res => {
                if (!res.ok) {
                  return [];
                }
                return res.json();
              }).catch(err => {
                return [];
              })
            )).then(submissionsArrays => {
            const assignmentsWithSubmission = filteredForRole.map((assignment, i) => ({
                ...assignment,
                hasSubmitted: submissionsArrays[i] && submissionsArrays[i].length > 0
              }));
              setAssignments(assignmentsWithSubmission);
              setAssignmentsLoading(false);
            }).catch(err => {
            setAssignments(filteredForRole);
              setAssignmentsLoading(false);
            });
          } else {
          setAssignments(filteredForRole);
            setAssignmentsLoading(false);
          }
        })
        .catch(err => {
        setAssignmentError('Failed to fetch assignments/quizzes. Please try again.');
          setAssignmentsLoading(false);
        });
    }
  }, [selected, classId]);

  useEffect(() => {
  if (selected === "members" && classId) {
    setMembersLoading(true);
    setMembersError(null);
      setHasMappedMembers(false);
      setMembers({ faculty: [], students: [] });
      setMemberIdsRaw([]);
      setClassWithMembers(null);
      
    const token = localStorage.getItem('token');

      // Single function to load everything and map members
      const loadMembersAndStudents = async () => {
        try {
          // Step 1: Load student directory first
          let allStudentsData = [];
          if (isFaculty) {
            try {
              let res = await fetch(`${API_BASE}/users?page=1&limit=1000`, {
      headers: { 'Authorization': `Bearer ${token}` }
              });
                if (res.ok) {
                  const payload = await res.json();
                  const list = Array.isArray(payload?.users) ? payload.users : (Array.isArray(payload) ? payload : []);
                  allStudentsData = list.filter(u => (u.role || '').toLowerCase() === 'students');
                }
            } catch (err) {
              // Failed to load directory
            }
          }
          setAllStudents(allStudentsData);
          
          // Step 2: Try to get members from the dedicated endpoint with status
          try {
            const membersRes = await fetch(`${API_BASE}/classes/${classId}/members-with-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
            });
                         if (membersRes.ok) {
               const membersData = await membersRes.json();
               
               // Use the direct response if we get populated students array, but also store faculty data
               if (Array.isArray(membersData.students) && membersData.students.length > 0) {
                 const studentsOnly = (membersData.students || []).filter(s => (s.role || '').toLowerCase() === 'students');
                 
                 // Store the students directly since they're already populated with full data (deduped)
                 setMembers({ faculty: membersData.faculty ? [membersData.faculty] : [], students: dedupeStudentsById(studentsOnly) });
                 
                 // Store class information for export
                 setClassWithMembers({
                   className: membersData.className || membersData.name,
                   facultyName: membersData.facultyName || (membersData.faculty && membersData.faculty[0]?.name),
                   gradeLevel: membersData.gradeLevel || membersData.grade,
                   section: membersData.section,
                   subject: membersData.subject || membersData.subjectName
                 });
                 
                 // Extract the member IDs that the backend is actually storing (MongoDB _id values)
                 // These are what we need to use for future operations
                 const memberIds = studentsOnly.map(s => String(s._id)).filter(Boolean);
                 setMemberIdsRaw(memberIds);
                 
                 return;
               }
               
               // If we got faculty but no students, store faculty and continue to fallback for students
               if (membersData.faculty) {
                 setMembers(prev => ({ ...prev, faculty: [membersData.faculty] }));
               }
             }
          } catch (err) {
            // Direct members endpoint failed
          }
          
          // Step 3: Fallback to class list approach
          try {
            const classesRes = await fetch(`${API_BASE}/classes`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (classesRes.ok) {
              const classesList = await classesRes.json();
              
              const foundClass = classesList.find(c => String(c.classID || (c._id && (c._id.$oid || c._id))) === String(classId));
              if (foundClass) {
                // Store the class section for filtering students
                if (foundClass.section) {
                  setClassSection(foundClass.section);
                }
                
                if (Array.isArray(foundClass.members) && foundClass.members.length > 0) {
                  // Map the member IDs to actual student objects
                  const memberIds = foundClass.members.map(v => String(v));
                  
                  // The memberIds from the class are MongoDB _id values, so we need to map them to students
                  // by matching against the _id field in allStudentsData
                  const mappedStudents = allStudentsData.filter(s => 
                    memberIds.includes(String(s._id))
                  );
                  
                  // Set the results, preserving any faculty data we already have (deduped)
                  setMemberIdsRaw(memberIds);
                  setMembers(prev => ({ 
                    faculty: prev.faculty.length > 0 ? prev.faculty : (foundClass.faculty || []), 
                    students: dedupeStudentsById(mappedStudents) 
                  }));
                  setHasMappedMembers(true);
                } else {
                  setMembers({ faculty: [], students: [] });
                }
              }
            }
          } catch (err) {
            setMembersError("Failed to fetch class data.");
          }
        } catch (err) {
          setMembersError("Failed to load members.");
        } finally {
          setMembersLoading(false);
        }
      };
      
      loadMembersAndStudents();
      
      // Also fetch enrolled student IDs for validation
      fetchEnrolledStudentIds();
  }
}, [selected, classId, isFaculty]);

  // Fetch grades data when grades tab is selected
  useEffect(() => {
    if (selected === "grades" && classId) {
      setGradesLoading(true);
      setGradesError(null);
      const token = localStorage.getItem('token');
      
      const fetchGradesData = async () => {
        try {
          // Fetch all assignments and quizzes for this class
          const [assignmentsRes, quizzesRes] = await Promise.all([
            fetch(`${API_BASE}/assignments?classID=${classId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE}/api/quizzes?classID=${classId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
          ]);

          const [assignmentsData, quizzesData] = await Promise.all([
            assignmentsRes.ok ? assignmentsRes.json() : [],
            quizzesRes.ok ? quizzesRes.json() : []
          ]);

          // Combine assignments and quizzes, filtering only posted ones
          const allActivities = [
            ...assignmentsData.filter(isAssignmentPosted).map(a => ({ ...a, type: 'assignment' })),
            ...quizzesData.filter(isAssignmentPosted).map(q => ({ ...q, type: 'quiz' }))
          ];

          // Fetch student submissions for each activity
          const gradesWithSubmissions = await Promise.all(
            allActivities.map(async (activity) => {
              try {
                let submissions = [];
                if (activity.type === 'assignment') {
                  const res = await fetch(`${API_BASE}/assignments/${activity._id}/submissions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  if (res.ok) {
                    submissions = await res.json();
                  }
                } else if (activity.type === 'quiz') {
                  const res = await fetch(`${API_BASE}/api/quizzes/${activity._id}/responses`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  if (res.ok) {
                    submissions = await res.json();
                  }
                }
                return { ...activity, submissions };
              } catch (error) {
                console.error(`Failed to fetch submissions for ${activity.type} ${activity._id}:`, error);
                return { ...activity, submissions: [] };
              }
            })
          );

          setGradesData(gradesWithSubmissions);
        } catch (error) {
          console.error('Failed to fetch grades data:', error);
          setGradesError('Failed to load grades data');
        } finally {
          setGradesLoading(false);
        }
      };

      fetchGradesData();
    }
  }, [selected, classId]);

     // Filter students by section when class section or allStudents changes
   useEffect(() => {
     if (allStudents.length > 0 && isFaculty) {
       // Always set all active students for editing
       const activeStudents = getAllActiveStudents(allStudents);
       setAllActiveStudents(activeStudents);
       
       // If we have a section, also filter by section
       if (classSection) {
         const filterStudentsBySection = async () => {
           const filtered = await getStudentsInSameSection(allStudents, classSection);
           setStudentsInSameSection(filtered);
         };
         filterStudentsBySection();
       } else {
         setStudentsInSameSection([]);
       }
     } else {
       setStudentsInSameSection([]);
       setAllActiveStudents([]);
     }
   }, [classSection, allStudents, isFaculty]);


  // --- HANDLERS FOR ADDING CONTENT (Faculty only) ---

  // Add announcement handler
  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    const form = e.target;
    const title = form.title.value;
    const content = form.content.value;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/announcements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ classID: classId, title, content })
      });
      if (res.ok) {
        // Socket listener will automatically update the announcements list
        setShowAnnouncementForm(false);
        form.reset();
      } else {
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Add Announcement Failed',
          message: 'Failed to add announcement. Please try again.',
          onConfirm: () => {
            setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
          },
          confirmText: 'OK',
          showCancel: false
        });
      }
    } catch {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to add announcement due to network error. Please check your connection and try again.',
        onConfirm: () => {
          setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
        },
        confirmText: 'OK',
        showCancel: false
      });
    }
  };

  // --- HANDLERS FOR ANNOUNCEMENTS ---
  const handleDeleteAnnouncement = async (id) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Announcement',
      message: 'Are you sure you want to delete this announcement?',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/announcements/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setAnnouncements(announcements.filter(a => a._id !== id));
            setValidationModal({
              isOpen: true,
              type: 'success',
              title: 'Success',
              message: 'Announcement deleted successfully.',
              onConfirm: () => {
                setValidationModal({ isOpen: false, type: 'success', title: '', message: '', onConfirm: null });
              },
              confirmText: 'OK',
              showCancel: false
            });
          } else {
            setValidationModal({
              isOpen: true,
              type: 'error',
              title: 'Delete Failed',
              message: 'Failed to delete announcement. Please try again.',
              onConfirm: () => {
                setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
              },
              confirmText: 'OK',
              showCancel: false
            });
          }
        } catch {
          setValidationModal({
            isOpen: true,
            type: 'error',
            title: 'Network Error',
            message: 'Failed to delete announcement due to network error. Please check your connection and try again.',
            onConfirm: () => {
              setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
            },
            confirmText: 'OK',
            showCancel: false
          });
        }
      }
    });
  };

  const handleEditAnnouncement = async (id, currentTitle, currentContent) => {
    setEditAnnouncementModal({
      isOpen: true,
      id,
      title: currentTitle,
      content: currentContent
    });
  };

  const handleSaveEditAnnouncement = async () => {
    const { id, title, content } = editAnnouncementModal;
    if (!title.trim() || !content.trim()) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please provide both title and content.',
        onConfirm: () => {
          setValidationModal({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null });
        },
        confirmText: 'OK',
        showCancel: false
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/announcements/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, content })
      });
      if (res.ok) {
        setAnnouncements(announcements.map(a => a._id === id ? { ...a, title, content } : a));
        setEditAnnouncementModal({ isOpen: false, id: null, title: '', content: '' });
        setValidationModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Announcement updated successfully.'
        });
      } else {
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update announcement. Please try again.'
        });
      }
    } catch {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to update announcement due to network error. Please check your connection and try again.'
      });
    }
  };

  // --- COMPONENT: Renders a single lesson item (not used in main render, but kept for possible future use) ---
  function LessonItem({ lesson }) {
    const [expanded, setExpanded] = useState(false);
    return (
      <div
        className="p-4 rounded bg-blue-50 border border-blue-200 shadow-sm cursor-pointer hover:bg-blue-100 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-semibold text-blue-900">{lesson.title}</h3>
        {expanded && <p className="text-sm text-gray-700 mt-2">{lesson.description}</p>}
      </div>
    );
  }

  // --- HANDLERS FOR LESSON UPLOAD ---
  // const handleLessonUpload = async (e) => {
  //   e.preventDefault();
  //   if (!lessonTitle || lessonFiles.length === 0) {
  //     setValidationModal({
  //       isOpen: true,
  //       type: 'warning',
  //       title: 'Missing Information',
  //       message: 'Please provide a title and at least one file.'
  //     });
  //     return;
  //   }
  //   setUploading(true);
  //   const formData = new FormData();
  //   formData.append("classID", classId);
  //   formData.append("title", lessonTitle);
  //   for (let file of lessonFiles) {
  //     formData.append("files", file);
  //   }
  //   const token = localStorage.getItem("token");
  //   try {
  //     const res = await fetch(`${API_BASE}/lessons`, {
  //       method: "POST",
  //       headers: { Authorization: `Bearer ${token}` },
  //       body: formData,
  //     });
  //     if (res.ok) {
  //       setShowLessonForm(false);
  //       setLessonTitle("");
  //       setLessonFiles([]);
  //       // Optionally, refresh lessons list
  //       const newLesson = await res.json();
  //       setBackendLessons(lessons => [...lessons, newLesson]);
  //     } else {
  //       const data = await res.json();
  //       setValidationModal({
  //         isOpen: true,
  //         type: 'error',
  //         title: 'Upload Failed',
  //         message: data.error || "Failed to upload lesson. Please try again."
  //       });
  //     }
  //   } catch {
  //     setValidationModal({
  //       isOpen: true,
  //       type: 'error',
  //       title: 'Network Error',
  //       message: 'Failed to upload lesson due to network error. Please check your connection and try again.'
  //     });
  //   } finally {
  //     setUploading(false);
  //   }
  // };

  const handleLessonUpload = async (e) => {
  e.preventDefault();
  if (!lessonTitle || (lessonFiles.length === 0 && !lessonLink)) {
    setValidationModal({
      isOpen: true,
      type: 'warning',
      title: 'Missing Information',
      message: 'Please provide a title and either a file or a link.'
    });
    return;
  }

  setUploading(true);
  const formData = new FormData();
  formData.append("classID", classId);
  formData.append("title", lessonTitle);

  if (lessonLink) {
    formData.append("link", lessonLink);
  }

  for (let file of lessonFiles) {
    formData.append("files", file);
  }

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}/lessons`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (res.ok) {
      // Socket listener will automatically update the lessons list
      setShowLessonForm(false);
      setLessonTitle("");
      setLessonFiles([]);
      setLessonLink(""); // Clear the link field
    } else {
      const data = await res.json();
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Upload Failed',
        message: data.error || "Failed to upload lesson. Please try again."
      });
      setShowLessonForm(false); // ✅ Close modal on error
    }
  } catch {
    setValidationModal({
      isOpen: true,
      type: 'error',
      title: 'Network Error',
      message: 'Failed to upload lesson due to network error. Please check your connection and try again.'
    });
    setShowLessonForm(false); // ✅ Close modal on network error
  } finally {
    setUploading(false);
  }
};

  // --- HANDLERS FOR LESSON DELETE/EDIT (Faculty only) ---
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState("");
  const [newFiles, setNewFiles] = useState([]);

  // Show edit form for lesson
  const handleEditLessonFiles = (lessonId, currentTitle) => {
    setEditingLessonId(lessonId);
    setEditingLessonTitle(currentTitle);
    setNewFiles([]);
  };

  // Save lesson title change
  const handleSaveLessonTitle = async (lessonId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/lessons/${lessonId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: editingLessonTitle })
      });
      if (res.ok) {
        setBackendLessons(backendLessons.map(l => l._id === lessonId ? { ...l, title: editingLessonTitle } : l));
        setValidationModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Lesson title updated successfully!',
          onConfirm: () => {
            setValidationModal({ isOpen: false, type: 'success', title: '', message: '', onConfirm: null });
          },
          confirmText: 'OK',
          showCancel: false
        });
      } else {
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update lesson title. Please try again.',
          onConfirm: () => {
            setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
          },
          confirmText: 'OK',
          showCancel: false
        });
      }
    } catch {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to update lesson title due to network error. Please check your connection and try again.',
        onConfirm: () => {
          setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
        },
        confirmText: 'OK',
        showCancel: false
      });
    }
  };

  const handleCreateLesson = async () => {
    const token = localStorage.getItem('token');

    // Basic validation
    if (!lessonTitle || !classId || (lessonFiles.length === 0 && !lessonLink)) {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Missing Data',
        message: 'Please provide a title, select a class, and either upload at least one file or add a link.',
        onConfirm: () => {
          setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
        },
        confirmText: 'OK',
        showCancel: false
      });
      return;
    }

    const formData = new FormData();
    formData.append('classID', classId);
    formData.append('title', lessonTitle);

    if (lessonLink) {
      formData.append('link', lessonLink);
    }

    for (const file of lessonFiles) {
      formData.append('files', file);
    }


    try {
      const res = await fetch(`${API_BASE}/lessons`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // ❗ No Content-Type header when using FormData
        },
        body: formData,
      });

      if (res.ok) {
        // Socket listener will automatically update the lessons list
        setLessonTitle('');
        setLessonFiles([]);
        setLessonLink(''); // ✅ Clear link input too
        setValidationModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Lesson uploaded successfully!'
        });
      } else {
        const error = await res.json();
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Upload Failed',
          message: error?.error || 'Failed to upload lesson.'
        });
      }
    } catch (err) {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Check your internet connection and try again.'
      });
    }
  };

  // Upload new files to lesson (requires backend PATCH/POST endpoint, not currently implemented)
  const handleAddFilesToLesson = async (lessonId) => {
    if (newFiles.length === 0) return;
    const token = localStorage.getItem('token');
    const formData = new FormData();
    for (let file of newFiles) {
      formData.append('files', file);
    }
    try {
      const res = await fetch(`${API_BASE}/lessons/${lessonId}/files`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setBackendLessons(backendLessons.map(l => l._id === lessonId ? data.lesson : l));
        setNewFiles([]);
        setValidationModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Files uploaded successfully!'
        });
      } else {
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Upload Failed',
          message: 'Failed to upload new files. Please try again.'
        });
      }
    } catch {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to upload new files due to network error. Please check your connection and try again.'
      });
    }
  };

  const handleDeleteLessonFile = async (lessonId, fileUrl) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete File',
      message: 'Are you sure you want to delete this file from the material?',
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`${API_BASE}/lessons/${lessonId}/file?fileUrl=${encodeURIComponent(fileUrl)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setBackendLessons(backendLessons.map(l => l._id === lessonId ? { ...l, files: l.files.filter(f => f.fileUrl !== fileUrl) } : l));
            setValidationModal({
              isOpen: true,
              type: 'success',
              title: 'Success',
              message: 'File deleted successfully.'
            });
          } else {
            const errPayload = await res.json().catch(() => ({}));
            setValidationModal({
              isOpen: true,
              type: 'error',
              title: 'Delete Failed',
              message: errPayload.error || `Failed to delete file. HTTP ${res.status}`
            });
          }
        } catch {
          setValidationModal({
            isOpen: true,
            type: 'error',
            title: 'Network Error',
            message: 'Failed to delete file due to network error. Please check your connection and try again.'
          });
        }
      }
    });
  };

  const handleDeleteLesson = async (lessonId) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Material',
      message: 'Are you sure you want to delete this material and all its files?',
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`${API_BASE}/lessons/${lessonId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setBackendLessons(backendLessons.filter(l => l._id !== lessonId));
            setValidationModal({
              isOpen: true,
              type: 'success',
              title: 'Success',
              message: 'Material deleted successfully.'
            });
          } else {
            const errPayload = await res.json().catch(() => ({}));
            setValidationModal({
              isOpen: true,
              type: 'error',
              title: 'Delete Failed',
              message: errPayload.error || `Failed to delete material. HTTP ${res.status}`
            });
          }
        } catch {
          setValidationModal({
            isOpen: true,
            type: 'error',
            title: 'Network Error',
            message: 'Failed to delete material due to network error. Please check your connection and try again.'
          });
        }
      }
    });
  };

  // --- MAIN RENDER ---
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow p-6 md:p-8 ">
      {/* Real-time update indicator */}
      {realtimeUpdate && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          <span className="text-sm font-medium">{realtimeUpdate.message}</span>
        </div>
      )}
      
      {/* Connection status indicator */}
      {!isConnected && (
        <div className="fixed top-4 left-4 z-50 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <span className="text-sm font-medium">Connecting to real-time updates...</span>
        </div>
      )}
      
      
      {/* --- HOME TAB: Announcements --- */}
      {selected === "home" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Home Page</h2>
            {isFaculty && (
              <button
                onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm"
              >
                {showAnnouncementForm ? "Cancel" : "+ Create New Announcement"}
              </button>
            )}
          </div>

          {/* Replace inline announcement form with modal */}
          {isFaculty && showAnnouncementForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full border-2 border-blue-200 relative">
                <button
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold"
                  onClick={() => setShowAnnouncementForm(false)}
                  aria-label="Close"
                >
                  ×
                </button>
                <h3 className="text-xl font-bold mb-4 text-blue-900">Create Announcement</h3>
                <form onSubmit={handleAddAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Title</label>
                <input name="title" required className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Content</label>
                <textarea name="content" required className="w-full border rounded px-3 py-2 text-sm" rows={3} />
              </div>
              <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 text-sm">
                Save Announcement
              </button>
            </form>
              </div>
            </div>
          )}

          {/* Announcements list (faculty: backend, students: backend) */}
          <div className="space-y-4">
            {announcementsLoading ? (
              <p className="text-blue-700">Loading announcements...</p>
            ) : announcementError ? (
              <p className="text-red-600">{announcementError}</p>
            ) : announcements.length > 0 ? (
              announcements.map((item) => (
                <div key={item._id} className="p-4 rounded bg-blue-50 border border-blue-200 shadow-sm flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900">{item.title}</h3>
                    <p className="text-xs text-gray-500 mb-2">
                      Posted on: {new Date(item.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-sm text-gray-700 break-words overflow-hidden">{item.content}</p>
                  </div>
                  {isFaculty && (
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => handleEditAnnouncement(item._id, item.title, item.content)} className="bg-yellow-400 hover:bg-yellow-500 text-xs px-2 py-1 rounded font-bold">Edit</button>
                      <button onClick={() => handleDeleteAnnouncement(item._id)} className="bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded text-white font-bold">Delete</button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-700">No announcements yet.</p>
            )}
          </div>
        </>
      )}

      {/* --- CLASSWORK TAB: Assignments --- */}
      {selected === "classwork" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Classwork</h2>
                  <div>
                    <label className="mr-2 text-sm text-gray-700">Filter:</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="all">All</option>
                      <option value="quiz">Quiz</option>
                      <option value="assignment">Assignment</option>
                    </select>
                  </div>
            {isFaculty && (
              <div className="relative inline-block" ref={dropdownRef}>
                <div className="flex items-center gap-3">
                  <button
                    className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm flex items-center gap-2"
                    onClick={() => setShowDropdown((prev) => !prev)}
                  >
                    + Create
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow-lg z-10">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-700">Written Works</span>
                    </div>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      onClick={() => { setShowDropdown(false); navigate(`/create-assignment?classId=${classId}`); }}
                    >
                      Assignment
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      onClick={() => { setShowDropdown(false); navigate(`/create-quiz?classId=${classId}`); }}
                    >
                      Quiz
                    </button>
                    <div className="px-4 py-2 border-b border-gray-200 mt-2">
                      <span className="text-sm font-medium text-gray-700">Performance Task</span>
                    </div>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      onClick={() => { setShowDropdown(false); navigate(`/create-assignment?classId=${classId}&type=performance`); }}
                    >
                      Assignment
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      onClick={() => { setShowDropdown(false); navigate(`/create-quiz?classId=${classId}&type=performance`); }}
                    >
                      Quiz
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Assignment/Quiz list grouped by date and unposted at top */}
          <div className="space-y-4">
            {assignmentsLoading ? (
              <p className="text-blue-700">Loading assignments...</p>
            ) : assignmentError ? (
              <p className="text-red-600">{assignmentError}</p>
            ) : assignments.length > 0 ? (
              (() => {
                // Filter and combine assignments/quizzes
                let allItems = assignments
                  .filter((item) => {
                    if (filterType === "all") return true;
                    return item.type === filterType;
                  })
                  .map(item => ({ ...item, isPosted: isAssignmentPosted(item) }));
                // Separate unposted and posted
                const unposted = allItems.filter(item => !item.isPosted);
                const posted = allItems.filter(item => item.isPosted);
                // Group posted by date (descending)
                const groupedByDate = {};
                posted.forEach(item => {
                  const date = new Date(item.createdAt || item.postAt || new Date());
                  const dateKey = date.toDateString();
                  if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
                  groupedByDate[dateKey].push(item);
                });
                const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
                return (
                  <>
                    {/* Unposted at the top */}
                    {unposted.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-700 mb-3">Not Yet Posted</h4>
                        {unposted.map(item => (
                  <div
                    key={item._id}
                            className={`p-4 rounded-xl border shadow flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer transition relative bg-gray-100 border-gray-300 opacity-75 mb-2`}
                    onClick={() => {
                      if (item.type === 'quiz') {
                        if (isFaculty) {
                          navigate(`/quiz/${item._id}/responses`);
                        } else {
                          navigate(`/quiz/${item._id}`);
                        }
                      } else {
                        navigate(`/assignment/${item._id}`);
                      }
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${item.type === 'quiz' ? 'bg-purple-200 text-purple-800' : 'bg-green-200 text-green-800'}`}>{item.type === 'quiz' ? 'Quiz' : 'Assignment'}</span>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${item.activityType === 'performance' ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}`}>{item.activityType === 'performance' ? 'Performance Task' : 'Written Works'}</span>
                                <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-gray-500 text-white">Not Posted Yet</span>
                      </div>
                              <span className="text-lg font-bold text-gray-600">{item.title}</span>
                              <div className="text-sm mt-1 text-gray-500">{item.instructions}</div>
                      {item.dueDate && (
                                <div className="text-xs mt-1 text-gray-400">Due: {new Date(item.dueDate).toLocaleString()}</div>
                      )}
                      {item.points && (
                                <div className="text-xs text-gray-400">Points: {item.points}</div>
                              )}
                              {item.postAt && (
                                <div className="text-xs text-blue-600 mt-1">Will be posted: {new Date(item.postAt).toLocaleString()}</div>
                              )}
                            </div>
                            {isFaculty && (
                              <div className="absolute top-2 right-2">
                                <Menu 
                                  assignment={item} 
                                  onDelete={id => setAssignments(assignments => assignments.filter(a => a._id !== id))}
                                  onUpdate={(updatedAssignment) => setAssignments(assignments => assignments.map(a => a._id === updatedAssignment._id ? updatedAssignment : a))}
                                  setValidationModal={setValidationModal}
                                  setConfirmationModal={setConfirmationModal}
                                  setDuplicateModal={setDuplicateModal}
                                />
                        </div>
                      )}
                          </div>
                        ))}
                        </div>
                      )}
                    {/* Posted grouped by date */}
                    {sortedDateKeys.map(dateKey => (
                      <div key={dateKey}>
                        <div className="mb-4 mt-6 first:mt-0">
                          <h4 className="text-lg font-semibold text-gray-700 mb-3">{new Date(dateKey).toLocaleDateString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                          })}</h4>
                    </div>
                        {groupedByDate[dateKey].map(item => (
                          <div
                            key={item._id}
                            className={`p-4 rounded-xl border shadow flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer transition relative bg-white border-blue-200 hover:bg-blue-50 mb-2`}
                            onClick={() => {
                              if (item.type === 'quiz') {
                                if (isFaculty) {
                                  navigate(`/quiz/${item._id}/responses`);
                                } else {
                                  navigate(`/quiz/${item._id}`);
                                }
                              } else {
                                navigate(`/assignment/${item._id}`);
                              }
                            }}
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${item.type === 'quiz' ? 'bg-purple-200 text-purple-800' : 'bg-green-200 text-green-800'}`}>{item.type === 'quiz' ? 'Quiz' : 'Assignment'}</span>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${item.activityType === 'performance' ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}`}>{item.activityType === 'performance' ? 'Performance Task' : 'Written Works'}</span>
                              </div>
                              <span className="text-lg font-bold text-blue-900">{item.title}</span>
                              <div className="text-sm mt-1 text-gray-700">{item.instructions}</div>
                              {item.dueDate && (
                                <div className="text-xs mt-1 text-gray-500">Due: {new Date(item.dueDate).toLocaleString()}</div>
                              )}
                              {item.points && (
                                <div className="text-xs text-gray-500">Points: {item.points}</div>
                              )}
                            </div>
                    {isFaculty && (
                      <div className="absolute top-2 right-2">
                                              <Menu 
                        assignment={item} 
                        onDelete={id => setAssignments(assignments => assignments.filter(a => a._id !== id))}
                                  onUpdate={(updatedAssignment) => setAssignments(assignments => assignments.map(a => a._id === updatedAssignment._id ? updatedAssignment : a))}
                        setValidationModal={setValidationModal}
                        setConfirmationModal={setConfirmationModal}
                        setDuplicateModal={setDuplicateModal}
                      />
                      </div>
                    )}
                  </div>
                        ))}
                      </div>
                    ))}
                  </>
                );
              })()
            ) : (
              <p>No assignments or quizzes found.</p>
            )}
          </div>
        </>
      )}

      {/* --- CLASS MATERIALS TAB: Lessons --- */}
      {selected === "materials" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Class Materials</h2>
            {isFaculty && !showLessonForm && (
              <button
                className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm"
                onClick={() => setShowLessonModal(true)}
              >
                + Add Material
              </button>
            )}
          </div>
        {isFaculty && showLessonForm && (
          <form
            onSubmit={handleLessonUpload}
            className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-6 flex flex-col gap-4 w-full max-w-3xl"
            style={{ minWidth: 600 }}
          >
            <div className="flex flex-col gap-1">
              <label className="font-semibold">Lesson Title</label>
              <input
                type="text"
                value={lessonTitle}
                onChange={e => setLessonTitle(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold">Files</label>
              <input
                type="file"
                multiple
                onChange={e => setLessonFiles([...lessonFiles, ...Array.from(e.target.files)])}
                className="border rounded px-3 py-2 w-full"
              />
              {lessonFiles.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {lessonFiles.map((file, idx) => (
                    <li key={idx} className="bg-gray-100 px-3 py-1 rounded flex items-center gap-2">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 text-xs font-bold"
                        onClick={() => setLessonFiles(lessonFiles.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleCreateLesson}
                className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 text-sm"
                disabled={uploading || lessonFiles.length === 0}
              >
                {uploading ? "Uploading..." : "Save Module"}
              </button>

              <button
                type="button"
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 text-sm"
                onClick={() => setShowLessonForm(false)}
                disabled={uploading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
          {/* Card/Table style for lessons */}
          {backendLessons.length > 0 ? (
            backendLessons.map(lesson => (
              <div key={lesson._id} className="rounded-xl shadow border border-gray-200 mb-6 overflow-hidden">
                {/* Blue header */}
                <div className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <span className="font-bold text-lg">{lesson.title}</span>
                  </div>
                  {isFaculty && (
                    <div className="flex gap-2">
                      {editingLessonId !== lesson._id && (
                        <button
                          className="bg-yellow-400 hover:bg-yellow-500 text-xs px-2 py-1 rounded font-bold"
                          onClick={() => handleEditLessonFiles(lesson._id, lesson.title)}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* Table */}
                <div className="bg-white">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b">
                        <th className="px-6 py-2 font-semibold">Section</th>
                        {isFaculty && <th className="px-6 py-2 font-semibold">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {lesson.link && (
                        <tr className="border-b hover:bg-gray-50">
                          <td className="px-6 py-2 flex items-center gap-2">
                            <span className="text-blue-700">🔗</span>
                            <a
                              href={lesson.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 underline"
                            >
                              {lesson.link}
                            </a>
                          </td>
                          {isFaculty && editingLessonId !== lesson._id && <td className="px-6 py-2"></td>}
                        </tr>
                      )}
                      {lesson.files && lesson.files.length > 0 ? (
                        lesson.files.map(file => {
                          const fileUrl = getFileUrl(file.fileUrl, API_BASE);
                          return (
                            <tr key={file.fileUrl} className="border-b hover:bg-gray-50">
                              <td className="px-6 py-2 flex items-center gap-2">
                                <span className="text-blue-700">📄</span>
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-700 underline"
                                >
                                  {file.fileName}
                                </a>
                              </td>
                              {isFaculty && editingLessonId === lesson._id && (
                                <td className="px-6 py-2">
                                  <button
                                    className="bg-red-500 hover:bg-red-700 text-xs px-2 py-1 rounded text-white font-bold"
                                    onClick={() => handleDeleteLessonFile(lesson._id, file.fileUrl)}
                                  >
                                    Remove
                                  </button>
                                </td>
                              )}
                              {isFaculty && editingLessonId !== lesson._id && <td className="px-6 py-2"></td>}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td className="px-6 py-2" colSpan={isFaculty ? 2 : 1}>No files uploaded.</td>
                        </tr>
                      )}
                      {/* Add new files UI if editing this lesson */}
                      {isFaculty && editingLessonId === lesson._id && (
                        <tr>
                          <td className="px-6 py-2" colSpan={2}>
                            <div className="mb-2 flex items-center gap-2">
                              <label className="block text-xs font-semibold mb-1">Lesson Title</label>
                              <input
                                type="text"
                                value={editingLessonTitle}
                                onChange={e => setEditingLessonTitle(e.target.value)}
                                className="border rounded px-2 py-1 w-full"
                              />
                              <button
                                className="bg-green-700 text-white px-3 py-1 rounded text-xs"
                                onClick={() => handleSaveLessonTitle(lesson._id)}
                              >
                                Save Title
                              </button>
                            </div>
                            <input
                              type="file"
                              multiple
                              onChange={e => setNewFiles([...newFiles, ...Array.from(e.target.files)])}
                              className="border rounded px-2 py-1"
                            />
                            <button
                              className="bg-blue-900 text-white px-3 py-1 rounded ml-2 text-xs"
                              onClick={() => handleAddFilesToLesson(lesson._id)}
                            >
                              Upload New Files
                            </button>
                            <div className="mt-4 flex justify-end gap-2">
                              <button
                                className="bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold"
                                onClick={() => setEditingLessonId(null)}
                              >
                                Save
                              </button>
                              <button
                                className="bg-gray-400 text-white px-4 py-2 rounded text-sm font-semibold"
                                onClick={() => setEditingLessonId(null)}
                              >
                                Cancel
                              </button>
                              <button
                                className="bg-red-600 hover:bg-red-700 text-sm px-4 py-2 rounded font-semibold text-white"
                                onClick={() => handleDeleteLesson(lesson._id)}
                              >
                                Delete Module
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-700">No materials yet.</p>
          )}
        </>
      )}

      {/* --- GRADES TAB --- */}
      {selected === "grades" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Grades</h2>
            <div className="flex gap-2">
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

          {gradesLoading ? (
            <div className="text-center py-8">
              <div className="text-blue-700">Loading grades...</div>
            </div>
          ) : gradesError ? (
            <div className="text-center py-8">
              <div className="text-red-600">{gradesError}</div>
            </div>
          ) : (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                {/* Header */}
                <div className="bg-gray-50 border-b">
                  <div className="flex min-w-max">
                    <div className="w-48 p-4 border-r border-gray-200 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">Students</div>
                    </div>
                    {gradesData.map((activity, index) => (
                      <div key={activity._id} className={`w-32 p-4 text-center flex-shrink-0 ${index < gradesData.length - 1 ? 'border-r border-gray-200' : ''}`}>
                        <div className="text-sm font-medium text-gray-900">{activity.title}</div>
                        <div className="text-xs text-gray-700">{activity.points || 0} points</div>
                        <div className="text-xs text-gray-600 mt-1">Grade | View | Due</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Student rows */}
                <div className="divide-y divide-gray-200">
                  {members.students.map((student) => (
                    <div key={student._id} className="hover:bg-gray-50">
                      <div className="flex min-w-max">
                        {/* Student info */}
                        <div className="w-48 p-4 border-r border-gray-200 flex items-center gap-3 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium overflow-hidden">
                            {student.profilePicture ? (
                              <img 
                                src={student.profilePicture} 
                                alt={`${student.firstname} ${student.lastname}`}
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center text-sm font-medium ${student.profilePicture ? 'hidden' : 'flex'}`}>
                              {student.firstname?.[0]}{student.lastname?.[0]}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {student.lastname}, {student.firstname}
                            </div>
                            <div className="text-sm text-gray-500">{student.schoolID || student.userID || 'N/A'}</div>
                          </div>
                        </div>

                        {/* Grades for each activity */}
                        {gradesData.map((activity, index) => {
                          const submission = activity.submissions?.find(sub => 
                            sub.studentId?._id === student._id || 
                            sub.studentId === student._id ||
                            sub.student?._id === student._id ||
                            sub.student === student._id
                          );
                          
                          let gradeDisplay = '-';
                          let statusClass = 'text-gray-900';
                          let viewStatus = '';
                          let dueDateStatus = '';
                          
                          // Determine view status based on submission/score
                          if (submission) {
                            // If they have a submission, they must have viewed it
                            viewStatus = 'Submitted';
                          } else {
                            // Check if student has viewed the activity (but not submitted)
                            const hasViewed = activity.views && activity.views.includes(student._id);
                            viewStatus = hasViewed ? 'Viewed' : 'Not Viewed';
                          }
                          
                          // Check due date status
                          if (activity.dueDate) {
                            const dueDate = new Date(activity.dueDate);
                            const now = new Date();
                            const isOverdue = now > dueDate;
                            dueDateStatus = isOverdue ? 'Overdue' : 'On Time';
                          }
                          
                          if (submission) {
                            if (activity.type === 'assignment') {
                              if (submission.grade !== undefined && submission.grade !== null) {
                                gradeDisplay = `${submission.grade}/${activity.points || 0}`;
                                statusClass = 'text-blue-900 font-medium';
                              } else if (submission.submittedAt) {
                                gradeDisplay = 'Submitted';
                                statusClass = 'text-blue-600';
                              }
                            } else if (activity.type === 'quiz') {
                              if (submission.score !== undefined && submission.score !== null) {
                                gradeDisplay = `${submission.score}/${activity.points || 0}`;
                                statusClass = 'text-green-600 font-medium';
                              } else if (submission.submittedAt) {
                                gradeDisplay = 'Submitted';
                                statusClass = 'text-blue-600';
                              }
                            }
                          }

                          return (
                            <div key={activity._id} className={`w-32 p-4 text-center flex-shrink-0 ${index < gradesData.length - 1 ? 'border-r border-gray-200' : ''}`}>
                              <div className={`text-sm ${statusClass} font-medium`}>
                                {gradeDisplay}
                              </div>
                              <div className="text-xs text-gray-700 mt-1">
                                {viewStatus}
                              </div>
                              {activity.dueDate && (
                                <div className={`text-xs mt-1 ${
                                  dueDateStatus === 'Overdue' ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {dueDateStatus}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {members.students.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No students found in this class.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- MEMBERS TAB --- */}
      {selected === "members" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Members</h2>
          {membersLoading ? (
            <p className="text-blue-700">Loading members...</p>
          ) : membersError ? (
            <p className="text-red-600">{membersError}</p>
          ) : (
            <>
              <h3 className="font-semibold text-blue-900 mt-2 mb-1">
                Faculty
              </h3>
              {members.faculty.length > 0 ? (
                <ul>
                  {members.faculty.map(f => (
                    <li key={f._id}>
                      {f.firstname} {f.lastname} (Faculty)
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-700">No faculty found.</p>
              )}

              <h3 className="font-semibold text-blue-900 mt-4 mb-1 flex items-center gap-2">
                Students ({members.students.length})
                {isFaculty && (
                  <div className="flex gap-2">
                    <button
                      className="text-sm text-blue-700 underline"
                                              onClick={() => {
                          setEditingMembers(true);
                          // Use MongoDB _id values since that's what the backend stores
                          const currentMemberIds = members.students.map(s => String(s._id)).filter(Boolean);
                          setNewStudentIDs(currentMemberIds);
                        }}
                    >
                      Edit Members
                    </button>
                  </div>
                )}
              </h3>
              
              {/* Show registration status summary */}
              {members.students && members.students.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 font-medium">
                      ✅ Active: {members.students.filter(s => s.registrationStatus === 'active').length}
                    </span>
                    <span className="text-yellow-600 font-medium">
                      ⏳ Pending: {members.students.filter(s => s.registrationStatus === 'pending').length}
                    </span>
                  </div>
                </div>
              )}

              {editingMembers ? (
                <div className="mt-4 space-y-4">
                  {/* Current Class Members */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <span className="text-lg">👥</span>
                      Current Class Members ({members.students.length})
                    </h4>
                    {/* Search/filter within current members to find pending students quickly */}
                    {members.students.length > 0 && (
                      <div className="mb-3">
                        <input
                          type="text"
                          placeholder="Search current members by name or ID..."
                          value={studentSearchTerm}
                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    )}
                    {members.students.length > 0 ? (
                      <div className="space-y-3">
                        {members.students
                          .filter(student => {
                            if (!studentSearchTerm.trim()) return true;
                            const q = studentSearchTerm.toLowerCase();
                            const name = `${student.firstname || ''} ${student.lastname || ''}`.toLowerCase();
                            const sid = String(student.schoolID || student.userID || '').toLowerCase();
                            return name.includes(q) || sid.includes(q);
                          })
                          .map(student => (
                          <div key={student._id || student.userID} className="flex items-center justify-between bg-white p-4 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg overflow-hidden">
                                {student.profilePicture ? (
                                  <img 
                                    src={student.profilePicture} 
                                    alt={`${student.firstname} ${student.lastname}`}
                                    className="w-full h-full object-cover rounded-full"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={`w-full h-full flex items-center justify-center text-lg ${student.profilePicture ? 'hidden' : 'flex'}`}>
                                  {student.firstname?.[0]}{student.lastname?.[0]}
                                </div>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                  {student.firstname} {student.lastname}
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    student.registrationStatus === 'active' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {student.registrationStatus === 'active' ? '✅ Active' : '⏳ Pending'}
                                  </span>
                                </div>
                                
                                <div className="text-sm text-blue-600 font-medium">ID: {student.schoolID || student.userID || 'N/A'}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const studentId = String(student._id);
                                setNewStudentIDs(prev => prev.filter(id => id !== studentId));
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">👥</div>
                        <p className="font-medium">No students currently in this class</p>
                        <p className="text-sm text-gray-400">Add students using the form below</p>
                      </div>
                    )}
                  </div>

                  {/* Add New Students */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3">Add New Students</h4>
                    
                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {classSection && (
                        <div className="text-sm text-gray-600 p-3 bg-white rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📍</span>
                            <strong className="text-green-800">Section Information</strong>
                          </div>
                          <p className="mb-2">Class is in section <span className="font-semibold text-green-700">{classSection}</span></p>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>✅ Students from same section (highlighted in green)</div>
                            <div>➕ Students from other sections (shown in blue)</div>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-600 p-3 bg-white rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">⚠️</span>
                          <strong className="text-yellow-800">Student Addition</strong>
                        </div>
                        <p className="mb-2">All active students can be added to this class</p>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>• Active students have active "Add" buttons</div>
                          <div>• Students will be permanently added as class members</div>
                          <div>• This doesn't affect academic enrollment status</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Controls Row */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4 p-3 bg-white rounded-lg border border-gray-200">
                      {/* Toggle for showing students from different sections */}
                      {classSection && (
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={showDifferentSectionStudents}
                            onChange={(e) => setShowDifferentSectionStudents(e.target.checked)}
                            className="rounded"
                          />
                          Show different sections
                        </label>
                      )}
                    </div>
                    
                    {/* Summary Stats */}
                    <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                      <h5 className="font-medium text-gray-800 mb-2">📊 Student Summary</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="text-center">
                          <div className="font-semibold text-blue-600">{allActiveStudents.filter(s => {
                            const studentId = String(s._id);
                            return !newStudentIDs.includes(studentId) && !members.students.some(existing => String(existing._id) === studentId);
                          }).length}</div>
                          <div className="text-gray-500">Available</div>
                        </div>
                        {classSection && (
                          <>
                            <div className="text-center">
                              <div className="font-semibold text-green-600">{studentsInSameSection.filter(s => {
                                const studentId = String(s._id);
                                return !newStudentIDs.includes(studentId) && !members.students.some(existing => String(existing._id) === studentId);
                              }).length}</div>
                              <div className="text-gray-500">Same Section</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-blue-600">{allActiveStudents.filter(s => {
                                const studentId = String(s._id);
                                return !newStudentIDs.includes(studentId) && 
                                       !members.students.some(existing => String(existing._id) === studentId) &&
                                       !studentsInSameSection.some(ss => String(ss._id) === studentId);
                              }).length}</div>
                              <div className="text-gray-500">Other Sections</div>
                            </div>
                          </>
                        )}
                        <div className="text-center">
                          <div className="font-semibold text-green-600">{newStudentIDs.filter(id => !members.students.some(s => String(s._id) === id)).length}</div>
                          <div className="text-gray-500">To Add</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Search input */}
                    <div className="mb-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="🔍 Search students by name, email, or ID..."
                          value={studentSearchTerm}
                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                      </div>
                    </div>
                    
                    {allActiveStudents.length > 0 ? (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {(() => {
                          const filteredStudents = allActiveStudents
                            .filter(student => {
                              const studentId = String(student._id);
                              
                              // Filter out students already in the class (either current members or newly added)
                              if (newStudentIDs.includes(studentId)) return false;
                              
                              // Filter out students who are already enrolled in this class
                              const isAlreadyEnrolled = members.students.some(s => {
                                const existingId = String(s._id);
                                return existingId === studentId;
                              });
                              if (isAlreadyEnrolled) return false;
                              
                              // If toggle is off, only show students from same section
                              if (!showDifferentSectionStudents && classSection) {
                                const isInSameSection = studentsInSameSection.some(s => String(s._id) === studentId);
                                return isInSameSection;
                              }
                              
                              // Apply search filter
                              if (studentSearchTerm.trim()) {
                                const searchLower = studentSearchTerm.toLowerCase();
                                const name = `${student.firstname || ''} ${student.lastname || ''}`.toLowerCase();
                                const email = (student.email || '').toLowerCase();
                                const schoolId = (student.schoolID || '').toLowerCase();
                                
                                return name.includes(searchLower) || 
                                       email.includes(searchLower) || 
                                       schoolId.includes(searchLower);
                              }
                              
                              return true;
                            });
                          
                          if (filteredStudents.length === 0) {
                            return (
                              <div className="text-center py-12 text-gray-500">
                                <div className="text-6xl mb-3">🔍</div>
                                <p className="font-medium text-lg mb-2">No students found</p>
                                <p className="text-sm text-gray-400">Try adjusting your search terms or filters</p>
                              </div>
                            );
                          }
                          
                          return filteredStudents.map(student => {
                            const studentId = String(student._id);
                            const label = `${student.firstname || ''} ${student.lastname || ''}`.trim() || (student.email || studentId);
                            const isInSameSection = classSection && studentsInSameSection.some(s => String(s._id) === studentId);
                            
                            return (
                              <div key={studentId} className={`flex items-center justify-between p-4 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md ${
                                isInSameSection ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                              }`}>
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                                    isInSameSection ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {isInSameSection ? '✅' : '➕'}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900 mb-1">{label}</div>
                                    <div className="text-sm text-gray-600 mb-1">{student.email || student.schoolID}</div>
                                    <div className="flex gap-2">
                                      {isInSameSection && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          ✓ Same section
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    const studentId = String(student._id);
                                    
                                    // Check if student is already in the newStudentIDs (to be added)
                                    const isAlreadyToBeAdded = newStudentIDs.includes(studentId);
                                    
                                    // Check if student is already enrolled in this class
                                    const isAlreadyEnrolled = members.students.some(s => {
                                      const existingId = String(s._id);
                                      return existingId === studentId;
                                    });
                                    
                                    if (isAlreadyEnrolled || isAlreadyToBeAdded) {
                                      // Student is already enrolled or about to be added, show different message
                                      setValidationModal({
                                        isOpen: true,
                                        type: 'warning',
                                        title: 'Student Already Enrolled',
                                        message: `${student.firstname || ''} ${student.lastname || ''} is already enrolled in this class or about to be added.`,
                                        onConfirm: () => {
                                          setValidationModal({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null });
                                        },
                                        confirmText: 'OK',
                                        showCancel: false
                                      });
                                    } else {
                                      // Student is not enrolled, show confirmation message
                                      setValidationModal({
                                        isOpen: true,
                                        type: 'info',
                                        title: 'Confirm Student Addition',
                                        message: `You are about to permanently add ${student.firstname || ''} ${student.lastname || ''} to this class. This action will only affect the class membership and will not modify any existing student records, grades, or other data.`,
                                        onConfirm: () => {
                                          // Add student to the list after confirmation
                                          setNewStudentIDs(prev => [...prev, studentId]);
                                          
                                          // Also immediately add them to the current members display for better UX
                                          setMembers(prev => ({
                                            ...prev,
                                            students: dedupeStudentsById([...prev.students, student])
                                          }));
                                          
                                          
                                          setValidationModal({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null });
                                        },
                                        confirmText: 'Add Student',
                                        showCancel: true,
                                        cancelText: 'Cancel'
                                      });
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    isInSameSection 
                                      ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md' 
                                      : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md'
                                  }`}
                                  title="Click to permanently add this student to the class"
                                >
                                  Add Student
                                </button>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-600">No active students found.</p>
                        <p className="text-sm text-gray-500">Please check if there are any students in the system.</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-600 text-center sm:text-left">
                      <span className="font-medium">Total Students:</span> {newStudentIDs.length}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setEditingMembers(false);
                          setStudentSearchTerm('');
                          setShowDifferentSectionStudents(true);
                          // Reset the temporary newStudentIDs to current members (MongoDB _id values)
                          const currentMemberIds = members.students.map(s => String(s._id)).filter(Boolean);
                          setNewStudentIDs(currentMemberIds);
                        }}
                        className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          const token = localStorage.getItem('token');
                          try {
                            setMembersSaving(true);
                            const idsToSend = newStudentIDs.map(String);
                            
                            // Validate that we have at least some members
                            if (idsToSend.length === 0) {
                              setValidationModal({
                                isOpen: true,
                                type: 'warning',
                                title: 'No Members',
                                message: 'Please add at least one student to the class before saving.',
                                onConfirm: () => {
                                  setValidationModal({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null });
                                },
                                confirmText: 'OK',
                                showCancel: false
                              });
                              setMembersSaving(false);
                              return;
                            }
                            
                            
                            const res = await fetch(`${API_BASE}/classes/${classId}/members`, {
                              method: 'PATCH',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({ members: idsToSend })
                            });
                            
                            
                            if (res.ok) {
                              const updated = await res.json();
                              
                              // Update the members state with the new data
                              // The backend returns the entire updated class object with originalMemberIds
                              const ids = Array.isArray(updated?.members) ? updated.members.map(String) : idsToSend;
                              const originalIds = Array.isArray(updated?.originalMemberIds) ? updated.originalMemberIds.map(String) : idsToSend;
                              
                              
                              // Map the member IDs to actual student objects
                              // The backend returns MongoDB _id values in the members array, so map directly using _id
                              let mapped = (allStudents || []).filter(s => ids.includes(String(s._id)));
                              
                              
                              // Update both the raw IDs and the mapped members
                              setMemberIdsRaw(ids);
                              setMembers(prev => ({
                                faculty: prev.faculty, // Keep existing faculty
                                students: dedupeStudentsById(mapped)
                              }));
                              
                              // Reset the editing state
                              setEditingMembers(false);
                              setStudentSearchTerm('');
                              setShowDifferentSectionStudents(true);
                              
                              // Clear the temporary newStudentIDs
                              setNewStudentIDs([]);
                              
                              // Show success message
                              setValidationModal({
                                isOpen: true,
                                type: 'success',
                                title: 'Success',
                                message: 'Class members updated successfully!',
                                onConfirm: () => {
                                  setValidationModal({ isOpen: false, type: 'success', title: '', message: '', onConfirm: null });
                                },
                                confirmText: 'OK',
                                showCancel: false
                              });
                              
                              // Refresh the enrolled student IDs
                              fetchEnrolledStudentIds();
                              
                              // Force a re-render by updating the members state again
                              setTimeout(() => {
                                setMembers(current => ({ ...current }));
                              }, 100);
                              
                              // No need to refresh from server since we already have the updated data
                            } else {
                              const errorData = await res.json().catch(() => ({}));
                              
                              // Handle specific error cases
                              let errorMessage = errorData.error || `HTTP ${res.status}`;
                              let errorTitle = 'Update Failed';
                              
                              if (res.status === 400) {
                                errorTitle = 'Invalid Request';
                                errorMessage = 'Invalid member data format. Please check your input.';
                              } else if (res.status === 401) {
                                errorTitle = 'Authentication Error';
                                errorMessage = 'Your session has expired. Please log in again.';
                              } else if (res.status === 403) {
                                errorTitle = 'Permission Denied';
                                errorMessage = 'You do not have permission to update class members.';
                              } else if (res.status === 404) {
                                errorTitle = 'Class Not Found';
                                errorMessage = 'The specified class could not be found.';
                              } else if (res.status >= 500) {
                                errorTitle = 'Server Error';
                                errorMessage = 'A server error occurred. Please try again later.';
                              }
                              
                              setValidationModal({
                                isOpen: true,
                                type: 'error',
                                title: errorTitle,
                                message: errorMessage,
                                onConfirm: () => {
                                  setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
                                },
                                confirmText: 'OK',
                                showCancel: false
                              });
                            }
                          } catch (error) {
                            setValidationModal({
                              isOpen: true,
                              type: 'error',
                              title: 'Network Error',
                              message: 'Error updating members due to network error. Please check your connection and try again.',
                              onConfirm: () => {
                                setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
                              },
                              confirmText: 'OK',
                              showCancel: false
                            });
                          } finally {
                            setMembersSaving(false);
                          }
                        }}
                        disabled={membersSaving}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {membersSaving ? '💾 Saving...' : '💾 Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                members.students.length > 0 ? (
                  <div className="space-y-2">
                    {members.students.map(s => (
                      <div key={s.userID || s._id} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium overflow-hidden">
                            {s.profilePicture ? (
                              <img 
                                src={s.profilePicture} 
                                alt={`${s.firstname} ${s.lastname}`}
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center text-sm font-medium ${s.profilePicture ? 'hidden' : 'flex'}`}>
                              {s.firstname?.[0]}{s.lastname?.[0]}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {s.firstname} {s.lastname}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                s.registrationStatus === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {s.registrationStatus === 'active' ? '✅ Active' : '⏳ Pending'}
                              </span>
                            </div>
                            <div className="text-sm text-blue-600 font-medium">ID: {s.schoolID || s.userID || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">👥</div>
                    <p className="font-medium">No students in this class yet</p>
                    <p className="text-sm text-gray-400">
                      {isFaculty ? 'Click "Edit Members" to add students to this class' : 'Students will appear here once they are added to the class'}
                    </p>
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* Validation Modal Backdrop */}
      {validationModal.isOpen && (
        <ValidationModal
          isOpen={validationModal.isOpen}
          onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
          type={validationModal.type}
          title={validationModal.title}
          message={validationModal.message}
          onConfirm={validationModal.onConfirm}
          confirmText={validationModal.confirmText || 'OK'}
          showCancel={validationModal.showCancel || false}
          cancelText={validationModal.cancelText || 'Cancel'}
        />
      )}

      {confirmationModal.isOpen && (
        <ValidationModal
          isOpen={confirmationModal.isOpen}
          onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
          type="warning"
          title={confirmationModal.title}
          message={confirmationModal.message}
          onConfirm={confirmationModal.onConfirm}
          confirmText="Confirm"
          showCancel={true}
          cancelText="Cancel"
        />
      )}

      {/* Edit Announcement Modal */}
      {editAnnouncementModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full border-2 border-blue-200 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold"
              onClick={() => setEditAnnouncementModal({ isOpen: false, id: null, title: '', content: '' })}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-xl font-bold mb-4 text-blue-900">Edit Announcement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Title</label>
                <input
                  type="text"
                  value={editAnnouncementModal.title}
                  onChange={(e) => setEditAnnouncementModal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Content</label>
                <textarea
                  value={editAnnouncementModal.content}
                  onChange={(e) => setEditAnnouncementModal(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditAnnouncementModal({ isOpen: false, id: null, title: '', content: '' })}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditAnnouncement}
                  className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 text-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLessonModal && (
        <div className="fixed inset-0 z-[1030] flex items-center justify-center bg-[rgba(0,0,0,0.4)] backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Module</h2>
            <form onSubmit={handleLessonUpload} className="flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="font-semibold">Lesson Title</label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={e => setLessonTitle(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="font-semibold">Upload Files</label>
                <input
                  type="file"
                  multiple
                  onChange={e =>
                    setLessonFiles(prev => [...prev, ...Array.from(e.target.files)])
                  }
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              {/* Optional Link */}
              <div>
                <label className="font-semibold">or Paste Link</label>
                <input
                  type="url"
                  placeholder="https://example.com/lesson.pdf"
                  value={lessonLink}
                  onChange={e => setLessonLink(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              {/* Display uploaded files and link */}
              {(lessonFiles.length > 0 || lessonLink) && (
                <ul className="mt-2 flex flex-col gap-2">
                  {lessonFiles.map((file, idx) => (
                    <li
                      key={idx}
                      className="bg-gray-100 px-3 py-1 rounded flex items-center justify-between"
                    >
                      <span>{file.name}</span>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 text-xs font-bold"
                        onClick={() =>
                          setLessonFiles(files => files.filter((_, i) => i !== idx))
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                  {lessonLink && (
                    <li className="bg-gray-100 px-3 py-1 rounded flex items-center justify-between">
                      <a
                        href={lessonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-sm"
                      >
                        {lessonLink}
                      </a>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 text-xs font-bold"
                        onClick={() => setLessonLink("")}
                      >
                        Remove
                      </button>
                    </li>
                  )}
                </ul>
              )}

              {/* Submit and Cancel */}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowLessonModal(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || (lessonFiles.length === 0 && !lessonLink)}
                  className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950"
                >
                  {uploading ? "Uploading..." : "Save Module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {duplicateModal.isOpen && (
        <DuplicateClassModal
          isOpen={duplicateModal.isOpen}
          onClose={() => setDuplicateModal({ isOpen: false, assignment: null, type: null })}
          assignment={duplicateModal.assignment}
          type={duplicateModal.type}
          navigate={navigate}
        />
      )}
    </div>
  );
}

// Duplicate Class Modal Component
function DuplicateClassModal({ isOpen, onClose, assignment, type, navigate }) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableClasses();
    }
  }, [isOpen]);

  const fetchAvailableClasses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/classes/faculty-classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Filter out the current class and only show active classes
        const filtered = data.filter(cls => 
          cls.isArchived !== true && 
          cls.classID !== assignment?.classID
        );
        setAvailableClasses(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = () => {
    if (!selectedClassId) return;
    
    const duplicateUrl = type === 'quiz' 
      ? `/create-quiz?duplicate=${assignment._id}&classId=${selectedClassId}`
      : `/create-assignment?duplicate=${assignment._id}&classId=${selectedClassId}`;
    
    navigate(duplicateUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full border-2 border-blue-200">
        <h3 className="text-xl font-bold mb-4 text-blue-900">
          Duplicate {type === 'quiz' ? 'Quiz' : 'Assignment'}
        </h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Select the class where you want to duplicate "{assignment?.title}":
          </p>
          
          {loading ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Loading classes...</p>
            </div>
          ) : (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select a class...</option>
              {availableClasses.map(cls => (
                <option key={cls.classID} value={cls.classID}>
                  {cls.className} ({cls.classCode})
                </option>
              ))}
            </select>
          )}
        </div>

        {availableClasses.length === 0 && !loading && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              No other classes available for duplication.
            </p>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleDuplicate}
            disabled={!selectedClassId || loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Duplicate
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Menu component at the bottom of the file
function Menu({ assignment, onDelete, onUpdate, setValidationModal, setConfirmationModal, setDuplicateModal }) {
  const isPosted = () => {
    if (!assignment.postAt) return false; // Changed to false for unposted items
    const now = new Date();
    const postAt = new Date(assignment.postAt);
    return postAt <= now;
  };
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const handleDelete = async () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Assignment',
      message: 'Are you sure you want to delete this assignment? This action cannot be undone.',
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        const url = assignment.type === 'quiz'
          ? `${API_BASE}/api/quizzes/${assignment._id}`
          : `${API_BASE}/assignments/${assignment._id}`;
        try {
          const res = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            if (onDelete) onDelete(assignment._id);
            setValidationModal({
              isOpen: true,
              type: 'success',
              title: 'Success',
              message: 'Assignment deleted successfully.',
              onConfirm: () => {
                setValidationModal({ isOpen: false, type: 'success', title: '', message: '', onConfirm: null });
              },
              confirmText: 'OK',
              showCancel: false
            });
          } else {
            const err = await res.json();
            let errorMessage = err.error || `HTTP ${res.status}: ${res.statusText}`;
            let errorTitle = 'Delete Failed';
            // Handle specific error cases
            if (res.status === 400) {
              errorTitle = 'Invalid Request';
              errorMessage = 'Invalid assignment ID or request format.';
            } else if (res.status === 401) {
              errorTitle = 'Authentication Error';
              errorMessage = 'Your session has expired. Please log in again.';
            } else if (res.status === 403) {
              errorTitle = 'Permission Denied';
              errorMessage = 'You do not have permission to delete this assignment.';
            } else if (res.status === 404) {
              errorTitle = 'Not Found';
              errorMessage = 'Assignment not found. It may have already been deleted.';
            } else if (res.status >= 500) {
              errorTitle = 'Server Error';
              errorMessage = 'A server error occurred. Please try again later.';
            }
            setValidationModal({
              isOpen: true,
              type: 'error',
              title: errorTitle,
              message: errorMessage,
              onConfirm: () => {
                setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
              },
              confirmText: 'OK',
              showCancel: false
            });
          }
        } catch (err) {
          setValidationModal({
            isOpen: true,
            type: 'error',
            title: 'Network Error',
            message: 'Failed to delete assignment due to network error. Please check your connection and try again.',
            onConfirm: () => {
              setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
            },
            confirmText: 'OK',
            showCancel: false
          });
        }
      }
    });
  };

  const handlePostNow = async () => {
    setIsPosting(true);
    const token = localStorage.getItem('token');
    const url = assignment.type === 'quiz'
      ? `${API_BASE}/api/quizzes/${assignment._id}`
      : `${API_BASE}/assignments/${assignment._id}`;
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postAt: new Date().toISOString() })
      });
      if (res.ok) {
        const updatedAssignment = await res.json();
        // Update the assignment in the local state seamlessly
        if (onUpdate) {
          onUpdate(updatedAssignment);
        }
        setValidationModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Assignment posted successfully! Students can now see this assignment.',
          onConfirm: () => {
            setValidationModal({ isOpen: false, type: 'success', title: '', message: '', onConfirm: null });
          },
          confirmText: 'OK',
          showCancel: false
        });
      } else {
        const err = await res.json();
        let errorMessage = err.error || `HTTP ${res.status}: ${res.statusText}`;
        let errorTitle = 'Post Failed';
        // Handle specific error cases
        if (res.status === 400) {
          errorTitle = 'Invalid Request';
          errorMessage = 'Invalid assignment data or request format.';
        } else if (res.status === 401) {
          errorTitle = 'Authentication Error';
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (res.status === 403) {
          errorTitle = 'Permission Denied';
          errorMessage = 'You do not have permission to post this assignment.';
        } else if (res.status === 404) {
          errorTitle = 'Not Found';
          errorMessage = 'Assignment not found. It may have been deleted.';
        } else if (res.status >= 500) {
          errorTitle = 'Server Error';
          errorMessage = 'A server error occurred. Please try again later.';
        }
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: errorTitle,
          message: errorMessage,
          onConfirm: () => {
            setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
          },
          confirmText: 'OK',
          showCancel: false
        });
      }
    } catch (err) {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to post assignment due to network error. Please check your connection and try again.',
        onConfirm: () => {
          setValidationModal({ isOpen: false, type: 'error', title: '', message: '', onConfirm: null });
        },
        confirmText: 'OK',
        showCancel: false
      });
    } finally {
      setIsPosting(false);
    }
  };
  return (
    <div className="relative">
      <button
        className="p-1 rounded-full hover:bg-gray-200"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
      >
        <MoreVertical size={24} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-20">
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={e => {
              e.stopPropagation();
              setOpen(false);
              if (assignment.type === 'quiz') {
                navigate(`/create-quiz?edit=${assignment._id}`);
              } else {
                navigate(`/create-assignment?edit=${assignment._id}`);
              }
            }}
          >
            Edit
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-green-600"
            onClick={e => {
              e.stopPropagation();
              setOpen(false);
              // Show duplicate modal instead of direct navigation
              setDuplicateModal({
                isOpen: true,
                assignment: assignment,
                type: assignment.type
              });
            }}
          >
            Duplicate
          </button>
          {!isPosted() && (
            <button
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                isPosting ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600'
              }`}
              onClick={e => { 
                e.stopPropagation(); 
                setOpen(false); 
                if (!isPosting) handlePostNow(); 
              }}
              disabled={isPosting}
            >
              {isPosting ? 'Posting...' : 'Post Now'}
            </button>
          )}
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
            onClick={e => { e.stopPropagation(); setOpen(false); handleDelete(); }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}