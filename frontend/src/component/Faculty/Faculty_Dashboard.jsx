import React, { useEffect, useState } from "react";
import Faculty_Navbar from "./Faculty_Navbar";

import arrowRight from "../../assets/arrowRight.png";
import ProfileMenu from "../ProfileMenu";
// import createEvent from "../../assets/createEvent.png";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Faculty_Dashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementToShow, setAnnouncementToShow] = useState(null);

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
        
        // Filter classes: only show active classes for current faculty in current term
        const filtered = data.filter(cls => 
          cls.facultyID === currentFacultyID && 
          cls.isArchived !== true &&
          cls.academicYear === `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}` &&
          cls.termName === currentTerm?.termName
        );
        
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

  // Fetch active general announcements for faculty and show the latest in a modal
  useEffect(() => {
    async function fetchActiveAnnouncements() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${API_BASE}/api/general-announcements`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return;

        const announcements = await res.json(); // API now returns only the most recent unacknowledged announcement
        if (!announcements || announcements.length === 0) return;

        // Show the announcement (only one will be returned)
        setAnnouncementToShow(announcements[0]);
        setShowAnnouncementModal(true);
      } catch (err) {
        console.error('Failed to fetch general announcements', err);
      }
    }

    // Show on initial dashboard load
    fetchActiveAnnouncements();
  }, []);

  const acknowledgeAnnouncement = async () => {
    if (!announcementToShow?._id) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/general-announcements/${announcementToShow._id}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Close modal and clear announcement
        setShowAnnouncementModal(false);
        setAnnouncementToShow(null);
      } else {
        console.error('Failed to acknowledge announcement');
      }
    } catch (error) {
      console.error('Error acknowledging announcement:', error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr md:ml-64">
      <Faculty_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Faculty Dashboard</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."}  |  
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

        <h3 className="text-lg md:text-4xl font-bold mb-3">Current Term Classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <p>Loading...</p>
          ) : classes.length === 0 ? (
            <p>No classes found.</p>
          ) : (
            classes.map(cls => (
              <div
                key={cls.classID}
                className="relative bg-white rounded-2xl shadow-md flex flex-col justify-baseline cursor-pointer overflow-hidden"
                style={{ minHeight: '240px', borderRadius: '28px' }}
                onClick={() => window.location.href = `/faculty_class/${cls.classID}`}
              >
                {/* Image section */}
                <div className="flex items-center justify-center bg-gray-500" style={{ height: '160px', borderTopLeftRadius: '28px', borderTopRightRadius: '28px' }}>
                  {cls.image ? (
                    <img
                      src={cls.image.startsWith('/uploads/') ? `${API_BASE}${cls.image}` : cls.image}
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
                    <div className="text-lg font-bold text-white">{cls.className || 'Subject Name'}</div>
                    <div className="text-white text-base">{cls.section || cls.classCode || 'Section Name'}</div>
                  </div>
                  <img src={arrowRight} alt="Arrow" className="w-6 h-6" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAnnouncementModal && announcementToShow && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full relative">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">{announcementToShow.title}</h3>
            <div className="text-sm text-gray-500 mb-4">
              {announcementToShow.termName} • {announcementToShow.schoolYear}
            </div>
            <div className="mb-6 text-gray-800 whitespace-pre-wrap">
              {announcementToShow.body}
            </div>
            
            {/* Footer with signature and button - symmetrical layout */}
            <div className="flex justify-between items-end">
              {/* Signature - Bottom Left */}
              <div className="text-xs text-gray-600">
                {announcementToShow.createdBy?.firstname || announcementToShow.createdBy?.lastname ? (
                  <span>
                    {(announcementToShow.createdBy?.firstname || '') + (announcementToShow.createdBy?.lastname ? ' ' + announcementToShow.createdBy.lastname : '')}
                    {announcementToShow.createdBy?.role ? ` - ${announcementToShow.createdBy.role}` : ''}
                  </span>
                ) : null}
              </div>
              
              {/* Button - Bottom Right */}
              <button
                onClick={acknowledgeAnnouncement}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
