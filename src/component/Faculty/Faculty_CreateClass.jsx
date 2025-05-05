import React, { useState } from "react";
import ProfileMenu from "../ProfileMenu";
import Faculty_Navbar from "./Faculty_Navbar";
import addClass from "../../../src/assets/addClass.png";

export default function FacultyCreateClass() {
  const [studentName, setStudentName] = useState("");  
  const [students, setStudents] = useState([]);        
  const [error, setError] = useState("");             
  
  const handleSearch = async (e) => {
    const query = e.target.value;
    setStudentName(query); 

    if (!query) {
      setStudents([]); 
      setError("");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/search?q=${query}`);
      const data = await response.json();

      const filteredStudents = data.filter(student => student.role === 'student');
      
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr">

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
            onFocus={(e) => (e.target.style.borderBottomColor = "#00418b")}
            onBlur={(e) => (e.target.style.borderBottomColor = "black")}
          />
          <input
            type="text"
            placeholder="Class Code"
            className="w-1/5 px-0 pb-2 text-xl border-b-2 border-black focus:outline-none transition-colors"
            onFocus={(e) => (e.target.style.borderBottomColor = "#00418b")}
            onBlur={(e) => (e.target.style.borderBottomColor = "black")}
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

          <div className="mt-4">
            {error && <p className="text-red-500">{error}</p>}
            <ul>
              {students.map((student) => (
                <li key={student._id} className="text-lg text-blue-600">
                  {student.firstname} {student.middlename} {student.lastname}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
