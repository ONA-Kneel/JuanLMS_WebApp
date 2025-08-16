import Faculty_Navbar from "./Faculty_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";
import React, { useEffect, useState } from 'react';
import GradingSystem from '../GradingSystem';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Faculty_Grades() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentSemester, setCurrentSemester] = useState(null);
  const [activeTab, setActiveTab] = useState('traditional'); // 'traditional' or 'excel'
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const currentFacultyID = localStorage.getItem("userID");

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
    async function fetchActiveSemesterForYear() {
      if (!academicYear) return;
      try {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const semesters = await res.json();
          const active = semesters.find(semester => semester.status === 'active');
          setCurrentSemester(active || null);
        } else {
          setCurrentSemester(null);
        }
      } catch {
        setCurrentSemester(null);
      }
    }
    fetchActiveSemesterForYear();
  }, [academicYear]);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/classes`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await res.json();
        
        // Filter classes: only show classes created by current faculty in current semester
        const filtered = data.filter(cls => 
          cls.facultyID === currentFacultyID && 
          cls.isArchived !== true &&
          cls.academicYear === `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}` &&
          cls.termName === currentSemester?.termName
        );
        
        setClasses(filtered);
        console.log("Faculty Grades - Filtered classes:", filtered);
      } catch (err) {
        console.error("Failed to fetch classes", err);
      } finally {
        setLoading(false);
      }
    }
    
    // Only fetch classes when we have both academic year and semester
    if (academicYear && currentSemester) {
      fetchClasses();
    }
  }, [currentFacultyID, academicYear, currentSemester]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Grades</h2>
            <p className="text-base md:text-lg">
              <span> </span>{academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              <span> </span>{currentSemester ? `${currentSemester.termName}` : "Loading..."} | 
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

        
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex gap-4 border-b">
            <button
              className={`pb-2 px-4 ${activeTab === 'traditional' ? 'border-b-2 border-blue-900 font-bold' : ''}`}
              onClick={() => setActiveTab('traditional')}
            >
              Traditional Grades
            </button>
            <button
              className={`pb-2 px-4 ${activeTab === 'excel' ? 'border-b-2 border-blue-900 font-bold' : ''}`}
              onClick={() => setActiveTab('excel')}
            >
              Excel Grading System
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'traditional' ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Main Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
                Report on Learning Progress and Achievement
              </h1>
            </div>

            {/* First Semester Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">First Semester</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Subjects</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50" colSpan="2">Quarter</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Semester Final Grade</th>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">1</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">2</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Empty rows for dynamic content */}
                    {Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2 h-12"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                    ))}
                    
                    {/* General Average */}
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-2 font-bold text-gray-800">General Average</td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2 text-center font-bold"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Second Semester Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Second Semester</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Subjects</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50" colSpan="2">Quarter</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Semester Final Grade</th>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">3</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">4</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Empty rows for dynamic content */}
                    {Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2 h-12"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                    ))}
                    
                    {/* General Average */}
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-2 font-bold text-gray-800">General Average</td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2 text-center font-bold"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <GradingSystem />
        )}
      </div>
    </div>
  );
}
