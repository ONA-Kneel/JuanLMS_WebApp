import { useState, useEffect } from "react";
import Principal_Navbar from "./Principal_Navbar";
import ProfileModal from "../ProfileModal";
import { useNavigate } from "react-router-dom";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Principal_FacultyReport() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const year = await yearRes.json();
          setAcademicYear(year);
        }
      } catch (err) {
        console.error("Failed to fetch academic year", err);
      }
    }
    fetchAcademicYear();
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Principal_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Faculty Report</h2>
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                // TODO: Implement report generation
                console.log("Generate faculty report");
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Generate Report
            </button>
            <ProfileMenu />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Faculty Details</h3>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search faculty..."
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Tracks</option>
                <option value="academic-track">Academic Track</option>
                <option value="tvl-track">TVL Track</option>
              </select>
              <button className="px-4 py-2 bg-[#00418B] text-white rounded hover:bg-[#003366] transition-colors">
                Export
              </button>
            </div>
          </div>

          {/* Faculty Table */}
          <div className="mt-8">
            <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3 border w-1/4">Name</th>
                  <th className="p-3 border w-1/4">Track</th>
                  <th className="p-3 border w-1/4">Strand</th>
                  <th className="p-3 border w-1/4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Sample data - 10 rows */}
                {Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-3 border text-gray-900 whitespace-nowrap">
                      {index === 0 && "TEST"}
                      {index === 1 && "TEST"}
                      {index === 2 && "TEST"}
                    </td>
                    <td className="p-3 border text-gray-900 whitespace-nowrap">
                      {index % 3 === 0 && "Academic Track"}
                      {index % 3 === 1 && "TVL Track"}
                      {index % 3 === 2 && "Academic Track"}
                    </td>
                    <td className="p-3 border text-gray-500">
                      {index % 2 === 0 && "ABM"}
                      {index % 2 === 1 && "Cookery"}
                      
                    </td>
                    <td className="p-3 border text-gray-900 whitespace-nowrap">
                      <button className="text-blue-500 hover:text-blue-700 underline mr-2">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex justify-center items-center gap-4 mt-4">
              <button
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
                disabled={true}
              >
                Previous
              </button>
              <span className="text-sm">Page 1 of 1</span>
              <button
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
                disabled={true}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 