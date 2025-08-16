import Faculty_Navbar from "./Faculty_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";
import React, { useEffect, useState } from 'react';
import GradingSystem from '../GradingSystem';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Faculty_Grades() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
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
        
        // Filter classes: only show classes created by current faculty in current term
        const filtered = data.filter(cls => 
          cls.facultyID === currentFacultyID && 
          cls.isArchived !== true &&
          cls.academicYear === `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}` &&
          cls.termName === currentTerm?.termName
        );
        
        setClasses(filtered);
        console.log("Faculty Grades - Filtered classes:", filtered);
      } catch (err) {
        console.error("Failed to fetch classes", err);
      } finally {
        setLoading(false);
      }
    }
    
    // Only fetch classes when we have both academic year and term
    if (academicYear && currentTerm) {
      fetchClasses();
    }
  }, [currentFacultyID, academicYear, currentTerm]);

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
                    {/* CORE SUBJECTS */}
                    <tr>
                      <td className="border border-gray-300 p-2 font-bold text-gray-700 bg-gray-100 pl-4">CORE SUBJECTS</td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Oral Communication</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">General Mathematics</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Earth and Life Science</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Personal Development</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Introduction to the Philosophy of the Human Person</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Physical Education and Health 1</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    
                    {/* STRAND SUBJECTS */}
                    <tr>
                      <td className="border border-gray-300 p-2 font-bold text-gray-700 bg-gray-100 pl-4">STRAND SUBJECTS</td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Housekeeping NCII</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    
                    {/* Other Subject */}
                    <tr>
                      <td className="border border-gray-300 p-2 pl-4">Christian Vincentian Living 1</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    
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
                    {/* CORE SUBJECTS */}
                    <tr>
                      <td className="border border-gray-300 p-2 font-bold text-gray-700 bg-gray-100 pl-4">CORE SUBJECTS</td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Reading and Writing Skills</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Pagbasa at Pagsusuri ng Ibat-ibang Teksto Tungo sa Pananaliksik</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Statistics and Probability</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Physical Education and Health 2</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    
                    {/* APPLIED SUBJECTS */}
                    <tr>
                      <td className="border border-gray-300 p-2 font-bold text-gray-700 bg-gray-100 pl-4">APPLIED SUBJECTS</td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">English for Academic and Professional Purposes</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Practical Research 1</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Empowerment Technologies: ICT for TVL</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    
                    {/* STRAND SUBJECTS */}
                    <tr>
                      <td className="border border-gray-300 p-2 font-bold text-gray-700 bg-gray-100 pl-4">STRAND SUBJECTS</td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 pl-8">Food and Beverage Services NC II</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    
                    {/* Other Subject */}
                    <tr>
                      <td className="border border-gray-300 p-2 pl-4">Christian Vincentian Living 2</td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                      <td className="border border-gray-300 p-2 text-center"></td>
                    </tr>
                    
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
