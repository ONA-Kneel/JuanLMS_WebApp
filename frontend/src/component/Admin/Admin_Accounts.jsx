import { useState, useEffect } from "react";
import ProfileMenu from "../ProfileMenu";
import Admin_Navbar from "./Admin_Navbar";
import editIcon from "../../assets/editing.png";
import archiveIcon from "../../assets/archive.png";

export default function Admin_Accounts() {
  
  const [formData, setFormData] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    email: "",
    personalemail: "",
    contactno: "",
    password: "",
    role: "student",
    userID: "", // invisible field
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState(""); // "" means show all

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
  
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = (a[sortConfig.key] || "").toLowerCase();
    const bValue = (b[sortConfig.key] || "").toLowerCase();
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    fetchUsers();
  }, []);
  

  const handleChange = (e) => {
    const { name, value } = e.target;
  
    // For contact number: allow only digits
    if (name === "contactno") {
      const digitsOnly = value.replace(/\D/g, ""); // remove non-digits
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
      const generatedEmail = `${clean(firstname)}.${clean(lastname)}@${role}.sjddef.edu.ph`;
      setFormData((prev) => ({ ...prev, email: generatedEmail }));
    } else {
      setFormData((prev) => ({ ...prev, email: "" }));
    }
  }, [formData.firstname, formData.lastname, formData.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const requiredFields = ["firstname", "lastname", "email", "password", "role"];
    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill in ${field}.`);
        return;
      }
    }
  
    // Validate contact number (optional but must be valid if provided)
    if (formData.contactno && formData.contactno.length !== 11) {
      alert("Contact number must be exactly 11 digits.");
      return;
    }
  
    // Generate userID here (only once per account creation)
    const randomNum = Math.floor(100 + Math.random() * 900);
    const userID = `${formData.role.charAt(0).toUpperCase()}${randomNum}`;
  
    try {
      const res = await fetch("http://localhost:5000/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, userID }), // include userID
      });
  
      const data = await res.json();
      if (res.ok) {
        alert("Account created successfully!");
        setFormData({
          firstname: "",
          middlename: "",
          lastname: "",
          email: "",
          personalemail: "",
          contactno: "",
          password: "",
          role: "student",
          userID: "", // invisible field
        });
        fetchUsers(); // ✅ Refresh user list
      }
       else {
        alert("Error: " + (data.error || "Failed to create account"));
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
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
          <h3 className="text-xl font-semibold mb-4">New Account</h3>

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
              placeholder="Personal Email (optional)"
              className="border rounded p-2"
            />
            <input
              type="text"
              name="contactno"
              value={formData.contactno}
              onChange={handleChange}
              placeholder="Contact Number"
              className="border rounded p-2"
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

              <button
                type="button"
                onClick={generatePassword}
                className="bg-gray-300 hover:bg-gray-400 text-sm px-3 py-2 rounded"
              >
                Generate
              </button>
            </div>


            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="border rounded p-2"
              required
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
              <option value="director">Director</option>
            </select>

            <button
              type="submit"
              className="col-span-1 md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white rounded p-2 mt-2"
            >
              Create Account
            </button>
          </form>
        </div>
        <div className="mt-8">
        <h4 className="text-lg font-semibold mb-2">Users</h4>
        <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
        <thead>
  <tr className="bg-gray-100 text-left">
    <th className="p-3 border w-1/6 cursor-pointer select-none" onClick={() => handleSort("userID")}>User ID {sortConfig.key === "userID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
    <th className="p-3 border w-1/6 cursor-pointer select-none" onClick={() => handleSort("lastname")}>Last Name {sortConfig.key === "lastname" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
    <th className="p-3 border w-1/6 cursor-pointer select-none" onClick={() => handleSort("firstname")}>First Name {sortConfig.key === "firstname" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
    <th className="p-3 border w-1/6 cursor-pointer select-none" onClick={() => handleSort("middlename")}>Middle Name {sortConfig.key === "middlename" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
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
        <option value="student">Student</option>
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
    sortedUsers.map((user) => (
      <tr key={user._id}>
        <td className="p-3 border">{user.userID || '-'}</td>
        <td className="p-3 border">{user.lastname}</td>
        <td className="p-3 border">{user.firstname}</td>
        <td className="p-3 border">{user.middlename}</td>
        <td className="p-3 border capitalize">{user.role}</td>
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
  )}
</tbody>

        </table>
      </div>

      </div>
    </div>
  );
}
