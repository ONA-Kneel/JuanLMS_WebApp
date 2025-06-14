import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Admin_Navbar from './Admin_Navbar';
import ProfileMenu from '../ProfileMenu';
// Import icons
import editIcon from "../../assets/editing.png";
import archiveIcon from "../../assets/archive.png";
import * as XLSX from 'xlsx'; // Add this import for Excel handling

export default function TermDetails() {
  const { termId } = useParams();
  const navigate = useNavigate();
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

  // State for Sections management
  const [sectionFormData, setSectionFormData] = useState({
    trackId: '',
    strandId: '',
    sectionName: ''
  });
  const [sections, setSections] = useState([]);
  const [sectionError, setSectionError] = useState('');
  const [isSectionEditMode, setIsSectionEditMode] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  // State for Faculty Assignment management
  const [facultyFormData, setFacultyFormData] = useState({
    facultyId: '',
    trackId: '',
    strandId: '',
    sectionIds: [], // Multiple sections can be assigned
  });
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [facultyError, setFacultyError] = useState('');
  const [isFacultyEditMode, setIsFacultyEditMode] = useState(false);
  const [editingFacultyAssignment, setEditingFacultyAssignment] = useState(null);
  const [faculties, setFaculties] = useState([]); // To store faculty users for dropdown

  // State for Student Assignment management
  const [studentFormData, setStudentFormData] = useState({
    studentId: '',
    trackId: '',
    strandId: '',
    sectionIds: [],
  });
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [studentError, setStudentError] = useState('');
  const [isStudentEditMode, setIsStudentEditMode] = useState(false);
  const [editingStudentAssignment, setEditingStudentAssignment] = useState(null);
  const [students, setStudents] = useState([]); // To store student users for dropdown

  const [excelFile, setExcelFile] = useState(null);
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
  const [isStrandUploading, setIsStrandUploading] = useState(false);

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

  const tabs = [
    { id: 'dashboard', label: 'Term Dashboard' },
    { id: 'tracks', label: 'Tracks' },
    { id: 'strands', label: 'Strands' },
    { id: 'sections', label: 'Sections' },
    { id: 'faculty', label: 'Faculty Assignment' },
    { id: 'students', label: 'Student Assignment' }
  ];

  // In a real application, you would fetch term details here using termId
  useEffect(() => {
    // Example fetch (replace with actual API call)
    const fetchTerm = async () => {
      try {
        setLoading(true);
        // Simulate API call
        // const response = await fetch(`/api/terms/${termId}`);
        // const data = await response.json();
        // setTermDetails(data);
        // For now, mock data
        setTermDetails({
          _id: termId,
          termName: "Term 1",
          schoolYear: "2025-2026",
          startDate: "2025-06-01",
          endDate: "2025-12-31",
          status: "active"
        });

        // Simulate fetching existing tracks (if any)
        // const initialTracks = [
        //   { _id: 'track1', trackName: 'Academic Track' },
        //   { _id: 'track2', trackName: 'TVL Track' }
        // ];
        // setTracks(initialTracks);

        // Simulate fetching existing strands (if any)
        // setStrands([
        //   { _id: 'strandA', trackId: 'track1', trackName: 'Academic Track', strandName: 'General Academic Strand' },
        //   { _id: 'strandB', trackId: 'track1', trackName: 'Academic Track', strandName: 'STEM Strand' },
        //   { _id: 'strandC', trackId: 'track2', trackName: 'TVL Track', strandName: 'ICT Strand' }
        // ]);

        setError(null);
      } catch (err) {
        setError("Failed to load term details.");
        console.error(err);
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
      const res = await fetch(`http://localhost:5000/api/tracks/term/${termDetails.termName}`);
      if (res.ok) {
        const data = await res.json();
        setTracks(data);
      } else {
        const data = await res.json();
        setTrackError(data.message || 'Failed to fetch tracks');
      }
    } catch (err) {
      setTrackError('Error fetching tracks');
    }
  };

  const fetchFaculties = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const facultyUsers = data.filter(user => user.role === 'faculty');
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
      const res = await fetch(`http://localhost:5000/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const studentUsers = data.filter(user => user.role === 'students');
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
      const allStrands = [];
      for (const track of tracks) {
        const res = await fetch(`http://localhost:5000/api/strands/track/${track.trackName}`);
        if (res.ok) {
          const data = await res.json();
          allStrands.push(...data);
        } else {
          const data = await res.json();
          setStrandError(data.message || `Failed to fetch strands for track ${track.trackName}`);
          return;
        }
      }
      setStrands(allStrands);
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
          const res = await fetch(`http://localhost:5000/api/sections/track/${track.trackName}/strand/${strand.strandName}`);
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
    setTrackError('');

    if (!trackFormData.trackName.trim()) {
      setTrackError('Track Name cannot be empty.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/tracks', {
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
  };

  const handleUpdateTrack = async (e) => {
    e.preventDefault();
    setTrackError('');

    if (!trackFormData.trackName.trim()) {
      setTrackError('Track Name cannot be empty.');
      return;
    }

    if (window.confirm("Save changes to this track?")) {
      try {
        const res = await fetch(`http://localhost:5000/api/tracks/${editingTrack._id}`, {
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
    if (window.confirm("Are you sure you want to delete this track?")) {
      try {
        const res = await fetch(`http://localhost:5000/api/tracks/${track._id}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          setTracks(tracks.filter(t => t._id !== track._id));
          window.alert('Track deleted successfully!');
        } else {
          const data = await res.json();
          setTrackError(data.message || 'Failed to delete track');
        }
      } catch (err) {
        setTrackError('Error deleting track');
      }
    }
  };

  // Handle Strand form submission
  const handleAddStrand = async (e) => {
    e.preventDefault();
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
      const res = await fetch('http://localhost:5000/api/strands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strandName: strandFormData.strandName.trim(),
          trackName: selectedTrack.trackName,
        })
      });

      if (res.ok) {
        const newStrand = await res.json();
        setStrands([...strands, newStrand]);
        window.alert('Strand added successfully!');
        setStrandFormData({ trackId: '', strandName: '' }); // Clear form
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
      trackId: tracks.find(track => track.trackName === strand.trackName)?._id || '',
      strandName: strand.strandName
    });
  };

  const handleUpdateStrand = async (e) => {
    e.preventDefault();
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
        const res = await fetch(`http://localhost:5000/api/strands/${editingStrand._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            strandName: strandFormData.strandName.trim(),
            trackName: selectedTrack.trackName,
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
    if (window.confirm("Are you sure you want to delete this strand?")) {
      try {
        const res = await fetch(`http://localhost:5000/api/strands/${strand._id}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          setStrands(strands.filter(s => s._id !== strand._id));
          window.alert('Strand deleted successfully!');
        } else {
          const data = await res.json();
          setStrandError(data.message || 'Failed to delete strand');
        }
      } catch (err) {
        setStrandError('Error deleting strand');
      }
    }
  };

  // Handle Section form submission
  const handleAddSection = async (e) => {
    e.preventDefault();
    setSectionError('');

    if (!sectionFormData.trackId || !sectionFormData.strandId || !sectionFormData.sectionName.trim()) {
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
      const res = await fetch('http://localhost:5000/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: sectionFormData.sectionName.trim(),
          trackName: selectedTrack.trackName,
          strandName: selectedStrand.strandName,
        })
      });

      if (res.ok) {
        const newSection = await res.json();
        setSections([...sections, newSection]);
        window.alert('Section added successfully!');
        setSectionFormData({ trackId: '', strandId: '', sectionName: '' }); // Clear form
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
      sectionName: section.sectionName
    });
  };

  const handleUpdateSection = async (e) => {
    e.preventDefault();
    setSectionError('');

    if (!sectionFormData.trackId || !sectionFormData.strandId || !sectionFormData.sectionName.trim()) {
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
        const res = await fetch(`http://localhost:5000/api/sections/${editingSection._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionName: sectionFormData.sectionName.trim(),
            trackName: selectedTrack.trackName,
            strandName: selectedStrand.strandName,
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
          setSectionFormData({ trackId: '', strandId: '', sectionName: '' });
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
    if (window.confirm("Are you sure you want to delete this section?")) {
      try {
        const res = await fetch(`http://localhost:5000/api/sections/${section._id}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          setSections(sections.filter(s => s._id !== section._id));
          window.alert('Section deleted successfully!');
        } else {
          const data = await res.json();
          setSectionError(data.message || 'Failed to delete section');
        }
      } catch (err) {
        setSectionError('Error deleting section');
      }
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
    return selectedTrack && selectedStrand && section.trackName === selectedTrack.trackName && section.strandName === selectedStrand.strandName;
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
    return selectedTrack && selectedStrand && section.trackName === selectedTrack.trackName && section.strandName === selectedStrand.strandName;
  });

  const handleChangeFacultyForm = (e) => {
    const { name, value } = e.target;
    setFacultyFormData(prev => ({
      ...prev,
      [name]: value
    }));

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

  const handleChangeStudentForm = (e) => {
    const { name, value } = e.target;
    setStudentFormData(prev => ({
      ...prev,
      [name]: value
    }));

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

  // Fetch faculty assignments
  const fetchFacultyAssignments = useCallback(async () => {
    if (!termDetails || !termDetails._id) return;

    try {
      setLoading(true);
      setFacultyError('');
      const token = localStorage.getItem('token');

      const res = await fetch(`http://localhost:5000/api/faculty-assignments?termId=${termDetails._id}`, {
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
      const res = await fetch(`http://localhost:5000/api/student-assignments?termId=${termDetails._id}`, {
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

  const handleAddFacultyAssignment = async (e) => {
    e.preventDefault();
    setFacultyError('');

    if (!facultyFormData.facultyId || !facultyFormData.trackId || !facultyFormData.strandId || facultyFormData.sectionIds.length === 0) {
      setFacultyError('All fields are required for faculty assignment.');
      return;
    }

    const facultyToAssign = faculties.find(f => f._id === facultyFormData.facultyId);
    const selectedTrack = tracks.find(track => track._id === facultyFormData.trackId);
    const selectedStrand = strands.find(strand => strand._id === facultyFormData.strandId);
    const selectedSection = sections.find(sec => sec._id === facultyFormData.sectionIds[0]); // Only one section per assignment

    if (!facultyToAssign || !selectedTrack || !selectedStrand || !selectedSection) {
      setFacultyError('Invalid selections for faculty assignment.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`http://localhost:5000/api/faculty-assignments`, {
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
          termId: termDetails._id, // Add termId to the assignment
        })
      });

      if (res.ok) {
        window.alert('Faculty assigned successfully!');
        fetchFacultyAssignments(); // Refresh assignments list using the new API
        setFacultyFormData({ facultyId: '', trackId: '', strandId: '', sectionIds: [] }); // Clear form
      } else {
        const data = await res.json();
        setFacultyError(data.message || 'Failed to assign faculty');
      }
    } catch (err) {
      setFacultyError('Error assigning faculty');
      console.error("Error in handleAddFacultyAssignment:", err);
    }
  };

  const handleEditFacultyAssignment = (assignment) => {
    setIsFacultyEditMode(true);
    setEditingFacultyAssignment(assignment);
    
    // Find the IDs from the names to populate the form correctly
    const trackId = tracks.find(t => t.trackName === assignment.trackName)?._id || '';
    const strandId = strands.find(s => s.strandName === assignment.strandName && s.trackName === assignment.trackName)?._id || '';
    const sectionId = sections.find(s => s.sectionName === assignment.sectionName && s.trackName === assignment.trackName && s.strandName === assignment.strandName)?._id || '';

    setFacultyFormData({
      facultyId: assignment.facultyId,
      trackId: trackId,
      strandId: strandId,
      sectionIds: sectionId ? [sectionId] : [], // Ensure it's an array for the form
    });
  };

  const handleUpdateFacultyAssignment = async (e) => {
    e.preventDefault();
    setFacultyError('');

    if (!facultyFormData.facultyId || !facultyFormData.trackId || !facultyFormData.strandId || facultyFormData.sectionIds.length === 0) {
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

        const res = await fetch(`http://localhost:5000/api/faculty-assignments/${editingFacultyAssignment._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({
            facultyId: facultyFormData.facultyId, // Should be same as original
            trackName: selectedTrack.trackName,
            strandName: selectedStrand.strandName,
            sectionName: selectedSection.sectionName,
            termId: termDetails._id, // Ensure termId is also passed
          })
        });

        if (res.ok) {
          window.alert('Faculty assignment updated successfully!');
          fetchFacultyAssignments(); // Refresh assignments list
          setIsFacultyEditMode(false);
          setEditingFacultyAssignment(null);
          setFacultyFormData({ facultyId: '', trackId: '', strandId: '', sectionIds: [] });
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
        
        const res = await fetch(`http://localhost:5000/api/faculty-assignments/${assignment._id}`, {
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

  const handleAddStudentAssignment = async (e) => {
    e.preventDefault();
    setStudentError('');

    if (!studentFormData.studentId || !studentFormData.trackId || !studentFormData.strandId || studentFormData.sectionIds.length === 0) {
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

      const res = await fetch(`http://localhost:5000/api/student-assignments`, {
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
          termId: termDetails._id,
        })
      });

      if (res.ok) {
        window.alert('Student assigned successfully!');
        fetchStudentAssignments();
        setStudentFormData({ studentId: '', trackId: '', strandId: '', sectionIds: [] });
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
    
    const trackId = tracks.find(t => t.trackName === assignment.trackName)?._id || '';
    const strandId = strands.find(s => s.strandName === assignment.strandName && s.trackName === assignment.trackName)?._id || '';
    const sectionId = sections.find(s => s.sectionName === assignment.sectionName && s.trackName === assignment.trackName && s.strandName === assignment.strandName)?._id || '';

    setStudentFormData({
      studentId: assignment.studentId,
      trackId: trackId,
      strandId: strandId,
      sectionIds: sectionId ? [sectionId] : [],
    });
  };

  const handleUpdateStudentAssignment = async (e) => {
    e.preventDefault();
    setStudentError('');

    if (!studentFormData.studentId || !studentFormData.trackId || !studentFormData.strandId || studentFormData.sectionIds.length === 0) {
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

        const res = await fetch(`http://localhost:5000/api/student-assignments/${editingStudentAssignment._id}`, {
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
            termId: termDetails._id,
          })
        });

        if (res.ok) {
          window.alert('Student assignment updated successfully!');
          fetchStudentAssignments();
          setIsStudentEditMode(false);
          setEditingStudentAssignment(null);
          setStudentFormData({ studentId: '', trackId: '', strandId: '', sectionIds: [] });
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
        
        const res = await fetch(`http://localhost:5000/api/student-assignments/${assignment._id}`, {
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
        {wch: 30}, // Object ID
        {wch: 20}, // Track Name
        {wch: 15}, // School Year
        {wch: 15}, // Term Name
        {wch: 10}  // Status
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
      const res = await fetch(`http://localhost:5000/api/tracks/term/${termDetails.termName}`);
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
      const res = await fetch('http://localhost:5000/api/tracks/bulk', {
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
      // Create a workbook with three sheets
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Template for adding new strands
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['Track Name', 'Strand Name to Add'], // Headers
      ]);
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Strands');

      // Sheet 2: Current strands in the system (only active)
      const allStrands = [];
      for (const track of tracks) {
        const res = await fetch(`http://localhost:5000/api/strands/track/${track.trackName}`);
        if (res.ok) {
          const data = await res.json();
          // Only include strands from active tracks and with active status
          const activeStrands = data.filter(strand => 
            strand.status === 'active' && 
            tracks.find(t => t.trackName === strand.trackName)?.status === 'active'
          );
          allStrands.push(...activeStrands);
        }
      }

      // Create headers for current strands sheet
      const currentStrandsData = [
        ['Object ID', 'Track Name', 'Strand Name', 'Status'], // Headers
        ...allStrands.map(strand => [
          strand._id,
          strand.trackName,
          strand.strandName,
          strand.status
        ])
      ];

      const currentStrandsWs = XLSX.utils.aoa_to_sheet(currentStrandsData);
      
      // Set column widths for better readability
      const wscols = [
        {wch: 30}, // Object ID
        {wch: 20}, // Track Name
        {wch: 20}, // Strand Name
        {wch: 10}  // Status
      ];
      currentStrandsWs['!cols'] = wscols;

      XLSX.utils.book_append_sheet(wb, currentStrandsWs, 'Current Strands');

      // Sheet 3: Available Tracks (only active)
      const activeTracks = tracks.filter(track => track.status === 'active');
      const availableTracksData = [
        ['Track Name', 'Status'], // Headers
        ...activeTracks.map(track => [
          track.trackName,
          track.status
        ])
      ];

      const availableTracksWs = XLSX.utils.aoa_to_sheet(availableTracksData);
      
      // Set column widths for tracks sheet
      const trackWscols = [
        {wch: 20}, // Track Name
        {wch: 10}  // Status
      ];
      availableTracksWs['!cols'] = trackWscols;

      XLSX.utils.book_append_sheet(wb, availableTracksWs, 'Available Tracks');
      
      // Generate and download the file
      XLSX.writeFile(wb, 'strands_template.xlsx');
    } catch (error) {
      console.error('Error generating strand template:', error);
      setStrandError('Failed to generate template. Please try again.');
    }
  };

  const validateStrands = async (strandsToValidate) => {
    const status = {};
    const uploadedStrandNamesByTrack = new Set(); // To detect duplicates within the uploaded file

    // Pre-fetch all active tracks and existing strands to minimize API calls
    const activeTracksMap = new Map(tracks.filter(t => t.status === 'active').map(t => [t.trackName, t]));
    const existingStrandsInSystem = new Set(); // To store 'track-strand' combinations

    for (const track of tracks) {
      if (track.status === 'active') {
        try {
          const res = await fetch(`http://localhost:5000/api/strands/track/${track.trackName}`);
          if (res.ok) {
            const fetchedStrands = await res.json();
            fetchedStrands.filter(s => s.status === 'active').forEach(s => {
              existingStrandsInSystem.add(`${s.trackName}-${s.strandName}`);
            });
          }
        } catch (err) {
          console.error(`Error fetching existing strands for track ${track.trackName}:`, err);
        }
      }
    }

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

      // 2. Check if track exists and is active (if not already invalid)
      if (isValid) {
        const trackFound = activeTracksMap.has(trackName);
        if (!trackFound) {
          isValid = false;
          message = `Track "${trackName}" does not exist or is not active`;
        }
      }

      // 3. Check for duplicates within the uploaded data (if not already invalid)
      if (isValid) {
        const key = `${trackName}-${strandName}`;
        if (uploadedStrandNamesByTrack.has(key)) {
          isValid = false;
          message = 'Duplicate strand name in uploaded file for this track';
        } else {
          uploadedStrandNamesByTrack.add(key);
        }
      }

      // 4. Check for existing strands in the system (if not already invalid)
      if (isValid) {
        const key = `${trackName}-${strandName}`;
        if (existingStrandsInSystem.has(key)) {
          isValid = false;
          message = 'Strand already exists in this track';
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

    setIsStrandUploading(true);
    setStrandError('');

    try {
      // Create strands one by one since they're dependent on tracks
      const createdStrands = [];
      for (const strand of validStrands) {
        const res = await fetch('http://localhost:5000/api/strands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(strand)
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
    } finally {
      setIsStrandUploading(false);
    }
  };

  // Add new functions for section Excel handling
  const downloadSectionTemplate = async () => {
    try {
      // Create a workbook with three sheets
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Template for adding new sections
      const templateWs = XLSX.utils.aoa_to_sheet([
        ['Track Name', 'Strand Name', 'Section Name to Add'], // Headers
      ]);
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Sections');

      // Sheet 2: Current sections in the system (only active)
      const allSections = [];
      for (const track of tracks) {
        if (track.status === 'active') {
          const strandsRes = await fetch(`http://localhost:5000/api/strands/track/${track.trackName}`);
          if (strandsRes.ok) {
            const strands = await strandsRes.json();
            const activeStrands = strands.filter(strand => strand.status === 'active');
            
            for (const strand of activeStrands) {
              const sectionsRes = await fetch(`http://localhost:5000/api/sections/strand/${strand.strandName}`);
              if (sectionsRes.ok) {
                const sections = await sectionsRes.json();
                const activeSections = sections.filter(section => section.status === 'active');
                allSections.push(...activeSections);
              }
            }
          }
        }
      }

      // Create headers for current sections sheet
      const currentSectionsData = [
        ['Object ID', 'Track Name', 'Strand Name', 'Section Name', 'Status'], // Headers
        ...allSections.map(section => [
          section._id,
          section.trackName,
          section.strandName,
          section.sectionName,
          section.status
        ])
      ];

      const currentSectionsWs = XLSX.utils.aoa_to_sheet(currentSectionsData);
      
      // Set column widths for better readability
      const wscols = [
        {wch: 30}, // Object ID
        {wch: 20}, // Track Name
        {wch: 20}, // Strand Name
        {wch: 20}, // Section Name
        {wch: 10}  // Status
      ];
      currentSectionsWs['!cols'] = wscols;

      XLSX.utils.book_append_sheet(wb, currentSectionsWs, 'Current Sections');

      // Sheet 3: Available Strands (only active)
      const availableStrandsData = [];
      for (const track of tracks) {
        if (track.status === 'active') {
          const res = await fetch(`http://localhost:5000/api/strands/track/${track.trackName}`);
          if (res.ok) {
            const strands = await res.json();
            const activeStrands = strands.filter(strand => strand.status === 'active');
            availableStrandsData.push(...activeStrands.map(strand => [
              track.trackName,
              strand.strandName,
              strand.status
            ]));
          }
        }
      }

      const availableStrandsWs = XLSX.utils.aoa_to_sheet([
        ['Track Name', 'Strand Name', 'Status'], // Headers
        ...availableStrandsData
      ]);
      
      // Set column widths for strands sheet
      const strandWscols = [
        {wch: 20}, // Track Name
        {wch: 20}, // Strand Name
        {wch: 10}  // Status
      ];
      availableStrandsWs['!cols'] = strandWscols;

      XLSX.utils.book_append_sheet(wb, availableStrandsWs, 'Available Strands');
      
      // Generate and download the file
      XLSX.writeFile(wb, 'sections_template.xlsx');
    } catch (error) {
      console.error('Error generating section template:', error);
      setSectionError('Failed to generate template. Please try again.');
    }
  };

  const validateSections = async (sectionsToValidate) => {
    const status = {};

    // Pre-fetch all active tracks, strands, and existing sections to minimize API calls
    const activeTracksMap = new Map(tracks.filter(t => t.status === 'active').map(t => [t.trackName, t]));
    const activeStrandsInSystem = []; // To store { trackName, strandName, status }
    const existingSectionsInSystem = new Set(); // To store 'track-strand-section' combinations

    for (const track of tracks) {
      if (track.status === 'active') {
        try {
          const strandsRes = await fetch(`http://localhost:5000/api/strands/track/${track.trackName}`);
          if (strandsRes.ok) {
            const fetchedStrands = await strandsRes.json();
            const activeFetchedStrands = fetchedStrands.filter(s => s.status === 'active');
            activeStrandsInSystem.push(...activeFetchedStrands.map(s => ({ ...s, trackName: track.trackName })));

            for (const strand of activeFetchedStrands) {
              try {
                const sectionsRes = await fetch(`http://localhost:5000/api/sections/strand/${strand.strandName}`);
                if (sectionsRes.ok) {
                  const fetchedSections = await sectionsRes.json();
                  fetchedSections.filter(sec => sec.status === 'active').forEach(sec => {
                    existingSectionsInSystem.add(`${sec.trackName}-${sec.strandName}-${sec.sectionName}`);
                  });
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

    const uploadedSectionCombos = new Set(); // To detect duplicates within the uploaded file

    for (let i = 0; i < sectionsToValidate.length; i++) {
      const section = sectionsToValidate[i];
      const trackName = section.trackName?.trim() || '';
      const strandName = section.strandName?.trim() || '';
      const sectionName = section.sectionName?.trim() || '';

      let isValid = true;
      let message = 'Valid';

      // 1. Check for missing required fields
      if (!trackName || !strandName || !sectionName) {
        isValid = false;
        message = 'Missing Track Name, Strand Name, or Section Name';
      }

      // 2. Check if track exists and is active (if not already invalid)
      if (isValid) {
        const trackFound = activeTracksMap.has(trackName);
        if (!trackFound) {
          isValid = false;
          message = `Track "${trackName}" does not exist or is not active`;
        }
      }

      // 3. Check if strand exists within the active track and is active (if not already invalid)
      if (isValid) {
        const strandFound = activeStrandsInSystem.some(s => s.trackName === trackName && s.strandName === strandName);
        if (!strandFound) {
          isValid = false;
          message = `Strand "${strandName}" does not exist in track "${trackName}" or is not active`;
        }
      }

      // 4. Check for duplicates within the uploaded data (if not already invalid)
      if (isValid) {
        const currentCombo = `${trackName}-${strandName}-${sectionName}`;
        if (uploadedSectionCombos.has(currentCombo)) {
          isValid = false;
          message = 'Duplicate section name in uploaded file for this track-strand combination';
        } else {
          uploadedSectionCombos.add(currentCombo);
        }
      }

      // 5. Check for existing sections in the system (if not already invalid)
      if (isValid) {
        const currentCombo = `${trackName}-${strandName}-${sectionName}`;
        if (existingSectionsInSystem.has(currentCombo)) {
          isValid = false;
          message = 'Section already exists in this track-strand combination';
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
            sectionName: row['Section Name to Add']?.trim() || ''
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
        const res = await fetch('http://localhost:5000/api/sections', {
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
        ['Faculty Name', 'Track Name', 'Strand Name', 'Section Name'], // Headers
      ]);
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Faculty Assignments');

      // Sheet 2: Current faculty assignments in the system (only active)
      const currentFacultyAssignments = facultyAssignments.filter(fa => fa.status === 'active');
      const currentFacultyAssignmentsData = [
        ['Object ID', 'Faculty Name', 'Track Name', 'Strand Name', 'Section Name', 'Status'], // Headers
        ...currentFacultyAssignments.map(assignment => [
          assignment._id,
          assignment.facultyName,
          assignment.trackName,
          assignment.strandName,
          assignment.sectionName,
          assignment.status
        ])
      ];

      const currentFacultyAssignmentsWs = XLSX.utils.aoa_to_sheet(currentFacultyAssignmentsData);
      const faWscols = [
        {wch: 30}, {wch: 25}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 10}
      ];
      currentFacultyAssignmentsWs['!cols'] = faWscols;
      XLSX.utils.book_append_sheet(wb, currentFacultyAssignmentsWs, 'Current Assignments');

      // Sheet 3: Available Faculty
      console.log("Faculties in state:", faculties);
      const activeFaculties = faculties.filter(f => f.role === 'faculty' && !f.isArchived); // Corrected filter
      console.log("Active faculties for template:", activeFaculties);
      const availableFacultiesData = [
        ['Object ID', 'Faculty Name', 'Email', 'Status'], // Headers
        ...activeFaculties.map(f => [
          f._id,
          `${f.firstname} ${f.lastname}`,
          f.email,
          f.isArchived ? 'Archived' : 'Active' // Display status based on isArchived
        ])
      ];
      const availableFacultiesWs = XLSX.utils.aoa_to_sheet(availableFacultiesData);
      const facultyWscols = [
        {wch: 30}, {wch: 25}, {wch: 30}, {wch: 10}
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
        {wch: 20}, {wch: 10}
      ];
      availableTracksWs['!cols'] = trackWscols;
      XLSX.utils.book_append_sheet(wb, availableTracksWs, 'Available Tracks');

      // Sheet 5: Available Strands
      const activeStrandsInSystem = [];
      for (const track of activeTracks) {
        const res = await fetch(`http://localhost:5000/api/strands/track/${track.trackName}`);
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
        {wch: 20}, {wch: 20}, {wch: 10}
      ];
      availableStrandsWs['!cols'] = strandWscols;
      XLSX.utils.book_append_sheet(wb, availableStrandsWs, 'Available Strands');

      // Sheet 6: Available Sections
      const activeSectionsInSystem = [];
      for (const track of activeTracks) {
        const strandsInTrack = activeStrandsInSystem.filter(s => s.trackName === track.trackName);
        for (const strand of strandsInTrack) {
          const res = await fetch(`http://localhost:5000/api/sections/track/${track.trackName}/strand/${strand.strandName}`);
          if (res.ok) {
            const fetchedSections = await res.json();
            activeSectionsInSystem.push(...fetchedSections.filter(sec => sec.status === 'active').map(sec => ({ ...sec, trackName: track.trackName, strandName: strand.strandName })));
          }
        }
      }
      const availableSectionsData = [
        ['Track Name', 'Strand Name', 'Section Name', 'Status'],
        ...activeSectionsInSystem.map(sec => [sec.trackName, sec.strandName, sec.sectionName, sec.status])
      ];
      const availableSectionsWs = XLSX.utils.aoa_to_sheet(availableSectionsData);
      const sectionWscols = [
        {wch: 20}, {wch: 20}, {wch: 20}, {wch: 10}
      ];
      availableSectionsWs['!cols'] = sectionWscols;
      XLSX.utils.book_append_sheet(wb, availableSectionsWs, 'Available Sections');
      
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
          const strandsRes = await fetch(`http://localhost:5000/api/strands/track/${track.trackName}`);
          if (strandsRes.ok) {
            const fetchedStrands = await strandsRes.json();
            for (const strand of fetchedStrands.filter(s => s.status === 'active')) {
              activeStrandsMap.set(`${track.trackName}-${strand.strandName}`, strand);
              try {
                const sectionsRes = await fetch(`http://localhost:5000/api/sections/track/${track.trackName}/strand/${strand.strandName}`);
                if (sectionsRes.ok) {
                  const fetchedSections = await sectionsRes.json();
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
    
    // Fetch existing faculty assignments (assuming only one assignment per faculty-track-strand-section for a given term)
    const existingAssignmentsInSystem = new Set();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/faculty-assignments?termId=${termDetails._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        data.forEach(assign => {
          existingAssignmentsInSystem.add(`${assign.facultyId}-${assign.trackName}-${assign.strandName}-${assign.sectionName}`);
        });
      } else {
        console.error('Failed to fetch existing faculty assignments for validation.');
      }
    } catch (err) {
      console.error('Error fetching existing faculty assignments for validation:', err);
    }

    for (let i = 0; i < assignmentsToValidate.length; i++) {
      const assignment = assignmentsToValidate[i];
      const facultyNameInput = assignment.facultyNameInput?.trim() || ''; // Correctly use facultyNameInput
      const trackName = assignment.trackName?.trim() || '';
      const strandName = assignment.strandName?.trim() || '';
      const sectionName = assignment.sectionName?.trim() || '';

      let isValid = true;
      let message = 'Valid';
      let facultyId = ''; // To store the faculty ID for valid assignments

      // 1. Check for missing required fields
      if (!facultyNameInput || !trackName || !strandName || !sectionName) {
        isValid = false;
        message = 'Missing Faculty Name, Track Name, Strand Name, or Section Name';
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
        if (existingAssignmentsInSystem.has(existingCombo)) {
          isValid = false;
          message = 'Faculty assignment already exists in the system';
        }
      }

      status[i] = { valid: isValid, message: message, facultyId: facultyId };
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

          const requiredHeaders = ['Faculty Name', 'Track Name', 'Strand Name', 'Section Name'];
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
            facultyNameInput: String(row[actualHeaders.indexOf('Faculty Name')] || '').trim(), // Now correctly looking for 'Faculty Name'
            trackName: String(row[actualHeaders.indexOf('Track Name')] || '').trim(),
            strandName: String(row[actualHeaders.indexOf('Strand Name')] || '').trim(),
            sectionName: String(row[actualHeaders.indexOf('Section Name')] || '').trim(),
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

        const res = await fetch('http://localhost:5000/api/faculty-assignments', {
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
            termId: termDetails._id,
          })
        });

        if (res.ok) {
          const newAssignment = await res.json();
          createdAssignments.push(newAssignment);
        } else {
          const data = await res.json();
          throw new Error(data.message || `Failed to create assignment for ${assignment.facultyNameInput}`); // Corrected message
        }
      }

      // Refresh the faculty assignments list after successful upload
      fetchFacultyAssignments();
      window.alert(`${createdAssignments.length} faculty assignment(s) uploaded successfully!`);
      setFacultyAssignmentExcelFile(null);
      setFacultyAssignmentPreviewModalOpen(false);
      document.querySelector('input[type="file"][accept=".xlsx,.xls"]').value = ''; // Reset file input

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
        ['Student Name', 'Track Name', 'Strand Name', 'Section Name'], // Headers
      ]);
      XLSX.utils.book_append_sheet(wb, templateWs, 'Add New Student Assignments');

      // Sheet 2: Current student assignments in the system
      // Fetch student assignments again or ensure facultyAssignments is up-to-date
      const token = localStorage.getItem('token');
      const studentAssignmentsRes = await fetch(`http://localhost:5000/api/student-assignments?termId=${termDetails._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let currentStudentAssignments = [];
      if (studentAssignmentsRes.ok) {
        const data = await studentAssignmentsRes.json();
        currentStudentAssignments = data;
      }
      
      const currentStudentAssignmentsData = [
        ['Object ID', 'Student Name', 'Track Name', 'Strand Name', 'Section Name', 'Status'], // Headers
        ...currentStudentAssignments.map(assignment => [
          assignment._id,
          assignment.studentName,
          assignment.trackName,
          assignment.strandName,
          assignment.sectionName,
          assignment.status
        ])
      ];

      const currentStudentAssignmentsWs = XLSX.utils.aoa_to_sheet(currentStudentAssignmentsData);
      const saWscols = [
        {wch: 30}, {wch: 25}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 10}
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
        {wch: 30}, {wch: 25}, {wch: 30}, {wch: 10}
      ];
      availableStudentsWs['!cols'] = studentWscols;
      XLSX.utils.book_append_sheet(wb, availableStudentsWs, 'Available Students');

      // Sheet 4: Available Tracks
      const activeTracks = tracks.filter(t => t.status === 'active');
      const availableTracksData = [
        ['Track Name', 'Status'],
        ...activeTracks.map(t => [t.trackName, t.status])
      ];
      const availableTracksWs = XLSX.utils.aoa_to_sheet(availableTracksData);
      const trackWscols = [
        {wch: 20}, {wch: 10}
      ];
      availableTracksWs['!cols'] = trackWscols;
      XLSX.utils.book_append_sheet(wb, availableTracksWs, 'Available Tracks');

      // Sheet 5: Available Strands (filtered by active tracks)
      const activeStrandsInSystem = [];
      for (const track of activeTracks) {
        const res = await fetch(`http://localhost:5000/api/strands/track/${track.trackName}`);
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
        {wch: 20}, {wch: 20}, {wch: 10}
      ];
      availableStrandsWs['!cols'] = strandWscols;
      XLSX.utils.book_append_sheet(wb, availableStrandsWs, 'Available Strands');

      // Sheet 6: Available Sections (filtered by active tracks and strands)
      const activeSectionsInSystem = [];
      for (const track of activeTracks) {
        const strandsInTrack = activeStrandsInSystem.filter(s => s.trackName === track.trackName);
        for (const strand of strandsInTrack) {
          const res = await fetch(`http://localhost:5000/api/sections/track/${track.trackName}/strand/${strand.strandName}`);
          if (res.ok) {
            const fetchedSections = await res.json();
            activeSectionsInSystem.push(...fetchedSections.filter(sec => sec.status === 'active').map(sec => ({ ...sec, trackName: track.trackName, strandName: strand.strandName })));
          }
        }
      }
      const availableSectionsData = [
        ['Track Name', 'Strand Name', 'Section Name', 'Status'],
        ...activeSectionsInSystem.map(sec => [sec.trackName, sec.strandName, sec.sectionName, sec.status])
      ];
      const availableSectionsWs = XLSX.utils.aoa_to_sheet(availableSectionsData);
      const sectionWscols = [
        {wch: 20}, {wch: 20}, {wch: 20}, {wch: 10}
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
          const strandsRes = await fetch(`http://localhost:5000/api/strands/track/${track.trackName}`);
          if (strandsRes.ok) {
            const fetchedStrands = await strandsRes.json();
            for (const strand of fetchedStrands.filter(s => s.status === 'active')) {
              activeStrandsMap.set(`${track.trackName}-${strand.strandName}`, strand);
              try {
                const sectionsRes = await fetch(`http://localhost:5000/api/sections/track/${track.trackName}/strand/${strand.strandName}`);
                if (sectionsRes.ok) {
                  const fetchedSections = await sectionsRes.json();
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
      const res = await fetch(`http://localhost:5000/api/student-assignments?termId=${termDetails._id}`, {
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
      const trackName = assignment['Track Name']?.trim() || '';
      const strandName = assignment['Strand Name']?.trim() || '';
      const sectionName = assignment['Section Name']?.trim() || '';
      console.log(`Extracted: Student: "${studentNameInput}", Track: "${trackName}", Strand: "${strandName}", Section: "${sectionName}"`);

      let isValid = true;
      let message = 'Valid';
      let studentId = ''; // To store the student ID for valid assignments

      // 1. Check for missing required fields
      if (!studentNameInput || !trackName || !strandName || !sectionName) {
        isValid = false;
        message = 'Missing Student Name, Track Name, Strand Name, or Section Name';
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
        console.log(`Checking for existing assignment in system: "${existingCombo}"`);
        if (existingAssignmentsInSystem.has(existingCombo)) {
          isValid = false;
          message = 'Student assignment already exists in the system';
        }
      }

      status[i] = { valid: isValid, message: message, studentId: studentId };
      console.log(`Validation result for assignment ${i + 1}:`, status[i]);
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
        const originalIndex = studentPreviewData.indexOf(assignment);
        const studentId = studentValidationStatus[originalIndex]?.studentId; 
        
        if (!studentId) { // Should not happen if validation is correct, but as a safeguard
          console.warn('Skipping assignment due to missing studentId after validation', assignment);
          continue;
        }

        const res = await fetch('http://localhost:5000/api/student-assignments', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({
            studentId: studentId,
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
      document.querySelector('input[type="file"][accept=".xlsx,.xls"]').value = ''; // Reset file input

    } catch (err) {
      setStudentExcelError(err.message || 'Error uploading student assignments');
      console.error(err);
    } finally {
      setIsStudentUploading(false);
    }
  };

  if (loading) return <div>Loading term details...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!termDetails) return <div>Term not found.</div>;

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
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-b-2 border-[#00418B] text-[#00418B]'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'dashboard' && (
              <div className="text-gray-500 text-center py-8">
                Term Dashboard content will be implemented here
              </div>
            )}

            {activeTab === 'tracks' && (
              <div className="">
                {/* New Track Form */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-xl font-semibold mb-4">Add New Track</h3>
                  {trackError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{trackError}</div>}
                  {excelError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{excelError}</div>}
                  
                  {/* Excel Upload Section */}
                  <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h4 className="text-lg font-medium mb-3">Bulk Upload Tracks</h4>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Upload Excel File
                        </label>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleExcelFile}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={downloadTemplate}
                        className="bg-[#00418B] text-white py-2 px-4 rounded-md hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:ring-offset-2"
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

                  <form onSubmit={isEditMode ? handleUpdateTrack : handleAddTrack} className="space-y-4 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Track Name
                      </label>
                      <input
                        type="text"
                        name="trackName"
                        value={trackFormData.trackName}
                        onChange={(e) => setTrackFormData({ ...trackFormData, trackName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
                        {isEditMode ? 'Save Changes' : 'Add Track'}
                      </button>
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditMode(false);
                            setEditingTrack(null);
                            setTrackFormData({ trackName: '' });
                          }}
                          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Track List */}
                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-2">Tracks List</h4>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border w-3/4">Track Name</th>
                        <th className="p-3 border w-1/4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tracks.length === 0 ? (
                        <tr>
                          <td colSpan="2" className="p-3 border text-center text-gray-500">
                            No tracks found.
                          </td>
                        </tr>
                      ) : (
                        tracks.map((track) => (
                          <tr key={track._id}>
                            <td className="p-3 border">{track.trackName}</td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button
                                  onClick={() => handleEditTrack(track)}
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                                  title="Edit"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTrack(track)}
                                  className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded"
                                  title="Delete"
                                >
                                  <img src={archiveIcon} alt="Delete" className="w-8 h-8 inline-block" />
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

            {activeTab === 'strands' && (
              <div className="">
                {/* New Strand Form */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-xl font-semibold mb-4">Add New Strand</h3>
                  {strandError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{strandError}</div>}
                  
                  {/* Excel Upload Section */}
                  <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h4 className="text-lg font-medium mb-3">Bulk Upload Strands</h4>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Upload Excel File
                        </label>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleStrandExcelFile}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={downloadStrandTemplate}
                        className="bg-[#00418B] text-white py-2 px-4 rounded-md hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:ring-offset-2"
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

                  <form onSubmit={isStrandEditMode ? handleUpdateStrand : handleAddStrand} className="space-y-4 mt-6">
                    <div className="flex flex-col md:flex-row md:space-x-4 md:space-y-0 mb-4"> {/* This div ensures vertical stacking of inputs */}
                      <div className="flex-1">
                        <label htmlFor="trackName" className="block text-sm font-medium text-gray-700 mb-1">Track Name</label>
                        <select
                          id="trackName"
                          name="trackId"
                          value={strandFormData.trackId}
                          onChange={(e) => setStrandFormData({ ...strandFormData, trackId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select a Track</option>
                          {tracks.map(track => (
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
                          onChange={(e) => setStrandFormData({ ...strandFormData, strandName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="submit"
                        className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
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
                          }}
                          className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Strands List */}
                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-2">Strands List</h4>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border w-1/3">Track Name</th>
                        <th className="p-3 border w-1/3">Strand Name</th>
                        <th className="p-3 border w-1/3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strands.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-3 border text-center text-gray-500">
                            No strands found.
                          </td>
                        </tr>
                      ) : (
                        strands.map((strand) => (
                          <tr key={strand._id}>
                            <td className="p-3 border">{strand.trackName}</td>
                            <td className="p-3 border">{strand.strandName}</td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button
                                  onClick={() => handleEditStrand(strand)}
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                                  title="Edit"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStrand(strand)}
                                  className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded"
                                  title="Delete"
                                >
                                  <img src={archiveIcon} alt="Delete" className="w-8 h-8 inline-block" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Strand Preview Modal */}
                {strandPreviewModalOpen && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
                      <h3 className="text-xl font-semibold mb-4">Preview Strands to Upload</h3>
                      
                      <div className="mb-4">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-blue-700">
                                {Object.values(strandValidationStatus).filter(v => v.valid).length} strand(s) are valid and will be uploaded.
                                {Object.values(strandValidationStatus).filter(v => !v.valid).length > 0 && (
                                  <span className="block mt-1">
                                    {Object.values(strandValidationStatus).filter(v => !v.valid).length} strand(s) have validation errors and will be skipped.
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
                              <th className="p-3 border">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {strandPreviewData.map((strand, index) => {
                              const isValid = strandValidationStatus[index]?.valid;
                              const message = strandValidationStatus[index]?.message;
                              return (
                                <tr key={index} className={isValid ? 'bg-green-50' : 'bg-red-50'}>
                                  <td className="p-3 border">{strand.trackName || <span className="text-red-500">Missing</span>}</td>
                                  <td className="p-3 border">{strand.strandName || <span className="text-red-500">Missing</span>}</td>
                                  <td className="p-3 border">
                                    <span className={`px-2 py-1 rounded text-sm ${
                                      isValid 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {isValid ? '✓ Valid' : `✗ ${message}`}
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
                            setStrandPreviewModalOpen(false);
                            setStrandPreviewData([]);
                            setStrandValidationStatus({});
                            setStrandError('');
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmStrandUpload}
                          disabled={isStrandUploading || !strandPreviewData.some((_, index) => strandValidationStatus[index]?.valid)}
                          className={`px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 ${
                            (!strandPreviewData.some((_, index) => strandValidationStatus[index]?.valid) || isStrandUploading)
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                        >
                          {isStrandUploading ? 'Uploading...' : `Upload ${Object.values(strandValidationStatus).filter(v => v.valid).length} Valid Strand(s)`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sections' && (
              <div className="">
                {/* New Section Form */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-xl font-semibold mb-4">Add New Section</h3>
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
                        />
                      </div>
                      <button
                        onClick={downloadSectionTemplate}
                        className="bg-[#00418B] text-white py-2 px-4 rounded-md hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:ring-offset-2"
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

                  <form onSubmit={isSectionEditMode ? handleUpdateSection : handleAddSection} className="space-y-4 mt-6">
                    <div className="flex flex-col md:flex-row md:space-x-4 md:space-y-0 mb-4"> {/* This div ensures vertical stacking of inputs */}
                      <div className="flex-1">
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
                        >
                          <option value="">Select a Track</option>
                          {tracks.map(track => (
                            <option key={track._id} value={track._id}>
                              {track.trackName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label htmlFor="strandNameSection" className="block text-sm font-medium text-gray-700 mb-1">Strand Name</label>
                        <select
                          id="strandNameSection"
                          name="strandId"
                          value={sectionFormData.strandId}
                          onChange={(e) => setSectionFormData({ ...sectionFormData, strandId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={!sectionFormData.trackId}
                        >
                          <option value="">Select a Strand</option>
                          {filteredStrandsForSection.map(strand => (
                            <option key={strand._id} value={strand._id}>
                              {strand.strandName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label htmlFor="sectionName" className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
                        <input
                          type="text"
                          id="sectionName"
                          name="sectionName"
                          value={sectionFormData.sectionName}
                          onChange={(e) => setSectionFormData({ ...sectionFormData, sectionName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
                        {isSectionEditMode ? 'Save Changes' : 'Add New Section'}
                      </button>
                      {isSectionEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSectionEditMode(false);
                            setEditingSection(null);
                            setSectionFormData({ trackId: '', strandId: '', sectionName: '' });
                          }}
                          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Sections List */}
                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-2">Sections List</h4>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border w-1/4">Track Name</th>
                        <th className="p-3 border w-1/4">Strand Name</th>
                        <th className="p-3 border w-1/4">Section Name</th>
                        <th className="p-3 border w-1/4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-3 border text-center text-gray-500">
                            No sections found.
                          </td>
                        </tr>
                      ) : (
                        sections.map((section) => (
                          <tr key={section._id}>
                            <td className="p-3 border">{section.trackName}</td>
                            <td className="p-3 border">{section.strandName}</td>
                            <td className="p-3 border">{section.sectionName}</td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button
                                  onClick={() => handleEditSection(section)}
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                                  title="Edit"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSection(section)}
                                  className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded"
                                  title="Delete"
                                >
                                  <img src={archiveIcon} alt="Delete" className="w-8 h-8 inline-block" />
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
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
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
                              <th className="p-3 border">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sectionPreviewData.map((section, index) => {
                              const isValid = sectionValidationStatus[index]?.valid;
                              const message = sectionValidationStatus[index]?.message;
                              return (
                                <tr key={index} className={isValid ? 'bg-green-50' : 'bg-red-50'}>
                                  <td className="p-3 border">{section.trackName || <span className="text-red-500">Missing</span>}</td>
                                  <td className="p-3 border">{section.strandName || <span className="text-red-500">Missing</span>}</td>
                                  <td className="p-3 border">{section.sectionName || <span className="text-red-500">Missing</span>}</td>
                                  <td className="p-3 border">
                                    <span className={`px-2 py-1 rounded text-sm ${
                                      isValid 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {isValid ? '✓ Valid' : `✗ ${message}`}
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
                          className={`px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 ${
                            (!sectionPreviewData.some((_, index) => sectionValidationStatus[index]?.valid) || isSectionUploading)
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

            {activeTab === 'faculty' && (
              <div className="">
                {/* New Faculty Assignment Form */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-xl font-semibold mb-4">Assign Faculty</h3>
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
                        />
                      </div>
                      <button
                        onClick={downloadFacultyAssignmentTemplate}
                        className="bg-[#00418B] text-white py-2 px-4 rounded-md hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:ring-offset-2"
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

                  {/* Manual Assignment Form */}
                  <form onSubmit={isFacultyEditMode ? handleUpdateFacultyAssignment : handleAddFacultyAssignment} className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="facultyName" className="block text-sm font-medium text-gray-700 mb-1">Faculty Name</label>
                        <select
                          id="facultyName"
                          name="facultyId"
                          value={facultyFormData.facultyId}
                          onChange={handleChangeFacultyForm}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Faculty</option>
                          {faculties.map(faculty => (
                            <option key={faculty._id} value={faculty._id}>
                              {faculty.firstname} {faculty.lastname}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="trackNameFaculty" className="block text-sm font-medium text-gray-700 mb-1">Track Name</label>
                        <select
                          id="trackNameFaculty"
                          name="trackId"
                          value={facultyFormData.trackId}
                          onChange={handleChangeFacultyForm}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select a Track</option>
                          {tracks.map(track => (
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
                          disabled={!facultyFormData.trackId}
                        >
                          <option value="">Select a Strand</option>
                          {filteredStrandsForFaculty.map(strand => (
                            <option key={strand._id} value={strand._id}>
                              {strand.strandName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="sectionNameFaculty" className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                        <select
                          id="sectionNameFaculty"
                          name="sectionIds"
                          value={facultyFormData.sectionIds[0] || ''}
                          onChange={(e) => setFacultyFormData({ ...facultyFormData, sectionIds: [e.target.value] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={!facultyFormData.strandId}
                        >
                          <option value="">Select a Section</option>
                          {filteredSectionsForFaculty.map(section => (
                            <option key={section._id} value={section._id}>
                              {section.sectionName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
                        {isFacultyEditMode ? 'Save Changes' : 'Assign Faculty'}
                      </button>
                      {isFacultyEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsFacultyEditMode(false);
                            setEditingFacultyAssignment(null);
                            setFacultyFormData({ facultyId: '', trackId: '', strandId: '', sectionIds: [] });
                          }}
                          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Faculty Assignment List */}
                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-2">Faculty Assignments List</h4>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border w-1/5">Faculty Name</th>
                        <th className="p-3 border w-1/5">Track Name</th>
                        <th className="p-3 border w-1/5">Strand Name</th>
                        <th className="p-3 border w-1/5">Section</th>
                        <th className="p-3 border w-1/5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultyAssignments.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-3 border text-center text-gray-500">
                            No faculty assignments found.
                          </td>
                        </tr>
                      ) : (
                        facultyAssignments.map((assignment) => (
                          <tr key={assignment._id}>
                            <td className="p-3 border">{assignment.facultyName}</td>
                            <td className="p-3 border">{assignment.trackName}</td>
                            <td className="p-3 border">{assignment.strandName}</td>
                            <td className="p-3 border">{assignment.sectionName}</td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button
                                  onClick={() => handleEditFacultyAssignment(assignment)}
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                                  title="Edit"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                                  onClick={() => handleDeleteFacultyAssignment(assignment)}
                                  className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded"
                                  title="Delete"
                                >
                                  <img src={archiveIcon} alt="Delete" className="w-8 h-8 inline-block" />
                                </button>
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
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
                      <h3 className="text-xl font-semibold mb-4">Preview Faculty Assignments to Upload</h3>
                      
                      <div className="mb-4">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
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
                              <th className="p-3 border">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {facultyAssignmentPreviewData.map((assignment, index) => {
                              const isValid = facultyAssignmentValidationStatus[index]?.valid;
                              const message = facultyAssignmentValidationStatus[index]?.message;
                              return (
                                <tr key={index} className={isValid ? 'bg-green-50' : 'bg-red-50'}>
                                  <td className="p-3 border">{assignment.facultyNameInput || <span className="text-red-500">Missing</span>}</td>
                                  <td className="p-3 border">{assignment.trackName || <span className="text-red-500">Missing</span>}</td>
                                  <td className="p-3 border">{assignment.strandName || <span className="text-red-500">Missing</span>}</td>
                                  <td className="p-3 border">{assignment.sectionName || <span className="text-red-500">Missing</span>}</td>
                                  <td className="p-3 border">
                                    <span className={`px-2 py-1 rounded text-sm ${
                                      isValid 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {isValid ? '✓ Valid' : `✗ ${message}`}
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
                          className={`px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 ${
                            (!facultyAssignmentPreviewData.some((_, index) => facultyAssignmentValidationStatus[index]?.valid) || isFacultyAssignmentUploading)
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                        >
                          {isFacultyAssignmentUploading ? 'Uploading...' : `Upload ${Object.values(facultyAssignmentValidationStatus).filter(v => v.valid).length} Valid Assignment(s)`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'students' && (
              <div className="">
                {/* New Student Assignment Form */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-xl font-semibold mb-4">Assign Student</h3>
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
                        />
                      </div>
                      <button
                        onClick={downloadStudentAssignmentTemplate}
                        className="bg-[#00418B] text-white py-2 px-4 rounded-md hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:ring-offset-2"
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

                  {/* Manual Assignment Form */}
                  <form onSubmit={isStudentEditMode ? handleUpdateStudentAssignment : handleAddStudentAssignment} className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                        <select
                          id="studentName"
                          name="studentId"
                          value={studentFormData.studentId}
                          onChange={handleChangeStudentForm}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Student</option>
                          {students.filter(s => !s.isArchived).map(s => (
                            <option key={s._id} value={s._id}>
                              {s.firstname} {s.lastname}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="trackId" className="block text-sm font-medium text-gray-700 mb-1">Track</label>
                        <select
                          id="trackId"
                          name="trackId"
                          value={studentFormData.trackId}
                          onChange={handleChangeStudentForm}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Track</option>
                          {tracks.map(track => (
                            <option key={track._id} value={track._id}>
                              {track.trackName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="strandId" className="block text-sm font-medium text-gray-700 mb-1">Strand</label>
                        <select
                          id="strandId"
                          name="strandId"
                          value={studentFormData.strandId}
                          onChange={handleChangeStudentForm}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={!studentFormData.trackId}
                        >
                          <option value="">Select Strand</option>
                          {filteredStrandsForStudent.map(strand => (
                            <option key={strand._id} value={strand._id}>
                              {strand.strandName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="sectionIds" className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                        <select
                          id="sectionIds"
                          name="sectionIds"
                          value={studentFormData.sectionIds[0] || ''}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, sectionIds: [e.target.value] }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={!studentFormData.strandId}
                        >
                          <option value="">Select Section</option>
                          {filteredSectionsForStudent.map(section => (
                            <option key={section._id} value={section._id}>
                              {section.sectionName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
                        {isStudentEditMode ? 'Save Changes' : 'Assign Student'}
                      </button>
                      {isStudentEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsStudentEditMode(false);
                            setEditingStudentAssignment(null);
                            setStudentFormData({ studentId: '', trackId: '', strandId: '', sectionIds: [] });
                          }}
                          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Student Assignment List */}
                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-2">Student Assignments List</h4>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border w-1/5">Student Name</th>
                        <th className="p-3 border w-1/5">Track Name</th>
                        <th className="p-3 border w-1/5">Strand Name</th>
                        <th className="p-3 border w-1/5">Section</th>
                        <th className="p-3 border w-1/5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAssignments.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-3 border text-center text-gray-500">
                            No student assignments found.
                          </td>
                        </tr>
                      ) : (
                        studentAssignments.map((assignment) => (
                          <tr key={assignment._id}>
                            <td className="p-3 border">{assignment.studentName}</td>
                            <td className="p-3 border">{assignment.trackName}</td>
                            <td className="p-3 border">{assignment.strandName}</td>
                            <td className="p-3 border">{assignment.sectionName}</td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button
                                  onClick={() => handleEditStudentAssignment(assignment)}
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                                  title="Edit"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudentAssignment(assignment)}
                                  className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded"
                                  title="Delete"
                                >
                                  <img src={archiveIcon} alt="Delete" className="w-8 h-8 inline-block" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Student Assignment Preview Modal */}
                {studentPreviewModalOpen && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
                      <h3 className="text-xl font-semibold mb-4">Preview Student Assignments to Upload</h3>
                      
                      <div className="mb-4">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
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
                                  <td className="p-3 border">{assignment.studentName}</td>
                                  <td className="p-3 border">{assignment.trackName}</td>
                                  <td className="p-3 border">{assignment.strandName}</td>
                                  <td className="p-3 border">{assignment.sectionName}</td>
                                  <td className="p-3 border">
                                    {isValid ? (
                                      <span className="text-green-600">Valid</span>
                                    ) : (
                                      <span className="text-red-600" title={message}>Invalid</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          onClick={() => {
                            setStudentPreviewModalOpen(false);
                            setStudentExcelFile(null);
                            document.querySelector('input[type="file"][accept=".xlsx,.xls"]').value = '';
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmStudentAssignmentUpload}
                          disabled={isStudentUploading || !studentPreviewData.some((_, index) => studentValidationStatus[index]?.valid)}
                          className={`px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 ${
                            (!studentPreviewData.some((_, index) => studentValidationStatus[index]?.valid) || isStudentUploading)
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                        >
                          {isStudentUploading ? 'Uploading...' : 'Confirm Upload'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                        <span className={`px-2 py-1 rounded text-sm ${
                          validationStatus[index]?.valid 
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
                className={`px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 ${
                  (!previewTracks.some((_, index) => validationStatus[index]?.valid) || isUploading)
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
    </div>
  );
} 