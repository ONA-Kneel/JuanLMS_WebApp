import React from 'react'
import { useNavigate } from "react-router-dom";
import dashboardIcon from "../../../src/assets/dashboard.png";
import classesIcon from "../../../src/assets/classes.png";
import activitiesIcon from "../../../src/assets/activities.png";
import chatsIcon from "../../../src/assets/chats.png";
import progressIcon from "../../../src/assets/progress.png";
import gradesIcon from "../../../src/assets/grades.png";
import calendarIcon from "../../../src/assets/calendar.png";


const Student_Navbar = () => {
    const navigate = useNavigate();

    const handleDashboard = () => navigate("/student_dashboard");
    const handleClasses = () => navigate("/student_classes");
    const handleActivities = () => navigate("/student_activities");
    const handleChats = () => navigate("/student_chats");
    const handleProgress = () => navigate("/student_progress");
    const handleGrades = () => navigate("/student_grades");
    const handleCalendar = () => navigate("/student_calendar");

    return (
    
        <div className=" min-h-screen bg-[#010a51] text-white p-6  flex-col justify-center ">

            <h2 className="text-3xl mb-12 text-center">
                <span className="font-bold">JUAN</span>
                <span className="font-bold italic">LMS</span>
            </h2>
            <nav className="space-y-10  flex flex-col items-center h-full pr-6">
                {[
                    { handler: handleDashboard, icon: dashboardIcon, label: "Dashboard"},
                    { handler: handleClasses, icon: classesIcon, label: "Classes" },
                    { handler: handleActivities, icon: activitiesIcon, label: "Activities" },
                    { handler: handleChats, icon: chatsIcon, label: "Chats" },
                    { handler: handleProgress, icon: progressIcon, label: "Progress" },
                    { handler: handleGrades, icon: gradesIcon, label: "Grades" },
                    { handler: handleCalendar, icon: calendarIcon, label: "Calendar" },
                ].map((item, index) => (
                    <button
                        key={index}
                        onClick={item.handler}
                        className="text-2xl flex items-center space-x-5 p-2 w-50 rounded-lg transition-colors duration-300 hover:bg-[#1a237e]"
                    >
                        <img src={item.icon} alt={item.label} className="w-6 h-6"/>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>

            
        
    )
}

export default Student_Navbar