// student classes
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import arrowRight from "../../assets/arrowRight.png";
import ProfileMenu from "../ProfileMenu";
import Student_Navbar from "./Student_Navbar";
import { getFileUrl } from "../../utils/imageUtils";

// Force localhost for local testing
const API_BASE = import.meta.env.DEV ? "https://juanlms-webapp-server.onrender.com" : (import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com");

export default function Student_Classes() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  const currentUserID = localStorage.getItem("userID");
  const token = localStorage.getItem("token");

  // Fetch academic year
  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const year = await yearRes.json();
          console.log("Student Classes - Fetched academic year:", year);
          setAcademicYear(year);
        }
      } catch (err) {
        console.error("Failed to fetch academic year", err);
      }
    }
    fetchAcademicYear();
  }, []);

  // Fetch current term
  useEffect(() => {
    async function fetchActiveTermForYear() {
      if (!academicYear) return;
      try {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        console.log("Student Classes - Fetching terms for school year:", schoolYearName);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const terms = await res.json();
          console.log("Student Classes - Fetched terms:", terms);
          const active = terms.find(term => term.status === 'active');
          console.log("Student Classes - Active term:", active);
          setCurrentTerm(active || null);
        } else {
          console.log("Student Classes - Failed to fetch terms, status:", res.status);
          setCurrentTerm(null);
        }
      } catch (err) {
        console.error("Student Classes - Error fetching terms:", err);
        setCurrentTerm(null);
      }
    }
    fetchActiveTermForYear();
  }, [academicYear]);

  // Fetch classes using the same logic as Student_Dashboard
  useEffect(() => {
    async function fetchClasses() {
      if (!academicYear || !currentTerm) return;
      
      try {
        setLoading(true);
        console.log("Student Classes - Fetching classes from /classes/my-classes");
        
        const res = await fetch(`${API_BASE}/classes/my-classes`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        
        if (!res.ok) {
          console.error("Student Classes - Failed to fetch classes:", res.status, res.statusText);
          throw new Error('Failed to fetch classes');
        }
        
        const data = await res.json();
        console.log("Student Classes - Raw classes data:", data);
        
        // Apply the same filtering logic as Student_Dashboard
        const filtered = data.filter(cls => {
          // Filter out archived classes
          if (cls.isArchived === true) {
            console.log(`Student Classes - Filtering out archived class: ${cls.className || cls.classCode}`);
            return false;
          }
          
          // For local testing, be more lenient with academic year but still filter by term
          if (import.meta.env.DEV) {
            console.log(`Student Classes - DEV MODE: Checking class ${cls.className || cls.classCode} (academicYear: ${cls.academicYear}, termName: ${cls.termName})`);
            // Still filter by term even in DEV mode
            if (cls.termName && cls.termName !== currentTerm.termName) {
              console.log(`Student Classes - DEV MODE: Filtering out class ${cls.className || cls.classCode} - wrong term (${cls.termName} vs ${currentTerm.termName})`);
              return false;
            }
            console.log(`Student Classes - DEV MODE: Including class ${cls.className || cls.classCode} - correct term`);
            return true;
          }
          
          // Filter by academic year (tolerate missing academicYear)
          if (cls.academicYear && cls.academicYear !== `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`) {
            console.log(`Student Classes - Filtering out class with wrong year: ${cls.className || cls.classCode} (${cls.academicYear})`);
            return false;
          }
          
          // Filter by term (tolerate missing termName)
          if (cls.termName && cls.termName !== currentTerm.termName) {
            console.log(`Student Classes - Filtering out class with wrong term: ${cls.className || cls.classCode} (${cls.termName})`);
            return false;
          }
          
          console.log(`Student Classes - Including class: ${cls.className || cls.classCode}`);
          return true;
        });
        
        console.log("Student Classes - Filtered classes:", filtered);
        setClasses(filtered);
        
      } catch (err) {
        console.error("Student Classes - Failed to fetch classes", err);
        setClasses([]);
      } finally {
        setLoading(false);
      }
    }
    
    // Only fetch classes when we have both academic year and term
    if (academicYear && currentTerm) {
      fetchClasses();
    }
  }, [currentUserID, token, academicYear, currentTerm]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Student_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
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


        {/* Registered Classes */}
        <h3 className="text-2xl font-semibold mb-4">Registered Classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-600">Loading classes...</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-600">No registered classes found for the current term.</p>
            </div>
          ) : (
            classes.map(cls => (
              <div
                key={cls.classID || cls._id}
                className="relative bg-white rounded-2xl shadow-md flex flex-col justify-baseline cursor-pointer overflow-hidden hover:shadow-lg transition-shadow"
                style={{ minHeight: '240px', borderRadius: '28px' }}
                onClick={() => navigate(`/student_class/${cls.classID || cls._id}`)}
              >
                {/* Image section */}
                <div className="flex items-center justify-center bg-gray-500" style={{ height: '160px', borderTopLeftRadius: '28px', borderTopRightRadius: '28px' }}>
                  {cls.image ? (
                    <img
                      src={getFileUrl(cls.image, API_BASE)}
                      alt="Class"
                      className="object-cover w-full h-full"
                      style={{ maxHeight: '160px', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
                    />
                  ) : (
                    <span className="text-white text-xl font-bold">image</span>
                  )}
                </div>
                {/* Info section */}
                <div className="flex items-center justify-between bg-[#00418b] px-6 py-4" style={{ borderRadius: 0, borderBottomLeftRadius: '28px', borderBottomRightRadius: '28px', marginTop: 0 }}>
                  <div>
                    <div className="text-lg font-bold text-white">{cls.className || cls.subjectName || 'Subject Name'}</div>
                    <div className="text-white text-base">{cls.sectionName || cls.section || cls.classCode || 'Section Name'}</div>
                  </div>
                  <img src={arrowRight} alt="Arrow" className="w-6 h-6" />
                </div>
              </div>
            ))
          )}
        </div>

        <h3 className="text-2xl font-semibold mt-10">Completed Classes</h3>
        <div className="text-gray-600 text-center py-8">
          <p>No completed classes yet.</p>
        </div>
      </div>
    </div>
  );
}
