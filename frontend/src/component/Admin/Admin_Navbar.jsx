import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from "react-router-dom";
import dashboardIcon from "../../assets/dashboard.png";
import classesIcon from "../../assets/classes.png";
import chatsIcon from "../../assets/chats.png";
import progressIcon from "../../assets/progress.png";
import calendarIcon from "../../assets/calendar.png";
import logo5 from "../../assets/logo/Logo5.svg";
import acadSettingsIcon from "../../assets/acadsettings.png"
import logo6 from "../../assets/logo/SJDD Logo.svg";
import { Menu, X, HelpCircle, Users } from 'lucide-react';
import studentIcon from '../../assets/student.png';

const Admin_Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activePath, setActivePath] = useState('/admin_dashboard');
    const [isNavigating, setIsNavigating] = useState(false);
    const isInitialMount = useRef(true);
    const navigate = useNavigate();
    const location = useLocation();

    // Update active path when location changes with debounce
    useEffect(() => {
        if (isInitialMount.current) {
            // Set immediately on initial mount
            setActivePath(location.pathname);
            isInitialMount.current = false;
        } else {
            // Use debounce for subsequent changes
            const timeoutId = setTimeout(() => {
                setActivePath(location.pathname);
            }, 50); // Small delay to prevent rapid state changes

            return () => clearTimeout(timeoutId);
        }
    }, [location.pathname]);

    const navItems = [
        { path: "/admin_dashboard", icon: dashboardIcon, label: "DASHBOARD" },
        { path: "/admin_accounts", icon: classesIcon, label: "ACCOUNTS" },
        { path: "/admin_registrants", icon: studentIcon, label: "REGISTRANTS" },
        { path: "/admin_academic_settings", icon: acadSettingsIcon, label: "ACAD SETTING" },
        { path: "/admin_audit_trail", icon: progressIcon, label: "AUDIT TRAIL" },
        { path: "/admin_calendar", icon: calendarIcon, label: "CALENDAR" },
        { path: "/admin_chats", icon: chatsIcon, label: "CHATS" },
    ];

    return (
        <>
            {/* Toggle Button (fixed top-left on mobile) */}
            <button
                className="md:hidden fixed top-4 left-4 z-40 bg-[#010a51] text-white p-2 rounded-lg"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar (always fixed, responsive visibility) */}
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
                    {navItems.map((item, index) => {
                        const isActive = activePath === item.path;
                        return (
                            <button
                                key={index}
                                onClick={() => {
                                    if (isNavigating) return; // Prevent multiple rapid clicks
                                    setIsNavigating(true);
                                    setActivePath(item.path);
                                    navigate(item.path);
                                    setIsOpen(false);
                                    // Reset navigation state after a short delay
                                    setTimeout(() => setIsNavigating(false), 300);
                                }}
                                disabled={isNavigating}
                                className={`text-lg flex items-center p-2 w-full rounded-lg transition-colors duration-200
                                ${isActive ? "bg-[#1976d2]" : "hover:bg-[#1a237e]"} ${isNavigating ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                <img src={item.icon} alt={item.label} className={`w-6 h-6 ${item.label === 'REGISTRANTS' ? 'filter-white' : ''}`} style={item.label === 'REGISTRANTS' ? { filter: 'brightness(0) invert(1)' } : {}} />
                                <span className="flex items-center ml-3">{item.label}</span>
                            </button>
                        );
                    })}
                    <button
                        onClick={() => {
                            if (isNavigating) return; // Prevent multiple rapid clicks
                            setIsNavigating(true);
                            setActivePath('/admin/support-center');
                            navigate('/admin/support-center');
                            setIsOpen(false);
                            // Reset navigation state after a short delay
                            setTimeout(() => setIsNavigating(false), 300);
                        }}
                        disabled={isNavigating}
                        className={`text-lg flex items-center p-2 w-full rounded-lg transition-colors duration-200
                        ${activePath === '/admin/support-center' ? "bg-[#1976d2]" : "hover:bg-[#1a237e]"} ${isNavigating ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        <HelpCircle className="w-6 h-6" />
                        <span className="ml-3">SUPPORT CENTER</span>
                    </button>
                </nav>
            </div>
        </>
    );
};

export default Admin_Navbar;
