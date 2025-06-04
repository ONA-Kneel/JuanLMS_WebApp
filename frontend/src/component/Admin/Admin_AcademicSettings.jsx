import React, { useState, useEffect } from 'react';
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import editIcon from "../../assets/editing.png";
import archiveIcon from "../../assets/archive.png";

export default function Admin_AcademicSettings() {
  const [activeTab, setActiveTab] = useState("school-year"); // Default to the first tab
  const [xlsxLoaded, setXlsxLoaded] = useState(false);
  const [xlsxError, setXlsxError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [isEditingSection, setIsEditingSection] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  // Add XLSX script loading effect
  useEffect(() => {
    const loadXLSX = () => {
      if (window.XLSX) {
        setXlsxLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/xlsx/dist/xlsx.full.min.js';
      script.async = true;
      
      script.onload = () => {
        setXlsxLoaded(true);
        setXlsxError(null);
      };
      
      script.onerror = () => {
        setXlsxError('Failed to load Excel processing library');
        console.error('Failed to load XLSX library');
      };

      document.body.appendChild(script);
    };

    loadXLSX();
  }, []);

  // State for School Year Tab
  const [schoolYearsData, setSchoolYearsData] = useState([]);
  const [isLoadingSchoolYears, setIsLoadingSchoolYears] = useState(false);
  const [errorSchoolYears, setErrorSchoolYears] = useState(null);
  const [formDataSchoolYear, setFormDataSchoolYear] = useState({
    startYear: "",
    endYear: "",
    status: "inactive", // Default status
  });

  // Add edit state for school year
  const [isEditingSchoolYear, setIsEditingSchoolYear] = useState(false);
  const [editingSchoolYear, setEditingSchoolYear] = useState(null);

  // State for Program Tab
  const [programsData, setProgramsData] = useState([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [errorPrograms, setErrorPrograms] = useState(null);
  const [formDataProgram, setFormDataProgram] = useState({
    programName: "",
    yearLevel: ""
  });

  // State for Course Tab
  const [coursesData, setCoursesData] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [errorCourses, setErrorCourses] = useState(null);
  const [formDataCourse, setFormDataCourse] = useState({
    courseName: "",
    program: "", // This will store the selected Program ID
  });

  // State for Section Tab
  const [sectionsData, setSectionsData] = useState([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [errorSections, setErrorSections] = useState(null);
  const [formDataSection, setFormDataSection] = useState({
    sectionName: "",
    program: "", // Will store selected Program ID
    yearLevel: "",
    course: "", // Added course to Section form data
  });

  // Filtered data for dropdowns in Section tab
  // eslint-disable-next-line
  const [filteredProgramsForSectionDropdown, setFilteredProgramsForSectionDropdown] = useState([]); // unused
  const [filteredCoursesForSectionDropdown, setFilteredCoursesForSectionDropdown] = useState([]);

  // Faculty Assignment State
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [filteredCoursesForFaculty, setFilteredCoursesForFaculty] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(false);
  const [errorFaculty, setErrorFaculty] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [editingFacultyAssignment, setEditingFacultyAssignment] = useState(null); // For editing

  // Student Assignment State
  const [studentList, setStudentList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedProgramIdForStudent, setSelectedProgramIdForStudent] = useState("");
  const [filteredCoursesForStudent, setFilteredCoursesForStudent] = useState([]);
  const [selectedCourseIdForStudent, setSelectedCourseIdForStudent] = useState("");
  const [filteredSectionsForStudent, setFilteredSectionsForStudent] = useState([]);
  const [selectedSectionIdForStudent, setSelectedSectionIdForStudent] = useState("");
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [errorStudents, setErrorStudents] = useState(null);
  const [isAssigningStudent, setIsAssigningStudent] = useState(false);
  const [editingStudentAssignment, setEditingStudentAssignment] = useState(null);
  // Add new state for batch upload
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchUploadMessage, setBatchUploadMessage] = useState("");

  // Add student search function
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  
  const handleStudentSearch = async (searchTerm) => {
    setStudentSearchTerm(searchTerm);
    if (!searchTerm.trim()) {
      setStudentSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/users`);
      const data = await response.json();
      const filteredStudents = data.filter(user => 
        user.role === "students" &&
        (user.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.lastname?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setStudentSearchResults(filteredStudents);
    } catch (error) {
      console.error("Error searching students:", error);
    }
  };

  // Add course search function
  // eslint-disable-next-line
  const [courseSearchTerm, setCourseSearchTerm] = useState(""); // unused
  
  // eslint-disable-next-line
  const [programSearchTerm, setProgramSearchTerm] = useState(""); // unused
  
  // eslint-disable-next-line
  const [sectionSearchTerm, setSectionSearchTerm] = useState(""); // unused
  
  // eslint-disable-next-line
  const [selectedFile, setSelectedFile] = useState(null); // unused

  const yearLevelOptions = [
    { value: "College", label: "College" },
    { value: "Senior High", label: "Senior High" }
    // Add more as needed
  ];

  const tabs = [
    { id: "school-year", label: "School Year" },
    { id: "program", label: "Program" },
    { id: "course", label: "Course" },
    { id: "section", label: "Section" },
    { id: "faculty-assignment", label: "Faculty Assignment" },
    { id: "student-assignment", label: "Student Assignment" }, // New Tab
  ];

  // Fetch School Years
  const fetchSchoolYears = async () => {
    setIsLoadingSchoolYears(true);
    setErrorSchoolYears(null);
    try {
      const response = await fetch("http://localhost:5000/schoolyears");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSchoolYearsData(data);
    } catch (error) {
      setErrorSchoolYears(error.message);
      console.error("Error fetching school years:", error);
    } finally {
      setIsLoadingSchoolYears(false);
    }
  };

  // Fetch Programs
  const fetchPrograms = async () => {
    setIsLoadingPrograms(true);
    setErrorPrograms(null);
    try {
      const response = await fetch("http://localhost:5000/programs");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProgramsData(data);
    } catch (error) {
      setErrorPrograms(error.message);
      console.error("Error fetching programs:", error);
    } finally {
      setIsLoadingPrograms(false);
    }
  };

  // Fetch Courses
  const fetchCourses = async () => {
    setIsLoadingCourses(true);
    setErrorCourses(null);
    try {
      const response = await fetch("http://localhost:5000/courses");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCoursesData(data);
    } catch (error) {
      setErrorCourses(error.message);
      console.error("Error fetching courses:", error);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // Fetch Sections
  const fetchSections = async () => {
    setIsLoadingSections(true);
    setErrorSections(null);
    try {
      const response = await fetch("http://localhost:5000/sections");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSectionsData(data);
    } catch (error) {
      setErrorSections(error.message);
      console.error("Error fetching sections:", error);
    } finally {
      setIsLoadingSections(false);
    }
  };

  // Fetch faculty list
  const fetchFaculty = async () => {
    setIsLoadingFaculty(true);
    setErrorFaculty(null);
    try {
      const response = await fetch("http://localhost:5000/users");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Only faculty
      const facultyMembers = data.filter(u => u.role === "faculty");
      setFacultyList(facultyMembers);
      // Also update faculty assignments - include those with programAssigned
      setFacultyAssignments(facultyMembers.filter(u => u.programAssigned));
    } catch (error) {
      setErrorFaculty(error.message);
      console.error("Error fetching faculty:", error);
    } finally {
      setIsLoadingFaculty(false);
    }
  };

  // Fetch all faculty assignments (faculty with programHandle or courseHandle)
  // const fetchFacultyAssignments = async () => { // unused
  //   setIsLoadingFaculty(true);
  //   setErrorFaculty(null);
  //   try {
  //     const response = await fetch("http://localhost:5000/users");
  //     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  //     const data = await response.json();
  //     setFacultyAssignments(data.filter(u => u.role === "faculty" && (u.programHandle || u.courseHandle)));
  //   } catch (error) {
  //     setErrorFaculty(error.message);
  //     console.error("Error fetching faculty assignments:", error);
  //   } finally {
  //     setIsLoadingFaculty(false);
  //   }
  // };

  // Fetch student list (role: "students")
  const fetchStudents = async () => {
    setIsLoadingStudents(true);
    setErrorStudents(null);
    try {
      const response = await fetch("http://localhost:5000/users");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Only get students who have been assigned
      setStudentList(data.filter(u => 
        u.role === "students" && 
        (u.programAssigned || u.courseAssigned || u.sectionAssigned)
      ));
    } catch (error) {
      setErrorStudents(error.message);
      console.error("Error fetching students:", error);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Filter courses by selected program
  useEffect(() => {
    if (selectedProgramId && coursesData.length > 0 && programsData.length > 0) {
      const selectedProgram = programsData.find(p => p._id === selectedProgramId);
      if (selectedProgram) {
        const filtered = coursesData.filter(c => c.programName === selectedProgram.programName);
        setFilteredCoursesForFaculty(filtered);
      }
    } else {
      setFilteredCoursesForFaculty([]);
    }
    setSelectedCourseId("");
  }, [selectedProgramId, coursesData, programsData]);

  // Effect to fetch faculty and assignments when tab is active
  useEffect(() => {
    if (activeTab === "faculty-assignment") {
      fetchFaculty();
      fetchPrograms();
      fetchCourses();
      setEditingFacultyAssignment(null); // Reset edit mode when tab becomes active
      // Reset form fields
      setSelectedFacultyId("");
      setSelectedProgramId("");
      setSelectedCourseId("");
    }
  }, [activeTab]);

  // useEffect to fetch school years when tab is active
  useEffect(() => {
    if (activeTab === "school-year") {
      fetchSchoolYears();
    } else if (activeTab === "program") {
      fetchPrograms();
    } else if (activeTab === "course") {
      fetchPrograms(); // Ensure programs are fetched for the dropdown
      fetchCourses();
    } else if (activeTab === "section") {
      fetchPrograms(); // Fetch programs for the dropdown
      fetchCourses();  // Fetch courses for the dropdown
      fetchSections(); // Fetch existing sections
    } else if (activeTab === "student-assignment") {
      fetchStudents();
      fetchPrograms();
      fetchCourses();
      fetchSections();
      setEditingStudentAssignment(null); // Reset edit mode
      setSelectedStudentId(""); setSelectedProgramIdForStudent(""); setSelectedCourseIdForStudent(""); setSelectedSectionIdForStudent("");
    }
  }, [activeTab]);

  // Effect to filter programs for Section tab dropdown when yearLevel changes
  useEffect(() => {
    if (formDataSection.yearLevel && programsData.length > 0) {
      const filtered = programsData.filter(p => p.yearLevel === formDataSection.yearLevel);
      setFilteredProgramsForSectionDropdown(filtered);
    } else {
      setFilteredProgramsForSectionDropdown([]);
    }
  }, [formDataSection.yearLevel, programsData]);

  // Effect to filter courses for Section tab dropdown when program changes
  useEffect(() => {
    if (formDataSection.program && coursesData.length > 0) {
      const selectedProgram = programsData.find(p => p._id === formDataSection.program);
      if (selectedProgram) {
        const filtered = coursesData.filter(c => c.programName === selectedProgram.programName);
        setFilteredCoursesForSectionDropdown(filtered);
      }
    } else {
      setFilteredCoursesForSectionDropdown([]);
    }
  }, [formDataSection.program, coursesData, programsData]);

  // Handle change for school year form
  const handleSchoolYearChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormDataSchoolYear((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? "active" : "inactive") : value,
    }));
  };

  // Handle edit for school year
  const handleEditSchoolYear = (sy) => {
    setIsEditingSchoolYear(true);
    setEditingSchoolYear(sy);
    setFormDataSchoolYear({
      startYear: sy.startYear,
      endYear: sy.endYear,
      status: sy.status
    });
  };

  // Handle submit for school year form
  const handleSchoolYearSubmit = async (e) => {
    e.preventDefault();
    const { startYear, endYear, status } = formDataSchoolYear;

    if (!startYear || !endYear) {
      alert("Please fill in both Start Year and End Year.");
      return;
    }
    if (isNaN(parseInt(startYear)) || isNaN(parseInt(endYear))) {
      alert("Years must be numbers.");
      return;
    }
    if (parseInt(startYear) >= parseInt(endYear)) {
      alert("End Year must be greater than Start Year.");
      return;
    }

    try {
      let response;
      if (isEditingSchoolYear && editingSchoolYear) {
        // PATCH request to update
        response = await fetch(`http://localhost:5000/schoolyears/${editingSchoolYear._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startYear: parseInt(startYear),
            endYear: parseInt(endYear),
            status
          }),
        });
      } else {
        // POST request to create
        response = await fetch("http://localhost:5000/schoolyears", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startYear: parseInt(startYear),
            endYear: parseInt(endYear),
            status
          }),
        });
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      fetchSchoolYears();
      setFormDataSchoolYear({ startYear: "", endYear: "", status: "inactive" });
      setIsEditingSchoolYear(false);
      setEditingSchoolYear(null);
      alert(isEditingSchoolYear ? "School Year updated successfully!" : "School Year added successfully!");
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error("Error saving school year:", error);
    }
  };

  // Handle change for program form
  const handleProgramChange = (e) => {
    const { name, value } = e.target;
    setFormDataProgram((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle edit for program
  const handleEditProgram = (program) => {
    setIsEditMode(true);
    setEditingProgram(program);
    setFormDataProgram({
      programName: program.programName,
      yearLevel: program.yearLevel
    });
  };

  // Handle submit for program form
  const handleProgramSubmit = async (e) => {
    e.preventDefault();
    const { programName, yearLevel } = formDataProgram;

    if (!programName.trim() || !yearLevel) {
      alert("Please enter a Program Name and select a Year Level.");
      return;
    }

    try {
      if (isEditMode && editingProgram) {
        // Update existing program
        const response = await fetch(`http://localhost:5000/programs/${editingProgram._id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            programName: programName.trim(),
            yearLevel
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const updatedProgram = await response.json();

        // Update the programs list with the edited program
        setProgramsData(prevPrograms => 
          prevPrograms.map(prog => 
            prog._id === editingProgram._id 
              ? updatedProgram
              : prog
          )
        );

        // Reset form and edit mode
        setIsEditMode(false);
        setEditingProgram(null);
        setFormDataProgram({ programName: "", yearLevel: "" });
        alert("Program updated successfully!");
      } else {
        // Create new program
        const response = await fetch("http://localhost:5000/programs", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            programName: programName.trim(),
            yearLevel
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        await fetchPrograms(); // Refresh list
        setFormDataProgram({ programName: "", yearLevel: "" }); // Clear form
        alert("Program added successfully!");
      }
    } catch (error) {
      alert(`Error ${isEditMode ? 'updating' : 'adding'} program: ${error.message}`);
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} program:`, error);
    }
  };

  // Handle edit for course
  const handleEditCourse = (course) => {
    setIsEditingCourse(true);
    setEditingCourse(course);
    setFormDataCourse({
      courseName: course.courseName,
      program: programsData.find(p => p.programName === course.programName)?._id || ""
    });
  };

  // Handle change for course form
  const handleCourseChange = (e) => {
    const { name, value } = e.target;
    setFormDataCourse((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle submit for course form
  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    const { courseName, program } = formDataCourse;

    if (!courseName.trim() || !program) {
      alert("Please enter a Course Name and select a Program.");
      return;
    }

    try {
      // Get the program name from the selected program
      const selectedProgram = programsData.find(p => p._id === program);
      if (!selectedProgram) {
        throw new Error("Selected program not found");
      }

      if (isEditingCourse && editingCourse) {
        // Update existing course
        const response = await fetch(`http://localhost:5000/courses/${editingCourse._id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            courseName: courseName.trim(),
            programName: selectedProgram.programName
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const updatedCourse = await response.json();

        // Update the courses list with the edited course
        setCoursesData(prevCourses => 
          prevCourses.map(course => 
            course._id === editingCourse._id 
              ? updatedCourse
              : course
          )
        );

        // Reset form and edit mode
        setIsEditingCourse(false);
        setEditingCourse(null);
        setFormDataCourse({ courseName: "", program: "" });
        alert("Course updated successfully!");
      } else {
        // Create new course
        const response = await fetch("http://localhost:5000/courses", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            courseName: courseName.trim(),
            programName: selectedProgram.programName
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        await fetchCourses(); // Refresh course list
        setFormDataCourse({ courseName: "", program: "" }); // Clear form
        alert("Course added successfully!");
      }
    } catch (error) {
      alert(`Error ${isEditingCourse ? 'updating' : 'adding'} course: ${error.message}`);
      console.error(`Error ${isEditingCourse ? 'updating' : 'adding'} course:`, error);
    }
  };

  // Handle change for section form
  const handleSectionChange = (e) => {
    const { name, value } = e.target;
    setFormDataSection((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle submit for section form
  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    const { sectionName, program, course } = formDataSection;

    if (!sectionName.trim() || !program) {
      alert("Please fill in Section Name and select a Program.");
      return;
    }

    try {
      // Get the program and course names from the selected IDs
      const selectedProgram = programsData.find(p => p._id === program);
      if (!selectedProgram) {
        throw new Error("Selected program not found");
      }

      // Get course name if a course is selected
      let selectedCourseName = null;
      if (course) {
        const selectedCourse = coursesData.find(c => c._id === course);
        if (selectedCourse) {
          selectedCourseName = selectedCourse.courseName;
        }
      }

      if (isEditingSection && editingSection) {
        // Update existing section
        const response = await fetch(`http://localhost:5000/sections/${editingSection._id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            sectionName: sectionName.trim(),
            programName: selectedProgram.programName,
            yearLevel: selectedProgram.yearLevel, // Use program's year level
            courseName: selectedCourseName
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const updatedSection = await response.json();

        // Update the sections list with the edited section
        setSectionsData(prevSections => 
          prevSections.map(section => 
            section._id === editingSection._id 
              ? updatedSection
              : section
          )
        );

        // Reset form and edit mode
        setIsEditingSection(false);
        setEditingSection(null);
        setFormDataSection({ sectionName: "", program: "", course: "" });
        alert("Section updated successfully!");
      } else {
        // Create new section
        const response = await fetch("http://localhost:5000/sections", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            sectionName: sectionName.trim(),
            programName: selectedProgram.programName,
            yearLevel: selectedProgram.yearLevel, // Use program's year level
            courseName: selectedCourseName
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        await fetchSections(); // Refresh section list
        setFormDataSection({ sectionName: "", program: "", course: "" }); // Clear form
        alert("Section added successfully!");
      }
    } catch (error) {
      alert(`Error ${isEditingSection ? 'updating' : 'adding'} section: ${error.message}`);
      console.error(`Error ${isEditingSection ? 'updating' : 'adding'} section:`, error);
    }
  };

  // Handle assignment form submit
  const handleAssignFaculty = async (e) => {
    e.preventDefault();
    if (!selectedFacultyId || !selectedProgramId) {
      alert("Please select a faculty member and a program.");
      return;
    }
    setIsAssigning(true);
    try {
      const facultyIdToUpdate = editingFacultyAssignment ? editingFacultyAssignment._id : selectedFacultyId;
      
      // Get the selected program and course objects
      const program = programsData.find(p => p._id === selectedProgramId);
      const course = selectedCourseId ? coursesData.find(c => c._id === selectedCourseId) : null;

      if (!program) {
        throw new Error("Selected program not found");
      }

      const payload = {
        // Handle fields for database relationships
        programHandle: selectedProgramId,
        courseHandle: selectedCourseId || null,
        
        // Assigned fields for display
        programAssigned: program.programName,
        courseAssigned: course ? course.courseName : null,
        yearLevelAssigned: program.yearLevel,
        
        // Clear section if it exists
        sectionAssigned: null,
        sectionHandle: null
      };

      const response = await fetch(`http://localhost:5000/users/${facultyIdToUpdate}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Refresh the faculty list to update the UI
      await fetchFaculty();

      setSelectedFacultyId("");
      setSelectedProgramId("");
      setSelectedCourseId("");
      setEditingFacultyAssignment(null);
      alert(editingFacultyAssignment ? "Faculty assignment updated successfully!" : "Faculty assigned successfully!");
    } catch (error) {
      alert(`Error assigning/updating faculty: ${error.message}`);
      console.error("Error assigning/updating faculty:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleEditFacultyAssignment = (assignment) => {
    setEditingFacultyAssignment(assignment);
    setSelectedFacultyId(assignment._id);
    setSelectedProgramId(assignment.programHandle || "");
    setSelectedCourseId(assignment.courseHandle || "");
  };
  
  // Effect to set course when editing after courses are filtered
  useEffect(() => {
    if (editingFacultyAssignment && selectedProgramId && filteredCoursesForFaculty.length > 0) {
      // Find the course by name instead of ID
      const currentCourse = filteredCoursesForFaculty.find(c => c.courseName === editingFacultyAssignment.courseAssigned);
      if (currentCourse) {
        setSelectedCourseId(currentCourse._id);
      } else {
        setSelectedCourseId("");
      }
    } else if (editingFacultyAssignment && selectedProgramId && coursesData.length > 0 && filteredCoursesForFaculty.length === 0) {
      setSelectedCourseId("");
    }
  }, [editingFacultyAssignment, filteredCoursesForFaculty, selectedProgramId, coursesData]);


  const handleRemoveFacultyAssignment = async (facultyUser) => {
    if (!facultyUser || !facultyUser._id) {
        alert("Invalid faculty data for removal.");
        return;
    }
    if (window.confirm(`Are you sure you want to unassign ${facultyUser.lastname}, ${facultyUser.firstname} from their current program and course?`)) {
      setIsAssigning(true);
      try {
        const payload = {
          // Clear handle fields
          programHandle: null,
          courseHandle: null,
          sectionHandle: null,
          
          // Clear assigned fields
          programAssigned: null,
          courseAssigned: null,
          sectionAssigned: null,
          yearLevelAssigned: null
        };

        const response = await fetch(`http://localhost:5000/users/${facultyUser._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        // Refresh the list
        await fetchFaculty();

        // Reset form if we were editing this faculty
        if (editingFacultyAssignment && editingFacultyAssignment._id === facultyUser._id) {
          setSelectedFacultyId("");
          setSelectedProgramId("");
          setSelectedCourseId("");
          setEditingFacultyAssignment(null);
        }

        alert("Faculty assignment removed successfully!");
      } catch (error) {
        alert(`Error removing faculty assignment: ${error.message}`);
        console.error("Error removing faculty assignment:", error);
      } finally {
        setIsAssigning(false);
      }
    }
  };

  const cancelEditFacultyAssignment = () => {
    setEditingFacultyAssignment(null);
    setSelectedFacultyId("");
    setSelectedProgramId("");
    setSelectedCourseId("");
  };

  // Student Assignment Handlers
  const handleStudentAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedProgramIdForStudent) {
      alert("Please select a student and a program.");
      return;
    }
    setIsAssigningStudent(true);
    try {
      const studentIdToUpdate = editingStudentAssignment ? editingStudentAssignment._id : selectedStudentId;
      
      // Get the selected program, course, and section objects
      const program = programsData.find(p => p._id === selectedProgramIdForStudent);
      const course = selectedCourseIdForStudent ? 
        coursesData.find(c => c._id === selectedCourseIdForStudent) : null;
      const section = selectedSectionIdForStudent ?
        sectionsData.find(s => s._id === selectedSectionIdForStudent) : null;

      const payload = {
        programHandle: selectedProgramIdForStudent,
        courseHandle: selectedCourseIdForStudent || null,
        sectionHandle: selectedSectionIdForStudent || null,
        // Add the assigned fields
        programAssigned: program ? program.programName : null,
        courseAssigned: course ? course.courseName : null,
        sectionAssigned: section ? section.sectionName : null,
        yearLevelAssigned: program ? program.yearLevel : null
      };

      const response = await fetch(`http://localhost:5000/users/${studentIdToUpdate}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error((await response.json()).message || "Failed to assign student");
      
      fetchStudents(); // Refresh list
      setSelectedStudentId("");
      setSelectedProgramIdForStudent("");
      setSelectedCourseIdForStudent("");
      setSelectedSectionIdForStudent("");
      setEditingStudentAssignment(null);
      setStudentSearchTerm("");
      setProgramSearchTerm("");
      setCourseSearchTerm("");
      setSectionSearchTerm("");
      alert(editingStudentAssignment ? "Student assignment updated!" : "Student assigned successfully!");
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsAssigningStudent(false);
    }
  };

  const handleEditStudentAssignment = (student) => {
    setEditingStudentAssignment(student);
    setSelectedStudentId(student._id);
    setSelectedProgramIdForStudent(student.programHandle ? student.programHandle.toString() : "");
    setSelectedCourseIdForStudent(student.courseHandle ? student.courseHandle.toString() : "");
    setSelectedSectionIdForStudent(student.sectionHandle ? student.sectionHandle.toString() : "");
  };

  const handleRemoveStudentAssignment = async (student) => {
    if (!student || !student._id) return;
    if (window.confirm(`Are you sure you want to unassign ${student.lastname}, ${student.firstname} from their current program, course, and section?`)) {
      setIsAssigningStudent(true);
      try {
        const response = await fetch(`http://localhost:5000/users/${student._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programHandle: null, courseHandle: null, sectionHandle: null }),
        });
        if (!response.ok) throw new Error((await response.json()).message || "Failed to remove assignment");
        fetchStudents(); // Refresh list
        if (editingStudentAssignment && editingStudentAssignment._id === student._id) {
            cancelEditStudentAssignment();
        }
        alert("Student assignment removed (unassigned). Successfully!");
      } catch (error) { alert(`Error: ${error.message}`); }
      finally { setIsAssigningStudent(false); }
    }
  };

  const cancelEditStudentAssignment = () => {
    setEditingStudentAssignment(null);
    setSelectedStudentId("");
    setSelectedProgramIdForStudent("");
    setSelectedCourseIdForStudent("");
    setSelectedSectionIdForStudent("");
  };

  // Effect to filter courses for student assignment when program changes
  useEffect(() => {
    if (selectedProgramIdForStudent && coursesData.length > 0) {
      setFilteredCoursesForStudent(coursesData.filter(c => c.program && c.program._id === selectedProgramIdForStudent));
    } else {
      setFilteredCoursesForStudent([]);
    }
    setSelectedCourseIdForStudent(""); // Reset course selection when program changes
  }, [selectedProgramIdForStudent, coursesData]);

  // Effect to filter sections for student assignment when program changes
  useEffect(() => {
    if (selectedProgramIdForStudent && sectionsData.length > 0) {
      const program = programsData.find(p => p._id === selectedProgramIdForStudent);
      if (program) {
        setFilteredSectionsForStudent(sectionsData.filter(s => 
          s.program && s.program._id === selectedProgramIdForStudent && 
          s.yearLevel === program.yearLevel
        ));
      }
    } else {
      setFilteredSectionsForStudent([]);
    }
    setSelectedSectionIdForStudent(""); // Reset section selection when program changes
  }, [selectedProgramIdForStudent, sectionsData, programsData]);

  // Effect to filter sections further when course is selected
  useEffect(() => {
    if (selectedCourseIdForStudent && filteredSectionsForStudent.length > 0) {
      setFilteredSectionsForStudent(prev => 
        prev.filter(s => !s.course || s.course._id === selectedCourseIdForStudent)
      );
    }
  }, [selectedCourseIdForStudent]);

  // Add new state for modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  // eslint-disable-next-line
  // const [selectedFile, setSelectedFile] = useState(null); // unused

  // Modify the preview data processing in handleBatchUpload
  const handleBatchUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!xlsxLoaded) {
      alert('Excel processing library is not loaded yet. Please try again in a few seconds.');
      return;
    }

    if (xlsxError) {
      alert('Failed to load Excel processing library. Please refresh the page and try again.');
      return;
    }

    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (!validTypes.includes(file.type)) {
      alert('Please upload an Excel file (.xlsx, .xls) or CSV file');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = window.XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = window.XLSX.utils.sheet_to_json(worksheet);

        // Process data for preview with enhanced validation
        const preview = await Promise.all(json.map(async row => {
          const studentID = row.StudentID?.toString();
          const programID = row.ProgramID?.toString();
          const courseID = row.CourseID?.toString();
          const sectionID = row.SectionID?.toString();

          const student = allStudents.find(s => s.userID === studentID);
          const program = programsData.find(p => p._id === programID);
          const course = courseID ? coursesData.find(c => c._id === courseID) : null;
          const section = sectionID ? sectionsData.find(s => s._id === sectionID) : null;

          // Validation checks
          const validationErrors = [];

          // Check if student exists
          if (!student) {
            validationErrors.push('Student not found');
          } else {
            // Check if student is already assigned
            const existingAssignment = studentList.find(s => s._id === student._id);
            if (existingAssignment) {
              validationErrors.push(`Student is already assigned to Program: "${existingAssignment.programAssigned || 'N/A'}", ` +
                `Course: "${existingAssignment.courseAssigned || 'N/A'}", ` +
                `Section: "${existingAssignment.sectionAssigned || 'N/A'}"`);
            }
          }

          // Check if program exists
          if (!program) {
            validationErrors.push('Program not found');
          }

          // If course is specified, validate program-course relationship
          if (courseID) {
            if (!course) {
              validationErrors.push('Course not found');
            } else if (course.programName !== program?.programName) {
              validationErrors.push(`Course "${course.courseName}" does not belong to program "${program?.programName}"`);
            }
          }

          // If section is specified, validate all relationships
          if (sectionID) {
            if (!section) {
              validationErrors.push('Section not found');
            } else {
              // Check section-program relationship
              if (section.programName !== program?.programName) {
                validationErrors.push(`Section "${section.sectionName}" does not belong to program "${program?.programName}"`);
              }

              // Check section-course relationship if course is specified
              if (courseID && course && section.courseName !== course.courseName) {
                validationErrors.push(`Section "${section.sectionName}" does not belong to course "${course.courseName}"`);
              }

              // Check year level match
              if (program && section.yearLevel !== program.yearLevel) {
                validationErrors.push(`Section year level "${section.yearLevel}" does not match program year level "${program.yearLevel}"`);
              }
            }
          }

          return {
            studentID,
            studentName: student ? `${student.lastname}, ${student.firstname}` : 'Not found',
            programName: program ? program.programName : 'Not found',
            courseName: course ? course.courseName : 'N/A',
            sectionName: section ? section.sectionName : 'N/A',
            isValid: validationErrors.length === 0,
            validationErrors,
            student,
            program,
            course,
            section
          };
        }));

        setPreviewData(preview);
        setShowPreviewModal(true);
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file. Please check the format and try again.');
      }
    };

    reader.onerror = () => {
      alert("Error reading file. Please try again.");
    };

    reader.readAsBinaryString(file);
  };

  // Add function to process assignments after confirmation
  const processAssignments = async () => {
    setIsBatchUploading(true);
    setBatchUploadMessage("Processing batch upload...");
    let successCount = 0;
    let errorCount = 0;
    let errors = [];

    try {
      for (const item of previewData) {
        if (!item.isValid) {
          errorCount++;
          errors.push(`Invalid data for student ${item.studentID}`);
          continue;
        }

        try {
          const payload = {
            programHandle: item.program._id,
            programAssigned: item.program.programName,
            yearLevelAssigned: item.program.yearLevel,
            courseHandle: item.course?._id || null,
            courseAssigned: item.course?.courseName || null,
            sectionHandle: item.section?._id || null,
            sectionAssigned: item.section?.sectionName || null
          };

          const response = await fetch(`http://localhost:5000/users/${item.student._id}`, {
            method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error((await response.json()).message || 'Failed to update student');
          }

          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Error assigning ${item.studentName}: ${error.message}`);
        }
      }

      // Refresh the student list
      fetchStudents();
      
      // Show results
      const resultMessage = `Processed ${successCount + errorCount} students:\n` +
        `${successCount} successful\n` +
        `${errorCount} failed\n\n` +
        (errors.length > 0 ? `Errors:\n${errors.join('\n')}` : '');
      
      setBatchUploadMessage(resultMessage);
      
      if (errors.length > 0) {
        console.error('Batch upload errors:', errors);
      }
    } catch (error) {
      console.error('Error processing assignments:', error);
      setBatchUploadMessage(`Error: ${error.message}`);
    } finally {
      setIsBatchUploading(false);
      setShowPreviewModal(false);
      setSelectedFile(null);
    }
  };

  // Update the PreviewModal component to show validation status
  const PreviewModal = () => {
    if (!showPreviewModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[80vh] flex flex-col">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Preview Student Assignments</h3>
            <p className="text-sm text-gray-600 mt-1">
              Review the assignments before confirming. Invalid entries are highlighted in red.
            </p>
          </div>
          
          <div className="overflow-auto flex-grow p-4">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Student ID</th>
                  <th className="p-2 border">Student Name</th>
                  <th className="p-2 border">Program</th>
                  <th className="p-2 border">Course</th>
                  <th className="p-2 border">Section</th>
                  <th className="p-2 border">Validation Messages</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((item, index) => (
                  <tr key={index} className={!item.isValid ? 'bg-red-50' : ''}>
                    <td className="p-2 border text-center">
                      {item.isValid ? 
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Valid
                        </span> : 
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Invalid
                        </span>
                      }
                    </td>
                    <td className="p-2 border">{item.studentID}</td>
                    <td className="p-2 border">{item.studentName}</td>
                    <td className="p-2 border">{item.programName}</td>
                    <td className="p-2 border">{item.courseName}</td>
                    <td className="p-2 border">{item.sectionName}</td>
                    <td className="p-2 border">
                      {item.validationErrors && item.validationErrors.length > 0 ? (
                        <ul className="list-disc list-inside text-red-600 text-sm">
                          {item.validationErrors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-green-600 text-sm">All validations passed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Valid entries: {previewData.filter(item => item.isValid).length} of {previewData.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={processAssignments}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!previewData.some(item => item.isValid)}
              >
                Confirm Valid Assignments ({previewData.filter(item => item.isValid).length})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add new state for template data
  const [allStudents, setAllStudents] = useState([]);

  // Add function to fetch all students for template
  const fetchAllStudents = async () => {
    try {
      const response = await fetch("http://localhost:5000/users");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Get all students regardless of assignment status
      setAllStudents(data.filter(u => u.role === "students"));
    } catch (error) {
      console.error("Error fetching all students:", error);
    }
  };

  // Add useEffect to fetch all students when needed for template
  useEffect(() => {
    if (activeTab === "student-assignment") {
      fetchAllStudents();
    }
  }, [activeTab]);

  // Update template download function
  const downloadExcelTemplate = () => {
    // Create a new workbook
    const wb = window.XLSX.utils.book_new();

    // 1. Main Template Sheet
    const template = [
      {
        StudentID: "S625", // Example from your data
        ProgramID: "683aedc794087f03674de1f8", // Allied Health
        CourseID: "683aedf794087f03674de204", // Bachelor of Science in Medical Technology
        SectionID: "683af1fe0899339c13d89191" // MED233
      }
    ];

    const ws_template = window.XLSX.utils.json_to_sheet(template);

    // Add column descriptions in the second row
    const descriptions = {
      A2: { v: "User ID of the student (see Students sheet)" },
      B2: { v: "Program ObjectId (see Programs sheet)" },
      C2: { v: "Course ObjectId (see Courses sheet)" },
      D2: { v: "Section ObjectId (see Sections sheet)" }
    };
    
    // Merge the descriptions into the worksheet
    Object.keys(descriptions).forEach(key => {
      if (!ws_template[key]) ws_template[key] = descriptions[key];
    });

    // 2. Students Reference Sheet
    const students = allStudents.map(student => ({
      UserID: student.userID || '',
      FirstName: student.firstname || '',
      LastName: student.lastname || '',
      StudentID: student._id || ''
    }));

    // Sort students by LastName, then FirstName
    students.sort((a, b) => {
      if (a.LastName === b.LastName) {
        return a.FirstName.localeCompare(b.FirstName);
      }
      return a.LastName.localeCompare(b.LastName);
    });

    const ws_students = window.XLSX.utils.json_to_sheet(students);

    // 3. Programs Reference Sheet
    const programs = programsData.map(program => ({
      ProgramID: program._id,
      ProgramName: program.programName,
      YearLevel: program.yearLevel
    }));
    const ws_programs = window.XLSX.utils.json_to_sheet(programs);

    // 4. Courses Reference Sheet with proper program name reference
    const courses = coursesData.map(course => {
      const program = programsData.find(p => p.programName === course.programName);
      return {
        CourseID: course._id,
        CourseName: course.courseName,
        ProgramName: course.programName || 'N/A',
        ProgramID: program ? program._id : 'N/A'
      };
    });
    const ws_courses = window.XLSX.utils.json_to_sheet(courses);

    // 5. Sections Reference Sheet with proper references
    const sections = sectionsData.map(section => {
      const program = programsData.find(p => p.programName === section.programName);
      const course = coursesData.find(c => c.courseName === section.courseName);
      return {
        SectionID: section._id,
        SectionName: section.sectionName,
        ProgramName: section.programName || 'N/A',
        ProgramID: program ? program._id : 'N/A',
        CourseName: section.courseName || 'N/A',
        CourseID: course ? course._id : 'N/A',
        YearLevel: section.yearLevel
      };
    });
    const ws_sections = window.XLSX.utils.json_to_sheet(sections);

    // Add all worksheets to the workbook
    window.XLSX.utils.book_append_sheet(wb, ws_template, "Template");
    window.XLSX.utils.book_append_sheet(wb, ws_students, "Students");
    window.XLSX.utils.book_append_sheet(wb, ws_programs, "Programs");
    window.XLSX.utils.book_append_sheet(wb, ws_courses, "Courses");
    window.XLSX.utils.book_append_sheet(wb, ws_sections, "Sections");

    // Auto-size columns for all sheets
    const sheets = ['Template', 'Students', 'Programs', 'Courses', 'Sections'];
    sheets.forEach(sheet => {
      const ws = wb.Sheets[sheet];
      const range = window.XLSX.utils.decode_range(ws['!ref']);
      const cols = [];
      for(let C = range.s.c; C <= range.e.c; ++C) {
        let max_width = 10;
        for(let R = range.s.r; R <= range.e.r; ++R) {
          const cell_address = {c:C, r:R};
          const cell_ref = window.XLSX.utils.encode_cell(cell_address);
          if(!ws[cell_ref]) continue;
          const cell_value = ws[cell_ref].v;
          const text_length = cell_value ? cell_value.toString().length : 0;
          if(text_length > max_width) max_width = text_length;
        }
        cols[C] = { wch: max_width + 2 }; // Add padding
      }
      ws['!cols'] = cols;
    });

    // Save the file
    window.XLSX.writeFile(wb, "student_assignment_template.xlsx");
  };

  // Add delete handlers for each submodule
  const handleDeleteSchoolYear = async (schoolYear) => {
    // Check if school year is active
    if (schoolYear.status === "active") {
      alert("Cannot delete an active school year. Please set it to inactive first.");
      return;
    }

    // Confirmation dialog
    if (!window.confirm(`Are you sure you want to delete school year ${schoolYear.startYear}-${schoolYear.endYear}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/schoolyears/${schoolYear._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      await fetchSchoolYears(); // Refresh list
      alert("School year deleted successfully!");
    } catch (error) {
      alert(`Error deleting school year: ${error.message}`);
      console.error("Error deleting school year:", error);
    }
  };

  const handleDeleteProgram = async (program) => {
    try {
      // Confirmation dialog
      if (!window.confirm(`Are you sure you want to delete program "${program.programName}"?`)) {
        return;
      }

      const response = await fetch(`http://localhost:5000/programs/${program._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      await fetchPrograms(); // Refresh list
      alert("Program deleted successfully!");
    } catch (error) {
      alert(`Error deleting program: ${error.message}`);
      console.error("Error deleting program:", error);
    }
  };

  const handleDeleteCourse = async (course) => {
    try {
      // Confirmation dialog
      if (!window.confirm(`Are you sure you want to delete course "${course.courseName}"?`)) {
        return;
      }

      const response = await fetch(`http://localhost:5000/courses/${course._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      await fetchCourses(); // Refresh list
      alert("Course deleted successfully!");
    } catch (error) {
      alert(`Error deleting course: ${error.message}`);
      console.error("Error deleting course:", error);
    }
  };

  const handleDeleteSection = async (section) => {
    try {
      // Confirmation dialog
      if (!window.confirm(`Are you sure you want to delete section "${section.sectionName}"?`)) {
        return;
      }

      const response = await fetch(`http://localhost:5000/sections/${section._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      await fetchSections(); // Refresh list
      alert("Section deleted successfully!");
    } catch (error) {
      alert(`Error deleting section: ${error.message}`);
      console.error("Error deleting section:", error);
    }
  };

  // Handle edit for section
  const handleEditSection = async (section) => {
    setIsEditingSection(true);
    setEditingSection(section);

    // First set the section name
    setFormDataSection({
      sectionName: section.sectionName,
      program: "",
      course: ""
    });

    // Wait for the next render cycle
    await new Promise(resolve => setTimeout(resolve, 0));

    // Then set program and course
    const program = programsData.find(p => p.programName === section.programName);
    if (program) {
      setFormDataSection(prev => ({
        ...prev,
        program: program._id
      }));

      // Wait for programs to be filtered
      await new Promise(resolve => setTimeout(resolve, 0));

      // Finally set the course
      const course = coursesData.find(c => c.courseName === section.courseName);
      if (course) {
        setFormDataSection(prev => ({
          ...prev,
          course: course._id
        }));
      }
    }
  };

  // Effect to filter courses for Section tab dropdown when program changes
  useEffect(() => {
    if (formDataSection.program && coursesData.length > 0) {
      const selectedProgram = programsData.find(p => p._id === formDataSection.program);
      if (selectedProgram) {
        const filtered = coursesData.filter(c => c.programName === selectedProgram.programName);
        setFilteredCoursesForSectionDropdown(filtered);
      }
    } else {
      setFilteredCoursesForSectionDropdown([]);
    }
  }, [formDataSection.program, coursesData, programsData]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Admin_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Academic Settings</h2>
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

        {/* Tabs */}
        <ul className="flex flex-wrap border-b border-gray-700 text-xl sm:text-2xl font-medium text-gray-400">
          {tabs.map((tab) => (
            <li
              key={tab.id}
              className={`me-4 cursor-pointer py-2 px-4 ${activeTab === tab.id
                  ? "text-black border-b-4 border-blue-500"
                  : "hover:text-gray-600"
                }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </li>
          ))}
        </ul>

        {/* Content */}
        <div className="mt-6">
          {activeTab === "school-year" && (
            <div>
              {/* Form adapted from Admin_Accounts.jsx */}
              <div className="bg-white p-6 rounded-xl shadow mb-10">
                <h3 className="text-xl font-semibold mb-4">New School Year</h3>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSchoolYearSubmit}>
                  <div>
                    <label htmlFor="startYear" className="block text-sm font-medium text-gray-700 mb-1">
                      Start Year
                    </label>
                    <input
                      type="text"
                      name="startYear"
                      id="startYear"
                      value={formDataSchoolYear.startYear}
                      onChange={handleSchoolYearChange}
                      placeholder="e.g., 2023"
                      className="border rounded p-2 w-full"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="endYear" className="block text-sm font-medium text-gray-700 mb-1">
                      End Year
                    </label>
                    <input
                      type="text"
                      name="endYear"
                      id="endYear"
                      value={formDataSchoolYear.endYear}
                      onChange={handleSchoolYearChange}
                      placeholder="e.g., 2024"
                      className="border rounded p-2 w-full"
                      required
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 flex justify-between items-center mt-2">
                    <div className="flex items-center">
                      <input
                        id="set-active"
                        name="status" // Changed from isActive
                        type="checkbox"
                        checked={formDataSchoolYear.status === "active"}
                        onChange={handleSchoolYearChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="set-active" className="ml-2 block text-sm text-gray-900">
                        Set Active
                      </label>
                    </div>
                    <div className="flex gap-2">
                      {isEditingSchoolYear && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingSchoolYear(false);
                            setEditingSchoolYear(null);
                            setFormDataSchoolYear({ startYear: "", endYear: "", status: "inactive" });
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                        >
                          Cancel Edit
                        </button>
                      )}
                      <button
                        type="submit"
                        className="bg-[#00418b] hover:bg-[#002b5c] text-white px-4 py-2 rounded"
                      >
                        {isEditingSchoolYear ? 'Save School Year' : '+ Add'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Table adapted from Admin_Accounts.jsx */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-2">School Years</h4>
                {isLoadingSchoolYears && <p>Loading school years...</p>}
                {errorSchoolYears && <p className="text-red-500">Error: {errorSchoolYears}</p>}
                {!isLoadingSchoolYears && !errorSchoolYears && (
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Start Year</th>
                        <th className="p-3 border">End Year</th>
                        <th className="p-3 border">Status</th>
                        <th className="p-3 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schoolYearsData.length > 0 ? (
                        schoolYearsData.map((sy) => (
                          <tr key={sy._id}>
                            <td className="p-3 border">{sy.startYear}</td>
                            <td className="p-3 border">{sy.endYear}</td>
                            <td className="p-3 border">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                sy.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {sy.status === "active" ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button
                                  onClick={() => handleEditSchoolYear(sy)}
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSchoolYear(sy)}
                                  className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded"
                                >
                                  <img src={archiveIcon} alt="Archive" className="w-8 h-8 inline-block" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center p-4 text-gray-500">
                            No school years found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {activeTab === "program" && (
            <div>
              {/* Form for Add New Program */}
              <div className="bg-white p-6 rounded-xl shadow mb-10">
                <h3 className="text-xl font-semibold mb-4">{isEditMode ? 'Edit Program' : 'Add New Program'}</h3>
                <form onSubmit={handleProgramSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="programName" className="block text-sm font-medium text-gray-700 mb-1">
                        Program Name
                      </label>
                      <input
                        type="text"
                        name="programName"
                        id="programName"
                        value={formDataProgram.programName}
                        onChange={handleProgramChange}
                        placeholder="Enter Program Name"
                        className="border rounded p-2 w-full"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="programYearLevel" className="block text-sm font-medium text-gray-700 mb-1">
                        Year Level (Program)
                      </label>
                      <select
                        name="yearLevel"
                        id="programYearLevel"
                        value={formDataProgram.yearLevel}
                        onChange={handleProgramChange}
                        className="border rounded p-2 w-full h-[42px]"
                        required
                      >
                        <option value="">Select Year Level</option>
                        {yearLevelOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 gap-2">
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditMode(false);
                          setEditingProgram(null);
                          setFormDataProgram({ programName: "", yearLevel: "" });
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-[#00418b] hover:bg-[#002b5c] text-white px-4 py-2 rounded"
                    >
                      {isEditMode ? 'Save Program' : '+ Add Program'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Table for Programs */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-2">Programs</h4>
                {isLoadingPrograms && <p>Loading programs...</p>}
                {errorPrograms && <p className="text-red-500">Error: {errorPrograms}</p>}
                {!isLoadingPrograms && !errorPrograms && (
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Program Name</th>
                        <th className="p-3 border">Year Level</th>
                        <th className="p-3 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programsData.length > 0 ? (
                        programsData.map((program) => (
                          <tr key={program._id}>
                            <td className="p-3 border">{program.programName}</td>
                            <td className="p-3 border">{program.yearLevel}</td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button
                                  onClick={() => handleEditProgram(program)}
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProgram(program)}
                                  className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded"
                                >
                                  <img src={archiveIcon} alt="Archive" className="w-8 h-8 inline-block" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="text-center p-4 text-gray-500">
                            No programs found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {activeTab === "course" && (
            <div>
              {/* Form for Add New Course */}
              <div className="bg-white p-6 rounded-xl shadow mb-10">
                <h3 className="text-xl font-semibold mb-4">{isEditingCourse ? 'Edit Course' : 'Add New Course'}</h3>
                <form onSubmit={handleCourseSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="courseName" className="block text-sm font-medium text-gray-700 mb-1">
                        Course Name
                      </label>
                      <input
                        type="text"
                        name="courseName"
                        id="courseName"
                        value={formDataCourse.courseName}
                        onChange={handleCourseChange}
                        placeholder="Enter Course Name"
                        className="border rounded p-2 w-full"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="courseProgram" className="block text-sm font-medium text-gray-700 mb-1">
                        Program Name
                      </label>
                      <select
                        name="program"
                        id="courseProgram"
                        value={formDataCourse.program}
                        onChange={handleCourseChange}
                        className="border rounded p-2 w-full h-[42px]"
                        required
                      >
                        <option value="">Select Program</option>
                        {programsData.length > 0 ? (
                          programsData.map((prog) => (
                            <option key={prog._id} value={prog._id}>
                              {prog.programName}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            Loading programs... or No programs available
                          </option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 gap-2">
                    {isEditingCourse && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingCourse(false);
                          setEditingCourse(null);
                          setFormDataCourse({ courseName: "", program: "" });
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-[#00418b] hover:bg-[#002b5c] text-white px-4 py-2 rounded"
                    >
                      {isEditingCourse ? 'Save Course' : '+ Add Course'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Table for Courses */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-2">Course List</h4>
                {isLoadingCourses && <p>Loading courses...</p>}
                {errorCourses && <p className="text-red-500">Error: {errorCourses}</p>}
                {!isLoadingCourses && !errorCourses && (
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Course Name</th>
                        <th className="p-3 border">Program Name</th>
                        <th className="p-3 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coursesData.length > 0 ? (
                        coursesData.map((course) => (
                          <tr key={course._id}>
                            <td className="p-3 border">{course.courseName}</td>
                            <td className="p-3 border">{course.programName}</td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button
                                  onClick={() => handleEditCourse(course)}
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCourse(course)}
                                  className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded"
                                >
                                  <img src={archiveIcon} alt="Archive" className="w-8 h-8 inline-block" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="text-center p-4 text-gray-500">
                            No courses found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {activeTab === "section" && (
            <div>
              {/* Form for Add New Section */}
              <div className="bg-white p-6 rounded-xl shadow mb-10">
                <h3 className="text-xl font-semibold mb-4">{isEditingSection ? 'Edit Section' : 'Add New Section'}</h3>
                <form onSubmit={handleSectionSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="sectionName" className="block text-sm font-medium text-gray-700 mb-1">
                        Section Name
                      </label>
                      <input
                        type="text"
                        name="sectionName"
                        id="sectionName"
                        value={formDataSection.sectionName}
                        onChange={handleSectionChange}
                        placeholder="Enter Section Name"
                        className="border rounded p-2 w-full h-[42px]"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="sectionProgram" className="block text-sm font-medium text-gray-700 mb-1">
                        Program
                      </label>
                      <select
                        name="program"
                        id="sectionProgram"
                        value={formDataSection.program}
                        onChange={handleSectionChange}
                        className="border rounded p-2 w-full h-[42px]"
                        required
                      >
                        <option value="">Select Program</option>
                        {programsData.map((prog) => (
                          <option key={prog._id} value={prog._id}>
                            {prog.programName} ({prog.yearLevel})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="sectionCourse" className="block text-sm font-medium text-gray-700 mb-1">
                        Course
                      </label>
                      <select
                        name="course"
                        id="sectionCourse"
                        value={formDataSection.course}
                        onChange={handleSectionChange}
                        className="border rounded p-2 w-full h-[42px]"
                        disabled={!formDataSection.program}
                      >
                        <option value="">Select Course (Optional)</option>
                        {filteredCoursesForSectionDropdown.length > 0 ? (
                          filteredCoursesForSectionDropdown.map((crs) => (
                            <option key={crs._id} value={crs._id}>
                              {crs.courseName}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            {formDataSection.program ? "No courses for this program" : "Select program first"}
                          </option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4 gap-2">
                    {isEditingSection && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingSection(false);
                          setEditingSection(null);
                          setFormDataSection({ sectionName: "", program: "", course: "" });
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-[#00418b] hover:bg-[#002b5c] text-white px-4 py-2 rounded"
                    >
                      {isEditingSection ? 'Save Section' : '+ Add Section'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Table for Sections */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-2">Section List</h4>
                {isLoadingSections && <p>Loading sections...</p>}
                {errorSections && <p className="text-red-500">Error: {errorSections}</p>}
                {!isLoadingSections && !errorSections && (
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Section Name</th>
                        <th className="p-3 border">Program</th>
                        <th className="p-3 border">Year Level</th>
                        <th className="p-3 border">Course</th>
                        <th className="p-3 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionsData.length > 0 ? (
                        sectionsData.map((section) => (
                          <tr key={section._id}>
                            <td className="p-3 border">{section.sectionName}</td>
                            <td className="p-3 border">{section.programName}</td>
                            <td className="p-3 border">{section.yearLevel}</td>
                            <td className="p-3 border">{section.courseName || 'N/A'}</td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button
                                  onClick={() => handleEditSection(section)}
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSection(section)}
                                  className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded"
                                >
                                  <img src={archiveIcon} alt="Archive" className="w-8 h-8 inline-block" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center p-4 text-gray-500">
                            No sections found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {activeTab === "faculty-assignment" && (
            <div>
              {/* Form for Assign Faculty */}
              <div className="bg-white p-6 rounded-xl shadow mb-10">
                <h3 className="text-xl font-semibold mb-4">
                  {editingFacultyAssignment ? "Edit Faculty Assignment" : "Assign Faculty"}
                </h3>
                <form onSubmit={handleAssignFaculty}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="selectFaculty" className="block text-sm font-medium text-gray-700 mb-1">
                        Select Faculty Member
                      </label>
                      <select
                        name="selectFaculty"
                        id="selectFaculty"
                        value={selectedFacultyId}
                        onChange={e => setSelectedFacultyId(e.target.value)}
                        className="border rounded p-2 w-full h-[42px]"
                        required
                        disabled={!!editingFacultyAssignment} // Disable if editing, faculty is fixed
                      >
                        <option value="">Select Faculty</option>
                        {isLoadingFaculty && facultyList.length === 0 ? (
                          <option disabled>Loading...</option>
                        ) : (
                          facultyList.map(fac => (
                            <option key={fac._id} value={fac._id}>
                              {(fac.lastname || fac.firstname)
                                ? `${fac.lastname || ''}${fac.lastname && fac.firstname ? ', ' : ''}${fac.firstname || ''}`
                                : 'No Name'}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="assignProgram" className="block text-sm font-medium text-gray-700 mb-1">
                        Assign Program
                      </label>
                      <select
                        name="assignProgram"
                        id="assignProgram"
                        value={selectedProgramId}
                        onChange={e => setSelectedProgramId(e.target.value)}
                        className="border rounded p-2 w-full h-[42px]"
                        required
                      >
                        <option value="">Select Program</option>
                        {programsData.map(prog => (
                          <option key={prog._id} value={prog._id}>{prog.programName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="assignCourse" className="block text-sm font-medium text-gray-700 mb-1">
                        Assign Course (based on Program)
                      </label>
                      <select
                        name="assignCourse"
                        id="assignCourse"
                        value={selectedCourseId}
                        onChange={e => setSelectedCourseId(e.target.value)}
                        className="border rounded p-2 w-full h-[42px]"
                        disabled={!selectedProgramId}
                      >
                        <option value="">Select Course (Optional)</option>
                        {filteredCoursesForFaculty.map(crs => (
                          <option key={crs._id} value={crs._id}>{crs.courseName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-span-1 md:col-span-3 flex justify-between items-center mt-4">
                    <div className="flex items-center">
                      <input
                        id="allowAccess"
                        name="allowAccess"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled
                      />
                      <label htmlFor="allowAccess" className="ml-2 block text-sm text-gray-900">
                        Allow access to students under this course
                      </label>
                    </div>
                    <div>
                      {editingFacultyAssignment && (
                        <button
                          type="button"
                          onClick={cancelEditFacultyAssignment}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded mr-2"
                          disabled={isAssigning}
                        >
                          Cancel Edit
                        </button>
                      )}
                    <button
                      type="submit"
                      className="bg-[#00418b] hover:bg-[#002b5c] text-white px-4 py-2 rounded"
                        disabled={isAssigning || !selectedFacultyId || !selectedProgramId}
                    >
                        {isAssigning ? "Saving..." : (editingFacultyAssignment ? "Update Assignment" : "+ Assign Faculty")}
                    </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Table for Faculty Assignments */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-2">Faculty Assignments</h4>
                {isLoadingFaculty && <p>Loading assignments...</p>}
                {errorFaculty && <p className="text-red-500">Error: {errorFaculty}</p>}
                {!isLoadingFaculty && !errorFaculty && (
                <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Faculty Name</th>
                      <th className="p-3 border">Program</th>
                        <th className="p-3 border">Course</th>
                      <th className="p-3 border">Year Level</th>
                        <th className="p-3 border">Actions</th> {/* New Actions Column */}
                    </tr>
                  </thead>
                  <tbody>
                      {facultyAssignments.length > 0 ? (
                        facultyAssignments.map(fac => {
                          return (
                            <tr key={fac._id}>
                              <td className="p-3 border">
                                {(fac.lastname || fac.firstname)
                                  ? `${fac.lastname || ''}${fac.lastname && fac.firstname ? ', ' : ''}${fac.firstname || ''}`
                                  : 'No Name'}
                              </td>
                              <td className="p-3 border">{fac.programAssigned || 'N/A'}</td>
                              <td className="p-3 border">{fac.courseAssigned || 'N/A'}</td>
                              <td className="p-3 border">{fac.yearLevelAssigned || 'N/A'}</td>
                              <td className="p-3 border">
                                <div className="inline-flex space-x-2">
                                  <button
                                    onClick={() => handleEditFacultyAssignment(fac)}
                                    className="bg-yellow-400 hover:bg-yellow-500 text-white p-1 rounded text-xs"
                                    title="Edit Assignment"
                                  >
                                    <img src={editIcon} alt="Edit" className="w-5 h-5 inline-block" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveFacultyAssignment(fac)}
                                    className="bg-red-500 hover:bg-red-700 text-white p-1 rounded text-xs"
                                    title="Remove Assignment"
                                  >
                                    <img src={archiveIcon} alt="Remove" className="w-5 h-5 inline-block" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center p-4 text-gray-500">
                            No faculty assignments found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {activeTab === "student-assignment" && (
            <div>
              {/* Form for Assign Student */}
              <div className="bg-white p-6 rounded-xl shadow mb-10">
                <h3 className="text-xl font-semibold mb-4">
                    {editingStudentAssignment ? "Edit Student Assignment" : "Assign Student"}
                </h3>

                {/* Add Batch Upload Section */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-lg font-medium mb-2">Batch Upload Students</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Upload an Excel file (.xlsx, .xls) or CSV file with the following columns: StudentID, ProgramID, CourseID, SectionID 
                  </p>
                  <div className="mb-4">
                    <button
                      onClick={downloadExcelTemplate}
                      disabled={!xlsxLoaded}
                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      Download Excel Template
                    </button>
                    {!xlsxLoaded && <span className="text-sm text-gray-500 ml-2">Loading template generator...</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleBatchUpload}
                      className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      disabled={isBatchUploading}
                    />
                    {isBatchUploading && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
                    )}
                  </div>
                  {batchUploadMessage && (
                    <p className={`mt-2 text-sm ${batchUploadMessage.includes("Error") ? "text-red-600" : "text-green-600"}`}>
                      {batchUploadMessage}
                    </p>
                  )}
                </div>

                <form onSubmit={handleStudentAssignmentSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="studentSearch" className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                      <input
                        type="text"
                        id="studentSearch"
                        value={studentSearchTerm}
                        onChange={(e) => handleStudentSearch(e.target.value)}
                        placeholder="Search student name..."
                        className="border rounded p-2 w-full"
                      />
                      {studentSearchResults.length > 0 && (
                        <ul className="mt-1 max-h-40 overflow-auto border rounded">
                          {studentSearchResults.map(student => (
                            <li
                              key={student._id}
                              onClick={() => {
                                setSelectedStudentId(student._id);
                                setStudentSearchTerm(`${student.lastname}, ${student.firstname}`);
                                setStudentSearchResults([]);
                              }}
                              className="p-2 hover:bg-gray-100 cursor-pointer"
                            >
                              {student.lastname}, {student.firstname}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <label htmlFor="studentProgram" className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                      <select
                        id="studentProgram"
                        value={selectedProgramIdForStudent}
                        onChange={(e) => {
                          setSelectedProgramIdForStudent(e.target.value);
                          setSelectedCourseIdForStudent("");
                          setSelectedSectionIdForStudent("");
                        }}
                        className="border rounded p-2 w-full h-[42px]"
                        required
                      >
                        <option value="">Select Program</option>
                        {programsData.map(prog => (
                          <option key={prog._id} value={prog._id}>
                            {prog.programName} ({prog.yearLevel})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="studentCourse" className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                      <select
                        id="studentCourse"
                        value={selectedCourseIdForStudent}
                        onChange={(e) => {
                          setSelectedCourseIdForStudent(e.target.value);
                          setSelectedSectionIdForStudent("");
                        }}
                        className="border rounded p-2 w-full h-[42px]"
                        disabled={!selectedProgramIdForStudent}
                      >
                        <option value="">Select Course (Optional)</option>
                        {filteredCoursesForStudent.map(course => (
                          <option key={course._id} value={course._id}>
                            {course.courseName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="studentSection" className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                      <select
                        id="studentSection"
                        value={selectedSectionIdForStudent}
                        onChange={(e) => setSelectedSectionIdForStudent(e.target.value)}
                        className="border rounded p-2 w-full h-[42px]"
                        disabled={!selectedProgramIdForStudent}
                      >
                        <option value="">Select Section (Optional)</option>
                        {filteredSectionsForStudent.map(section => (
                          <option key={section._id} value={section._id}>
                            {section.sectionName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end items-center mt-4">
                    {editingStudentAssignment && (
                        <button type="button" onClick={cancelEditStudentAssignment} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded mr-2" disabled={isAssigningStudent}>
                            Cancel Edit
                        </button>
                    )}
                    <button
                      type="submit"
                      className="bg-[#00418b] hover:bg-[#002b5c] text-white px-4 py-2 rounded"
                      disabled={isAssigningStudent || !selectedStudentId || !selectedProgramIdForStudent}
                    >
                      {isAssigningStudent ? "Saving..." : (editingStudentAssignment ? "Update Assignment" : "+ Assign Student")}
                    </button>
                  </div>
                </form>
              </div>

              {/* Table for Student Assignments */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-2">Student Assignments</h4>
                {isLoadingStudents && <p>Loading students...</p>}
                {errorStudents && <p className="text-red-500">Error: {errorStudents}</p>}
                {!isLoadingStudents && !errorStudents && (
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border">Student Name</th>
                        <th className="p-3 border">Year Level</th>
                        <th className="p-3 border">Program</th>
                        <th className="p-3 border">Course</th>
                        <th className="p-3 border">Section</th>
                        <th className="p-3 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentList.length > 0 ? (
                        studentList.map(std => (
                          <tr key={std._id}>
                            <td className="p-3 border">{`${std.lastname}, ${std.firstname}`}</td>
                            <td className="p-3 border">{std.yearLevelAssigned || 'Not assigned'}</td>
                            <td className="p-3 border">{std.programAssigned || 'Not assigned'}</td>
                            <td className="p-3 border">{std.courseAssigned || 'Not assigned'}</td>
                            <td className="p-3 border">{std.sectionAssigned || 'Not assigned'}</td>
                      <td className="p-3 border">
                        <div className="inline-flex space-x-2">
                                <button onClick={() => handleEditStudentAssignment(std)} className="bg-yellow-400 hover:bg-yellow-500 text-white p-1 rounded text-xs" title="Edit Assignment">
                                  <img src={editIcon} alt="Edit" className="w-5 h-5 inline-block" />
                          </button>
                                <button onClick={() => handleRemoveStudentAssignment(std)} className="bg-red-500 hover:bg-red-700 text-white p-1 rounded text-xs" title="Remove Assignment">
                                  <img src={archiveIcon} alt="Remove" className="w-5 h-5 inline-block" />
                          </button>
                        </div>
                      </td>
                    </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center p-4 text-gray-500">No assigned students found.</td>
                        </tr>
                      )}
                  </tbody>
                </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Add the PreviewModal */}
      <PreviewModal />
    </div>
  );
} 