import React, { useState, useEffect } from "react";
import ProfileMenu from "../ProfileMenu";
import Admin_Navbar from "./Admin_Navbar";
import axios from "axios";
import ValidationModal from "../ValidationModal";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Admin_Accounts() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
  const [showCreateSuccess, setShowCreateSuccess] = useState(false);
  const [showArchivedTable, setShowArchivedTable] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showRecoverSuccess, setShowRecoverSuccess] = useState(false);
  const [showArchivePasswordModal, setShowArchivePasswordModal] = useState(false);
  const [archivePassword, setArchivePassword] = useState("");
  const [archivePasswordError, setArchivePasswordError] = useState("");
  const [duplicateEmailModal, setDuplicateEmailModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [userToArchive, setUserToArchive] = useState(null);
  
  const [formData, setFormData] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    email: "",
    personalemail: "",
    schoolID: "",
    password: "",
    role: "",
    userID: "", // invisible field
    contactNo: "",
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Archived users data with pagination
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [archivedCurrentPage, setArchivedCurrentPage] = useState(1);
  const [archivedTotalPages, setArchivedTotalPages] = useState(1);
  const ARCHIVED_ITEMS_PER_PAGE = 10;

  // Add state for active tab
  const [activeTab, setActiveTab] = useState('all');

  // Calculate days left until permanent deletion
  const getDaysLeft = (deletedAt) => {
    const now = new Date();
    const deleteDate = new Date(deletedAt);
    const diffTime = deleteDate - now;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  // Simulate password check (always succeeds for now)
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (adminPassword.trim() === "") {
      setPasswordError("Password is required.");
      return;
    }
    // Simulate success
    setShowArchivedTable(true);
    setShowPasswordModal(false);
    setAdminPassword("");
    setPasswordError("");
  };

  // Fetch users on mount and after successful account creation
  const fetchUsers = async (page = 1, limit = ITEMS_PER_PAGE) => {
    try {
      const res = await fetch(`${API_BASE}/users?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
        setCurrentPage(data.pagination.currentPage);
      } else {
        console.error("Failed to fetch users:", data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const [searchTerms, setSearchTerms] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    userID: "",
  });
  
  const filteredUsers = users.filter((user) => {
    const matchesFirst = (user.firstname || "").toLowerCase().includes(searchTerms.firstname.toLowerCase());
    const matchesLast = (user.lastname || "").toLowerCase().includes(searchTerms.lastname.toLowerCase());
    const matchesMiddle = (user.middlename || "").toLowerCase().includes(searchTerms.middlename.toLowerCase());
    const matchesUserID = searchTerms.userID === "" || (user.userID || "").toLowerCase().includes(searchTerms.userID.toLowerCase());
    return matchesFirst && matchesLast && matchesMiddle && matchesUserID;
  });
  
  const paginatedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = (a[sortConfig.key] || "").toLowerCase();
    const bValue = (b[sortConfig.key] || "").toLowerCase();
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // Filter users by active tab (role)
  const tabFilteredUsers = activeTab === 'all'
    ? paginatedUsers
    : paginatedUsers.filter(user => user.role === activeTab);

  useEffect(() => {
    fetchUsers(currentPage, ITEMS_PER_PAGE);
    // eslint-disable-next-line
  }, [currentPage]);

  useEffect(() => {
    if (showArchivedTable) {
      fetchArchivedUsers(archivedCurrentPage, ARCHIVED_ITEMS_PER_PAGE);
    }
  }, [showArchivedTable, archivedCurrentPage]);

  const fetchArchivedUsers = async (page = 1, limit = ARCHIVED_ITEMS_PER_PAGE) => {
    try {
      const res = await fetch(`${API_BASE}/users/archived-users?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (res.ok) {
        setArchivedUsers(data.users || data);
        setArchivedTotalPages(data.pagination?.totalPages || 1);
        setArchivedCurrentPage(data.pagination?.currentPage || 1);
      } else {
        console.error("Failed to fetch archived users:", data);
      }
    } catch (err) {
      console.error("Error fetching archived users:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "schoolID") {
      let newValue = value;
      if (formData.role === "faculty") {
        newValue = newValue.replace(/[^F0-9]/gi, "").toUpperCase();
        if (!newValue.startsWith("F00")) newValue = "F00" + newValue.replace(/^F00/, "");
      } else if (formData.role === "admin") {
        newValue = newValue.replace(/[^A0-9]/gi, "").toUpperCase();
        if (!newValue.startsWith("A00")) newValue = "A00" + newValue.replace(/^A00/, "");
      } else if (formData.role === "vice president of education" || formData.role === "principal") {
        newValue = newValue.replace(/[^N0-9]/gi, "").toUpperCase();
        if (!newValue.startsWith("N00")) newValue = "N00" + newValue.replace(/^N00/, "");
      }
      setFormData((prev) => ({ ...prev, [name]: newValue }));
    } else if (name === "contactNo") {
      // Only allow numbers, max 11 digits, must start with 09
      let newValue = value.replace(/[^0-9]/g, "");
      if (newValue.length > 11) newValue = newValue.slice(0, 11);
      setFormData((prev) => ({ ...prev, [name]: newValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Auto-generate school email when firstname, lastname, or role changes
  useEffect(() => {
    const { firstname, lastname } = formData;
    const clean = (str) =>
      str
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "") // remove spaces
        .replace(/[^a-z]/g, ""); // remove non-letters
    if (firstname && lastname) {
      const emailDomain = "sjddef.edu.ph"; // Always use this domain
      const generatedEmail = `${clean(firstname)}.${clean(lastname)}@${emailDomain}`;
      setFormData((prev) => ({ ...prev, email: generatedEmail }));
    } else {
      setFormData((prev) => ({ ...prev, email: "" }));
    }
  }, [formData.firstname, formData.lastname]);

  const handleSubmit = async (e, overrideEmail = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const requiredFields = ["firstname", "lastname", "email", "password", "role", "schoolID", "contactNo"];
    for (const field of requiredFields) {
      if (!formData[field]) {
        setValidationModal({
          isOpen: true,
          type: 'warning',
          title: 'Missing Field',
          message: `Please fill in ${field}.`
        });
        return;
      }
    }
    // Prevent admin from creating student accounts
    if (formData.role === "students") {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Role',
        message: "Student accounts can only be registered through the public registration form."
      });
      return;
    }
    // SchoolID validation for all roles
    if (formData.role === "faculty") {
      if (!/^F00/.test(formData.schoolID)) {
        setValidationModal({
          isOpen: true,
          type: 'warning',
          title: 'Invalid Faculty ID',
          message: "Faculty ID must start with F00."
        });
        return;
      }
    } else if (formData.role === "admin") {
      if (!/^A00/.test(formData.schoolID)) {
        setValidationModal({
          isOpen: true,
          type: 'warning',
          title: 'Invalid Admin ID',
          message: "Admin ID must start with A00."
        });
        return;
      }
    } else if (formData.role === "vice president of education" || formData.role === "principal") {
      if (!/^N00/.test(formData.schoolID)) {
        setValidationModal({
          isOpen: true,
          type: 'warning',
          title: 'Invalid VP/Principal ID',
          message: "VP/Principal ID must start with N00."
        });
        return;
      }
    }
    // Contact number validation: must be 11 digits and start with 09
    if (!/^09\d{9}$/.test(formData.contactNo)) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Contact Number',
        message: "Contact number must be exactly 11 digits and start with 09 (e.g., 09000000000)"
      });
      return;
    }
    if (isEditMode) {
      // Validate if any changes were made
      const hasChanges = 
        formData.firstname !== editingUser.firstname ||
        formData.middlename !== (editingUser.middlename || "") ||
        formData.lastname !== editingUser.lastname ||
        formData.schoolID !== (editingUser.schoolID || "") ||
        formData.role !== editingUser.role;

      if (!hasChanges) {
        setValidationModal({
          isOpen: true,
          type: 'info',
          title: 'No Changes',
          message: "No changes were made to the account."
        });
        return;
      }

      // Show save confirmation modal instead of proceeding directly
      setShowSaveConfirm(true);
    } else {
      const randomNum = Math.floor(100 + Math.random() * 900);
      const userID = `${formData.role.charAt(0).toUpperCase()}${randomNum}`;

      let accountData = {
        ...formData,
        userID,
        email: overrideEmail || formData.email,
        // Default archive/recovery fields (OTP fields removed from here)
        isArchived: false,
        archivedAt: null,
        deletedAt: null, 
        archiveAttempts: 0,
        archiveLockUntil: null,
        recoverAttempts: 0,
        recoverLockUntil: null,
        trackAssigned: [],
        strandAssigned: [],
        sectionAssigned: null,
      };

      if (formData.role === "students") {
        accountData = {
          ...accountData,
          programAssigned: null,
          courseAssigned: null,
          sectionAssigned: null,
        };
      } else if (formData.role === "faculty") {
        accountData = {
          ...accountData,
          trackAssigned: [],
          strandAssigned: [],
          sectionAssigned: [], // Can be multiple values
        };
      }

      const token = localStorage.getItem('token');

      try {
        const res = await axios.post(`${API_BASE}/users`, accountData, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.status === 200 || res.status === 201) {
          setShowCreateSuccess(true);
          setFormData({
            firstname: '',
            middlename: '',
            lastname: '',
            email: '',
            personalemail: '',
            schoolID: '',
            password: generatePassword(),
            role: 'faculty',
            userID: '',
            contactNo: '',
          });
          fetchUsers();
        } else {
          setValidationModal({
            isOpen: true,
            type: 'error',
            title: 'Creation Failed',
            message: 'Error: Failed to create account'
          });
        }
      } catch {
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Creation Failed',
          message: 'Error: Failed to create account'
        });
      }
    }
  };

  const confirmSave = async () => {
    setShowSaveConfirm(false);
    try {
      // Generate new userID if role changed
      let updatedUserID = formData.userID;
      if (formData.role !== editingUser.role) {
        const randomNum = Math.floor(100 + Math.random() * 900);
        updatedUserID = `${formData.role.charAt(0).toUpperCase()}${randomNum}`;
      }

      const res = await fetch(`${API_BASE}/users/${editingUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: formData.firstname,
          middlename: formData.middlename,
          lastname: formData.lastname,
          email: formData.email.toLowerCase(),
          schoolID: formData.schoolID,
          password: formData.password,
          personalemail: formData.personalemail,
          role: formData.role,
          userID: updatedUserID,
          trackAssigned: formData.trackAssigned || [],
          strandAssigned: formData.strandAssigned || [],
          sectionAssigned: formData.sectionAssigned || [],
          contactNo: formData.contactNo,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Update the users array with the edited user
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === editingUser._id 
              ? { ...user, ...formData, userID: updatedUserID }
              : user
          )
        );
        
        setShowUpdateSuccess(true);
        setTimeout(() => {
          setShowUpdateSuccess(false);
          setIsEditMode(false);
          setEditingUser(null);
          setFormData({
            firstname: "",
            middlename: "",
            lastname: "",
            email: "",
            personalemail: "",
            schoolID: "",
            password: "",
            role: "faculty",
            userID: "",
            contactNo: '',
          });
        }, 2000);
      } else {
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Update Failed',
          message: "Failed to update account: " + (data.error || "Unknown error")
        });
      }
    } catch (err) {
      console.error(err);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: "Something went wrong while updating the account."
      });
    }
  };

  const cancelSave = () => {
    setShowSaveConfirm(false);
  };

  // Generate a random password
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Set a generated password on mount and when not editing
  useEffect(() => {
    if (!isEditMode) {
      setFormData((prev) => ({ ...prev, password: generatePassword() }));
    }
    // eslint-disable-next-line
  }, [isEditMode]);

  useEffect(() => {
    if (!isEditMode) {
      const requiredFields = [
        'firstname',
        'lastname',
        'email',
        'role',
        'schoolID',
        'contactNo',
        'personalemail'
      ];
      const allFilled = requiredFields.every(field => formData[field] && formData[field].toString().trim() !== '');
      if (allFilled && !formData.password) {
        setFormData(prev => ({ ...prev, password: generatePassword() }));
      }
    }
  }, [formData.firstname, formData.lastname, formData.email, formData.role, formData.schoolID, formData.contactNo, formData.personalemail, isEditMode]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        // Toggle direction if clicking the same column
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      // Otherwise, sort ascending
      return { key, direction: "asc" };
    });
  };

  const handleEdit = (user) => {
    setIsEditMode(true);
    setEditingUser(user);
    setFormData({
      firstname: user.firstname,
      middlename: user.middlename || "",
      lastname: user.lastname,
      email: user.email,
      personalemail: user.personalemail || "",
      schoolID: user.schoolID || "",
      password: user.password,
      role: user.role,
      userID: user.userID,
      contactNo: user.contactNo || '',
    });
    setShowCreateModal(true); // Open the modal when editing
  };

  const handleArchive = (user) => {
    setUserToArchive(user);
    setShowArchivePasswordModal(true);
    setArchivePassword("");
    setArchivePasswordError("");
  };

  const handleArchivePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!archivePassword) {
      setArchivePasswordError("Password is required.");
      return;
    }

    // Get adminId from localStorage (or your auth context)
    const admin = JSON.parse(localStorage.getItem('user'));
    const adminId = admin?._id;
    const token = localStorage.getItem('token');

    if (!adminId) {
      setArchivePasswordError("Admin not logged in.");
      return;
    }

    const res = await fetch(`${API_BASE}/users/archive/${userToArchive._id}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        adminId,
        adminPassword: archivePassword
      })
    });

    if (res.ok) {
      setShowArchivePasswordModal(false);
      setUsers(prev => prev.filter(u => u._id !== userToArchive._id));
      setUserToArchive(null);
      setTimeout(() => setShowArchivePasswordModal(false), 2000);
      fetchUsers(); // Refresh the users list from the backend
      if (showArchivedTable) {
        fetchArchivedUsers(archivedCurrentPage, ARCHIVED_ITEMS_PER_PAGE);
      }
    } else {
      const data = await res.json();
      setArchivePasswordError(data.message || "Failed to archive user.");
    }
  };

  const cancelArchivePassword = () => {
    setShowArchivePasswordModal(false);
    setUserToArchive(null);
    setArchivePassword("");
    setArchivePasswordError("");
  };

  const handleRecover = async (user) => {
    const res = await fetch(`${API_BASE}/users/archived-users/${user._id}/recover`, {
      method: 'POST'
    });
    if (res.ok) {
      setArchivedUsers(prev => prev.filter(u => u._id !== user._id));
      fetchUsers(); // Refresh active users
      setShowRecoverSuccess(true);
      // Refresh archived users list after recovery
      setTimeout(() => {
        fetchArchivedUsers(archivedCurrentPage, ARCHIVED_ITEMS_PER_PAGE);
      }, 1000);
    }
  };

  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

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

  const [showCreateModal, setShowCreateModal] = useState(false);

  function formatSchoolId(schoolId) {
    if (!schoolId) return '-';
    return schoolId;
  }

  const getRolePrefix = (role) => {
    if (role === 'faculty') return 'F';
    if (role === 'admin') return 'A';
    if (role === 'principal' || role === 'vice president of education') return 'N';
    return '';
  };

  // Update the useEffect for School ID generation to remove dependency on isEditMode and generate as soon as role is selected.
  useEffect(() => {
    if (formData.role) {
      const fetchCountAndSetID = async () => {
        try {
          const res = await axios.get(`${API_BASE}/users/active`);
          if (res.status === 200) {
            const users = res.data;
            const roleUsers = users.filter(u => u.role === formData.role);
            const prefix = getRolePrefix(formData.role);
            const nextNum = (roleUsers.length + 1).toString().padStart(3, '0');
            setFormData(prev => ({ ...prev, schoolID: `${prefix}${nextNum}` }));
          }
        } catch {
          setFormData(prev => ({ ...prev, schoolID: '' }));
        }
      };
      fetchCountAndSetID();
    }
  }, [formData.role]);

  const isFormValid = formData.role !== "" && formData.firstname && formData.lastname && formData.email && formData.schoolID && formData.contactNo && formData.personalemail && formData.password;

  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Admin_Navbar />
        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Create Accounts</h2>
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
            <ProfileMenu />
          </div>
          {/* Add Create New Account button */}
          {/* <div className="mb-4">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={() => setShowCreateModal(true)}
            >
              Create New Account
            </button>
          </div> */}
          {/* Button to view archived accounts */}
          {/* <div className="mb-4">
            <button
              className="bg-gray-700 hover:bg-gray-900 text-white px-4 py-2 rounded"
              onClick={() => setShowPasswordModal(true)}
            >
              View Archived Accounts
            </button>
          </div> */}
          {/* Users section (with tabs and table) below */}
          <div className="mt-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
              <h4 className="text-xl md:text-2xl font-semibold">Users</h4>
              <div className="flex gap-2">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create New Account
                </button>
                <button
                  className="bg-gray-700 hover:bg-gray-900 text-white px-4 py-2 rounded"
                  onClick={() => setShowPasswordModal(true)}
                >
                  View Archived Accounts
                </button>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow mb-4">
              {/* Tabs for roles (inside the table card) */}
              <div className="flex gap-2 mb-4">
                {[
                  { label: 'All', value: 'all' },
                  { label: 'Students', value: 'students' },
                  { label: 'Faculty', value: 'faculty' },
                  { label: 'Vice President of Education', value: 'vice president of education' },
                  { label: 'Admin', value: 'admin' },
                  { label: 'Principal', value: 'principal' },
                ].map(tab => (
                  <button
                    key={tab.value}
                    className={`px-4 py-2 rounded-t-lg font-semibold focus:outline-none transition-colors border-b-2 ${
                      activeTab === tab.value
                        ? 'bg-white border-blue-600 text-blue-700'
                        : 'bg-gray-200 border-transparent text-gray-600 hover:bg-gray-300'
                    }`}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-3 border-b w-1/6 cursor-pointer select-none font-semibold text-gray-700 whitespace-nowrap" onClick={() => handleSort("schoolID")}>School ID {sortConfig.key === "schoolID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
                    <th className="p-3 border-b w-1/6 cursor-pointer select-none font-semibold text-gray-700 whitespace-nowrap" onClick={() => handleSort("lastname")}>Last Name {sortConfig.key === "lastname" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
                    <th className="p-3 border-b w-1/6 cursor-pointer select-none font-semibold text-gray-700 whitespace-nowrap" onClick={() => handleSort("firstname")}>First Name {sortConfig.key === "firstname" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
                    <th className="p-3 border-b w-1/6 cursor-pointer select-none font-semibold text-gray-700 whitespace-nowrap" onClick={() => handleSort("middlename")}>Middle Name {sortConfig.key === "middlename" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
                    <th className="p-3 border-b font-semibold text-gray-700 whitespace-nowrap">Contact No.</th>
                    <th className="p-3 border-b font-semibold text-gray-700 whitespace-nowrap">Role</th>
                    <th className="p-3 border-b font-semibold text-gray-700 whitespace-nowrap">Actions</th>
                  </tr>
                  {/* New row for search inputs */}
                  <tr className="bg-white text-left">
                    <th className="p-2 border-b">
                      <input type="text" placeholder="Search School ID" className="w-full border rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, schoolID: e.target.value }))} />
                    </th>
                    <th className="p-2 border-b">
                      <input type="text" placeholder="Search Last Name" className="w-full border rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, lastname: e.target.value }))} />
                    </th>
                    <th className="p-2 border-b">
                      <input type="text" placeholder="Search First Name" className="w-full border rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, firstname: e.target.value }))} />
                    </th>
                    <th className="p-2 border-b">
                      <input type="text" placeholder="Search Middle Name" className="w-full border rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, middlename: e.target.value }))} />
                    </th>
                    <th className="p-2 border-b"></th>
                    <th className="p-2 border-b"></th>
                    <th className="p-2 border-b"></th>
                  </tr>
                </thead>
                <tbody>
                  {tabFilteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center p-4 text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    tabFilteredUsers.map((user, idx) => (
                      <tr key={user._id} className={idx % 2 === 0 ? "bg-white hover:bg-gray-50 transition" : "bg-gray-50 hover:bg-gray-100 transition"}>
                        <td className="p-3 border-b">{formatSchoolId(user.schoolID)}</td>
                        <td className="p-3 border-b">{user.lastname}</td>
                        <td className="p-3 border-b">{user.firstname}</td>
                        <td className="p-3 border-b">{user.middlename}</td>
                        <td className="p-3 border-b">{user.contactNo}</td>
                        <td className="p-3 border-b">
                          <span className={`inline-block w-auto max-w-fit px-2 py-0.5 rounded text-xs font-semibold
                            ${user.role === 'students' ? 'bg-green-100 text-green-700 border border-green-300' :
                              user.role === 'faculty' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                              user.role === 'admin' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                              user.role === 'principal' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                              user.role === 'vice president of education' ? 'bg-pink-100 text-pink-700 border border-pink-300' :
                              'bg-gray-100 text-gray-700 border border-gray-300'}`}>{user.role === 'vice president of education' ? 'Vice President of Education' : user.role}</span>
                        </td>
                        <td className="p-3 border-b">
                          <div className="inline-flex space-x-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-1 rounded hover:bg-yellow-100 group relative"
                              title="Edit"
                            >
                              {/* Heroicons Pencil Square */}
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.182.455a.75.75 0 0 1-.826-.826l.455-4.182L16.862 3.487ZM19.5 6.75l-1.5-1.5" />
                              </svg>
                              <span className="absolute left-1/2 -translate-x-1/2 top-8 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">Edit</span>
                            </button>
                            <button
                              onClick={() => handleArchive(user)}
                              className="p-1 rounded hover:bg-red-100 group relative"
                              title="Archive"
                            >
                              {/* Heroicons Trash (archive) */}
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5M4.5 7.5h15m-1.5 0v10.125A2.625 2.625 0 0 1 15.375 20.25h-6.75A2.625 2.625 0 0 1 6 17.625V7.5m3 4.5v4.125m3-4.125v4.125" />
                              </svg>
                              <span className="absolute left-1/2 -translate-x-1/2 top-8 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">Archive</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-4">
                <button
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="text-sm">Page {currentPage} of {totalPages}</span>
                <button
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Save Confirmation Modal */}
          {showSaveConfirm && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Confirm Save</h3>
                <p className="mb-4">Save these necessary changes?</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelSave}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                  >
                    No
                  </button>
                  <button
                    onClick={confirmSave}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Update Success Message */}
          {showUpdateSuccess && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-xl font-semibold mb-2 text-green-600">Account Updated</h3>
                <button
                  onClick={() => setShowUpdateSuccess(false)}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Create Success Message */}
          {showCreateSuccess && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-60">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-xl font-semibold mb-2 text-green-600">Account Created Successfully</h3>
                <p className="text-gray-600 mb-4">The new account has been created and added to the system.</p>
                <button
                  onClick={() => {
                    setShowCreateSuccess(false);
                    setShowCreateModal(false);
                  }}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Duplicate Email Modal */}
          {duplicateEmailModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Duplicate Email Detected</h3>
                <p className="mb-4">
                  The email you entered already exists.<br />
                </p>
                <p className="mb-4">Do you want to proceed with the suggested email?</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setDuplicateEmailModal(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setDuplicateEmailModal(false);
                      if (pendingFormData) {
                        await handleSubmit(null);
                        setPendingFormData(null);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Password Modal */}
          {showPasswordModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Enter Admin Password</h3>
                <form onSubmit={handlePasswordSubmit}>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="Admin Password"
                    className="border rounded p-2 w-full mb-2"
                    autoFocus
                  />
                  {passwordError && <p className="text-red-600 text-sm mb-2">{passwordError}</p>}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordModal(false);
                        setAdminPassword("");
                        setPasswordError("");
                      }}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Archive Password Modal */}
          {showArchivePasswordModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Account Archive</h3>
                <p className="mb-4">In order to archive this account you must enter admin password</p>
                <form onSubmit={handleArchivePasswordSubmit}>
                  <input
                    type="password"
                    value={archivePassword}
                    onChange={e => setArchivePassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="border rounded p-2 w-full mb-2"
                    autoFocus
                  />
                  {archivePasswordError && <p className="text-red-600 text-sm mb-2">{archivePasswordError}</p>}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelArchivePassword}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                    >
                      Archive
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Modal for New Account Form */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-12 rounded-2xl shadow-2xl max-w-6xl w-full relative flex flex-col items-center">
                
                <button
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-3xl font-bold"
                  onClick={() => {
                    setShowCreateModal(false);
                    setIsEditMode(false);
                    setEditingUser(null);
                    setFormData({
                      firstname: "",
                      middlename: "",
                      lastname: "",
                      email: "",
                      personalemail: "",
                      schoolID: "",
                      password: "",
                      role: "",
                      userID: "",
                      contactNo: "",
                    });
                  }}
                  aria-label="Close"
                >
                  &times;
                </button>
                <h3 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Account' : 'Create New Account'}</h3>
                <form className="space-y-6 w-full" style={{maxWidth: '1100px'}} onSubmit={handleSubmit}>
                  {/* Row 1: Name fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
                    <div>
                      <label className="block font-semibold mb-1" htmlFor="firstname">First Name</label>
                      <input id="firstname" type="text" name="firstname" value={formData.firstname} onChange={handleChange} placeholder="First Name" className="border rounded p-4 text-lg w-full" required />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1" htmlFor="middlename">Middle Name</label>
                      <input id="middlename" type="text" name="middlename" value={formData.middlename} onChange={handleChange} placeholder="Middle Name" className="border rounded p-4 text-lg w-full" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1" htmlFor="lastname">Last Name</label>
                      <input id="lastname" type="text" name="lastname" value={formData.lastname} onChange={handleChange} placeholder="Last Name" className="border rounded p-4 text-lg w-full" required />
                    </div>
                  </div>
                  {/* Row 2: School Email, Personal Email, School ID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
                    <div>
                      <label className="block font-semibold mb-1" htmlFor="email">School Email</label>
                      <input id="email" type="email" name="email" value={formData.email} readOnly placeholder="School Email (auto-generated)" className="border rounded p-4 text-lg w-full bg-gray-100 cursor-not-allowed" required />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1" htmlFor="personalemail">Personal Email</label>
                      <input id="personalemail" type="email" name="personalemail" value={formData.personalemail} onChange={handleChange} placeholder="Personal Email" className="border rounded p-4 text-lg w-full" required />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1" htmlFor="schoolID">School ID</label>
                      <input id="schoolID" type="text" name="schoolID" value={formData.schoolID} readOnly placeholder={formData.role === 'faculty' ? 'Faculty ID (auto-generated)' : formData.role === 'admin' ? 'Admin ID (auto-generated)' : (formData.role === 'vice president of education' || formData.role === 'principal') ? 'VP/Principal ID (auto-generated)' : 'School ID (auto-generated)'} className="border rounded p-4 text-lg w-full bg-gray-100 cursor-not-allowed" required />
                    </div>
                  </div>
                  {/* Row 3: Contact Number, Role, Password */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
                    <div>
                      <label className="block font-semibold mb-1" htmlFor="contactNo">Contact Number</label>
                      <input id="contactNo" type="text" name="contactNo" value={formData.contactNo || ''} onChange={handleChange} placeholder="Contact Number" className="border rounded p-4 text-lg w-full" required />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1" htmlFor="role">Role</label>
                      <select id="role" name="role" value={formData.role} onChange={handleChange} className="border rounded p-4 text-lg w-full" required>
                        <option value="" disabled>Select Role</option>
                        <option value="faculty">Faculty</option>
                        <option value="vice president of education">Vice President of Education</option>
                        <option value="admin">Admin</option>
                        <option value="principal">Principal</option>
                      </select>
                    </div>
                    <div>
                      {formData.password && formData.role !== "" ? (
                        <>
                          <label className="block font-semibold mb-1" htmlFor="password">Password</label>
                          <input id="password" type="text" name="password" value={formData.password} readOnly placeholder="Password" className="border rounded p-4 text-lg w-full bg-gray-100 cursor-not-allowed" />
                        </>
                      ) : null}
                    </div>
                  </div>
                  {/* Submit button row */}
                  <div className="col-span-1 md:col-span-3 flex gap-2 mt-4">
                    <button type="submit" disabled={!isFormValid} className={`flex-1 text-white rounded p-4 text-lg ${isFormValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}>{isEditMode ? 'Save Edited Account' : 'Create Account'}</button>
                    {isEditMode && (
                      <button type="button" onClick={() => { setIsEditMode(false); setEditingUser(null); setFormData({ firstname: "", middlename: "", lastname: "", email: "", personalemail: "", schoolID: "", password: "", role: "faculty", userID: "", contactNo: '' }); setShowCreateModal(false); }} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white rounded p-4 text-lg">Cancel Edit</button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Archived Accounts Modal */}
      {showArchivedTable && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-6xl w-full relative max-h-[90vh] overflow-hidden">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold z-10"
              onClick={() => {
                setShowArchivedTable(false);
                setArchivedCurrentPage(1); // Reset to first page when closing
              }}
              aria-label="Close"
            >
              &times;
            </button>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Archived Accounts</h3>
              <div className="text-sm text-gray-600">
                Showing {archivedUsers.length} of archived accounts
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left">
                    <th className="p-4 border-b font-semibold text-gray-700">School ID</th>
                    <th className="p-4 border-b font-semibold text-gray-700">Last Name</th>
                    <th className="p-4 border-b font-semibold text-gray-700">First Name</th>
                    <th className="p-4 border-b font-semibold text-gray-700">Middle Name</th>
                    <th className="p-4 border-b font-semibold text-gray-700">Role</th>
                    <th className="p-4 border-b font-semibold text-gray-700">Archived At</th>
                    <th className="p-4 border-b font-semibold text-gray-700">Days Left</th>
                    <th className="p-4 border-b font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center p-8 text-gray-500">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-lg font-medium">No archived accounts found</p>
                          <p className="text-sm text-gray-400">All accounts are currently active</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    archivedUsers.map((user, idx) => (
                      <tr key={user._id} className={idx % 2 === 0 ? "bg-white hover:bg-gray-50 transition-colors" : "bg-gray-50 hover:bg-gray-100 transition-colors"}>
                        <td className="p-4 border-b font-medium">{formatSchoolId(user.userID)}</td>
                        <td className="p-4 border-b">{user.lastname}</td>
                        <td className="p-4 border-b">{user.firstname}</td>
                        <td className="p-4 border-b">{user.middlename || '-'}</td>
                        <td className="p-4 border-b">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold
                            ${user.role === 'students' ? 'bg-green-100 text-green-700 border border-green-300' :
                              user.role === 'faculty' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                              user.role === 'admin' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                              user.role === 'principal' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                              user.role === 'vice president of education' ? 'bg-pink-100 text-pink-700 border border-pink-300' :
                              'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                            {user.role === 'vice president of education' ? 'Vice President of Education' : user.role}
                          </span>
                        </td>
                        <td className="p-4 border-b text-gray-600">
                          {user.archivedAt ? new Date(user.archivedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : '-'}
                        </td>
                        <td className="p-4 border-b">
                          {user.deletedAt ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              getDaysLeft(user.deletedAt) <= 3 ? 'bg-red-100 text-red-700' :
                              getDaysLeft(user.deletedAt) <= 7 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {getDaysLeft(user.deletedAt)} days left
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-4 border-b">
                          <button
                            onClick={() => handleRecover(user)}
                            className="inline-flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors duration-200 group"
                            title="Recover Account"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.5 19A7.5 7.5 0 0112 4.5c2.485 0 4.5 2.015 4.5 4.5S14.485 13.5 12 13.5c-2.485 0-4.5-2.015-4.5-4.5" />
                            </svg>
                            Recover
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Archived Accounts */}
            {archivedTotalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t">
                <button
                  className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setArchivedCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={archivedCurrentPage === 1}
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Page</span>
                  <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium">
                    {archivedCurrentPage}
                  </span>
                  <span className="text-sm text-gray-600">of {archivedTotalPages}</span>
                </div>
                <button
                  className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setArchivedCurrentPage((prev) => Math.min(archivedTotalPages, prev + 1))}
                  disabled={archivedCurrentPage === archivedTotalPages}
                >
                  Next
                </button>
              </div>
            )}

            {showRecoverSuccess && (
              <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 font-medium">
                ✓ Account recovered successfully!
              </div>
            )}
          </div>
        </div>
      )}
      <ValidationModal
        isOpen={validationModal.isOpen}
        onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
        type={validationModal.type}
        title={validationModal.title}
        message={validationModal.message}
      />
    </>
  );
}
