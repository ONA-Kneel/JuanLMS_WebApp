import { useNavigate } from "react-router-dom";
import { useState } from "react";
import dashboardIcon from "../../../src/assets/dashboard.png";
import classesIcon from "../../../src/assets/classes.png";
import activitiesIcon from "../../../src/assets/activities.png";
import chatsIcon from "../../../src/assets/chats.png";
import progressIcon from "../../../src/assets/progress.png";
import gradesIcon from "../../../src/assets/grades.png";
import calendarIcon from "../../../src/assets/calendar.png";
import dropdown from "../../../src/assets/dropdown.png";

export default function Student_Activities() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upcoming");

  const tabs = [
    { id: "upcoming", label: "Upcoming" },
    { id: "past-due", label: "Past Due" },
    { id: "completed", label: "Completed" },
  ];

  const handleDashboard = () => navigate("/student_dashboard");
  const handleClasses = () => navigate("/student_classes");
  const handleActivities = () => navigate("/student_activities");
  const handleChats = () => navigate("/student_chats");
  const handleProgress = () => navigate("/student_progress");
  const handleGrades = () => navigate("/student_grades");
  const handleCalendar = () => navigate("/student_calendar");

  return (
    <div className="flex min-h-screen">
      <div className="w-1/7 bg-[#010a51] text-white p-6 flex flex-col justify-center">
        <h2 className="text-3xl mb-12 text-center">
          <span className="font-bold">JUAN</span>
          <span className="font-bold italic">LMS</span>
        </h2>
        <nav className="space-y-10 text-2xl flex flex-col items-center h-full">
          <button onClick={handleDashboard} className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]">
            <img src={dashboardIcon} alt="Dashboard" className="w-6 h-6" />
            <span>Dashboard</span>
          </button>
          <button onClick={handleClasses} className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]">
            <img src={classesIcon} alt="Classes" className="w-6 h-6" />
            <span>Classes</span>
          </button>
          <button onClick={handleActivities} className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]">
            <img src={activitiesIcon} alt="Activities" className="w-6 h-6" />
            <span>Activities</span>
          </button>
          <button onClick={handleChats} className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]">
            <img src={chatsIcon} alt="Chats" className="w-6 h-6" />
            <span>Chats</span>
          </button>
          <button onClick={handleProgress} className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]">
            <img src={progressIcon} alt="Progress" className="w-6 h-6" />
            <span>Progress</span>
          </button>
          <button onClick={handleGrades} className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]">
            <img src={gradesIcon} alt="Grades" className="w-6 h-6" />
            <span>Grades</span>
          </button>
          <button onClick={handleCalendar} className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]">
            <img src={calendarIcon} alt="Calendar" className="w-6 h-6 mt-1" />
            <span>Calendar</span>
          </button>
        </nav>
      </div>

      <div className="w-4/4 bg-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="mb-4">
            <h2 className="text-3xl font-bold leading-tight">Activities</h2>
            <p className="text-xl">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center space-x-4 bg-gray-300 p-3 rounded-2xl transition-colors duration-300 hover:bg-gray-400 w-55">
            <span className="bg-blue-900 w-12 h-12 rounded-full"></span>
            <span className="text-xl font-medium">Doe, John</span>
            <img src={dropdown} alt="Arrow" className="absolute w-10 h-9 mt-2 ml-40" />
          </div>
        </div>

        <ul className="flex flex-wrap border-b border-gray-700 text-2xl text-center font-medium text-gray-400">
          {tabs.map((tab) => (
            <li
              key={tab.id}
              className={`me-2 cursor-pointer p-4 ${
                activeTab === tab.id ? "text-black border-b-4 border-blue-500" : "hover:text-gray-600"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {activeTab === "upcoming" && (
            <div>
               <h3 className="text-black text-2xl font-bold mb-4 ml-2"> December 32</h3>
              <div className="bg-[#00418B] pt-4 w-406 h-35 rounded-xl shadow-lg relative mb-4 transition-colors duration-300 hover:bg-[#002d5a]">
                <div className="absolute top-3 right-3 text-white px-3 py-1 font-bold">20 points</div>
                <h3 className="text-white text-2xl font-semibold ml-7">Activity 1</h3>
                <p className="text-white mb-5 ml-7">Due at 11:59 PM</p>
                <p className="text-lg text-white font-medium ml-7">Introduction to Computing</p>
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
      </div>
    </div>
  );
}
