import React, { useEffect, useState } from "react";
import compClassesIcon from "../../assets/compClassesIcon.png";
import compAssignsIcon from "../../assets/compAssignsIcon.png";
import dueAssignsIcon from "../../assets/dueAssignsIcon.png";
import arrowRight from "../../assets/arrowRight.png";

import Student_Navbar from "./Student_Navbar";
import ProfileModal from "../ProfileModal";
import Login from "../Login";
import ProfileMenu from "../ProfileMenu";
import { Link } from 'react-router-dom';

export default function Student_Dashboard() {
  // Define the classTitles object
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classProgress, setClassProgress] = useState({}); // { classID: percent }

  // Get current userID (adjust as needed for your auth)
  const currentUserID = localStorage.getItem("userID");

  useEffect(() => {
    async function fetchClasses() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://https://juanlms-webapp-server.onrender.com/classes", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await res.json();
        // Only include classes where the current user is a member
        const filtered = data.filter(cls => cls.members.includes(currentUserID));
        setClasses(filtered);

        // --- Fetch progress for each class ---
        const progressMap = {};
        for (const cls of filtered) {
          // Fetch lessons for this class
          const lessonRes = await fetch(`http://https://juanlms-webapp-server.onrender.com/lessons?classID=${cls.classID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const lessons = await lessonRes.json();
          let totalPages = 0;
          let totalRead = 0;
          for (const lesson of lessons) {
            if (lesson.files && lesson.files.length > 0) {
              for (const file of lesson.files) {
                // Fetch progress for this file
                try {
                  const progRes = await fetch(`http://https://juanlms-webapp-server.onrender.com/lessons/lesson-progress?lessonId=${lesson._id}&fileUrl=${encodeURIComponent(file.fileUrl)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  const prog = await progRes.json();
                  if (prog && prog.totalPages) {
                    totalPages += prog.totalPages;
                    totalRead += Math.min(prog.lastPage, prog.totalPages);
                  } else if (file.totalPages) {
                    totalPages += file.totalPages;
                  }
                } catch { /* ignore progress fetch errors */ }
              }
            }
          }
          let percent = 0;
          if (totalPages > 0) {
            percent = Math.round((totalRead / totalPages) * 100);
          }
          progressMap[cls.classID] = percent;
        }
        setClassProgress(progressMap);
      } catch (err) {
        console.error("Failed to fetch classes", err);
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, [currentUserID]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      <Student_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto  font-poppinsr md:ml-64">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Student Dashboard</h2>
            <p className="text-base md:text-lg"> Academic Year and Term here | 
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

        {/* Overview Section */}
        <h3 className="text-lg md:text-xl font-semibold mb-3">Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[
            { icon: compClassesIcon, value: "0%", label: "Completed Classes", bg: "bg-gray-300", text: "text-black" },
            { icon: compAssignsIcon, value: "0%", label: "Completed Assignments", bg: "bg-[#00418b]", text: "text-white" },
            { icon: dueAssignsIcon, value: "You're good mah dude! :3 No due assignments", label: "", bg: "bg-gray-300", text: "text-black" },
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

        {/* Recent Classes Section */}
        <h3 className="text-lg md:text-4xl font-bold mb-3">Recent Classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p>Loading...</p>
          ) : classes.length === 0 ? (
            <p>No classes found.</p>
          ) : (
            classes.map((cls) => (
              <Link
                to={`/student_class/${cls.classID}`}
                key={cls.classID}
                className="relative bg-[#00418b] text-white p-4 md:p-6 rounded-2xl hover:bg-[#002b5c] transition flex flex-col justify-between"
                style={{ textDecoration: 'none' }}
              >
                <h4 className="text-base md:text-lg font-semibold">{cls.className}</h4>
                <p className="text-sm mt-1">
                  {classProgress[cls.classID] === 100
                    ? 'Completed'
                    : classProgress[cls.classID] > 0
                      ? `${classProgress[cls.classID]}% Resume`
                      : '0%'}
                </p>
                <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${classProgress[cls.classID] || 0}%` }}></div>
                </div>
                <img src={arrowRight} alt="Arrow" className="absolute top-4 right-4 w-5 h-5" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
