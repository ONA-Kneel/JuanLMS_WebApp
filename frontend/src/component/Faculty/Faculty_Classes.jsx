// Faculty_Classes.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import arrowRight from "../../assets/arrowRight.png";
import ProfileMenu from "../ProfileMenu";
import Faculty_Navbar from "./Faculty_Navbar";
import createEvent from "../../assets/createEvent.png";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Faculty_Classes() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(null);

  const currentFacultyID = localStorage.getItem("userID");

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
        const filtered = data.filter(cls => cls.facultyID === currentFacultyID);
        setClasses(filtered);
      } catch (err) {
        console.error("Failed to fetch classes", err);
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, [currentFacultyID]);

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
          // const terms = await res.json();
          // const active = terms.find(term => term.status === 'active');
        }
      } catch {
        // Optionally log error if needed
      }
    }
    fetchActiveTermForYear();
  }, [academicYear]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Classes</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `AY: ${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <ProfileMenu />
        </div>
        {/* Create Class Button */}
        <div className="flex flex-col items-start mb-8">
          <button
            className="bg-[#00418b] hover:bg-[#002b5c] ml-5 rounded-full w-20 h-20 flex items-center justify-center mb-2 shadow-lg"
            onClick={() => navigate('/faculty_createclass')}
          >
            <img src={createEvent} alt="Create Class" className="w-12 h-12" />
          </button>
          <span className="font-bold text-xl text-[#222]">Create Class</span>
        </div>

        {/* Faculty's Classes */}
        <h3 className="text-2xl font-semibold mb-4">Your Classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <p>Loading...</p>
          ) : classes.length === 0 ? (
            <p>No classes found.</p>
          ) : (
            classes.map(cls => (
              <div
                key={cls.classID}
                className="relative bg-white rounded-2xl shadow-md flex flex-col justify-between cursor-pointer overflow-hidden"
                style={{ minHeight: '240px', borderRadius: '28px' }}
                onClick={() => navigate(`/faculty_class/${cls.classID}`)}
              >
                {/* Image section */}
                <div className="flex items-center justify-center bg-gray-500" style={{ height: '120px' }}>
                  {cls.image ? (
                    <img
                      src={cls.image.startsWith('/uploads/') ? `${API_BASE}${cls.image}` : cls.image}
                      alt="Class"
                      className="object-cover w-full h-full"
                      style={{ maxHeight: '120px' }}
                    />
                  ) : (
                    <span className="text-white text-xl font-bold">image</span>
                  )}
                </div>
                {/* Info section */}
                <div className="flex items-center justify-between bg-[#00418b] px-6 py-4" style={{ borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
                  <div>
                    <div className="text-lg font-bold text-white">{cls.className || 'Subject Name'}</div>
                    <div className="text-white text-base">{cls.classCode || 'Section Name'}</div>
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
