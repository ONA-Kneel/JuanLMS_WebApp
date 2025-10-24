// Faculty_Classes.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import arrowRight from "../../assets/arrowRight.png";
import ProfileMenu from "../ProfileMenu";
import Faculty_Navbar from "./Faculty_Navbar";
import createEvent from "../../assets/createEvent.png";
import { getFileUrl } from "../../utils/imageUtils";
import DEFAULT_IMAGE_URL from "../../assets/logo/Logo5.svg"; 

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Faculty_Classes() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  const currentFacultyID = localStorage.getItem("userID");

  useEffect(() => {
    async function fetchClasses() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/classes/my-classes`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await res.json();
        
        // Filter classes: only show active classes for current faculty in current term
        console.log("Filtering classes with:", {
          currentFacultyID,
          academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : null,
          currentTerm: currentTerm?.termName,
          totalClasses: data.length
        });
        
        const filtered = data.filter(cls => {
          const matches = cls.isArchived !== true &&
            cls.academicYear === `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}` &&
            cls.termName === currentTerm?.termName;
          
          console.log(`Class ${cls.className}:`, {
            facultyID: cls.facultyID,
            isArchived: cls.isArchived,
            academicYear: cls.academicYear,
            termName: cls.termName,
            matches
          });
          
          return matches;
        });
        
        console.log("Filtered classes:", filtered);
        setClasses(filtered);
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

  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const year = await yearRes.json();
          console.log("Fetched academic year:", year);
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
        console.log("Fetching terms for school year:", schoolYearName);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const terms = await res.json();
          console.log("Fetched terms:", terms);
          const active = terms.find(term => term.status === 'active');
          console.log("Active term:", active);
          setCurrentTerm(active || null);
        } else {
          console.log("Failed to fetch terms, status:", res.status);
          setCurrentTerm(null);
        }
      } catch (err) {
        console.error("Error fetching terms:", err);
        setCurrentTerm(null);
      }
    }
    fetchActiveTermForYear();
  }, [academicYear]);

  // Set loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen h-screen max-h-screen">
        <Faculty_Navbar />
        <div className="flex-1 flex flex-col bg-gray-100 font-poppinsr overflow-hidden md:ml-64 h-full min-h-screen">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading classes...</p>
            <p className="text-gray-500 text-sm mt-2">Fetching class information and academic year data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Classes</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              {currentTerm ? `${currentTerm.termName}` : "Loading..."} | 
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ProfileMenu />
          </div>
        </div>

        {/* Create Class Button */}
        <div className="flex flex-col items-start mb-8">
          <button
            className="bg-[#00418b] hover:bg-[#002b5c] ml-5 rounded-full w-20 h-20 flex items-center justify-center mb-2 shadow-lg"
            onClick={() => navigate('/faculty_createclass')}
          >
            <img src={createEvent} alt="Create Class" className="w-12 h-12" />
          </button>
          <span className="font-bold text-xl text-[#222]">Confirm Classes</span>
        </div>


        {/* Faculty's Classes */}
        <h3 className="text-2xl font-semibold mb-4">Your Classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-600">Loading classes...</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-600">No classes found for the current term.</p>
            </div>
          ) : (
            classes.map(cls => (
              <div
                key={cls.classID}
                className="relative bg-white rounded-2xl shadow-md flex flex-col justify-baseline cursor-pointer overflow-hidden hover:shadow-lg transition-shadow"
                style={{ minHeight: '240px' }}
                onClick={() => navigate(`/faculty_class/${cls.classID}`)}
              >
                {/* Image section */}
                <div className="flex items-center justify-center bg-gradient-to-r from-blue-900 to-blue-950" style={{ height: '160px' }}>
                  {cls.image ? (
                    <img
                      src={getFileUrl(cls.image, API_BASE)}
                      alt="Class"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-white text-xl font-bold justify-center align-middle items-center flex"><img src={DEFAULT_IMAGE_URL} alt="Class" className="w-[50%] h-full " /></span>
                  )}
                </div>
                {/* Info section */}
                <div className="flex items-center justify-between bg-[#00418b] px-6 py-4 flex-grow">
                  <div className="flex flex-col justify-center min-h-[60px]">
                    <div className="text-lg font-bold text-white">{cls.className || 'Subject Name'}</div>
                    <div className="text-white text-base">{cls.section || cls.classCode || 'Section Name'}</div>
                  </div>
                  <img src={arrowRight} alt="Arrow" className="w-6 h-6" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* <h3 className="text-2xl font-semibold mt-10">Completed Classes</h3> */}
      </div>
    </div>
  );
}
