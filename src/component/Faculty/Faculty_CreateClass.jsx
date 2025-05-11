import React, { useState } from "react";
import ProfileMenu from "../ProfileMenu";
import Faculty_Navbar from "./Faculty_Navbar";
import addClass from "../../../src/assets/addClass.png";
import archiveIcon from "../../../src/assets/archive.png";
import createEventIcon from "../../../src/assets/createEvent.png";

export default function FacultyCreateClass() {
  const [studentName, setStudentName] = useState("");  
  const [students, setStudents] = useState([]);        
  const [error, setError] = useState("");             
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [classDesc, setClassDesc] = useState("");
  
  const handleSearch = async (e) => {
    const query = e.target.value;
    setStudentName(query); 

    if (!query) {
      setStudents([]); 
      setError("");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/users/search?q=${query}`);
      const data = await response.json();

      const filteredStudents = data
        .filter(student => student.role === 'student')
        .filter(student => !selectedStudents.some(sel => sel._id === student._id));
      
      if (filteredStudents.length === 0) {
        setError("No student found");
      } else {
        setStudents(filteredStudents);
        setError("");
      }
    } catch (err) {
      console.error("Error fetching student data:", err);
      setError("Error fetching student data");
    }
  };

  const handleAddStudent = (student) => {
    setSelectedStudents(prev => [...prev, student]);
    setStudentName("");
    setStudents([]);
  };

  const handleRemoveStudent = (studentId) => {
    setSelectedStudents(prev => prev.filter(student => student._id !== studentId));
  };

  const handleCreateClass = async () => {
    // Generate classID: C + 3 random digits
    const randomNum = Math.floor(100 + Math.random() * 900);
    const classID = `C${randomNum}`;
    const members = selectedStudents.map(s => s.userID);
    const facultyID = localStorage.getItem("userID"); // get the faculty's userID

    if (!className || !classCode || !classDesc || members.length === 0) {
      alert("Please fill in all fields and add at least one member.");
      return;
    }

    const classData = {
      classID,
      className,
      classCode,
      classDesc,
      members,
      facultyID, // <-- include this
    };

    try {
      const res = await fetch("http://localhost:5000/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classData),
      });
      if (res.ok) {
        alert("Class created successfully!");
        setClassName("");
        setClassCode("");
        setClassDesc("");
        setSelectedStudents([]);
      } else {
        const data = await res.json();
        alert("Error: " + (data.error || "Failed to create class"));
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Classes</h2>
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
        <h3 className="text-4xl font-bold mt-5">Create Class</h3>

        <div className="mt-6 flex flex-col space-y-6 ml-5">
          <input
            type="text"
            placeholder="Class Name"
            className="w-1/2 px-0 pb-2 text-4xl border-b-2 border-black focus:outline-none transition-colors"
            value={className}
            onChange={e => setClassName(e.target.value)}
            onFocus={e => (e.target.style.borderBottomColor = "#00418b")}
            onBlur={e => (e.target.style.borderBottomColor = "black")}
          />
          <input
            type="text"
            placeholder="Class Code"
            className="w-1/5 px-0 pb-2 text-xl border-b-2 border-black focus:outline-none transition-colors"
            value={classCode}
            onChange={e => setClassCode(e.target.value)}
            onFocus={e => (e.target.style.borderBottomColor = "#00418b")}
            onBlur={e => (e.target.style.borderBottomColor = "black")}
          />

          {/* Class Description */}
          <label className="text-4xl font-bold mt-5" htmlFor="classDescription">Class Description</label>
          <textarea
            id="classDescription"
            placeholder="Enter class description..."
            className="w-1/2 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00418b] text-base resize-none"
            rows={3}
            value={classDesc}
            onChange={e => setClassDesc(e.target.value)}
          />

          <h3 className="text-4xl font-bold mt-5">Members</h3>
          <input
            type="text"
            placeholder="Enter Student Name"
            className="w-1/2 px-0 pb-2 text-xl border-b-2 border-black focus:outline-none transition-colors"
            value={studentName}
            onChange={handleSearch}
            onFocus={(e) => (e.target.style.borderBottomColor = "#00418b")}
            onBlur={(e) => (e.target.style.borderBottomColor = "black")}
          />

          <div className="mt-4 w-1/2">
            {error && <p className="text-red-500">{error}</p>}
            <ul className="space-y-2 w-full">
              {students.map((student) => (
                <li
                  key={student._id}
                  className="flex items-center bg-gray-300 hover:bg-gray-400 transition-colors cursor-pointer px-4 py-2 rounded font-poppinsr"
                  onClick={() => handleAddStudent(student)}
                >
                  <span className="font-bold mr-2">{student.lastname}, {student.firstname}</span>
                </li>
              ))}
            </ul>
          </div>

          {selectedStudents.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-4">Class Members:</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 border w-1/6">User ID</th>
                      <th className="p-3 border w-1/6">Last Name</th>
                      <th className="p-3 border w-1/6">First Name</th>
                      <th className="p-3 border w-1/6">Middle Name</th>
                      <th className="p-3 border w-1/6">Email</th>
                      <th className="p-3 border w-1/6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudents.map((student) => (
                      <tr key={student._id}>
                        <td className="p-3 border">{student.userID || '-'}</td>
                        <td className="p-3 border">{student.lastname}</td>
                        <td className="p-3 border">{student.firstname}</td>
                        <td className="p-3 border">{student.middlename}</td>
                        <td className="p-3 border">{student.email}</td>
                        <td className="p-3 border">
                          <button
                            onClick={() => handleRemoveStudent(student._id)}
                            className="bg-white hover:bg-gray-200 text-red-600 rounded px-2 py-1 text-xs"
                            style={{ transition: 'background 0.2s' }}
                          >
                            <img src={archiveIcon} alt="Remove" className="w-8 h-8 inline-block" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-center">
        <button
          className="bg-blue-900 hover:bg-blue-800 rounded-full w-20 h-20 flex items-center justify-center shadow-lg transition-colors"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          onClick={handleCreateClass}
        >
          <img src={createEventIcon} alt="Create" className="w-10 h-10" />
        </button>
        <span className="mt-2 font-semibold text-blue-900">Create</span>
      </div>
    </div>
  );
}
