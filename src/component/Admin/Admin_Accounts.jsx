import { useState, useEffect } from "react";
import ProfileMenu from "../ProfileMenu";
import Admin_Navbar from "./Admin_Navbar";

export default function Admin_Accounts() {
  const [formData, setFormData] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    email: "",
    personalemail: "",
    contactno: "",
    password: "",
    role: "students",
  });

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
  
    try {
      const res = await fetch("http://localhost:5000/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
          role: "students",
        });
      } else {
        alert("Error: " + (data.error || "Failed to create account"));
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
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
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className="border rounded p-2"
              required
            />

            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="border rounded p-2"
              required
            >
              <option value="students">Student</option>
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
      </div>
    </div>
  );
}
