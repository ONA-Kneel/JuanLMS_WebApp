import React, { useState } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import dashboardIcon from "../../../src/assets/dashboard.png";
import classesIcon from "../../../src/assets/classes.png";
import progressIcon from "../../../src/assets/progress.png";
import gradesIcon from "../../../src/assets/grades.png";
import logo5 from "../../assets/logo/Logo5.svg";
import { Menu, X } from 'lucide-react';

const Parent_Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { path: "/parent_dashboard", icon: dashboardIcon, label: "Dashboard" },
        { path: "/parent_classes", icon: classesIcon, label: "Classes" },
        { path: "/parent_progress", icon: progressIcon, label: "Progress" },
        { path: "/parent_grades", icon: gradesIcon, label: "Grades" },
    ];

    return (
        <>
            <button
                className="md:hidden fixed top-4 left-4 z-40 bg-[#010a51] text-white p-2 rounded-lg"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div
                className={`bg-[#010a51] text-white p-4 w-64 h-screen fixed top-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:block`}
                style={{ overflowY: 'auto' }}
            >
                <div className="flex justify-center md:justify-start items-center mb-6 p-3">
                    <img src={logo5} className='w-40 ml-0 md:ml-3' alt="Logo" />
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

export default Parent_Navbar;
