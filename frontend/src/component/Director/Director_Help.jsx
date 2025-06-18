import ProfileMenu from "../ProfileMenu";
import Director_Navbar from "./Director_Navbar";
import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Director_Help(){
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

    return(
        <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Director_Navbar/>

        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div>
                    <h2 classname="text-2xl md:text-3xl font-bold">Help Center</h2>
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
        </div>
        </div>
    )

}