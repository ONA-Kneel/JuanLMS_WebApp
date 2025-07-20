import React, { useState } from 'react';
import { useLocation } from "react-router-dom";
import dashboardIcon from "../../assets/dashboard.png";
import classesIcon from "../../assets/classes.png";
import activitiesIcon from "../../assets/activities.png";
import chatsIcon from "../../assets/chats.png";
import gradesIcon from "../../assets/grades.png";
import calendarIcon from "../../assets/calendar.png";
import logo5 from "../../assets/logo/Logo5.svg";
import { Menu, X } from 'lucide-react';
import meetingIcon from "../../assets/editEvent.png";
import logo6 from "../../assets/logo/SJDD Logo.svg";

const Faculty_Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const navItems = [

        { path: "/faculty_dashboard", icon: dashboardIcon, label: "DASHBOARD" },
        { path: "/faculty_classes", icon: classesIcon, label: "CLASSES" },
        { path: "/faculty_activities", icon: activitiesIcon, label: "ACTIVITIES" },
        { path: "/faculty_chats", icon: chatsIcon, label: "CHATS" },
        { path: "/faculty_grades", icon: gradesIcon, label: "GRADES" },
        { path: "/faculty_calendar", icon: calendarIcon, label: "CALENDAR" },
        { path: "/faculty_meeting", icon: meetingIcon, label: "MEETING" },
    ];

    return (
        <>
            <div>
                <button
                    className="md:hidden fixed top-4 left-4 z-40 bg-[#010a51] text-white p-2 rounded-lg"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
            <div
                className={`bg-[#010a51] text-white p-4 w-64 h-screen fixed top-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:block font-poppinsr`}
                style={{ overflowY: 'auto' }}
            >
                {/* Logo */}
                <div className="flex justify-center md:justify-start items-center mb-6 p-3 flex-col">
                    <div className='flex justify-center items-center'>
                        <img src={logo6} className='w-25 h-25 ml-0 md:ml-0 p-0' alt="Logo" />
                    </div>
                    <div className='flex justify-center items-center'>
                        <img src={logo5} className='w-40 ml-0 md:ml-0' alt="Logo" />
                    </div>
                </div>

                <nav className="space-y-6 flex flex-col ml-1.5">
                    {navItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                location.pathname !== item.path && window.location.assign(item.path);
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

export default Faculty_Navbar;
