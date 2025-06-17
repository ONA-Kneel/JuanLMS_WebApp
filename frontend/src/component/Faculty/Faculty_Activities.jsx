import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Faculty_Activities() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const navigate = useNavigate();
  const tabs = [
    { id: "upcoming", label: "Upcoming" },
    { id: "past-due", label: "Past Due" },
    { id: "completed", label: "Completed" },
  ];
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  useEffect(() => {
    async function fetchAcademicYearAndTerm() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const year = await yearRes.json();
          setAcademicYear(year);
        }
        const termRes = await fetch(`${API_BASE}/api/terms/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (termRes.ok) {
          const term = await termRes.json();
          setCurrentTerm(term);
        }
      } catch (err) {
        console.error("Failed to fetch academic year or term", err);
      }
    }
    fetchAcademicYearAndTerm();
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Activities</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `AY: ${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              {currentTerm ? `Current Term: ${currentTerm.termName}` : "Loading..."} | 
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

        {/* Add Create Activity/Quiz Button */}
        <div className="flex justify-end mb-4">
          <button
            className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950"
            onClick={() => navigate('/create-activity')}
          >
            + Create Activity/Quiz
          </button>
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === "upcoming" && (
            <div>
              <h3 className="text-black text-2xl font-bold mb-4">December 32</h3>
              <div className="bg-[#00418B] p-4 rounded-xl shadow-lg mb-4 hover:bg-[#002d5a] relative">
                <div className="absolute top-3 right-3 text-white px-3 py-1 font-bold">20 points</div>
                <h3 className="text-white text-xl md:text-2xl font-semibold">Activity 1</h3>
                <p className="text-white">Due at 11:59 PM</p>
                <p className="text-lg text-white font-medium">Introduction to Computing</p>
              </div>
            </div>
          )}
          {activeTab === "past-due" && (
            <div>
              <h3 className="text-2xl font-semibold">Past Due</h3>
              <p className="mt-4">No activities here.</p>
            </div>
          )}
          {activeTab === "completed" && (
            <div>
              <h3 className="text-2xl font-semibold">Completed</h3>
              <p className="mt-4">No completed activities yet.</p>
            </div>
          )}
        </div>

        {/* Modal code removed, now handled by /create-activity page */}
      </div>
    </div>
  );
}
