import React, { useEffect, useState } from "react";
import Faculty_Navbar from "./Faculty_Navbar";

import ProfileModal from "../ProfileModal"; 

import compClassesIcon from "../../../src/assets/compClassesIcon.png";
import arrowRight from "../../../src/assets/arrowRight.png";
import ProfileMenu from "../ProfileMenu";
import createEvent from "../../assets/createEvent.png";

export default function Faculty_Dashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentFacultyID = localStorage.getItem("userID");

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch("http://localhost:5000/classes");
        const data = await res.json();
        const filtered = data.filter(cls => cls.facultyID === currentFacultyID);
        setClasses(filtered);
      } catch (err) {
        console.error("Failed to fetch classes", err);
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, [currentFacultyID]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr md:ml-64">
      <Faculty_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Faculty Dashboard</h2>
            <p className="text-base md:text-lg">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <ProfileMenu/>
        </div>

        <h3 className="text-lg md:text-xl font-semibold mb-3">Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[
            { icon: compClassesIcon, value: "0%", label: "Class Completion", bg: "bg-gray-300", text: "text-black" },
            { value: "Urgent Meeting", label: "https://www./......", bg: "bg-[#00418b]", text: "text-white" }
          ].map((item, index) => (
            <div key={index} className={`${item.bg} rounded-2xl p-4 md:p-6 flex items-start space-x-4 hover:scale-105 transform transition`}>
              <img src={item.icon} alt={item.label} className="w-10 h-10" />
              <div>
                <p className={`text-base font-bold ${item.text}`}>{item.value}</p>
                <p className={`text-sm ${item.text}`}>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-lg md:text-4xl font-bold mb-3">Current Term Classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p>Loading...</p>
          ) : classes.length === 0 ? (
            <p>No classes found.</p>
          ) : (
            classes.map(cls => (
              <div
                key={cls.classID}
                className="relative bg-[#00418b] text-white p-4 md:p-6 rounded-2xl hover:bg-[#002b5c] transition flex flex-col justify-between"
              >
                <h4 className="text-base md:text-lg font-semibold">{cls.className}</h4>
                <p className="text-sm mt-1">0% progress</p>
                <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
                  <div className="bg-blue-500 h-full rounded-full w-[0%]"></div>
                </div>
                <img src={arrowRight} alt="Arrow" className="absolute top-4 right-4 w-5 h-5" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
