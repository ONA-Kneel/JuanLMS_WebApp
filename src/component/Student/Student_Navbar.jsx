import React, { useState } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import dashboardIcon from "../../../src/assets/dashboard.png";
import classesIcon from "../../../src/assets/classes.png";
import activitiesIcon from "../../../src/assets/activities.png";
import chatsIcon from "../../../src/assets/chats.png";
import progressIcon from "../../../src/assets/progress.png";
import gradesIcon from "../../../src/assets/grades.png";
import calendarIcon from "../../../src/assets/calendar.png";
import logo5 from "../../assets/logo/Logo5.svg";
import { Menu, X } from 'lucide-react';

const Student_Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

<<<<<<< Updated upstream
=======
<<<<<<< HEAD
>>>>>>> Stashed changes
  const navItems = [
    { path: "/student_dashboard", icon: dashboardIcon, label: "DASHBOARD" },
    { path: "/student_classes", icon: classesIcon, label: "CLASSES" },
    { path: "/student_activities", icon: activitiesIcon, label: "ACTIVITIES" },
    { path: "/student_chats", icon: chatsIcon, label: "CHATS" },
    { path: "/student_progress", icon: progressIcon, label: "PROGRESS" },
    { path: "/student_grades", icon: gradesIcon, label: "GRADES" },
    { path: "/student_calendar", icon: calendarIcon, label: "CALENDAR" },
  ];
<<<<<<< Updated upstream
=======
=======
    const navItems = [
        { path: "/student_dashboard", icon: dashboardIcon, label: "Dashboard" },
        { path: "/student_classes", icon: classesIcon, label: "Classes" },
        { path: "/student_activities", icon: activitiesIcon, label: "Activities" },
        { path: "/student_chats", icon: chatsIcon, label: "Chats" },
        { path: "/student_progress", icon: progressIcon, label: "Progress" },
        { path: "/student_grades", icon: gradesIcon, label: "Grades" },
        { path: "/student_calendar", icon: calendarIcon, label: "Calendar" },
    ];
>>>>>>> parent of 3a1f4c8 (INAYOS KO NAVBAR THEN YUNG ADD ACCOUNTS)
>>>>>>> Stashed changes

  return (
    <>
      {/* Toggle Button (fixed top-left on mobile) */}
      <button
        className="md:hidden fixed top-4 left-4 z-40 bg-[#010a51] text-white p-2 rounded-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

<<<<<<< Updated upstream
=======
<<<<<<< HEAD
>>>>>>> Stashed changes
      {/* Sidebar (always fixed, responsive visibility) */}
      <div
        className={`bg-[#010a51] text-white p-4 w-64 h-screen fixed top-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:block font-poppinsr`}
        style={{ overflowY: 'auto' }}
      >
        <div className="flex justify-center md:justify-start items-center mb-6 p-3">
          <img src={logo5} className='w-40 ml-0 md:ml-3' alt="Logo" />
<<<<<<< Updated upstream
=======
=======
            <nav className={`bg-[#010a51] z-20 relative ml-1.5 space-y-6 flex-col ${isOpen ? "flex" : "hidden"} md:flex`}>
                {navItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => navigate(item.path)} // Navigate to the path
                        className={`text-lg flex items-center space-x-3 p-2 w-full rounded-lg transition-colors 
                            ${location.pathname === item.path ? "bg-[#1976d2]" : "hover:bg-[#1a237e]"}`} // Active frame has a lighter background over a darker hover color
                    >
                        <img src={item.icon} alt={item.label} className="w-6 h-6" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
>>>>>>> parent of 3a1f4c8 (INAYOS KO NAVBAR THEN YUNG ADD ACCOUNTS)
>>>>>>> Stashed changes
        </div>

        <nav className="space-y-6 flex flex-col ml-1.5">
          {navItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                navigate(item.path);
                setIsOpen(false);
              }}
              className={`text-lg flex items-center space-x-3 p-2 w-full rounded-lg transition-colors 
                ${location.pathname === item.path ? "bg-[#1976d2]" : "hover:bg-[#1a237e]"}`}
            >
              <img src={item.icon} alt={item.label} className="w-6 h-6" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Student_Navbar;
