import { useState, useEffect } from "react";
import ProfileMenu from "../ProfileMenu";
import Admin_Navbar from "./Admin_Navbar";
import editIcon from "../../assets/editing.png";
import archiveIcon from "../../assets/archive.png";

export default function Admin_Accounts() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showArchiveSuccess, setShowArchiveSuccess] = useState(false);
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
  const [suggestedEmail, setSuggestedEmail] = useState("");
  const [pendingFormData, setPendingFormData] = useState(null);
  const [userToArchive, setUserToArchive] = useState(null);
  
  const [formData, setFormData] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    email: "",
    personalemail: "",
    contactno: "",
    password: "",
    role: "students",
    userID: "", // invisible field
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState(""); // "" means show all
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Placeholder archived users data
  const [archivedUsers, setArchivedUsers] = useState([
    {
      _id: "1",
      userID: "S101",
      lastname: "Doe",
      firstname: "Jane",
      middlename: "A.",
      role: "students",
      archivedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      deletedAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days left
    },
    {
      _id: "2",
      userID: "F202",
      lastname: "Smith",
      firstname: "John",
      middlename: "B.",
      role: "faculty",
      archivedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      deletedAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days left
    },
  ]);

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
  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:5000/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
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
    const matchesRole = roleFilter === "" || (user.role || "") === roleFilter;
    const matchesUserID = searchTerms.userID === "" || (user.userID || "").toLowerCase().includes(searchTerms.userID.toLowerCase());
    return matchesFirst && matchesLast && matchesMiddle && matchesRole && matchesUserID;
  });
  
  // First, paginate filteredUsers, then sort only the users on the current page
  const paginatedUnsortedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedUsers = [...paginatedUnsortedUsers].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = (a[sortConfig.key] || "").toLowerCase();
    const bValue = (b[sortConfig.key] || "").toLowerCase();
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (showArchivedTable) {
      fetch('http://localhost:5000/users/archived-users')
        .then(res => res.json())
        .then(data => setArchivedUsers(data));
    }
  }, [showArchivedTable]);

  const handleChange = (e) => {
    const { name, value } = e.target;
  
    // For contact number: allow only digits, max 11, must start with 09
    if (name === "contactno") {
      let digitsOnly = value.replace(/\D/g, ""); // remove non-digits
      if (digitsOnly.length > 11) digitsOnly = digitsOnly.slice(0, 11);
      if (digitsOnly && !digitsOnly.startsWith("09")) digitsOnly = "09";
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Auto-generate school email when firstname, lastname, or role changes
  useEffect(() => {
    const { firstname, lastname, role } = formData;

    const clean = (str) =>
      str
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "") // remove spaces
        .replace(/[^a-z]/g, ""); // remove non-letters

    if (firstname && lastname) {
      const generatedEmail = role === "faculty" 
        ? `${clean(firstname)}.${clean(lastname)}@sjddef.edu.ph`
        : `${clean(firstname)}.${clean(lastname)}@${role}.sjddef.edu.ph`;
      setFormData((prev) => ({ ...prev, email: generatedEmail }));
    } else {
      setFormData((prev) => ({ ...prev, email: "" }));
    }
  }, [formData.firstname, formData.lastname, formData.role]);

  const handleSubmit = async (e, overrideEmail = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const requiredFields = ["firstname", "lastname", "email", "password", "role"];
    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill in ${field}.`);
        return;
      }
    }
    // Contact number validation for all roles
    if (!/^09\d{9}$/.test(formData.contactno)) {
      alert("Contact number must be a valid PH mobile number (11 digits, starts with 09)");
      return;
    }
    if (isEditMode) {
      // Validate if any changes were made
      const hasChanges = 
        formData.firstname !== editingUser.firstname ||
        formData.middlename !== (editingUser.middlename || "") ||
        formData.lastname !== editingUser.lastname ||
        formData.contactno !== (editingUser.contactno || "") ||
        formData.role !== editingUser.role;

      if (!hasChanges) {
        alert("No changes were made to the account.");
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
      };

      if (formData.role === "students") {
        accountData = {
          ...accountData,
          yearLevelAssigned: null, // This one was already correctly named as per previous request
          programAssigned: null,   // Was programHandle
          courseAssigned: null,    // Was courseHandle
          sectionAssigned: null,   // Was sectionHandle
        };
      }

      try {
        const res = await fetch("http://localhost:5000/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(accountData),
        });
        const data = await res.json();
        if (res.ok) {
          setShowCreateSuccess(true);
          setFormData({
            firstname: "",
            middlename: "",
            lastname: "",
            email: "",
            personalemail: "",
            contactno: "",
            password: "",
            role: "students",
            userID: "",
          });
          fetchUsers();
        } else if (res.status === 409 && data.suggestedEmail) {
          setSuggestedEmail(data.suggestedEmail);
          setPendingFormData({ ...formData, userID });
          setDuplicateEmailModal(true);
        } else {
          alert("Error: " + (data.error || "Failed to create account"));
        }
      } catch (err) {
        console.error(err);
        alert("Something went wrong.");
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

      const res = await fetch(`http://localhost:5000/users/${editingUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: formData.firstname,
          middlename: formData.middlename,
          lastname: formData.lastname,
          email: formData.email.toLowerCase(),
          contactno: formData.contactno,
          password: formData.password,
          personalemail: formData.personalemail,
          role: formData.role,
          userID: updatedUserID
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
            contactno: "",
            password: "",
            role: "students",
            userID: "",
          });
        }, 2000);
      } else {
        alert("Failed to update account: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while updating the account.");
    }
  };

  const cancelSave = () => {
    setShowSaveConfirm(false);
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password }));
  };

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
      contactno: user.contactno || "",
      password: user.password,
      role: user.role,
      userID: user.userID
    });
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

    if (!adminId) {
      setArchivePasswordError("Admin not logged in.");
      return;
    }

    const res = await fetch(`http://localhost:5000/users/archive/${userToArchive._id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminId,
        adminPassword: archivePassword
      })
    });

    if (res.ok) {
      setShowArchivePasswordModal(false);
      setShowArchiveSuccess(true);
      setUsers(prev => prev.filter(u => u._id !== userToArchive._id));
      setUserToArchive(null);
      setTimeout(() => setShowArchiveSuccess(false), 2000);
      fetchUsers(); // Refresh the users list from the backend
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
    const res = await fetch(`http://localhost:5000/users/archived-users/${user._id}/recover`, {
      method: 'POST'
    });
    if (res.ok) {
      setArchivedUsers(prev => prev.filter(u => u._id !== user._id));
      fetchUsers(); // Refresh active users
      setShowRecoverSuccess(true);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Admin_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Create Accounts</h2>
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

        <div className="bg-white p-6 rounded-xl shadow mb-10">
          <h3 className="text-xl font-semibold mb-4">{isEditMode ? 'Edit Account' : 'New Account'}</h3>

          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <input
              type="text"
              name="firstname"
              value={formData.firstname}
              onChange={handleChange}
              placeholder="First Name"
              className="border rounded p-2"
              required
            />
            <input
              type="text"
              name="middlename"
              value={formData.middlename}
              onChange={handleChange}
              placeholder="Middle Name"
              className="border rounded p-2"
            />
            <input
              type="text"
              name="lastname"
              value={formData.lastname}
              onChange={handleChange}
              placeholder="Last Name"
              className="border rounded p-2"
              required
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              readOnly
              placeholder="School Email (auto-generated)"
              className="border rounded p-2 bg-gray-100 cursor-not-allowed"
              required
            />
            <input
              type="email"
              name="personalemail"
              value={formData.personalemail}
              onChange={handleChange}
              placeholder="Personal Email"
              className="border rounded p-2"
              required
            />
            <input
              type="text"
              name="contactno"
              value={formData.contactno}
              onChange={handleChange}
              placeholder="Contact Number (Optional)"
              className="border rounded p-2"
              required
            />
            <div className="flex gap-2">
              <input
                type="text"
                name="password"
                value={formData.password}
                readOnly
                placeholder="Password"
                className="border rounded p-2 flex-1 bg-gray-100 cursor-not-allowed"
              />

              {!isEditMode && (
                <button
                  type="button"
                  onClick={generatePassword}
                  className="bg-gray-300 hover:bg-gray-400 text-sm px-3 py-2 rounded"
                >
                  Generate
                </button>
              )}
            </div>

            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="border rounded p-2"
              required
            >
              <option value="students">Students</option>
              <option value="faculty">Faculty</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
              <option value="director">Director</option>
            </select>

            <div className="col-span-1 md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={!formData.password}
                className={`flex-1 text-white rounded p-2 mt-2 ${
                  formData.password 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {isEditMode ? 'Save Edited Account' : 'Create Account'}
              </button>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(false);
                    setEditingUser(null);
                    setFormData({
                      firstname: "",
                      middlename: "",
                      lastname: "",
                      email: "",
                      personalemail: "",
                      contactno: "",
                      password: "",
                      role: "students",
                      userID: "",
                    });
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white rounded p-2 mt-2"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Button to view archived accounts */}
        <div className="mb-4">
          <button
            className="bg-gray-700 hover:bg-gray-900 text-white px-4 py-2 rounded"
            onClick={() => setShowPasswordModal(true)}
          >
            View Archived Accounts
          </button>
        </div>

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

        {/* Show archived table OR users table, not both */}
        {showArchivedTable ? (
          <div className="mt-8">
            <h4 className="text-lg font-semibold mb-2">Archived Users</h4>
            <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3 border w-1/6">User ID</th>
                  <th className="p-3 border w-1/6">Last Name</th>
                  <th className="p-3 border w-1/6">First Name</th>
                  <th className="p-3 border w-1/6">Middle Name</th>
                  <th className="p-3 border w-1/6">Role</th>
                  <th className="p-3 border w-1/6">Time Left</th>
                  <th className="p-3 border w-1/6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {archivedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-4 text-gray-500">
                      No archived users found.
                    </td>
                  </tr>
                ) : (
                  archivedUsers.map((user) => (
                    <tr key={user._id}>
                      <td className="p-3 border">{user.userID || '-'}</td>
                      <td className="p-3 border">{user.lastname}</td>
                      <td className="p-3 border">{user.firstname}</td>
                      <td className="p-3 border">{user.middlename}</td>
                      <td className="p-3 border capitalize">{user.role}</td>
                      <td className="p-3 border">{getDaysLeft(user.deletedAt)} days left</td>
                      <td className="p-3 border">
                        <button
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                          onClick={() => handleRecover(user)}
                        >
                          Recover Account
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <button
              className="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              onClick={() => setShowArchivedTable(false)}
            >
              Back to Active Accounts
            </button>

            {/* Recover Success Message */}
            {showRecoverSuccess && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                  <h3 className="text-xl font-semibold mb-2 text-green-600">Account Recovered</h3>
                  <button
                    onClick={() => setShowRecoverSuccess(false)}
                    className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8">
            <h4 className="text-lg font-semibold mb-2">Users</h4>
            <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3 border w-1/6 cursor-pointer select-none" onClick={() => handleSort("userID")}>
                    User ID {sortConfig.key === "userID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="p-3 border w-1/6 cursor-pointer select-none" onClick={() => handleSort("lastname")}>
                    Last Name {sortConfig.key === "lastname" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="p-3 border w-1/6 cursor-pointer select-none" onClick={() => handleSort("firstname")}>
                    First Name {sortConfig.key === "firstname" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="p-3 border w-1/6 cursor-pointer select-none" onClick={() => handleSort("middlename")}>
                    Middle Name {sortConfig.key === "middlename" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="p-3 border w-1/6">Role</th>
                  <th className="p-3 border w-1/6">Actions</th>
                </tr>

                {/* New row for search inputs */}
                <tr className="bg-white text-left">
                  <th className="p-2 border">
                    <input type="text" placeholder="Search User ID" className="w-full border rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, userID: e.target.value }))} />
                  </th>
                  <th className="p-2 border">
                    <input type="text" placeholder="Search Last Name" className="w-full border rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, lastname: e.target.value }))} />
                  </th>
                  <th className="p-2 border">
                    <input type="text" placeholder="Search First Name" className="w-full border rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, firstname: e.target.value }))} />
                  </th>
                  <th className="p-2 border">
                    <input type="text" placeholder="Search Middle Name" className="w-full border rounded px-2 py-1 text-sm" onChange={(e) => setSearchTerms((prev) => ({ ...prev, middlename: e.target.value }))} />
                  </th>
                  <th className="p-2 border">
                    <select className="w-full border rounded px-2 py-1 text-sm" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                      <option value="">All Roles</option>
                      <option value="students">Students</option>
                      <option value="faculty">Faculty</option>
                      <option value="parent">Parent</option>
                      <option value="admin">Admin</option>
                      <option value="director">Director</option>
                    </select>
                  </th>
                  <th className="p-2 border"></th>
                </tr>
              </thead>

              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-4 text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user._id}>
                      <td className="p-3 border">{user.userID || '-'}</td>
                      <td className="p-3 border">{user.lastname}</td>
                      <td className="p-3 border">{user.firstname}</td>
                      <td className="p-3 border">{user.middlename}</td>
                      <td className="p-3 border capitalize">{user.role}</td>
                      <td className="p-3 border">
                        <div className="inline-flex space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                          >
                            <img src={editIcon} alt="Edit" className="w-8 h-8 inline-block" />
                          </button>
                          <button
                            onClick={() => handleArchive(user)}
                            className="bg-red-500 hover:bg-red-800 text-white px-2 py-1 text-xs rounded"
                          >
                            <img src={archiveIcon} alt="Archive" className="w-8 h-8 inline-block" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

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

            {/* Archive Success Message */}
            {showArchiveSuccess && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                  <h3 className="text-xl font-semibold mb-2 text-green-600">Account Archived</h3>
                  <button
                    onClick={() => setShowArchiveSuccess(false)}
                    className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-xl font-semibold mb-2 text-green-600">Account Created Successfully</h3>
              <p className="text-gray-600 mb-4">The new account has been created and added to the system.</p>
              <button
                onClick={() => setShowCreateSuccess(false)}
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
                Suggested email: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{suggestedEmail}</span>
              </p>
              <p className="mb-4">Do you want to proceed with this suggested email?</p>
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
                      // Resubmit with suggested email
                      await handleSubmit(null, suggestedEmail);
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
      </div>
    </div>
  );
}
