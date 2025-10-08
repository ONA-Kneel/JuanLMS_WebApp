// import { useState } from "react";
import Admin_Navbar from "./Admin_Navbar";
import ProfileModal from "../ProfileModal";
// import { useNavigate } from "react-router-dom";
import ProfileMenu from "../ProfileMenu";
import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Admin_Grades() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Consolidated data fetching function
  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const [yearRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ]);

      // Process academic year
      if (yearRes.status === 'fulfilled' && yearRes.value.ok) {
        const year = await yearRes.value.json();
        setAcademicYear(year);
      } else {
        console.error("Failed to fetch academic year", yearRes.reason);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);



  useEffect(() => {
    async function fetchActiveTermForYear() {
      if (!academicYear) return;
      try {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const terms = await res.json();
          const active = terms.find(term => term.status === 'active');
          setCurrentTerm(active || null);
        } else {
          setCurrentTerm(null);
        }
      } catch {
        setCurrentTerm(null);
      }
    }
    fetchActiveTermForYear();
  }, [academicYear]);

  // Loading screen
  if (isLoading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Admin_Navbar />
        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading grades data...</p>
            <p className="text-gray-500 text-sm mt-2">Fetching academic year and term information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Admin_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Grades</h2>
            <p className="text-base md:text-lg">
              <span> </span>{academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              <span> </span>{currentTerm ? `${currentTerm.termName}` : "Loading..."} | 
              <span> </span>{new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <ProfileMenu/>
        </div>

        {/* Grades Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 text-sm">
            <thead>
              <tr>
                <th colSpan="7" className="text-center p-3 border-b font-bold">
                  2024-2025 2nd Semester
                </th>
              </tr>
              <tr className="bg-gray-100 table-fixed border-collapse">
                <th className="p-2 border">Subject Code</th>
                <th className="p-2 border">Subject Description</th>
                <th className="p-2 border">Prelims</th>
                <th className="p-2 border">Midterms</th>
                <th className="p-2 border">Final</th>
                <th className="p-2 border">Finals Grade</th>
                <th className="p-2 border">Remark</th>
              </tr>
            </thead>
            <tbody>
              {/* 5 Empty rows */}
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td className="p-2 border h-12"></td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
