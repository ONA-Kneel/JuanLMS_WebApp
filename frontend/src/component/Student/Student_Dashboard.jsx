import React, { useEffect, useState } from "react";
import arrowRight from "../../assets/arrowRight.png";

import Student_Navbar from "./Student_Navbar";
import ProfileModal from "../ProfileModal";
import Login from "../Login";
import ProfileMenu from "../ProfileMenu";
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Student_Dashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classProgress, setClassProgress] = useState({}); // { classID: percent }
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  // Announcement modal state
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementToShow, setAnnouncementToShow] = useState(null);

  // Get current userID (adjust as needed for your auth)
  const currentUserID = localStorage.getItem("userID");

  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const year = await yearRes.json();
          console.log("Student Dashboard - Fetched academic year:", year);
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
        console.log("Student Dashboard - Fetching terms for school year:", schoolYearName);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const terms = await res.json();
          console.log("Student Dashboard - Fetched terms:", terms);
          const active = terms.find(term => term.status === 'active');
          console.log("Student Dashboard - Active term:", active);
          setCurrentTerm(active || null);
        } else {
          console.log("Student Dashboard - Failed to fetch terms, status:", res.status);
          setCurrentTerm(null);
        }
      } catch (err) {
        console.error("Student Dashboard - Error fetching terms:", err);
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
        
        // Filter classes: only show classes from current term where student is a member
        const filtered = data.filter(cls => 
          cls.members.includes(currentUserID) &&
          cls.isArchived !== true &&
          cls.academicYear === `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}` &&
          cls.termName === currentTerm?.termName
        );
        
        setClasses(filtered);

        // --- Fetch progress for each class ---
        const progressMap = {};
        for (const cls of filtered) {
          // Fetch lessons for this class
          const lessonRes = await fetch(`${API_BASE}/lessons?classID=${cls.classID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const lessons = await lessonRes.json();
          let totalPages = 0;
          let totalRead = 0;
          for (const lesson of lessons) {
            if (lesson.files && lesson.files.length > 0) {
              for (const file of lesson.files) {
                // Fetch progress for this file
                try {
                  const progRes = await fetch(`${API_BASE}/lessons/lesson-progress?lessonId=${lesson._id}&fileUrl=${encodeURIComponent(file.fileUrl)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  const prog = await progRes.json();
                  if (prog && prog.totalPages) {
                    totalPages += prog.totalPages;
                    totalRead += Math.min(prog.lastPage, prog.totalPages);
                  } else if (file.totalPages) {
                    totalPages += file.totalPages;
                  }
                } catch { /* ignore progress fetch errors */ }
              }
            }
          }
          let percent = 0;
          if (totalPages > 0) {
            percent = Math.round((totalRead / totalPages) * 100);
          }
          progressMap[cls.classID] = percent;
        }
        setClassProgress(progressMap);
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
  }, [currentUserID, academicYear, currentTerm]);

  // Fetch active general announcements for students and show the latest in a modal
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
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      <Student_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto  font-poppinsr md:ml-64">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Student Dashboard</h2>
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
          <ProfileMenu />
        </div>

        {/* Recent Classes Section */}
        <h3 className="text-lg md:text-4xl font-bold mb-3">Recent Classes</h3>
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
                onClick={() => window.location.href = `/student_class/${cls.classID}`}
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

      {/* Announcement Modal */}
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
