import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Admin_Navbar from './Admin_Navbar';
import ProfileMenu from '../ProfileMenu';
import { getLogoBase64, getFooterLogoBase64 } from '../../utils/imageToBase64';

const API_BASE = "http://localhost:5000";

// Import icons
import editIcon from "../../assets/editing.png";
import archiveIcon from "../../assets/archive.png";
import tracksIcon from "../../assets/tracks.png";
import strandsIcon from "../../assets/strands.png";
import sectionsIcon from "../../assets/sections.png";
import subjectsIcon from "../../assets/subjects.png";
import facultyIcon from "../../assets/faculty.png";
import studentIcon from "../../assets/student.png";
import termDashboardIcon from "../../assets/termdashboard.png"; // Reverted to dashboard.png as per user's last manual change
import * as XLSX from 'xlsx'; // Add this import for Excel handling
import DependencyWarningModal from './DependencyWarningModal';

// Student School ID validation function (xx-xxxxx format)
const validateStudentSchoolIDFormat = (schoolID) => {
  if (!schoolID || typeof schoolID !== 'string') {
    return false;
  }
  
  // Remove any whitespace
  const trimmedID = schoolID.trim();
  
  // Check if it matches the pattern xx-xxxxx (2 digits, hyphen, 5 digits)
  const studentSchoolIDPattern = /^\d{2}-\d{5}$/;
  
  return studentSchoolIDPattern.test(trimmedID);
};

// Faculty School ID validation function (F000 format)
const validateFacultySchoolIDFormat = (schoolID) => {
  if (!schoolID || typeof schoolID !== 'string') {
    return false;
  }
  
  // Remove any whitespace
  const trimmedID = schoolID.trim();
  
  // Check if it matches the pattern F followed by 3 digits
  const facultySchoolIDPattern = /^F\d{3}$/;
  
  return facultySchoolIDPattern.test(trimmedID);
};

export default function TermDetails({ termData: propTermData, quarterData }) {
  const { termId } = useParams();
  const navigate = useNavigate();
  const importFileInputRef = useRef(null); // Initialize useRef for the file input
  const [activeTab, setActiveTab] = useState('dashboard');
  const [termDetails, setTermDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debug logging for props
  console.log('TermDetails component props:', { propTermData, quarterData, termId });

  // State for Tracks management
  const [trackFormData, setTrackFormData] = useState({
    trackName: '',
    trackType: ''
  });
  const [tracks, setTracks] = useState([]);
  const [trackError, setTrackError] = useState('');
  const [trackSuccess, setTrackSuccess] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);

  // State for Strands management
  const [strandFormData, setStrandFormData] = useState({
    trackId: '',
    strandName: '',
    strandType: ''
  });
  const [strands, setStrands] = useState([]);
  const [strandError, setStrandError] = useState('');
  const [isStrandEditMode, setIsStrandEditMode] = useState(false);
  const [editingStrand, setEditingStrand] = useState(null);
  const [isStrandModalOpen, setIsStrandModalOpen] = useState(false);

  // State for Sections management
  const [sectionFormData, setSectionFormData] = useState({
    trackId: '',
    strandId: '',
    sectionName: '',
    sectionCode: '',
    gradeLevel: ''
  });
  const [sections, setSections] = useState([]);
  const [sectionError, setSectionError] = useState('');
  const [isSectionEditMode, setIsSectionEditMode] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);

  // State for Faculty Assignment management
  const [facultyFormData, setFacultyFormData] = useState({
    facultyId: '',
    trackId: '',
    strandId: '',
    sectionIds: [],
    gradeLevel: '',
    subjectName: '',
  });
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [facultyError, setFacultyError] = useState('');
  const [isFacultyEditMode, setIsFacultyEditMode] = useState(false);
  const [editingFacultyAssignment, setEditingFacultyAssignment] = useState(null);
  const [faculties, setFaculties] = useState([]); // To store faculty users for dropdown
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);

  // State for Student Assignment management
  const [studentFormData, setStudentFormData] = useState({
    studentId: '',
    trackId: '',
    strandId: '',
    sectionIds: [],
    gradeLevel: '',
    enrollmentNo: '',
    enrollmentDate: '',
    lastName: '',
    firstName: ''
  });
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [studentError, setStudentError] = useState('');
  const [isStudentEditMode, setIsStudentEditMode] = useState(false);
  const [editingStudentAssignment, setEditingStudentAssignment] = useState(null);
  const [students, setStudents] = useState([]); // To store student users for dropdown
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [registrants, setRegistrants] = useState([]);

  // Filter states for student assignments
  const [studentSectionFilter, setStudentSectionFilter] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('');
  const [studentSearchFilter, setStudentSearchFilter] = useState('');

  // Filter states for faculty assignments
  const [facultySectionFilter, setFacultySectionFilter] = useState('');
  const [facultyStatusFilter, setFacultyStatusFilter] = useState('');
  const [facultySearchFilter, setFacultySearchFilter] = useState('');

  // Add state for search functionality for Faculty and Students
  const [facultySearchTerm, setFacultySearchTerm] = useState('');
  const [showFacultySuggestions, setShowFacultySuggestions] = useState(false);
  const [facultySearchResults, setFacultySearchResults] = useState([]); // Separate state for search results
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentManualId, setStudentManualId] = useState('');
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  const [studentSearchResults, setStudentSearchResults] = useState([]); // Separate state for search results

  const [excelFile, setExcelFile] = useState(null);

  // State for dependency warning modal
  const [dependencyModal, setDependencyModal] = useState({
    isOpen: false,
    entityName: '',
    entityType: '',
    dependencies: {},
    onConfirm: null
  });
  const [excelError, setExcelError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTracks, setPreviewTracks] = useState([]);
  const [validationStatus, setValidationStatus] = useState({});

  // Add new state for strand Excel handling
  const [strandExcelFile, setStrandExcelFile] = useState(null);
  const [strandPreviewModalOpen, setStrandPreviewModalOpen] = useState(false);
  const [strandPreviewData, setStrandPreviewData] = useState([]);
  const [strandValidationStatus, setStrandValidationStatus] = useState({});

  // Add new state for section Excel handling
  const [sectionExcelFile, setSectionExcelFile] = useState(null);
  const [sectionPreviewModalOpen, setSectionPreviewModalOpen] = useState(false);
  const [sectionPreviewData, setSectionPreviewData] = useState([]);
  const [sectionValidationStatus, setSectionValidationStatus] = useState({});
  const [isSectionUploading, setIsSectionUploading] = useState(false);

  // Add new state for faculty assignment Excel handling
  const [facultyAssignmentExcelFile, setFacultyAssignmentExcelFile] = useState(null);
  const [facultyAssignmentPreviewModalOpen, setFacultyAssignmentPreviewModalOpen] = useState(false);
  const [facultyAssignmentPreviewData, setFacultyAssignmentPreviewData] = useState([]);
  const [facultyAssignmentValidationStatus, setFacultyAssignmentValidationStatus] = useState({});
  const [isFacultyAssignmentUploading, setIsFacultyAssignmentUploading] = useState(false);

  // State for Student Assignment Batch Upload
  const [studentExcelFile, setStudentExcelFile] = useState(null);
  const [studentPreviewModalOpen, setStudentPreviewModalOpen] = useState(false);
  const [studentPreviewData, setStudentPreviewData] = useState([]);
  const [studentValidationStatus, setStudentValidationStatus] = useState({});
  const [isStudentUploading, setIsStudentUploading] = useState(false);
  const [studentExcelError, setStudentExcelError] = useState('');

  // --- SUBJECTS STATE ---
  const [subjects, setSubjects] = useState([]);
  const [subjectFormData, setSubjectFormData] = useState({
    subjectName: '',
    trackName: '',
    strandName: '',
    gradeLevel: ''
  });
  const [subjectError, setSubjectError] = useState('');
  const [isSubjectEditMode, setIsSubjectEditMode] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  
  // Batch upload state for subjects
  const [subjectExcelFile, setSubjectExcelFile] = useState(null);
  const [subjectPreviewModalOpen, setSubjectPreviewModalOpen] = useState(false);
  const [subjectPreviewData, setSubjectPreviewData] = useState([]);
  const [subjectValidationStatus, setSubjectValidationStatus] = useState({});
  const [isSubjectUploading, setIsSubjectUploading] = useState(false);
  const [subjectExcelError, setSubjectExcelError] = useState('');

  // Pagination states (10 per page)
  const ROWS_PER_PAGE = 10;
  const [tracksPage, setTracksPage] = useState(1);
  const [strandsPage, setStrandsPage] = useState(1);
  const [sectionsPage, setSectionsPage] = useState(1);
  const [subjectsPage, setSubjectsPage] = useState(1);
  const [facultyAssignPage, setFacultyAssignPage] = useState(1);
  const [studentAssignPage, setStudentAssignPage] = useState(1);

  const paginate = (items, page, perPage) => {
    const total = items?.length || 0;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    return { slice: (items || []).slice(start, end), totalPages, currentPage };
  };

  // SHOW TRACK MODAL
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showStrandModal, setShowStrandModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  

  // New state for Term Data Import
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importExcelFile, setImportExcelFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importPreviewData, setImportPreviewData] = useState({
    tracks: [],
    strands: [],
    sections: [],
    subjects: [],
    facultyAssignments: [],
    studentAssignments: []
  });
  const [importValidationStatus, setImportValidationStatus] = useState({
    tracks: [],
    strands: [],
    sections: [],
    subjects: [],
    facultyAssignments: [],
    studentAssignments: []
  });
  const [activeImportTab, setActiveImportTab] = useState('tracks'); // Default tab for import modal
  
  // State for validation results modal
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationResults, setValidationResults] = useState({
    tracks: { valid: 0, invalid: 0, details: [] },
    strands: { valid: 0, invalid: 0, details: [] },
    sections: { valid: 0, invalid: 0, details: [] },
    subjects: { valid: 0, invalid: 0, details: [] },
    facultyAssignments: { valid: 0, invalid: 0, details: [] },
    studentAssignments: { valid: 0, invalid: 0, details: [] }
  });
  const [exportingPDF, setExportingPDF] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Term Dashboard', icon: termDashboardIcon },
    { id: 'tracks', label: 'Tracks', icon: tracksIcon },
    { id: 'strands', label: 'Strands', icon: strandsIcon },
    { id: 'sections', label: 'Sections', icon: sectionsIcon },
    { id: 'subjects', label: 'Subjects', icon: subjectsIcon }, // <-- Move this line here
    { id: 'faculty', label: 'Faculty Assignment', icon: facultyIcon },
    { id: 'students', label: 'Enrolled Students', icon: studentIcon },
  ];

  // In a real application, you would fetch term details here using termId
  useEffect(() => {
    console.log('TermDetails useEffect triggered:', { propTermData, quarterData, termId });
    
    // If termData is provided as props (from quarter view), use it directly
    if (propTermData) {
      console.log('Term details loaded from props:', propTermData);
      setTermDetails(propTermData);
      setError(null);
      setLoading(false);
      return;
    }

    // Otherwise, fetch from API using termId from URL params
    const fetchTerm = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE}/api/terms/${termId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        setTermDetails(data);
        setError(null);
      } catch (err) {
        
        setError("Failed to load term details.");
      } finally {
        setLoading(false);
      }
    };

    if (termId) {
      fetchTerm();
    }
  }, [termId, propTermData]);

  // Fetch tracks when term details are loaded
  useEffect(() => {
    if (termDetails) {
      fetchTracks();
      fetchFaculties(); // Fetch faculties when term details are loaded
      fetchStudents(); // Fetch students when term details are loaded
    }
  }, [termDetails]);

  const fetchTracks = async () => {
    try {
      console.log('Fetching tracks for term:', termDetails.termName, 'School Year:', termDetails.schoolYear);
      // Use the more precise endpoint that filters by both schoolYear and termName
      const res = await fetch(`${API_BASE}/api/tracks/termId/${termDetails._id}`);
      if (res.ok) {
        const data = await res.json();
        console.log('Tracks loaded:', data);
        // Deduplicate tracks by _id to prevent React key collisions
        const uniqueTracks = data.filter((track, index, arr) => 
          arr.findIndex(t => t._id === track._id) === index
        );
        setTracks(uniqueTracks);
      } else {
        const data = await res.json();
        console.error('Failed to fetch tracks:', data);
        setTrackError(data.message || 'Failed to fetch tracks');
      }
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setTrackError('Error fetching tracks');
    }
  };

  const fetchFaculties = async () => {
    try {
      console.log('🔍 Fetching faculties...');
      console.log('🔍 API_BASE:', API_BASE);
      console.log('🔍 Full URL:', `${API_BASE}/users/active`);
      const token = localStorage.getItem('token');
      console.log('🔑 Token:', token ? 'Present' : 'Missing');
      
      const res = await fetch(`${API_BASE}/users/active`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📡 Faculty fetch response status:', res.status);
      console.log('📡 Faculty fetch response ok:', res.ok);
      console.log('📡 Faculty fetch response headers:', res.headers);
      
      if (res.ok) {
        const data = await res.json();
        console.log("📊 Fetched all active users (faculties potential):", data);
        console.log("📊 Total users fetched:", data.length);
        
        const facultyUsers = data.filter(user => user.role === 'faculty');
        console.log("👨‍🏫 Filtered faculty users:", facultyUsers);
        console.log("👨‍🏫 Faculty count:", facultyUsers.length);
        
        // Log each faculty user details
        facultyUsers.forEach((faculty, index) => {
          console.log(`👨‍🏫 Faculty ${index + 1}:`, {
            id: faculty._id,
            name: `${faculty.firstname} ${faculty.lastname}`,
            role: faculty.role,
            status: faculty.status,
            isArchived: faculty.isArchived,
            email: faculty.email
          });
        });
        
        setFaculties(facultyUsers);
      } else {
        console.error('❌ Faculty fetch failed with status:', res.status);
        console.error('❌ Faculty fetch response text:', await res.text());
        setFacultyError(`Failed to fetch faculties (Status: ${res.status})`);
      }
    } catch (err) {
      console.error('💥 Error fetching faculties:', err);
      console.error('💥 Error type:', typeof err);
      console.error('💥 Error message:', err.message);
      console.error('💥 Error stack:', err.stack);
      setFacultyError('Error fetching faculties');
    }
  };

  const fetchStudents = async () => {
    try {
      console.log('🔍 Fetching students...');
      const token = localStorage.getItem('token');
      console.log('🔑 Token:', token ? 'Present' : 'Missing');
      
      const res = await fetch(`${API_BASE}/users/active`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📡 Student fetch response status:', res.status);
      console.log('📡 Student fetch response ok:', res.ok);
      
      if (res.ok) {
        const data = await res.json();
        console.log("📊 Fetched all active users (students potential):", data);
        console.log("📊 Total users fetched:", data.length);
        
        const studentUsers = data.filter(user => user.role === 'students');
        console.log("👨‍🎓 Filtered student users:", studentUsers);
        console.log("👨‍🎓 Student count:", studentUsers.length);
        
        // Log each student user details
        studentUsers.forEach((student, index) => {
          console.log(`👨‍🎓 Student ${index + 1}:`, {
            id: student._id,
            name: `${student.firstname} ${student.lastname}`,
            role: student.role,
            status: student.status,
            isArchived: student.isArchived,
            email: student.email
          });
        });
        
        setStudents(studentUsers);
      } else {
        const data = await res.json();
        console.error('❌ Student fetch failed:', data);
        setStudentError(data.message || 'Failed to fetch students');
      }
    } catch (err) {
      console.error('💥 Error fetching students:', err);
      setStudentError('Error fetching students');
    }
  };

  // Fetch strands when tracks are loaded
  useEffect(() => {
    if (tracks.length > 0) {
      fetchStrands();
    }
  }, [tracks, quarterData]);

  const fetchStrands = async () => {
    setStrandError('');
    try {
      const quarterParam = quarterData ? `?quarterName=${encodeURIComponent(quarterData.quarterName)}` : '';
      const res = await fetch(`${API_BASE}/api/strands/schoolyear/${termDetails.schoolYear}/term/${termDetails.termName}${quarterParam}`);
      if (res.ok) {
        const data = await res.json();
        setStrands(data);
      } else {
        const data = await res.json();
        setStrandError(data.message || 'Failed to fetch strands');
      }
    } catch (err) {
      setStrandError('Error fetching strands');
    }
  };

  // Fetch sections when track or strand data changes
  useEffect(() => {
    if (tracks.length > 0 && strands.length > 0) {
      fetchSections();
    }
  }, [tracks, strands, quarterData]);

  const fetchSections = async () => {
    setSectionError('');
    try {
      const allSections = [];
      for (const track of tracks) {
        const strandsInTrack = strands.filter(strand => strand.trackName === track.trackName);
        for (const strand of strandsInTrack) {
          const quarterParam = quarterData ? `&quarterName=${encodeURIComponent(quarterData.quarterName)}` : '';
          const res = await fetch(`${API_BASE}/api/sections/track/${track.trackName}/strand/${strand.strandName}?schoolYear=${termDetails.schoolYear}&termName=${termDetails.termName}${quarterParam}`);
          if (res.ok) {
            const data = await res.json();
            allSections.push(...data);
          } else {
            const data = await res.json();
            setSectionError(data.message || `Failed to fetch sections for track ${track.trackName}, strand ${strand.strandName}`);
            return;
          }
        }
      }
      setSections(allSections);
    } catch (err) {
      setSectionError('Error fetching sections');
    }
  };

  // Handle Track form submission
  const handleAddTrack = async (e) => {
    e.preventDefault();
    if (termDetails.status === 'archived') return;
    setTrackError('');

    if (!trackFormData.trackType) {
      setTrackError('Please select a track type.');
      return;
    }
    
    if (trackFormData.trackType === 'custom' && !trackFormData.trackName.trim()) {
      setTrackError('Custom track name cannot be empty.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackName: trackFormData.trackType === 'custom' ? trackFormData.trackName.trim() : trackFormData.trackType,
          schoolYear: termDetails.schoolYear,
          termName: termDetails.termName,
          quarterName: quarterData ? quarterData.quarterName : undefined
        })
      });

      if (res.ok) {
        const newTrack = await res.json();
        setTracks([...tracks, newTrack]);
        // Audit log: Track Added
        try {
          const token = localStorage.getItem('token');
          fetch(`${API_BASE}/audit-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
              body: JSON.stringify({
                action: 'Track Added',
                details: `Added Track "${newTrack.trackName}" for ${termDetails.schoolYear} ${termDetails.termName}${quarterData ? ` (${quarterData.quarterName})` : ''}`,
                userRole: 'admin'
              })
          }).catch(() => {});
        } catch {}
        window.alert('Track added successfully!');
        setTrackFormData({ trackName: '', trackType: '' }); // Clear form
        setShowTrackModal(false); // Close modal
      } else {
        const data = await res.json();
        setTrackError(data.message || 'Failed to add track');
      }
    } catch (err) {
      setTrackError('Error adding track');
    }
  };

  const handleEditTrack = (track) => {
    setIsEditMode(true);
    setEditingTrack(track);
    setTrackFormData({
      trackName: track.trackName,
      trackType: track.trackName === 'Academic Track' || track.trackName === 'TVL Track' ? track.trackName : 'custom'
    });
    setShowTrackModal(true);
  };
  const handleUpdateTrack = async (e) => {
    e.preventDefault();
    if (termDetails.status === 'archived') return;
    setTrackError('');

    if (!trackFormData.trackType) {
      setTrackError('Please select a track type.');
      return;
    }
    
    if (trackFormData.trackType === 'custom' && !trackFormData.trackName.trim()) {
      setTrackError('Custom track name cannot be empty.');
      return;
    }

    if (window.confirm("Save changes to this track?")) {
      try {
        const res = await fetch(`${API_BASE}/api/tracks/${editingTrack._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackName: trackFormData.trackType === 'custom' ? trackFormData.trackName.trim() : trackFormData.trackType,
            schoolYear: termDetails.schoolYear,
            termName: termDetails.termName
          })
        });

        if (res.ok) {
          const updatedTrack = await res.json();
          setTracks(tracks.map(track =>
            track._id === editingTrack._id ? updatedTrack : track
          ));
          // Audit log: Track Edited
          try {
            const token = localStorage.getItem('token');
            const oldName = editingTrack?.trackName;
            const newName = trackFormData.trackName.trim();
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Track Edited',
                details: `Edited Track "${oldName}" to "${newName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          window.alert('Track updated successfully!');
          setIsEditMode(false);
          setEditingTrack(null);
          setTrackFormData({ trackName: '', trackType: '' });
          setShowTrackModal(false); // Close modal
        } else {
          const data = await res.json();
          setTrackError(data.message || 'Failed to update track');
        }
      } catch (err) {
        setTrackError('Error updating track');
      }
    }
  };

  const handleDeleteTrack = async (track) => {
    if (termDetails.status === 'archived') return;
    
    try {
      // First, check dependencies
      const dependenciesRes = await fetch(`${API_BASE}/api/tracks/${track._id}/dependencies`);
      
      if (dependenciesRes.ok) {
        const dependencies = await dependenciesRes.json();
        
        if (dependencies.totalConnections > 0) {
          // Show detailed dependency modal
          const message = `⚠️ WARNING: Deleting this track will also delete ALL connected data!\n\n` +
            `📊 CONNECTED DATA:\n` +
            `• ${dependencies.strands.length} Strands\n` +
            `• ${dependencies.sections.length} Sections\n` +
            `• ${dependencies.subjects.length} Subjects\n` +
            `• ${dependencies.studentAssignments.length} Enrolled Students\n` +
            `• ${dependencies.facultyAssignments.length} Faculty Assignments\n\n` +
            `Total: ${dependencies.totalConnections} connected records\n\n` +
            `This action CANNOT be undone!\n\n` +
            `Do you want to proceed?`;
            
          if (!window.confirm(message)) {
            return;
          }
        } else {
          // No dependencies, simple confirmation
          if (!window.confirm(`Are you sure you want to delete the track "${track.trackName}"?`)) {
            return;
          }
        }
        
        // Proceed with deletion (with cascade if needed)
        const deleteRes = await fetch(`${API_BASE}/api/tracks/${track._id}?confirmCascade=true`, {
          method: 'DELETE'
        });

        if (deleteRes.ok) {
          // Refresh all data since we may have deleted related records
          fetchTracks();
          fetchStrands();
          fetchSections();
          fetchSubjects();
          fetchFacultyAssignments();
          fetchStudentAssignments();
          // Audit log: Track Deleted
          try {
            const token = localStorage.getItem('token');
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Track Deleted',
                details: `Deleted Track "${track.trackName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          
          window.alert('Track and all connected data deleted successfully!');
        } else {
          const data = await deleteRes.json();
          setTrackError(data.message || 'Failed to delete track');
        }
      } else {
        setTrackError('Failed to check track dependencies');
      }
    } catch (err) {
      setTrackError('Error deleting track');
      console.error('Error in handleDeleteTrack:', err);
    }
  };

  // Handle Strand form submission
  const handleAddStrand = async (e) => {
    e.preventDefault();
    if (termDetails.status === 'archived') return;
    setStrandError('');

    if (!strandFormData.trackId || !strandFormData.strandType) {
      setStrandError('Track Name and Strand Type cannot be empty.');
      return;
    }
    
    if (strandFormData.strandType === 'custom' && !strandFormData.strandName.trim()) {
      setStrandError('Custom strand name cannot be empty.');
      return;
    }

    const selectedTrack = tracks.find(track => track._id === strandFormData.trackId);
    if (!selectedTrack) {
      setStrandError('Selected track not found.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/strands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strandName: strandFormData.strandType === 'custom' ? strandFormData.strandName.trim() : strandFormData.strandType,
          trackName: selectedTrack.trackName,
          schoolYear: termDetails.schoolYear,
          termName: termDetails.termName,
          quarterName: quarterData ? quarterData.quarterName : undefined
        })
      });

      if (res.ok) {
        const newStrand = await res.json();
        setStrands([...strands, newStrand]);
        // Audit log: Strand Added
        try {
          const token = localStorage.getItem('token');
          fetch(`${API_BASE}/audit-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              action: 'Strand Added',
              details: `Added Strand "${newStrand.strandName}" under Track "${selectedTrack.trackName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
              userRole: 'admin'
            })
          }).catch(() => {});
        } catch {}
        window.alert('Strand added successfully!');
        setStrandFormData({ trackId: '', strandName: '', strandType: '' }); // Clear form
        setIsStrandModalOpen(false); // Close modal
      } else {
        const data = await res.json();
        setStrandError(data.message || 'Failed to add strand');
      }
    } catch (err) {
      setStrandError('Error adding strand');
    }
  };

  const handleEditStrand = (strand) => {
    setIsStrandEditMode(true);
    setEditingStrand(strand);
    setStrandFormData({ 
      trackId: strand.trackId, 
      strandName: strand.strandName,
      strandType: strand.strandName === 'Accountancy, Business and Management (ABM)' || 
                  strand.strandName === 'General Academic Strand (GAS)' || 
                  strand.strandName === 'Humanities and Social Sciences (HUMSS)' || 
                  strand.strandName === 'Science, Technology, Engineering, and Mathematics (STEM)' ||
                  strand.strandName === 'Housekeeping' || 
                  strand.strandName === 'Cookery' || 
                  strand.strandName === 'Food and Beverage Services' || 
                  strand.strandName === 'Bread and Pastry Production' ? strand.strandName : 'custom'
    });
    setIsStrandModalOpen(true);
  };
  const handleUpdateStrand = async (e) => {
    e.preventDefault();
    if (termDetails.status === 'archived') return;
    setStrandError('');

    if (!strandFormData.trackId || !strandFormData.strandType) {
      setStrandError('Track Name and Strand Type cannot be empty.');
      return;
    }
    
    if (strandFormData.strandType === 'custom' && !strandFormData.strandName.trim()) {
      setStrandError('Custom strand name cannot be empty.');
      return;
    }

    const selectedTrack = tracks.find(track => track._id === strandFormData.trackId);
    if (!selectedTrack) {
      setStrandError('Selected track not found.');
      return;
    }

    if (window.confirm("Save changes to this strand?")) {
      try {
        const res = await fetch(`${API_BASE}/api/strands/${editingStrand._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            strandName: strandFormData.strandType === 'custom' ? strandFormData.strandName.trim() : strandFormData.strandType,
            trackName: selectedTrack.trackName,
            schoolYear: termDetails.schoolYear,
            termName: termDetails.termName
          })
        });

        if (res.ok) {
          const updatedStrand = await res.json();
          setStrands(strands.map(strand =>
            strand._id === editingStrand._id ? updatedStrand : strand
          ));
          // Audit log: Strand Edited
          try {
            const token = localStorage.getItem('token');
            const oldName = editingStrand?.strandName;
            const newName = strandFormData.strandName.trim();
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Strand Edited',
                details: `Edited Strand "${oldName}" to "${newName}" under Track "${selectedTrack.trackName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          window.alert('Strand updated successfully!');
          setIsStrandEditMode(false);
          setEditingStrand(null);
          setStrandFormData({ trackId: '', strandName: '', strandType: '' });
          setIsStrandModalOpen(false); // Close modal
        } else {
          const data = await res.json();
          setStrandError(data.message || 'Failed to update strand');
        }
      } catch (err) {
        setStrandError('Error updating strand');
      }
    }
  };

  const handleDeleteStrand = async (strand) => {
    if (termDetails.status === 'archived') return;
    
    try {
      // First, check dependencies
      const dependenciesRes = await fetch(`${API_BASE}/api/strands/${strand._id}/dependencies`);
      
      if (dependenciesRes.ok) {
        const dependencies = await dependenciesRes.json();
        
        if (dependencies.totalConnections > 0) {
          // Show detailed dependency modal
          const message = `⚠️ WARNING: Deleting this strand will also delete ALL connected data!\n\n` +
            `📊 CONNECTED DATA:\n` +
            `• ${dependencies.sections.length} Sections\n` +
            `• ${dependencies.subjects.length} Subjects\n` +
            `• ${dependencies.studentAssignments.length} Enrolled Students\n` +
            `• ${dependencies.facultyAssignments.length} Faculty Assignments\n\n` +
            `Total: ${dependencies.totalConnections} connected records\n\n` +
            `This action CANNOT be undone!\n\n` +
            `Do you want to proceed?`;
            
          if (!window.confirm(message)) {
            return;
          }
        } else {
          // No dependencies, simple confirmation
          if (!window.confirm(`Are you sure you want to delete the strand "${strand.strandName}"?`)) {
            return;
          }
        }
        
        // Proceed with deletion (with cascade if needed)
        const deleteRes = await fetch(`${API_BASE}/api/strands/${strand._id}?confirmCascade=true`, {
          method: 'DELETE'
        });

        if (deleteRes.ok) {
          // Refresh all data since we may have deleted related records
          fetchStrands();
          fetchSections();
          fetchSubjects();
          fetchFacultyAssignments();
          fetchStudentAssignments();
          // Audit log: Strand Deleted
          try {
            const token = localStorage.getItem('token');
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Strand Deleted',
                details: `Deleted Strand "${strand.strandName}" under Track "${strand.trackName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          
          window.alert('Strand and all connected data deleted successfully!');
        } else {
          const data = await deleteRes.json();
          setStrandError(data.message || 'Failed to delete strand');
        }
      } else {
        setStrandError('Failed to check strand dependencies');
      }
    } catch (err) {
      setStrandError('Error deleting strand');
      console.error('Error in handleDeleteStrand:', err);
    }
  };

  // Function to auto-generate section code from section name
  const generateSectionCode = (sectionName) => {
    if (!sectionName.trim()) return '';
    
    // Split by spaces and get first letter of each word, then join
    const words = sectionName.trim().split(/\s+/);
    const code = words.map(word => word.charAt(0).toUpperCase()).join('');
    
    return code;
  };

  // Handle Section form submission
  const handleAddSection = async (e) => {
    e.preventDefault();
    setSectionError('');

    if (!sectionFormData.trackId || !sectionFormData.strandId || !sectionFormData.sectionName.trim() || !sectionFormData.gradeLevel) {
      setSectionError('All fields are required.');
      return;
    }

    const selectedTrack = tracks.find(track => track._id === sectionFormData.trackId);
    const selectedStrand = strands.find(strand => strand._id === sectionFormData.strandId);

    if (!selectedTrack || !selectedStrand) {
      setSectionError('Selected track or strand not found.');
      return;
    }

    try {
      // Ensure section code is generated if it's empty
      let finalSectionCode = sectionFormData.sectionCode?.trim() || '';
      if (!finalSectionCode) {
        finalSectionCode = generateSectionCode(sectionFormData.sectionName.trim());
        console.log('Generated fallback section code:', finalSectionCode);
      }
      
      // Final safety check - if still empty, create a basic one
      if (!finalSectionCode) {
        finalSectionCode = 'SEC' + Date.now().toString().slice(-4);
        console.log('Emergency fallback section code:', finalSectionCode);
      }
      
      const requestData = {
          sectionName: sectionFormData.sectionName.trim(),
          sectionCode: finalSectionCode,
          trackName: selectedTrack.trackName,
          strandName: selectedStrand.strandName,
          gradeLevel: sectionFormData.gradeLevel,
          schoolYear: termDetails.schoolYear,
          termName: termDetails.termName,
          quarterName: quarterData ? quarterData.quarterName : undefined
      };
      
      console.log('Sending section creation request:', requestData);
      console.log('Final section code being sent:', finalSectionCode);
      console.log('Request data JSON string:', JSON.stringify(requestData));
      console.log('Section code type:', typeof finalSectionCode);
      console.log('Section code length:', finalSectionCode ? finalSectionCode.length : 'undefined');
      
      const res = await fetch(`${API_BASE}/api/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (res.ok) {
        const newSection = await res.json();
        setSections([...sections, newSection]);
        // Audit log: Section Added
        try {
          const token = localStorage.getItem('token');
          fetch(`${API_BASE}/audit-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              action: 'Section Added',
              details: `Added Section "${newSection.sectionName}" (Grade ${newSection.gradeLevel}) under Track "${selectedTrack.trackName}" / Strand "${selectedStrand.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}${quarterData ? ` (${quarterData.quarterName})` : ''}`,
              userRole: 'admin'
            })
          }).catch(() => {});
        } catch {}
        window.alert('Section added successfully!');
        setSectionFormData({ trackId: '', strandId: '', sectionName: '', sectionCode: '', gradeLevel: '' }); // Clear form
      } else {
        const data = await res.json();
        console.error('Section creation failed:', data);
        setSectionError(data.message || 'Failed to add section');
      }
    } catch (err) {
      setSectionError('Error adding section');
    }
  };

  const handleEditSection = (section) => {
    setIsSectionEditMode(true);
    setEditingSection(section);
    setSectionFormData({
      trackId: tracks.find(track => track.trackName === section.trackName)?._id || '',
      strandId: strands.find(strand => strand.strandName === section.strandName && strand.trackName === section.trackName)?._id || '',
      sectionName: section.sectionName,
      sectionCode: section.sectionCode || '',
      gradeLevel: section.gradeLevel || '', // Populate gradeLevel when editing
    });
    setIsSectionModalOpen(true);
  };
  const handleUpdateSection = async (e) => {
    e.preventDefault();
    setSectionError('');

    if (!sectionFormData.trackId || !sectionFormData.strandId || !sectionFormData.sectionName.trim() || !sectionFormData.gradeLevel) {
      setSectionError('All fields are required.');
      return;
    }

    const selectedTrack = tracks.find(track => track._id === sectionFormData.trackId);
    const selectedStrand = strands.find(strand => strand._id === sectionFormData.strandId);

    if (!selectedTrack || !selectedStrand) {
      setSectionError('Selected track or strand not found.');
      return;
    }

    if (window.confirm("Save changes to this section?")) {
      try {
        // Ensure section code is generated if it's empty
        const finalSectionCode = sectionFormData.sectionCode.trim() || generateSectionCode(sectionFormData.sectionName.trim());
        
        const res = await fetch(`${API_BASE}/api/sections/${editingSection._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionName: sectionFormData.sectionName.trim(),
            sectionCode: finalSectionCode,
            trackName: selectedTrack.trackName,
            strandName: selectedStrand.strandName,
            gradeLevel: sectionFormData.gradeLevel, // Update gradeLevel in the request body
          })
        });

        if (res.ok) {
          const updatedSection = await res.json();
          setSections(sections.map(section =>
            section._id === editingSection._id ? updatedSection : section
          ));
          // Audit log: Section Edited
          try {
            const token = localStorage.getItem('token');
            const oldName = editingSection?.sectionName;
            const newName = sectionFormData.sectionName.trim();
            const oldGrade = editingSection?.gradeLevel;
            const newGrade = sectionFormData.gradeLevel;
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Section Edited',
                details: `Edited Section "${oldName}" (Grade ${oldGrade}) to "${newName}" (Grade ${newGrade}) under Track "${selectedTrack.trackName}" / Strand "${selectedStrand.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          window.alert('Section updated successfully!');
          setIsSectionEditMode(false);
          setEditingSection(null);
          setSectionFormData({ trackId: '', strandId: '', sectionName: '', sectionCode: '', gradeLevel: '' }); // Clear form including gradeLevel
        } else {
          const data = await res.json();
          setSectionError(data.message || 'Failed to update section');
        }
      } catch (err) {
        setSectionError('Error updating section');
      }
    }
  };

  const handleDeleteSection = async (section) => {
    if (termDetails.status === 'archived') return;
    
    try {
      // First, check dependencies
      const dependenciesRes = await fetch(`${API_BASE}/api/sections/${section._id}/dependencies`);
      
      if (dependenciesRes.ok) {
        const dependencies = await dependenciesRes.json();
        
        if (dependencies.totalConnections > 0) {
          // Show detailed dependency modal
          const message = `⚠️ WARNING: Deleting this section will also delete ALL connected data!\n\n` +
            `📊 CONNECTED DATA:\n` +
            `• ${dependencies.studentAssignments.length} Enrolled Students\n` +
            `• ${dependencies.facultyAssignments.length} Faculty Assignments\n\n` +
            `Total: ${dependencies.totalConnections} connected records\n\n` +
            `This action CANNOT be undone!\n\n` +
            `Do you want to proceed?`;
            
          if (!window.confirm(message)) {
            return;
          }
        } else {
          // No dependencies, simple confirmation
          if (!window.confirm(`Are you sure you want to delete the section "${section.sectionName}"?`)) {
            return;
          }
        }
        
        // Proceed with deletion (with cascade if needed)
        const deleteRes = await fetch(`${API_BASE}/api/sections/${section._id}?confirmCascade=true`, {
          method: 'DELETE'
        });

        if (deleteRes.ok) {
          // Refresh all data since we may have deleted related records
          fetchSections();
          fetchFacultyAssignments();
          fetchStudentAssignments();
          // Audit log: Section Deleted
          try {
            const token = localStorage.getItem('token');
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Section Deleted',
                details: `Deleted Section "${section.sectionName}" (Grade ${section.gradeLevel}) under Track "${section.trackName}" / Strand "${section.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          
          window.alert('Section and all connected data deleted successfully!');
        } else {
          const data = await deleteRes.json();
          setSectionError(data.message || 'Failed to delete section');
        }
      } else {
        setSectionError('Failed to check section dependencies');
      }
    } catch (err) {
      setSectionError('Error deleting section');
      console.error('Error in handleDeleteSection:', err);
    }
  };

  // Filtered strands based on selected track for Section form dropdown
  const filteredStrandsForSection = strands.filter(strand => {
    const selectedTrack = tracks.find(track => track._id === sectionFormData.trackId);
    return selectedTrack && strand.trackName === selectedTrack.trackName;
  });

  // Filtered strands based on selected track for Faculty Assignment form dropdown
  const filteredStrandsForFaculty = strands.filter(strand => {
    const selectedTrack = tracks.find(track => track._id === facultyFormData.trackId);
    return selectedTrack && strand.trackName === selectedTrack.trackName;
  });

  // Filtered sections based on selected track and strand for Faculty Assignment form dropdown
  const filteredSectionsForFaculty = sections.filter(section => {
    const selectedTrack = tracks.find(track => track._id === facultyFormData.trackId);
    const selectedStrand = strands.find(strand => strand._id === facultyFormData.strandId);
    return selectedTrack && selectedStrand &&
      section.trackName === selectedTrack.trackName &&
      section.strandName === selectedStrand.strandName &&
      section.gradeLevel === facultyFormData.gradeLevel; // Added gradeLevel filter
  });

  // Filtered strands based on selected track for Student Assignment form dropdown
  const filteredStrandsForStudent = strands.filter(strand => {
    const selectedTrack = tracks.find(track => track._id === studentFormData.trackId);
    return selectedTrack && strand.trackName === selectedTrack.trackName;
  });

  // Filtered sections based on selected track and strand for Student Assignment form dropdown
  const filteredSectionsForStudent = sections.filter(section => {
    const selectedTrack = tracks.find(track => track._id === studentFormData.trackId);
    const selectedStrand = strands.find(strand => strand._id === studentFormData.strandId);
    return selectedTrack && selectedStrand && section.trackName === selectedTrack.trackName && section.strandName === selectedStrand.strandName &&
      section.gradeLevel === studentFormData.gradeLevel; // Added gradeLevel filter
  });
  // Handle change for Faculty form (updated to include search)
  const handleChangeFacultyForm = async (e) => {
    const { name, value } = e.target;

    if (name === "facultySearch") {
      setFacultySearchTerm(value);
      setShowFacultySuggestions(true);
      setFacultyFormData(prev => ({ ...prev, facultyId: '' }));

      if (value.trim()) {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(value)}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            const facultyUsers = data.filter(user => user.role === 'faculty');
            // Also filter by school ID if the search term matches a school ID pattern
            const filteredFaculties = facultyUsers.filter(faculty => {
              const searchTerm = value.toLowerCase();
              const fullName = `${faculty.firstname} ${faculty.lastname}`.toLowerCase();
              const schoolID = (faculty.schoolID || '').toLowerCase();
              
              // Extract just the name part if the search term includes school ID in parentheses
              const nameOnly = searchTerm.replace(/\s*\([^)]*\)\s*$/, '').trim();
              
              return fullName.includes(searchTerm) || 
                     schoolID.includes(searchTerm) ||
                     fullName.includes(nameOnly) ||
                     schoolID.includes(nameOnly);
            });
            setFacultySearchResults(filteredFaculties);
          }
        } catch (err) {
          console.error("Error searching faculty:", err);
        }
      }
    } else {
      setFacultyFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Reset strand and section if track changes
    if (name === "trackId") {
      setFacultyFormData(prev => ({
        ...prev,
        strandId: '',
        sectionIds: []
      }));
    }
    // Reset section if strand changes
    if (name === "strandId") {
      setFacultyFormData(prev => ({
        ...prev,
        sectionIds: []
      }));
    }
  };

  // Handle selection of a faculty from suggestions
  const handleSelectFaculty = (faculty) => {
    setFacultyFormData(prev => ({ ...prev, facultyId: faculty._id }));
    setFacultySearchTerm(`${faculty.firstname} ${faculty.lastname} (${faculty.schoolID})`);
    setShowFacultySuggestions(false);
  };

  const handleChangeStudentForm = async (e) => {
    const { name, value } = e.target;

    if (name === "studentSearch") {
      setStudentSearchTerm(value);
      setStudentFormData(prev => ({ ...prev, studentId: '' }));

      if (value.trim()) {
        console.log('🔍 Searching for students with:', value);
        try {
          const token = localStorage.getItem('token');
          console.log('🔑 Token exists:', !!token);
          const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(value)}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log('📡 Search response status:', res.status);
          if (res.ok) {
            const data = await res.json();
            console.log('📊 Raw search data:', data);
            console.log('🔍 Available roles in data:', [...new Set(data.map(user => user.role))]);
            const studentUsers = data.filter(user => user.role === 'students');
            console.log('👥 Student users found:', studentUsers.length);
            if (studentUsers.length === 0) {
              console.log('🔍 First few users for debugging:', data.slice(0, 3).map(user => ({ 
                name: `${user.firstName} ${user.lastName}`, 
                role: user.role,
                schoolID: user.schoolID,
                allKeys: Object.keys(user)
              })));
            }
            // Also filter by name and school ID if the search term matches
            // Make the search more strict to prevent false matches
            const filteredStudents = studentUsers.filter(student => {
              const searchTerm = value.toLowerCase().trim();
              const fullName = `${student.firstname || student.firstName || ''} ${student.lastname || student.lastName || ''}`.toLowerCase();
              const schoolID = (student.schoolID || '').toLowerCase();
              
              // Only match if the search term is at the beginning of the name or is an exact school ID match
              const nameMatch = fullName.startsWith(searchTerm) || fullName.includes(` ${searchTerm}`);
              const schoolIDMatch = schoolID === searchTerm;
              
              return nameMatch || schoolIDMatch;
            });
            console.log('✅ Filtered students:', filteredStudents);
            setStudentSearchResults(filteredStudents);
            setShowStudentSuggestions(true);
          } else {
            console.log('❌ Search failed with status:', res.status);
          }
        } catch (err) {
          console.error("❌ Error searching students:", err);
        }
      } else {
        setStudentSearchResults([]);
        setShowStudentSuggestions(false);
      }
      return;
    } else {
      setStudentFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Reset strand and section if track changes
    if (name === "trackId") {
      setStudentFormData(prev => ({
        ...prev,
        strandId: '',
        sectionIds: []
      }));
    }
    // Reset section if strand changes
    if (name === "strandId") {
      setStudentFormData(prev => ({
        ...prev,
        sectionIds: []
      }));
    }
  };

  // Handle school ID input (just for display, search is done via name)
  const handleSchoolIdChange = (e) => {
    setStudentManualId(e.target.value);
  };

  // Handle selection of a student from suggestions
  const handleSelectStudent = (student) => {
    // Clear any existing manual data first
    setStudentFormData(prev => ({ 
      ...prev, 
      studentId: student._id,
      firstName: '',
      lastName: ''
    }));
    const firstName = student.firstname || student.firstName || 'Unknown';
    const lastName = student.lastname || student.lastName || 'Student';
    setStudentSearchTerm(`${firstName} ${lastName} (${student.schoolID})`);
    setStudentManualId(student.schoolID); // Also populate the school ID field
    setShowStudentSuggestions(false);
    setStudentSearchResults([]);
    console.log('✅ Selected student:', `${firstName} ${lastName}`);
  };

  // Fetch faculty assignments
  const fetchFacultyAssignments = useCallback(async () => {
    if (!termDetails || !termDetails._id) return;

    try {
      setLoading(true);
      setFacultyError('');
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE}/api/faculty-assignments?termId=${termDetails._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Fetched faculty assignments for template (after backend restart):", data); // Re-added console.log
        setFacultyAssignments(data);
      } else {
        const errorData = await res.json();
        setFacultyError(errorData.message || 'Failed to fetch faculty assignments.');
      }
    } catch (err) {
      setFacultyError('Error fetching faculty assignments.');
      console.error("Error in fetchFacultyAssignments:", err);
    } finally {
      setLoading(false);
    }
  }, [termDetails]);

  // Fetch student assignments
  const fetchStudentAssignments = useCallback(async () => {
    if (!termDetails || !termDetails._id) return;

    try {
      setLoading(true);
      setStudentError('');
      const token = localStorage.getItem('token');

      // Build query parameters including quarter filtering
      const params = new URLSearchParams();
      params.append('termId', termDetails._id);
      if (quarterData && quarterData.quarterName) {
        params.append('quarterName', quarterData.quarterName);
      }

      const res = await fetch(`${API_BASE}/api/student-assignments?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Fetched student assignments:", data);
        setStudentAssignments(data);
      } else {
        const errorData = await res.json();
        setStudentError(errorData.message || 'Failed to fetch student assignments.');
      }
    } catch (err) {
      setStudentError('Error fetching student assignments.');
      console.error("Error in fetchStudentAssignments:", err);
    } finally {
      setLoading(false);
    }
  }, [termDetails, quarterData]);

  // Fetch registrants to check approval status
  const fetchRegistrants = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch ALL registrants without pagination
      const res = await fetch(`${API_BASE}/api/registrants?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Fetched registrants:', data.data || []);
        console.log('Total registrants fetched:', (data.data || []).length);
        setRegistrants(data.data || []);
      } else {
        console.error('Failed to fetch registrants');
      }
    } catch (err) {
      console.error('Error fetching registrants:', err);
    }
  }, []);

  useEffect(() => {
    if (termDetails && faculties.length > 0 && tracks.length > 0 && strands.length > 0 && sections.length > 0) {
      fetchFacultyAssignments();
    }
  }, [faculties, tracks, strands, sections, termDetails, fetchFacultyAssignments]);

  useEffect(() => {
    if (termDetails) {
      fetchStudentAssignments();
      fetchRegistrants();
    }
  }, [termDetails, fetchStudentAssignments, fetchRegistrants]);

  // Check if a student is approved in registrations
  const isStudentApproved = (assignment) => {
    // Use the same logic as the table display to get the school ID
    const student = students.find(s => s._id === assignment.studentId);
    const assignmentSchoolId = (student?.schoolID || assignment.studentSchoolID || assignment.schoolID || '').trim();
    
    console.log('=== APPROVAL CHECK DEBUG ===');
    console.log('Assignment:', assignment);
    console.log('Student found:', student);
    console.log('Assignment school ID:', assignmentSchoolId);
    console.log('Available registrants:', registrants);
    
    if (!assignmentSchoolId) {
      console.log('No school ID found for assignment');
      return false;
    }
    
    // For manual assignments (no studentId), check if they are registered and approved
    // Check if it's a manual assignment by looking for studentSchoolID without studentId
    if (!assignment.studentId && (assignment.studentSchoolID || assignment.schoolID)) {
      console.log('Manual assignment - checking against registrants');
      
      // For bulk upload scenarios, check if student is actually registered
      // If this is a bulk upload assignment (has enrollment data), still check registrant status
      if (assignment.enrollmentNo || assignment.enrollmentDate) {
        console.log('Bulk upload assignment detected - checking registrant status');
        // Still check if the student is registered and approved
        const isRegisteredAndApproved = registrants.some(registrant => {
          const registrantSchoolId = (registrant.schoolID || '').trim();
          const match = registrant.status === 'approved' && 
                       registrantSchoolId === assignmentSchoolId;
          
          console.log('Bulk upload - checking registrant:', {
            registrantSchoolId,
            assignmentSchoolId,
            registrantStatus: registrant.status,
            registrantName: `${registrant.firstName} ${registrant.lastName}`,
            match
          });
          
          return match;
        });
        
        console.log('Bulk upload assignment approval result:', isRegisteredAndApproved);
        return isRegisteredAndApproved;
      }
      
      // Check if this student is registered and approved
      const isRegisteredAndApproved = registrants.some(registrant => {
        const registrantSchoolId = (registrant.schoolID || '').trim();
        const match = registrant.status === 'approved' && 
                     registrantSchoolId === assignmentSchoolId;
        
        console.log('Checking registrant:', {
          registrantSchoolId,
          assignmentSchoolId,
          registrantStatus: registrant.status,
          registrantName: `${registrant.firstName} ${registrant.lastName}`,
          match
        });
        
        return match;
      });
      
      console.log('Manual assignment approval result:', isRegisteredAndApproved);
      return isRegisteredAndApproved;
    }
    
    const isApproved = registrants.some(registrant => {
      // Clean and normalize school IDs for comparison
      const registrantSchoolId = (registrant.schoolID || '').trim();
      
      console.log('Comparing:', {
        registrantSchoolId,
        assignmentSchoolId,
        registrantStatus: registrant.status,
        registrantName: `${registrant.firstName} ${registrant.lastName}`,
        assignmentName: assignment.studentName,
        match: registrantSchoolId === assignmentSchoolId
      });
      
      // Check if school IDs match exactly
      return registrant.status === 'approved' && 
             registrantSchoolId === assignmentSchoolId;
    });
    
    console.log('Final approval result:', isApproved);
    console.log('=== END APPROVAL CHECK ===');
    return isApproved;
  };

  // Handle Add Faculty Assignment (updated to use facultySearchTerm and selected facultyId)
  const handleAddFacultyAssignment = async (e) => {
    e.preventDefault();
    setFacultyError('');

    // Ensure facultyId is set from selection or if directly typed and matches exactly
    let facultyToAssign = faculties.find(f => f._id === facultyFormData.facultyId);
    if (!facultyToAssign && facultySearchTerm) {
      const exactMatch = faculties.find(f => `${f.firstname} ${f.lastname}`.toLowerCase() === facultySearchTerm.toLowerCase());
      if (exactMatch) {
        facultyToAssign = exactMatch;
        setFacultyFormData(prev => ({ ...prev, facultyId: exactMatch._id }));
      } else {
        setFacultyError('Please select a faculty from the suggestions or type a valid faculty name.');
        return;
      }
    }

    if (!facultyToAssign || !facultyFormData.trackId || !facultyFormData.strandId || facultyFormData.sectionIds.length === 0) {
      setFacultyError('All fields are required for faculty assignment.');
      return;
    }

    const selectedTrack = tracks.find(track => track._id === facultyFormData.trackId);
    const selectedStrand = strands.find(strand => strand._id === facultyFormData.strandId);
    const selectedSection = sections.find(sec => sec._id === facultyFormData.sectionIds[0]); // Only one section per assignment

    if (!selectedTrack || !selectedStrand || !selectedSection) {
      setFacultyError('Invalid selections for faculty assignment.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE}/api/faculty-assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          facultyId: facultyToAssign._id,
          trackName: selectedTrack.trackName,
          strandName: selectedStrand.strandName,
          sectionName: selectedSection.sectionName,
          subjectName: facultyFormData.subjectName,
          gradeLevel: facultyFormData.gradeLevel,
          termId: termDetails._id, // Add termId to the assignment
          quarterName: quarterData ? quarterData.quarterName : undefined
        })
      });

      if (res.ok) {
        const newAssignment = await res.json();
        // Audit log: Faculty Assignment Added
        try {
          fetch(`${API_BASE}/audit-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              action: 'Faculty Assignment Added',
              details: `Assigned Faculty "${facultyToAssign.firstname} ${facultyToAssign.lastname}" to Section "${selectedSection.sectionName}" (Grade ${facultyFormData.gradeLevel}) for Subject "${facultyFormData.subjectName}" under Track "${selectedTrack.trackName}" / Strand "${selectedStrand.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}${quarterData ? ` (${quarterData.quarterName})` : ''}`,
              userRole: 'admin'
            })
          }).catch(() => {});
        } catch {}
        window.alert('Faculty assigned successfully!');
        fetchFacultyAssignments(); // Refresh assignments list using the new API
        setFacultyFormData({ facultyId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '', subjectName: '' }); // Clear form
        setFacultySearchTerm(''); // Clear search term
      } else {
        const data = await res.json();
        if (data.conflict) {
          setFacultyError(`Subject "${data.conflict.subjectName}" in Section "${data.conflict.sectionName}" is already assigned to ${data.conflict.facultyName}`);
        } else {
          setFacultyError(data.message || 'Failed to assign faculty');
        }
      }
    } catch (err) {
      setFacultyError('Error assigning faculty');
      console.error("Error in handleAddFacultyAssignment:", err);
    }
  };

  // Handle Edit Faculty Assignment (updated to populate search term)
  const handleEditFacultyAssignment = (assignment) => {
    setIsFacultyEditMode(true);
    setEditingFacultyAssignment(assignment);

    // Find the IDs from the names to populate the form correctly
    const trackId = tracks.find(t => t.trackName === assignment.trackName)?._id || '';
    const strandId = strands.find(s => s.strandName === assignment.strandName && s.trackName === assignment.trackName)?._id || '';
    const sectionId = sections.find(s => s.sectionName === assignment.sectionName && s.trackName === assignment.trackName && s.strandName === assignment.strandName)?._id || '';

    const faculty = faculties.find(f => f._id === assignment.facultyId);
    if (faculty) {
      setFacultySearchTerm(`${faculty.firstname} ${faculty.lastname}`);
    } else {
      setFacultySearchTerm('');
    }

    setFacultyFormData({
      facultyId: assignment.facultyId,
      trackId: trackId,
      strandId: strandId,
      sectionIds: sectionId ? [sectionId] : [], // Ensure it's an array for the form
      gradeLevel: assignment.gradeLevel || '',
      subjectName: assignment.subjectName || '',
    });
    setIsFacultyModalOpen(true);
  };
  // Handle Update Faculty Assignment (updated to use facultySearchTerm and selected facultyId)
  const handleUpdateFacultyAssignment = async (e) => {
    e.preventDefault();
    setFacultyError('');

    let facultyToAssign = faculties.find(f => f._id === facultyFormData.facultyId);
    if (!facultyToAssign && facultySearchTerm) {
      const exactMatch = faculties.find(f => `${f.firstname} ${f.lastname}`.toLowerCase() === facultySearchTerm.toLowerCase());
      if (exactMatch) {
        facultyToAssign = exactMatch;
        setFacultyFormData(prev => ({ ...prev, facultyId: exactMatch._id }));
      } else {
        setFacultyError('Please select a faculty from the suggestions or type a valid faculty name.');
        return;
      }
    }

    if (!facultyToAssign || !facultyFormData.trackId || !facultyFormData.strandId || facultyFormData.sectionIds.length === 0) {
      setFacultyError('All fields are required for faculty assignment.');
      return;
    }

    const selectedTrack = tracks.find(track => track._id === facultyFormData.trackId);
    const selectedStrand = strands.find(strand => strand._id === facultyFormData.strandId);
    const selectedSection = sections.find(sec => sec._id === facultyFormData.sectionIds[0]);

    if (!selectedTrack || !selectedStrand || !selectedSection) {
      setFacultyError('Invalid selections for faculty assignment.');
      return;
    }

    if (window.confirm("Save changes to this faculty assignment?")) {
      try {
        const token = localStorage.getItem('token');

        const res = await fetch(`${API_BASE}/api/faculty-assignments/${editingFacultyAssignment._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            facultyId: facultyToAssign._id,
            trackName: selectedTrack.trackName,
            strandName: selectedStrand.strandName,
            sectionName: selectedSection.sectionName,
            subjectName: facultyFormData.subjectName,
            gradeLevel: facultyFormData.gradeLevel,
            termId: termDetails._id, // Ensure termId is also passed
          })
        });

        if (res.ok) {
          const updatedAssignment = await res.json();
          // Audit log: Faculty Assignment Edited
          try {
            const oldFaculty = faculties.find(f => f._id === editingFacultyAssignment.facultyId);
            const oldFacultyName = oldFaculty ? `${oldFaculty.firstname} ${oldFaculty.lastname}` : 'Unknown';
            const newFacultyName = `${facultyToAssign.firstname} ${facultyToAssign.lastname}`;
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Faculty Assignment Edited',
                details: `Edited Faculty Assignment from "${oldFacultyName}" to "${newFacultyName}" for Section "${selectedSection.sectionName}" (Grade ${facultyFormData.gradeLevel}) Subject "${facultyFormData.subjectName}" under Track "${selectedTrack.trackName}" / Strand "${selectedStrand.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          window.alert('Faculty assignment updated successfully!');
          fetchFacultyAssignments(); // Refresh assignments list
          setIsFacultyEditMode(false);
          setEditingFacultyAssignment(null);
          setFacultyFormData({ facultyId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '', subjectName: '' });
          setFacultySearchTerm(''); // Clear search term
        } else {
          const data = await res.json();
          setFacultyError(data.message || 'Failed to update faculty assignment');
        }
      } catch (err) {
        setFacultyError('Error updating faculty assignment');
        console.error("Error in handleUpdateFacultyAssignment:", err);
      }
    }
  };

  const handleDeleteFacultyAssignment = async (assignment) => {
    if (window.confirm("Are you sure you want to remove this faculty assignment?")) {
      try {
        const token = localStorage.getItem('token');

        const res = await fetch(`${API_BASE}/api/faculty-assignments/${assignment._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (res.ok) {
          // Audit log: Faculty Assignment Deleted
          try {
            const faculty = faculties.find(f => f._id === assignment.facultyId);
            const facultyName = faculty ? `${faculty.firstname} ${faculty.lastname}` : 'Unknown';
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Faculty Assignment Deleted',
                details: `Removed Faculty Assignment for "${facultyName}" from Section "${assignment.sectionName}" (Grade ${assignment.gradeLevel}) Subject "${assignment.subjectName}" under Track "${assignment.trackName}" / Strand "${assignment.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          window.alert('Faculty assignment removed successfully!');
          fetchFacultyAssignments(); // Refresh assignments list
        } else {
          const data = await res.json();
          setFacultyError(data.message || 'Failed to remove faculty assignment');
        }
      } catch (err) {
        setFacultyError('Error removing faculty assignment');
        console.error("Error in handleDeleteFacultyAssignment:", err);
      }
    }
  };

  const handleUnarchiveFacultyAssignment = async (assignment) => {
    if (window.confirm("Are you sure you want to unarchive this faculty assignment?")) {
      try {
        const token = localStorage.getItem('token');

        const res = await fetch(`${API_BASE}/api/faculty-assignments/${assignment._id}/unarchive`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (res.ok) {
          // Audit log: Faculty Assignment Unarchived
          try {
            const faculty = faculties.find(f => f._id === assignment.facultyId);
            const facultyName = faculty ? `${faculty.firstname} ${faculty.lastname}` : 'Unknown';
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Faculty Assignment Unarchived',
                details: `Unarchived Faculty Assignment for "${facultyName}" from Section "${assignment.sectionName}" (Grade ${assignment.gradeLevel}) Subject "${assignment.subjectName}" under Track "${assignment.trackName}" / Strand "${assignment.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          window.alert('Faculty assignment unarchived successfully!');
          fetchFacultyAssignments(); // Refresh assignments list
        } else {
          const data = await res.json();
          setFacultyError(data.message || 'Failed to unarchive faculty assignment');
        }
      } catch (err) {
        setFacultyError('Error unarchiving faculty assignment');
        console.error("Error in handleUnarchiveFacultyAssignment:", err);
      }
    }
  };

  const handleAddStudentAssignment = async (e) => {
    e.preventDefault();
    setStudentError('');

    // Check if we have required student information
    const hasStudentInfo = Boolean(studentFormData.studentId) || (studentFormData.firstName && studentFormData.lastName);
    if (!hasStudentInfo || !studentFormData.trackId || !studentFormData.strandId || studentFormData.sectionIds.length === 0 || !studentFormData.gradeLevel) {
      setStudentError('All fields are required for student assignment. Provide student information.');
      return;
    }

    const studentToAssign = students.find(s => s._id === studentFormData.studentId);
    const selectedTrack = tracks.find(track => track._id === studentFormData.trackId);
    const selectedStrand = strands.find(strand => strand._id === studentFormData.strandId);
    const selectedSection = sections.find(sec => sec._id === studentFormData.sectionIds[0]);

    if (!selectedTrack || !selectedStrand || !selectedSection) {
      setStudentError('Invalid selections for student assignment.');
      return;
    }

    // Check if student is enrolled in current term and quarter
    let schoolIdToCheck = '';
    if (studentToAssign) {
      schoolIdToCheck = studentToAssign.schoolID;
    } else if (studentManualId) {
      schoolIdToCheck = studentManualId.trim();
    }

    if (schoolIdToCheck) {
      const isEnrolled = registrants.some(registrant => {
        const registrantSchoolId = (registrant.schoolID || '').trim();
        return registrant.status === 'approved' && 
               registrantSchoolId === schoolIdToCheck &&
               registrant.termName === termDetails.termName &&
               registrant.schoolYear === termDetails.schoolYear;
      });

      if (!isEnrolled) {
        setStudentError('Student is not enrolled in this term and quarter.');
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');

      // Debug logging
      console.log('Creating student assignment with data:', {
        studentToAssign,
        studentFormData,
        studentManualId,
        selectedTrack,
        selectedStrand,
        selectedSection
      });

      const res = await fetch(`${API_BASE}/api/student-assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify((() => {
          const basePayload = {
            trackName: selectedTrack.trackName,
            strandName: selectedStrand.strandName,
            sectionName: selectedSection.sectionName,
            gradeLevel: studentFormData.gradeLevel,
            termId: termDetails._id,
            quarterName: quarterData ? quarterData.quarterName : undefined
          };
          
          let finalPayload;
          if (studentToAssign) {
            finalPayload = { 
              ...basePayload, 
              studentId: studentToAssign._id,
              studentName: `${studentToAssign.firstname || studentToAssign.firstName} ${studentToAssign.lastname || studentToAssign.lastName}`,
              studentSchoolID: studentToAssign.schoolID
            };
          } else {
            // For manual entries, DO NOT send studentId (backend expects ObjectId). Send school ID and names instead.
            const manualSchoolId = studentManualId.trim();
            finalPayload = { 
              ...basePayload, 
              firstName: studentFormData.firstName,
              lastName: studentFormData.lastName,
              enrollmentNo: studentFormData.enrollmentNo,
              enrollmentDate: studentFormData.enrollmentDate
            };
            if (manualSchoolId) {
              finalPayload.studentSchoolID = manualSchoolId;
            }
          }
          
          console.log('Final payload being sent:', finalPayload);
          return finalPayload;
        })())
      });

      if (res.ok) {
        const newAssignment = await res.json();
        // Audit log: Student Assignment Added
        try {
          fetch(`${API_BASE}/audit-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              action: 'Student Assignment Added',
              details: `Assigned Student "${studentToAssign ? `${studentToAssign.firstname} ${studentToAssign.lastname}` : `${studentFormData.firstName} ${studentFormData.lastName}`}" to Section "${selectedSection.sectionName}" (Grade ${studentFormData.gradeLevel}) under Track "${selectedTrack.trackName}" / Strand "${selectedStrand.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}${quarterData ? ` (${quarterData.quarterName})` : ''}`,
              userRole: 'admin'
            })
          }).catch(() => {});
        } catch {}
        window.alert('Student assigned successfully!');
        fetchStudentAssignments();
        setStudentFormData({ studentId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '' });
        setStudentSearchTerm('');
        setStudentManualId('');
      } else {
        const data = await res.json();
        setStudentError(data.message || 'Failed to assign student');
      }
    } catch (err) {
      setStudentError('Error assigning student');
      console.error("Error in handleAddStudentAssignment:", err);
    }
  };

  const handleEditStudentAssignment = (assignment) => {
    setIsStudentEditMode(true);
    setEditingStudentAssignment(assignment);
    setIsStudentModalOpen(true); // This was missing!

    const trackId = tracks.find(t => t.trackName === assignment.trackName)?._id || '';
    const strandId = strands.find(s => s.strandName === assignment.strandName && s.trackName === assignment.trackName)?._id || '';
    const sectionId = sections.find(s => s.sectionName === assignment.sectionName && s.trackName === assignment.trackName && s.strandName === assignment.strandName && s.gradeLevel === assignment.gradeLevel)?._id || '';

    // Use the student name from the assignment data (which includes archived students)
    // or fall back to looking up in the students array for active students
    const student = students.find(s => s._id === assignment.studentId);
    if (assignment.firstName && assignment.lastName) {
      setStudentSearchTerm(`${assignment.firstName} ${assignment.lastName}`);
    } else if (assignment.studentName) {
      setStudentSearchTerm(assignment.studentName);
    } else if (student) {
      setStudentSearchTerm(`${student.firstname} ${student.lastname}`);
    } else {
      setStudentSearchTerm('');
    }

    setStudentFormData({
      studentId: assignment.studentId,
      trackId: trackId,
      strandId: strandId,
      sectionIds: sectionId ? [sectionId] : [],
      gradeLevel: assignment.gradeLevel || '', // Populate gradeLevel
    });
  };
  const handleUpdateStudentAssignment = async (e) => {
    e.preventDefault();
    setStudentError('');

    if (!studentFormData.studentId || !studentFormData.trackId || !studentFormData.strandId || studentFormData.sectionIds.length === 0 || !studentFormData.gradeLevel) {
      setStudentError('All fields are required for student assignment.');
      return;
    }

    const selectedTrack = tracks.find(track => track._id === studentFormData.trackId);
    const selectedStrand = strands.find(strand => strand._id === studentFormData.strandId);
    const selectedSection = sections.find(sec => sec._id === studentFormData.sectionIds[0]);

    if (!selectedTrack || !selectedStrand || !selectedSection) {
      setStudentError('Invalid selections for student assignment.');
      return;
    }

    if (window.confirm("Save changes to this student assignment?")) {
      try {
        const token = localStorage.getItem('token');

        const res = await fetch(`${API_BASE}/api/student-assignments/${editingStudentAssignment._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            studentId: studentFormData.studentId,
            trackName: selectedTrack.trackName,
            strandName: selectedStrand.strandName,
            sectionName: selectedSection.sectionName,
            gradeLevel: studentFormData.gradeLevel, // Update gradeLevel
            termId: termDetails._id,
          })
        });

        if (res.ok) {
          const updatedAssignment = await res.json();
          // Audit log: Student Assignment Edited
          try {
            const oldStudent = students.find(s => s._id === editingStudentAssignment.studentId);
            const oldStudentName = oldStudent ? `${oldStudent.firstname} ${oldStudent.lastname}` : editingStudentAssignment.studentName || 'Unknown';
            const newStudent = students.find(s => s._id === studentFormData.studentId);
            const newStudentName = newStudent ? `${newStudent.firstname} ${newStudent.lastname}` : 'Unknown';
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Student Assignment Edited',
                details: `Edited Student Assignment from "${oldStudentName}" to "${newStudentName}" for Section "${selectedSection.sectionName}" (Grade ${studentFormData.gradeLevel}) under Track "${selectedTrack.trackName}" / Strand "${selectedStrand.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          window.alert('Student assignment updated successfully!');
          fetchStudentAssignments();
          setIsStudentEditMode(false);
          setEditingStudentAssignment(null);
          setStudentFormData({ studentId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '' });
        } else {
          const data = await res.json();
          setStudentError(data.message || 'Failed to update student assignment');
        }
      } catch (err) {
        setStudentError('Error updating student assignment');
        console.error("Error in handleUpdateStudentAssignment:", err);
      }
    }
  };

  const handleDeleteStudentAssignment = async (assignment) => {
    if (window.confirm("Are you sure you want to remove this student assignment?")) {
      try {
        const token = localStorage.getItem('token');

        const res = await fetch(`${API_BASE}/api/student-assignments/${assignment._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (res.ok) {
          // Audit log: Student Assignment Deleted
          try {
            const student = students.find(s => s._id === assignment.studentId);
            const studentName = student ? `${student.firstname} ${student.lastname}` : assignment.studentName || 'Unknown';
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Student Assignment Deleted',
                details: `Removed Student Assignment for "${studentName}" from Section "${assignment.sectionName}" (Grade ${assignment.gradeLevel}) under Track "${assignment.trackName}" / Strand "${assignment.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          window.alert('Student assignment removed successfully!');
          fetchStudentAssignments();
        } else {
          const data = await res.json();
          setStudentError(data.message || 'Failed to remove student assignment');
        }
      } catch (err) {
        setStudentError('Error removing student assignment');
        console.error("Error in handleDeleteStudentAssignment:", err);
      }
    }
  };

  const handleUnarchiveStudentAssignment = async (assignment) => {
    if (window.confirm("Are you sure you want to unarchive this student assignment?")) {
      try {
        const token = localStorage.getItem('token');

        const res = await fetch(`${API_BASE}/api/student-assignments/${assignment._id}/unarchive`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (res.ok) {
          // Audit log: Student Assignment Unarchived
          try {
            const student = students.find(s => s._id === assignment.studentId);
            const studentName = student ? `${student.firstname} ${student.lastname}` : assignment.studentName || 'Unknown';
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Student Assignment Unarchived',
                details: `Unarchived Student Assignment for "${studentName}" from Section "${assignment.sectionName}" (Grade ${assignment.gradeLevel}) under Track "${assignment.trackName}" / Strand "${assignment.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          window.alert('Student assignment unarchived successfully!');
          fetchStudentAssignments(); // Refresh assignments list
        } else {
          const data = await res.json();
          setStudentError(data.message || 'Failed to unarchive student assignment');
        }
      } catch (err) {
        setStudentError('Error unarchiving student assignment');
        console.error("Error in handleUnarchiveStudentAssignment:", err);
      }
    }
  };

  // Generate comprehensive PDF report with all term and quarter details
  const generateComprehensivePDFReport = async () => {
    if (exportingPDF) return;
    
    setExportingPDF(true);
    try {
      console.log('Generating comprehensive PDF report...');
      
      // Get base64 encoded logos
      const logoBase64 = await getLogoBase64();
      const footerLogoBase64 = await getFooterLogoBase64();
      
      // Create a comprehensive HTML report
      const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>JUANLMS Comprehensive Report</title>
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
            .section { margin: 30px 0; page-break-inside: avoid; }
            .section h3 { color: #00418B; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #00418B; color: white; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
            .stat-card { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #00418B; }
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
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <div class="logo">
                <img src="${logoBase64 || '/src/assets/logo/San_Juan_De_Dios_Hospital_seal.png'}" alt="San Juan de Dios Hospital Seal" />
              </div>
            </div>
            <div class="institution-info">
              <h1 class="institution-name">SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.</h1>
              <p class="institution-address">2772-2774 Roxas Boulevard, Pasay City 1300 Philippines</p>
              <p class="institution-accreditation">PAASCU Accredited - COLLEGE</p>
            </div>
            
          </div>

          <div class="section">
          <div class="report-info">
              <p class="report-title">Comprehensive Academic Report</p>
              <p class="report-date">Date: ${new Date().toLocaleDateString()}</p>
            </div>
            <h3>TERM OVERVIEW</h3>
            <div class="stats">
              <div class="stat-card">
                <strong>Term Name:</strong><br>${termDetails.termName}
              </div>
              <div class="stat-card">
                <strong>School Year:</strong><br>${termDetails.schoolYear}
              </div>
              <div class="stat-card">
                <strong>Status:</strong><br>${termDetails.status}
              </div>
              <div class="stat-card">
                <strong>Created:</strong><br>${new Date(termDetails.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div class="section">
            <h3>SUMMARY STATISTICS</h3>
            <div class="stats">
              <div class="stat-card">
                <strong>Total Tracks:</strong><br>${tracks.filter(t => t.status === 'active').length}
              </div>
              <div class="stat-card">
                <strong>Total Strands:</strong><br>${strands.filter(s => s.status === 'active').length}
              </div>
              <div class="stat-card">
                <strong>Total Sections:</strong><br>${sections.filter(s => s.status === 'active').length}
              </div>
              <div class="stat-card">
                <strong>Total Subjects:</strong><br>${subjects.filter(s => s.status === 'active').length}
              </div>
              <div class="stat-card">
                <strong>Faculty Assignments:</strong><br>${facultyAssignments.filter(fa => fa.status === 'active').length}
              </div>
              <div class="stat-card">
                <strong>Enrolled Students:</strong><br>${studentAssignments.filter(sa => sa.status === 'active').length}
              </div>
              <div class="stat-card">
                <strong>Active Students:</strong><br>${studentAssignments.filter(sa => sa.status === 'active' && isStudentApproved(sa)).length}
              </div>
              <div class="stat-card">
                <strong>Pending Approval:</strong><br>${studentAssignments.filter(sa => sa.status === 'active' && !isStudentApproved(sa)).length}
              </div>
            </div>
          </div>

          <div class="section">
            <h3>TRACKS</h3>
            <table>
              <thead>
                <tr>
                  <th>Track Name</th>
                  <th>Status</th>
                  <th>School Year</th>
                  <th>Term Name</th>
                </tr>
              </thead>
              <tbody>
                ${tracks.filter(t => t.status === 'active').map(track => `
                  <tr>
                    <td>${track.trackName}</td>
                    <td>${track.status}</td>
                    <td>${track.schoolYear}</td>
                    <td>${track.termName}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>STRANDS</h3>
            <table>
              <thead>
                <tr>
                  <th>Strand Name</th>
                  <th>Track Name</th>
                  <th>Status</th>
                  <th>School Year</th>
                  <th>Term Name</th>
                </tr>
              </thead>
              <tbody>
                ${strands.filter(s => s.status === 'active').map(strand => `
                  <tr>
                    <td>${strand.strandName}</td>
                    <td>${strand.trackName}</td>
                    <td>${strand.status}</td>
                    <td>${strand.schoolYear}</td>
                    <td>${strand.termName}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>SECTIONS</h3>
            <table>
              <thead>
                <tr>
                  <th>Section Name</th>
                  <th>Track Name</th>
                  <th>Strand Name</th>
                  <th>Grade Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${sections.filter(s => s.status === 'active').map(section => `
                  <tr>
                    <td>${section.sectionName}</td>
                    <td>${section.trackName}</td>
                    <td>${section.strandName}</td>
                    <td>${section.gradeLevel}</td>
                    <td>${section.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>SUBJECTS</h3>
            <table>
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th>Subject Code</th>
                  <th>Track Name</th>
                  <th>Strand Name</th>
                  <th>Grade Level</th>
                </tr>
              </thead>
              <tbody>
                ${subjects.filter(s => s.status === 'active').map(subject => `
                  <tr>
                    <td>${subject.subjectName}</td>
                    <td>${subject.subjectCode}</td>
                    <td>${subject.trackName}</td>
                    <td>${subject.strandName}</td>
                    <td>${subject.gradeLevel}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>FACULTY ASSIGNMENTS</h3>
            <table>
              <thead>
                <tr>
                  <th>Faculty Name</th>
                  <th>Faculty School ID</th>
                  <th>Subject Name</th>
                  <th>Track Name</th>
                  <th>Strand Name</th>
                  <th>Section Name</th>
                  <th>Grade Level</th>
                </tr>
              </thead>
              <tbody>
                ${facultyAssignments.filter(fa => fa.status === 'active').map(assignment => {
                  const faculty = faculties.find(f => f._id === assignment.facultyId);
                  return `
                    <tr>
                      <td>${faculty ? `${faculty.firstname} ${faculty.lastname}` : 'Unknown'}</td>
                      <td>${faculty?.schoolID || ''}</td>
                      <td>${assignment.subjectName}</td>
                      <td>${assignment.trackName}</td>
                      <td>${assignment.strandName}</td>
                      <td>${assignment.sectionName}</td>
                      <td>${assignment.gradeLevel}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>STUDENT ASSIGNMENTS</h3>
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Student School ID</th>
                  <th>Track Name</th>
                  <th>Strand Name</th>
                  <th>Section Name</th>
                  <th>Grade Level</th>
                  <th>Approval Status</th>
                </tr>
              </thead>
              <tbody>
                ${studentAssignments.filter(sa => sa.status === 'active').map(assignment => {
                  const student = students.find(s => s._id === assignment.studentId);
                  const schoolId = student?.schoolID || assignment.studentSchoolID || assignment.schoolID || '';
                  const approvalStatus = isStudentApproved(assignment) ? 'Approved' : 'Pending Approval';
                  
                  return `
                    <tr>
                      <td>${assignment.firstName && assignment.lastName ? `${assignment.firstName} ${assignment.lastName}` : assignment.studentName || 'Unknown'}</td>
                      <td>${schoolId}</td>
                      <td>${assignment.trackName}</td>
                      <td>${assignment.strandName}</td>
                      <td>${assignment.sectionName}</td>
                      <td>${assignment.gradeLevel}</td>
                      <td>${approvalStatus}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>


          <div class="footer">
            <div class="footer-left">
              <p>Hospital Tel. Nos: 831-9731/36;831-5641/49 www.sanjuandedios.org College Tel.Nos.: 551-2756; 551-2763 www.sjdefi.edu.ph</p>
            </div>
            <div class="footer-right">
              <div class="footer-logo"> 
                <img src="${footerLogoBase64 || '/src/assets/logo/images.png'}" alt="San Juan de Dios Hospital Seal" />
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Open the report in a new window for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      printWindow.onload = function() {
        printWindow.print();
      };
      
      console.log('Comprehensive PDF report generated successfully!');
      
      
    } catch (error) {
      console.error('Error generating comprehensive PDF report:', error);
      window.alert('Error generating comprehensive PDF report. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Generate comprehensive report with all term and quarter details
  const generateComprehensiveReport = async () => {
    try {
      console.log('Generating comprehensive report...');
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Helper function to add header and footer to worksheets
      const addHeaderFooter = (ws, title, data) => {
        // Add header
        const headerRow = [
          ['JUANLMS - Learning Management System'],
          ['Comprehensive Academic Report'],
          [`${termDetails.schoolYear} - ${termDetails.termName}`],
          [`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`],
          [''],
          [title],
          ['']
        ];
        
        // Combine header with data
        const fullData = [...headerRow, ...data];
        
        // Add footer
        const footerRow = [
          [''],
          ['Report generated by JUANLMS System'],
          [`© ${new Date().getFullYear()} JuanLMS. All rights reserved.`]
        ];
        
        return [...fullData, ...footerRow];
      };
      
      // 1. TERM OVERVIEW SHEET
      const termOverviewData = [
        ['TERM OVERVIEW'],
        [''],
        ['Term Name', termDetails.termName],
        ['School Year', termDetails.schoolYear],
        ['Status', termDetails.status],
        ['Created At', new Date(termDetails.createdAt).toLocaleDateString()],
        ['Updated At', new Date(termDetails.updatedAt).toLocaleDateString()],
        [''],
        ['SUMMARY STATISTICS'],
        [''],
        ['Total Tracks', tracks.filter(t => t.status === 'active').length],
        ['Total Strands', strands.filter(s => s.status === 'active').length],
        ['Total Sections', sections.filter(s => s.status === 'active').length],
        ['Total Subjects', subjects.filter(s => s.status === 'active').length],
        ['Total Faculty Assignments', facultyAssignments.filter(fa => fa.status === 'active').length],
        ['Total Enrolled Students', studentAssignments.filter(sa => sa.status === 'active').length],
        ['Active Students', studentAssignments.filter(sa => sa.status === 'active' && isStudentApproved(sa)).length],
        ['Pending Approval Students', studentAssignments.filter(sa => sa.status === 'active' && !isStudentApproved(sa)).length]
      ];
      
      const termOverviewWs = XLSX.utils.aoa_to_sheet(addHeaderFooter([], 'TERM OVERVIEW', termOverviewData));
      XLSX.utils.book_append_sheet(wb, termOverviewWs, 'Term Overview');
      
      // 2. TRACKS SHEET
      const tracksData = [
        ['Track Name', 'Status', 'School Year', 'Term Name', 'Created At']
      ].concat(
        tracks.filter(t => t.status === 'active').map(track => [
          track.trackName,
          track.status,
          track.schoolYear,
          track.termName,
          new Date(track.createdAt).toLocaleDateString()
        ])
      );
      
      const tracksWs = XLSX.utils.aoa_to_sheet(addHeaderFooter([], 'TRACKS', tracksData));
      XLSX.utils.book_append_sheet(wb, tracksWs, 'Tracks');
      
      // 3. STRANDS SHEET
      const strandsData = [
        ['Strand Name', 'Track Name', 'Status', 'School Year', 'Term Name', 'Created At']
      ].concat(
        strands.filter(s => s.status === 'active').map(strand => [
          strand.strandName,
          strand.trackName,
          strand.status,
          strand.schoolYear,
          strand.termName,
          new Date(strand.createdAt).toLocaleDateString()
        ])
      );
      
      const strandsWs = XLSX.utils.aoa_to_sheet(addHeaderFooter([], 'STRANDS', strandsData));
      XLSX.utils.book_append_sheet(wb, strandsWs, 'Strands');
      
      // 4. SECTIONS SHEET
      const sectionsData = [
        ['Section Name', 'Track Name', 'Strand Name', 'Grade Level', 'Status', 'School Year', 'Term Name', 'Created At']
      ].concat(
        sections.filter(s => s.status === 'active').map(section => [
          section.sectionName,
          section.trackName,
          section.strandName,
          section.gradeLevel,
          section.status,
          section.schoolYear,
          section.termName,
          new Date(section.createdAt).toLocaleDateString()
        ])
      );
      
      const sectionsWs = XLSX.utils.aoa_to_sheet(addHeaderFooter([], 'SECTIONS', sectionsData));
      XLSX.utils.book_append_sheet(wb, sectionsWs, 'Sections');
      
      // 5. SUBJECTS SHEET
      const subjectsData = [
        ['Subject Name', 'Subject Code', 'Track Name', 'Strand Name', 'Grade Level', 'Status', 'School Year', 'Term Name', 'Created At']
      ].concat(
        subjects.filter(s => s.status === 'active').map(subject => [
          subject.subjectName,
          subject.subjectCode,
          subject.trackName,
          subject.strandName,
          subject.gradeLevel,
          subject.status,
          subject.schoolYear,
          subject.termName,
          new Date(subject.createdAt).toLocaleDateString()
        ])
      );
      
      const subjectsWs = XLSX.utils.aoa_to_sheet(addHeaderFooter([], 'SUBJECTS', subjectsData));
      XLSX.utils.book_append_sheet(wb, subjectsWs, 'Subjects');
      
      // 6. FACULTY ASSIGNMENTS SHEET
      const facultyAssignmentsData = [
        ['Faculty Name', 'Faculty School ID', 'Subject Name', 'Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Status', 'School Year', 'Term Name', 'Created At']
      ].concat(
        facultyAssignments.filter(fa => fa.status === 'active').map(assignment => {
          const faculty = faculties.find(f => f._id === assignment.facultyId);
          return [
            faculty ? `${faculty.firstname} ${faculty.lastname}` : 'Unknown',
            faculty?.schoolID || '',
            assignment.subjectName,
            assignment.trackName,
            assignment.strandName,
            assignment.sectionName,
            assignment.gradeLevel,
            assignment.status,
            assignment.schoolYear,
            assignment.termName,
            new Date(assignment.createdAt).toLocaleDateString()
          ];
        })
      );
      
      const facultyAssignmentsWs = XLSX.utils.aoa_to_sheet(addHeaderFooter([], 'FACULTY ASSIGNMENTS', facultyAssignmentsData));
      XLSX.utils.book_append_sheet(wb, facultyAssignmentsWs, 'Faculty Assignments');
      
      // 7. STUDENT ASSIGNMENTS SHEET
      const studentAssignmentsData = [
        ['Student Name', 'Student School ID', 'Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Status', 'Approval Status', 'School Year', 'Term Name', 'Created At']
      ].concat(
        studentAssignments.filter(sa => sa.status === 'active').map(assignment => {
          const student = students.find(s => s._id === assignment.studentId);
          const schoolId = student?.schoolID || assignment.studentSchoolID || assignment.schoolID || '';
          const approvalStatus = isStudentApproved(assignment) ? 'Approved' : 'Pending Approval';
          
          return [
            assignment.firstName && assignment.lastName ? `${assignment.firstName} ${assignment.lastName}` : assignment.studentName || 'Unknown',
            schoolId,
            assignment.trackName,
            assignment.strandName,
            assignment.sectionName,
            assignment.gradeLevel,
            assignment.status,
            approvalStatus,
            assignment.schoolYear,
            assignment.termName,
            new Date(assignment.createdAt).toLocaleDateString()
          ];
        })
      );
      
      const studentAssignmentsWs = XLSX.utils.aoa_to_sheet(addHeaderFooter([], 'STUDENT ASSIGNMENTS', studentAssignmentsData));
      XLSX.utils.book_append_sheet(wb, studentAssignmentsWs, 'Enrolled Students');
      
      // 8. REGISTRANTS SHEET
      const registrantsData = [
        ['First Name', 'Middle Name', 'Last Name', 'School ID', 'Track Name', 'Strand Name', 'Section Name', 'Personal Email', 'Contact No.', 'Status', 'Date', 'Created At']
      ].concat(
        registrants.map(registrant => [
          registrant.firstName,
          registrant.middleName || '',
          registrant.lastName,
          registrant.schoolID,
          registrant.trackName || '',
          registrant.strandName || '',
          registrant.sectionName || '',
          registrant.personalEmail,
          registrant.contactNo,
          registrant.status,
          registrant.date,
          new Date(registrant.createdAt).toLocaleDateString()
        ])
      );
      
      const registrantsWs = XLSX.utils.aoa_to_sheet(addHeaderFooter([], 'REGISTRANTS', registrantsData));
      XLSX.utils.book_append_sheet(wb, registrantsWs, 'Registrants');
      
      // 9. SUMMARY STATISTICS SHEET
      const summaryData = [
        ['CATEGORY', 'TOTAL', 'ACTIVE', 'ARCHIVED', 'PENDING'],
        ['Tracks', tracks.length, tracks.filter(t => t.status === 'active').length, tracks.filter(t => t.status === 'archived').length, 0],
        ['Strands', strands.length, strands.filter(s => s.status === 'active').length, strands.filter(s => s.status === 'archived').length, 0],
        ['Sections', sections.length, sections.filter(s => s.status === 'active').length, sections.filter(s => s.status === 'archived').length, 0],
        ['Subjects', subjects.length, subjects.filter(s => s.status === 'active').length, subjects.filter(s => s.status === 'archived').length, 0],
        ['Faculty Assignments', facultyAssignments.length, facultyAssignments.filter(fa => fa.status === 'active').length, facultyAssignments.filter(fa => fa.status === 'archived').length, 0],
        ['Enrolled Students', studentAssignments.length, studentAssignments.filter(sa => sa.status === 'active').length, studentAssignments.filter(sa => sa.status === 'archived').length, 0],
        [''],
        ['STUDENT APPROVAL STATUS'],
        ['Approved Students', studentAssignments.filter(sa => sa.status === 'active' && isStudentApproved(sa)).length],
        ['Pending Approval Students', studentAssignments.filter(sa => sa.status === 'active' && !isStudentApproved(sa)).length],
        [''],
        ['REGISTRANT STATUS'],
        ['Approved Registrants', registrants.filter(r => r.status === 'approved').length],
        ['Pending Registrants', registrants.filter(r => r.status === 'pending').length],
        ['Rejected Registrants', registrants.filter(r => r.status === 'rejected').length]
      ];
      
      const summaryWs = XLSX.utils.aoa_to_sheet(addHeaderFooter([], 'SUMMARY STATISTICS', summaryData));
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary Statistics');
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `JUANLMS_Comprehensive_Report_${termDetails.schoolYear}_${termDetails.termName}_${timestamp}.xlsx`;
      
      // Save the file
      XLSX.writeFile(wb, filename);
      
      console.log('Comprehensive report generated successfully!');
      window.alert('Comprehensive report generated successfully!');
      
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      window.alert('Error generating comprehensive report. Please try again.');
    }
  };

  // Add these new functions for Excel handling
  const downloadTemplate = async () => {
    try {
      // Create a workbook with two sheets
      const wb = XLSX.utils.book_new();

      // Sheet 1: Template for adding new tracks with complete school details
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.'],
        ['2772-2774 Roxas Boulevard, Pasay City 1300 Philippines'],
        ['PAASCU Accredited - COLLEGE'],
        [''], // Empty row
        ['ACADEMIC TRACKS MANAGEMENT'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Academic Year: ${termDetails.schoolYear}`],
        [`Term: ${termDetails.termName}`],
        [''], // Empty row
        ['Track Name to Add'], // Headers
      ]);
      
      // Set column widths
      templateWs['!cols'] = [{ wch: 20 }];
      
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Tracks');

      // Sheet 2: Current tracks in the system (only active) with complete school details
      const activeTracks = tracks.filter(track => track.status === 'active');
      const currentTracksData = [
        ['SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.'],
        ['2772-2774 Roxas Boulevard, Pasay City 1300 Philippines'],
        ['PAASCU Accredited - COLLEGE'],
        [''], // Empty row
        ['CURRENT ACADEMIC TRACKS'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Academic Year: ${termDetails.schoolYear}`],
        [`Term: ${termDetails.termName}`],
        [''], // Empty row
        ['Track Name', 'School Year', 'Term Name', 'Status'], // Headers
        ...activeTracks.map(track => [
          track.trackName,
          track.schoolYear,
          track.termName,
          track.status
        ])
      ];

      const currentTracksWs = XLSX.utils.aoa_to_sheet(currentTracksData);

      // Set column widths for better readability
      const wscols = [
        { wch: 20 }, // Track Name
        { wch: 15 }, // School Year
        { wch: 15 }, // Term Name
        { wch: 10 }  // Status
      ];
      currentTracksWs['!cols'] = wscols;

      XLSX.utils.book_append_sheet(wb, currentTracksWs, 'Current Tracks');

      // Generate and download the file
      XLSX.writeFile(wb, 'tracks_template.xlsx');
    } catch (error) {
      console.error('Error generating template:', error);
      setError('Failed to generate template. Please try again.');
    }
  };
  const validateTracks = async (tracksToValidate) => {
    const status = {};
    const trackNames = new Set();

    // Check for duplicates within the uploaded data
    tracksToValidate.forEach((track, index) => {
      const trackName = track.trackName.trim();
      if (trackNames.has(trackName)) {
        status[index] = {
          valid: false,
          message: 'Duplicate track name in upload'
        };
      } else {
        trackNames.add(trackName);
        status[index] = { valid: true, message: 'Valid' };
      }
    });

    // Check for existing tracks in the system
    try {
      const res = await fetch(`${API_BASE}/api/tracks/term/${termDetails.termName}`);
      if (res.ok) {
        const existingTracks = await res.json();
        tracksToValidate.forEach((track, index) => {
          const trackName = track.trackName.trim();
          const exists = existingTracks.some(
            et => et.trackName === trackName &&
              et.schoolYear === track.schoolYear &&
              et.termName === track.termName
          );
          if (exists) {
            status[index] = {
              valid: false,
              message: 'Track already exists in system'
            };
          }
        });
      }
    } catch (error) {
      console.error('Error validating tracks:', error);
    }

    return status;
  };

  const handleExcelFile = async (e) => {
    const file = e.target.files[0];
    setExcelError('');

    if (!file) {
      return;
    }

    // Check if file is an Excel file
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setExcelError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Get raw data to find actual headers
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
          console.log("Raw Excel Data for Tracks:", rawData);
          
          // Find the actual header row
          const expectedHeaders = ['Track Name', 'School Year', 'Term Name', 'Status'];
          const { headerRowIndex, headers } = findDataHeaders(rawData, expectedHeaders);
          
          // Get data rows starting after the header row
          const dataRows = rawData.slice(headerRowIndex + 1);
          console.log("Data rows for Tracks:", dataRows);
          
          if (dataRows.length === 0) {
            setExcelError('No data rows found after headers');
            return;
          }

          // Map data rows to objects using the found headers
          console.log('Headers found:', headers);
          console.log('Data rows to process:', dataRows);
          
          const tracksToPreview = dataRows.map((row, index) => {
            console.log(`Processing row ${index}:`, row);
            const trackObj = {};
            headers.forEach((header, headerIndex) => {
              const key = String(header).trim();
              const value = String(row[headerIndex] || '').trim();
              trackObj[key] = value;
              console.log(`  ${key}: ${value}`);
            });
            
            const track = {
              trackName: trackObj['Track Name'] || trackObj['Track Name to Add'] || '',
              schoolYear: trackObj['School Year'] || termDetails.schoolYear,
              termName: trackObj['Term Name'] || termDetails.termName
            };
            
            console.log(`Mapped track ${index}:`, track);
            return track;
          }).filter(track => track.trackName); // Only include tracks with names
          
          console.log('Final tracks to preview:', tracksToPreview);

          if (tracksToPreview.length === 0) {
            setExcelError('No valid track data found');
            return;
          }

          // Validate tracks
          const validationResults = await validateTracks(tracksToPreview);

          setPreviewTracks(tracksToPreview);
          setValidationStatus(validationResults);
          setPreviewModalOpen(true);
          setExcelFile(file);
        } catch (err) {
          setExcelError('Error processing Excel file');
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setExcelError('Error reading file');
      console.error(err);
    }
  };

  const handleConfirmUpload = async () => {
    // Filter out invalid tracks
    const validTracks = previewTracks.filter((_, index) => validationStatus[index]?.valid);

    if (validTracks.length === 0) {
      setExcelError('No valid tracks to upload');
      setPreviewModalOpen(false);
      return;
    }

    setIsUploading(true);
    setExcelError('');

    try {
      const res = await fetch(`${API_BASE}/api/tracks/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: validTracks })
      });

      if (res.ok) {
        const newTracks = await res.json();
        setTracks([...tracks, ...newTracks]);
        // Audit log: Batch Upload Tracks
        try {
          const token = localStorage.getItem('token');
          fetch(`${API_BASE}/audit-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              action: 'Batch Upload Tracks',
              details: `Uploaded ${validTracks.length} Tracks for ${termDetails.schoolYear} ${termDetails.termName}`,
              userRole: 'admin'
            })
          }).catch(() => {});
        } catch {}
        window.alert(`${validTracks.length} tracks uploaded successfully!`);
        setExcelFile(null);
        setPreviewModalOpen(false);
        // Reset the file input
        document.querySelector('input[type="file"]').value = '';
      } else {
        const data = await res.json();
        setExcelError(data.message || 'Failed to upload tracks');
      }
    } catch (err) {
      setExcelError('Error uploading tracks');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  // Add new functions for strand Excel handling
  const downloadStrandTemplate = async () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Template for adding new strands with complete school details
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.'],
        ['2772-2774 Roxas Boulevard, Pasay City 1300 Philippines'],
        ['PAASCU Accredited - COLLEGE'],
        [''], // Empty row
        ['ACADEMIC STRANDS MANAGEMENT'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Academic Year: ${termDetails.schoolYear}`],
        [`Term: ${termDetails.termName}`],
        [''], // Empty row
        ['Track Name', 'Strand Name to Add'],
      ]);
      
      // Set column widths
      templateWs['!cols'] = [
        { wch: 20 }, // Track Name
        { wch: 25 }  // Strand Name to Add
      ];
      
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Strands');

      // Sheet 2: Current strands in the system (only active)
      const currentStrands = strands.filter(s =>
        s.status === 'active' &&
        s.schoolYear === termDetails.schoolYear &&
        s.termName === termDetails.termName
      );

      const currentStrandsData = [
        ['SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.'],
        ['2772-2774 Roxas Boulevard, Pasay City 1300 Philippines'],
        ['PAASCU Accredited - COLLEGE'],
        [''], // Empty row
        ['CURRENT ACADEMIC STRANDS'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Academic Year: ${termDetails.schoolYear}`],
        [`Term: ${termDetails.termName}`],
        [''], // Empty row
        ['Track Name', 'Strand Name', 'Status'],
        ...currentStrands.map(strand => [
          strand.trackName,
          strand.strandName,
          strand.status
        ])
      ];

      const currentStrandsWs = XLSX.utils.aoa_to_sheet(currentStrandsData);
      currentStrandsWs['!cols'] = [
        { wch: 20 }, // Track Name
        { wch: 20 }, // Strand Name
        { wch: 10 }  // Status
      ];
      XLSX.utils.book_append_sheet(wb, currentStrandsWs, 'Current Strands');

      // Sheet 3: Available Tracks (only active)
      const activeTracks = tracks.filter(track =>
        track.status === 'active' &&
        track.schoolYear === termDetails.schoolYear &&
        track.termName === termDetails.termName
      );
      const availableTracksData = [
        ['Track Name', 'Status'],
        ...activeTracks.map(track => [
          track.trackName,
          track.status
        ])
      ];

      const availableTracksWs = XLSX.utils.aoa_to_sheet(availableTracksData);
      availableTracksWs['!cols'] = [
        { wch: 20 }, // Track Name
        { wch: 10 }  // Status
      ];
      XLSX.utils.book_append_sheet(wb, availableTracksWs, 'Available Tracks');

      XLSX.writeFile(wb, 'strands_template.xlsx');
    } catch (error) {
      console.error('Error generating strand template:', error);
      setStrandError('Failed to generate template. Please try again.');
    }
  };

  // Update: Enforce absolute uniqueness for strand names
  const validateStrands = async (strandsToValidate) => {
    const status = {};
    const uploadedStrandNames = new Set();
    // Fetch all existing strands in the system (for absolute uniqueness)
    const allStrands = [];
    for (const track of tracks) {
      if (track.status === 'active') {
        try {
          const res = await fetch(`${API_BASE}/api/strands/track/${track.trackName}`);
          if (res.ok) {
            const fetchedStrands = await res.json();
            allStrands.push(...fetchedStrands);
          }
        } catch (err) {
          // ignore
        }
      }
    }
    const allStrandNamesInSystem = new Set(allStrands.map(s => s.strandName.trim().toLowerCase()));

    for (let i = 0; i < strandsToValidate.length; i++) {
      const strand = strandsToValidate[i];
      const trackName = strand.trackName?.trim() || '';
      const strandName = strand.strandName?.trim() || '';
      let isValid = true;
      let message = 'Valid';

      // 1. Check for missing required fields
      if (!trackName || !strandName) {
        isValid = false;
        message = 'Missing Track Name or Strand Name';
      }
      // 2. Absolute uniqueness: check if strand name exists anywhere
      if (isValid) {
        if (allStrandNamesInSystem.has(strandName.toLowerCase())) {
          isValid = false;
          message = 'Strand name already exists in the system (must be unique)';
        }
      }
      // 3. Check for duplicates within the uploaded data (absolute uniqueness)
      if (isValid) {
        if (uploadedStrandNames.has(strandName.toLowerCase())) {
          isValid = false;
          message = 'Duplicate strand name in uploaded file (strand names must be unique)';
        } else {
          uploadedStrandNames.add(strandName.toLowerCase());
        }
      }
      // 4. Check if track exists and is active
      if (isValid) {
        const trackFound = tracks.find(t => t.status === 'active' && t.trackName === trackName);
        if (!trackFound) {
          isValid = false;
          message = `Track "${trackName}" does not exist or is not active`;
        }
      }
      status[i] = { valid: isValid, message: message };
    }
    return status;
  };
  const handleStrandExcelFile = async (e) => {
    const file = e.target.files[0];
    setStrandError('');

    if (!file) {
      return;
    }

    // Check if file is an Excel file
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setStrandError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];

          // Get actual headers from the first row
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
          const actualHeaders = [];
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
            if (cell && cell.v) {
              actualHeaders.push(String(cell.v).trim());
            }
          }

          const requiredHeaders = ['Track Name', 'Strand Name to Add'];
          const missingOrMismatchedHeaders = requiredHeaders.filter(header => !actualHeaders.includes(header));

          if (missingOrMismatchedHeaders.length > 0) {
            setStrandError(`Missing or misspelled column(s) in Excel file: ${missingOrMismatchedHeaders.join(', ')}. Please ensure headers are exactly as in the template.`);
            return;
          }

          // Get raw data to find actual headers
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
          console.log("Raw Excel Data for Strands:", rawData);
          
          // Find the actual header row
          const expectedHeaders = ['Track Name', 'Strand Name to Add', 'Strand Name'];
          const { headerRowIndex, headers } = findDataHeaders(rawData, expectedHeaders);
          
          // Get data rows starting after the header row
          const dataRows = rawData.slice(headerRowIndex + 1);
          console.log("Data rows for Strands:", dataRows);
          
          if (dataRows.length === 0) {
            setStrandError('No data rows found after headers');
            return;
          }

          // Map data rows to objects using the found headers
          const strandsToPreview = dataRows.map(row => {
            const strandObj = {};
            headers.forEach((header, index) => {
              const key = String(header).trim();
              strandObj[key] = String(row[index] || '').trim();
            });
            return {
              trackName: strandObj['Track Name'] || '',
              strandName: strandObj['Strand Name to Add'] || strandObj['Strand Name'] || ''
            };
          }).filter(strand => strand.trackName && strand.strandName); // Only include strands with both track and strand names

          if (strandsToPreview.length === 0) {
            setStrandError('No valid strand data found');
            return;
          }

          // Validate strands
          const validationResults = await validateStrands(strandsToPreview);

          // Count valid and invalid strands
          const validCount = Object.values(validationResults).filter(v => v.valid).length;
          const invalidCount = Object.values(validationResults).filter(v => !v.valid).length;

          // Set preview data and show modal even if there are invalid entries
          setStrandPreviewData(strandsToPreview);
          setStrandValidationStatus(validationResults);
          setStrandPreviewModalOpen(true);
          setStrandExcelFile(file);

          // Show summary message if there are invalid entries
          if (invalidCount > 0) {
            setStrandError(`${invalidCount} strand(s) have validation errors and will be skipped. ${validCount} valid strand(s) will be uploaded.`);
          }

        } catch (err) {
          setStrandError(`Error processing Excel file: ${err.message || err}`);
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setStrandError(`Error reading file: ${err.message || err}`);
      console.error(err);
    }
  };

  const handleConfirmStrandUpload = async () => {
    // Filter out invalid strands
    const validStrands = strandPreviewData.filter((_, index) => strandValidationStatus[index]?.valid);

    if (validStrands.length === 0) {
      setStrandError('No valid strands to upload');
      setStrandPreviewModalOpen(false);
      return;
    }

    setStrandError('');

    try {
      // Create strands one by one since they're dependent on tracks
      const createdStrands = [];
      for (const strand of validStrands) {
        const res = await fetch(`${API_BASE}/api/strands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...strand,
            schoolYear: termDetails.schoolYear,
            termName: termDetails.termName
          })
        });

        if (res.ok) {
          const newStrand = await res.json();
          createdStrands.push(newStrand);
        } else {
          const data = await res.json();
          throw new Error(data.message || 'Failed to create strand');
        }
      }

      setStrands([...strands, ...createdStrands]);
      window.alert(`${validStrands.length} strands uploaded successfully!`);
      setStrandExcelFile(null);
      setStrandPreviewModalOpen(false);
      // Reset the file input
      document.querySelector('input[type="file"][accept=".xlsx,.xls"]').value = '';
    } catch (err) {
      setStrandError(err.message || 'Error uploading strands');
      console.error(err);
    }
  };

  // Add new functions for section Excel handling
  const downloadSectionTemplate = async () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Template for adding new sections with complete school details
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.'],
        ['2772-2774 Roxas Boulevard, Pasay City 1300 Philippines'],
        ['PAASCU Accredited - COLLEGE'],
        [''], // Empty row
        ['ACADEMIC SECTIONS MANAGEMENT'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Academic Year: ${termDetails.schoolYear}`],
        [`Term: ${termDetails.termName}`],
        [''], // Empty row
        ['Track Name', 'Strand Name', 'Section Name to Add', 'Grade Level'],
      ]);
      
      // Set column widths
      templateWs['!cols'] = [
        { wch: 20 }, // Track Name
        { wch: 25 }, // Strand Name
        { wch: 25 }, // Section Name to Add
        { wch: 15 }  // Grade Level
      ];
      
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Sections');

      // Sheet 2: Current sections in the system (only active)
      const currentSections = sections.filter(s =>
        s.status === 'active' &&
        s.schoolYear === termDetails.schoolYear &&
        s.termName === termDetails.termName &&
        tracks.find(t => t.trackName === s.trackName && t.status === 'active')
      );

      const currentSectionsData = [
        ['SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.'],
        ['2772-2774 Roxas Boulevard, Pasay City 1300 Philippines'],
        ['PAASCU Accredited - COLLEGE'],
        [''], // Empty row
        ['CURRENT ACADEMIC SECTIONS'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Academic Year: ${termDetails.schoolYear}`],
        [`Term: ${termDetails.termName}`],
        [''], // Empty row
        ['Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Status'],
        ...currentSections.map(section => [
          section.trackName,
          section.strandName,
          section.sectionName,
          section.gradeLevel || '',
          section.status
        ])
      ];

      const currentSectionsWs = XLSX.utils.aoa_to_sheet(currentSectionsData);
      currentSectionsWs['!cols'] = [
        { wch: 20 }, // Track Name
        { wch: 20 }, // Strand Name
        { wch: 20 }, // Section Name
        { wch: 15 }, // Grade Level
        { wch: 10 }  // Status
      ];
      XLSX.utils.book_append_sheet(wb, currentSectionsWs, 'Current Sections');

      // Sheet 3: Available Strands (only active)
      const availableStrands = strands.filter(s =>
        s.status === 'active' &&
        s.schoolYear === termDetails.schoolYear &&
        s.termName === termDetails.termName &&
        tracks.find(t => t.trackName === s.trackName && t.status === 'active')
      );

      const availableStrandsData = [
        ['Track Name', 'Strand Name', 'Status'],
        ...availableStrands.map(strand => [
          strand.trackName,
          strand.strandName,
          strand.status
        ])
      ];

      const availableStrandsWs = XLSX.utils.aoa_to_sheet(availableStrandsData);
      availableStrandsWs['!cols'] = [
        { wch: 20 }, // Track Name
        { wch: 20 }, // Strand Name
        { wch: 10 }  // Status
      ];
      XLSX.utils.book_append_sheet(wb, availableStrandsWs, 'Available Strands');

      XLSX.writeFile(wb, 'sections_template.xlsx');
    } catch (error) {
      console.error('Error generating section template:', error);
      setSectionError('Failed to generate template. Please try again.');
    }
  };

  const validateSections = async (sectionsToValidate) => {
    const status = {};
    const uploadedSectionCombos = new Set();
    const existingSectionsInSystem = new Set();

    // Get all active tracks
    const activeTracks = tracks.filter(track => track.status === 'active');
    const activeTracksMap = new Set(activeTracks.map(track => track.trackName));

    // Get all active strands in the system for this school year and term
    const activeStrandsInSystem = [];
    for (const track of activeTracks) {
      const res = await fetch(`${API_BASE}/api/strands/track/${track.trackName}?schoolYear=${termDetails.schoolYear}&termName=${termDetails.termName}`);
      if (res.ok) {
        const strands = await res.json();
        const activeStrands = strands.filter(strand => strand.status === 'active');
        activeStrandsInSystem.push(...activeStrands);
        console.log(`Strands for track "${track.trackName}":`, activeStrands);
      }
    }
    console.log('All active strands in system:', activeStrandsInSystem);

    // Get all existing sections from the component state (more reliable)
    const existingSections = sections.filter(section => section.status === 'active');
    existingSections.forEach(section => {
      existingSectionsInSystem.add(`${section.trackName}-${section.strandName}-${section.sectionName}-${section.gradeLevel}`);
    });
    console.log('Existing sections in system:', Array.from(existingSectionsInSystem));

    // Track section names in the uploaded file for duplicates
    const uploadedSectionNames = new Set();

    for (let i = 0; i < sectionsToValidate.length; i++) {
      const section = sectionsToValidate[i];
      const trackName = section.trackName?.trim() || '';
      const strandName = section.strandName?.trim() || '';
      const sectionName = section.sectionName?.trim() || '';
      const gradeLevel = section.gradeLevel?.trim() || '';

      let isValid = true;
      let message = 'Valid';

      // 1. Check for missing required fields
      if (!trackName || !strandName || !sectionName || !gradeLevel) {
        isValid = false;
        message = 'Missing Track Name, Strand Name, Section Name, or Grade Level';
      }

      // 2. Check if section name is already used anywhere in the system (absolute uniqueness)
      if (isValid) {
        if (uploadedSectionNames.has(sectionName.toLowerCase())) {
          isValid = false;
          message = 'Duplicate section name in uploaded file (section names must be unique)';
        } else {
          uploadedSectionNames.add(sectionName.toLowerCase());
        }
      }

      // 3. Check for duplicates within the uploaded data (absolute uniqueness)
      if (isValid) {
        if (uploadedSectionCombos.has(`${trackName}-${strandName}-${sectionName}-${gradeLevel}`)) {
          isValid = false;
          message = 'Duplicate section name in uploaded file for this track-strand-grade level combination';
        } else {
          uploadedSectionCombos.add(`${trackName}-${strandName}-${sectionName}-${gradeLevel}`);
        }
      }

      // 4. Check if section already exists in the system
      if (isValid) {
        const sectionKey = `${trackName}-${strandName}-${sectionName}-${gradeLevel}`;
        console.log(`Checking if section exists: "${sectionKey}"`);
        console.log('Available existing sections:', Array.from(existingSectionsInSystem));
        if (existingSectionsInSystem.has(sectionKey)) {
          isValid = false;
          message = `Section "${sectionName}" already exists in ${trackName} - ${strandName} - ${gradeLevel}`;
        }
      }

      // 5. Check if track exists and is active
      if (isValid) {
        const trackFound = activeTracksMap.has(trackName);
        if (!trackFound) {
          isValid = false;
          message = `Track "${trackName}" does not exist or is not active`;
        }
      }

      // 6. Check if strand exists within the active track and is active
      if (isValid) {
        const strandFound = activeStrandsInSystem.some(s => 
        s.trackName.trim() === trackName.trim() && 
        s.strandName.trim() === strandName.trim()
      );
        console.log(`Checking strand "${strandName}" in track "${trackName}":`, {
          strandFound,
          availableStrands: activeStrandsInSystem.filter(s => s.trackName === trackName).map(s => s.strandName)
        });
        if (!strandFound) {
          isValid = false;
          message = `Strand "${strandName}" does not exist in track "${trackName}" or is not active`;
        }
      }

      // 7. Check if grade level is valid
      if (isValid) {
        if (gradeLevel !== 'Grade 11' && gradeLevel !== 'Grade 12') {
          isValid = false;
          message = 'Grade Level must be either "Grade 11" or "Grade 12"';
        }
      }

      status[i] = { valid: isValid, message: message };
    }
    return status;
  };

  const handleSectionExcelFile = async (e) => {
    const file = e.target.files[0];
    setSectionError('');

    if (!file) {
      return;
    }

    // Check if file is an Excel file
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setSectionError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Get raw data to find actual headers
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
          console.log("Raw Excel Data for Sections:", rawData);
          
          // Find the actual header row
          const expectedHeaders = ['Track Name', 'Strand Name', 'Section Name', 'Grade Level'];
          const { headerRowIndex, headers } = findDataHeaders(rawData, expectedHeaders);
          
          // Get data rows starting after the header row
          const dataRows = rawData.slice(headerRowIndex + 1);
          console.log("Data rows for Sections:", dataRows);
          
          if (dataRows.length === 0) {
            setSectionError('No data rows found after headers');
            return;
          }

          // Map data rows to objects using the found headers
          const sectionsToPreview = dataRows.map(row => {
            const sectionObj = {};
            headers.forEach((header, index) => {
              const key = String(header).trim();
              sectionObj[key] = String(row[index] || '').trim();
            });
            return {
              trackName: sectionObj['Track Name'] || '',
              strandName: sectionObj['Strand Name'] || '',
              sectionName: sectionObj['Section Name to Add'] || sectionObj['Section Name'] || '',
              gradeLevel: sectionObj['Grade Level'] || ''
            };
          }).filter(section => section.trackName && section.strandName && section.sectionName); // Only include sections with required fields

          if (sectionsToPreview.length === 0) {
            setSectionError('No valid section data found');
            return;
          }

          // Validate sections
          const validationResults = await validateSections(sectionsToPreview);

          // Count valid and invalid sections
          const validCount = Object.values(validationResults).filter(v => v.valid).length;
          const invalidCount = Object.values(validationResults).filter(v => !v.valid).length;

          // Set preview data and show modal even if there are invalid entries
          setSectionPreviewData(sectionsToPreview);
          setSectionValidationStatus(validationResults);
          setSectionPreviewModalOpen(true);
          setSectionExcelFile(file);

          // Show summary message if there are invalid entries
          if (invalidCount > 0) {
            setSectionError(`${invalidCount} section(s) have validation errors and will be skipped. ${validCount} valid section(s) will be uploaded.`);
          }
        } catch (err) {
          setSectionError('Error processing Excel file');
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setSectionError('Error reading file');
      console.error(err);
    }
  };

  const handleConfirmSectionUpload = async () => {
    // Filter out invalid sections
    const validSections = sectionPreviewData.filter((_, index) => sectionValidationStatus[index]?.valid);

    if (validSections.length === 0) {
      setSectionError('No valid sections to upload');
      setSectionPreviewModalOpen(false);
      return;
    }

    setIsSectionUploading(true);
    setSectionError('');

    try {
      // Create sections one by one since they're dependent on strands
      const createdSections = [];
      for (const section of validSections) {
        const res = await fetch(`${API_BASE}/api/sections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(section)
        });

        if (res.ok) {
          const newSection = await res.json();
          createdSections.push(newSection);
        } else {
          const data = await res.json();
          throw new Error(data.message || 'Failed to create section');
        }
      }

      setSections([...sections, ...createdSections]);
      // Audit log: Batch Upload Sections
      try {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/audit-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'Batch Upload Sections',
            details: `Uploaded ${validSections.length} Sections for ${termDetails.schoolYear} ${termDetails.termName}`,
            userRole: 'admin'
          })
        }).catch(() => {});
      } catch {}
      window.alert(`${validSections.length} sections uploaded successfully!`);
      setSectionExcelFile(null);
      setSectionPreviewModalOpen(false);
      // Reset the file input
      document.querySelector('input[type="file"][accept=".xlsx,.xls"]').value = '';
    } catch (err) {
      setSectionError(err.message || 'Error uploading sections');
      console.error(err);
    } finally {
      setIsSectionUploading(false);
    }
  };
  // Add new functions for faculty assignment Excel handling
  const downloadFacultyAssignmentTemplate = async () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Template for adding new faculty assignments with complete school details
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.'],
        ['2772-2774 Roxas Boulevard, Pasay City 1300 Philippines'],
        ['PAASCU Accredited - COLLEGE'],
        [''], // Empty row
        ['FACULTY ASSIGNMENTS MANAGEMENT'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Academic Year: ${termDetails.schoolYear}`],
        [`Term: ${termDetails.termName}`],
        [''], // Empty row
        ['Faculty School ID', 'Faculty Name', 'Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Subject'], // Updated headers to include both School ID and Name
      ]);
      
      // Set column widths
      templateWs['!cols'] = [
        { wch: 18 }, // Faculty School ID
        { wch: 25 }, // Faculty Name
        { wch: 20 }, // Track Name
        { wch: 25 }, // Strand Name
        { wch: 20 }, // Section Name
        { wch: 15 }, // Grade Level
        { wch: 25 }  // Subject
      ];
      
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Faculty Assignments');

      // Sheet 2: Current faculty assignments in the system (only active)
      const currentFacultyAssignments = facultyAssignments.filter(fa => fa.status === 'active');
      const currentFacultyAssignmentsData = [
        ['SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.'],
        ['2772-2774 Roxas Boulevard, Pasay City 1300 Philippines'],
        ['PAASCU Accredited - COLLEGE'],
        [''], // Empty row
        ['CURRENT FACULTY ASSIGNMENTS'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Academic Year: ${termDetails.schoolYear}`],
        [`Term: ${termDetails.termName}`],
        [''], // Empty row
        ['Faculty School ID', 'Faculty Name', 'Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Subject', 'Status'], // Updated headers to use School ID
        ...currentFacultyAssignments.map(assignment => [
          assignment.facultySchoolID || '', // Use school ID instead of object ID
          assignment.facultyName,
          assignment.trackName,
          assignment.strandName,
          assignment.sectionName,
          assignment.gradeLevel || '',
          assignment.subjectName || '',
          assignment.status
        ])
      ];
      const currentFacultyAssignmentsWs = XLSX.utils.aoa_to_sheet(currentFacultyAssignmentsData);
      const faWscols = [
        { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 10 }
      ];
      currentFacultyAssignmentsWs['!cols'] = faWscols;
      XLSX.utils.book_append_sheet(wb, currentFacultyAssignmentsWs, 'Current Assignments');

      // Sheet 3: Available Faculty
      const activeFaculties = faculties.filter(f => f.role === 'faculty' && !f.isArchived);
      const availableFacultiesData = [
        ['Faculty School ID', 'Faculty Name', 'Email', 'Status'],
        ...activeFaculties.map(f => [
          f.schoolID || '', // Use school ID instead of object ID
          `${f.firstname} ${f.lastname}`,
          f.email,
          f.isArchived ? 'Archived' : 'Active'
        ])
      ];
      const availableFacultiesWs = XLSX.utils.aoa_to_sheet(availableFacultiesData);
      const facultyWscols = [
        { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 10 }
      ];
      availableFacultiesWs['!cols'] = facultyWscols;
      XLSX.utils.book_append_sheet(wb, availableFacultiesWs, 'Available Faculty');

      // Sheet 4: Available Tracks
      const activeTracks = tracks.filter(t => t.status === 'active');
      const availableTracksData = [
        ['Track Name', 'Status'],
        ...activeTracks.map(t => [t.trackName, t.status])
      ];
      const availableTracksWs = XLSX.utils.aoa_to_sheet(availableTracksData);
      const trackWscols = [
        { wch: 20 }, { wch: 10 }
      ];
      availableTracksWs['!cols'] = trackWscols;
      XLSX.utils.book_append_sheet(wb, availableTracksWs, 'Available Tracks');

      // Sheet 5: Available Strands
      const activeStrandsInSystem = [];
      for (const track of activeTracks) {
        const res = await fetch(`${API_BASE}/api/strands/track/${track.trackName}?schoolYear=${termDetails.schoolYear}&termName=${termDetails.termName}`);
        if (res.ok) {
          const fetchedStrands = await res.json();
          activeStrandsInSystem.push(...fetchedStrands.filter(s => s.status === 'active').map(s => ({ ...s, trackName: track.trackName })));
        }
      }
      const availableStrandsData = [
        ['Track Name', 'Strand Name', 'Status'],
        ...activeStrandsInSystem.map(s => [s.trackName, s.strandName, s.status])
      ];
      const availableStrandsWs = XLSX.utils.aoa_to_sheet(availableStrandsData);
      const strandWscols = [
        { wch: 20 }, { wch: 20 }, { wch: 10 }
      ];
      availableStrandsWs['!cols'] = strandWscols;
      XLSX.utils.book_append_sheet(wb, availableStrandsWs, 'Available Strands');

      // Sheet 6: Available Sections (filtered by active tracks and strands)
      const activeSectionsInSystem = [];
      for (const track of activeTracks) {
        const strandsInTrack = activeStrandsInSystem.filter(s => s.trackName === track.trackName);
        for (const strand of strandsInTrack) {
          const res = await fetch(`${API_BASE}/api/sections/track/${track.trackName}/strand/${strand.strandName}?schoolYear=${termDetails.schoolYear}&termName=${termDetails.termName}`);
          if (res.ok) {
            const fetchedSections = await res.json();
            activeSectionsInSystem.push(...fetchedSections.filter(sec => sec.status === 'active').map(sec => ({ ...sec, trackName: track.trackName, strandName: strand.strandName })));
          }
        }
      }
      const availableSectionsData = [
        ['Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Status'],
        ...activeSectionsInSystem.map(sec => [sec.trackName, sec.strandName, sec.sectionName, sec.gradeLevel || '', sec.status])
      ];
      const availableSectionsWs = XLSX.utils.aoa_to_sheet(availableSectionsData);
      const sectionWscols = [
        { wch: 20 }, // Track Name
        { wch: 20 }, // Strand Name
        { wch: 20 }, // Section Name
        { wch: 15 }, // Grade Level
        { wch: 10 }  // Status
      ];
      availableSectionsWs['!cols'] = sectionWscols;
      XLSX.utils.book_append_sheet(wb, availableSectionsWs, 'Available Sections');

      // Sheet 7: Available Subjects
      const availableSubjectsData = [
        ['Subject Name', 'Track Name', 'Strand Name', 'Grade Level', 'Status'],
        ...subjects.map(subject => [
          subject.subjectName,
          subject.trackName,
          subject.strandName,
          subject.gradeLevel,
          subject.status || 'active',
        ])
      ];
      const availableSubjectsWs = XLSX.utils.aoa_to_sheet(availableSubjectsData);
      const subjectWscols = [
        { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 10 }
      ];
      availableSubjectsWs['!cols'] = subjectWscols;
      XLSX.utils.book_append_sheet(wb, availableSubjectsWs, 'Available Subjects');

      XLSX.writeFile(wb, 'faculty_assignments_template.xlsx');
    } catch (error) {
      console.error('Error generating faculty assignment template:', error);
      setFacultyError('Failed to generate template. Please try again.');
    }
  };
  const validateFacultyAssignments = async (assignmentsToValidate) => {
    const status = {};
    const uploadedAssignmentCombos = new Set(); // For duplicates within the uploaded file

    // Pre-fetch active data for validation efficiency
    const activeFaculties = faculties.filter(f => f.role === 'faculty' && !f.isArchived);
    const activeFacultiesMap = new Map(activeFaculties.map(f => [`${f.firstname} ${f.lastname}`, f])); // Corrected filter
    const activeTracksMap = new Map(tracks.filter(t => t.status === 'active').map(t => [t.trackName, t]));
    const activeStrandsMap = new Map(); // Store as {trackName-strandName: strandObject}
    const activeSectionsMap = new Map(); // Store as {trackName-strandName-sectionName: sectionObject}

    for (const track of tracks) {
      if (track.status === 'active') {
        try {
          const strandsRes = await fetch(`${API_BASE}/api/strands/track/${track.trackName}?schoolYear=${termDetails.schoolYear}&termName=${termDetails.termName}`);
          if (strandsRes.ok) {
            const fetchedStrands = await strandsRes.json();
            console.log(`Strands for track "${track.trackName}":`, fetchedStrands);
            for (const strand of fetchedStrands.filter(s => s.status === 'active')) {
              activeStrandsMap.set(`${track.trackName}-${strand.strandName}`, strand);
              try {
                const sectionsRes = await fetch(`${API_BASE}/api/sections/track/${track.trackName}/strand/${strand.strandName}?schoolYear=${termDetails.schoolYear}&termName=${termDetails.termName}`);
                if (sectionsRes.ok) {
                  const fetchedSections = await sectionsRes.json();
                  console.log(`Sections for strand "${strand.strandName}":`, fetchedSections);
                  for (const section of fetchedSections.filter(sec => sec.status === 'active')) {
                    activeSectionsMap.set(`${track.trackName}-${strand.strandName}-${section.sectionName}`, section);
                  }
                }
              } catch (err) {
                console.error(`Error fetching sections for strand ${strand.strandName}:`, err);
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching strands for track ${track.trackName}:`, err);
        }
      }
    }

    // Fetch latest faculty assignments from backend for accurate validation
    let existingAssignments = [];
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/faculty-assignments?termId=${termDetails._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        existingAssignments = await res.json();
        existingAssignments = existingAssignments.filter(assignment => assignment.status === 'active');
      } else {
        console.error('Failed to fetch existing faculty assignments for validation.');
        // Fallback to component state
        existingAssignments = facultyAssignments.filter(assignment => assignment.status === 'active');
      }
    } catch (err) {
      console.error('Error fetching existing faculty assignments for validation:', err);
      // Fallback to component state
      existingAssignments = facultyAssignments.filter(assignment => assignment.status === 'active');
    }
    
    const existingAssignmentsInSystem = new Set(existingAssignments.map(assign => 
      `${assign.facultyId}-${assign.trackName}-${assign.strandName}-${assign.sectionName}-${assign.subjectName || ''}`
    ));
    
    console.log('Existing faculty assignments in system:', Array.from(existingAssignmentsInSystem));
    console.log('Total existing assignments fetched:', existingAssignments.length);
    console.log('Detailed existing assignments:', existingAssignments.map(assign => ({
      facultyId: assign.facultyId,
      trackName: assign.trackName,
      strandName: assign.strandName,
      sectionName: assign.sectionName,
      subjectName: assign.subjectName,
      combo: `${assign.facultyId}-${assign.trackName}-${assign.strandName}-${assign.sectionName}-${assign.subjectName || ''}`
    })));

    for (let i = 0; i < assignmentsToValidate.length; i++) {
      const assignment = assignmentsToValidate[i];
      const facultySchoolID = assignment.facultySchoolID?.trim() || '';
      const facultyName = assignment.facultyName?.trim() || '';
      const trackName = assignment.trackName?.trim() || '';
      const strandName = assignment.strandName?.trim() || '';
      const sectionName = assignment.sectionName?.trim() || '';
      const gradeLevel = assignment.gradeLevel?.trim() || '';
      const subjectName = assignment.subjectName?.trim() || '';

      let isValid = true;
      let message = 'Valid';
      let facultyId = ''; // To store the faculty ID for valid assignments
      
      console.log(`Row ${i + 1}: Starting validation for ${facultyName} (${facultySchoolID})`);

      // 1. Check for missing required fields
      if (!facultySchoolID || !facultyName || !trackName || !strandName || !sectionName || !gradeLevel || !subjectName) {
        isValid = false;
        message = 'Missing Faculty School ID, Faculty Name, Track Name, Strand Name, Section Name, Grade Level, or Subject';
        console.log(`Row ${i + 1}: Missing required fields - facultySchoolID: "${facultySchoolID}", facultyName: "${facultyName}", trackName: "${trackName}", strandName: "${strandName}", sectionName: "${sectionName}", gradeLevel: "${gradeLevel}", subjectName: "${subjectName}"`);
        status[i] = { valid: isValid, message: message, facultyId: facultyId };
        console.log(`Row ${i + 1}: Final validation result - valid: ${isValid}, message: "${message}"`);
        continue; // Skip all other validations for this row
      }

      // 1.5. Check faculty school ID format
      if (isValid && !validateFacultySchoolIDFormat(facultySchoolID)) {
        isValid = false;
        message = `Invalid Faculty School ID format "${facultySchoolID}". Faculty School ID must be in format F000 (e.g., F001, F123)`;
        console.log(`Row ${i + 1}: Invalid faculty school ID format - "${facultySchoolID}"`);
        status[i] = { valid: isValid, message: message, facultyId: facultyId };
        console.log(`Row ${i + 1}: Final validation result - valid: ${isValid}, message: "${message}"`);
        continue; // Skip all other validations for this row
      }

      // 2. Check if faculty exists and is active (search by school ID)
      if (isValid) {
        const facultyFound = activeFaculties.find(f => f.schoolID === facultySchoolID && f.role === 'faculty' && !f.isArchived);
        if (!facultyFound) {
          isValid = false;
          message = `Faculty with School ID "${facultySchoolID}" does not exist or is not active`;
        } else {
          // 2.5. Verify that the name matches the school ID
          const expectedName = `${facultyFound.firstname} ${facultyFound.lastname}`.toLowerCase();
          const providedName = facultyName.toLowerCase();
          if (expectedName !== providedName) {
            isValid = false;
            message = `Faculty Name "${facultyName}" does not match School ID "${facultySchoolID}". Expected: "${facultyFound.firstname} ${facultyFound.lastname}"`;
          } else {
            facultyId = facultyFound._id;
            console.log(`Row ${i + 1}: Found faculty ID: ${facultyId} for ${facultyName}`);
          }
        }
      }

      // 3. Check if track exists and is active
      if (isValid) {
        const trackFound = activeTracksMap.has(trackName);
        if (!trackFound) {
          isValid = false;
          message = `Track "${trackName}" does not exist or is not active`;
        }
      }

      // 4. Check if strand exists within the active track and is active
      if (isValid) {
        const strandFound = activeStrandsMap.has(`${trackName}-${strandName}`);
        if (!strandFound) {
          isValid = false;
          message = `Strand "${strandName}" does not exist in track "${trackName}" or is not active`;
        }
      }

      // 5. Check if section exists within the active track-strand combination and is active
      if (isValid) {
        const sectionFound = activeSectionsMap.has(`${trackName}-${strandName}-${sectionName}`);
        if (!sectionFound) {
          isValid = false;
          message = `Section "${sectionName}" does not exist in track "${trackName}" and strand "${strandName}" or is not active`;
        }
      }

      // 6. Check for duplicates within the uploaded data
      if (isValid) {
        const currentCombo = `${facultyId || facultySchoolID}-${trackName}-${strandName}-${sectionName}`;
        if (uploadedAssignmentCombos.has(currentCombo)) {
          isValid = false;
          message = 'Duplicate faculty assignment in uploaded file';
        } else {
          uploadedAssignmentCombos.add(currentCombo);
        }
      }

      // 7. Check for existing assignments in the system (including subject)
      if (isValid && facultyId) {
        const existingCombo = `${facultyId}-${trackName}-${strandName}-${sectionName}-${subjectName}`;
        console.log(`Row ${i + 1}: Checking if faculty assignment exists: "${existingCombo}"`);
        console.log(`Row ${i + 1}: Available existing assignments:`, Array.from(existingAssignmentsInSystem));
        console.log(`Row ${i + 1}: Does combo exist?`, existingAssignmentsInSystem.has(existingCombo));
        if (existingAssignmentsInSystem.has(existingCombo)) {
          isValid = false;
          message = 'Faculty assignment already exists in the system';
          console.log(`Row ${i + 1}: Found existing assignment match`);
        } else {
          console.log(`Row ${i + 1}: No existing assignment match found`);
        }
      }

      // 8. Check for subject-section conflicts (only one faculty per subject-section)
      if (isValid) {
        const conflictingAssignment = existingAssignments.find(ea => 
          ea.subjectName.toLowerCase() === subjectName.toLowerCase() &&
          ea.sectionName.toLowerCase() === sectionName.toLowerCase() &&
          ea.status === 'active'
        );
        
        if (conflictingAssignment) {
          // Check if it's the same faculty (allowed) or different faculty (not allowed)
          if (conflictingAssignment.facultyId !== facultyId) {
            isValid = false;
            message = `Subject "${subjectName}" in Section "${sectionName}" is already assigned to another faculty`;
            console.log(`Row ${i + 1}: Found subject-section conflict with different faculty`);
          } else {
            // Same faculty, same subject-section - this is a duplicate
            isValid = false;
            message = 'Faculty assignment already exists in the system';
            console.log(`Row ${i + 1}: Found duplicate assignment for same faculty`);
          }
        }
      }

      status[i] = { valid: isValid, message: message, facultyId: facultyId };
      console.log(`Row ${i + 1}: Final validation result - valid: ${isValid}, message: "${message}", facultyId: "${facultyId}"`);
    }
    return status;
  };

  const handleFacultyAssignmentExcelFile = async (e) => {
    const file = e.target.files[0];
    setFacultyError('');

    if (!file) {
      return;
    }

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setFacultyError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];

          // Use the improved header detection
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
          console.log("Raw Excel Data for Faculty Assignments:", rawData);
          
          // Find the actual header row
          const expectedHeaders = ['Faculty School ID', 'Faculty Name', 'Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Subject'];
          const { headerRowIndex, headers } = findDataHeaders(rawData, expectedHeaders);
          
          // Get data rows starting after the header row
          const dataRows = rawData.slice(headerRowIndex + 1);
          console.log("Data rows for Faculty Assignments:", dataRows);
          
          if (dataRows.length === 0) {
            setFacultyError('No data rows found after headers');
            return;
          }

          // Map data rows to objects using the found headers
          console.log('Headers found:', headers);
          console.log('Data rows to process:', dataRows);
          
          const assignmentsToPreview = dataRows.map((row, index) => {
            console.log(`Processing row ${index}:`, row);
            const assignmentObj = {};
            headers.forEach((header, headerIndex) => {
              const key = String(header).trim();
              const value = String(row[headerIndex] || '').trim();
              assignmentObj[key] = value;
            });
            return {
              facultySchoolID: assignmentObj['Faculty School ID'] || '',
              facultyName: assignmentObj['Faculty Name'] || '',
              trackName: assignmentObj['Track Name'] || '',
              strandName: assignmentObj['Strand Name'] || '',
              sectionName: assignmentObj['Section Name'] || '',
              gradeLevel: assignmentObj['Grade Level'] || '',
              subjectName: assignmentObj['Subject'] || '',
            };
          });

          const validationResults = await validateFacultyAssignments(assignmentsToPreview);

          const validCount = Object.values(validationResults).filter(v => v.valid).length;
          const invalidCount = Object.values(validationResults).filter(v => !v.valid).length;

          setFacultyAssignmentPreviewData(assignmentsToPreview);
          setFacultyAssignmentValidationStatus(validationResults);
          setFacultyAssignmentPreviewModalOpen(true);
          setFacultyAssignmentExcelFile(file);

          if (invalidCount > 0) {
            setFacultyError(`${invalidCount} faculty assignment(s) have validation errors and will be skipped. ${validCount} valid assignment(s) will be uploaded.`);
          }

        } catch (err) {
          setFacultyError(`Error processing Excel file: ${err.message || err}`);
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setFacultyError(`Error reading file: ${err.message || err}`);
      console.error(err);
    }
  };

  const handleConfirmFacultyAssignmentUpload = async () => {
    const validAssignments = facultyAssignmentPreviewData.filter((_, index) => facultyAssignmentValidationStatus[index]?.valid);

    if (validAssignments.length === 0) {
      setFacultyError('No valid faculty assignments to upload');
      setFacultyAssignmentPreviewModalOpen(false);
      return;
    }

    setIsFacultyAssignmentUploading(true);
    setFacultyError('');

    try {
      const createdAssignments = [];
      const token = localStorage.getItem('token');

      for (let i = 0; i < validAssignments.length; i++) {
        const assignment = validAssignments[i];
        // Get the facultyId from the validation status of the original preview data
        const originalIndex = facultyAssignmentPreviewData.indexOf(assignment);
        const facultyId = facultyAssignmentValidationStatus[originalIndex]?.facultyId;

        if (!facultyId) { // Should not happen if validation is correct, but as a safeguard
          console.warn('Skipping assignment due to missing facultyId after validation', assignment);
          continue;
        }

        const res = await fetch(`${API_BASE}/api/faculty-assignments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            facultyId: facultyId,
            trackName: assignment.trackName,
            strandName: assignment.strandName,
            sectionName: assignment.sectionName,
            gradeLevel: assignment.gradeLevel,
            subjectName: assignment.subjectName,
            termId: termDetails._id,
            quarterName: quarterData ? quarterData.quarterName : undefined
          })
        });

        if (res.ok) {
          const newAssignment = await res.json();
          createdAssignments.push(newAssignment);
        } else {
          const data = await res.json();
          console.error(`Failed to create assignment for ${assignment.facultyName}:`, data.message);
          throw new Error(data.message || `Failed to create assignment for ${assignment.facultyNameInput}`);
        }
      }

      // Refresh the faculty assignments list after successful upload
      fetchFacultyAssignments();
      // Audit log: Batch Upload Faculty Assignments
      try {
        fetch(`${API_BASE}/audit-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'Batch Upload Faculty Assignments',
            details: `Uploaded ${createdAssignments.length} Faculty Assignments for ${termDetails.schoolYear} ${termDetails.termName}`,
            userRole: 'admin'
          })
        }).catch(() => {});
      } catch {}
      window.alert(`${createdAssignments.length} faculty assignment(s) uploaded successfully!`);
      setFacultyAssignmentExcelFile(null);
      setFacultyAssignmentPreviewModalOpen(false);
      document.querySelector('input[type="file"][accept=".xlsx,.xls"]').value = '';

    } catch (err) {
      setFacultyError(err.message || 'Error uploading faculty assignments');
      console.error(err);
    } finally {
      setIsFacultyAssignmentUploading(false);
    }
  };
  // Helper function to find actual data headers in Excel files
  const findDataHeaders = (rawData, expectedHeaders) => {
    console.log('Searching for headers in raw data:', rawData);
    console.log('Expected headers:', expectedHeaders);
    
    // Look for a row that contains most of the expected headers
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) {
        console.log(`Row ${i} is empty, skipping`);
        continue;
      }
      
      // Convert row to lowercase strings for comparison
      const rowStrings = row.map(cell => String(cell || '').toLowerCase().trim());
      console.log(`Row ${i} strings:`, rowStrings);
      
      // Skip rows that are mostly empty or contain only whitespace
      const nonEmptyCells = rowStrings.filter(cell => cell.length > 0);
      if (nonEmptyCells.length < 2) {
        console.log(`Row ${i} has too few non-empty cells (${nonEmptyCells.length}), skipping`);
        continue;
      }
      
      // Check how many expected headers are found in this row
      let matchCount = 0;
      const matches = [];
      for (const expectedHeader of expectedHeaders) {
        const normalizedExpected = expectedHeader.toLowerCase().trim();
        const found = rowStrings.some(cell => {
          // More strict matching - cell must contain the expected header
          const match = cell === normalizedExpected || 
                       (cell.length > 0 && normalizedExpected.length > 0 && 
                        (cell.includes(normalizedExpected) || normalizedExpected.includes(cell)));
          if (match) {
            matches.push(`${expectedHeader} -> ${cell}`);
          }
          return match;
        });
        if (found) matchCount++;
      }
      
      console.log(`Row ${i} match count: ${matchCount}/${expectedHeaders.length}, matches:`, matches);
      
      // If we find at least 70% of expected headers AND the row has substantial content, this is likely the header row
      if (matchCount >= Math.ceil(expectedHeaders.length * 0.7) && nonEmptyCells.length >= expectedHeaders.length * 0.5) {
        console.log(`Found header row at index ${i}:`, row);
        return { headerRowIndex: i, headers: row };
      }
    }
    
    // If no suitable header row is found, try to find the first row with substantial content
    console.log('No suitable header row found, looking for first substantial row...');
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;
      
      const nonEmptyCells = row.filter(cell => String(cell || '').trim().length > 0);
      if (nonEmptyCells.length >= 2) {
        console.log(`Using row ${i} as fallback header row:`, row);
        return { headerRowIndex: i, headers: row };
      }
    }
    
    // If no good match found, return the first row as fallback
    console.warn('No suitable header row found, using first row as fallback');
    return { headerRowIndex: 0, headers: rawData[0] || [] };
  };

  // Download Student Assignment Template
  const downloadStudentAssignmentTemplate = async () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Template for adding new student assignments with complete school details
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.'],
        ['2772-2774 Roxas Boulevard, Pasay City 1300 Philippines'],
        ['PAASCU Accredited - COLLEGE'],
        [''], // Empty row
        ['ENROLLED STUDENTS MANAGEMENT'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Academic Year: ${termDetails.schoolYear}`],
        [`Term: ${termDetails.termName}`],
        [''], // Empty row
        ['enrollment_no', 'date', 'student_no', 'last_name', 'first_name', 'strand', 'section', 'grade'], // Updated format
      ]);
      
      // Set column widths
      templateWs['!cols'] = [
        { wch: 15 }, // enrollment_no
        { wch: 12 }, // date
        { wch: 15 }, // student_no
        { wch: 20 }, // last_name
        { wch: 20 }, // first_name
        { wch: 25 }, // strand
        { wch: 20 }, // section
        { wch: 10 }  // grade
      ];
      
      XLSX.utils.book_append_sheet(wb, templateWs, 'Enrolled Students Template');

      // Sheet 2: Current student assignments in the system with school details
      const currentStudentAssignments = studentAssignments.filter(sa => sa.status === 'active');
      const currentStudentAssignmentsData = [
        // Complete school details header
        ['SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.'],
        ['2772-2774 Roxas Boulevard, Pasay City 1300 Philippines'],
        ['PAASCU Accredited - COLLEGE'],
        [''], // Empty row
        ['CURRENT ENROLLED STUDENTS'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Academic Year: ${termDetails.schoolYear}`],
        [`Term: ${termDetails.termName}`],
        [''], // Empty row
        // Student data headers
        ['Student N.', 'Student ID', 'Enrollment No.', 'Enrollment Date', 'Last Name', 'First Name', 'Strand', 'Section', 'Grade', 'Status'],
        // Student data rows
        ...currentStudentAssignments.map((assignment, index) => {
          const student = students.find(s => s._id === assignment.studentId);
          const status = isStudentApproved(assignment) ? 'Active' : 'Pending Approval';
          return [
            `${assignment.lastname || ''} ${assignment.firstname || ''}`.trim() || 'Unknown',
            student?.schoolID || assignment.studentSchoolID || assignment.schoolID || '',
            assignment.enrollmentNo || 'N/A',
            assignment.enrollmentDate ? 
              new Date(assignment.enrollmentDate).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit', 
                year: 'numeric'
              }) : 'N/A',
            assignment.lastname || '',
            assignment.firstname || '',
            assignment.strandName || 'N/A',
            assignment.sectionName || 'N/A',
            assignment.gradeLevel || 'N/A',
            status
          ];
        })
      ];

      const currentStudentAssignmentsWs = XLSX.utils.aoa_to_sheet(currentStudentAssignmentsData);
      const saWscols = [
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
      ];
      currentStudentAssignmentsWs['!cols'] = saWscols;
      XLSX.utils.book_append_sheet(wb, currentStudentAssignmentsWs, 'Current Enrolled Students');

      // Sheet 3: Available Students
      const activeStudents = students.filter(s => !s.isArchived);
      const availableStudentsData = [
        ['Student School ID', 'Student Name', 'Email', 'Status'], // Updated headers to use School ID
        ...activeStudents.map(s => [
          s.schoolID || '', // Use school ID instead of object ID
          `${s.firstname} ${s.lastname}`,
          s.email,
          s.isArchived ? 'Archived' : 'Active'
        ])
      ];
      const availableStudentsWs = XLSX.utils.aoa_to_sheet(availableStudentsData);
      const studentWscols = [
        { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 10 }
      ];
      availableStudentsWs['!cols'] = studentWscols;
      XLSX.utils.book_append_sheet(wb, availableStudentsWs, 'Available Students');

      // Sheet 4: Available Tracks
      const activeTracks = tracks.filter(t =>
        t.status === 'active' &&
        t.schoolYear === termDetails.schoolYear &&
        t.termName === termDetails.termName
      );
      const availableTracksData = [
        ['Track Name', 'Status'],
        ...activeTracks.map(t => [t.trackName, t.status])
      ];
      const availableTracksWs = XLSX.utils.aoa_to_sheet(availableTracksData);
      const trackWscols = [
        { wch: 20 }, { wch: 10 }
      ];
      availableTracksWs['!cols'] = trackWscols;
      XLSX.utils.book_append_sheet(wb, availableTracksWs, 'Available Tracks');

      // Sheet 5: Available Strands
      const activeStrands = strands.filter(s =>
        s.status === 'active' &&
        s.schoolYear === termDetails.schoolYear &&
        s.termName === termDetails.termName &&
        activeTracks.some(t => t.trackName === s.trackName)
      );
      const availableStrandsData = [
        ['Track Name', 'Strand Name', 'Status'],
        ...activeStrands.map(s => [s.trackName, s.strandName, s.status])
      ];
      const availableStrandsWs = XLSX.utils.aoa_to_sheet(availableStrandsData);
      const strandWscols = [
        { wch: 20 }, { wch: 20 }, { wch: 10 }
      ];
      availableStrandsWs['!cols'] = strandWscols;
      XLSX.utils.book_append_sheet(wb, availableStrandsWs, 'Available Strands');

      // Sheet 6: Available Sections
      const activeSections = sections.filter(s =>
        s.status === 'active' &&
        s.schoolYear === termDetails.schoolYear &&
        s.termName === termDetails.termName &&
        activeTracks.some(t => t.trackName === s.trackName) &&
        activeStrands.some(str => str.trackName === s.trackName && str.strandName === s.strandName)
      );
      const availableSectionsData = [
        ['Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Status'],
        ...activeSections.map(s => [
          s.trackName,
          s.strandName,
          s.sectionName,
          s.gradeLevel || '',
          s.status
        ])
      ];
      const availableSectionsWs = XLSX.utils.aoa_to_sheet(availableSectionsData);
      const sectionWscols = [
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 10 }
      ];
      availableSectionsWs['!cols'] = sectionWscols;
      XLSX.utils.book_append_sheet(wb, availableSectionsWs, 'Available Sections');

      XLSX.writeFile(wb, 'student_assignments_template.xlsx');
    } catch (error) {
      console.error('Error generating student assignment template:', error);
      setStudentExcelError('Failed to generate template. Please try again.');
    }
  };

  // Validate Enrolled Students for Batch Upload
  const validateStudentAssignments = async (assignmentsToValidate) => {
    const status = {};
    const uploadedAssignmentCombos = new Set(); // For duplicates within the uploaded file

    // Pre-fetch active data for validation efficiency
    console.log("Fetching active students, tracks, strands, sections for validation...");
    const activeStudentsMap = new Map(students.filter(s => !s.isArchived).map(s => [s.schoolID, s]));
    const activeTracksMap = new Map(tracks.filter(t => t.status === 'active').map(t => [t.trackName, t]));
    const activeStrandsMap = new Map(); // Store as {trackName-strandName: strandObject}
    const activeSectionsMap = new Map(); // Store as {trackName-strandName-sectionName: sectionObject}

    for (const track of tracks) {
      if (track.status === 'active') {
        try {
          const strandsRes = await fetch(`${API_BASE}/api/strands/track/${track.trackName}?schoolYear=${termDetails.schoolYear}&termName=${termDetails.termName}`);
          if (strandsRes.ok) {
            const fetchedStrands = await strandsRes.json();
            console.log(`Strands for track "${track.trackName}":`, fetchedStrands);
            for (const strand of fetchedStrands.filter(s => s.status === 'active')) {
              activeStrandsMap.set(`${track.trackName}-${strand.strandName}`, strand);
              try {
                const sectionsRes = await fetch(`${API_BASE}/api/sections/track/${track.trackName}/strand/${strand.strandName}?schoolYear=${termDetails.schoolYear}&termName=${termDetails.termName}`);
                if (sectionsRes.ok) {
                  const fetchedSections = await sectionsRes.json();
                  console.log(`Sections for strand "${strand.strandName}":`, fetchedSections);
                  for (const section of fetchedSections.filter(sec => sec.status === 'active')) {
                    activeSectionsMap.set(`${track.trackName}-${strand.strandName}-${section.sectionName}`, section);
                  }
                }
              } catch (err) {
                console.error(`Error fetching sections for strand ${strand.strandName}:`, err);
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching strands for track ${track.trackName}:`, err);
        }
      }
    }
    console.log("Active Students Map:", activeStudentsMap);
    console.log("Active Tracks Map:", activeTracksMap);
    console.log("Active Strands Map:", activeStrandsMap);
    console.log("Active Sections Map:", activeSectionsMap);

    // Fetch existing student assignments (assuming only one assignment per student-track-strand-section for a given term)
    const existingAssignmentsInSystem = new Set();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/student-assignments?termId=${termDetails._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        data.forEach(assign => {
          existingAssignmentsInSystem.add(`${assign.studentId}-${assign.trackName}-${assign.strandName}-${assign.sectionName}`);
        });
        console.log("Existing Enrolled Students in System:", existingAssignmentsInSystem);
      } else {
        console.error('Failed to fetch existing student assignments for validation.');
      }
    } catch (err) {
      console.error('Error fetching existing student assignments for validation:', err);
    }

    console.log("Assignments to validate:", assignmentsToValidate);
    for (let i = 0; i < assignmentsToValidate.length; i++) {
      const assignment = assignmentsToValidate[i];
      console.log(`Validating assignment ${i + 1}:`, assignment);
      // Handle new format with separate first_name and last_name
      const studentSchoolIDInput = assignment['student_no']?.trim() || assignment['Student School ID']?.trim() || '';
      const firstNameInput = assignment['first_name']?.trim() || '';
      const lastNameInput = assignment['last_name']?.trim() || '';
      const enrollmentNoInput = assignment['enrollment_no']?.trim() || '';
      const enrollmentDateInput = assignment['date']?.trim() || '';
      const gradeLevel = assignment['grade']?.trim() || assignment['Grade Level']?.trim() || '';
      const trackName = assignment['Track Name']?.trim() || ''; // Track name not in new format, will be derived from strand
      const strandName = assignment['strand']?.trim() || assignment['Strand Name']?.trim() || '';
      const sectionName = assignment['section']?.trim() || assignment['Section Name']?.trim() || '';
      // Derive track name from strand if not provided (for new San Juan format)
      let derivedTrackName = trackName;
      if (!trackName && strandName) {
        // Map strands to their tracks - handle both full names and abbreviations
        if (strandName === 'STEM' || 
            strandName === 'ABM' || 
            strandName === 'GAS' || 
            strandName === 'HUMSS' ||
            strandName === 'Accountancy, Business and Management (ABM)' || 
            strandName === 'General Academic Strand (GAS)' || 
            strandName === 'Humanities and Social Sciences (HUMSS)' || 
            strandName === 'Science, Technology, Engineering, and Mathematics (STEM)') {
          derivedTrackName = 'Academic Track';
        } else if (strandName === 'Housekeeping' || 
                   strandName === 'Cookery' || 
                   strandName === 'Food and Beverage Services' || 
                   strandName === 'Bread and Pastry Production' ||
                   strandName === 'ICT') {
          derivedTrackName = 'TVL Track';
        }
      }

      console.log(`Extracted: Student School ID: "${studentSchoolIDInput}", First Name: "${firstNameInput}", Last Name: "${lastNameInput}", Grade Level: "${gradeLevel}", Track: "${derivedTrackName}", Strand: "${strandName}", Section: "${sectionName}"`);

      let isValid = true;
      let message = 'Valid';
      let studentId = ''; // To store the student ID for valid assignments

      // 1. Check for missing required fields
      if (!studentSchoolIDInput || !firstNameInput || !lastNameInput || !gradeLevel || !derivedTrackName || !strandName || !sectionName) {
        isValid = false;
        message = 'Missing Student School ID, First Name, Last Name, Grade Level, Track Name, Strand Name, or Section Name';
        console.log(`Row ${i + 1}: Missing required fields - studentSchoolIDInput: "${studentSchoolIDInput}", firstNameInput: "${firstNameInput}", lastNameInput: "${lastNameInput}", gradeLevel: "${gradeLevel}", trackName: "${derivedTrackName}", strandName: "${strandName}", sectionName: "${sectionName}"`);
        status[i] = { valid: isValid, message: message, studentId: studentId };
        console.log(`Row ${i + 1}: Final validation result - valid: ${isValid}, message: "${message}"`);
        continue; // Skip all other validations for this row
      }

      // 1.5. Check student school ID format
      if (isValid && !validateStudentSchoolIDFormat(studentSchoolIDInput)) {
        isValid = false;
        message = `Invalid Student School ID format "${studentSchoolIDInput}". Student School ID must be in format xx-xxxxx (e.g., 25-00017, 22-00014)`;
        console.log(`Row ${i + 1}: Invalid student school ID format - "${studentSchoolIDInput}"`);
        status[i] = { valid: isValid, message: message, studentId: studentId };
        console.log(`Row ${i + 1}: Final validation result - valid: ${isValid}, message: "${message}"`);
        continue; // Skip all other validations for this row
      }
      if (isValid && !['Grade 11', 'Grade 12'].includes(gradeLevel)) {
        isValid = false;
        message = 'Grade Level must be "Grade 11" or "Grade 12"';
        console.log(`Row ${i + 1}: Invalid grade level - "${gradeLevel}"`);
        status[i] = { valid: isValid, message: message, studentId: studentId };
        console.log(`Row ${i + 1}: Final validation result - valid: ${isValid}, message: "${message}"`);
        continue; // Skip all other validations for this row
      }

      // 2. Check if student is enrolled in the current term and quarter
      if (isValid) {
        const studentFound = activeStudentsMap.get(studentSchoolIDInput);
        console.log(`Student with School ID "${studentSchoolIDInput}" found:`, studentFound);
        
        if (studentFound) {
          // If student exists, verify that the name matches the school ID
          const expectedName = `${studentFound.firstname} ${studentFound.lastname}`.toLowerCase();
          const providedName = `${firstNameInput} ${lastNameInput}`.toLowerCase();
          if (expectedName !== providedName) {
            console.log(`Name mismatch for existing student - will create new entry for "${firstNameInput} ${lastNameInput}"`);
            studentId = null; // Will be created as new student
          } else {
            studentId = studentFound._id;
          }
          
          // Check if student is enrolled in current term and quarter
          const isEnrolled = registrants.some(registrant => {
            const registrantSchoolId = (registrant.schoolID || '').trim();
            return registrant.status === 'approved' && 
                   registrantSchoolId === studentSchoolIDInput &&
                   registrant.termName === termDetails.termName &&
                   registrant.schoolYear === termDetails.schoolYear;
          });
          
          if (isEnrolled) {
            console.log(`Student "${studentSchoolIDInput}" is enrolled in current term and quarter`);
            message = 'Student is enrolled in this term and quarter';
          } else {
            console.log(`Student "${studentSchoolIDInput}" is not enrolled in current term and quarter`);
            isValid = false;
            message = 'Student is not enrolled in this term and quarter';
          }
        } else {
          // Student doesn't exist in system - check if they are registered
          console.log(`Student with School ID "${studentSchoolIDInput}" not found in system`);
          
          // Check if student is registered and approved for current term and quarter
          const isRegistered = registrants.some(registrant => {
            const registrantSchoolId = (registrant.schoolID || '').trim();
            return registrant.status === 'approved' && 
                   registrantSchoolId === studentSchoolIDInput &&
                   registrant.termName === termDetails.termName &&
                   registrant.schoolYear === termDetails.schoolYear;
          });
          
          if (isRegistered) {
            console.log(`Student "${studentSchoolIDInput}" is registered and approved for current term and quarter`);
            studentId = null; // Will be created during upload
            message = 'Student is registered and approved for this term and quarter';
          } else {
            console.log(`Student "${studentSchoolIDInput}" is not registered for current term and quarter`);
            isValid = false;
            message = 'Student is not enrolled in this term and quarter';
          }
        }
      }

      // 3. Check if track exists and is active
      if (isValid) {
        const trackFound = activeTracksMap.get(derivedTrackName);
        console.log(`Track "${derivedTrackName}" found:`, trackFound);
        if (!trackFound) {
          isValid = false;
          message = `Track "${derivedTrackName}" does not exist or is not active`;
        }
      }

      // 4. Check if strand exists and is active within the track
      if (isValid) {
        const strandFound = activeStrandsMap.get(`${derivedTrackName}-${strandName}`);
        console.log(`Strand "${strandName}" for Track "${derivedTrackName}" found:`, strandFound);
        if (!strandFound) {
          isValid = false;
          message = `Strand "${strandName}" for Track "${derivedTrackName}" does not exist or is not active`;
        }
      }

      // 5. Check if section exists and is active within the track and strand
      if (isValid) {
        const sectionFound = activeSectionsMap.get(`${derivedTrackName}-${strandName}-${sectionName}`);
        console.log(`Section "${sectionName}" for Track "${derivedTrackName}" and Strand "${strandName}" found:`, sectionFound);
        if (!sectionFound) {
          isValid = false;
          message = `Section "${sectionName}" for Track "${derivedTrackName}" and Strand "${strandName}" does not exist or is not active`;
        }
      }

      // 6. Check for duplicates within the uploaded data
      if (isValid) {
        const currentCombo = `${studentSchoolIDInput}-${derivedTrackName}-${strandName}-${sectionName}`;
        console.log(`Checking for duplicate in uploaded data: "${currentCombo}"`);
        if (uploadedAssignmentCombos.has(currentCombo)) {
          isValid = false;
          message = 'Duplicate student assignment in uploaded file';
        } else {
          uploadedAssignmentCombos.add(currentCombo);
        }
      }

      // 7. Check for existing assignments in the system (only if student exists)
      if (isValid && studentId) {
        const existingCombo = `${studentId}-${derivedTrackName}-${strandName}-${sectionName}`;
        console.log(`Row ${i + 1}: Checking for existing assignment in system: "${existingCombo}"`);
        console.log(`Row ${i + 1}: Available existing assignments:`, Array.from(existingAssignmentsInSystem));
        if (existingAssignmentsInSystem.has(existingCombo)) {
          isValid = false;
          message = 'Student assignment already exists in the system';
          console.log(`Row ${i + 1}: Found existing assignment match`);
        }
      }

      status[i] = { valid: isValid, message: message, studentId: studentId };
      console.log(`Row ${i + 1}: Final validation result - valid: ${isValid}, message: "${message}"`);
    }
    return status;
  };
  // Handle Excel File Upload for Enrolled Students
  const handleStudentAssignmentExcelFile = async (e) => {
    setStudentExcelError('');
    const file = e.target.files[0];
    if (!file) return;

    setStudentExcelFile(file);
    setStudentPreviewData([]);
    setStudentValidationStatus({});

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Read raw data to get headers for flexible matching
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
      console.log("Raw Excel Data (including headers):", rawData);

      if (rawData.length < 1) {
        setStudentExcelError('Excel file is empty.');
        return;
      }

      // Find the actual header row
      const expectedHeaders = ['enrollment_no', 'date', 'student_no', 'last_name', 'first_name', 'strand', 'section', 'grade'];
      const { headerRowIndex, headers } = findDataHeaders(rawData, expectedHeaders);
      
      // Get data rows starting after the header row
      const dataRows = rawData.slice(headerRowIndex + 1);
      console.log("Data rows for Student Assignments:", dataRows);
      
      if (dataRows.length === 0) {
        setStudentExcelError('No data rows found after headers');
        return;
      }

      const actualHeaders = headers.map(h => String(h).trim()); // Get actual headers and trim them
      console.log("Actual Headers from Excel:", actualHeaders);

      // Define expected headers and create a mapping for flexible matching (San Juan format)
      const expectedHeadersMap = {
        'enrollment_no': '',
        'date': '',
        'student_no': '',
        'last_name': '',
        'first_name': '',
        'strand': '',
        'section': '',
        'grade': '',
      };
      const headerMapping = {};

      for (const expectedKey of Object.keys(expectedHeadersMap)) {
        const foundHeader = actualHeaders.find(actual => 
          actual.toLowerCase() === expectedKey.toLowerCase() ||
          actual.toLowerCase().includes(expectedKey.toLowerCase()) ||
          expectedKey.toLowerCase().includes(actual.toLowerCase())
        );
        if (foundHeader) {
          headerMapping[expectedKey] = foundHeader;
        } else {
          setStudentExcelError(`Missing required header: "${expectedKey}". Please ensure your Excel file includes this column.`);
          return;
        }
      }
      console.log("Header Mapping (Expected to Actual):", headerMapping);

      // dataRows already sliced above, just log it
      console.log("Data Rows (excluding header):", dataRows);

      if (dataRows.length === 0) {
        setStudentExcelError('No student assignment data found in the Excel file after processing headers.');
        return;
      }

      const assignmentsToValidate = dataRows.map(row => {
        const obj = {};
        for (const expectedKey in headerMapping) {
          const actualHeader = headerMapping[expectedKey];
          const columnIndex = actualHeaders.indexOf(actualHeader); // Find the column index of the matched header
          if (columnIndex !== -1 && row[columnIndex] !== undefined && row[columnIndex] !== null) {
            obj[expectedKey] = String(row[columnIndex]).trim();
          } else {
            obj[expectedKey] = ''; // Assign empty string if data is missing for a required column
          }
        }
        return obj;
      });
      console.log("Parsed Assignments to Validate:", assignmentsToValidate);

      const validationResults = await validateStudentAssignments(assignmentsToValidate);
      setStudentPreviewData(assignmentsToValidate);
      setStudentValidationStatus(validationResults);
      setStudentPreviewModalOpen(true);

      const validCount = Object.values(validationResults).filter(v => v.valid).length;
      const invalidCount = Object.values(validationResults).filter(v => !v.valid).length;

      if (invalidCount > 0) {
        setStudentExcelError(`${invalidCount} student assignment(s) have validation errors and will be skipped. ${validCount} valid assignment(s) will be uploaded.`);
      }

    } catch (err) {
      setStudentExcelError(`Error processing Excel file: ${err.message || err}`);
      console.error(err);
    }
  };
  // Handle Confirm Student Assignment Upload
  const handleConfirmStudentAssignmentUpload = async () => {
    const validAssignments = studentPreviewData.filter((_, index) => studentValidationStatus[index]?.valid);

    if (validAssignments.length === 0) {
      setStudentExcelError('No valid student assignments to upload');
      setStudentPreviewModalOpen(false);
      return;
    }

    setIsStudentUploading(true);
    setStudentExcelError('');

    try {
      const createdAssignments = [];
      const token = localStorage.getItem('token');

      // First, create any missing academic structures (tracks, strands, sections, subjects)
      const uniqueTracks = [...new Set(validAssignments.map(a => a['strand'] === 'STEM' ? 'Academic Track' : 'TVL Track'))];
      const uniqueStrands = [...new Set(validAssignments.map(a => a['strand']))];
      const uniqueSections = [...new Set(validAssignments.map(a => a['section']))];
      const uniqueSubjects = [...new Set(validAssignments.map(a => a['subject'] || 'General'))]; // Default subject if not provided

      console.log('Creating academic structures:', { uniqueTracks, uniqueStrands, uniqueSections, uniqueSubjects });

      // Create tracks
      for (const trackName of uniqueTracks) {
        if (trackName) {
          try {
            const res = await fetch(`${API_BASE}/api/tracks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                trackName: trackName,
                schoolYear: termDetails.schoolYear,
                termName: termDetails.termName,
                quarterName: quarterData ? quarterData.quarterName : undefined
              })
            });
            if (res.ok) {
              console.log(`Created track: ${trackName}`);
            } else {
              const data = await res.json();
              if (data.message && data.message.includes('already exists')) {
                console.log(`Track ${trackName} already exists`);
              }
            }
          } catch (err) {
            console.error(`Error creating track ${trackName}:`, err);
          }
        }
      }

      // Create strands
      for (const strandName of uniqueStrands) {
        if (strandName) {
          const trackName = strandName === 'STEM' ? 'Academic Track' : 'TVL Track';
          try {
            const res = await fetch(`${API_BASE}/api/strands`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                strandName: strandName,
                trackName: trackName,
                schoolYear: termDetails.schoolYear,
                termName: termDetails.termName,
                quarterName: quarterData ? quarterData.quarterName : undefined
              })
            });
            if (res.ok) {
              console.log(`Created strand: ${strandName}`);
            } else {
              const data = await res.json();
              if (data.message && data.message.includes('already exists')) {
                console.log(`Strand ${strandName} already exists`);
              }
            }
          } catch (err) {
            console.error(`Error creating strand ${strandName}:`, err);
          }
        }
      }

      // Create sections
      for (const sectionName of uniqueSections) {
        if (sectionName) {
          const assignment = validAssignments.find(a => a['section'] === sectionName);
          if (assignment) {
            try {
              const res = await fetch(`${API_BASE}/api/sections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sectionName: sectionName,
                  trackName: assignment['strand'] === 'STEM' ? 'Academic Track' : 'TVL Track',
                  strandName: assignment['strand'],
                  gradeLevel: assignment['grade'],
                  schoolYear: termDetails.schoolYear,
                  termName: termDetails.termName,
                  quarterName: quarterData ? quarterData.quarterName : null
                })
              });
              if (res.ok) {
                console.log(`Created section: ${sectionName}`);
              } else {
                const data = await res.json();
                console.log(`Failed to create section "${sectionName}":`, data);
                if (data.message && data.message.includes('already exists')) {
                  console.log(`Section ${sectionName} already exists`);
                } else {
                  console.error(`Error creating section ${sectionName}: ${data.message || 'Unknown error'}`);
                }
              }
            } catch (err) {
              console.error(`Error creating section ${sectionName}:`, err);
            }
          }
        }
      }

      // Create subjects
      for (const subjectName of uniqueSubjects) {
        if (subjectName) {
          const assignment = validAssignments.find(a => (a['subject'] || 'General') === subjectName);
          if (assignment) {
            try {
              const res = await fetch(`${API_BASE}/api/subjects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subjectName: subjectName,
                  trackName: assignment['strand'] === 'STEM' ? 'Academic Track' : 'TVL Track',
                  strandName: assignment['strand'],
                  gradeLevel: assignment['grade'],
                  schoolYear: termDetails.schoolYear,
                  termName: termDetails.termName,
                  quarterName: quarterData ? quarterData.quarterName : undefined
                })
              });
              if (res.ok) {
                console.log(`Created subject: ${subjectName}`);
              } else {
                const data = await res.json();
                if (data.message && data.message.includes('already exists')) {
                  console.log(`Subject ${subjectName} already exists`);
                }
              }
            } catch (err) {
              console.error(`Error creating subject ${subjectName}:`, err);
            }
          }
        }
      }

      // Now create the student assignments
      for (let i = 0; i < validAssignments.length; i++) {
        const assignment = validAssignments[i];
        // Get the studentId from the validation status of the original preview data
        const originalIndex = studentPreviewData.indexOf(assignment);
        const studentId = studentValidationStatus[originalIndex]?.studentId;

        // Handle new students (studentId is null for enrollment data)
        // For enrollment data, send student info directly to assignment endpoint (same as manual assignment)
        const firstName = assignment['first_name'] || '';
        const lastName = assignment['last_name'] || '';
        const studentSchoolID = assignment['student_no'] || assignment['Student School ID'] || '';
        const enrollmentNo = assignment['enrollment_no'] || '';
        let enrollmentDate = assignment['date'] || '';
        
        // Debug logging for enrollment data
        console.log(`Processing student ${firstName} ${lastName}:`, {
          enrollmentNo,
          enrollmentDate,
          rawAssignment: assignment
        });
        
        // Format enrollment date properly if it exists
        if (enrollmentDate) {
          try {
            // Handle different date formats from Excel
            const date = new Date(enrollmentDate);
            if (!isNaN(date.getTime())) {
              // Convert to YYYY-MM-DD format for backend
              enrollmentDate = date.toISOString().split('T')[0];
            } else {
              enrollmentDate = '';
            }
          } catch (error) {
            console.warn('Invalid date format in Excel:', enrollmentDate);
            enrollmentDate = '';
          }
        }

        const res = await fetch(`${API_BASE}/api/student-assignments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify((() => {
            const basePayload = {
              gradeLevel: assignment['grade'] || assignment['Grade Level'],
              trackName: assignment['Track Name'] || (assignment['strand'] === 'STEM' ? 'Academic Track' : 'TVL Track'),
              strandName: assignment['strand'] || assignment['Strand Name'],
              sectionName: assignment['section'] || assignment['Section Name'],
              termId: termDetails._id,
              quarterName: quarterData ? quarterData.quarterName : undefined
            };
            
            if (studentId) {
              // Existing student - send studentId
              return { ...basePayload, studentId: studentId };
            } else {
              // New student - send student info directly (same as manual assignment)
              const payload = { 
                ...basePayload, 
                firstName: firstName,
                lastName: lastName,
                enrollmentNo: enrollmentNo,
                enrollmentDate: enrollmentDate
              };
              if (studentSchoolID) {
                payload.studentSchoolID = studentSchoolID;
              }
              return payload;
            }
          })())
        });

        if (res.ok) {
          const newAssignment = await res.json();
          createdAssignments.push(newAssignment);
        } else {
          const data = await res.json();
          throw new Error(data.message || `Failed to create assignment for ${firstName} ${lastName}`);
        }
      }

      // Refresh all data after successful upload
      fetchStudentAssignments();
      fetchTracks();
      fetchStrands();
      fetchSections();
      fetchSubjects();
      fetchFacultyAssignments();
      // Audit log: Batch Upload Enrolled Students
      try {
        fetch(`${API_BASE}/audit-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'Batch Upload Enrolled Students',
            details: `Uploaded ${createdAssignments.length} Enrolled Students for ${termDetails.schoolYear} ${termDetails.termName}`,
            userRole: 'admin'
          })
        }).catch(() => {});
      } catch {}
      window.alert(`${createdAssignments.length} student assignment(s) uploaded successfully!`);
      setStudentExcelFile(null);
      setStudentPreviewModalOpen(false);
      document.querySelector('input[type="file"][accept=".xlsx,.xls"]').value = '';

    } catch (err) {
      setStudentExcelError(err.message || 'Error uploading student assignments');
      console.error(err);
    } finally {
      setIsStudentUploading(false);
    }
  };

  // Fetch subjects when term details are loaded
  useEffect(() => {
    if (termDetails) {
      fetchSubjects();
    }
  }, [termDetails, quarterData]);

  const fetchSubjects = async () => {
    try {
      setSubjectError('');
      const quarterParam = quarterData ? `?quarterName=${encodeURIComponent(quarterData.quarterName)}` : '';
      const res = await fetch(`${API_BASE}/api/subjects/schoolyear/${termDetails.schoolYear}/term/${termDetails.termName}${quarterParam}`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      } else {
        const data = await res.json();
        setSubjectError(data.message || 'Failed to fetch subjects');
      }
    } catch (err) {
      setSubjectError('Error fetching subjects');
    }
  };

  const handleChangeSubjectForm = (e) => {
    const { name, value } = e.target;
    setSubjectFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleAddSubject = async (e) => {
    e.preventDefault();
    setSubjectError('');
    if (!subjectFormData.subjectName || !subjectFormData.trackName || !subjectFormData.strandName || !subjectFormData.gradeLevel) {
      setSubjectError('All fields are required.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...subjectFormData,
          schoolYear: termDetails.schoolYear,
          termName: termDetails.termName,
          quarterName: quarterData ? quarterData.quarterName : undefined
        })
      });
      if (res.ok) {
        const newSubject = await res.json();
        await fetchSubjects();
        // Audit log: Subject Added
        try {
          const token = localStorage.getItem('token');
          fetch(`${API_BASE}/audit-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              action: 'Subject Added',
              details: `Added Subject "${newSubject.subjectName}" (Grade ${newSubject.gradeLevel}) under Track "${newSubject.trackName}" / Strand "${newSubject.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}${quarterData ? ` (${quarterData.quarterName})` : ''}`,
              userRole: 'admin'
            })
          }).catch(() => {});
        } catch {}
        setSubjectFormData({ subjectName: '', trackName: '', strandName: '', gradeLevel: '' });
        window.alert('Subject added successfully!');
      } else {
        const data = await res.json();
        setSubjectError(data.message || 'Failed to add subject');
      }
    } catch (err) {
      setSubjectError('Error adding subject');
    }
  };
  const handleEditSubject = (subject) => {
    setIsSubjectEditMode(true);
    setEditingSubject(subject);
    setSubjectFormData({
      subjectName: subject.subjectName,
      trackName: subject.trackName,
      strandName: subject.strandName,
      gradeLevel: subject.gradeLevel
    });
    setIsSubjectModalOpen(true);
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    setSubjectError('');
    if (!subjectFormData.subjectName || !subjectFormData.trackName || !subjectFormData.strandName || !subjectFormData.gradeLevel) {
      setSubjectError('All fields are required.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/subjects/${editingSubject._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...subjectFormData,
          schoolYear: termDetails.schoolYear,
          termName: termDetails.termName
        })
      });
      if (res.ok) {
        const updatedSubject = await res.json();
        await fetchSubjects();
        // Audit log: Subject Edited
        try {
          const token = localStorage.getItem('token');
          const oldName = editingSubject?.subjectName;
          const newName = subjectFormData.subjectName;
          const oldGrade = editingSubject?.gradeLevel;
          const newGrade = subjectFormData.gradeLevel;
          fetch(`${API_BASE}/audit-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              action: 'Subject Edited',
              details: `Edited Subject "${oldName}" (Grade ${oldGrade}) to "${newName}" (Grade ${newGrade}) under Track "${subjectFormData.trackName}" / Strand "${subjectFormData.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
              userRole: 'admin'
            })
          }).catch(() => {});
        } catch {}
        setIsSubjectEditMode(false);
        setEditingSubject(null);
        setSubjectFormData({ subjectName: '', trackName: '', strandName: '', gradeLevel: '' });
        window.alert('Subject updated successfully!');
      } else {
        const data = await res.json();
        setSubjectError(data.message || 'Failed to update subject');
      }
    } catch (err) {
      setSubjectError('Error updating subject');
    }
  };

  const handleDeleteSubject = async (subject) => {
    if (termDetails.status === 'archived') return;
    
    try {
      // First, check dependencies
      const dependenciesRes = await fetch(`${API_BASE}/api/subjects/${subject._id}/dependencies`);
      
      if (dependenciesRes.ok) {
        const dependencies = await dependenciesRes.json();
        
        if (dependencies.totalConnections > 0) {
          // Show detailed dependency modal
          const message = `⚠️ WARNING: Deleting this subject will also delete ALL connected data!\n\n` +
            `📊 CONNECTED DATA:\n` +
            `• ${dependencies.facultyAssignments.length} Faculty Assignments\n\n` +
            `Total: ${dependencies.totalConnections} connected records\n\n` +
            `This action CANNOT be undone!\n\n` +
            `Do you want to proceed?`;
            
          if (!window.confirm(message)) {
            return;
          }
        } else {
          // No dependencies, simple confirmation
          if (!window.confirm(`Are you sure you want to delete the subject "${subject.subjectName}"?`)) {
            return;
          }
        }
        
        // Proceed with deletion (with cascade if needed)
        const deleteRes = await fetch(`${API_BASE}/api/subjects/${subject._id}?confirmCascade=true`, {
          method: 'DELETE'
        });

        if (deleteRes.ok) {
          // Refresh all data since we may have deleted related records
          fetchSubjects();
          fetchFacultyAssignments();
          // Audit log: Subject Deleted
          try {
            const token = localStorage.getItem('token');
            fetch(`${API_BASE}/audit-log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'Subject Deleted',
                details: `Deleted Subject "${subject.subjectName}" (Grade ${subject.gradeLevel}) under Track "${subject.trackName}" / Strand "${subject.strandName}" for ${termDetails.schoolYear} ${termDetails.termName}`,
                userRole: 'admin'
              })
            }).catch(() => {});
          } catch {}
          
          window.alert('Subject and all connected data deleted successfully!');
        } else {
          const data = await deleteRes.json();
          setSubjectError(data.message || 'Failed to delete subject');
        }
      } else {
        setSubjectError('Failed to check subject dependencies');
      }
    } catch (err) {
      setSubjectError('Error deleting subject');
      console.error('Error in handleDeleteSubject:', err);
    }
  };

  // Update: Enforce absolute uniqueness for subject names
  const validateSubjects = async (subjectsToValidate) => {
    const status = {};
    const uploadedSubjectNames = new Set();
    // Fetch all existing subjects in the system (for absolute uniqueness)
    let allSubjects = [];
    try {
      const res = await fetch(`${API_BASE}/api/subjects`);
      if (res.ok) {
        allSubjects = await res.json();
      }
    } catch (err) {
      // ignore
    }
    const allSubjectNamesInSystem = new Set(allSubjects.map(s => s.subjectName.trim().toLowerCase()));

    for (let i = 0; i < subjectsToValidate.length; i++) {
      const subject = subjectsToValidate[i];
      const subjectName = subject.subjectName?.trim() || '';
      let isValid = true;
      let message = 'Valid';

      // 1. Check for missing required fields
      if (!subjectName || !subject.trackName || !subject.strandName || !subject.gradeLevel) {
        isValid = false;
        message = 'All fields are required.';
      }
      // 2. Absolute uniqueness: check if subject name exists anywhere
      if (isValid) {
        if (allSubjectNamesInSystem.has(subjectName.toLowerCase())) {
          isValid = false;
          message = 'Subject name already exists in the system (must be unique)';
        }
      }
      // 3. Check for duplicates within the uploaded data (absolute uniqueness)
      if (isValid) {
        if (uploadedSubjectNames.has(subjectName.toLowerCase())) {
          isValid = false;
          message = 'Duplicate subject name in uploaded file (subject names must be unique)';
        } else {
          uploadedSubjectNames.add(subjectName.toLowerCase());
        }
      }
      status[i] = { valid: isValid, message: message };
    }
    return status;
  };

  // Download Subject Template
  const downloadSubjectTemplate = async () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Template for adding new subjects with complete school details
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.'],
        ['2772-2774 Roxas Boulevard, Pasay City 1300 Philippines'],
        ['PAASCU Accredited - COLLEGE'],
        [''], // Empty row
        ['ACADEMIC SUBJECTS MANAGEMENT'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Academic Year: ${termDetails.schoolYear}`],
        [`Term: ${termDetails.termName}`],
        [''], // Empty row
        ['Track Name', 'Strand Name', 'Grade Level', 'Subject Name'],
      ]);
      
      // Set column widths
      templateWs['!cols'] = [
        { wch: 20 }, // Track Name
        { wch: 25 }, // Strand Name
        { wch: 15 }, // Grade Level
        { wch: 25 }  // Subject Name
      ];
      
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Subjects');
      // Sheet 2: Current subjects with complete school details
      const currentSubjectsData = [
        ['SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.'],
        ['2772-2774 Roxas Boulevard, Pasay City 1300 Philippines'],
        ['PAASCU Accredited - COLLEGE'],
        [''], // Empty row
        ['CURRENT ACADEMIC SUBJECTS'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Academic Year: ${termDetails.schoolYear}`],
        [`Term: ${termDetails.termName}`],
        [''], // Empty row
        ['Track Name', 'Strand Name', 'Grade Level', 'Subject Name', 'Status'],
        ...subjects.map(subject => [
          subject.trackName,
          subject.strandName,
          subject.gradeLevel,
          subject.subjectName,
          subject.status || 'active',
        ])
      ];

      const currentSubjectsWs = XLSX.utils.aoa_to_sheet(currentSubjectsData);
      currentSubjectsWs['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 10 }
      ];
      XLSX.utils.book_append_sheet(wb, currentSubjectsWs, 'Current Subjects');

      // Sheet 3: Available Strands
      const activeStrands = strands.filter(s =>
        s.status === 'active' &&
        s.schoolYear === termDetails.schoolYear &&
        s.termName === termDetails.termName &&
        tracks.find(t => t.trackName === s.trackName && t.status === 'active')
      );

      // Create data for strands sheet - each strand on its own row
      const strandsData = [
        ['Track Name', 'Available Strands'],
        ...activeStrands.map(strand => [
          strand.trackName,
          strand.strandName
        ])
      ];

      const availableStrandsWs = XLSX.utils.aoa_to_sheet(strandsData);
      availableStrandsWs['!cols'] = [
        { wch: 20 }, // Track Name
        { wch: 40 }  // Available Strands
      ];
      XLSX.utils.book_append_sheet(wb, availableStrandsWs, 'Available Strands');

      XLSX.writeFile(wb, 'subjects_template.xlsx');
    } catch (error) {
      setSubjectExcelError('Failed to generate template. Please try again.');
    }
  };

  // Validate Subjects for batch upload (reuse/extend existing validateSubjects)
  const validateSubjectsBatch = async (subjectsToValidate) => {
    const status = {};
    const uploadedSubjectKeys = new Set();
    
    // Get existing subjects from the component state (more reliable)
    const existingSubjects = subjects.filter(subject => subject.status === 'active');
    const existingSubjectKeys = new Set(existingSubjects.map(s => 
      `${s.trackName}-${s.strandName}-${s.subjectName}-${s.gradeLevel}`
    ));
    
    console.log('Existing subjects in system:', Array.from(existingSubjectKeys));
    
    for (let i = 0; i < subjectsToValidate.length; i++) {
      const subject = subjectsToValidate[i];
      const subjectName = subject.subjectName?.trim() || '';
      const trackName = subject.trackName?.trim() || '';
      const strandName = subject.strandName?.trim() || '';
      const gradeLevel = subject.gradeLevel?.trim() || '';
      let isValid = true;
      let message = 'Valid';
      
      // 1. Check if all required fields are provided
      if (!subjectName || !trackName || !strandName || !gradeLevel) {
        isValid = false;
        message = 'All fields are required.';
      }
      
      // 2. Check for duplicates within the uploaded file
      if (isValid) {
        const subjectKey = `${trackName}-${strandName}-${subjectName}-${gradeLevel}`;
        if (uploadedSubjectKeys.has(subjectKey)) {
          isValid = false;
          message = `Duplicate subject "${subjectName}" in ${trackName} - ${strandName} - ${gradeLevel}`;
        } else {
          uploadedSubjectKeys.add(subjectKey);
        }
      }
      
      // 3. Check if subject already exists in the system
      if (isValid) {
        const subjectKey = `${trackName}-${strandName}-${subjectName}-${gradeLevel}`;
        console.log(`Checking if subject exists: "${subjectKey}"`);
        console.log('Available existing subjects:', Array.from(existingSubjectKeys));
        if (existingSubjectKeys.has(subjectKey)) {
          isValid = false;
          message = `Subject "${subjectName}" already exists in ${trackName} - ${strandName} - ${gradeLevel}`;
        }
      }
      
      // 4. Check if track exists and is active
      if (isValid && !tracks.find(t => t.trackName === trackName && t.status === 'active')) {
        isValid = false;
        message = `Track "${trackName}" does not exist or is not active`;
      }
      
      // 5. Check if strand exists within the active track and is active
      if (isValid && !strands.find(s => s.strandName === strandName && s.trackName === trackName && s.status === 'active')) {
        isValid = false;
        message = `Strand "${strandName}" does not exist in track "${trackName}" or is not active`;
      }
      
      // 6. Check if grade level is valid
      if (isValid && gradeLevel !== 'Grade 11' && gradeLevel !== 'Grade 12') {
        isValid = false;
        message = 'Grade Level must be either "Grade 11" or "Grade 12"';
      }
      
      status[i] = { valid: isValid, message: message };
    }
    return status;
  };

  // Handle Subject Excel File
  const handleSubjectExcelFile = async (e) => {
    const file = e.target.files[0];
    setSubjectExcelError('');
    if (!file) return;
    setSubjectExcelFile(file);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Get raw data to find actual headers
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
          console.log("Raw Excel Data for Subjects:", rawData);
          
          // Find the actual header row
          const expectedHeaders = ['Track Name', 'Strand Name', 'Grade Level', 'Subject Name'];
          const { headerRowIndex, headers } = findDataHeaders(rawData, expectedHeaders);
          
          // Get data rows starting after the header row
          const dataRows = rawData.slice(headerRowIndex + 1);
          console.log("Data rows for Subjects:", dataRows);
          
          if (dataRows.length === 0) {
            setSubjectExcelError('No data rows found after headers');
            return;
          }

          // Map data rows to objects using the found headers
          const subjectsToPreview = dataRows.map(row => {
            const subjectObj = {};
            headers.forEach((header, index) => {
              const key = String(header).trim();
              subjectObj[key] = String(row[index] || '').trim();
            });
            return {
              trackName: subjectObj['Track Name'] || '',
              strandName: subjectObj['Strand Name'] || '',
              gradeLevel: subjectObj['Grade Level'] || '',
              subjectName: subjectObj['Subject Name'] || ''
            };
          }).filter(subject => subject.trackName && subject.strandName && subject.subjectName); // Only include subjects with required fields

          if (subjectsToPreview.length === 0) {
            setSubjectExcelError('No valid subject data found');
            return;
          }
          const validationResults = await validateSubjectsBatch(subjectsToPreview);
          setSubjectPreviewData(subjectsToPreview);
          setSubjectValidationStatus(validationResults);
          setSubjectPreviewModalOpen(true);
          setSubjectExcelFile(file);
          const validCount = Object.values(validationResults).filter(v => v.valid).length;
          const invalidCount = Object.values(validationResults).filter(v => !v.valid).length;
          if (invalidCount > 0) {
            setSubjectExcelError(`${invalidCount} subject(s) have validation errors and will be skipped. ${validCount} valid subject(s) will be uploaded.`);
          }
        } catch (err) {
          setSubjectExcelError('Error processing Excel file');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setSubjectExcelError('Error reading file');
    }
  };

  // Confirm Subject Upload
  const handleConfirmSubjectUpload = async () => {
    const validSubjects = subjectPreviewData.filter((_, index) => subjectValidationStatus[index]?.valid);
    if (validSubjects.length === 0) {
      setSubjectExcelError('No valid subjects to upload');
      setSubjectPreviewModalOpen(false);
      return;
    }
    setIsSubjectUploading(true);
    setSubjectExcelError('');
    try {
      const createdSubjects = [];
      for (const subject of validSubjects) {
        const res = await fetch(`${API_BASE}/api/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...subject,
            schoolYear: termDetails.schoolYear,
            termName: termDetails.termName
          })
        });
        if (res.ok) {
          const newSubject = await res.json();
          createdSubjects.push(newSubject);
        } else {
          const data = await res.json();
          throw new Error(data.message || 'Failed to create subject');
        }
      }
      await fetchSubjects();
      // Audit log: Batch Upload Subjects
      try {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/audit-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'Batch Upload Subjects',
            details: `Uploaded ${validSubjects.length} Subjects for ${termDetails.schoolYear} ${termDetails.termName}`,
            userRole: 'admin'
          })
        }).catch(() => {});
      } catch {}
      window.alert(`${validSubjects.length} subject(s) uploaded successfully!`);
      setSubjectExcelFile(null);
      setSubjectPreviewModalOpen(false);
      document.querySelector('input[type="file"][accept=".xlsx,.xls"]').value = '';
    } catch (err) {
      setSubjectExcelError(err.message || 'Error uploading subjects');
    } finally {
      setIsSubjectUploading(false);
    }
  };

  // New functions for extracting data to Excel
  const extractTracksToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const activeTracks = tracks.filter(t => t.status === 'active' && t.schoolYear === termDetails.schoolYear && t.termName === termDetails.termName);
      const tracksData = [
        ['Track Name', 'Status'],
        ...activeTracks.map(track => [
          track.trackName,
          track.status
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(tracksData);
      XLSX.utils.book_append_sheet(wb, ws, 'Active Tracks');
      const exportFileName = `${termDetails.schoolYear} - ${termDetails.termName}${quarterData ? ` - ${quarterData.quarterName}` : ''} - tracks.xlsx`;
      XLSX.writeFile(wb, exportFileName);
      // Audit log: Extract Tracks
      try {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/audit-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'Extract Tracks',
            details: `Extracted Tracks for ${termDetails.schoolYear} ${termDetails.termName}`,
            userRole: 'admin'
          })
        }).catch(() => {});
      } catch {}
    } catch (error) {
      console.error('Error extracting tracks to Excel:', error);
      // Optionally, show an alert to the user
      alert('Failed to extract tracks to Excel. Please try again.');
    }
  };
  const extractStrandsToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const currentStrands = strands.filter(s =>
        s.status === 'active' &&
        s.schoolYear === termDetails.schoolYear &&
        s.termName === termDetails.termName
      );
      const strandsData = [
        ['Track Name', 'Strand Name', 'Status'],
        ...currentStrands.map(strand => [
          strand.trackName,
          strand.strandName,
          strand.status
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(strandsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Current Strands');
      XLSX.writeFile(wb, 'current_strands.xlsx');
      // Audit log: Extract Strands
      try {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/audit-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'Extract Strands',
            details: `Extracted Strands for ${termDetails.schoolYear} ${termDetails.termName}`,
            userRole: 'admin'
          })
        }).catch(() => {});
      } catch {}
    } catch (error) {
      console.error('Error extracting strands to Excel:', error);
      alert('Failed to extract strands to Excel. Please try again.');
    }
  };

  const extractSectionsToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const activeSections = sections.filter(sec => sec.status === 'active' && tracks.find(t => t.trackName === sec.trackName && t.schoolYear === termDetails.schoolYear && t.termName === termDetails.termName && t.status === 'active'));
      const sectionsData = [
        ['Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Status'],
        ...activeSections.map(section => [
          section.trackName,
          section.strandName,
          section.sectionName,
          section.gradeLevel || '',
          section.status
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(sectionsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Active Sections');
      XLSX.writeFile(wb, 'active_sections.xlsx');
      // Audit log: Extract Sections
      try {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/audit-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'Extract Sections',
            details: `Extracted Sections for ${termDetails.schoolYear} ${termDetails.termName}`,
            userRole: 'admin'
          })
        }).catch(() => {});
      } catch {}
    } catch (error) {
      console.error('Error extracting sections to Excel:', error);
      alert('Failed to extract sections to Excel. Please try again.');
    }
  };
  const extractSubjectsToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const activeSubjects = subjects.filter(sub => sub.status === 'active' && sub.schoolYear === termDetails.schoolYear && sub.termName === termDetails.termName);
      const subjectsData = [
        ['Track Name', 'Strand Name', 'Grade Level', 'Subject Name', 'Status'],
        ...activeSubjects.map(subject => [
          subject.trackName,
          subject.strandName,
          subject.gradeLevel,
          subject.subjectName,
          subject.status || 'active',
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(subjectsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Active Subjects');
      XLSX.writeFile(wb, 'active_subjects.xlsx');
      // Audit log: Extract Subjects
      try {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/audit-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'Extract Subjects',
            details: `Extracted Subjects for ${termDetails.schoolYear} ${termDetails.termName}`,
            userRole: 'admin'
          })
        }).catch(() => {});
      } catch {}
    } catch (error) {
      console.error('Error extracting subjects to Excel:', error);
      alert('Failed to extract subjects to Excel. Please try again.');
    }
  };
  const extractFacultiesToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const currentFacultyAssignments = facultyAssignments.filter(fa => fa.status === 'active');
      const facultyAssignmentData = [
        ['Faculty School ID', 'Faculty Name', 'Track Name', 'Strand Name', 'Grade Level', 'Section Name', 'Subject', 'Status'],
        ...currentFacultyAssignments.map(assignment => [
          assignment.facultySchoolID || '',
          assignment.facultyName,
          assignment.trackName,
          assignment.strandName,
          assignment.gradeLevel || '',
          assignment.sectionName,
          assignment.subjectName || '',
          assignment.status
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(facultyAssignmentData);
      XLSX.utils.book_append_sheet(wb, ws, 'Active Faculty Assignments');
      XLSX.writeFile(wb, 'active_faculty_assignments.xlsx');
      // Audit log: Extract Faculty
      try {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/audit-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'Extract Faculty',
            details: `Extracted Faculty Assignments for ${termDetails.schoolYear} ${termDetails.termName}`,
            userRole: 'admin'
          })
        }).catch(() => {});
      } catch {}
    } catch (error) {
      console.error('Error extracting faculty assignments to Excel:', error);
      alert('Failed to extract faculty assignments to Excel. Please try again.');
    }
  };

  const extractStudentsToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const currentStudentAssignments = studentAssignments.filter(sa => sa.status === 'active');
      const studentAssignmentData = [
        ['enrollment_no', 'date', 'student_no', 'last_name', 'first_name', 'strand', 'section', 'grade', 'status'],
        ...currentStudentAssignments.map((assignment, index) => [
          assignment.enrollmentNo || (7180 - index), // Use enrollment number or generate sequential
          assignment.enrollmentDate || '10/3/2024', // Use enrollment date or default
          assignment.schoolID || '', // Use school ID
          assignment.studentName ? assignment.studentName.split(' ').slice(-1)[0] : '', // Last name
          assignment.studentName ? assignment.studentName.split(' ').slice(0, -1).join(' ') : '', // First name
          assignment.strandName,
          assignment.sectionName,
          assignment.gradeLevel || '',
          assignment.status
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(studentAssignmentData);
      const wsCols = [
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }
      ];
      ws['!cols'] = wsCols;
      XLSX.utils.book_append_sheet(wb, ws, 'Enrolled Students');
      XLSX.writeFile(wb, 'enrolled_students.xlsx');
      // Audit log: Extract Student
      try {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/audit-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'Extract Student',
            details: `Extracted Enrolled Students for ${termDetails.schoolYear} ${termDetails.termName}`,
            userRole: 'admin'
          })
        }).catch(() => {});
      } catch {}
    } catch (error) {
      console.error('Error extracting student assignments to Excel:', error);
      alert('Failed to extract student assignments to Excel. Please try again.');
    }
  };
  const handleImportExcelFile = async (e) => {
    const file = e.target.files[0];
    setImportError('');
    if (!file) {
      return;
    }

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setImportError('Please upload an Excel file (.xlsx or .xls).');
      return;
    }

    setImportLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          const parsedData = {
            tracks: [],
            strands: [],
            sections: [],
            subjects: [],
            facultyAssignments: [],
            studentAssignments: []
          };

          const sheetNames = [
            'Tracks',
            'Strands',
            'Sections',
            'Subjects',
            'Faculty Assignments',
            'Enrolled Students'
          ];

          for (const sheetName of sheetNames) {
            if (workbook.Sheets[sheetName]) {
              const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true });
              
              // Find the actual header row for each sheet
              let expectedHeaders = [];
              switch (sheetName) {
                case 'Tracks':
                  expectedHeaders = ['Track Name', 'School Year', 'Term Name', 'Status'];
                  break;
                case 'Strands':
                  expectedHeaders = ['Track Name', 'Strand Name', 'Status'];
                  break;
                case 'Sections':
                  expectedHeaders = ['Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Status'];
                  break;
                case 'Subjects':
                  expectedHeaders = ['Track Name', 'Strand Name', 'Grade Level', 'Subject Name', 'Status'];
                  break;
                case 'Faculty Assignments':
                  expectedHeaders = ['Faculty School ID', 'Faculty Name', 'Track Name', 'Strand Name', 'Grade Level', 'Section Name', 'Subject', 'Status'];
                  break;
                case 'Enrolled Students':
                  expectedHeaders = ['Student School ID', 'Student Name', 'Grade Level', 'Track Name', 'Strand Name', 'Section Name', 'Status'];
                  break;
                default:
                  expectedHeaders = [];
              }
              
              if (expectedHeaders.length > 0) {
                const { headerRowIndex, headers } = findDataHeaders(sheetData, expectedHeaders);
                const rows = sheetData.slice(headerRowIndex + 1);
                
                if (rows.length > 0) {
                  const normalizedRows = rows.map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                      const key = String(header).trim();
                      obj[key] = String(row[index] || '').trim();
                    });
                    return obj;
                  });

                  if (sheetName === 'Tracks') {
                    parsedData.tracks = normalizedRows.map(row => ({ trackName: row['Track Name'] }));
                  } else if (sheetName === 'Strands') {
                    parsedData.strands = normalizedRows.map(row => ({ trackName: row['Track Name'], strandName: row['Strand Name'] }));
                  } else if (sheetName === 'Sections') {
                    parsedData.sections = normalizedRows.map(row => ({ trackName: row['Track Name'], strandName: row['Strand Name'], sectionName: row['Section Name'], gradeLevel: row['Grade Level'] }));
                  } else if (sheetName === 'Subjects') {
                    parsedData.subjects = normalizedRows.map(row => ({ trackName: row['Track Name'], strandName: row['Strand Name'], gradeLevel: row['Grade Level'], subjectName: row['Subject Name'] }));
                  } else if (sheetName === 'Faculty Assignments') {
                    parsedData.facultyAssignments = normalizedRows.map(row => ({
                      facultySchoolID: row['Faculty School ID'] || row['Faculty Sc'] || row['Faculty ID'],
                      facultyName: row['Faculty Name'] || row['Faculty Na'] || row['Faculty'],
                      trackName: row['Track Name'] || row['Track Nam'] || row['Track'],
                      strandName: row['Strand Name'] || row['Strand Nam'] || row['Strand'],
                      sectionName: row['Section Name'] || row['Section Nam'] || row['Section'],
                      gradeLevel: row['Grade Level'] || row['Grade'] || row['Level'],
                      subjectName: row['Subject'] || row['Subject Nam'] || row['Subject Name'],
                    }));
                  } else if (sheetName === 'Enrolled Students') {
                    parsedData.studentAssignments = normalizedRows.map(row => ({
                      studentSchoolID: row['Student School ID'] || row['Student Sc'] || row['Student ID'],
                      studentName: row['Student Name'] || row['Student Nam'] || row['Student'],
                      gradeLevel: row['Grade Level'] || row['Grade'] || row['Level'],
                      trackName: row['Track Name'] || row['Track Nam'] || row['Track'],
                      strandName: row['Strand Name'] || row['Strand Nam'] || row['Strand'],
                      sectionName: row['Section Name'] || row['Section Nam'] || row['Section'],
                    }));
                  }
                }
              }
            }
          }

          console.log('Parsed Excel data:', parsedData);
          console.log('Student assignments parsed:', parsedData.studentAssignments);
          console.log('Faculty assignments parsed:', parsedData.facultyAssignments);
          
          setImportPreviewData(parsedData);
          setImportExcelFile(file);

          // Perform validation here (will implement validateImportData function next)
          const validationResults = await validateImportData(
            parsedData,
            {
              tracks: tracks,
              strands: strands,
              sections: sections,
              subjects: subjects,
              faculties: faculties,
              students: students,
              facultyAssignments: facultyAssignments,
              studentAssignments: studentAssignments
            },
            termDetails,
            registrants
          );
          setImportValidationStatus(validationResults);

          setImportModalOpen(true);

        } catch (err) {
          setImportError(`Error processing Excel file: ${err.message || err}`);
          console.error(err);
        } finally {
          setImportLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setImportError(`Error reading file: ${err.message || err}`);
      console.error(err);
      setImportLoading(false);
    }
  };

  // Prepare validation results for modal display
  const prepareValidationResults = () => {
    const results = {
      tracks: { valid: 0, invalid: 0, details: [] },
      strands: { valid: 0, invalid: 0, details: [] },
      sections: { valid: 0, invalid: 0, details: [] },
      subjects: { valid: 0, invalid: 0, details: [] },
      facultyAssignments: { valid: 0, invalid: 0, details: [] },
      studentAssignments: { valid: 0, invalid: 0, details: [] }
    };

    // Process tracks
    importValidationStatus.tracks.forEach((status, index) => {
      if (status.valid) {
        results.tracks.valid++;
        results.tracks.details.push({
          name: importPreviewData.tracks[index]?.trackName || 'Unknown',
          status: 'valid',
          message: '✓ Valid'
        });
      } else {
        results.tracks.invalid++;
        results.tracks.details.push({
          name: importPreviewData.tracks[index]?.trackName || 'Unknown',
          status: 'invalid',
          message: status.message || 'Invalid'
        });
      }
    });

    // Process strands
    importValidationStatus.strands.forEach((status, index) => {
      if (status.valid) {
        results.strands.valid++;
        results.strands.details.push({
          name: `${importPreviewData.strands[index]?.trackName || 'Unknown'} - ${importPreviewData.strands[index]?.strandName || 'Unknown'}`,
          status: 'valid',
          message: '✓ Valid'
        });
      } else {
        results.strands.invalid++;
        results.strands.details.push({
          name: `${importPreviewData.strands[index]?.trackName || 'Unknown'} - ${importPreviewData.strands[index]?.strandName || 'Unknown'}`,
          status: 'invalid',
          message: status.message || 'Invalid'
        });
      }
    });

    // Process sections
    importValidationStatus.sections.forEach((status, index) => {
      if (status.valid) {
        results.sections.valid++;
        results.sections.details.push({
          name: `${importPreviewData.sections[index]?.trackName || 'Unknown'} - ${importPreviewData.sections[index]?.strandName || 'Unknown'} - ${importPreviewData.sections[index]?.sectionName || 'Unknown'}`,
          status: 'valid',
          message: '✓ Valid'
        });
      } else {
        results.sections.invalid++;
        results.sections.details.push({
          name: `${importPreviewData.sections[index]?.trackName || 'Unknown'} - ${importPreviewData.sections[index]?.strandName || 'Unknown'} - ${importPreviewData.sections[index]?.sectionName || 'Unknown'}`,
          status: 'invalid',
          message: status.message || 'Invalid'
        });
      }
    });

    // Process subjects
    importValidationStatus.subjects.forEach((status, index) => {
      if (status.valid) {
        results.subjects.valid++;
        results.subjects.details.push({
          name: importPreviewData.subjects[index]?.subjectName || 'Unknown',
          status: 'valid',
          message: '✓ Valid'
        });
      } else {
        results.subjects.invalid++;
        results.subjects.details.push({
          name: importPreviewData.subjects[index]?.subjectName || 'Unknown',
          status: 'invalid',
          message: status.message || 'Invalid'
        });
      }
    });

    // Process faculty assignments
    importValidationStatus.facultyAssignments.forEach((status, index) => {
      if (status.valid) {
        results.facultyAssignments.valid++;
        results.facultyAssignments.details.push({
          name: importPreviewData.facultyAssignments[index]?.facultyName || 'Unknown',
          status: 'valid',
          message: '✓ Valid'
        });
      } else {
        results.facultyAssignments.invalid++;
        results.facultyAssignments.details.push({
          name: importPreviewData.facultyAssignments[index]?.facultyName || 'Unknown',
          status: 'invalid',
          message: status.message || 'Invalid'
        });
      }
    });

    // Process student assignments
    importValidationStatus.studentAssignments.forEach((status, index) => {
      if (status.valid) {
        results.studentAssignments.valid++;
        results.studentAssignments.details.push({
          name: importPreviewData.studentAssignments[index]?.studentName || 'Unknown',
          status: 'valid',
          message: '✓ Valid'
        });
      } else {
        results.studentAssignments.invalid++;
        results.studentAssignments.details.push({
          name: importPreviewData.studentAssignments[index]?.studentName || 'Unknown',
          status: 'invalid',
          message: status.message || 'Invalid'
        });
      }
    });

    setValidationResults(results);
    setValidationModalOpen(true);
  };
  // Handle Confirm Import Upload
  const handleConfirmImportUpload = async () => {
    if (!importExcelFile) return;

    setImportLoading(true);
    setImportError('');

    try {
      // Filter out invalid data
      const validTracks = importPreviewData.tracks.filter((_, index) => 
        importValidationStatus.tracks[index]?.valid &&
        !importValidationStatus.tracks[index]?.message?.includes('already exists')
      );
      const validStrands = importPreviewData.strands.filter((_, index) => 
        importValidationStatus.strands[index]?.valid &&
        !importValidationStatus.strands[index]?.message?.includes('already exists')
      );
      const validSections = importPreviewData.sections.filter((_, index) => 
        importValidationStatus.sections[index]?.valid && 
        !importValidationStatus.sections[index]?.message?.includes('already exists')
      );
      const validSubjects = importPreviewData.subjects.filter((_, index) => 
        importValidationStatus.subjects[index]?.valid &&
        !importValidationStatus.subjects[index]?.message?.includes('already exists')
      );
      const validFacultyAssignments = importPreviewData.facultyAssignments.filter((_, index) => 
        importValidationStatus.facultyAssignments[index]?.valid &&
        !importValidationStatus.facultyAssignments[index]?.message?.includes('already exists')
      );
      const validStudentAssignments = importPreviewData.studentAssignments.filter((_, index) => 
        importValidationStatus.studentAssignments[index]?.valid &&
        !importValidationStatus.studentAssignments[index]?.message?.includes('already exists')
      );

      let importedCount = 0;
      let skippedCount = 0;
      const skippedMessages = [];

      // Count items that were marked as "already exists" during validation
      const countSkippedItems = (data, validationStatus, type, nameField) => {
        data.forEach((item, index) => {
          const validation = validationStatus[index];
          if (validation?.valid && validation?.message?.includes('already exists')) {
            skippedCount++;
            const itemName = item[nameField] || item.name || 'Unknown';
            skippedMessages.push(`${type} "${itemName}" already exists`);
          }
        });
      };

      countSkippedItems(importPreviewData.tracks, importValidationStatus.tracks, 'Track', 'trackName');
      countSkippedItems(importPreviewData.strands, importValidationStatus.strands, 'Strand', 'strandName');
      countSkippedItems(importPreviewData.sections, importValidationStatus.sections, 'Section', 'sectionName');
      countSkippedItems(importPreviewData.subjects, importValidationStatus.subjects, 'Subject', 'subjectName');
      countSkippedItems(importPreviewData.facultyAssignments, importValidationStatus.facultyAssignments, 'Faculty assignment', 'facultyName');
      countSkippedItems(importPreviewData.studentAssignments, importValidationStatus.studentAssignments, 'Student assignment', 'studentName');

      console.log('Starting import with data:', {
        validTracks,
        validStrands,
        validSections,
        validSubjects,
        validFacultyAssignments,
        validStudentAssignments
      });

      // Import tracks
      for (const track of validTracks) {
        try {
          const res = await fetch(`${API_BASE}/api/tracks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trackName: track.trackName,
              schoolYear: termDetails.schoolYear,
              termName: termDetails.termName,
              quarterName: quarterData ? quarterData.quarterName : null
            })
          });

          if (res.ok) {
            importedCount++;
            console.log(`Successfully created track: ${track.trackName}`);
          } else {
            const data = await res.json();
            console.log(`Failed to create track "${track.trackName}":`, data);
            if (data.message && (data.message.includes('already exists') || data.message.includes('duplicate'))) {
              skippedCount++;
              skippedMessages.push(`Track "${track.trackName}" already exists`);
            } else {
              skippedCount++;
              skippedMessages.push(`Track "${track.trackName}": ${data.message || 'Unknown error'}`);
            }
          }
        } catch (err) {
          console.error('Error importing track:', err);
        }
      }

      // Import strands
      for (const strand of validStrands) {
        try {
          const res = await fetch(`${API_BASE}/api/strands`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              strandName: strand.strandName,
              trackName: strand.trackName,
              schoolYear: termDetails.schoolYear,
              termName: termDetails.termName,
              quarterName: quarterData ? quarterData.quarterName : null
            })
          });

          if (res.ok) {
            importedCount++;
          } else {
            const data = await res.json();
            if (data.message && data.message.includes('already exists')) {
              skippedCount++;
              skippedMessages.push(`Strand "${strand.strandName}" already exists`);
            }
          }
        } catch (err) {
          console.error('Error importing strand:', err);
        }
      }

      // Import sections
      for (const section of validSections) {
        try {
          const res = await fetch(`${API_BASE}/api/sections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sectionName: section.sectionName,
              trackName: section.trackName,
              strandName: section.strandName,
              gradeLevel: section.gradeLevel,
              schoolYear: termDetails.schoolYear,
              termName: termDetails.termName,
              quarterName: quarterData ? quarterData.quarterName : null
            })
          });

          if (res.ok) {
            importedCount++;
            console.log(`Successfully created section: ${section.sectionName}`);
          } else {
            const data = await res.json();
            console.log(`Failed to create section "${section.sectionName}":`, data);
            if (data.message && data.message.includes('already exists')) {
              skippedCount++;
              skippedMessages.push(`Section "${section.sectionName}" already exists`);
            } else {
              skippedCount++;
              skippedMessages.push(`Section "${section.sectionName}": ${data.message || 'Unknown error'}`);
            }
          }
        } catch (err) {
          console.error('Error importing section:', err);
        }
      }

      // Import subjects
      for (const subject of validSubjects) {
        try {
          const res = await fetch(`${API_BASE}/api/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subjectName: subject.subjectName,
              trackName: subject.trackName,
              strandName: subject.strandName,
              gradeLevel: subject.gradeLevel,
              schoolYear: termDetails.schoolYear,
              termName: termDetails.termName,
              quarterName: quarterData ? quarterData.quarterName : null
            })
          });

          if (res.ok) {
            importedCount++;
          } else {
            const data = await res.json();
            if (data.message && data.message.includes('already exists')) {
              skippedCount++;
              skippedMessages.push(`Subject "${subject.subjectName}" already exists`);
            }
          }
        } catch (err) {
          console.error('Error importing subject:', err);
        }
      }

      // Import faculty assignments
      for (const assignment of validFacultyAssignments) {
        try {
          // Find faculty by name
          const faculty = faculties.find(f => `${f.firstname} ${f.lastname}`.toLowerCase() === assignment.facultyName.toLowerCase());
          if (!faculty) {
            skippedCount++;
            skippedMessages.push(`Faculty "${assignment.facultyName}" not found`);
            continue;
          }

          console.log(`Creating faculty assignment for ${assignment.facultyName} in ${assignment.trackName}/${assignment.strandName}/${assignment.sectionName}`);

          const res = await fetch(`${API_BASE}/api/faculty-assignments`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              facultyId: faculty._id,
              facultyName: assignment.facultyName,
              trackName: assignment.trackName,
              strandName: assignment.strandName,
              sectionName: assignment.sectionName,
              gradeLevel: assignment.gradeLevel,
              subjectName: assignment.subjectName,
              termId: termDetails._id
            })
          });

          if (res.ok) {
            importedCount++;
            console.log(`Faculty assignment for ${assignment.facultyName} imported successfully`);
          } else {
            const data = await res.json();
            if (data.message && data.message.includes('already exists')) {
              skippedCount++;
              skippedMessages.push(`Faculty assignment for "${assignment.facultyName}" already exists`);
            } else {
              console.error(`Failed to import faculty assignment for ${assignment.facultyName}:`, data);
            }
          }
        } catch (err) {
          console.error('Error importing faculty assignment:', err);
        }
      }

      // Import student assignments
      for (const assignment of validStudentAssignments) {
        try {
          // Find student by school ID
          const student = students.find(s => s.schoolID === assignment.studentSchoolID);
          
          const displayName = assignment.firstName && assignment.lastName ? `${assignment.firstName} ${assignment.lastName}` : assignment.studentName;
          console.log(`Creating student assignment for ${displayName} in ${assignment.trackName}/${assignment.strandName}/${assignment.sectionName}`);

          // Prepare payload based on whether student exists in system
          let payload;
          if (student) {
            // Student exists in system - link to existing account
            payload = {
              studentId: student._id,
              trackName: assignment.trackName,
              strandName: assignment.strandName,
              sectionName: assignment.sectionName,
              gradeLevel: assignment.gradeLevel,
              termId: termDetails._id,
              quarterName: quarterData ? quarterData.quarterName : undefined
            };
          } else {
            // Student doesn't exist - create manual entry
            payload = {
              studentName: assignment.studentName,
              studentSchoolID: assignment.studentSchoolID,
              firstName: assignment.firstName || assignment.studentName.split(' ')[0],
              lastName: assignment.lastName || assignment.studentName.split(' ').slice(1).join(' '),
              enrollmentNo: assignment.enrollmentNo || '',
              enrollmentDate: assignment.enrollmentDate || new Date(),
              trackName: assignment.trackName,
              strandName: assignment.strandName,
              sectionName: assignment.sectionName,
              gradeLevel: assignment.gradeLevel,
              termId: termDetails._id,
              quarterName: quarterData ? quarterData.quarterName : undefined
            };
          }

          const res = await fetch(`${API_BASE}/api/student-assignments`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            importedCount++;
            console.log(`Student assignment for ${assignment.studentName} imported successfully`);
          } else {
            const data = await res.json();
            console.log(`Failed to import student assignment for ${assignment.studentName}:`, data);
            if (data.message && (data.message.includes('already exists') || data.message.includes('already enrolled'))) {
              skippedCount++;
              skippedMessages.push(`Student assignment for "${assignment.studentName}" already exists`);
            } else {
              skippedCount++;
              skippedMessages.push(`Student assignment for "${assignment.studentName}": ${data.message || 'Unknown error'}`);
            }
          }
        } catch (err) {
          console.error('Error importing student assignment:', err);
        }
      }

      let alertMessage = `Import process complete.
Successfully processed ${importedCount} new entries.`;

      if (skippedCount > 0) {
        alertMessage += `
Skipped ${skippedCount} duplicate or invalid entries:
Validation issues (${skippedCount} items):
- ${skippedMessages.join('\n- ')}`;
      }

      window.alert(alertMessage);

      setImportModalOpen(false);
      setImportExcelFile(null);
      setImportPreviewData({
        tracks: [],
        strands: [],
        sections: [],
        subjects: [],
        facultyAssignments: [],
        studentAssignments: []
      });
      setImportValidationStatus({
        tracks: [],
        strands: [],
        sections: [],
        subjects: [],
        facultyAssignments: [],
        studentAssignments: []
      });

      // Refresh all data after successful import
      fetchTracks();
      fetchStrands();
      fetchSections();
      fetchSubjects();
      fetchFaculties();
      fetchStudents();
      fetchFacultyAssignments();
      fetchStudentAssignments();

      // Audit log: Import Term Data
      try {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/audit-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'Import Term Data',
            details: `Imported term data for ${termDetails.schoolYear} ${termDetails.termName} (Imported: ${importedCount}, Skipped: ${skippedCount})`,
            userRole: 'admin'
          })
        }).catch(() => {});
      } catch {}

    } catch (err) {
      setImportError(err.message || 'Error during import.');
    } finally {
      setImportLoading(false);
    }
  };

  if (loading) return <div>Loading term details...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!termDetails) return <div>Term not found.</div>;

  console.log('termDetails.status:', termDetails?.status);

  // Add these helper functions near the top of the component, after useState declarations
  function getFacultyCount(termDetails, facultyAssignments) {
    // If no term details yet, show 0
    if (!termDetails) return 0;
    // If term is archived/inactive
    if (termDetails.status === 'archived') {
      // If there are any assignments for this term, show the count
      const count = facultyAssignments.filter(fa => fa.termId === termDetails._id).length;
      return count > 0 ? count : 0;
    }
    // If term is active, show the count
    return facultyAssignments.filter(fa => fa.termId === termDetails._id).length;
  }

  function getStudentCount(termDetails, studentAssignments) {
    if (!termDetails) return 0;
    if (termDetails.status === 'archived') {
      const count = studentAssignments.filter(sa => sa.termId === termDetails._id).length;
      return count > 0 ? count : 0;
    }
    return studentAssignments.filter(sa => sa.termId === termDetails._id).length;
  }

  // Place after all useState/useEffect, before return
  const filteredTracks = tracks.filter(t => {
    const matchesTerm = t.schoolYear === termDetails?.schoolYear && t.termName === termDetails?.termName;
    // Entities should be visible across all quarters within the same term
    return matchesTerm;
  });
  
  const filteredSubjects = subjects.filter(s => {
    const matchesTerm = s.schoolYear === termDetails?.schoolYear && s.termName === termDetails?.termName;
    // Entities should be visible across all quarters within the same term
    return matchesTerm;
  });

  // Before rendering the strands table, filter out duplicate strands by _id
  const filteredStrands = strands.filter(strand => {
    const matchesTerm = strand.schoolYear === termDetails.schoolYear && strand.termName === termDetails.termName;
    // Entities should be visible across all quarters within the same term
    return matchesTerm;
  });

  const uniqueStrands = filteredStrands.filter(
    (strand, index, self) =>
      index === self.findIndex((s) => s._id === strand._id)
  );

  // Filter sections by term only - entities should be visible across all quarters within the same term
  const filteredSections = sections.filter(section => {
    const matchesTerm = section.schoolYear === termDetails?.schoolYear && section.termName === termDetails?.termName;
    // Entities should be visible across all quarters within the same term
    return matchesTerm;
  });

  // Update: Enforce absolute uniqueness for strand names
  const uniqueStrandNames = Array.from(
    new Set(filteredStrands.map(strand => strand.strandName))
  );

  // Filtered student assignments based on filters
  const filteredStudentAssignments = studentAssignments.filter(assignment => {
    // If term is archived, show all assignments but they will display as archived
    if (termDetails.status === 'archived') {
      // Filter by section
      if (studentSectionFilter && assignment.sectionName !== studentSectionFilter) {
        return false;
      }
      
      // Filter by search term
      if (studentSearchFilter) {
        const searchTerm = studentSearchFilter.toLowerCase();
        const student = students.find(s => s._id === assignment.studentId);
        const schoolId = student?.schoolID || assignment.studentSchoolID || assignment.schoolID || '';
        const studentName = assignment.studentName || 'Unknown';
        
        if (!schoolId.toLowerCase().includes(searchTerm) && 
            !studentName.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    }
    
    // For active terms, use original filtering logic
    // Filter by section
    if (studentSectionFilter && assignment.sectionName !== studentSectionFilter) {
      return false;
    }
    
    // Filter by status
    if (studentStatusFilter) {
      if (studentStatusFilter === 'active' && !isStudentApproved(assignment)) {
        return false;
      }
      if (studentStatusFilter === 'pending' && isStudentApproved(assignment)) {
        return false;
      }
      if (studentStatusFilter === 'archived' && assignment.status !== 'archived') {
        return false;
      }
    }
    
    // Filter by search term
    if (studentSearchFilter) {
      const searchTerm = studentSearchFilter.toLowerCase();
      const student = students.find(s => s._id === assignment.studentId);
      const schoolId = student?.schoolID || assignment.studentSchoolID || assignment.schoolID || '';
      const studentName = assignment.studentName || 'Unknown';
      
      if (!schoolId.toLowerCase().includes(searchTerm) && 
          !studentName.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  });

  // Filtered faculty assignments based on filters
  const filteredFacultyAssignments = facultyAssignments.filter(assignment => {
    // If term is archived, show all assignments but they will display as archived
    if (termDetails.status === 'archived') {
      // Filter by section
      if (facultySectionFilter && assignment.sectionName !== facultySectionFilter) {
        return false;
      }
      
      // Filter by search term
      if (facultySearchFilter) {
        const searchTerm = facultySearchFilter.toLowerCase();
        const facultyName = assignment.facultyName?.toLowerCase() || '';
        const schoolId = (assignment.facultySchoolID || '').toLowerCase();
        const trackName = assignment.trackName?.toLowerCase() || '';
        const strandName = assignment.strandName?.toLowerCase() || '';
        const sectionName = assignment.sectionName?.toLowerCase() || '';
        const subjectName = assignment.subjectName?.toLowerCase() || '';
        
        if (!facultyName.includes(searchTerm) && 
            !schoolId.includes(searchTerm) && 
            !trackName.includes(searchTerm) && 
            !strandName.includes(searchTerm) && 
            !sectionName.includes(searchTerm) &&
            !subjectName.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    }
    
    // For active terms, use original filtering logic
    // Filter by section
    if (facultySectionFilter && assignment.sectionName !== facultySectionFilter) {
      return false;
    }
    
    // Filter by status
    if (facultyStatusFilter) {
      if (facultyStatusFilter === 'active' && assignment.status !== 'active') {
        return false;
      }
      if (facultyStatusFilter === 'archived' && assignment.status !== 'archived') {
        return false;
      }
    }
    
    // Filter by search term
    if (facultySearchFilter) {
      const searchTerm = facultySearchFilter.toLowerCase();
      const facultyName = assignment.facultyName?.toLowerCase() || '';
      const schoolId = (assignment.facultySchoolID || '').toLowerCase();
      const trackName = assignment.trackName?.toLowerCase() || '';
      const strandName = assignment.strandName?.toLowerCase() || '';
      const sectionName = assignment.sectionName?.toLowerCase() || '';
      const subjectName = assignment.subjectName?.toLowerCase() || '';
      
      if (!facultyName.includes(searchTerm) && 
          !schoolId.includes(searchTerm) && 
          !trackName.includes(searchTerm) && 
          !strandName.includes(searchTerm) && 
          !sectionName.includes(searchTerm) &&
          !subjectName.includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  });

  // Export student assignments to Excel with Breakdown of Grades format
  const handleExportStudentAssignments = async () => {
    try {
      // Export all students (active and pending)
      const allStudents = filteredStudentAssignments.filter(assignment => 
        assignment.status === 'active' // Only include non-archived students
      );

      if (allStudents.length === 0) {
        alert('No students found to export.');
        return;
      }

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Create the main classlist sheet in "Breakdown of Grades" format
      const classlistData = [
        // Header information
        ['San Juan De Dios Educational Foundation Inc.'],
        ['Breakdown of Students'],
        [`${new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}`],
        [],
        // Class information
        ['Name of Subject:', 'Enrolled Students'],
        ['Faculty Name:', 'System Administrator'],
        ['Grade:', 'All Grades'],
        ['Section:', 'All Sections'],
        ['Strand:', 'All Strands'],
        [],
        // Student data headers
        ['Student N.', 'Student ID', 'Enrollment No.', 'Enrollment Date', 'Last Name', 'First Name', 'Strand', 'Section', 'Grade', 'Status'],
        // Student data rows
        ...allStudents.map(assignment => {
          const student = students.find(s => s._id === assignment.studentId);
          const status = isStudentApproved(assignment) ? 'Active' : 'Pending Approval';
          return [
            `${assignment.lastname || ''} ${assignment.firstname || ''}`.trim() || 'Unknown',
            student?.schoolID || assignment.studentSchoolID || assignment.schoolID || '',
            assignment.enrollmentNo || 'N/A',
            assignment.enrollmentDate ? 
              new Date(assignment.enrollmentDate).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit', 
                year: 'numeric'
              }) : 'N/A',
            assignment.lastname || '',
            assignment.firstname || '',
            assignment.strandName || 'N/A',
            assignment.sectionName || 'N/A',
            assignment.gradeLevel || 'N/A',
            status
          ];
        }),
        [],
        [`Generated on ${new Date().toLocaleString('en-US', { 
          month: 'numeric', 
          day: 'numeric', 
          year: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit', 
          second: '2-digit', 
          hour12: true 
        })}`],
        ['San Juan De Dios Educational Foundation Inc.']
      ];

      const classlistWs = XLSX.utils.aoa_to_sheet(classlistData);
      XLSX.utils.book_append_sheet(wb, classlistWs, 'Student Classlist');

      // Generate filename
      const fileName = `${termDetails?.schoolYear} - ${termDetails?.termName}${quarterData ? ` - ${quarterData.quarterName}` : ''} - Student Classlist.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error exporting student assignments:', error);
      alert('Error exporting student assignments. Please try again.');
    }
  };

  // Export classlist only (Strand, Section, Grade format)
  const handleExportClasslist = async () => {
    try {
      // Export all students (active and pending)
      const allStudents = filteredStudentAssignments.filter(assignment => 
        assignment.status === 'active' // Only include non-archived students
      );

      if (allStudents.length === 0) {
        alert('No students found to export.');
        return;
      }

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Classlist Format (Strand, Section, Grade) - exactly like your example
      const classlistData = allStudents.map(assignment => ({
        'Strand': assignment.strandName || 'N/A',
        'Section': assignment.sectionName || 'N/A', 
        'Grade': assignment.gradeLevel || 'N/A'
      }));

      const classlistWs = XLSX.utils.json_to_sheet(classlistData);
      XLSX.utils.book_append_sheet(wb, classlistWs, 'Classlist');

      // Generate filename
      const fileName = `${termDetails?.schoolYear} - ${termDetails?.termName}${quarterData ? ` - ${quarterData.quarterName}` : ''} - Classlist.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error exporting classlist:', error);
      alert('Error exporting classlist. Please try again.');
    }
  };

  return (
    
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Admin_Navbar />
      

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              {quarterData ? quarterData.quarterName : termDetails.termName} ({termDetails.schoolYear})
            </h2>
            <p className="text-base md:text-lg">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <ProfileMenu />
        </div>

        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => navigate(-1)} // Go back to the previous page
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Terms List
          </button>
        </div>

        {/* Tabs */}
        <div className="">
          <div className="border-b">
            <div className="flex overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap flex items-center ${activeTab === tab.id ? 'border-b-2 border-[#00418B] text-[#00418B]' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  {tab.icon && <img src={tab.icon} alt={tab.label} className="w-5 h-5 mr-2" />}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'dashboard' && (
              <div>
                {/* Dashboard Summary */}
                <div className="flex justify-end gap-4 mb-6">
                  <button
                    onClick={() => {
                      // Extract all term data into separate sheets
                      const wb = XLSX.utils.book_new();

                      // Add San Juan de Dios header to all sheets
                      const addHeaderToSheet = (ws, sheetName) => {
                        const headerData = [
                          ["SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC."],
                          ["2772-2774 Roxas Boulevard, Pasay City 1300 Philippines"],
                          ["PAASCU Accredited - COLLEGE"],
                          [""], // Empty row
                          [`${sheetName.toUpperCase()} DETAILS`],
                          [`Generated on: ${new Date().toLocaleDateString()}`],
                          [`Academic Year: ${termDetails.schoolYear}`],
                          [`Term: ${termDetails.termName}`],
                          [""], // Empty row
                        ];
                        
                        // Get existing data
                        const existingData = XLSX.utils.sheet_to_json(ws, { header: 1 });
                        
                        // Combine header with existing data
                        const allData = [...headerData, ...existingData];
                        
                        // Create new worksheet with header
                        const newWs = XLSX.utils.aoa_to_sheet(allData);
                        
                        // Set column widths
                        newWs['!cols'] = ws['!cols'] || [];
                        
                        // Merge cells for header
                        const mergeRanges = [
                          { s: { r: 0, c: 0 }, e: { r: 0, c: (ws['!cols']?.length || 10) - 1 } }, // Institution name
                          { s: { r: 1, c: 0 }, e: { r: 1, c: (ws['!cols']?.length || 10) - 1 } }, // Address
                          { s: { r: 2, c: 0 }, e: { r: 2, c: (ws['!cols']?.length || 10) - 1 } }, // Accreditation
                          { s: { r: 4, c: 0 }, e: { r: 4, c: (ws['!cols']?.length || 10) - 1 } }, // Report title
                          { s: { r: 5, c: 0 }, e: { r: 5, c: (ws['!cols']?.length || 10) - 1 } }, // Generated date
                        ];
                        newWs['!merges'] = mergeRanges;
                        
                        return newWs;
                      };

                      // Extract Tracks
                      const activeTracks = tracks.filter(t => t.status === 'active' && t.schoolYear === termDetails.schoolYear && t.termName === termDetails.termName);
                      const tracksData = [
                        ['Track Name', 'School Year', 'Term Name', 'Status'],
                        ...activeTracks.map(track => [
                          track.trackName,
                          track.schoolYear,
                          track.termName,
                          track.status
                        ])
                      ];
                      const tracksWs = XLSX.utils.aoa_to_sheet(tracksData);
                      const tracksWsWithHeader = addHeaderToSheet(tracksWs, 'Tracks');
                      XLSX.utils.book_append_sheet(wb, tracksWsWithHeader, 'Tracks');

                      // Extract Strands
                      const activeStrands = strands.filter(s => s.status === 'active' && tracks.find(t => t.trackName === s.trackName && t.schoolYear === termDetails.schoolYear && t.termName === termDetails.termName && t.status === 'active'));
                      const strandsData = [
                        ['Track Name', 'Strand Name', 'Status'],
                        ...activeStrands.map(strand => [
                          strand.trackName,
                          strand.strandName,
                          strand.status
                        ])
                      ];
                      const strandsWs = XLSX.utils.aoa_to_sheet(strandsData);
                      const strandsWsWithHeader = addHeaderToSheet(strandsWs, 'Strands');
                      XLSX.utils.book_append_sheet(wb, strandsWsWithHeader, 'Strands');

                      // Extract Sections
                      const activeSections = sections.filter(sec => sec.status === 'active' && tracks.find(t => t.trackName === sec.trackName && t.schoolYear === termDetails.schoolYear && t.termName === termDetails.termName && t.status === 'active'));
                      const sectionsData = [
                        ['Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Status'],
                        ...activeSections.map(section => [
                          section.trackName,
                          section.strandName,
                          section.sectionName,
                          section.gradeLevel || '',
                          section.status
                        ])
                      ];
                      const sectionsWs = XLSX.utils.aoa_to_sheet(sectionsData);
                      const sectionsWsWithHeader = addHeaderToSheet(sectionsWs, 'Sections');
                      XLSX.utils.book_append_sheet(wb, sectionsWsWithHeader, 'Sections');

                      // Extract Subjects
                      const activeSubjects = subjects.filter(sub => sub.status === 'active' && sub.schoolYear === termDetails.schoolYear && sub.termName === termDetails.termName);
                      const subjectsData = [
                        ['Track Name', 'Strand Name', 'Grade Level', 'Subject Name', 'Status'],
                        ...activeSubjects.map(subject => [
                          subject.trackName,
                          subject.strandName,
                          subject.gradeLevel,
                          subject.subjectName,
                          subject.status || 'active'
                        ])
                      ];
                      const subjectsWs = XLSX.utils.aoa_to_sheet(subjectsData);
                      const subjectsWsWithHeader = addHeaderToSheet(subjectsWs, 'Subjects');
                      XLSX.utils.book_append_sheet(wb, subjectsWsWithHeader, 'Subjects');

                      // Extract Faculty Assignments
                      const currentFacultyAssignments = facultyAssignments.filter(fa => fa.status === 'active');
                      const facultyAssignmentData = [
                        ['Faculty School ID', 'Faculty Name', 'Track Name', 'Strand Name', 'Grade Level', 'Section Name', 'Subject', 'Status'],
                        ...currentFacultyAssignments.map(assignment => [
                          assignment.facultySchoolID || '',
                          assignment.facultyName,
                          assignment.trackName,
                          assignment.strandName,
                          assignment.gradeLevel || '',
                          assignment.sectionName,
                          assignment.subjectName || '',
                          assignment.status
                        ])
                      ];
                      const facultyWs = XLSX.utils.aoa_to_sheet(facultyAssignmentData);
                      const facultyWsWithHeader = addHeaderToSheet(facultyWs, 'Faculty Assignments');
                      XLSX.utils.book_append_sheet(wb, facultyWsWithHeader, 'Faculty Assignments');

                      // Extract Enrolled Students
                      const currentStudentAssignments = studentAssignments.filter(sa => sa.status === 'active');
                      const studentAssignmentData = [
                        ['Student School ID', 'Student Name', 'Grade Level', 'Track Name', 'Strand Name', 'Section Name', 'Status'],
                        ...currentStudentAssignments.map(assignment => [
                          assignment.schoolID || '',
                          assignment.studentName,
                          assignment.gradeLevel || '',
                          assignment.trackName,
                          assignment.strandName,
                          assignment.sectionName,
                          assignment.status
                        ])
                      ];
                      const studentWs = XLSX.utils.aoa_to_sheet(studentAssignmentData);
                      const studentWsWithHeader = addHeaderToSheet(studentWs, 'Enrolled Students');
                      XLSX.utils.book_append_sheet(wb, studentWsWithHeader, 'Enrolled Students');

                      // Save the workbook
                      XLSX.writeFile(wb, `${termDetails.schoolYear}_${termDetails.termName}_data.xlsx`);
                      // Audit: Export Term Data (button)
                      try {
                        const token = localStorage.getItem('token');
                        fetch(`${API_BASE}/audit-log`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            action: 'Export Term Data',
                            details: `Exported full term data for ${termDetails.schoolYear} ${termDetails.termName}`,
                            userRole: 'admin'
                          })
                        }).catch(() => {});
                      } catch {}
                    }}
                    className="bg-blue-900 text-white py-2 px-4 rounded-md hover:bg-blue-950 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
                  >
                    Export Term Data for Bulk Upload
                  </button>
                  {/* Hidden file input for import */}
                  <input
                    type="file"
                    ref={importFileInputRef}
                    onChange={handleImportExcelFile}
                    accept=".xlsx,.xls"
                    className="hidden"
                  />
                  <button
                    onClick={() => importFileInputRef.current.click()} // Trigger file input click
                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Import Term Data
                  </button>
                  <button
                    onClick={generateComprehensivePDFReport}
                    disabled={exportingPDF}
                    className={`py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      exportingPDF
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                    }`}
                  >
                    {exportingPDF ? 'Exporting...' : 'Export PDF Report'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:bg-gray-100" onClick={() => setActiveTab('tracks')}>
                    <img src={tracksIcon} alt="Tracks Icon" className="w-12 h-12 mb-2 p-2 bg-blue-50 rounded-full" />
                    <span className="text-3xl font-bold text-[#00418B]">{
                      filteredTracks.filter(t => t.status === 'active').length
                    }</span>
                    <span className="text-gray-600 mt-2">Active Tracks</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); extractTracksToExcel(); }}
                      className="mt-4 px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                      disabled={termDetails.status === 'archived'}
                    >
                      Extract Active Tracks
                    </button>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:bg-gray-100" onClick={() => setActiveTab('strands')}>
                    <img src={strandsIcon} alt="Strands Icon" className="w-12 h-12 mb-2 p-2 bg-blue-50 rounded-full" />
                    <span className="text-3xl font-bold text-[#00418B]">{
                      strands.filter(s => s.status === 'active' && filteredTracks.find(t => t.trackName === s.trackName && t.status === 'active')).length
                    }</span>
                    <span className="text-gray-600 mt-2">Active Strands</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); extractStrandsToExcel(); }}
                      className="mt-4 px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                      disabled={termDetails.status === 'archived'}
                    >
                      Extract to Excel
                    </button>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:bg-gray-100" onClick={() => setActiveTab('sections')}>
                    <img src={sectionsIcon} alt="Sections Icon" className="w-12 h-12 mb-2 p-2 bg-blue-50 rounded-full" />
                    <span className="text-3xl font-bold text-[#00418B]">{
                      filteredSections.filter(sec => sec.status === 'active' && filteredTracks.find(t => t.trackName === sec.trackName && t.status === 'active')).length
                    }</span>
                    <span className="text-gray-600 mt-2">Active Sections</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); extractSectionsToExcel(); }}
                      className="mt-4 px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                      disabled={termDetails.status === 'archived'}
                    >
                      Extract to Excel
                    </button>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:bg-gray-100" onClick={() => setActiveTab('subjects')}>
                    <img src={subjectsIcon} alt="Subjects Icon" className="w-12 h-12 mb-2 p-2 bg-blue-50 rounded-full" />
                    <span className="text-3xl font-bold text-[#00418B]">{
                      filteredSubjects.filter(sub => sub.status === 'active').length
                    }</span>
                    <span className="text-gray-600 mt-2">Active Subjects</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); extractSubjectsToExcel(); }}
                      className="mt-4 px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                      disabled={termDetails.status === 'archived'}
                    >
                      Extract to Excel
                    </button>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:bg-gray-100" onClick={() => setActiveTab('faculty')}>
                    <img src={facultyIcon} alt="Faculty Icon" className="w-12 h-12 mb-2 p-2 bg-blue-50 rounded-full" />
                    <span className="text-3xl font-bold text-[#00418B]">{
                      facultyAssignments.filter(fa => fa.status === 'active').length
                    }</span>
                    <span className="text-gray-600 mt-2">Active Faculty</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); extractFacultiesToExcel(); }}
                      className="mt-4 px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                      disabled={termDetails.status === 'archived'}
                    >
                      Extract to Excel
                    </button>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:bg-gray-100" onClick={() => setActiveTab('students')}>
                    <img src={studentIcon} alt="Student Icon" className="w-12 h-12 mb-2 p-2 bg-blue-50 rounded-full" />
                    <span className="text-3xl font-bold text-[#00418B]">{
                      studentAssignments.filter(sa => sa.status === 'active' && isStudentApproved(sa)).length
                    }</span>
                    <span className="text-gray-600 mt-2">Active Students</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); extractStudentsToExcel(); }}
                      className="mt-4 px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                      disabled={termDetails.status === 'archived'}
                    >
                      Extract to Excel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* TRACKS ALL */}
            {showTrackModal && (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
       <div className="bg-white rounded-lg shadow-lg p-6 min-w-[500px] max-w-[500px] relative">
         <button
           className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
                      onClick={() => {
                        setShowTrackModal(false);
                        setIsEditMode(false);
                        setEditingTrack(null);
                        setTrackFormData({ trackName: '', trackType: '' });
                      }}
         >
           ×
         </button>
         <form onSubmit={async (e) => {
                          if (isEditMode) {
                            await handleUpdateTrack(e);
                          } else {
                            await handleAddTrack(e);
                          }
                        }} className="space-y-4 mt-6">
                  <div className="flex flex-col md:flex-row md:space-x-4 md:space-y-0 mb-4">
                    <div className="flex-1">
                      <label htmlFor="trackType" className="block text-sm font-medium text-gray-700 mb-1">Track Type</label>
                      <select
                        id="trackType"
                        name="trackType"
                        value={trackFormData.trackType}
                        onChange={e => {
                          const selectedType = e.target.value;
                          setTrackFormData({ 
                            ...trackFormData, 
                            trackType: selectedType,
                            trackName: selectedType === 'custom' ? '' : selectedType
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={termDetails.status === 'archived'}
                      >
                        <option value="">Select Track Type</option>
                        <option value="Academic Track">Academic Track</option>
                        <option value="TVL Track">TVL Track</option>
                        <option value="custom">Custom Track</option>
                      </select>
                    </div>
                    {trackFormData.trackType === 'custom' && (
                      <div className="flex-1">
                        <label htmlFor="trackName" className="block text-sm font-medium text-gray-700 mb-1">Custom Track Name</label>
                      <input
                        type="text"
                        id="trackName"
                        name="trackName"
                        value={trackFormData.trackName}
                        onChange={e => setTrackFormData({ ...trackFormData, trackName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter custom track name"
                        required
                        disabled={termDetails.status === 'archived'}
                      />
                    </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button
                      type="submit"
                      className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${termDetails.status === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={termDetails.status === 'archived'}
                    >
                      {isEditMode ? 'Save Changes' : 'Add New Track'}
                    </button>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditMode(false);
                          setEditingTrack(null);
                          setTrackFormData({ trackName: '', trackType: '' });
                        }}
                        className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                        disabled={termDetails.status === 'archived'}
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
       </div>
     </div>
   )}
            {activeTab === 'tracks' && (
              <div>
                {termDetails.status === 'archived' && (
                  <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded text-center font-semibold">
                    This term is archived. Editing is disabled.
                  </div>
                )}
                
                {/* Tracks List Table */}
                <div className="mt-5">
                  <div className="flex justify-between items-center"> 
                  <h4 className="text-2xl font-semibold mb-2 ">Tracks List</h4>
                    <div className="flex justify-end mb-4">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                      onClick={() => {
                        setShowTrackModal(true);
                        setIsEditMode(false);
                        setEditingTrack(null);
                        setTrackFormData({ trackName: '', trackType: '' });
                      }}
                    >
                      Add New Track
                    </button>
                  </div>
                  </div>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border w-2/5">Track Name</th>
                        <th className="p-3 border w-1/5">Status</th>
                        <th className="p-3 border w-2/5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTracks.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-3 border text-center text-gray-500">
                            No tracks found.
                          </td>
                        </tr>
                      ) : (
                        paginate(filteredTracks, tracksPage, ROWS_PER_PAGE).slice.map(track => (
                          <tr key={track._id}>
                            <td className="p-3 border">{track.trackName}</td>
                            <td className="p-3 border">{track.status}</td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button
                                  onClick={() => handleEditTrack(track)}
                                  className="p-1 rounded hover:bg-yellow-100 group relative"
                                  title="Edit"
                                  disabled={termDetails.status === 'archived'}
                                >
                                  {/* Heroicons Pencil Square (black) */}
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteTrack(track)}
                                  className="p-1 rounded hover:bg-red-100 group relative"
                                  title="Delete"
                                  disabled={termDetails.status === 'archived'}
                                >
                                  {/* Heroicons Trash (red) */}
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STRANDS tab */}
            {activeTab === 'strands' && (
              <div>
                {termDetails.status === 'archived' && (
                  <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded text-center font-semibold">
                    This term is archived. Editing is disabled.
                  </div>
                )}
                
                {/* Modal for Add/Edit Strand */}
                {isStrandModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 ">
                    <div className="bg-white rounded-lg shadow-lg w-[1000px] max-w-lg p-6 relative">
                      <button
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
                        onClick={() => {
                          setIsStrandModalOpen(false);
                          setIsStrandEditMode(false);
                          setEditingStrand(null);
                          setStrandFormData({ trackId: '', strandName: '', strandType: '' });
                        }}
                      >
                        &times;
                      </button>
                      <form
                        onSubmit={async (e) => {
                          if (isStrandEditMode) {
                            await handleUpdateStrand(e);
                          } else {
                            await handleAddStrand(e);
                          }
                          // Only close modal if no error
                          if (!strandError) {
                            setIsStrandModalOpen(false);
                            setIsStrandEditMode(false);
                            setEditingStrand(null);
                            setStrandFormData({ trackId: '', strandName: '', strandType: '' });
                          }
                        }}
                        className="space-y-4"
                      >
                  <div className="flex flex-col md:flex-row md:space-x-4 md:space-y-0 mb-4">
                    <div className="flex-1">
                      <label htmlFor="trackName" className="block text-sm font-medium text-gray-700 mb-1">Track Name</label>
                      <select
                        id="trackName"
                        name="trackId"
                        value={strandFormData.trackId}
                        onChange={e => {
                          const selectedTrackId = e.target.value;
                          const selectedTrack = tracks.find(track => track._id === selectedTrackId);
                          setStrandFormData({ 
                            ...strandFormData, 
                            trackId: selectedTrackId,
                            strandType: '', // Reset strand type when track changes
                            strandName: '' // Reset strand name when track changes
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={termDetails.status === 'archived'}
                      >
                        <option value="">Select a Track</option>
                        {filteredTracks.map(track => (
                          <option key={track._id} value={track._id}>
                            {track.trackName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label htmlFor="strandType" className="block text-sm font-medium text-gray-700 mb-1">Strand Type</label>
                      <select
                        id="strandType"
                        name="strandType"
                        value={strandFormData.strandType}
                        onChange={e => {
                          const selectedType = e.target.value;
                          setStrandFormData({ 
                            ...strandFormData, 
                            strandType: selectedType,
                            strandName: selectedType === 'custom' ? '' : selectedType
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={!strandFormData.trackId || termDetails.status === 'archived'}
                      >
                        <option value="">Select Strand Type</option>
                        {(() => {
                          const selectedTrack = tracks.find(track => track._id === strandFormData.trackId);
                          if (!selectedTrack) {
                            return <option value="">Please select a track first</option>;
                          }
                          
                          if (selectedTrack.trackName === 'Academic Track') {
                            return (
                              <>
                                <optgroup label="Academic Track Strands">
                                  <option value="Accountancy, Business and Management (ABM)">Accountancy, Business and Management (ABM)</option>
                                  <option value="General Academic Strand (GAS)">General Academic Strand (GAS)</option>
                                  <option value="Humanities and Social Sciences (HUMSS)">Humanities and Social Sciences (HUMSS)</option>
                                  <option value="Science, Technology, Engineering, and Mathematics (STEM)">Science, Technology, Engineering, and Mathematics (STEM)</option>
                                </optgroup>
                                <option value="custom">Custom Strand</option>
                              </>
                            );
                          } else if (selectedTrack.trackName === 'TVL Track') {
                            return (
                              <>
                                <optgroup label="TVL Track Strands">
                                  <option value="Housekeeping">Housekeeping</option>
                                  <option value="Cookery">Cookery</option>
                                  <option value="Food and Beverage Services">Food and Beverage Services</option>
                                  <option value="Bread and Pastry Production">Bread and Pastry Production</option>
                                </optgroup>
                                <option value="custom">Custom Strand</option>
                              </>
                            );
                          } else {
                            // For custom tracks, show all options
                            return (
                              <>
                                <optgroup label="Academic Track Strands">
                                  <option value="Accountancy, Business and Management (ABM)">Accountancy, Business and Management (ABM)</option>
                                  <option value="General Academic Strand (GAS)">General Academic Strand (GAS)</option>
                                  <option value="Humanities and Social Sciences (HUMSS)">Humanities and Social Sciences (HUMSS)</option>
                                  <option value="Science, Technology, Engineering, and Mathematics (STEM)">Science, Technology, Engineering, and Mathematics (STEM)</option>
                                </optgroup>
                                <optgroup label="TVL Track Strands">
                                  <option value="Housekeeping">Housekeeping</option>
                                  <option value="Cookery">Cookery</option>
                                  <option value="Food and Beverage Services">Food and Beverage Services</option>
                                  <option value="Bread and Pastry Production">Bread and Pastry Production</option>
                                </optgroup>
                                <option value="custom">Custom Strand</option>
                              </>
                            );
                          }
                        })()}
                      </select>
                    </div>
                    {strandFormData.strandType === 'custom' && (
                      <div className="flex-1">
                        <label htmlFor="strandName" className="block text-sm font-medium text-gray-700 mb-1">Custom Strand Name</label>
                      <input
                        type="text"
                        id="strandName"
                        name="strandName"
                        value={strandFormData.strandName}
                        onChange={e => setStrandFormData({ ...strandFormData, strandName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter custom strand name"
                        required
                        disabled={termDetails.status === 'archived'}
                      />
                    </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button
                      type="submit"
                      className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${termDetails.status === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={termDetails.status === 'archived'}
                    >
                      {isStrandEditMode ? 'Save Changes' : 'Add New Strand'}
                    </button>
                    {isStrandEditMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsStrandEditMode(false);
                          setEditingStrand(null);
                          setStrandFormData({ trackId: '', strandName: '', strandType: '' });
                                setIsStrandModalOpen(false);
                        }}
                        className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                        disabled={termDetails.status === 'archived'}
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
                    </div>
                  </div>
                )}
                {/* Strands List Table */}
                <div className="mt-5">
                  <div className="flex justify-between items-center"> 
                  <h4 className="text-2xl font-semibold mb-2 ">Strands List</h4>
                  {/* Add New Strand Button */}
                  <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
                    onClick={() => {
                      setIsStrandModalOpen(true);
                      setIsStrandEditMode(false);
                      setEditingStrand(null);
                      setStrandFormData({ trackId: '', strandName: '', strandType: '' });
                    }}
                    disabled={termDetails.status === 'archived'}
                  >
                    Add New Strand
                  </button>
                  </div>
                  </div>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="p-3 border">Track Name</th>
                      <th className="p-3 border">Strand Name</th>
                      <th className="p-3 border">Status</th>
                      <th className="p-3 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueStrands.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-3 border text-center text-gray-500">
                          No strands found.
                        </td>
                      </tr>
                    ) : (
                      paginate(uniqueStrands, strandsPage, ROWS_PER_PAGE).slice.map((strand) => (
                        <tr key={strand._id}>
                          <td className="p-3 border">{strand.trackName}</td>
                          <td className="p-3 border">{strand.strandName}</td>
                          <td className="p-3 border">{strand.status}</td>
                          <td className="p-3 border">
                            <div className="inline-flex space-x-2">
                              <button
                                onClick={termDetails.status === 'archived' ? undefined : () => handleEditStrand(strand)}
                          className="p-1 rounded hover:bg-yellow-100 group relative"
                                title="Edit"
                                disabled={termDetails.status === 'archived'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                                  </svg>
                              </button>
                              <button
                                onClick={termDetails.status === 'archived' ? undefined : () => handleDeleteStrand(strand)}
                          className="p-1 rounded hover:bg-red-100 group relative"
                                title="Delete"
                                disabled={termDetails.status === 'archived'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                  </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  </table>
                  {uniqueStrands.length > 0 && (
                    <div className="flex justify-center items-center gap-2 mt-3">
                      <button className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs" onClick={() => setStrandsPage(p => Math.max(1, p - 1))} disabled={strandsPage === 1}>{'<'}</button>
                      <span className="text-xs">Page {paginate(uniqueStrands, strandsPage, ROWS_PER_PAGE).currentPage} of {paginate(uniqueStrands, strandsPage, ROWS_PER_PAGE).totalPages}</span>
                      <button className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs" onClick={() => setStrandsPage(p => Math.min(paginate(uniqueStrands, strandsPage, ROWS_PER_PAGE).totalPages, p + 1))} disabled={strandsPage === paginate(uniqueStrands, strandsPage, ROWS_PER_PAGE).totalPages}>{'>'}</button>
                    </div>
                  )}
                  
                </div>
              </div>
            )}

            {/* SECTIONS tab */}
            {activeTab === 'sections' && (
              <div className="">
                {termDetails.status === 'archived' && (
                  <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded text-center font-semibold">
                    This term is archived. Editing is disabled.
                  </div>
                )}
                
                {/* Modal for Add/Edit Section */}
                {isSectionModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 ">
                    <div className="bg-white rounded-lg shadow-lg w-[1000px] max-w-lg p-6 relative">
                      <button
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
                        onClick={() => {
                          setIsSectionModalOpen(false);
                          setIsSectionEditMode(false);
                          setEditingSection(null);
                          setSectionFormData({ trackId: '', strandId: '', sectionName: '', sectionCode: '', gradeLevel: '' });
                        }}
                      >
                        &times;
                      </button>
                      <h3 className="text-xl font-semibold mb-4">{isSectionEditMode ? 'Edit Section' : 'Add New Section'}</h3>
                  {sectionError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{sectionError}</div>}
                  {/* Excel Upload Section */}
                  <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h4 className="text-lg font-medium mb-3">Bulk Upload Sections</h4>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Upload Excel File
                        </label>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleSectionExcelFile}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={termDetails.status === 'archived'}
                        />
                      </div>
                      <button
                        onClick={downloadSectionTemplate}
                        className="bg-[#00418B] text-white py-2 px-4 rounded-md hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:ring-offset-2"
                        disabled={termDetails.status === 'archived'}
                      >
                        Download Template
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or add manually</span>
                    </div>
                  </div>
                      <form
                        onSubmit={async (e) => {
                          if (isSectionEditMode) {
                            await handleUpdateSection(e);
                          } else {
                            await handleAddSection(e);
                          }
                          // Only close modal if no error
                          if (!sectionError) {
                            setIsSectionModalOpen(false);
                            setIsSectionEditMode(false);
                            setEditingSection(null);
                            setSectionFormData({ trackId: '', strandId: '', sectionName: '', sectionCode: '', gradeLevel: '' });
                          }
                        }}
                        className="space-y-4 mt-6"
                      >
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="trackNameSection" className="block text-sm font-medium text-gray-700 mb-1">Track Name</label>
                        <select
                          id="trackNameSection"
                          name="trackId"
                          value={sectionFormData.trackId}
                          onChange={(e) => {
                            setSectionFormData({ ...sectionFormData, trackId: e.target.value, strandId: '' });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={termDetails.status === 'archived'}
                        >
                          <option value="">Select a Track</option>
                          {filteredTracks.map(track => (
                            <option key={track._id} value={track._id}>
                              {track.trackName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="strandNameSection" className="block text-sm font-medium text-gray-700 mb-1">Strand Name</label>
                        <select
                          id="strandNameSection"
                          name="strandId"
                          value={sectionFormData.strandId}
                          onChange={(e) => setSectionFormData({ ...sectionFormData, strandId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                              disabled={termDetails.status === 'archived'}
                        >
                          <option value="">Select a Strand</option>
                          {[...new Map(filteredStrandsForSection.map(strand => [strand.strandName, strand])).values()].map(strand => (
                            <option key={strand._id} value={strand._id}>
                              {strand.strandName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                        <select
                          id="gradeLevel"
                          name="gradeLevel"
                          value={sectionFormData.gradeLevel}
                          onChange={(e) => setSectionFormData({ ...sectionFormData, gradeLevel: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={termDetails.status === 'archived'}
                        >
                          <option value="">Select Grade Level</option>
                          <option value="Grade 11">Grade 11</option>
                          <option value="Grade 12">Grade 12</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="sectionName" className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
                        <input
                          type="text"
                          id="sectionName"
                          name="sectionName"
                          value={sectionFormData.sectionName}
                          onChange={(e) => {
                            const sectionName = e.target.value;
                            const sectionCode = generateSectionCode(sectionName);
                            setSectionFormData({ ...sectionFormData, sectionName, sectionCode });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={termDetails.status === 'archived'}
                        />
                        {sectionFormData.sectionCode && (
                          <div className="mt-1 text-sm text-gray-600">
                            <span className="font-medium">Auto-generated Section Code:</span> {sectionFormData.sectionCode}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className={`flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${termDetails.status === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={termDetails.status === 'archived'}
                      >
                        {isSectionEditMode ? 'Save Changes' : 'Add New Section'}
                      </button>
                      {isSectionEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSectionEditMode(false);
                            setEditingSection(null);
                            setSectionFormData({ trackId: '', strandId: '', sectionName: '', sectionCode: '', gradeLevel: '' });
                                setIsSectionModalOpen(false);
                          }}
                          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                          disabled={termDetails.status === 'archived'}
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>
                  </div>
                )}
                {/* Sections List */}
                <div className="mt-5">
                  <div className="flex justify-between items-center">
                    <h4 className="text-2xl font-semibold mb-2">Sections List</h4>
                    {/* Add New Section Button */}
                    <div className="flex justify-end">
                    <button
                      type="button"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
                      onClick={() => {
                        setIsSectionModalOpen(true);
                        setIsSectionEditMode(false);
                        setEditingSection(null);
                            setSectionFormData({ trackId: '', strandId: '', sectionName: '', sectionCode: '', gradeLevel: '' });
                      }}
                      disabled={termDetails.status === 'archived'}
                    >
                    Add New Section
                    </button>
                    </div>
                  </div>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="p-3 border w-1/7">Track Name</th>
                      <th className="p-3 border w-1/7">Strand Name</th>
                      <th className="p-3 border w-1/7">Section Name</th>
                      <th className="p-3 border w-1/7">Section Code</th>
                      <th className="p-3 border w-1/7">Grade Level</th>
                      <th className="p-3 border w-1/7">Status</th>
                      <th className="p-3 border w-1/7">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSections.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-3 border text-center text-gray-500">
                          No sections found.
                        </td>
                      </tr>
                    ) : (
                      paginate(filteredSections, sectionsPage, ROWS_PER_PAGE).slice.map((section) => (
                        <tr key={section._id}>
                          <td className="p-3 border">{section.trackName}</td>
                          <td className="p-3 border">{section.strandName}</td>
                          <td className="p-3 border">{section.sectionName}</td>
                          <td className="p-3 border">{section.sectionCode || 'N/A'}</td>
                          <td className="p-3 border">{section.gradeLevel}</td>
                          <td className="p-3 border">{section.status}</td>
                          <td className="p-3 border">
                            <div className="inline-flex space-x-2">
                              <button
                                onClick={termDetails.status === 'archived' ? undefined : () => handleEditSection(section)}
                                title="Edit"
                                className="p-1 rounded hover:bg-yellow-100 group relative"
                                disabled={termDetails.status === 'archived'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                                  </svg>
                              </button>
                              <button
                                onClick={termDetails.status === 'archived' ? undefined : () => handleDeleteSection(section)}
                                className="p-1 rounded hover:bg-red-100 group relative"
                                title="Delete"
                                disabled={termDetails.status === 'archived'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                  </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  </table>
                  {filteredSections.length > 0 && (
                    <div className="flex justify-center items-center gap-2 mt-3">
                      <button className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs" onClick={() => setSectionsPage(p => Math.max(1, p - 1))} disabled={sectionsPage === 1}>{'<'}</button>
                      <span className="text-xs">Page {paginate(filteredSections, sectionsPage, ROWS_PER_PAGE).currentPage} of {paginate(filteredSections, sectionsPage, ROWS_PER_PAGE).totalPages}</span>
                      <button className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs" onClick={() => setSectionsPage(p => Math.min(paginate(filteredSections, sectionsPage, ROWS_PER_PAGE).totalPages, p + 1))} disabled={sectionsPage === paginate(filteredSections, sectionsPage, ROWS_PER_PAGE).totalPages}>{'>'}</button>
                    </div>
                  )}
                </div>
                {/* Section Preview Modal */}
                {sectionPreviewModalOpen && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
                      <h3 className="text-xl font-semibold mb-4">Preview Sections to Upload</h3>

                      <div className="mb-4">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-blue-700">
                                {Object.values(sectionValidationStatus).filter(v => v.valid).length} section(s) are valid and will be uploaded.
                                {Object.values(sectionValidationStatus).filter(v => !v.valid).length > 0 && (
                                  <span className="block mt-1">
                                    {Object.values(sectionValidationStatus).filter(v => !v.valid).length} section(s) have validation errors and will be skipped.
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                          <thead>
                            <tr className="bg-gray-100 text-left">
                              <th className="p-3 border">Track Name</th>
                              <th className="p-3 border">Strand Name</th>
                              <th className="p-3 border">Section Name</th>
                              <th className="p-3 border">Grade Level</th>
                              <th className="p-3 border">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sectionPreviewData.map((section, index) => {
                              const isValid = sectionValidationStatus[index]?.valid;
                              const message = sectionValidationStatus[index]?.message;
                              return (
                                <tr key={index} className={!isValid ? 'bg-red-50' : ''}>
                                  <td className="p-3 border">{section.trackName}</td>
                                  <td className="p-3 border">{section.strandName}</td>
                                  <td className="p-3 border">{section.sectionName}</td>
                                  <td className="p-3 border">{section.gradeLevel}</td>
                                  <td className="p-3 border">
                                    <span className={`px-2 py-1 rounded text-xs ${isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {message}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setSectionPreviewModalOpen(false);
                            setSectionPreviewData([]);
                            setSectionValidationStatus({});
                            setSectionError('');
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmSectionUpload}
                          disabled={isSectionUploading || !sectionPreviewData.some((_, index) => sectionValidationStatus[index]?.valid)}
                          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${(!sectionPreviewData.some((_, index) => sectionValidationStatus[index]?.valid) || isSectionUploading)
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                            }`}
                        >
                          {isSectionUploading ? 'Uploading...' : `Upload ${Object.values(sectionValidationStatus).filter(v => v.valid).length} Valid Section(s)`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* SUBJECTS */}
            {activeTab === 'subjects' && (
              <div>
                {termDetails.status === 'archived' && (
                  <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded text-center font-semibold">
                    This term is archived. Editing is disabled.
                  </div>
                )}
                {/* Add New Subject Button */}
                <div className="flex justify-between items-center mt-5 mb-4">
                  <h4 className="text-2xl font-semibold mb-2">Subjects List</h4>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
                      onClick={() => {
                        setIsSubjectModalOpen(true);
                        setIsSubjectEditMode(false);
                        setEditingSubject(null);
                        setSubjectFormData({ subjectName: '', trackName: '', strandName: '', gradeLevel: '' });
                      }}
                      disabled={termDetails.status === 'archived'}
                    >
                      Add New Subject
                    </button>
                  </div>
                </div>
                {/* Modal for Add/Edit Subject */}
                {isSubjectModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 ">
                    <div className="bg-white rounded-lg shadow-lg w-[1000px] max-w-lg p-6 relative">
                      <button
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
                        onClick={() => {
                          setIsSubjectModalOpen(false);
                          setIsSubjectEditMode(false);
                          setEditingSubject(null);
                          setSubjectFormData({ subjectName: '', trackName: '', strandName: '', gradeLevel: '' });
                        }}
                      >
                        &times;
                      </button>
                      <h3 className="text-xl font-semibold mb-4">{isSubjectEditMode ? 'Edit Subject' : 'Add New Subject'}</h3>
                      {subjectError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{subjectError}</div>}
                      {/* Excel Upload Section */}
                      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                        <h4 className="text-lg font-medium mb-3">Bulk Upload Subjects</h4>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Upload Excel File
                            </label>
                            <input
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={handleSubjectExcelFile}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={termDetails.status === 'archived'}
                            />
                          </div>
                          <button
                            onClick={downloadSubjectTemplate}
                            className="bg-[#00418B] text-white py-2 px-4 rounded-md hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:ring-offset-2"
                            disabled={termDetails.status === 'archived'}
                          >
                            Download Template
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">Or add manually</span>
                        </div>
                      </div>
                      <form
                        onSubmit={async (e) => {
                          if (isSubjectEditMode) {
                            await handleUpdateSubject(e);
                          } else {
                            await handleAddSubject(e);
                          }
                          // Only close modal if no error
                          if (!subjectError) {
                            setIsSubjectModalOpen(false);
                            setIsSubjectEditMode(false);
                            setEditingSubject(null);
                            setSubjectFormData({ subjectName: '', trackName: '', strandName: '', gradeLevel: '' });
                          }
                        }}
                        className="space-y-4 mt-6"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Track Name</label>
                            <select name="trackName" value={subjectFormData.trackName} onChange={handleChangeSubjectForm} className="w-full px-3 py-2 border border-gray-300 rounded-md" required disabled={termDetails.status === 'archived'}>
                              <option value="">Select Track</option>
                              {filteredTracks.map(track => (
                                <option key={track._id} value={track.trackName}>{track.trackName}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Strand Name</label>
                            <select name="strandName" value={subjectFormData.strandName} onChange={handleChangeSubjectForm} className="w-full px-3 py-2 border border-gray-300 rounded-md" required disabled={termDetails.status === 'archived'}>
                              <option value="">Select Strand</option>
                              {[...new Map(
                                strands
                                  .filter(strand => strand.trackName === subjectFormData.trackName)
                                  .map(strand => [strand.strandName, strand])
                              ).values()].map(strand => (
                                <option key={strand._id} value={strand.strandName}>{strand.strandName}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                            <select name="gradeLevel" value={subjectFormData.gradeLevel} onChange={handleChangeSubjectForm} className="w-full px-3 py-2 border border-gray-300 rounded-md" required disabled={termDetails.status === 'archived'}>
                              <option value="">Select Grade Level</option>
                              <option value="Grade 11">Grade 11</option>
                              <option value="Grade 12">Grade 12</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                            <input type="text" name="subjectName" value={subjectFormData.subjectName} onChange={handleChangeSubjectForm} className="w-full px-3 py-2 border border-gray-300 rounded-md" required disabled={termDetails.status === 'archived'} />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            type="submit"
                            className={`flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${termDetails.status === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={termDetails.status === 'archived'}
                          >
                            {isSubjectEditMode ? 'Save Changes' : 'Add New Subject'}
                          </button>
                          {isSubjectEditMode && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsSubjectEditMode(false);
                                setEditingSubject(null);
                                setSubjectFormData({ subjectName: '', trackName: '', strandName: '', gradeLevel: '' });
                                setIsSubjectModalOpen(false);
                              }}
                              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                              disabled={termDetails.status === 'archived'}
                            >
                              Cancel Edit
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                {/* Subjects List */}
                <div className="mt-8">
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="p-3 border">Track Name</th>
                      <th className="p-3 border">Strand Name</th>
                      <th className="p-3 border">Grade Level</th>
                      <th className="p-3 border">Subject Name</th>
                      <th className="p-3 border">Status</th>
                      <th className="p-3 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-3 border text-center text-gray-500">
                          No subjects found.
                        </td>
                      </tr>
                    ) : (
                      paginate(filteredSubjects, subjectsPage, ROWS_PER_PAGE).slice.map((subject) => (
                        <tr key={subject._id}>
                          <td className="p-3 border">{subject.trackName}</td>
                          <td className="p-3 border">{subject.strandName}</td>
                          <td className="p-3 border">{subject.gradeLevel}</td>
                          <td className="p-3 border">{subject.subjectName}</td>
                          <td className="p-3 border">{subject.status}</td>
                          <td className="p-3 border">
                            <div className="inline-flex space-x-2">
                              <button
                              onClick={termDetails.status === 'archived' ? undefined : () => handleEditSubject(subject)}
                        title="Edit"
                              className="p-1 rounded hover:bg-yellow-100 group relative"
                              disabled={termDetails.status === 'archived'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                                  </svg>
                              </button>
                              <button
                                onClick={termDetails.status === 'archived' ? undefined : () => handleDeleteSubject(subject)}
                        className="p-1 rounded hover:bg-red-100 group relative"
                                title="Delete"
                                disabled={termDetails.status === 'archived'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                  </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  </table>
                  {filteredSubjects.length > 0 && (
                    <div className="flex justify-center items-center gap-2 mt-3">
                      <button className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs" onClick={() => setSubjectsPage(p => Math.max(1, p - 1))} disabled={subjectsPage === 1}>{'<'}</button>
                      <span className="text-xs">Page {paginate(filteredSubjects, subjectsPage, ROWS_PER_PAGE).currentPage} of {paginate(filteredSubjects, subjectsPage, ROWS_PER_PAGE).totalPages}</span>
                      <button className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs" onClick={() => setSubjectsPage(p => Math.min(paginate(filteredSubjects, subjectsPage, ROWS_PER_PAGE).totalPages, p + 1))} disabled={subjectsPage === paginate(filteredSubjects, subjectsPage, ROWS_PER_PAGE).totalPages}>{'>'}</button>
                    </div>
                  )}
                </div>
                
                {/* Subject Preview Modal */}
                {subjectPreviewModalOpen && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
                      <h3 className="text-xl font-semibold mb-4">Preview Subjects to Upload</h3>

                      <div className="mb-4">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-blue-700">
                                {Object.values(subjectValidationStatus).filter(v => v.valid).length} subject(s) are valid and will be uploaded.
                                {Object.values(subjectValidationStatus).filter(v => !v.valid).length > 0 && (
                                  <span className="block mt-1">
                                    {Object.values(subjectValidationStatus).filter(v => !v.valid).length} subject(s) have validation errors and will be skipped.
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                          <thead>
                            <tr className="bg-gray-100 text-left">
                              <th className="p-3 border">Track Name</th>
                              <th className="p-3 border">Strand Name</th>
                              <th className="p-3 border">Grade Level</th>
                              <th className="p-3 border">Subject Name</th>
                              <th className="p-3 border">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjectPreviewData.map((subject, index) => {
                              const isValid = subjectValidationStatus[index]?.valid;
                              const message = subjectValidationStatus[index]?.message;
                              return (
                                <tr key={index} className={!isValid ? 'bg-red-50' : ''}>
                                  <td className="p-3 border">{subject.trackName}</td>
                                  <td className="p-3 border">{subject.strandName}</td>
                                  <td className="p-3 border">{subject.gradeLevel}</td>
                                  <td className="p-3 border">{subject.subjectName}</td>
                                  <td className="p-3 border">
                                    <span className={`px-2 py-1 rounded text-xs ${isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {message}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setSubjectPreviewModalOpen(false);
                            setSubjectPreviewData([]);
                            setSubjectValidationStatus({});
                            setSubjectExcelError('');
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmSubjectUpload}
                          disabled={isSubjectUploading || !subjectPreviewData.some((_, index) => subjectValidationStatus[index]?.valid)}
                          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${(!subjectPreviewData.some((_, index) => subjectValidationStatus[index]?.valid) || isSubjectUploading)
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                            }`}
                        >
                          {isSubjectUploading ? 'Uploading...' : `Upload ${Object.values(subjectValidationStatus).filter(v => v.valid).length} Valid Subject(s)`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* FACULTY TAB */}
            {activeTab === 'faculty' && (
              <div className="">
                {termDetails.status === 'archived' && (
                  <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded text-center font-semibold">
                    This term is archived. Editing is disabled.
                  </div>
                )}
                {/* Assign Faculty Button */}
                <div className="flex justify-between items-center mt-5 mb-4">
                  <h4 className="text-2xl font-semibold mb-2">Faculty Assignments</h4>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
                      onClick={() => {
                        setIsFacultyModalOpen(true);
                        setIsFacultyEditMode(false);
                        setEditingFacultyAssignment(null);
                        setFacultyFormData({ facultyId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '', subjectName: '' });
                        setFacultySearchTerm('');
                      }}
                      disabled={termDetails.status === 'archived'}
                    >
                      Assign Faculty
                    </button>
                  </div>
                </div>
                {/* Modal for Assign/Edit Faculty */}
                {isFacultyModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 ">
                    <div className="bg-white rounded-lg shadow-lg w-[1000px] max-w-lg p-6 relative">
                      <button
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
                        onClick={() => {
                          setIsFacultyModalOpen(false);
                          setIsFacultyEditMode(false);
                          setEditingFacultyAssignment(null);
                          setFacultyFormData({ facultyId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '', subjectName: '' });
                          setFacultySearchTerm('');
                        }}
                      >
                        &times;
                      </button>
                      <h3 className="text-xl font-semibold mb-4">{isFacultyEditMode ? 'Edit Faculty Assignment' : 'Assign Faculty'}</h3>
                      {facultyError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{facultyError}</div>}
                      {/* Excel Upload Section */}
                      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                        <h4 className="text-lg font-medium mb-3">Bulk Assign Faculty</h4>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Upload Excel File
                            </label>
                            <input
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={handleFacultyAssignmentExcelFile}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={termDetails.status === 'archived'}
                            />
                          </div>
                          <button
                            onClick={downloadFacultyAssignmentTemplate}
                            className="bg-[#00418B] text-white py-2 px-4 rounded-md hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:ring-offset-2"
                            disabled={termDetails.status === 'archived'}
                          >
                            Download Template
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">Or assign manually</span>
                        </div>
                      </div>
                      <form
                        onSubmit={async (e) => {
                          if (isFacultyEditMode) {
                            await handleUpdateFacultyAssignment(e);
                          } else {
                            await handleAddFacultyAssignment(e);
                          }
                          // Only close modal if no error
                          if (!facultyError) {
                            setIsFacultyModalOpen(false);
                            setIsFacultyEditMode(false);
                            setEditingFacultyAssignment(null);
                            setFacultyFormData({ facultyId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '', subjectName: '' });
                            setFacultySearchTerm('');
                          }
                        }}
                        className="space-y-4 mt-6"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div className="relative">
                            <label htmlFor="facultySearch" className="block text-sm font-medium text-gray-700 mb-1">Faculty Name</label>
                            <input
                              type="text"
                              id="facultySearch"
                              name="facultySearch"
                              value={facultySearchTerm}
                              onChange={handleChangeFacultyForm}
                              onFocus={() => setShowFacultySuggestions(true)}
                              onBlur={() => setTimeout(() => setShowFacultySuggestions(false), 200)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Search Faculty by name or School ID..."
                              required
                              disabled={termDetails.status === 'archived'}
                            />
                            {showFacultySuggestions && facultySearchTerm.length > 0 && (
                              <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                                {facultySearchResults.map(faculty => (
                                  <li
                                    key={faculty._id}
                                    onClick={() => handleSelectFaculty(faculty)}
                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                  >
                                    <div className="font-medium">{faculty.firstname} {faculty.lastname}</div>
                                    <div className="text-sm text-gray-500">School ID: {faculty.schoolID || 'N/A'}</div>
                                  </li>
                                ))}
                                {faculties.length === 0 && (
                                  <li className="p-2 text-gray-500">No matching faculty</li>
                                )}
                              </ul>
                            )}
                          </div>
                          <div>
                            <label htmlFor="trackNameFaculty" className="block text-sm font-medium text-gray-700 mb-1">Track Name</label>
                            <select
                              disabled={termDetails.status === 'archived'}
                              id="trackNameFaculty"
                              name="trackId"
                              value={facultyFormData.trackId}
                              onChange={handleChangeFacultyForm}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            >
                              <option value="">Select a Track</option>
                              {filteredTracks.map(track => (
                                <option key={track._id} value={track._id}>
                                  {track.trackName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="strandNameFaculty" className="block text-sm font-medium text-gray-700 mb-1">Strand Name</label>
                            <select
                              id="strandNameFaculty"
                              name="strandId"
                              value={facultyFormData.strandId}
                              onChange={handleChangeFacultyForm}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                              disabled={!facultyFormData.trackId || termDetails.status === 'archived'}
                            >
                              <option value="">Select a Strand</option>
                              {[...new Map(filteredStrandsForFaculty.map(strand => [strand.strandName, strand])).values()].map(strand => (
                                <option key={strand._id} value={strand._id}>
                                  {strand.strandName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="gradeLevelFaculty" className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                            <select
                              disabled={termDetails.status === 'archived'}
                              id="gradeLevelFaculty"
                              name="gradeLevel"
                              value={facultyFormData.gradeLevel}
                              onChange={handleChangeFacultyForm}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            >
                              <option value="">Select Grade Level</option>
                              <option value="Grade 11">Grade 11</option>
                              <option value="Grade 12">Grade 12</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="sectionNameFaculty" className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                            <select
                              id="sectionNameFaculty"
                              name="sectionIds"
                              value={facultyFormData.sectionIds[0] || ''}
                              onChange={e => setFacultyFormData({ ...facultyFormData, sectionIds: [e.target.value] })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                              disabled={!facultyFormData.strandId || !facultyFormData.gradeLevel || termDetails.status === 'archived'}
                            >
                              <option value="">Select a Section</option>
                              {filteredSectionsForFaculty.map(section => (
                                <option key={section._id} value={section._id}>
                                  {section.sectionName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="subjectNameFaculty" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <select
                              id="subjectNameFaculty"
                              name="subjectName"
                              value={facultyFormData.subjectName}
                              onChange={handleChangeFacultyForm}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                              disabled={termDetails.status === 'archived'}
                            >
                              <option value="">Select Subject</option>
                              {filteredSubjects.filter(subject => subject.trackName === tracks.find(track => track._id === facultyFormData.trackId)?.trackName && subject.strandName === strands.find(strand => strand._id === facultyFormData.strandId)?.strandName && subject.gradeLevel === facultyFormData.gradeLevel).map(subject => (
                                <option key={subject._id} value={subject.subjectName}>{subject.subjectName}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            type="submit"
                            className={`flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${termDetails.status === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={termDetails.status === 'archived'}
                          >
                            {isFacultyEditMode ? 'Save Changes' : 'Assign Faculty'}
                          </button>
                          {isFacultyEditMode && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsFacultyEditMode(false);
                                setEditingFacultyAssignment(null);
                                setFacultyFormData({ facultyId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '', subjectName: '' });
                                setFacultySearchTerm('');
                                setIsFacultyModalOpen(false);
                              }}
                              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                              disabled={termDetails.status === 'archived'}
                            >
                              Cancel Edit
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                {/* Faculty Assignments List */}
                <div className="mt-8">
                  {/* Faculty Assignment Filters */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Section</label>
                        <select
                          value={facultySectionFilter}
                          onChange={(e) => setFacultySectionFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Sections</option>
                          {filteredSections.map(section => (
                            <option key={section._id} value={section.sectionName}>
                              {section.sectionName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
                        <select
                          value={facultyStatusFilter}
                          onChange={(e) => setFacultyStatusFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Status</option>
                          <option value="active">Active</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <input
                          type="text"
                          placeholder="Search faculty assignments..."
                          value={facultySearchFilter}
                          onChange={(e) => setFacultySearchFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                    <button
                          onClick={() => {
                            setFacultySectionFilter('');
                            setFacultyStatusFilter('');
                            setFacultySearchFilter('');
                          }}
                           className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Clear Filters
                        </button>
                    </div>
                  </div>
                  
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                  <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border w-1/9">Faculty School ID</th>
                        <th className="p-3 border w-1/9">Faculty Name</th>
                        <th className="p-3 border w-1/9">Track Name</th>
                        <th className="p-3 border w-1/9">Strand Name</th>
                        <th className="p-3 border w-1/9">Grade Level</th>
                        <th className="p-3 border w-1/9">Section</th>
                        <th className="p-3 border w-1/9">Subject</th>
                        <th className="p-3 border w-1/9">Status</th>
                        <th className="p-3 border w-1/9">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFacultyAssignments.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="p-3 border text-center text-gray-500">
                            No faculty assignments found.
                          </td>
                        </tr>
                      ) : (
                        paginate(filteredFacultyAssignments, facultyAssignPage, ROWS_PER_PAGE).slice.map((assignment) => (
                          <tr key={assignment._id}>
                            <td className="p-3 border">{assignment.facultySchoolID || ''}</td>
                            <td className="p-3 border">{assignment.facultyName}</td>
                            <td className="p-3 border">{assignment.trackName}</td>
                            <td className="p-3 border">{assignment.strandName}</td>
                            <td className="p-3 border">{assignment.gradeLevel}</td>
                            <td className="p-3 border">{assignment.sectionName}</td>
                            <td className="p-3 border">{assignment.subjectName || ''}</td>
                            <td className="p-3 border">
                              {termDetails.status === 'archived' ? (
                                <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Archived</span>
                              ) : assignment.status === 'archived' ? (
                                <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Archived</span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Active</span>
                              )}
                            </td>
                            <td className="p-3 border min-w-[120px]">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleEditFacultyAssignment(assignment)}
                           title="Edit"
                                  disabled={termDetails.status === 'archived'}
                                  className="p-1 rounded hover:bg-yellow-100 group relative"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteFacultyAssignment(assignment)}
                          className="p-1 rounded hover:bg-red-100 group relative"
                                  title="Delete"
                                  disabled={termDetails.status === 'archived'}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                  </svg>
                                </button>
                                {assignment.status === 'archived' && (
                                  <button
                                    onClick={() => handleUnarchiveFacultyAssignment(assignment)}
                                    className="p-1 rounded hover:bg-green-100 group relative"
                                    title="Unarchive"
                                    disabled={termDetails.status === 'archived'}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-600">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {filteredFacultyAssignments.length > 0 && (
                    <div className="flex justify-center items-center gap-2 mt-3">
                      <button className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs" onClick={() => setFacultyAssignPage(p => Math.max(1, p - 1))} disabled={facultyAssignPage === 1}>{'<'}</button>
                      <span className="text-xs">Page {paginate(filteredFacultyAssignments, facultyAssignPage, ROWS_PER_PAGE).currentPage} of {paginate(filteredFacultyAssignments, facultyAssignPage, ROWS_PER_PAGE).totalPages}</span>
                      <button className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs" onClick={() => setFacultyAssignPage(p => Math.min(paginate(filteredFacultyAssignments, facultyAssignPage, ROWS_PER_PAGE).totalPages, p + 1))} disabled={facultyAssignPage === paginate(filteredFacultyAssignments, facultyAssignPage, ROWS_PER_PAGE).totalPages}>{'>'}</button>
                    </div>
                  )}
                </div>
                
                {/* Faculty Assignment Preview Modal */}
                {facultyAssignmentPreviewModalOpen && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-auto">
                      <h3 className="text-xl font-semibold mb-4">Preview Faculty Assignments to Upload</h3>

                      <div className="mb-4">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-blue-700">
                                {Object.values(facultyAssignmentValidationStatus).filter(v => v.valid).length} faculty assignment(s) are valid and will be uploaded.
                                {Object.values(facultyAssignmentValidationStatus).filter(v => !v.valid).length > 0 && (
                                  <span className="block mt-1">
                                    {Object.values(facultyAssignmentValidationStatus).filter(v => !v.valid).length} faculty assignment(s) have validation errors and will be skipped.
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                          <thead>
                            <tr className="bg-gray-100 text-left">
                              <th className="p-3 border">Faculty School ID</th>
                              <th className="p-3 border">Faculty Name</th>
                              <th className="p-3 border">Track Name</th>
                              <th className="p-3 border">Strand Name</th>
                              <th className="p-3 border">Section Name</th>
                              <th className="p-3 border">Grade Level</th>
                              <th className="p-3 border">Subject</th>
                              <th className="p-3 border">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {facultyAssignmentPreviewData.map((assignment, index) => {
                              const isValid = facultyAssignmentValidationStatus[index]?.valid;
                              const message = facultyAssignmentValidationStatus[index]?.message;
                              return (
                                <tr key={index} className={!isValid ? 'bg-red-50' : ''}>
                                  <td className="p-3 border">{assignment.facultySchoolID || ''}</td>
                                  <td className="p-3 border">{assignment.facultyName || ''}</td>
                                  <td className="p-3 border">{assignment.trackName}</td>
                                  <td className="p-3 border">{assignment.strandName}</td>
                                  <td className="p-3 border">{assignment.sectionName}</td>
                                  <td className="p-3 border">{assignment.gradeLevel}</td>
                                  <td className="p-3 border">{assignment.subjectName}</td>
                                  <td className="p-3 border">
                                    <span className={`px-2 py-1 rounded text-xs ${isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {message}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setFacultyAssignmentPreviewModalOpen(false);
                            setFacultyAssignmentPreviewData([]);
                            setFacultyAssignmentValidationStatus({});
                            setFacultyError('');
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmFacultyAssignmentUpload}
                          disabled={isFacultyAssignmentUploading || !facultyAssignmentPreviewData.some((_, index) => facultyAssignmentValidationStatus[index]?.valid)}
                          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${(!facultyAssignmentPreviewData.some((_, index) => facultyAssignmentValidationStatus[index]?.valid) || isFacultyAssignmentUploading)
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                            }`}
                        >
                          {isFacultyAssignmentUploading ? 'Uploading...' : `Upload ${Object.values(facultyAssignmentValidationStatus).filter(v => v.valid).length} Valid Faculty Assignment(s)`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* STUDENTS TAB */}
            {activeTab === 'students' && (
              <div className="">
                {termDetails.status === 'archived' && (
                  <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded text-center font-semibold">
                    This term is archived. Editing is disabled.
                  </div>
                )}
                {/* Assign Enrolled Student Button */}
                <div className="flex justify-between items-center mt-5 mb-4">
                  <h4 className="text-2xl font-semibold mb-2">Enrolled Students</h4>
                  <div className="flex gap-2">
                   
                    <button
                      type="button"
                      className="bg-blue-900 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-fit"
                      onClick={handleExportStudentAssignments}
                      disabled={termDetails.status === 'archived'}
                    >
                      Export Classlist
                    </button>
                    <button
                      type="button"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={() => {
                        setIsStudentModalOpen(true);
                        setIsStudentEditMode(false);
                        setEditingStudentAssignment(null);
                        setStudentFormData({ studentId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '' });
                        setStudentSearchTerm('');
                      }}
                      disabled={termDetails.status === 'archived'}
                    >
                      Assign Enrolled Student
                    </button>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Section</label>
                      <select
                        value={studentSectionFilter}
                        onChange={(e) => setStudentSectionFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Sections</option>
                        {filteredSections.map(section => (
                          <option key={section._id} value={section.sectionName}>
                            {section.sectionName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
                      <select
                        value={studentStatusFilter}
                        onChange={(e) => setStudentStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending Approval</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Search Student</label>
                      <input
                        type="text"
                        value={studentSearchFilter}
                        onChange={(e) => setStudentSearchFilter(e.target.value)}
                        placeholder="Search by name or school ID..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    
                    <button
                      onClick={() => {
                        setStudentSectionFilter('');
                        setStudentStatusFilter('');
                        setStudentSearchFilter('');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
                {/* Modal for Assign/Edit Student */}
                {isStudentModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 ">
                    <div className="bg-white rounded-lg shadow-lg w-[1000px] max-w-lg p-6 relative">
                      <button
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
                        onClick={() => {
                          setIsStudentModalOpen(false);
                          setIsStudentEditMode(false);
                          setEditingStudentAssignment(null);
                          setStudentFormData({ studentId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '' });
                          setStudentSearchTerm('');
                        }}
                      >
                        &times;
                      </button>
                      <h3 className="text-xl font-semibold mb-4">{isStudentEditMode ? 'Edit Student Assignment' : 'Assign Enrolled Student'}</h3>
                      {studentError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{studentError}</div>}
                      {/* Excel Upload Section */}
                      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                        <h4 className="text-lg font-medium mb-3">Bulk Assign Enrolled Students</h4>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Upload Excel File
                            </label>
                            <input
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={handleStudentAssignmentExcelFile}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={termDetails.status === 'archived'}
                            />
                          </div>
                          <button
                            onClick={downloadStudentAssignmentTemplate}
                            className="bg-[#00418B] text-white py-2 px-4 rounded-md hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:ring-offset-2"
                            disabled={termDetails.status === 'archived'}
                          >
                            Download Template
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">Or assign manually</span>
                        </div>
                      </div>
                      <form
                        onSubmit={async (e) => {
                          if (isStudentEditMode) {
                            await handleUpdateStudentAssignment(e);
                          } else {
                            await handleAddStudentAssignment(e);
                          }
                          // Only close modal if no error
                          if (!studentError) {
                            setIsStudentModalOpen(false);
                            setIsStudentEditMode(false);
                            setEditingStudentAssignment(null);
                            setStudentFormData({ studentId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '' });
                            setStudentSearchTerm('');
                          }
                        }}
                        className="space-y-4 mt-6"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="enrollmentNo" className="block text-sm font-medium text-gray-700 mb-1">Enrollment No.</label>
                            <input
                              type="text"
                              id="enrollmentNo"
                              name="enrollmentNo"
                              value={studentFormData.enrollmentNo || ''}
                              onChange={handleChangeStudentForm}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter enrollment number"
                              disabled={termDetails.status === 'archived'}
                            />
                          </div>
                          <div>
                            <label htmlFor="enrollmentDate" className="block text-sm font-medium text-gray-700 mb-1">Enrollment Date</label>
                            <input
                              type="date"
                              id="enrollmentDate"
                              name="enrollmentDate"
                              value={studentFormData.enrollmentDate || ''}
                              onChange={handleChangeStudentForm}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={termDetails.status === 'archived'}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="studentManualId" className="block text-sm font-medium text-gray-700 mb-1">Student School ID</label>
                            <input
                              type="text"
                              id="studentManualId"
                              value={studentManualId}
                              onChange={handleSchoolIdChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="YY-00000 or any ID"
                              disabled={termDetails.status === 'archived'}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input
                              type="text"
                              id="lastName"
                              name="lastName"
                              value={studentFormData.lastName || ''}
                              onChange={handleChangeStudentForm}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter last name"
                              disabled={termDetails.status === 'archived'}
                            />
                          </div>
                          <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input
                              type="text"
                              id="firstName"
                              name="firstName"
                              value={studentFormData.firstName || ''}
                              onChange={handleChangeStudentForm}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter first name"
                              disabled={termDetails.status === 'archived'}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="trackNameStudent" className="block text-sm font-medium text-gray-700 mb-1">Track Name</label>
                            <select
                              disabled={termDetails.status === 'archived'}
                              id="trackNameStudent"
                              name="trackId"
                              value={studentFormData.trackId}
                              onChange={handleChangeStudentForm}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            >
                              <option value="">Select a Track</option>
                              {filteredTracks.map(track => (
                                <option key={track._id} value={track._id}>
                                  {track.trackName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="strandNameStudent" className="block text-sm font-medium text-gray-700 mb-1">Strand Name</label>
                            <select
                              id="strandNameStudent"
                              name="strandId"
                              value={studentFormData.strandId}
                              onChange={handleChangeStudentForm}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                              disabled={!studentFormData.trackId || termDetails.status === 'archived'}
                            >
                              <option value="">Select a Strand</option>
                              {[...new Map(filteredStrandsForStudent.map(strand => [strand.strandName, strand])).values()].map(strand => (
                                <option key={strand._id} value={strand._id}>
                                  {strand.strandName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="gradeLevelStudent" className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                            <select
                              disabled={termDetails.status === 'archived'}
                              id="gradeLevelStudent"
                              name="gradeLevel"
                              value={studentFormData.gradeLevel}
                              onChange={handleChangeStudentForm}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            >
                              <option value="">Select Grade Level</option>
                              <option value="Grade 11">Grade 11</option>
                              <option value="Grade 12">Grade 12</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="sectionNameStudent" className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                            <select
                              id="sectionNameStudent"
                              name="sectionIds"
                              value={studentFormData.sectionIds[0] || ''}
                              onChange={e => setStudentFormData({ ...studentFormData, sectionIds: [e.target.value] })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                              disabled={!studentFormData.strandId || !studentFormData.gradeLevel || termDetails.status === 'archived'}
                            >
                              <option value="">Select a Section</option>
                              {filteredSectionsForStudent.map(section => (
                                <option key={section._id} value={section._id}>
                                  {section.sectionName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            type="submit"
                            className={`flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${termDetails.status === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={termDetails.status === 'archived'}
                          >
                            {isStudentEditMode ? 'Save Changes' : 'Assign Enrolled Student'}
                          </button>
                          {isStudentEditMode && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsStudentEditMode(false);
                                setEditingStudentAssignment(null);
                                setStudentFormData({ studentId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '' });
                                setStudentSearchTerm('');
                                setIsStudentModalOpen(false);
                              }}
                              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                              disabled={termDetails.status === 'archived'}
                            >
                              Cancel Edit
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                
                {/* Student Assignment Preview Modal */}
                {studentPreviewModalOpen && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-auto">
                      <h3 className="text-xl font-semibold mb-4">Preview Enrolled Students to Upload</h3>

                      <div className="mb-4">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-blue-700">
                                {Object.values(studentValidationStatus).filter(v => v.valid).length} student assignment(s) are valid and will be uploaded.
                                {Object.values(studentValidationStatus).filter(v => !v.valid).length > 0 && (
                                  <span className="block mt-1">
                                    {Object.values(studentValidationStatus).filter(v => !v.valid).length} student assignment(s) have validation errors and will be skipped.
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                          <thead>
                            <tr className="bg-gray-100 text-left">
                              <th className="p-3 border">Student School ID</th>
                              <th className="p-3 border">Student Name</th>
                              <th className="p-3 border">Grade Level</th>
                              <th className="p-3 border">Track Name</th>
                              <th className="p-3 border">Strand Name</th>
                              <th className="p-3 border">Section Name</th>
                              <th className="p-3 border">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentPreviewData.map((assignment, index) => {
                              const isValid = studentValidationStatus[index]?.valid;
                              const message = studentValidationStatus[index]?.message;
                              
                              // Extract data from new format
                              const studentSchoolID = assignment['student_no'] || assignment['Student School ID'] || '';
                              const firstName = assignment['first_name'] || '';
                              const lastName = assignment['last_name'] || '';
                              const studentName = `${firstName} ${lastName}`.trim();
                              const gradeLevel = assignment['grade'] || assignment['Grade Level'] || '';
                              const trackName = assignment['Track Name'] || (assignment['strand'] === 'STEM' ? 'Academic Track' : 'TVL Track');
                              const strandName = assignment['strand'] || assignment['Strand Name'] || '';
                              const sectionName = assignment['section'] || assignment['Section Name'] || '';
                              
                              return (
                                <tr key={index} className={!isValid ? 'bg-red-50' : ''}>
                                  <td className="p-3 border">{studentSchoolID}</td>
                                  <td className="p-3 border">{studentName}</td>
                                  <td className="p-3 border">{gradeLevel}</td>
                                  <td className="p-3 border">{trackName}</td>
                                  <td className="p-3 border">{strandName}</td>
                                  <td className="p-3 border">{sectionName}</td>
                                  <td className="p-3 border">
                                    <span className={`px-2 py-1 rounded text-xs ${isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {message}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setStudentPreviewModalOpen(false);
                            setStudentPreviewData([]);
                            setStudentValidationStatus({});
                            setStudentExcelError('');
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmStudentAssignmentUpload}
                          disabled={isStudentUploading || !studentPreviewData.some((_, index) => studentValidationStatus[index]?.valid)}
                          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${(!studentPreviewData.some((_, index) => studentValidationStatus[index]?.valid) || isStudentUploading)
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                            }`}
                        >
                          {isStudentUploading ? 'Uploading...' : `Upload ${Object.values(studentValidationStatus).filter(v => v.valid).length} Valid Student Assignment(s)`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Enrolled Students List */}
                <div className="mt-8">
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Enrollment No.</th>
                        <th className="p-3 border">Enrollment Date</th>
                        <th className="p-3 border">Student No.</th>
                        <th className="p-3 border">Last Name</th>
                        <th className="p-3 border">First Name</th>
                        <th className="p-3 border">Strand</th>
                        <th className="p-3 border">Section</th>
                        <th className="p-3 border">Grade</th>
                        <th className="p-3 border">Status</th>
                        <th className="p-3 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudentAssignments.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="p-3 border text-center text-gray-500">
                            No student assignments found.
                          </td>
                        </tr>
                      ) : (
                        paginate(filteredStudentAssignments, studentAssignPage, ROWS_PER_PAGE).slice.map((assignment) => {
                          const student = students.find(s => s._id === assignment.studentId);
                          return (
                            <tr key={assignment._id} className={student?.isArchived ? 'bg-red-50' : ''}>
                              <td className="p-3 border">{assignment.enrollmentNo || 'N/A'}</td>
                              <td className="p-3 border">
                                {assignment.enrollmentDate ? 
                                  new Date(assignment.enrollmentDate).toLocaleDateString('en-US', {
                                    month: '2-digit',
                                    day: '2-digit', 
                                    year: 'numeric'
                                  }) : 'N/A'
                                }
                              </td>
                              <td className="p-3 border">{student?.schoolID || assignment.studentSchoolID || assignment.schoolID || ''}</td>
                              <td className="p-3 border">{assignment.lastname || assignment.studentName?.split(' ').slice(-1)[0] || 'N/A'}</td>
                              <td className="p-3 border">{assignment.firstname || assignment.studentName?.split(' ')[0] || 'N/A'}</td>
                              <td className="p-3 border">{assignment.strandName}</td>
                              <td className="p-3 border">{assignment.sectionName}</td>
                              <td className="p-3 border">{assignment.gradeLevel}</td>
                              <td className="p-3 border">
                                {termDetails.status === 'archived' ? (
                                  <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Archived</span>
                                ) : assignment.status === 'archived' ? (
                                  <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Archived</span>
                                ) : isStudentApproved(assignment) ? (
                                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Active</span>
                                ) : (
                                  <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Pending Approval</span>
                                )}
                              </td>
                              <td className="p-3 border">
                                <div className="inline-flex space-x-2">
                                  <button
                                    onClick={termDetails.status === 'archived' ? undefined : () => handleEditStudentAssignment(assignment)}
                                    title="Edit"
                                    className="p-1 rounded hover:bg-yellow-100 group relative"
                                    disabled={termDetails.status === 'archived'}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={termDetails.status === 'archived' ? undefined : () => handleDeleteStudentAssignment(assignment)}
                                    className="p-1 rounded hover:bg-red-100 group relative"
                                    title="Delete"
                                    disabled={termDetails.status === 'archived'}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                                    </svg>
                                  </button>
                                  {assignment.status === 'archived' && (
                                    <button
                                      onClick={() => handleUnarchiveStudentAssignment(assignment)}
                                      className="p-1 rounded hover:bg-green-100 group relative"
                                      title="Unarchive"
                                      disabled={termDetails.status === 'archived'}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {studentAssignments.length > 0 && (
                    <div className="flex justify-center items-center gap-2 mt-3">
                      <button className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs" onClick={() => setStudentAssignPage(p => Math.max(1, p - 1))} disabled={studentAssignPage === 1}>{'<'}</button>
                      <span className="text-xs">Page {paginate(studentAssignments, studentAssignPage, ROWS_PER_PAGE).currentPage} of {paginate(studentAssignments, studentAssignPage, ROWS_PER_PAGE).totalPages}</span>
                      <button className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs" onClick={() => setStudentAssignPage(p => Math.min(paginate(studentAssignments, studentAssignPage, ROWS_PER_PAGE).totalPages, p + 1))} disabled={studentAssignPage === paginate(studentAssignments, studentAssignPage, ROWS_PER_PAGE).totalPages}>{'>'}</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          
            
            
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-semibold mb-4">Preview Tracks to Upload</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Please review the tracks below before confirming the upload. Invalid tracks will be skipped.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-3 border">Track Name</th>
                    <th className="p-3 border">School Year</th>
                    <th className="p-3 border">Term Name</th>
                    <th className="p-3 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewTracks.map((track, index) => (
                    <tr key={index} className={validationStatus[index]?.valid ? '' : 'bg-red-50'}>
                      <td className="p-3 border">{track.trackName}</td>
                      <td className="p-3 border">{track.schoolYear}</td>
                      <td className="p-3 border">{track.termName}</td>
                      <td className="p-3 border">
                        <span className={`px-2 py-1 rounded text-sm ${validationStatus[index]?.valid
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {validationStatus[index]?.message}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setPreviewModalOpen(false);
                  setPreviewTracks([]);
                  setValidationStatus({});
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={isUploading || !previewTracks.some((_, index) => validationStatus[index]?.valid)}
                className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${(!previewTracks.some((_, index) => validationStatus[index]?.valid) || isUploading)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                  }`}
              >
                {isUploading ? 'Uploading...' : 'Confirm Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import Term Data Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-2xl font-semibold">Import Term Data</h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
              >&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow">
              {importError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{importError}</div>}
              {importLoading && <div className="text-blue-700 mb-4">Processing file... Please wait.</div>}

              <div className="mb-4 border-b border-gray-200">
                <nav className="flex -mb-px" aria-label="Tabs">
                  <button
                    onClick={() => setActiveImportTab('tracks')}
                    className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${activeImportTab === 'tracks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    Tracks ({importPreviewData.tracks.length})
                  </button>
                  <button
                    onClick={() => setActiveImportTab('strands')}
                    className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${activeImportTab === 'strands' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    Strands ({importPreviewData.strands.length})
                  </button>
                  <button
                    onClick={() => setActiveImportTab('sections')}
                    className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${activeImportTab === 'sections' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    Sections ({importPreviewData.sections.length})
                  </button>
                  <button
                    onClick={() => setActiveImportTab('subjects')}
                    className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${activeImportTab === 'subjects' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    Subjects ({importPreviewData.subjects.length})
                  </button>
                  <button
                    onClick={() => setActiveImportTab('facultyAssignments')}
                    className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${activeImportTab === 'facultyAssignments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    Faculty Assignments ({importPreviewData.facultyAssignments.length})
                  </button>
                  <button
                    onClick={() => setActiveImportTab('studentAssignments')}
                    className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${activeImportTab === 'studentAssignments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    Enrolled Students ({importPreviewData.studentAssignments.length})
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeImportTab === 'tracks' && (
                <div>
                  <h4 className="text-lg font-medium mb-3">Tracks to Import</h4>
                  <p className="text-sm text-gray-600 mb-2">Valid: {importValidationStatus.tracks.filter(v => v.valid).length}, Invalid: {importValidationStatus.tracks.filter(v => !v.valid).length}</p>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-2 border">Track Name</th>
                        <th className="p-2 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewData.tracks.map((track, index) => (
                        <tr key={index} className={importValidationStatus.tracks[index]?.valid ? 'bg-white' : 'bg-red-50'}>
                          <td className="p-2 border">{track.trackName}</td>
                          <td className="p-2 border flex items-center gap-1">
                            {importValidationStatus.tracks[index]?.valid ? (
                              <span className="text-green-600">✓ Valid</span>
                            ) : (
                              <span className="text-red-600">X {importValidationStatus.tracks[index]?.message}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {importPreviewData.tracks.length === 0 && (
                        <tr><td colSpan="2" className="p-2 text-center text-gray-500">No tracks found in the Excel file.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeImportTab === 'strands' && (
                <div>
                  <h4 className="text-lg font-medium mb-3">Strands to Import</h4>
                  <p className="text-sm text-gray-600 mb-2">Valid: {importValidationStatus.strands.filter(v => v.valid).length}, Invalid: {importValidationStatus.strands.filter(v => !v.valid).length}</p>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-2 border">Track Name</th>
                        <th className="p-2 border">Strand Name</th>
                        <th className="p-2 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewData.strands.map((strand, index) => (
                        <tr key={index} className={importValidationStatus.strands[index]?.valid ? 'bg-white' : 'bg-red-50'}>
                          <td className="p-2 border">{strand.trackName}</td>
                          <td className="p-2 border">{strand.strandName}</td>
                          <td className="p-2 border flex items-center gap-1">
                            {importValidationStatus.strands[index]?.valid ? (
                              <span className="text-green-600">✓ Valid</span>
                            ) : (
                              <span className="text-red-600">X {importValidationStatus.strands[index]?.message}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {importPreviewData.strands.length === 0 && (
                        <tr><td colSpan="3" className="p-2 text-center text-gray-500">No strands found in the Excel file.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeImportTab === 'sections' && (
                <div>
                  <h4 className="text-lg font-medium mb-3">Sections to Import</h4>
                  <p className="text-sm text-gray-600 mb-2">Valid: {importValidationStatus.sections.filter(v => v.valid).length}, Invalid: {importValidationStatus.sections.filter(v => !v.valid).length}</p>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-2 border">Track Name</th>
                        <th className="p-2 border">Strand Name</th>
                        <th className="p-2 border">Section Name</th>
                        <th className="p-2 border">Grade Level</th>
                        <th className="p-2 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewData.sections.map((section, index) => (
                        <tr key={index} className={importValidationStatus.sections[index]?.valid ? 'bg-white' : 'bg-red-50'}>
                          <td className="p-2 border">{section.trackName}</td>
                          <td className="p-2 border">{section.strandName}</td>
                          <td className="p-2 border">{section.sectionName}</td>
                          <td className="p-2 border">{section.gradeLevel}</td>
                          <td className="p-2 border flex items-center gap-1">
                            {importValidationStatus.sections[index]?.valid ? (
                              <span className="text-green-600">✓ Valid</span>
                            ) : (
                              <span className="text-red-600">X {importValidationStatus.sections[index]?.message}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {importPreviewData.sections.length === 0 && (
                        <tr><td colSpan="5" className="p-2 text-center text-gray-500">No sections found in the Excel file.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeImportTab === 'subjects' && (
                <div>
                  <h4 className="text-lg font-medium mb-3">Subjects to Import</h4>
                  <p className="text-sm text-gray-600 mb-2">Valid: {importValidationStatus.subjects.filter(v => v.valid).length}, Invalid: {importValidationStatus.subjects.filter(v => !v.valid).length}</p>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-2 border">Track Name</th>
                        <th className="p-2 border">Strand Name</th>
                        <th className="p-2 border">Grade Level</th>
                        <th className="p-2 border">Subject Name</th>
                        <th className="p-2 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewData.subjects.map((subject, index) => (
                        <tr key={index} className={importValidationStatus.subjects[index]?.valid ? 'bg-white' : 'bg-red-50'}>
                          <td className="p-2 border">{subject.trackName}</td>
                          <td className="p-2 border">{subject.strandName}</td>
                          <td className="p-2 border">{subject.gradeLevel}</td>
                          <td className="p-2 border">{subject.subjectName}</td>
                          <td className="p-2 border flex items-center gap-1">
                            {importValidationStatus.subjects[index]?.valid ? (
                              <span className="text-green-600">✓ Valid</span>
                            ) : (
                              <span className="text-red-600">X {importValidationStatus.subjects[index]?.message}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {importPreviewData.subjects.length === 0 && (
                        <tr><td colSpan="5" className="p-2 text-center text-gray-500">No subjects found in the Excel file.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeImportTab === 'facultyAssignments' && (
                <div>
                  <h4 className="text-lg font-medium mb-3">Faculty Assignments to Import</h4>
                  <p className="text-sm text-gray-600 mb-2">Valid: {importValidationStatus.facultyAssignments.filter(v => v.valid).length}, Invalid: {importValidationStatus.facultyAssignments.filter(v => !v.valid).length}</p>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-2 border">Faculty School ID</th>
                        <th className="p-2 border">Faculty Name</th>
                        <th className="p-2 border">Track Name</th>
                        <th className="p-2 border">Strand Name</th>
                        <th className="p-2 border">Section Name</th>
                        <th className="p-2 border">Grade Level</th>
                        <th className="p-2 border">Subject</th>
                        <th className="p-2 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewData.facultyAssignments.map((assignment, index) => (
                        <tr key={index} className={importValidationStatus.facultyAssignments[index]?.valid ? 'bg-white' : 'bg-red-50'}>
                          <td className="p-2 border">{assignment.facultySchoolID || ''}</td>
                          <td className="p-2 border">{assignment.facultyName}</td>
                          <td className="p-2 border">{assignment.trackName}</td>
                          <td className="p-2 border">{assignment.strandName}</td>
                          <td className="p-2 border">{assignment.sectionName}</td>
                          <td className="p-2 border">{assignment.gradeLevel}</td>
                          <td className="p-2 border">{assignment.subjectName}</td>
                          <td className="p-2 border">{assignment.status}</td>
                        </tr>
                      ))}
                      {importPreviewData.facultyAssignments.length === 0 && (
                        <tr><td colSpan="8" className="p-2 text-center text-gray-500">No faculty assignments found in the Excel file.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeImportTab === 'studentAssignments' && (
                <div>
                  <h4 className="text-lg font-medium mb-3">Enrolled Students to Import</h4>
                  <p className="text-sm text-gray-600 mb-2">Valid: {importValidationStatus.studentAssignments.filter(v => v.valid).length}, Invalid: {importValidationStatus.studentAssignments.filter(v => !v.valid).length}</p>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-2 border">Student School ID</th>
                        <th className="p-2 border">Student Name</th>
                        <th className="p-2 border">Track Name</th>
                        <th className="p-2 border">Strand Name</th>
                        <th className="p-2 border">Section Name</th>
                        <th className="p-2 border">Grade Level</th>
                        <th className="p-2 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewData.studentAssignments.map((assignment, index) => (
                        <tr key={index} className={importValidationStatus.studentAssignments[index]?.valid ? 'bg-white' : 'bg-red-50'}>
                          <td className="p-2 border">{assignment.studentSchoolID || ''}</td>
                          <td className="p-2 border">{assignment.firstName && assignment.lastName ? `${assignment.firstName} ${assignment.lastName}` : assignment.studentName}</td>
                          <td className="p-2 border">{assignment.trackName}</td>
                          <td className="p-2 border">{assignment.strandName}</td>
                          <td className="p-2 border">{assignment.sectionName}</td>
                          <td className="p-2 border">{assignment.gradeLevel}</td>
                          <td className="p-2 border flex items-center gap-1">
                            {importValidationStatus.studentAssignments[index]?.valid ? (
                              <span className="text-green-600">✓ Valid</span>
                            ) : (
                              <span className="text-red-600">X {importValidationStatus.studentAssignments[index]?.message}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {importPreviewData.studentAssignments.length === 0 && (
                        <tr><td colSpan="6" className="p-2 text-center text-gray-500">No student assignments found in the Excel file.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setImportModalOpen(false)}
                className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={prepareValidationResults}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 mr-2"
              >
                View Validation Results
              </button>
              <button
                onClick={handleConfirmImportUpload}
                disabled={importLoading}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importLoading ? 'Importing...' : 'Import Valid Data'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Validation Results Modal */}
      {validationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Validation Results</h2>
              <p className="text-gray-600 mt-2">Review the validation status of your import data</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Tracks */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Tracks ({validationResults.tracks.valid + validationResults.tracks.invalid})
                  <span className="ml-2 text-sm font-normal">
                    <span className="text-green-600">✓ {validationResults.tracks.valid} Valid</span>
                    {validationResults.tracks.invalid > 0 && (
                      <span className="text-red-600 ml-2">✗ {validationResults.tracks.invalid} Invalid</span>
                    )}
                  </span>
                </h3>
                <div className="space-y-2">
                  {validationResults.tracks.details.map((item, index) => (
                    <div key={index} className={`flex justify-between items-center p-2 rounded ${
                      item.status === 'valid' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm">{item.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strands */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Strands ({validationResults.strands.valid + validationResults.strands.invalid})
                  <span className="ml-2 text-sm font-normal">
                    <span className="text-green-600">✓ {validationResults.strands.valid} Valid</span>
                    {validationResults.strands.invalid > 0 && (
                      <span className="text-red-600 ml-2">✗ {validationResults.strands.invalid} Invalid</span>
                    )}
                  </span>
                </h3>
                <div className="space-y-2">
                  {validationResults.strands.details.map((item, index) => (
                    <div key={index} className={`flex justify-between items-center p-2 rounded ${
                      item.status === 'valid' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm">{item.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sections */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Sections ({validationResults.sections.valid + validationResults.sections.invalid})
                  <span className="ml-2 text-sm font-normal">
                    <span className="text-green-600">✓ {validationResults.sections.valid} Valid</span>
                    {validationResults.sections.invalid > 0 && (
                      <span className="text-red-600 ml-2">✗ {validationResults.sections.invalid} Invalid</span>
                    )}
                  </span>
                </h3>
                <div className="space-y-2">
                  {validationResults.sections.details.map((item, index) => (
                    <div key={index} className={`flex justify-between items-center p-2 rounded ${
                      item.status === 'valid' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm">{item.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subjects */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Subjects ({validationResults.subjects.valid + validationResults.subjects.invalid})
                  <span className="ml-2 text-sm font-normal">
                    <span className="text-green-600">✓ {validationResults.subjects.valid} Valid</span>
                    {validationResults.subjects.invalid > 0 && (
                      <span className="text-red-600 ml-2">✗ {validationResults.subjects.invalid} Invalid</span>
                    )}
                  </span>
                </h3>
                <div className="space-y-2">
                  {validationResults.subjects.details.map((item, index) => (
                    <div key={index} className={`flex justify-between items-center p-2 rounded ${
                      item.status === 'valid' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm">{item.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Faculty Assignments */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Faculty Assignments ({validationResults.facultyAssignments.valid + validationResults.facultyAssignments.invalid})
                  <span className="ml-2 text-sm font-normal">
                    <span className="text-green-600">✓ {validationResults.facultyAssignments.valid} Valid</span>
                    {validationResults.facultyAssignments.invalid > 0 && (
                      <span className="text-red-600 ml-2">✗ {validationResults.facultyAssignments.invalid} Invalid</span>
                    )}
                  </span>
                </h3>
                <div className="space-y-2">
                  {validationResults.facultyAssignments.details.map((item, index) => (
                    <div key={index} className={`flex justify-between items-center p-2 rounded ${
                      item.status === 'valid' ? 'bg-green-50 text-green-800' : 'bg-red-800 text-white'
                    }`}>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm">{item.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enrolled Students */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Enrolled Students ({validationResults.studentAssignments.valid + validationResults.studentAssignments.invalid})
                  <span className="ml-2 text-sm font-normal">
                    <span className="text-green-600">✓ {validationResults.studentAssignments.valid} Valid</span>
                    {validationResults.studentAssignments.invalid > 0 && (
                      <span className="text-red-600 ml-2">✗ {validationResults.studentAssignments.invalid} Invalid</span>
                    )}
                  </span>
                </h3>
                <div className="space-y-2">
                  {validationResults.studentAssignments.details.map((item, index) => (
                    <div key={index} className={`flex justify-between items-center p-2 rounded ${
                      item.status === 'valid' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm">{item.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setValidationModalOpen(false)}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VALIDATION FUNCTIONS FOR IMPORT ---
// This function will orchestrate the validation of all sheets
const validateImportData = async (data, existingData, termDetails, registrants) => {
  const validationResults = {};

  validationResults.tracks = await validateTracksImport(data.tracks, existingData.tracks, termDetails);
  validationResults.strands = await validateStrandsImport(data.strands, existingData.strands, termDetails);
  validationResults.sections = await validateSectionsImport(data.sections, existingData.sections, termDetails);
  validationResults.subjects = await validateSubjectsImport(data.subjects, existingData.subjects, termDetails);
  validationResults.facultyAssignments = await validateFacultyAssignmentsImport(data.facultyAssignments, existingData.facultyAssignments, existingData.faculties, existingData.tracks, existingData.strands, existingData.sections, existingData.subjects, termDetails);
  validationResults.studentAssignments = await validateStudentAssignmentsImport(data.studentAssignments, existingData.studentAssignments, existingData.students, existingData.tracks, existingData.strands, existingData.sections, termDetails, registrants);

  return validationResults;
};
// Individual validation functions (stubs for now, will implement logic later)
const validateTracksImport = async (tracksToValidate, existingTracks, termDetails) => {
  const results = [];
  // Check for duplicates within the imported data AND against existing data
  const importedTrackNames = new Set();
  const existingTrackNames = new Set(existingTracks.map(t => t.trackName.toLowerCase()));
  
  for (const track of tracksToValidate) {
    if (!track.trackName || track.trackName.trim() === '') {
      results.push({ valid: false, message: 'Missing Track Name' });
      continue;
    }
    
    // Check for duplicates within the imported data
    if (importedTrackNames.has(track.trackName.toLowerCase())) {
      results.push({ valid: false, message: 'Duplicate track name in import' });
      continue;
    }
    
    // Check if track already exists in the current term and quarter
    // Allow importing tracks that exist in other quarters of the same term
    const existingTrack = existingTracks.find(t => t.trackName.toLowerCase() === track.trackName.toLowerCase());
    if (existingTrack && existingTrack.quarterName === termDetails.quarterName) {
      // Track already exists in current quarter - skip but don't mark as invalid
      results.push({ valid: true, message: `Track '${track.trackName}' already exists - will be skipped` });
      continue;
    }
    
    importedTrackNames.add(track.trackName.toLowerCase());
    results.push({ valid: true });
  }
  return results;
};

const validateStrandsImport = async (strandsToValidate, existingStrands, termDetails) => {
  const results = [];
  // Check for duplicates within the imported data AND against existing data
  const importedStrandCombos = new Set();
  const existingStrandCombos = new Set(existingStrands.map(s => `${s.trackName.toLowerCase()}-${s.strandName.toLowerCase()}`));
  
  for (const strand of strandsToValidate) {
    if (!strand.trackName || strand.trackName.trim() === '' || !strand.strandName || strand.strandName.trim() === '') {
      results.push({ valid: false, message: 'Missing Track Name or Strand Name' });
      continue;
    }
    
    const combo = `${strand.trackName.toLowerCase()}-${strand.strandName.toLowerCase()}`;
    // Check for duplicates within the imported data
    if (importedStrandCombos.has(combo)) {
      results.push({ valid: false, message: 'Duplicate strand in import' });
      continue;
    }
    
    // Check if strand already exists in the current term and quarter
    // Allow importing strands that exist in other quarters of the same term
    const existingStrand = existingStrands.find(s => 
      s.trackName.toLowerCase() === strand.trackName.toLowerCase() && 
      s.strandName.toLowerCase() === strand.strandName.toLowerCase() &&
      s.quarterName === termDetails.quarterName
    );
    if (existingStrand) {
      // Strand already exists in current quarter - skip but don't mark as invalid
      results.push({ valid: true, message: `Strand '${strand.strandName}' already exists - will be skipped` });
      continue;
    }
    
    importedStrandCombos.add(combo);
    results.push({ valid: true });
  }
  return results;
};

const validateSectionsImport = async (sectionsToValidate, existingSections, termDetails) => {
  const results = [];
  // Check for duplicates within the imported data AND against existing data
  const importedSectionCombos = new Set();
  const existingSectionCombos = new Set(existingSections.map(s => `${s.trackName.toLowerCase()}-${s.strandName.toLowerCase()}-${s.sectionName.toLowerCase()}-${s.gradeLevel.toLowerCase()}`));
  
  for (const section of sectionsToValidate) {
    if (!section.trackName || section.trackName.trim() === '' || !section.strandName || section.strandName.trim() === '' || !section.sectionName || section.sectionName.trim() === '' || !section.gradeLevel || section.gradeLevel.trim() === '') {
      results.push({ valid: false, message: 'Missing required fields' });
      continue;
    }
    
    const combo = `${section.trackName.toLowerCase()}-${section.strandName.toLowerCase()}-${section.sectionName.toLowerCase()}-${section.gradeLevel.toLowerCase()}`;
    // Check for duplicates within the imported data
    if (importedSectionCombos.has(combo)) {
      results.push({ valid: false, message: 'Duplicate section in import' });
      continue;
    }
    
    // Check if section already exists in the current term and quarter
    // Allow importing sections that exist in other quarters of the same term
    const existingSection = existingSections.find(s => 
      s.trackName.toLowerCase() === section.trackName.toLowerCase() && 
      s.strandName.toLowerCase() === section.strandName.toLowerCase() &&
      s.sectionName.toLowerCase() === section.sectionName.toLowerCase() &&
      s.gradeLevel.toLowerCase() === section.gradeLevel.toLowerCase() &&
      s.quarterName === termDetails.quarterName
    );
    if (existingSection) {
      // Section already exists in current quarter - skip but don't mark as invalid
      results.push({ valid: true, message: `Section '${section.sectionName}' already exists - will be skipped` });
      continue;
    }
    
    importedSectionCombos.add(combo);
    results.push({ valid: true });
  }
  return results;
};

const validateSubjectsImport = async (subjectsToValidate, existingSubjects, termDetails) => {
  const results = [];
  // Check for duplicates within the imported data AND against existing data
  const importedSubjectCombos = new Set();
  const existingSubjectCombos = new Set(existingSubjects.map(s => `${s.trackName.toLowerCase()}-${s.strandName.toLowerCase()}-${s.gradeLevel.toLowerCase()}-${s.subjectName.toLowerCase()}`));
  
  for (const subject of subjectsToValidate) {
    if (!subject.trackName || subject.trackName.trim() === '' || !subject.strandName || subject.strandName.trim() === '' || !subject.gradeLevel || subject.gradeLevel.trim() === '' || !subject.subjectName || subject.subjectName.trim() === '') {
      results.push({ valid: false, message: 'Missing required fields' });
      continue;
    }
    
    const combo = `${subject.trackName.toLowerCase()}-${subject.strandName.toLowerCase()}-${subject.gradeLevel.toLowerCase()}-${subject.subjectName.toLowerCase()}`;
    // Check for duplicates within the imported data
    if (importedSubjectCombos.has(combo)) {
      results.push({ valid: false, message: 'Duplicate subject in import' });
      continue;
    }
    
    // Check if subject already exists in the current term and quarter
    // Allow importing subjects that exist in other quarters of the same term
    const existingSubject = existingSubjects.find(s => 
      s.trackName.toLowerCase() === subject.trackName.toLowerCase() && 
      s.strandName.toLowerCase() === subject.strandName.toLowerCase() &&
      s.gradeLevel.toLowerCase() === subject.gradeLevel.toLowerCase() &&
      s.subjectName.toLowerCase() === subject.subjectName.toLowerCase() &&
      s.quarterName === termDetails.quarterName
    );
    if (existingSubject) {
      // Subject already exists in current quarter - skip but don't mark as invalid
      results.push({ valid: true, message: `Subject '${subject.subjectName}' already exists - will be skipped` });
      continue;
    }
    
    importedSubjectCombos.add(combo);
    results.push({ valid: true });
  }
  return results;
};

const validateFacultyAssignmentsImport = async (assignmentsToValidate, existingAssignments, allFaculties, allTracks, allStrands, allSections, allSubjects, termDetails) => {
  const results = [];
  const activeAssignments = existingAssignments.filter(a => a.status === 'active' && a.schoolYear === termDetails.schoolYear && a.termName === termDetails.termName);
  const activeFaculties = allFaculties.filter(f => !f.isArchived);
  // Don't check for existing tracks/strands/sections/subjects since they'll be created during import

  for (const assignment of assignmentsToValidate) {
    if (!assignment.facultySchoolID || !assignment.facultyName || !assignment.trackName || !assignment.strandName || !assignment.sectionName || !assignment.gradeLevel || !assignment.subjectName) {
      results.push({ valid: false, message: 'Missing required fields' });
      continue;
    }

    // Check faculty school ID format
    if (!validateFacultySchoolIDFormat(assignment.facultySchoolID)) {
      results.push({ valid: false, message: `Invalid Faculty School ID format "${assignment.facultySchoolID}". Faculty School ID must be in format F000 (e.g., F001, F123)` });
      continue;
    }

    // Check if faculty exists (search by school ID)
    const faculty = activeFaculties.find(f => f.schoolID === assignment.facultySchoolID && f.role === 'faculty');
    if (!faculty) {
      results.push({ valid: false, message: `Faculty with School ID '${assignment.facultySchoolID}' not found` });
      continue;
    }

    // Verify that the name matches the school ID
    const expectedName = `${faculty.firstname} ${faculty.lastname}`.toLowerCase();
    const providedName = assignment.facultyName.toLowerCase();
    if (expectedName !== providedName) {
      results.push({ valid: false, message: `Faculty Name "${assignment.facultyName}" does not match School ID "${assignment.facultySchoolID}". Expected: "${faculty.firstname} ${faculty.lastname}"` });
      continue;
    }

    // Don't check if track/strand/section/subject exist since they'll be created during import

    // Check for duplicate assignment
    const exists = activeAssignments.some(ea =>
      ea.facultyId === faculty._id &&
      ea.trackName.toLowerCase() === assignment.trackName.toLowerCase() &&
      ea.strandName.toLowerCase() === assignment.strandName.toLowerCase() &&
      ea.sectionName.toLowerCase() === assignment.sectionName.toLowerCase()
    );
    if (exists) {
      results.push({ valid: false, message: 'Assignment already exists' });
      continue;
    }

    // Check for subject-section conflicts (NEW VALIDATION)
    const conflictingAssignment = activeAssignments.find(ea => 
      ea.subjectName.toLowerCase() === assignment.subjectName.toLowerCase() &&
      ea.sectionName.toLowerCase() === assignment.sectionName.toLowerCase() &&
      ea.facultyId !== faculty._id &&
      ea.status === 'active'
    );
    
    if (conflictingAssignment) {
      results.push({ valid: false, message: `Subject "${assignment.subjectName}" in Section "${assignment.sectionName}" is already assigned to another faculty` });
    } else {
      results.push({ valid: true, facultyId: faculty._id });
    }
  }
  return results;
};
const validateStudentAssignmentsImport = async (assignmentsToValidate, existingAssignments, allStudents, allTracks, allStrands, allSections, termDetails, registrants) => {
  const results = [];
  const activeAssignments = existingAssignments.filter(a => a.status === 'active' && a.schoolYear === termDetails.schoolYear && a.termName === termDetails.termName);
  const activeStudents = allStudents.filter(s => !s.isArchived);
  // Don't check for existing tracks/strands/sections since they'll be created during import

  for (const assignment of assignmentsToValidate) {
    if (!assignment.studentSchoolID || !assignment.studentName || !assignment.trackName || !assignment.strandName || !assignment.sectionName || !assignment.gradeLevel) {
      results.push({ valid: false, message: 'Missing required fields' });
      continue;
    }

    // Check student school ID format
    if (!validateStudentSchoolIDFormat(assignment.studentSchoolID)) {
      results.push({ valid: false, message: `Invalid Student School ID format "${assignment.studentSchoolID}". Student School ID must be in format xx-xxxxx (e.g., 25-00017, 22-00014)` });
      continue;
    }

    // For bulk import, allow free import of students without enrollment validation
    // Only check if student is enrolled if we're in a specific validation mode
    // This allows importing new students who aren't yet enrolled in the system
    console.log(`Allowing free import for student: ${assignment.studentName} (${assignment.studentSchoolID})`);

    // For bulk import, skip all enrollment validation to allow free creation
    // This is necessary because bulk uploads should be able to create academic structures
    // without requiring students to be pre-approved registrants
    console.log(`Bulk import mode: Skipping enrollment validation for ${assignment.studentName}`);
    // This allows adding students from enrollment even if they don't have accounts yet
    const student = activeStudents.find(s => s.schoolID === assignment.studentSchoolID && s.role === 'students');
    if (student) {
      // If student exists, verify that the name matches the school ID
      const expectedName = `${student.firstname} ${student.lastname}`.toLowerCase();
      const providedName = assignment.studentName.toLowerCase();
      if (expectedName !== providedName) {
        console.log(`Name mismatch for existing student - will create new entry for "${assignment.studentName}"`);
      }
      
      // Check for duplicate assignment (only if student exists)
      const exists = activeAssignments.some(ea =>
        ea.studentId === student._id &&
        ea.trackName.toLowerCase() === assignment.trackName.toLowerCase() &&
        ea.strandName.toLowerCase() === assignment.strandName.toLowerCase() &&
        ea.sectionName.toLowerCase() === assignment.sectionName.toLowerCase()
      );
      if (exists) {
        // Student assignment already exists - skip but don't mark as invalid
        results.push({ valid: true, message: `Student assignment for "${assignment.studentName}" already exists - will be skipped` });
        continue;
      }
    } else {
      // Student doesn't exist in system - this is allowed for enrollment data
      console.log(`Student with School ID '${assignment.studentSchoolID}' not found - will be created as new student`);
      
      // For new students, check if there's already a manual assignment with the same details
      const exists = activeAssignments.some(ea =>
        !ea.studentId && // Manual assignment (no linked student)
        ea.studentSchoolID === assignment.studentSchoolID &&
        ea.trackName.toLowerCase() === assignment.trackName.toLowerCase() &&
        ea.strandName.toLowerCase() === assignment.strandName.toLowerCase() &&
        ea.sectionName.toLowerCase() === assignment.sectionName.toLowerCase()
      );
      if (exists) {
        // Student assignment already exists - skip but don't mark as invalid
        results.push({ valid: true, message: `Student assignment for "${assignment.studentName}" already exists - will be skipped` });
        continue;
      }
    }

    // Don't check if track/strand/section exist since they'll be created during import
    
    results.push({ valid: true, studentId: student ? student._id : null });
  }
  return results;
};

