import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import dashboardIcon from "../../../src/assets/dashboard.png";
import classesIcon from "../../../src/assets/classes.png";
import progressIcon from "../../../src/assets/progress.png";
import gradesIcon from "../../../src/assets/grades.png";
import logo5 from "../../assets/logo/Logo5.svg";
import { Menu, X } from 'lucide-react';

const Parent_Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const navItems = [
        { handler: () => navigate("/faculty_dashboard"), icon: dashboardIcon, label: "Dashboard" },
        { handler: () => navigate("/faculty_classes"), icon: classesIcon, label: "Schedule" },
        { handler: () => navigate("/faculty_progress"), icon: progressIcon, label: "Progress" },
        { handler: () => navigate("/faculty_grades"), icon: gradesIcon, label: "Grades" },
    ];

    return (
        <div className="bg-[#010a51] text-white h-30 p-4 w-full md:w-64 flex-shrink-0 font-poppinsr md:h-screen">
            <div className="flex justify-between items-center mb-2 md:mb-6 p-3">
                <img src={logo5} className='w-40 ml-3'/>
                <button className="md:hidden " onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <nav className={`bg-[#010a51] z-20 relative ml-1.5 space-y-6 flex-col ${isOpen ? "flex" : "hidden"} md:flex`}>
                {navItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={item.handler}
                        className="text-lg flex items-center space-x-3 p-2 w-full rounded-lg hover:bg-[#1a237e] transition-colors"
                    >
                        <img src={item.icon} alt={item.label} className="w-6 h-6" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default Parent_Navbar;
