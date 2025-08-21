import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Admin_Navbar from './Admin_Navbar';
import ProfileMenu from '../ProfileMenu';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

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

export default function TermDetails() {
  const { termId } = useParams();
  const navigate = useNavigate();
  const importFileInputRef = useRef(null); // Initialize useRef for the file input
  const [activeTab, setActiveTab] = useState('dashboard');
  const [termDetails, setTermDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for Tracks management
  const [trackFormData, setTrackFormData] = useState({
    trackName: ''
  });
  const [tracks, setTracks] = useState([]);
  const [trackError, setTrackError] = useState('');
  const [trackSuccess, setTrackSuccess] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);

  // State for Strands management
  const [strandFormData, setStrandFormData] = useState({
    trackId: '',
    strandName: ''
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
    gradeLevel: ''
  });
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [studentError, setStudentError] = useState('');
  const [isStudentEditMode, setIsStudentEditMode] = useState(false);
  const [editingStudentAssignment, setEditingStudentAssignment] = useState(null);
  const [students, setStudents] = useState([]); // To store student users for dropdown
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  // Add state for search functionality for Faculty and Students
  const [facultySearchTerm, setFacultySearchTerm] = useState('');
  const [showFacultySuggestions, setShowFacultySuggestions] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);

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

  const tabs = [
    { id: 'dashboard', label: 'Term Dashboard', icon: termDashboardIcon },
    { id: 'tracks', label: 'Tracks', icon: tracksIcon },
    { id: 'strands', label: 'Strands', icon: strandsIcon },
    { id: 'sections', label: 'Sections', icon: sectionsIcon },
    { id: 'subjects', label: 'Subjects', icon: subjectsIcon }, // <-- Move this line here
    { id: 'faculty', label: 'Faculty Assignment', icon: facultyIcon },
    { id: 'students', label: 'Student Assignment', icon: studentIcon },
  ];

  // In a real application, you would fetch term details here using termId
  useEffect(() => {
    // Example fetch (replace with actual API call)
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
        console.log('Term details loaded:', data);
        setTermDetails(data);
        setError(null);
      } catch (err) {
        console.error('Error loading term details:', err);
        setError("Failed to load term details.");
      } finally {
        setLoading(false);
      }
    };

    fetchTerm();
  }, [termId]);

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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/users/active`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Fetched all active users (faculties potential):", data); // Debug log
        const facultyUsers = data.filter(user => user.role === 'faculty');
        console.log("Filtered faculty users:", facultyUsers); // Debug log
        setFaculties(facultyUsers);
      } else {
        const data = await res.json();
        setFacultyError(data.message || 'Failed to fetch faculties');
      }
    } catch (err) {
      setFacultyError('Error fetching faculties');
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/users/active`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Fetched all active users (students potential):", data); // Debug log
        const studentUsers = data.filter(user => user.role === 'students');
        console.log("Filtered student users:", studentUsers); // Debug log
        setStudents(studentUsers);
      } else {
        const data = await res.json();
        setStudentError(data.message || 'Failed to fetch students');
      }
    } catch (err) {
      setStudentError('Error fetching students');
    }
  };

  // Fetch strands when tracks are loaded
  useEffect(() => {
    if (tracks.length > 0) {
      fetchStrands();
    }
  }, [tracks]);

  const fetchStrands = async () => {
    setStrandError('');
    try {
      const res = await fetch(`${API_BASE}/api/strands/schoolyear/${termDetails.schoolYear}/term/${termDetails.termName}`);
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
  }, [tracks, strands]);

  const fetchSections = async () => {
    setSectionError('');
    try {
      const allSections = [];
      for (const track of tracks) {
        const strandsInTrack = strands.filter(strand => strand.trackName === track.trackName);
        for (const strand of strandsInTrack) {
          const res = await fetch(`${API_BASE}/api/sections/track/${track.trackName}/strand/${strand.strandName}?schoolYear=${termDetails.schoolYear}&termName=${termDetails.termName}`);
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

    if (!trackFormData.trackName.trim()) {
      setTrackError('Track Name cannot be empty.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackName: trackFormData.trackName.trim(),
          schoolYear: termDetails.schoolYear,
          termName: termDetails.termName
        })
      });

      if (res.ok) {
        const newTrack = await res.json();
        setTracks([...tracks, newTrack]);
        window.alert('Track added successfully!');
        setTrackFormData({ trackName: '' }); // Clear form
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
      trackName: track.trackName
    });
    setShowTrackModal(true);
  };

  const handleUpdateTrack = async (e) => {
    e.preventDefault();
    if (termDetails.status === 'archived') return;
    setTrackError('');

    if (!trackFormData.trackName.trim()) {
      setTrackError('Track Name cannot be empty.');
      return;
    }

    if (window.confirm("Save changes to this track?")) {
      try {
        const res = await fetch(`${API_BASE}/api/tracks/${editingTrack._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackName: trackFormData.trackName.trim(),
            schoolYear: termDetails.schoolYear,
            termName: termDetails.termName
          })
        });

        if (res.ok) {
          const updatedTrack = await res.json();
          setTracks(tracks.map(track =>
            track._id === editingTrack._id ? updatedTrack : track
          ));
          window.alert('Track updated successfully!');
          setIsEditMode(false);
          setEditingTrack(null);
          setTrackFormData({ trackName: '' });
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
            `• ${dependencies.studentAssignments.length} Student Assignments\n` +
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

    if (!strandFormData.trackId || !strandFormData.strandName.trim()) {
      setStrandError('Track Name and Strand Name cannot be empty.');
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
          strandName: strandFormData.strandName.trim(),
          trackName: selectedTrack.trackName,
          schoolYear: termDetails.schoolYear,
          termName: termDetails.termName
        })
      });

      if (res.ok) {
        const newStrand = await res.json();
        setStrands([...strands, newStrand]);
        window.alert('Strand added successfully!');
        setStrandFormData({ trackId: '', strandName: '' }); // Clear form
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
    setStrandFormData({ trackId: strand.trackId, strandName: strand.strandName });
    setIsStrandModalOpen(true);
  };

  const handleUpdateStrand = async (e) => {
    e.preventDefault();
    if (termDetails.status === 'archived') return;
    setStrandError('');

    if (!strandFormData.trackId || !strandFormData.strandName.trim()) {
      setStrandError('Track Name and Strand Name cannot be empty.');
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
            strandName: strandFormData.strandName.trim(),
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
          window.alert('Strand updated successfully!');
          setIsStrandEditMode(false);
          setEditingStrand(null);
          setStrandFormData({ trackId: '', strandName: '' });
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
            `• ${dependencies.studentAssignments.length} Student Assignments\n` +
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
      const res = await fetch(`${API_BASE}/api/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: sectionFormData.sectionName.trim(),
          trackName: selectedTrack.trackName,
          strandName: selectedStrand.strandName,
          gradeLevel: sectionFormData.gradeLevel,
          schoolYear: termDetails.schoolYear,
          termName: termDetails.termName
        })
      });

      if (res.ok) {
        const newSection = await res.json();
        setSections([...sections, newSection]);
        window.alert('Section added successfully!');
        setSectionFormData({ trackId: '', strandId: '', sectionName: '', gradeLevel: '' }); // Clear form
      } else {
        const data = await res.json();
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
        const res = await fetch(`${API_BASE}/api/sections/${editingSection._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionName: sectionFormData.sectionName.trim(),
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
          window.alert('Section updated successfully!');
          setIsSectionEditMode(false);
          setEditingSection(null);
          setSectionFormData({ trackId: '', strandId: '', sectionName: '', gradeLevel: '' }); // Clear form including gradeLevel
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
            `• ${dependencies.studentAssignments.length} Student Assignments\n` +
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
            setFaculties(facultyUsers);
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
    setFacultySearchTerm(`${faculty.firstname} ${faculty.lastname}`);
    setShowFacultySuggestions(false);
  };

  const handleChangeStudentForm = async (e) => {
    const { name, value } = e.target;

    if (name === "studentSearch") {
      setStudentSearchTerm(value);
      setShowStudentSuggestions(true);
      setStudentFormData(prev => ({ ...prev, studentId: '' }));

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
            const studentUsers = data.filter(user => user.role === 'students');
            setStudents(studentUsers);
          }
        } catch (err) {
          console.error("Error searching students:", err);
        }
      }
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

  // Handle selection of a student from suggestions
  const handleSelectStudent = (student) => {
    setStudentFormData(prev => ({ ...prev, studentId: student._id }));
    setStudentSearchTerm(`${student.firstname} ${student.lastname}`);
    setShowStudentSuggestions(false);
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

      // Assuming a new endpoint for student assignments: /api/student-assignments
      const res = await fetch(`${API_BASE}/api/student-assignments?termId=${termDetails._id}`, {
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
  }, [termDetails]);

  useEffect(() => {
    if (termDetails && faculties.length > 0 && tracks.length > 0 && strands.length > 0 && sections.length > 0) {
      fetchFacultyAssignments();
    }
  }, [faculties, tracks, strands, sections, termDetails, fetchFacultyAssignments]);

  useEffect(() => {
    if (termDetails && students.length > 0 && tracks.length > 0 && strands.length > 0 && sections.length > 0) {
      fetchStudentAssignments();
    }
  }, [students, tracks, strands, sections, termDetails, fetchStudentAssignments]);

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
        })
      });

      if (res.ok) {
        window.alert('Faculty assigned successfully!');
        fetchFacultyAssignments(); // Refresh assignments list using the new API
        setFacultyFormData({ facultyId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '', subjectName: '' }); // Clear form
        setFacultySearchTerm(''); // Clear search term
      } else {
        const data = await res.json();
        setFacultyError(data.message || 'Failed to assign faculty');
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

    if (!studentFormData.studentId || !studentFormData.trackId || !studentFormData.strandId || studentFormData.sectionIds.length === 0 || !studentFormData.gradeLevel) {
      setStudentError('All fields are required for student assignment.');
      return;
    }

    const studentToAssign = students.find(s => s._id === studentFormData.studentId);
    const selectedTrack = tracks.find(track => track._id === studentFormData.trackId);
    const selectedStrand = strands.find(strand => strand._id === studentFormData.strandId);
    const selectedSection = sections.find(sec => sec._id === studentFormData.sectionIds[0]);

    if (!studentToAssign || !selectedTrack || !selectedStrand || !selectedSection) {
      setStudentError('Invalid selections for student assignment.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE}/api/student-assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: studentToAssign._id,
          trackName: selectedTrack.trackName,
          strandName: selectedStrand.strandName,
          sectionName: selectedSection.sectionName,
          gradeLevel: studentFormData.gradeLevel, // Add gradeLevel
          termId: termDetails._id,
        })
      });

      if (res.ok) {
        window.alert('Student assigned successfully!');
        fetchStudentAssignments();
        setStudentFormData({ studentId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '' });
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
    if (assignment.studentName) {
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

  // Add these new functions for Excel handling
  const downloadTemplate = async () => {
    try {
      // Create a workbook with two sheets
      const wb = XLSX.utils.book_new();

      // Sheet 1: Template for adding new tracks
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['Track Name to Add'], // Headers
      ]);
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Tracks');

      // Sheet 2: Current tracks in the system (only active)
      const activeTracks = tracks.filter(track => track.status === 'active');
      const currentTracksData = [
        ['Object ID', 'Track Name', 'School Year', 'Term Name', 'Status'], // Headers
        ...activeTracks.map(track => [
          track._id,
          track.trackName,
          track.schoolYear,
          track.termName,
          track.status
        ])
      ];

      const currentTracksWs = XLSX.utils.aoa_to_sheet(currentTracksData);

      // Set column widths for better readability
      const wscols = [
        { wch: 30 }, // Object ID
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
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Validate the data
          if (jsonData.length === 0) {
            setExcelError('The Excel file is empty');
            return;
          }

          // Check if all required fields are present
          const invalidRows = jsonData.filter(row => !row['Track Name to Add']);
          if (invalidRows.length > 0) {
            setExcelError('Some rows are missing Track Name to Add');
            return;
          }

          // Prepare the data for preview
          const tracksToPreview = jsonData.map(row => ({
            trackName: row['Track Name to Add'].trim(),
            schoolYear: termDetails.schoolYear,
            termName: termDetails.termName
          }));

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

      // Sheet 1: Template for adding new strands
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['Track Name', 'Strand Name to Add'],
      ]);
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Strands');

      // Sheet 2: Current strands in the system (only active)
      const currentStrands = strands.filter(s =>
        s.status === 'active' &&
        s.schoolYear === termDetails.schoolYear &&
        s.termName === termDetails.termName
      );

      const currentStrandsData = [
        ['Object ID', 'Track Name', 'Strand Name', 'Status'],
        ...currentStrands.map(strand => [
          strand._id,
          strand.trackName,
          strand.strandName,
          strand.status
        ])
      ];

      const currentStrandsWs = XLSX.utils.aoa_to_sheet(currentStrandsData);
      currentStrandsWs['!cols'] = [
        { wch: 30 }, // Object ID
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

          // If headers are correct, proceed to convert sheet to JSON, assuming first row as headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Remove the header row from jsonData since we've already processed it
          jsonData.shift();

          // Validate the data (now checks if there's actual data after headers)
          if (jsonData.length === 0) {
            setStrandError('The Excel file contains only headers or is empty after header parsing.');
            return;
          }

          // Map jsonData to the expected format, using the actual headers found
          const strandsToPreview = jsonData.map(row => ({
            trackName: String(row[actualHeaders.indexOf('Track Name')] || '').trim(),
            strandName: String(row[actualHeaders.indexOf('Strand Name to Add')] || '').trim()
          }));

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

      // Sheet 1: Template for adding new sections
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['Track Name', 'Strand Name', 'Section Name to Add', 'Grade Level'],
      ]);
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Sections');

      // Sheet 2: Current sections in the system (only active)
      const currentSections = sections.filter(s =>
        s.status === 'active' &&
        s.schoolYear === termDetails.schoolYear &&
        s.termName === termDetails.termName &&
        tracks.find(t => t.trackName === s.trackName && t.status === 'active')
      );

      const currentSectionsData = [
        ['Object ID', 'Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Status'],
        ...currentSections.map(section => [
          section._id,
          section.trackName,
          section.strandName,
          section.sectionName,
          section.gradeLevel || '',
          section.status
        ])
      ];

      const currentSectionsWs = XLSX.utils.aoa_to_sheet(currentSectionsData);
      currentSectionsWs['!cols'] = [
        { wch: 30 }, // Object ID
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
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Validate the data
          if (jsonData.length === 0) {
            setSectionError('The Excel file is empty');
            return;
          }

          // Prepare the data for preview and validation
          const sectionsToPreview = jsonData.map(row => ({
            trackName: row['Track Name']?.trim() || '',
            strandName: row['Strand Name']?.trim() || '',
            sectionName: row['Section Name to Add']?.trim() || '',
            gradeLevel: row['Grade Level']?.trim() || ''
          }));

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
      // Sheet 1: Template for adding new faculty assignments
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['Faculty Name', 'Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Subject'], // Updated headers
      ]);
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Faculty Assignments');

      // Sheet 2: Current faculty assignments in the system (only active)
      const currentFacultyAssignments = facultyAssignments.filter(fa => fa.status === 'active');
      const currentFacultyAssignmentsData = [
        ['Object ID', 'Faculty Name', 'Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Subject', 'Status'], // Updated headers
        ...currentFacultyAssignments.map(assignment => [
          assignment._id,
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
        ['Object ID', 'Faculty Name', 'Email', 'Status'],
        ...activeFaculties.map(f => [
          f._id,
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
    const activeFacultiesMap = new Map(faculties.filter(f => f.role === 'faculty' && !f.isArchived).map(f => [`${f.firstname} ${f.lastname}`, f])); // Corrected filter
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

    // Get existing faculty assignments from the component state (more reliable)
    const existingAssignments = facultyAssignments.filter(assignment => assignment.status === 'active');
    const existingAssignmentsInSystem = new Set(existingAssignments.map(assign => 
      `${assign.facultyId}-${assign.trackName}-${assign.strandName}-${assign.sectionName}`
    ));
    
    console.log('Existing faculty assignments in system:', Array.from(existingAssignmentsInSystem));

    for (let i = 0; i < assignmentsToValidate.length; i++) {
      const assignment = assignmentsToValidate[i];
      const facultyNameInput = assignment.facultyNameInput?.trim() || ''; // Correctly use facultyNameInput
      const trackName = assignment.trackName?.trim() || '';
      const strandName = assignment.strandName?.trim() || '';
      const sectionName = assignment.sectionName?.trim() || '';
      const gradeLevel = assignment.gradeLevel?.trim() || '';
      const subjectName = assignment.subjectName?.trim() || '';

      let isValid = true;
      let message = 'Valid';
      let facultyId = ''; // To store the faculty ID for valid assignments

      // 1. Check for missing required fields
      if (!facultyNameInput || !trackName || !strandName || !sectionName || !gradeLevel || !subjectName) {
        isValid = false;
        message = 'Missing Faculty Name, Track Name, Strand Name, Section Name, Grade Level, or Subject';
        console.log(`Row ${i + 1}: Missing required fields - facultyNameInput: "${facultyNameInput}", trackName: "${trackName}", strandName: "${strandName}", sectionName: "${sectionName}", gradeLevel: "${gradeLevel}", subjectName: "${subjectName}"`);
        status[i] = { valid: isValid, message: message, facultyId: facultyId };
        console.log(`Row ${i + 1}: Final validation result - valid: ${isValid}, message: "${message}"`);
        continue; // Skip all other validations for this row
      }

      // 2. Check if faculty exists and is active
      if (isValid) {
        const facultyFound = activeFacultiesMap.get(facultyNameInput);
        if (!facultyFound) {
          isValid = false;
          message = `Faculty "${facultyNameInput}" does not exist or is not active`;
        } else {
          facultyId = facultyFound._id;
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
        const currentCombo = `${facultyId || facultyNameInput}-${trackName}-${strandName}-${sectionName}`;
        if (uploadedAssignmentCombos.has(currentCombo)) {
          isValid = false;
          message = 'Duplicate faculty assignment in uploaded file';
        } else {
          uploadedAssignmentCombos.add(currentCombo);
        }
      }

      // 7. Check for existing assignments in the system
      if (isValid) {
        const existingCombo = `${facultyId}-${trackName}-${strandName}-${sectionName}`;
        console.log(`Row ${i + 1}: Checking if faculty assignment exists: "${existingCombo}"`);
        console.log(`Row ${i + 1}: Available existing assignments:`, Array.from(existingAssignmentsInSystem));
        if (existingAssignmentsInSystem.has(existingCombo)) {
          isValid = false;
          message = 'Faculty assignment already exists in the system';
          console.log(`Row ${i + 1}: Found existing assignment match`);
        }
      }

      status[i] = { valid: isValid, message: message, facultyId: facultyId };
      console.log(`Row ${i + 1}: Final validation result - valid: ${isValid}, message: "${message}"`);
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

          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
          const actualHeaders = [];
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
            if (cell && cell.v) {
              actualHeaders.push(String(cell.v).trim());
            }
          }

          const requiredHeaders = ['Faculty Name', 'Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Subject'];
          const missingOrMismatchedHeaders = requiredHeaders.filter(header => !actualHeaders.includes(header));

          if (missingOrMismatchedHeaders.length > 0) {
            setFacultyError(`Missing or misspelled column(s) in Excel file: ${missingOrMismatchedHeaders.join(', ')}. Please ensure headers are exactly as in the template.`);
            return;
          }

          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          jsonData.shift();

          if (jsonData.length === 0) {
            setFacultyError('The Excel file contains only headers or is empty after header parsing.');
            return;
          }

          const assignmentsToPreview = jsonData.map(row => ({
            facultyNameInput: String(row[actualHeaders.indexOf('Faculty Name')] || '').trim(),
            trackName: String(row[actualHeaders.indexOf('Track Name')] || '').trim(),
            strandName: String(row[actualHeaders.indexOf('Strand Name')] || '').trim(),
            sectionName: String(row[actualHeaders.indexOf('Section Name')] || '').trim(),
            gradeLevel: String(row[actualHeaders.indexOf('Grade Level')] || '').trim(),
            subjectName: String(row[actualHeaders.indexOf('Subject')] || '').trim(),
          }));

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
          })
        });

        if (res.ok) {
          const newAssignment = await res.json();
          createdAssignments.push(newAssignment);
        } else {
          const data = await res.json();
          throw new Error(data.message || `Failed to create assignment for ${assignment.facultyNameInput}`);
        }
      }

      // Refresh the faculty assignments list after successful upload
      fetchFacultyAssignments();
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

  // Download Student Assignment Template
  const downloadStudentAssignmentTemplate = async () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Template for adding new student assignments
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['Student Name', 'Grade Level', 'Track Name', 'Strand Name', 'Section Name'], // Headers
      ]);
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Student Assignments');

      // Sheet 2: Current student assignments in the system
      const currentStudentAssignments = studentAssignments.filter(sa => sa.status === 'active');
      const currentStudentAssignmentsData = [
        ['Object ID', 'Student Name', 'Grade Level', 'Track Name', 'Strand Name', 'Section Name', 'Status'], // Headers
        ...currentStudentAssignments.map(assignment => [
          assignment._id,
          assignment.studentName,
          assignment.gradeLevel || '',
          assignment.trackName,
          assignment.strandName,
          assignment.sectionName,
          assignment.status
        ])
      ];

      const currentStudentAssignmentsWs = XLSX.utils.aoa_to_sheet(currentStudentAssignmentsData);
      const saWscols = [
        { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 10 }
      ];
      currentStudentAssignmentsWs['!cols'] = saWscols;
      XLSX.utils.book_append_sheet(wb, currentStudentAssignmentsWs, 'Current Assignments');

      // Sheet 3: Available Students
      const activeStudents = students.filter(s => !s.isArchived);
      const availableStudentsData = [
        ['Object ID', 'Student Name', 'Email', 'Status'], // Headers
        ...activeStudents.map(s => [
          s._id,
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

  // Validate Student Assignments for Batch Upload
  const validateStudentAssignments = async (assignmentsToValidate) => {
    const status = {};
    const uploadedAssignmentCombos = new Set(); // For duplicates within the uploaded file

    // Pre-fetch active data for validation efficiency
    console.log("Fetching active students, tracks, strands, sections for validation...");
    const activeStudentsMap = new Map(students.filter(s => !s.isArchived).map(s => [`${s.firstname} ${s.lastname}`, s]));
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
        console.log("Existing Student Assignments in System:", existingAssignmentsInSystem);
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
      const studentNameInput = assignment['Student Name']?.trim() || '';
      const gradeLevel = assignment['Grade Level']?.trim() || '';
      const trackName = assignment['Track Name']?.trim() || '';
      const strandName = assignment['Strand Name']?.trim() || '';
      const sectionName = assignment['Section Name']?.trim() || '';
      console.log(`Extracted: Student: "${studentNameInput}", Grade Level: "${gradeLevel}", Track: "${trackName}", Strand: "${strandName}", Section: "${sectionName}"`);

      let isValid = true;
      let message = 'Valid';
      let studentId = ''; // To store the student ID for valid assignments

      // 1. Check for missing required fields
      if (!studentNameInput || !gradeLevel || !trackName || !strandName || !sectionName) {
        isValid = false;
        message = 'Missing Student Name, Grade Level, Track Name, Strand Name, or Section Name';
        console.log(`Row ${i + 1}: Missing required fields - studentNameInput: "${studentNameInput}", gradeLevel: "${gradeLevel}", trackName: "${trackName}", strandName: "${strandName}", sectionName: "${sectionName}"`);
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

      // 2. Check if student exists and is active
      if (isValid) {
        const studentFound = activeStudentsMap.get(studentNameInput);
        console.log(`Student "${studentNameInput}" found:`, studentFound);
        if (!studentFound) {
          isValid = false;
          message = `Student "${studentNameInput}" does not exist or is not active`;
        } else {
          studentId = studentFound._id;
        }
      }

      // 3. Check if track exists and is active
      if (isValid) {
        const trackFound = activeTracksMap.get(trackName);
        console.log(`Track "${trackName}" found:`, trackFound);
        if (!trackFound) {
          isValid = false;
          message = `Track "${trackName}" does not exist or is not active`;
        }
      }

      // 4. Check if strand exists and is active within the track
      if (isValid) {
        const strandFound = activeStrandsMap.get(`${trackName}-${strandName}`);
        console.log(`Strand "${strandName}" for Track "${trackName}" found:`, strandFound);
        if (!strandFound) {
          isValid = false;
          message = `Strand "${strandName}" for Track "${trackName}" does not exist or is not active`;
        }
      }

      // 5. Check if section exists and is active within the track and strand
      if (isValid) {
        const sectionFound = activeSectionsMap.get(`${trackName}-${strandName}-${sectionName}`);
        console.log(`Section "${sectionName}" for Track "${trackName}" and Strand "${strandName}" found:`, sectionFound);
        if (!sectionFound) {
          isValid = false;
          message = `Section "${sectionName}" for Track "${trackName}" and Strand "${strandName}" does not exist or is not active`;
        }
      }

      // 6. Check for duplicates within the uploaded data
      if (isValid) {
        const currentCombo = `${studentId || studentNameInput}-${trackName}-${strandName}-${sectionName}`;
        console.log(`Checking for duplicate in uploaded data: "${currentCombo}"`);
        if (uploadedAssignmentCombos.has(currentCombo)) {
          isValid = false;
          message = 'Duplicate student assignment in uploaded file';
        } else {
          uploadedAssignmentCombos.add(currentCombo);
        }
      }

      // 7. Check for existing assignments in the system
      if (isValid) {
        const existingCombo = `${studentId}-${trackName}-${strandName}-${sectionName}`;
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

  // Handle Excel File Upload for Student Assignments
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

      const actualHeaders = rawData[0].map(h => String(h).trim()); // Get actual headers and trim them
      console.log("Actual Headers from Excel:", actualHeaders);

      // Define expected headers and create a mapping for flexible matching
      const expectedHeadersMap = {
        'Student Name': '',
        'Grade Level': '',
        'Track Name': '',
        'Strand Name': '',
        'Section Name': '',
      };
      const headerMapping = {};

      for (const expectedKey of Object.keys(expectedHeadersMap)) {
        const foundHeader = actualHeaders.find(actual => actual.toLowerCase().startsWith(expectedKey.toLowerCase().substring(0, Math.min(actual.length, expectedKey.length))));
        if (foundHeader) {
          headerMapping[expectedKey] = foundHeader;
        } else {
          setStudentExcelError(`Missing required header: "${expectedKey}". Please ensure your Excel file includes this column.`);
          return;
        }
      }
      console.log("Header Mapping (Expected to Actual):", headerMapping);

      const dataRows = rawData.slice(1); // Get data rows, skipping the header row
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

      for (let i = 0; i < validAssignments.length; i++) {
        const assignment = validAssignments[i];
        // Get the studentId from the validation status of the original preview data
        const originalIndex = studentPreviewData.indexOf(assignment);
        const studentId = studentValidationStatus[originalIndex]?.studentId;

        if (!studentId) { // Should not happen if validation is correct, but as a safeguard
          console.warn('Skipping assignment due to missing studentId after validation', assignment);
          continue;
        }

        const res = await fetch(`${API_BASE}/api/student-assignments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            studentId: studentId,
            gradeLevel: assignment['Grade Level'],
            trackName: assignment['Track Name'],
            strandName: assignment['Strand Name'],
            sectionName: assignment['Section Name'],
            termId: termDetails._id,
          })
        });

        if (res.ok) {
          const newAssignment = await res.json();
          createdAssignments.push(newAssignment);
        } else {
          const data = await res.json();
          throw new Error(data.message || `Failed to create assignment for ${assignment['Student Name']}`);
        }
      }

      // Refresh the student assignments list after successful upload
      fetchStudentAssignments();
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
  }, [termDetails]);

  const fetchSubjects = async () => {
    try {
      setSubjectError('');
      const res = await fetch(`${API_BASE}/api/subjects/schoolyear/${termDetails.schoolYear}/term/${termDetails.termName}`);
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
          termName: termDetails.termName
        })
      });
      if (res.ok) {
        await fetchSubjects();
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
        await fetchSubjects();
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
      // Sheet 1: Template for adding new subjects
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['Track Name', 'Strand Name', 'Grade Level', 'Subject Name'],
      ]);
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Subjects');
      // Sheet 2: Current subjects
      const currentSubjectsData = [
        ['Object ID', 'Track Name', 'Strand Name', 'Grade Level', 'Subject Name', 'Status'],
        ...subjects.map(subject => [
          subject._id,
          subject.trackName,
          subject.strandName,
          subject.gradeLevel,
          subject.subjectName,
          subject.status || 'active',
        ])
      ];

      const currentSubjectsWs = XLSX.utils.aoa_to_sheet(currentSubjectsData);
      currentSubjectsWs['!cols'] = [
        { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 10 }
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
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          if (jsonData.length === 0) {
            setSubjectExcelError('The Excel file is empty');
            return;
          }
          const subjectsToPreview = jsonData.map(row => ({
            trackName: row['Track Name']?.trim() || '',
            strandName: row['Strand Name']?.trim() || '',
            gradeLevel: row['Grade Level']?.trim() || '',
            subjectName: row['Subject Name']?.trim() || ''
          }));
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
        ['Object ID', 'Track Name', 'School Year', 'Term Name', 'Status'],
        ...activeTracks.map(track => [
          track._id,
          track.trackName,
          track.schoolYear,
          track.termName,
          track.status
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(tracksData);
      XLSX.utils.book_append_sheet(wb, ws, 'Active Tracks');
      XLSX.writeFile(wb, 'active_tracks.xlsx');
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
        ['Object ID', 'Track Name', 'Strand Name', 'Status'],
        ...currentStrands.map(strand => [
          strand._id,
          strand.trackName,
          strand.strandName,
          strand.status
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(strandsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Current Strands');
      XLSX.writeFile(wb, 'current_strands.xlsx');
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
        ['Object ID', 'Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Status'],
        ...activeSections.map(section => [
          section._id,
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
        ['Object ID', 'Track Name', 'Strand Name', 'Grade Level', 'Subject Name', 'Status'],
        ...activeSubjects.map(subject => [
          subject._id,
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
        ['Object ID', 'Faculty Name', 'Track Name', 'Strand Name', 'Grade Level', 'Section Name', 'Subject', 'Status'],
        ...currentFacultyAssignments.map(assignment => [
          assignment._id,
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
        ['Object ID', 'Student Name', 'Grade Level', 'Track Name', 'Strand Name', 'Section Name', 'Status'],
        ...currentStudentAssignments.map(assignment => [
          assignment._id,
          assignment.studentName,
          assignment.gradeLevel || '',
          assignment.trackName,
          assignment.strandName,
          assignment.sectionName,
          assignment.status
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(studentAssignmentData);
      XLSX.utils.book_append_sheet(wb, ws, 'Active Student Assignments');
      XLSX.writeFile(wb, 'active_student_assignments.xlsx');
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
            'Student Assignments'
          ];

          for (const sheetName of sheetNames) {
            if (workbook.Sheets[sheetName]) {
              const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
              if (sheetData.length > 1) { // Skip header row
                const headers = sheetData[0];
                const rows = sheetData.slice(1);

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
                    facultyName: row['Faculty Name'],
                    trackName: row['Track Name'],
                    strandName: row['Strand Name'],
                    sectionName: row['Section Name'],
                    gradeLevel: row['Grade Level'],
                    subjectName: row['Subject'], // 'Subject' is the column name in the template
                  }));
                } else if (sheetName === 'Student Assignments') {
                  parsedData.studentAssignments = normalizedRows.map(row => ({
                    studentName: row['Student Name'],
                    gradeLevel: row['Grade Level'],
                    trackName: row['Track Name'],
                    strandName: row['Strand Name'],
                    sectionName: row['Section Name'],
                  }));
                }
              }
            }
          }

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
            termDetails
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

  // Handle Confirm Import Upload (stub for now)
  const handleConfirmImportUpload = async () => {
    setImportLoading(true);
    setImportError('');
    try {
      const { tracks, strands, sections, subjects, facultyAssignments, studentAssignments } = importPreviewData;
      const { tracks: trackValidation, strands: strandValidation, sections: sectionValidation, subjects: subjectValidation, facultyAssignments: facultyAssignmentValidation, studentAssignments: studentAssignmentValidation } = importValidationStatus;

      let importedCount = 0;
      let skippedCount = 0;
      const skippedMessages = [];

      // Filter tracks based on validation
      const validTracks = tracks.filter((track, index) => {
        if (trackValidation[index] && trackValidation[index].valid) {
          importedCount++;
          return true;
        } else {
          skippedCount++;
          skippedMessages.push(`Track '${track.trackName}': ${trackValidation[index].message}`);
          return false;
        }
      });

      // Filter strands based on validation
      const validStrands = strands.filter((strand, index) => {
        if (strandValidation[index] && strandValidation[index].valid) {
          importedCount++;
          return true;
        } else {
          skippedCount++;
          skippedMessages.push(`Strand '${strand.strandName}' in '${strand.trackName}': ${strandValidation[index].message}`);
          return false;
        }
      });

      // Filter sections based on validation
      const validSections = sections.filter((section, index) => {
        if (sectionValidation[index] && sectionValidation[index].valid) {
          importedCount++;
          return true;
        } else {
          skippedCount++;
          skippedMessages.push(`Section '${section.sectionName}' (Grade ${section.gradeLevel}) in '${section.trackName}'/'${section.strandName}': ${sectionValidation[index].message}`);
          return false;
        }
      });

      // Filter subjects based on validation
      const validSubjects = subjects.filter((subject, index) => {
        if (subjectValidation[index] && subjectValidation[index].valid) {
          importedCount++;
          return true;
        } else {
          skippedCount++;
          skippedMessages.push(`Subject '${subject.subjectName}' (Grade ${subject.gradeLevel}) in '${subject.trackName}'/'${subject.strandName}': ${subjectValidation[index].message}`);
          return false;
        }
      });

      // Filter faculty assignments based on validation
      const validFacultyAssignments = facultyAssignments.filter((assignment, index) => {
        if (facultyAssignmentValidation[index] && facultyAssignmentValidation[index].valid) {
          importedCount++;
          return true;
        } else {
          skippedCount++;
          skippedMessages.push(`Faculty Assignment for '${assignment.facultyName}' - ${assignment.subjectName} in '${assignment.sectionName}'/'${assignment.gradeLevel}'/'${assignment.strandName}'/'${assignment.trackName}': ${facultyAssignmentValidation[index].message}`);
          return false;
        }
      });

      // Filter student assignments based on validation
      const validStudentAssignments = studentAssignments.filter((assignment, index) => {
        if (studentAssignmentValidation[index] && studentAssignmentValidation[index].valid) {
          importedCount++;
          return true;
        } else {
          skippedCount++;
          skippedMessages.push(`Student Assignment for '${assignment.studentName}' in '${assignment.sectionName}'/'${assignment.gradeLevel}'/'${assignment.strandName}'/'${assignment.trackName}': ${studentAssignmentValidation[index].message}`);
          return false;
        }
      });

      // NOW PERFORM THE ACTUAL IMPORT IN CORRECT ORDER
      let tracksImported = 0;
      let strandsImported = 0;
      let sectionsImported = 0;
      let subjectsImported = 0;
      let facultyAssignmentsImported = 0;
      let studentAssignmentsImported = 0;

      console.log('Starting import process...');

      // STEP 1: Import Tracks
      if (validTracks.length > 0) {
        console.log('Importing tracks:', validTracks);
        for (const track of validTracks) {
          try {
            const res = await fetch(`${API_BASE}/api/tracks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                trackName: track.trackName,
                schoolYear: termDetails.schoolYear,
                termName: termDetails.termName
              })
            });

            if (res.ok) {
              tracksImported++;
              console.log(`Track ${track.trackName} imported successfully`);
            } else {
              const errorData = await res.json().catch(() => ({}));
              if (errorData.message && (errorData.message.includes('already exists') || errorData.message.includes('must be unique'))) {
                console.log(`Track ${track.trackName} already exists, skipping...`);
              } else {
                console.error(`Failed to import track ${track.trackName}:`, errorData);
              }
            }
          } catch (err) {
            console.error(`Error importing track ${track.trackName}:`, err);
          }
        }
      }

      // STEP 2: Import Strands
      if (validStrands.length > 0) {
        console.log('Importing strands:', validStrands);
        for (const strand of validStrands) {
          try {
            const res = await fetch(`${API_BASE}/api/strands`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                strandName: strand.strandName,
                trackName: strand.trackName,
                schoolYear: termDetails.schoolYear,
                termName: termDetails.termName
              })
            });

            if (res.ok) {
              strandsImported++;
              console.log(`Strand ${strand.strandName} imported successfully`);
            } else {
              const errorData = await res.json().catch(() => ({}));
              if (errorData.message && (errorData.message.includes('already exists') || errorData.message.includes('must be unique'))) {
                console.log(`Strand ${strand.strandName} already exists, skipping...`);
              } else {
                console.error(`Failed to import strand ${strand.strandName}:`, errorData);
              }
            }
          } catch (err) {
            console.error(`Error importing strand ${strand.strandName}:`, err);
          }
        }
      }

      // STEP 3: Import Sections
      if (validSections.length > 0) {
        console.log('Importing sections:', validSections);
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
                termName: termDetails.termName
              })
            });

            if (res.ok) {
              sectionsImported++;
              console.log(`Section ${section.sectionName} imported successfully`);
            } else {
              const errorData = await res.json().catch(() => ({}));
              if (errorData.message && (errorData.message.includes('already exists') || errorData.message.includes('must be unique'))) {
                console.log(`Section ${section.sectionName} already exists, skipping...`);
              } else {
                console.error(`Failed to import section ${section.sectionName}:`, errorData);
              }
            }
          } catch (err) {
            console.error(`Error importing section ${section.sectionName}:`, err);
          }
        }
      }

      // STEP 4: Import Subjects
      if (validSubjects.length > 0) {
        console.log('Importing subjects:', validSubjects);
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
                termName: termDetails.termName
              })
            });

            if (res.ok) {
              subjectsImported++;
              console.log(`Subject ${subject.subjectName} imported successfully`);
            } else {
              const errorData = await res.json().catch(() => ({}));
              if (errorData.message && (errorData.message.includes('already exists') || errorData.message.includes('must be unique'))) {
                console.log(`Subject ${subject.subjectName} already exists, skipping...`);
              } else {
                console.error(`Failed to import subject ${subject.subjectName}:`, errorData);
              }
            }
          } catch (err) {
            console.error(`Error importing subject ${subject.subjectName}:`, err);
          }
        }
      }

      // STEP 5: Import Faculty Assignments
      if (validFacultyAssignments.length > 0) {
        console.log('Importing faculty assignments:', validFacultyAssignments);
        for (const assignment of validFacultyAssignments) {
          try {
            // Find faculty by name
            const faculty = faculties.find(f => `${f.firstname} ${f.lastname}`.toLowerCase() === assignment.facultyName.toLowerCase());
            if (!faculty) {
              console.error(`Faculty ${assignment.facultyName} not found for assignment`);
              continue;
            }

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
                schoolYear: termDetails.schoolYear,
                termName: termDetails.termName,
                termId: termDetails._id
              })
            });

            if (res.ok) {
              facultyAssignmentsImported++;
              console.log(`Faculty assignment for ${assignment.facultyName} imported successfully`);
            } else {
              const errorData = await res.json().catch(() => ({}));
              if (errorData.message && (errorData.message.includes('already exists') || errorData.message.includes('must be unique'))) {
                console.log(`Faculty assignment for ${assignment.facultyName} already exists, skipping...`);
              } else {
                console.error(`Failed to import faculty assignment for ${assignment.facultyName}:`, errorData);
              }
            }
          } catch (err) {
            console.error(`Error importing faculty assignment for ${assignment.facultyName}:`, err);
          }
        }
      }

      // STEP 6: Import Student Assignments
      if (validStudentAssignments.length > 0) {
        console.log('Importing student assignments:', validStudentAssignments);
        for (const assignment of validStudentAssignments) {
          try {
            // Find student by name
            const student = students.find(s => `${s.firstname} ${s.lastname}`.toLowerCase() === assignment.studentName.toLowerCase());
            if (!student) {
              console.error(`Student ${assignment.studentName} not found for assignment`);
              continue;
            }

            const res = await fetch(`${API_BASE}/api/student-assignments`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                studentId: student._id,
                studentName: assignment.studentName,
                trackName: assignment.trackName,
                strandName: assignment.strandName,
                sectionName: assignment.sectionName,
                gradeLevel: assignment.gradeLevel,
                schoolYear: termDetails.schoolYear,
                termName: termDetails.termName,
                termId: termDetails._id
              })
            });

            if (res.ok) {
              studentAssignmentsImported++;
              console.log(`Student assignment for ${assignment.studentName} imported successfully`);
            } else {
              const errorData = await res.json().catch(() => ({}));
              if (errorData.message && (errorData.message.includes('already exists') || errorData.message.includes('must be unique'))) {
                console.log(`Student assignment for ${assignment.studentName} already exists, skipping...`);
              } else {
                console.error(`Failed to import student assignment for ${assignment.studentName}:`, errorData);
              }
            }
          } catch (err) {
            console.error(`Error importing student assignment for ${assignment.studentName}:`, err);
          }
        }
      }

      // Summary of what was actually imported
      const totalImported = tracksImported + strandsImported + sectionsImported + subjectsImported + facultyAssignmentsImported + studentAssignmentsImported;
      
      let alertMessage = `Import process complete!

Successfully imported:
- ${tracksImported} tracks
- ${strandsImported} strands  
- ${sectionsImported} sections
- ${subjectsImported} subjects
- ${facultyAssignmentsImported} faculty assignments
- ${studentAssignmentsImported} student assignments

Total: ${totalImported} items imported`;

      if (skippedCount > 0) {
        alertMessage += `\nSkipped ${skippedCount} duplicate or invalid entries:

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
  const filteredTracks = tracks.filter(
    t => t.schoolYear === termDetails?.schoolYear && t.termName === termDetails?.termName
  );
  const filteredSubjects = subjects.filter(
    s => s.schoolYear === termDetails?.schoolYear && s.termName === termDetails?.termName
  );

  // Before rendering the strands table, filter out duplicate strands by _id
  const filteredStrands = strands.filter(
    strand => strand.schoolYear === termDetails.schoolYear && strand.termName === termDetails.termName
  );

  const uniqueStrands = filteredStrands.filter(
    (strand, index, self) =>
      index === self.findIndex((s) => s._id === strand._id)
  );

  // Update: Enforce absolute uniqueness for strand names
  const uniqueStrandNames = Array.from(
    new Set(filteredStrands.map(strand => strand.strandName))
  );

  return (
    
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Admin_Navbar />
      

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              {termDetails.termName} ({termDetails.schoolYear})
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

                      // Extract Tracks
                      const activeTracks = tracks.filter(t => t.status === 'active' && t.schoolYear === termDetails.schoolYear && t.termName === termDetails.termName);
                      const tracksData = [
                        ['Object ID', 'Track Name', 'School Year', 'Term Name', 'Status'],
                        ...activeTracks.map(track => [
                          track._id,
                          track.trackName,
                          track.schoolYear,
                          track.termName,
                          track.status
                        ])
                      ];
                      const tracksWs = XLSX.utils.aoa_to_sheet(tracksData);
                      XLSX.utils.book_append_sheet(wb, tracksWs, 'Tracks');

                      // Extract Strands
                      const activeStrands = strands.filter(s => s.status === 'active' && tracks.find(t => t.trackName === s.trackName && t.schoolYear === termDetails.schoolYear && t.termName === termDetails.termName && t.status === 'active'));
                      const strandsData = [
                        ['Object ID', 'Track Name', 'Strand Name', 'Status'],
                        ...activeStrands.map(strand => [
                          strand._id,
                          strand.trackName,
                          strand.strandName,
                          strand.status
                        ])
                      ];
                      const strandsWs = XLSX.utils.aoa_to_sheet(strandsData);
                      XLSX.utils.book_append_sheet(wb, strandsWs, 'Strands');

                      // Extract Sections
                      const activeSections = sections.filter(sec => sec.status === 'active' && tracks.find(t => t.trackName === sec.trackName && t.schoolYear === termDetails.schoolYear && t.termName === termDetails.termName && t.status === 'active'));
                      const sectionsData = [
                        ['Object ID', 'Track Name', 'Strand Name', 'Section Name', 'Grade Level', 'Status'],
                        ...activeSections.map(section => [
                          section._id,
                          section.trackName,
                          section.strandName,
                          section.sectionName,
                          section.gradeLevel || '',
                          section.status
                        ])
                      ];
                      const sectionsWs = XLSX.utils.aoa_to_sheet(sectionsData);
                      XLSX.utils.book_append_sheet(wb, sectionsWs, 'Sections');

                      // Extract Subjects
                      const activeSubjects = subjects.filter(sub => sub.status === 'active' && sub.schoolYear === termDetails.schoolYear && sub.termName === termDetails.termName);
                      const subjectsData = [
                        ['Object ID', 'Track Name', 'Strand Name', 'Grade Level', 'Subject Name', 'Status'],
                        ...activeSubjects.map(subject => [
                          subject._id,
                          subject.trackName,
                          subject.strandName,
                          subject.gradeLevel,
                          subject.subjectName,
                          subject.status || 'active'
                        ])
                      ];
                      const subjectsWs = XLSX.utils.aoa_to_sheet(subjectsData);
                      XLSX.utils.book_append_sheet(wb, subjectsWs, 'Subjects');

                      // Extract Faculty Assignments
                      const currentFacultyAssignments = facultyAssignments.filter(fa => fa.status === 'active');
                      const facultyAssignmentData = [
                        ['Object ID', 'Faculty Name', 'Track Name', 'Strand Name', 'Grade Level', 'Section Name', 'Subject', 'Status'],
                        ...currentFacultyAssignments.map(assignment => [
                          assignment._id,
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
                      XLSX.utils.book_append_sheet(wb, facultyWs, 'Faculty Assignments');

                      // Extract Student Assignments
                      const currentStudentAssignments = studentAssignments.filter(sa => sa.status === 'active');
                      const studentAssignmentData = [
                        ['Object ID', 'Student Name', 'Grade Level', 'Track Name', 'Strand Name', 'Section Name', 'Status'],
                        ...currentStudentAssignments.map(assignment => [
                          assignment._id,
                          assignment.studentName,
                          assignment.gradeLevel || '',
                          assignment.trackName,
                          assignment.strandName,
                          assignment.sectionName,
                          assignment.status
                        ])
                      ];
                      const studentWs = XLSX.utils.aoa_to_sheet(studentAssignmentData);
                      XLSX.utils.book_append_sheet(wb, studentWs, 'Student Assignments');

                      // Save the workbook
                      XLSX.writeFile(wb, `${termDetails.schoolYear}_${termDetails.termName}_data.xlsx`);
                    }}
                    className="bg-yellow-400 text-white py-2 px-4 rounded-md hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
                  >
                    Extract Term Data
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
                    className="bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    Import Term Data
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
                      sections.filter(sec => sec.status === 'active' && filteredTracks.find(t => t.trackName === sec.trackName && t.status === 'active')).length
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
                      studentAssignments.filter(sa => sa.status === 'active').length
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
                        setTrackFormData({ trackName: '' });
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
                      <label htmlFor="trackName" className="block text-sm font-medium text-gray-700 mb-1">Track Name</label>
                      <input
                        type="text"
                        id="trackName"
                        name="trackName"
                        value={trackFormData.trackName}
                        onChange={e => setTrackFormData({ ...trackFormData, trackName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={termDetails.status === 'archived'}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="submit"
                      className={`w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${termDetails.status === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                          setTrackFormData({ trackName: '' });
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
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
                      onClick={() => {
                        setShowTrackModal(true);
                        setIsEditMode(false);
                        setEditingTrack(null);
                        setTrackFormData({ trackName: '' });
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
                        filteredTracks.map(track => (
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
                          setStrandFormData({ trackId: '', strandName: '' });
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
                            setStrandFormData({ trackId: '', strandName: '' });
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
                        onChange={e => setStrandFormData({ ...strandFormData, trackId: e.target.value })}
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
                      <label htmlFor="strandName" className="block text-sm font-medium text-gray-700 mb-1">Strand Name</label>
                      <input
                        type="text"
                        id="strandName"
                        name="strandName"
                        value={strandFormData.strandName}
                        onChange={e => setStrandFormData({ ...strandFormData, strandName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={termDetails.status === 'archived'}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="submit"
                      className={`w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${termDetails.status === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                          setStrandFormData({ trackId: '', strandName: '' });
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
                    className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 mb-4"
                    onClick={() => {
                      setIsStrandModalOpen(true);
                      setIsStrandEditMode(false);
                      setEditingStrand(null);
                      setStrandFormData({ trackId: '', strandName: '' });
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
                      uniqueStrands.map((strand) => (
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
                          setSectionFormData({ trackId: '', strandId: '', sectionName: '', gradeLevel: '' });
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
                            setSectionFormData({ trackId: '', strandId: '', sectionName: '', gradeLevel: '' });
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
                          onChange={(e) => setSectionFormData({ ...sectionFormData, sectionName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={termDetails.status === 'archived'}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className={`flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${termDetails.status === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                            setSectionFormData({ trackId: '', strandId: '', sectionName: '', gradeLevel: '' });
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
                      className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 mb-4"
                      onClick={() => {
                        setIsSectionModalOpen(true);
                        setIsSectionEditMode(false);
                        setEditingSection(null);
                        setSectionFormData({ trackId: '', strandId: '', sectionName: '', gradeLevel: '' });
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
                      <th className="p-3 border w-1/6">Track Name</th>
                      <th className="p-3 border w-1/6">Strand Name</th>
                      <th className="p-3 border w-1/6">Section Name</th>
                      <th className="p-3 border w-1/6">Grade Level</th>
                      <th className="p-3 border w-1/6">Status</th>
                      <th className="p-3 border w-1/6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-3 border text-center text-gray-500">
                          No sections found.
                        </td>
                      </tr>
                    ) : (
                      sections.map((section) => (
                        <tr key={section._id}>
                          <td className="p-3 border">{section.trackName}</td>
                          <td className="p-3 border">{section.strandName}</td>
                          <td className="p-3 border">{section.sectionName}</td>
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
                          className={`px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 ${(!sectionPreviewData.some((_, index) => sectionValidationStatus[index]?.valid) || isSectionUploading)
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
                      className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 mb-4"
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
                              {[...new Map(strands.filter(strand => strand.trackName === subjectFormData.trackName).map(strand => [strand.strandName, strand])).values()].map(strand => (
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
                            className={`flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${termDetails.status === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      filteredSubjects.map((subject) => (
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
                          className={`px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 ${(!subjectPreviewData.some((_, index) => subjectValidationStatus[index]?.valid) || isSubjectUploading)
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
                      className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 mb-4"
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
                              placeholder="Search Faculty..."
                              required
                              disabled={termDetails.status === 'archived'}
                            />
                            {showFacultySuggestions && facultySearchTerm.length > 0 && (
                              <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                                {faculties.map(faculty => (
                                  <li
                                    key={faculty._id}
                                    onClick={() => handleSelectFaculty(faculty)}
                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                  >
                                    {faculty.firstname} {faculty.lastname}
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
                            className={`flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${termDetails.status === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                  <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border w-1/8">Faculty Name</th>
                        <th className="p-3 border w-1/8">Track Name</th>
                        <th className="p-3 border w-1/8">Strand Name</th>
                        <th className="p-3 border w-1/8">Grade Level</th>
                        <th className="p-3 border w-1/8">Section</th>
                        <th className="p-3 border w-1/8">Subject</th>
                        <th className="p-3 border w-1/8">Status</th>
                        <th className="p-3 border w-1/8">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultyAssignments.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="p-3 border text-center text-gray-500">
                            No faculty assignments found.
                          </td>
                        </tr>
                      ) : (
                        facultyAssignments.map((assignment) => (
                          <tr key={assignment._id}>
                            <td className="p-3 border">{assignment.facultyName}</td>
                            <td className="p-3 border">{assignment.trackName}</td>
                            <td className="p-3 border">{assignment.strandName}</td>
                            <td className="p-3 border">{assignment.gradeLevel}</td>
                            <td className="p-3 border">{assignment.sectionName}</td>
                            <td className="p-3 border">{assignment.subjectName || ''}</td>
                            <td className="p-3 border">
                              {assignment.status === 'archived' ? (
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
                                  <td className="p-3 border">{assignment.facultyNameInput}</td>
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
                          className={`px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 ${(!facultyAssignmentPreviewData.some((_, index) => facultyAssignmentValidationStatus[index]?.valid) || isFacultyAssignmentUploading)
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
                {/* Assign Student Button */}
                <div className="flex justify-between items-center mt-5 mb-4">
                  <h4 className="text-2xl font-semibold mb-2">Student Assignments</h4>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 mb-4"
                      onClick={() => {
                        setIsStudentModalOpen(true);
                        setIsStudentEditMode(false);
                        setEditingStudentAssignment(null);
                        setStudentFormData({ studentId: '', trackId: '', strandId: '', sectionIds: [], gradeLevel: '' });
                        setStudentSearchTerm('');
                      }}
                      disabled={termDetails.status === 'archived'}
                    >
                      Assign Student
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
                      <h3 className="text-xl font-semibold mb-4">{isStudentEditMode ? 'Edit Student Assignment' : 'Assign Student'}</h3>
                      {studentError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{studentError}</div>}
                      {/* Excel Upload Section */}
                      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                        <h4 className="text-lg font-medium mb-3">Bulk Assign Students</h4>
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
                          <div className="relative">
                            <label htmlFor="studentSearch" className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                            <input
                              type="text"
                              id="studentSearch"
                              name="studentSearch"
                              value={studentSearchTerm}
                              onChange={handleChangeStudentForm}
                              onFocus={() => setShowStudentSuggestions(true)}
                              onBlur={() => setTimeout(() => setShowStudentSuggestions(false), 200)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Search Student..."
                              required
                              disabled={termDetails.status === 'archived'}
                            />
                            {showStudentSuggestions && studentSearchTerm.length > 0 && (
                              <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                                {students.map(student => (
                                  <li
                                    key={student._id}
                                    onClick={() => handleSelectStudent(student)}
                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                  >
                                    {student.firstname} {student.lastname}
                                  </li>
                                ))}
                                {students.length === 0 && (
                                  <li className="p-2 text-gray-500">No matching students</li>
                                )}
                              </ul>
                            )}
                          </div>
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
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                            className={`flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${termDetails.status === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={termDetails.status === 'archived'}
                          >
                            {isStudentEditMode ? 'Save Changes' : 'Assign Student'}
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
                      <h3 className="text-xl font-semibold mb-4">Preview Student Assignments to Upload</h3>

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
                              return (
                                <tr key={index} className={!isValid ? 'bg-red-50' : ''}>
                                  <td className="p-3 border">{assignment['Student Name']}</td>
                                  <td className="p-3 border">{assignment['Grade Level']}</td>
                                  <td className="p-3 border">{assignment['Track Name']}</td>
                                  <td className="p-3 border">{assignment['Strand Name']}</td>
                                  <td className="p-3 border">{assignment['Section Name']}</td>
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
                          className={`px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 ${(!studentPreviewData.some((_, index) => studentValidationStatus[index]?.valid) || isStudentUploading)
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
                
                {/* Student Assignments List */}
                <div className="mt-8">
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Student Name</th>
                        <th className="p-3 border">Track Name</th>
                        <th className="p-3 border">Strand Name</th>
                        <th className="p-3 border">Grade Level</th>
                        <th className="p-3 border">Section</th>
                        <th className="p-3 border">Status</th>
                        <th className="p-3 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAssignments.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-3 border text-center text-gray-500">
                            No student assignments found.
                          </td>
                        </tr>
                      ) : (
                        studentAssignments.map((assignment) => {
                          const student = students.find(s => s._id === assignment.studentId);
                          return (
                            <tr key={assignment._id} className={student?.isArchived ? 'bg-red-50' : ''}>
                              <td className="p-3 border">{assignment.studentName || 'Unknown'}</td>
                              <td className="p-3 border">{assignment.trackName}</td>
                              <td className="p-3 border">{assignment.strandName}</td>
                              <td className="p-3 border">{assignment.gradeLevel}</td>
                              <td className="p-3 border">{assignment.sectionName}</td>
                              <td className="p-3 border">
                                {assignment.status === 'archived' ? (
                                  <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Archived</span>
                                ) : (
                                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Active</span>
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
                className={`px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 ${(!previewTracks.some((_, index) => validationStatus[index]?.valid) || isUploading)
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
                    Student Assignments ({importPreviewData.studentAssignments.length})
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
                  <h4 className="text-lg font-medium mb-3">Student Assignments to Import</h4>
                  <p className="text-sm text-gray-600 mb-2">Valid: {importValidationStatus.studentAssignments.filter(v => v.valid).length}, Invalid: {importValidationStatus.studentAssignments.filter(v => !v.valid).length}</p>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
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
                          <td className="p-2 border">{assignment.studentName}</td>
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
    </div>
  );
}

// --- VALIDATION FUNCTIONS FOR IMPORT ---
// This function will orchestrate the validation of all sheets
const validateImportData = async (data, existingData, termDetails) => {
  const validationResults = {};

  validationResults.tracks = await validateTracksImport(data.tracks, existingData.tracks, termDetails);
  validationResults.strands = await validateStrandsImport(data.strands, existingData.strands, termDetails);
  validationResults.sections = await validateSectionsImport(data.sections, existingData.sections, termDetails);
  validationResults.subjects = await validateSubjectsImport(data.subjects, existingData.subjects, termDetails);
  validationResults.facultyAssignments = await validateFacultyAssignmentsImport(data.facultyAssignments, existingData.facultyAssignments, existingData.faculties, existingData.tracks, existingData.strands, existingData.sections, existingData.subjects, termDetails);
  validationResults.studentAssignments = await validateStudentAssignmentsImport(data.studentAssignments, existingData.studentAssignments, existingData.students, existingData.tracks, existingData.strands, existingData.sections, termDetails);

  return validationResults;
};

// Individual validation functions (stubs for now, will implement logic later)
const validateTracksImport = async (tracksToValidate, existingTracks, termDetails) => {
  const results = [];
  const activeTracks = existingTracks.filter(t => t.status === 'active' && t.schoolYear === termDetails.schoolYear && t.termName === termDetails.termName);
  for (const track of tracksToValidate) {
    if (!track.trackName || track.trackName.trim() === '') {
      results.push({ valid: false, message: 'Missing Track Name' });
      continue;
    }
    const exists = activeTracks.some(et => et.trackName.toLowerCase() === track.trackName.toLowerCase());
    if (exists) {
      results.push({ valid: false, message: 'Track already exists' });
    } else {
      results.push({ valid: true });
    }
  }
  return results;
};

const validateStrandsImport = async (strandsToValidate, existingStrands, termDetails) => {
  const results = [];
  const activeStrands = existingStrands.filter(s => s.status === 'active' && s.schoolYear === termDetails.schoolYear && s.termName === termDetails.termName);
  for (const strand of strandsToValidate) {
    if (!strand.trackName || strand.trackName.trim() === '' || !strand.strandName || strand.strandName.trim() === '') {
      results.push({ valid: false, message: 'Missing Track Name or Strand Name' });
      continue;
    }
    const exists = activeStrands.some(es => es.trackName.toLowerCase() === strand.trackName.toLowerCase() && es.strandName.toLowerCase() === strand.strandName.toLowerCase());
    if (exists) {
      results.push({ valid: false, message: 'Strand already exists' });
    } else {
      results.push({ valid: true });
    }
  }
  return results;
};

const validateSectionsImport = async (sectionsToValidate, existingSections, termDetails) => {
  const results = [];
  const activeSections = existingSections.filter(s => s.status === 'active' && s.schoolYear === termDetails.schoolYear && s.termName === termDetails.termName);
  for (const section of sectionsToValidate) {
    if (!section.trackName || section.trackName.trim() === '' || !section.strandName || section.strandName.trim() === '' || !section.sectionName || section.sectionName.trim() === '' || !section.gradeLevel || section.gradeLevel.trim() === '') {
      results.push({ valid: false, message: 'Missing required fields' });
      continue;
    }
    const exists = activeSections.some(es => es.trackName.toLowerCase() === section.trackName.toLowerCase() && es.strandName.toLowerCase() === section.strandName.toLowerCase() && es.sectionName.toLowerCase() === section.sectionName.toLowerCase() && es.gradeLevel.toLowerCase() === section.gradeLevel.toLowerCase());
    if (exists) {
      results.push({ valid: false, message: 'Section already exists' });
    } else {
      results.push({ valid: true });
    }
  }
  return results;
};

const validateSubjectsImport = async (subjectsToValidate, existingSubjects, termDetails) => {
  const results = [];
  const activeSubjects = existingSubjects.filter(s => s.status === 'active' && s.schoolYear === termDetails.schoolYear && s.termName === termDetails.termName);
  for (const subject of subjectsToValidate) {
    if (!subject.trackName || subject.trackName.trim() === '' || !subject.strandName || subject.strandName.trim() === '' || !subject.gradeLevel || subject.gradeLevel.trim() === '' || !subject.subjectName || subject.subjectName.trim() === '') {
      results.push({ valid: false, message: 'Missing required fields' });
      continue;
    }
    const exists = activeSubjects.some(es => es.trackName.toLowerCase() === subject.trackName.toLowerCase() && es.strandName.toLowerCase() === subject.strandName.toLowerCase() && es.gradeLevel.toLowerCase() === subject.gradeLevel.toLowerCase() && es.subjectName.toLowerCase() === subject.subjectName.toLowerCase());
    if (exists) {
      results.push({ valid: false, message: 'Subject already exists' });
    } else {
      results.push({ valid: true });
    }
  }
  return results;
};

const validateFacultyAssignmentsImport = async (assignmentsToValidate, existingAssignments, allFaculties, allTracks, allStrands, allSections, allSubjects, termDetails) => {
  const results = [];
  const activeAssignments = existingAssignments.filter(a => a.status === 'active' && a.schoolYear === termDetails.schoolYear && a.termName === termDetails.termName);
  const activeFaculties = allFaculties.filter(f => f.status === 'active');
  const activeTracks = allTracks.filter(t => t.status === 'active' && t.schoolYear === termDetails.schoolYear && t.termName === termDetails.termName);
  const activeStrands = allStrands.filter(s => s.status === 'active' && s.schoolYear === termDetails.schoolYear && s.termName === termDetails.termName);
  const activeSections = allSections.filter(s => s.status === 'active' && s.schoolYear === termDetails.schoolYear && s.termName === termDetails.termName);
  const activeSubjects = allSubjects.filter(s => s.status === 'active' && s.schoolYear === termDetails.schoolYear && s.termName === termDetails.termName);

  for (const assignment of assignmentsToValidate) {
    if (!assignment.facultyName || !assignment.trackName || !assignment.strandName || !assignment.sectionName || !assignment.gradeLevel || !assignment.subjectName) {
      results.push({ valid: false, message: 'Missing required fields' });
      continue;
    }

    // Check if faculty exists
    const faculty = activeFaculties.find(f => `${f.firstname} ${f.lastname}`.toLowerCase() === assignment.facultyName.toLowerCase() && f.role === 'faculty');
    if (!faculty) {
      results.push({ valid: false, message: `Faculty '${assignment.facultyName}' not found` });
      continue;
    }

    // Check if track exists
    const track = activeTracks.find(t => t.trackName.toLowerCase() === assignment.trackName.toLowerCase());
    if (!track) {
      results.push({ valid: false, message: `Track '${assignment.trackName}' not found for current term` });
      continue;
    }

    // Check if strand exists within the track
    const strand = activeStrands.find(s => s.strandName.toLowerCase() === assignment.strandName.toLowerCase() && s.trackName.toLowerCase() === assignment.trackName.toLowerCase());
    if (!strand) {
      results.push({ valid: false, message: `Strand '${assignment.strandName}' not found in track '${assignment.trackName}'` });
      continue;
    }

    // Check if section exists within the track, strand and grade level
    const section = activeSections.find(s => s.sectionName.toLowerCase() === assignment.sectionName.toLowerCase() && s.trackName.toLowerCase() === assignment.trackName.toLowerCase() && s.strandName.toLowerCase() === assignment.strandName.toLowerCase() && s.gradeLevel.toLowerCase() === assignment.gradeLevel.toLowerCase());
    if (!section) {
      results.push({ valid: false, message: `Section '${assignment.sectionName}' not found in track/strand/grade` });
      continue;
    }

    // Check if subject exists within the track, strand and grade level
    const subject = activeSubjects.find(s => s.subjectName.toLowerCase() === assignment.subjectName.toLowerCase() && s.trackName.toLowerCase() === assignment.trackName.toLowerCase() && s.strandName.toLowerCase() === assignment.strandName.toLowerCase() && s.gradeLevel.toLowerCase() === assignment.gradeLevel.toLowerCase());
    if (!subject) {
      results.push({ valid: false, message: `Subject '${assignment.subjectName}' not found for selected track/strand/grade` });
      continue;
    }

    // Check for duplicate assignment
    const exists = activeAssignments.some(ea =>
      ea.facultyId === faculty._id &&
      ea.trackName.toLowerCase() === assignment.trackName.toLowerCase() &&
      ea.strandName.toLowerCase() === assignment.strandName.toLowerCase() &&
      ea.sectionName.toLowerCase() === assignment.sectionName.toLowerCase()
    );
    if (exists) {
      results.push({ valid: false, message: 'Assignment already exists' });
    } else {
      results.push({ valid: true, facultyId: faculty._id });
    }
  }
  return results;
};

const validateStudentAssignmentsImport = async (assignmentsToValidate, existingAssignments, allStudents, allTracks, allStrands, allSections, termDetails) => {
  const results = [];
  const activeAssignments = existingAssignments.filter(a => a.status === 'active' && a.schoolYear === termDetails.schoolYear && a.termName === termDetails.termName);
  const activeStudents = allStudents.filter(s => s.status === 'active');
  const activeTracks = allTracks.filter(t => t.status === 'active' && t.schoolYear === termDetails.schoolYear && t.termName === termDetails.termName);
  const activeStrands = allStrands.filter(s => s.status === 'active' && s.schoolYear === termDetails.schoolYear && s.termName === termDetails.termName);
  const activeSections = allSections.filter(s => s.status === 'active' && s.schoolYear === termDetails.schoolYear && s.termName === termDetails.termName);

  for (const assignment of assignmentsToValidate) {
    if (!assignment.studentName || !assignment.trackName || !assignment.strandName || !assignment.sectionName || !assignment.gradeLevel) {
      results.push({ valid: false, message: 'Missing required fields' });
      continue;
    }

    // Check if student exists
    const student = activeStudents.find(s => `${s.firstname} ${s.lastname}`.toLowerCase() === assignment.studentName.toLowerCase() && s.role === 'students');
    if (!student) {
      results.push({ valid: false, message: `Student '${assignment.studentName}' not found` });
      continue;
    }

    // Check if track exists
    const track = activeTracks.find(t => t.trackName.toLowerCase() === assignment.trackName.toLowerCase());
    if (!track) {
      results.push({ valid: false, message: `Track '${assignment.trackName}' not found for current term` });
      continue;
    }

    // Check if strand exists within the track
    const strand = activeStrands.find(s => s.strandName.toLowerCase() === assignment.strandName.toLowerCase() && s.trackName.toLowerCase() === assignment.trackName.toLowerCase());
    if (!strand) {
      results.push({ valid: false, message: `Strand '${assignment.strandName}' not found in track '${assignment.trackName}'` });
      continue;
    }

    // Check if section exists within the track, strand and grade level
    const section = activeSections.find(s => s.sectionName.toLowerCase() === assignment.sectionName.toLowerCase() && s.trackName.toLowerCase() === assignment.trackName.toLowerCase() && s.strandName.toLowerCase() === assignment.strandName.toLowerCase() && s.gradeLevel.toLowerCase() === assignment.gradeLevel.toLowerCase());
    if (!section) {
      results.push({ valid: false, message: `Section '${assignment.sectionName}' not found in track/strand/grade` });
      continue;
    }

    // Check for duplicate assignment
    const exists = activeAssignments.some(ea =>
      ea.studentId === student._id &&
      ea.trackName.toLowerCase() === assignment.trackName.toLowerCase() &&
      ea.strandName.toLowerCase() === assignment.strandName.toLowerCase() &&
      ea.sectionName.toLowerCase() === assignment.sectionName.toLowerCase()
    );
    if (exists) {
      results.push({ valid: false, message: 'Assignment already exists' });
    } else {
      results.push({ valid: true, studentId: student._id });
    }
  }
  return results;
};