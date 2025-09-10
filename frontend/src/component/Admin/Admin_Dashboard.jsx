// Admin_Dashboard.js
import { useState, useEffect } from "react";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Admin_Dashboard() {
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);
  const [filteredAuditLogs, setFilteredAuditLogs] = useState([]);
  const [accountCounts, setAccountCounts] = useState({ admin: 0, faculty: 0, student: 0 });
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [classDates, setClassDates] = useState([]);
  const [lastLogins, setLastLogins] = useState([]);
  const [lastLoginsLoading, setLastLoginsLoading] = useState(true);
  const [lastLoginsError, setLastLoginsError] = useState(null);
  const [lastLoginsPage, setLastLoginsPage] = useState(1);
  const LAST_LOGINS_PER_PAGE = 7;

  // Announcements (inline box)
  const [announcements, setAnnouncements] = useState([]);

  // Change password suggest modal
  const [showSuggestPw, setShowSuggestPw] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showChangePwModal, setShowChangePwModal] = useState(false);

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
      await fetch(`${API_BASE}/users/${me._id}/preferences`, {
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

  useEffect(() => {
    const token = localStorage.getItem('token');

          fetch(`${API_BASE}/audit-logs?page=1&limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data?.logs) setRecentAuditLogs(data.logs);
      });

    fetch(`${API_BASE}/user-counts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data) setAccountCounts(data);
      })
      .catch(() => { });

    async function fetchAcademicYear() {
      try {
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

  // Filter to show only students and faculties
  useEffect(() => {
    // Take only the first 5 for preview
    setFilteredAuditLogs(recentAuditLogs.slice(0, 5));
  }, [recentAuditLogs]);

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
    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/api/class-dates`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setClassDates(data);
        } else {
          console.error("❌ Unexpected response format", data);
        }
      })
      .catch(err => console.error("❌ Failed to fetch class dates", err));
  }, []);

  useEffect(() => {
    const year = new Date().getFullYear();

    fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`)
      .then(res => res.json())
      .then(data => {
        const dates = data.map(holiday => holiday.date);
        setHolidays(dates);
      })
      .catch(err => console.error("Failed to fetch holidays", err));
  }, []);

  useEffect(() => {
    // Fetch last logins for all users
    const token = localStorage.getItem("token");
    setLastLoginsLoading(true);
    fetch(`${API_BASE}/audit-logs/last-logins`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.lastLogins)) {
          setLastLogins(data.lastLogins);
        } else {
          setLastLogins([]);
        }
        setLastLoginsLoading(false);
      })
      .catch(err => {
        setLastLoginsError("Failed to fetch last logins");
        setLastLoginsLoading(false);
      });
  }, []);

  /* ------------------------------ helpers ------------------------------ */
  const DISMISSED_KEY = "admin_dashboard_dismissed_announcements";
  const getDismissed = () => {
    try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); }
    catch { return []; }
  };
  const addDismissed = (id) => {
    const next = Array.from(new Set([...(getDismissed() || []), id]));
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const calculateSchoolYearProgress = () => {
    if (!academicYear) return 0;
    const startDate = new Date(academicYear.startDate || `${academicYear.schoolYearStart}-06-01`);
    const endDate = new Date(academicYear.endDate || `${academicYear.schoolYearEnd}-04-30`);
    const today = new Date();
    if (today < startDate) return 0;
    if (today > endDate) return 100;
    const totalDuration = endDate - startDate;
    const elapsed = today - startDate;
    return Math.floor((elapsed / totalDuration) * 100);
  };

  const calculateTermProgress = () => {
    if (!currentTerm) return 0;
    const startDate = new Date(currentTerm.startDate);
    const endDate = new Date(currentTerm.endDate);
    const today = new Date();
    if (today < startDate) return 0;
    if (today > endDate) return 100;
    const totalDuration = endDate - startDate;
    const elapsed = today - startDate;
    return Math.floor((elapsed / totalDuration) * 100);
  };

  const schoolYearProgress = calculateSchoolYearProgress();
  const termProgress = calculateTermProgress();

  const holidayEvents = holidays.map(date => {
    let title = '';
    if (date.slice(5) === '06-12') title = 'Araw ng Kalayaan';
    else if (date.slice(5) === '06-06') title = "Eid'l Adha";
    else title = 'Holiday';
    return { title, date, color: '#f87171' };
  });

  const renderEventContent = (eventInfo) => (
    <div style={{
      background: eventInfo.event.backgroundColor,
      color: 'white', borderRadius: '4px', padding: '2px 6px',
      fontSize: '0.85em', marginTop: '2px', display: 'inline-block',
      maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
    }}>{eventInfo.event.title}</div>
  );

  const formatDateYMD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper for row color based on days since last login
  const getRowColor = (lastLogin) => {
    if (!lastLogin) return '';
    const now = new Date();
    const loginDate = new Date(lastLogin);
    const diffDays = Math.floor((now - loginDate) / (1000 * 60 * 60 * 24));
    if (diffDays >= 3) return 'bg-red-100';
    if (diffDays === 2) return 'bg-yellow-100';
    if (diffDays <= 1) return 'bg-green-100';
    return '';
  };

  // Sort logins: reds first, then yellow, then green, then by most recent lastLogin
  const sortedLogins = [...lastLogins].sort((a, b) => {
    const getPriority = (log) => {
      if (!log.lastLogin) return 3;
      const now = new Date();
      const loginDate = new Date(log.lastLogin);
      const diffDays = Math.floor((now - loginDate) / (1000 * 60 * 60 * 24));
      if (diffDays >= 3) return 0; // red
      if (diffDays === 2) return 1; // yellow
      if (diffDays <= 1) return 2; // green
      return 3;
    };
    const pa = getPriority(a);
    const pb = getPriority(b);
    if (pa !== pb) return pa - pb;
    // If same priority, sort by most recent lastLogin (descending)
    return new Date(b.lastLogin) - new Date(a.lastLogin);
  });

  // Pagination logic
  const totalLastLoginsPages = Math.ceil(sortedLogins.length / LAST_LOGINS_PER_PAGE);
  const paginatedLogins = sortedLogins.slice(
    (lastLoginsPage - 1) * LAST_LOGINS_PER_PAGE,
    lastLoginsPage * LAST_LOGINS_PER_PAGE
  );

  return (
    <div className="flex flex-col min-h-screen overflow-hidden font-poppinsr">
      <Admin_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Suggest change password modal */}
        {showSuggestPw && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-2">Open Change Password</h3>
              <p className="text-sm text-gray-600 mb-4">Open your profile and use the Change Password option.</p>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded bg-gray-300" onClick={() => setShowChangePwModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} |
              {currentTerm ? `${currentTerm.termName}` : "Loading..."} |
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <ProfileMenu />
        </div>

        {/* Announcements (inline box) */}
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

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <span className="text-2xl font-bold text-blue-950">{accountCounts.admin}</span>
                <span className="text-gray-700 mt-2">Admins</span>
              </div>
              <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <span className="text-2xl font-bold text-yellow-600">{accountCounts.faculty}</span>
                <span className="text-gray-700 mt-2">Faculty</span>
              </div>
              <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <span className="text-2xl font-bold text-blue-950">{accountCounts.student}</span>
                <span className="text-gray-700 mt-2">Students</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center mb-4 min-h-[220px] w-full">
              <span className="text-lg font-bold text-gray-800 mb-4">School Year Progress</span>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
                <div className="bg-indigo-600 h-6 text-white text-sm font-semibold text-center" style={{ width: `${schoolYearProgress}%` }}>
                  {schoolYearProgress}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {academicYear?.startDate && academicYear?.endDate
                  ? `From ${new Date(academicYear.startDate).toLocaleDateString()} to ${new Date(academicYear.endDate).toLocaleDateString()}`
                  : `Estimating from June 1, ${academicYear?.schoolYearStart} to April 30, ${academicYear?.schoolYearEnd}`}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center mb-4 min-h-[220px] w-full">
              <span className="text-lg font-bold text-gray-800 mb-4">Term Progress</span>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
                <div className="bg-green-500 h-6 text-white text-sm font-semibold text-center" style={{ width: `${termProgress}%` }}>
                  {termProgress}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {currentTerm?.startDate && currentTerm?.endDate
                  ? `From ${new Date(currentTerm.startDate).toLocaleDateString()} to ${new Date(currentTerm.endDate).toLocaleDateString()}`
                  : `No active term date available.`}
              </p>
            </div>


            {/* Last Logins Preview moved here */}
            <div className="bg-white rounded-xl shadow p-4 mb-4">
              <h4 className="text-md font-bold mb-2">Last Logins Preview</h4>
              {lastLoginsLoading ? (
                <div className="text-gray-500 text-sm">Loading...</div>
              ) : lastLoginsError ? (
                <div className="text-red-500 text-sm">{lastLoginsError}</div>
              ) : lastLogins.length === 0 ? (
                <div className="text-gray-500 text-sm">No login data found.</div>
              ) : (
                <>
                  <table className="min-w-full bg-white border rounded-lg overflow-hidden text-xs table-fixed">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="p-2 border-b w-2/6 font-semibold text-gray-700">User</th>
                        <th className="p-2 border-b w-1/6 font-semibold text-gray-700">Role</th>
                        <th className="p-2 border-b w-3/6 font-semibold text-gray-700">Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLogins.map((log, idx) => (
                        <tr key={log._id} className={getRowColor(log.lastLogin)}>
                          <td className="p-2 border-b text-gray-900 whitespace-nowrap">{log.userName}</td>
                          <td className="p-2 border-b text-gray-700 whitespace-nowrap">{log.userRole}</td>
                          <td className="p-2 border-b text-gray-500 whitespace-nowrap">{formatDate(log.lastLogin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Pagination controls */}
                  {totalLastLoginsPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-2">
                      <button
                        className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                        onClick={() => setLastLoginsPage((p) => Math.max(1, p - 1))}
                        disabled={lastLoginsPage === 1}
                      >
                        {'<'}
                      </button>
                      <span className="text-xs">Page {lastLoginsPage} of {totalLastLoginsPages}</span>
                      <button
                        className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                        onClick={() => setLastLoginsPage((p) => Math.min(totalLastLoginsPages, p + 1))}
                        disabled={lastLoginsPage === totalLastLoginsPages}
                      >
                        {'>'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="w-full md:w-96 flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow p-4 mb-4 max-h-80 overflow-y-auto">
              <h3 className="text-lg md:text-xl font-bold mb-3">Student/Faculty Audit Preview</h3>
              <table className="min-w-full bg-white border rounded-lg overflow-hidden text-xs table-fixed">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-2 border-b w-2/6 font-semibold text-gray-700">Timestamp</th>
                    <th className="p-2 border-b w-2/6 font-semibold text-gray-700">User</th>
                    <th className="p-2 border-b w-1/6 font-semibold text-gray-700">Role</th>
                    <th className="p-2 border-b w-1/6 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center p-2 text-gray-500">No student/faculty activities found.</td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log, idx) => (
                      <tr key={log._id} className={idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
                        <td className="p-2 border-b text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                        <td className="p-2 border-b text-gray-900 whitespace-nowrap">{log.userName}</td>
                        <td className="p-2 border-b text-gray-900 whitespace-nowrap">{log.userRole}</td>
                        <td className="p-2 border-b text-gray-900 whitespace-nowrap">{log.action}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl shadow p-4 flex flex-col mb-4" style={{ maxWidth: 400, fontSize: '13px' }}>
              <span className="text-lg font-bold text-gray-800 mb-2">Academic Calendar</span>
              <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{ left: 'today prev,next', center: 'title', right: '' }}
                events={[...holidayEvents, ...classDates]}
                height="auto"
                fixedWeekCount={false}
                eventDisplay="block"
                eventContent={renderEventContent}
                dayCellDidMount={(info) => {
                  const dateStr = formatDateYMD(info.date);
                  const isHoliday = holidays.includes(dateStr);
                  const isClassDay = classDates.some(cd => cd.start === dateStr);
                  const frame = info.el.querySelector('.fc-daygrid-day-frame') || info.el;
                  if (isHoliday) {
                    frame.style.backgroundColor = '#fca5a5';
                  } else if (isClassDay) {
                    frame.style.backgroundColor = '#93c5fd';
                  } else {
                    frame.style.backgroundColor = '';
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
