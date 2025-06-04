import React, { useState, useEffect } from 'react';
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import editIcon from "../../assets/editing.png";
import archiveIcon from "../../assets/archive.png";

export default function Admin_AcademicSettings() {
  const [activeTab, setActiveTab] = useState("school-year"); // Default to the first tab

  // State for School Year Tab
  const [schoolYearsData, setSchoolYearsData] = useState([]);
  const [isLoadingSchoolYears, setIsLoadingSchoolYears] = useState(false);
  const [errorSchoolYears, setErrorSchoolYears] = useState(null);
  const [formDataSchoolYear, setFormDataSchoolYear] = useState({
    startYear: "",
    endYear: "",
    status: "inactive", // Default status
  });

  // State for Program Tab
  const [programsData, setProgramsData] = useState([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [errorPrograms, setErrorPrograms] = useState(null);
  const [formDataProgram, setFormDataProgram] = useState({
    programName: "",
    status: "inactive", // Default status for new programs
    yearLevel: "", // Added yearLevel to Program form data
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
  const [filteredProgramsForSectionDropdown, setFilteredProgramsForSectionDropdown] = useState([]);
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

  const yearLevelOptions = [
    { value: "College", label: "College" },
    { value: "Senior High", label: "Senior High" }
    // Add more as needed
  ];

  const tabs = [
    { id: "school-year", label: "School Year" },
    { id: "program", label: "Program" },
    { id: "course", label: "Course" },
    { id: "department", label: "Department" },
    { id: "section", label: "Section" },
    { id: "faculty-assignment", label: "Faculty Assignment" },
  ];

  // Fetch School Years
  const fetchSchoolYears = async () => {
    setIsLoadingSchoolYears(true);
    setErrorSchoolYears(null);
    try {
      const response = await fetch("${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/schoolyears");
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
      const response = await fetch("${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/programs");
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
      const response = await fetch("${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/courses");
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
      const response = await fetch("${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/sections");
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
      const response = await fetch("${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/users");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Only faculty
      setFacultyList(data.filter(u => u.role === "faculty"));
    } catch (error) {
      setErrorFaculty(error.message);
      console.error("Error fetching faculty:", error);
    } finally {
      setIsLoadingFaculty(false);
    }
  };

  // Fetch all faculty assignments (faculty with programHandle or courseHandle)
  const fetchFacultyAssignments = async () => {
    setIsLoadingFaculty(true);
    setErrorFaculty(null);
    try {
      const response = await fetch("${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/users");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setFacultyAssignments(data.filter(u => u.role === "faculty" && (u.programHandle || u.courseHandle)));
    } catch (error) {
      setErrorFaculty(error.message);
      console.error("Error fetching faculty assignments:", error);
    } finally {
      setIsLoadingFaculty(false);
    }
  };

  // Filter courses by selected program
  useEffect(() => {
    if (selectedProgramId && coursesData.length > 0) {
      setFilteredCoursesForFaculty(coursesData.filter(c => c.program && c.program._id === selectedProgramId));
    } else {
      setFilteredCoursesForFaculty([]);
    }
    setSelectedCourseId("");
  }, [selectedProgramId, coursesData]);

  // Fetch faculty and assignments when tab is active
  useEffect(() => {
    if (activeTab === "faculty-assignment") {
      fetchFaculty();
      fetchPrograms();
      fetchCourses();
      fetchFacultyAssignments();
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
    }
  }, [activeTab]);

  // Effect to filter programs for Section tab dropdown when yearLevel changes
  useEffect(() => {
    if (formDataSection.yearLevel && programsData.length > 0) {
      setFilteredProgramsForSectionDropdown(
        programsData.filter(p => p.yearLevel === formDataSection.yearLevel)
      );
    } else {
      setFilteredProgramsForSectionDropdown([]);
    }
    // Reset program and course selection when year level changes
    setFormDataSection(prev => ({ ...prev, program: "", course: "" }));
  }, [formDataSection.yearLevel, programsData]);

  // Effect to filter courses for Section tab dropdown when program changes
  useEffect(() => {
    if (formDataSection.program && coursesData.length > 0) {
      setFilteredCoursesForSectionDropdown(
        coursesData.filter(c => c.program && c.program._id === formDataSection.program)
      );
    } else {
      setFilteredCoursesForSectionDropdown([]);
    }
    // Reset course selection when program changes
    setFormDataSection(prev => ({ ...prev, course: "" }));
  }, [formDataSection.program, coursesData]);

  // Handle change for school year form
  const handleSchoolYearChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormDataSchoolYear((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? "active" : "inactive") : value,
    }));
  };

  // Handle submit for school year form
  const handleSchoolYearSubmit = async (e) => {
    e.preventDefault();
    const { startYear, endYear } = formDataSchoolYear;

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
      const response = await fetch("${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/schoolyears", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formDataSchoolYear,
          startYear: parseInt(startYear),
          endYear: parseInt(endYear),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      // Refresh list and clear form
      fetchSchoolYears();
      setFormDataSchoolYear({ startYear: "", endYear: "", status: "inactive" });
      alert("School Year added successfully!"); // Replace with a better notification later
    } catch (error) {
      alert(`Error adding school year: ${error.message}`);
      console.error("Error adding school year:", error);
    }
  };

  // Handle change for program form
  const handleProgramChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormDataProgram((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? "active" : "inactive") : value,
    }));
  };

  // Handle submit for program form
  const handleProgramSubmit = async (e) => {
    e.preventDefault();
    const { programName, yearLevel, status } = formDataProgram; // Added yearLevel

    if (!programName.trim() || !yearLevel) { // Added yearLevel check
      alert("Please enter a Program Name and select a Year Level.");
      return;
    }

    try {
      const response = await fetch("${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formDataProgram), // formDataProgram now includes yearLevel and status
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      fetchPrograms(); // Refresh list
      setFormDataProgram({ programName: "", status: "inactive", yearLevel: "" }); // Clear form, including yearLevel
      alert("Program added successfully!"); // Replace with a better notification
    } catch (error) {
      alert(`Error adding program: ${error.message}`);
      console.error("Error adding program:", error);
    }
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
      const response = await fetch("${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formDataCourse),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      fetchCourses(); // Refresh course list
      setFormDataCourse({ courseName: "", program: "" }); // Clear form
      alert("Course added successfully!");
    } catch (error) {
      alert(`Error adding course: ${error.message}`);
      console.error("Error adding course:", error);
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
    const { sectionName, program, yearLevel, course } = formDataSection; // Added course

    if (!sectionName.trim() || !program || !yearLevel) { // Course is optional here, primary validation
      alert("Please fill in Section Name, select a Program, and select a Year Level.");
      return;
    }

    // Construct payload, including course only if it has a value
    const payload = {
      sectionName,
      program,
      yearLevel,
      ...(course && { course }), // Spread course only if it exists
    };

    try {
      const response = await fetch("${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      fetchSections(); // Refresh section list
      setFormDataSection({ sectionName: "", program: "", yearLevel: "", course: "" }); // Clear form
      alert("Section added successfully!");
    } catch (error) {
      alert(`Error adding section: ${error.message}`);
      console.error("Error adding section:", error);
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
      const payload = {
        programHandle: selectedProgramId,
        courseHandle: selectedCourseId || null,
      };
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/users/${selectedFacultyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      fetchFacultyAssignments();
      setSelectedFacultyId("");
      setSelectedProgramId("");
      setSelectedCourseId("");
      alert("Faculty assignment updated successfully!");
    } catch (error) {
      alert(`Error assigning faculty: ${error.message}`);
      console.error("Error assigning faculty:", error);
    } finally {
      setIsAssigning(false);
    }
  };

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
                    <button
                      type="submit"
                      className="bg-[#00418b] hover:bg-[#002b5c] text-white px-4 py-2 rounded"
                    >
                      + Add
                    </button>
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
                                  // onClick={() => handleEditSchoolYear(sy)} // Add logic later
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                                  // onClick={() => handleDeleteSchoolYear(sy)} // Add logic later
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
                <h3 className="text-xl font-semibold mb-4">Add New Program</h3>
                <form onSubmit={handleProgramSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                  <div className="mb-4 flex items-center">
                    <input
                      id="program-set-active"
                      name="status" // Ensure this name matches the field in formDataProgram
                      type="checkbox"
                      checked={formDataProgram.status === "active"}
                      onChange={handleProgramChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="program-set-active" className="ml-2 block text-sm text-gray-900">
                      Set Active
                    </label>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="submit"
                      className="bg-[#00418b] hover:bg-[#002b5c] text-white px-4 py-2 rounded"
                    >
                      + Add Program
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
                        <th className="p-3 border">Status</th>
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
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                program.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {program.status === "active" ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button
                                  // onClick={() => handleEditProgram(program)} // Add logic later
                                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                                >
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button
                                  // onClick={() => handleDeleteProgram(program)} // Add logic later
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
                <h3 className="text-xl font-semibold mb-4">Add New Course</h3>
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
                        name="program" // Changed from courseProgramName to match formDataCourse
                        id="courseProgram" // Kept id for label association
                        value={formDataCourse.program} // Bind to formDataCourse.program
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
                  <div className="flex justify-end mt-4">
                    <button
                      type="submit"
                      className="bg-[#00418b] hover:bg-[#002b5c] text-white px-4 py-2 rounded"
                    >
                      + Add Course
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
                            {/* Access populated program name */}
                            <td className="p-3 border">{course.program ? course.program.programName : 'N/A'}</td>
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded">
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded">
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
          {activeTab === "department" && (
            <div>
              <h3 className="text-2xl font-semibold">Department Settings</h3>
              <p className="mt-4">Content for Department settings will go here.</p>
              {/* Placeholder for Department specific content */}
            </div>
          )}
          {activeTab === "section" && (
            <div>
              {/* Form for Add New Section */}
              <div className="bg-white p-6 rounded-xl shadow mb-10">
                <h3 className="text-xl font-semibold mb-4">Add New Section</h3>
                <form onSubmit={handleSectionSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6"> {/* Main 2-column grid container, gap-x for horizontal space */}
                    {/* Left Column */}
                    <div>
                      {/* 1. Section Name Input */}
                      <div className="mb-4">
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
                          className="border rounded p-2 w-full"
                          required
                        />
                      </div>

                      {/* 3. Program Dropdown */}
                      <div className="mb-4">
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
                          disabled={!formDataSection.yearLevel} // Disable if yearLevel not selected
                        >
                          <option value="">Select Program</option>
                          {filteredProgramsForSectionDropdown.length > 0 ? (
                            filteredProgramsForSectionDropdown.map((prog) => (
                              <option key={prog._id} value={prog._id}>
                                {prog.programName}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>
                              {formDataSection.yearLevel ? "No programs for this year level" : "Select year level first"}
                            </option>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div>
                      {/* 2. Year Level Dropdown */}
                      <div className="mb-4">
                        <label htmlFor="sectionYearLevel" className="block text-sm font-medium text-gray-700 mb-1">
                          Year Level
                        </label>
                        <select
                          name="yearLevel"
                          id="sectionYearLevel"
                          value={formDataSection.yearLevel}
                          onChange={handleSectionChange}
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

                      {/* 4. Course Dropdown (Optional) */}
                      <div className="mb-4">
                        <label htmlFor="sectionCourse" className="block text-sm font-medium text-gray-700 mb-1">
                          Course (Optional)
                        </label>
                        <select
                          name="course"
                          id="sectionCourse"
                          value={formDataSection.course}
                          onChange={handleSectionChange}
                          className="border rounded p-2 w-full h-[42px]"
                          disabled={!formDataSection.program} // Disable if program not selected
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
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="submit"
                      className="bg-[#00418b] hover:bg-[#002b5c] text-white px-4 py-2 rounded"
                    >
                      + Add Section
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
                        <th className="p-3 border">Course</th> {/* New Column */}
                        <th className="p-3 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionsData.length > 0 ? (
                        sectionsData.map((section) => (
                          <tr key={section._id}>
                            <td className="p-3 border">{section.sectionName}</td>
                            <td className="p-3 border">{section.program ? section.program.programName : 'N/A'}</td>
                            <td className="p-3 border">{section.yearLevel}</td>
                            <td className="p-3 border">{section.course ? section.course.courseName : 'N/A'}</td> {/* Display Course Name */}
                            <td className="p-3 border">
                              <div className="inline-flex space-x-2">
                                <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded">
                                  <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                                </button>
                                <button className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded">
                                  <img src={archiveIcon} alt="Archive" className="w-8 h-8 inline-block" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center p-4 text-gray-500"> {/* Updated colSpan to 5 */}
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
                <h3 className="text-xl font-semibold mb-4">Assign Faculty</h3>
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
                      >
                        <option value="">Select Faculty</option>
                        {isLoadingFaculty ? (
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
                    <button
                      type="submit"
                      className="bg-[#00418b] hover:bg-[#002b5c] text-white px-4 py-2 rounded"
                      disabled={isAssigning}
                    >
                      {isAssigning ? "Assigning..." : "+ Assign Faculty"}
                    </button>
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
                      </tr>
                    </thead>
                    <tbody>
                      {facultyAssignments.length > 0 ? (
                        facultyAssignments.map(fac => {
                          const program = programsData.find(p => p._id === (fac.programHandle && fac.programHandle.toString()));
                          const course = coursesData.find(c => c._id === (fac.courseHandle && fac.courseHandle.toString()));
                          return (
                            <tr key={fac._id}>
                              <td className="p-3 border">
                                {(fac.lastname || fac.firstname)
                                  ? `${fac.lastname || ''}${fac.lastname && fac.firstname ? ', ' : ''}${fac.firstname || ''}`
                                  : 'No Name'}
                              </td>
                              <td className="p-3 border">{program ? program.programName : 'N/A'}</td>
                              <td className="p-3 border">{course ? course.courseName : 'N/A'}</td>
                              <td className="p-3 border">{program ? program.yearLevel : 'N/A'}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center p-4 text-gray-500">
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
        </div>
      </div>
    </div>
  );
} 