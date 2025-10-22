import React, { useEffect, useState } from "react";
import arrowRight from "../../assets/arrowRight.png";

import Student_Navbar from "./Student_Navbar";
import ProfileMenu from "../ProfileMenu";
import { Link } from "react-router-dom";
import DEFAULT_IMAGE_URL from "../../assets/logo/Logo5.svg"; 

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Student_Dashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  // Change password suggest modal
  const [showSuggestPw, setShowSuggestPw] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showChangePwModal, setShowChangePwModal] = useState(false);

  // General announcements
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const attempts = user?.changePassAttempts || 0;
      const suppressed = user?.changePassModal === true;
      setShowSuggestPw(attempts === 0 && !suppressed);
    } catch {
      setShowSuggestPw(false);
    }
  }, []);

  const handleNeverShowAgain = async () => {
    try {
      const me = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');
      const api = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";
      await fetch(`${api}/users/${me._id}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ changePassModal: true })
      });
      const updated = { ...me, changePassModal: true };
      localStorage.setItem('user', JSON.stringify(updated));
      setShowSuggestPw(false);
    } catch {
      setShowSuggestPw(false);
    }
  };

  const currentUserID = localStorage.getItem("userID");

  /* ------------------------------ helpers ------------------------------ */
  const DISMISSED_KEY = "student_dashboard_dismissed_announcements";
  const getDismissed = () => {
    try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); }
    catch { return []; }
  };
  const addDismissed = (id) => {
    const next = Array.from(new Set([...(getDismissed() || []), id]));
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };


  /* ----------------------- load academic year/term ---------------------- */
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (yearRes.ok) setAcademicYear(await yearRes.json());
      } catch (err) {
        console.error("Failed to fetch academic year", err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!academicYear) return;
      try {
        const token = localStorage.getItem("token");
        const sy = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${sy}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return setCurrentTerm(null);
        const terms = await res.json();
        setCurrentTerm(terms.find((t) => t.status === "active") || null);
      } catch (err) {
        console.error("Error fetching terms:", err);
        setCurrentTerm(null);
      }
    })();
  }, [academicYear]);

  /* ------------------------------ classes ------------------------------ */
  useEffect(() => {
    async function fetchClasses() {
      try {
        const token = localStorage.getItem("token");
        
        console.log("Student Dashboard - Current userID from localStorage:", currentUserID);
        console.log("Student Dashboard - Current user from localStorage:", localStorage.getItem("user"));
        
        // Try to get userID from different sources
        let studentId = currentUserID;
        if (!studentId) {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          studentId = user._id || user.userID;
          console.log("Student Dashboard - Using userID from user object:", studentId);
        }
        
        if (!studentId) {
          console.error("Student Dashboard - No student ID found!");
          setLoading(false);
          return;
        }
        
        // Get only this student's classes from backend
        const res = await fetch(`${API_BASE}/classes/my-classes`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await res.json();
        
        console.log("Student Dashboard - My classes from backend:", data);
        console.log("Student Dashboard - Current userID:", currentUserID);
        console.log("Student Dashboard - Current user from localStorage:", localStorage.getItem("user"));
        console.log("Student Dashboard - Academic Year:", academicYear);
        console.log("Student Dashboard - Current Term:", currentTerm);
        
        // Filter like faculty: active year/term (allow missing) and not archived
        const requiredYear = `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`;
        let filtered = Array.isArray(data) ? data.filter(cls => {
          console.log(`[FILTER] Checking class: ${cls.className} (${cls.classID})`);
          console.log(`[FILTER] Class data:`, {
            isArchived: cls.isArchived,
            academicYear: cls.academicYear,
            schoolYear: cls.schoolYear,
            schoolyear: cls.schoolyear,
            termName: cls.termName,
            term: cls.term,
            termname: cls.termname,
            members: cls.members
          });
          
          if (cls.isArchived === true) {
            console.log(`[FILTER] Skipping ${cls.className} - archived`);
            return false;
          }
          const classYear = cls.academicYear || cls.schoolYear || cls.schoolyear;
          const classTerm = cls.termName || cls.term || cls.termname;
          const yearOk = !requiredYear || !classYear || classYear === requiredYear;
          const termOk = !currentTerm?.termName || !classTerm || classTerm === currentTerm.termName;
          
          console.log(`[FILTER] Year check: ${classYear} === ${requiredYear} = ${yearOk}`);
          console.log(`[FILTER] Term check: ${classTerm} === ${currentTerm?.termName} = ${termOk}`);
          
          const result = yearOk && termOk;
          console.log(`[FILTER] ${cls.className} included: ${result}`);
          return result;
        }) : [];
        
        console.log("Student Dashboard - Filtered classes (my-classes):", filtered);
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
  }, [currentUserID, academicYear, currentTerm]);

  /* ----------------------------- Announcements ---------------------------- */
  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${API_BASE}/api/general-announcements`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const all = await res.json();
        const dismissed = new Set(getDismissed());

        // Only show if created by Principal OR any "vice ... education"
        const filtered = (all || []).filter((a) => {
          const role = (a?.createdBy?.role || "").toLowerCase();
          const fromPrincipal = role.includes("principal");
          const fromVPE = role.includes("vice") && role.includes("education");
          return (fromPrincipal || fromVPE) && !dismissed.has(a._id);
        });

        setAnnouncements(filtered);
      } catch (err) {
        console.error("Failed to fetch announcements", err);
      }
    }

    fetchAnnouncements();
  }, []);

  const dismissAnnouncement = (id) => {
    addDismissed(id);
    setAnnouncements((prev) => prev.filter((a) => a._id !== id));
  };

  /* -------------------------------- render -------------------------------- */
  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      <Student_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Suggest change password modal */}
        {showSuggestPw && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md border-2 border-[#00418B]">
              <h3 className="text-xl font-semibold mb-2">Change Password</h3>
              <p className="text-sm text-gray-600 mb-4">To improve your account security, please change your password.</p>
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} />
                  Don't show again
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  className="px-4 py-2 rounded bg-gray-300"
                  onClick={() => { if (dontShowAgain) handleNeverShowAgain(); setShowSuggestPw(false); }}
                >
                  Later
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-900 text-white"
                  onClick={() => { if (dontShowAgain) handleNeverShowAgain(); setShowSuggestPw(false); setShowChangePwModal(true); }}
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        )}
        {showChangePwModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md border-2 border-[#00418B]">
              <h3 className="text-lg font-semibold mb-2">Open Change Password</h3>
              <p className="text-sm text-gray-600 mb-4">Open your profile and use the Change Password option.</p>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded bg-gray-300" onClick={() => setShowChangePwModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Student Dashboard</h2>
            <p className="text-base md:text-lg">
              {academicYear
                ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`
                : "Loading..."}{" "}
              | {currentTerm ? currentTerm.termName : "Loading..."} |{" "}
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

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="mb-6">
            <div className="bg-white rounded-2xl shadow p-4 md:p-6 border-2 border-[#00418B]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold">Announcements</h4>
                <button
                  onClick={() => dismissAnnouncement(announcements[0]._id)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Dismiss announcement"
                  title="Dismiss"
                >
                  {/* simple × so no extra icon deps */}
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-base font-semibold text-gray-900">
                  {announcements[0].title}
                </div>
                <div className="text-xs text-gray-500">
                  {announcements[0].termName} • {announcements[0].schoolYear}
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap break-words overflow-hidden mt-2">
                  {announcements[0].body}
                </div>
                {announcements[0]?.createdBy && (
                  <div className="text-xs text-gray-600 mt-3">
                    {(announcements[0].createdBy.firstname || "") +
                      (announcements[0].createdBy.lastname
                        ? " " + announcements[0].createdBy.lastname
                        : "")}
                    {announcements[0].createdBy.role
                      ? ` — ${announcements[0].createdBy.role}`
                      : ""}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Classes Section */}
        <h3 className="text-lg md:text-4xl font-bold mb-3">
          Recent Classes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <p>Loading...</p>
          ) : classes.length === 0 ? (
            <div className="col-span-full text-center">
              <p className="text-gray-500 mb-2">No classes found.</p>
            </div>
          ) : (
            classes.map((cls) => (
              <div
                key={cls.classID}
                className="relative bg-white rounded-2xl shadow-md flex flex-col justify-baseline cursor-pointer overflow-hidden"
                style={{ minHeight: "240px" }}
                onClick={() =>
                  (window.location.href = `/student_class/${cls.classID}`)
                }
              >
                <div
                  className="flex items-center justify-center bg-gradient-to-r from-blue-900 to-blue-950"
                  style={{
                    height: "160px",
                  }}
                >
                  {cls.image ? (
                    <img
                      src={
                        cls.image.startsWith("/uploads/")
                          ? `${API_BASE}${cls.image}`
                          : cls.image
                      }
                      alt="Class"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-white text-xl font-bold justify-center align-middle items-center flex"><img src={DEFAULT_IMAGE_URL} alt="Class" className="w-[50%] h-full " /></span>
                  )}
                </div>

                <div className="flex items-center justify-between bg-[#00418b] px-6 py-4 flex-grow">
                  <div className="flex flex-col justify-center min-h-[60px]">
                    <div className="text-lg font-bold text-white">{cls.subjectName || cls.className || 'Subject Name'}</div>
                    <div className="text-white text-base">{cls.sectionName || cls.section || cls.classCode || 'Section Name'}</div>
                  </div>
                  <img src={arrowRight} alt="Arrow" className="w-6 h-6" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}