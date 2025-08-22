import React, { useEffect, useState } from "react";
import arrowRight from "../../assets/arrowRight.png";

import Student_Navbar from "./Student_Navbar";
import ProfileMenu from "../ProfileMenu";
import { Link } from "react-router-dom";

// lucide icons
import { ClipboardList, CalendarDays, X } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Student_Dashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classProgress, setClassProgress] = useState({});
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  // KPIs
  const [pendingCount, setPendingCount] = useState(0);
  const [dueTodayCount, setDueTodayCount] = useState(0);

  // Announcements (inline box)
  const [announcements, setAnnouncements] = useState([]);

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
        const res = await fetch(`${API_BASE}/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        const filtered = data.filter(
          (cls) =>
            cls.members?.includes(currentUserID) &&
            cls.isArchived !== true &&
            cls.academicYear ===
              `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}` &&
            cls.termName === currentTerm?.termName
        );

        setClasses(filtered);

        // keep progress logic
        const progressMap = {};
        for (const cls of filtered) {
          try {
            const token = localStorage.getItem("token");
            const lessonRes = await fetch(
              `${API_BASE}/lessons?classID=${cls.classID}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const lessons = await lessonRes.json();
            let totalPages = 0;
            let totalRead = 0;
            for (const lesson of lessons) {
              if (lesson.files?.length) {
                for (const file of lesson.files) {
                  try {
                    const progRes = await fetch(
                      `${API_BASE}/lessons/lesson-progress?lessonId=${lesson._id}&fileUrl=${encodeURIComponent(file.fileUrl)}`,
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    const prog = await progRes.json();
                    if (prog?.totalPages) {
                      totalPages += prog.totalPages;
                      totalRead += Math.min(prog.lastPage, prog.totalPages);
                    } else if (file.totalPages) {
                      totalPages += file.totalPages;
                    }
                  } catch {}
                }
              }
            }
            progressMap[cls.classID] =
              totalPages > 0 ? Math.round((totalRead / totalPages) * 100) : 0;
          } catch {
            progressMap[cls.classID] = 0;
          }
        }
        setClassProgress(progressMap);
      } catch (err) {
        console.error("Failed to fetch classes", err);
      } finally {
        setLoading(false);
      }
    }

    if (academicYear && currentTerm) fetchClasses();
  }, [currentUserID, academicYear, currentTerm]);

  /* -------------------------- assignment metrics ------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/assignments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const assignments = await res.json();
        const today = new Date().toISOString().split("T")[0];

        const dueToday = assignments.filter((a) => {
          const d = new Date(a.dueDate).toISOString().split("T")[0];
          return a.posted === true && d === today;
        });
        const pending = assignments.filter(
          (a) => a.posted === true && !a.answered
        );

        setDueTodayCount(dueToday.length);
        setPendingCount(pending.length);
      } catch (err) {
        console.error("Failed to fetch assignments KPIs", err);
      }
    })();
  }, []);

  /* ----------------------------- announcements ---------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${API_BASE}/api/general-announcements`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const all = await res.json();
        const dismissed = new Set(getDismissed());

        // Show only if creator is Principal OR any "vice ... education"
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
    })();
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
          <ProfileMenu />
        </div>

        {/* Overview */}
        <h3 className="text-lg md:text-2xl font-bold mb-3">Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-4 bg-[#0D3E86] text-white rounded-2xl p-5 shadow">
            <div className="shrink-0">
              <ClipboardList className="w-10 h-10" />
            </div>
            <div>
              <div className="text-3xl font-bold leading-none">{pendingCount}</div>
              <div className="text-sm opacity-90">Pending Assignments</div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gray-200 rounded-2xl p-5 shadow">
            <div className="shrink-0 text-[#0D3E86]">
              <CalendarDays className="w-10 h-10" />
            </div>
            <div className="text-gray-800">
              {dueTodayCount > 0 ? (
                <div className="text-base font-semibold">
                  You have {dueTodayCount} assignment{dueTodayCount > 1 ? "s" : ""} due today
                </div>
              ) : (
                <div className="text-base font-semibold">No assignments due today</div>
              )}
            </div>
          </div>
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="mb-6">
            <div className="bg-white rounded-2xl shadow p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold">Announcements</h4>
                <button
                  onClick={() => dismissAnnouncement(announcements[0]._id)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Dismiss announcement"
                  title="Dismiss"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-base font-semibold text-gray-900">
                  {announcements[0].title}
                </div>
                <div className="text-xs text-gray-500">
                  {announcements[0].termName} • {announcements[0].schoolYear}
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap mt-2">
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

        {/* Recent Classes */}
        <h3 className="text-lg md:text-2xl font-bold mb-3">Recent Classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <p>Loading...</p>
          ) : classes.length === 0 ? (
            <p>No classes found.</p>
          ) : (
            classes.map((cls) => (
              <div
                key={cls.classID}
                className="relative bg-white rounded-2xl shadow-md flex flex-col justify-baseline cursor-pointer overflow-hidden"
                style={{ minHeight: "240px", borderRadius: "28px" }}
                onClick={() =>
                  (window.location.href = `/student_class/${cls.classID}`)
                }
              >
                <div
                  className="flex items-center justify-center bg-gray-500"
                  style={{
                    height: "160px",
                    borderTopLeftRadius: "28px",
                    borderTopRightRadius: "28px",
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
                      style={{
                        maxHeight: "160px",
                        borderTopLeftRadius: "28px",
                        borderTopRightRadius: "28px",
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                      }}
                    />
                  ) : (
                    <span className="text-white text-xl font-bold">image</span>
                  )}
                </div>

                <div
                  className="flex items-center justify-between bg-[#00418b] px-6 py-4"
                  style={{
                    borderRadius: 0,
                    borderBottomLeftRadius: "28px",
                    borderBottomRightRadius: "28px",
                    marginTop: 0,
                  }}
                >
                  <div>
                    <div className="text-lg font-bold text-white">
                      {cls.className || "Subject Name"}
                    </div>
                    <div className="text-white text-base">
                      {cls.section || cls.classCode || "Section Name"}
                    </div>
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
