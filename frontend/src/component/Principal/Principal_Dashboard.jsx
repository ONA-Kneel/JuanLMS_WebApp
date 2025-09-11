import Principal_Navbar from "./Principal_Navbar";
import { useState, useEffect } from "react";
import ProfileModal from "../ProfileModal";
import { useNavigate } from "react-router-dom";
import compClassesIcon from "../../assets/compClassesIcon.png";
import ProfileMenu from "../ProfileMenu";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Principal_Dashboard() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [classDates, setClassDates] = useState([]);
  // Faculty preview state
  const [facultyData, setFacultyData] = useState([]);
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [termReportsByFaculty, setTermReportsByFaculty] = useState({});

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
      // Temporarily disabled - setShowSuggestPw(attempts === 0 && !suppressed);
      setShowSuggestPw(false);
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

  /* ------------------------------ helpers ------------------------------ */
  const DISMISSED_KEY = "principal_dashboard_dismissed_announcements";
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

  // Fetch faculty list (active users with role 'faculty')
  useEffect(() => {
    async function fetchFaculty() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/users/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const users = await res.json();
          setFacultyData(Array.isArray(users) ? users.filter(u => u.role === 'faculty') : []);
        } else {
          setFacultyData([]);
        }
      } catch (e) {
        setFacultyData([]);
      }
    }
    fetchFaculty();
  }, []);

  // Fetch faculty assignments for preview when term is available
  useEffect(() => {
    async function fetchAssignments() {
      if (!currentTerm) return;
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/faculty-assignments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setFacultyAssignments(Array.isArray(data) ? data : []);
        } else {
          setFacultyAssignments([]);
          setPreviewError('Failed to load faculty assignments');
        }
      } catch (e) {
        setFacultyAssignments([]);
        setPreviewError('Failed to load faculty assignments');
      } finally {
        setPreviewLoading(false);
      }
    }
    fetchAssignments();
  }, [currentTerm]);

  // Fetch reports for current term/year to compute per-faculty submission status
  useEffect(() => {
    async function fetchReportsForTerm() {
      if (!currentTerm || !academicYear) return;
      try {
        const token = localStorage.getItem("token");
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const res = await fetch(
          `${API_BASE}/api/studentreports?termName=${encodeURIComponent(currentTerm.termName)}&schoolYear=${encodeURIComponent(schoolYearName)}&limit=10000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const reports = data.reports || data || [];
          const index = {};
          for (const r of reports) {
            const fid = r.facultyId?._id || r.facultyId;
            if (!fid) continue;
            const rDate = new Date(r.date).getTime();
            if (!index[fid]) {
              index[fid] = { latestDate: r.date };
            } else if (rDate > new Date(index[fid].latestDate).getTime()) {
              index[fid].latestDate = r.date;
            }
          }
          setTermReportsByFaculty(index);
        } else {
          setTermReportsByFaculty({});
        }
      } catch (e) {
        setTermReportsByFaculty({});
      }
    }
    fetchReportsForTerm();
  }, [currentTerm, academicYear]);

  // Light polling so preview status stays in sync
  useEffect(() => {
    let isCancelled = false;
    const POLL_MS = 15000;
    async function refresh() {
      if (!currentTerm || !academicYear) return;
      try {
        const token = localStorage.getItem("token");
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const res = await fetch(
          `${API_BASE}/api/studentreports?termName=${encodeURIComponent(currentTerm.termName)}&schoolYear=${encodeURIComponent(schoolYearName)}&limit=10000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const reports = data.reports || data || [];
        const index = {};
        for (const r of reports) {
          const fid = r.facultyId?._id || r.facultyId;
          if (!fid) continue;
          const rDate = new Date(r.date).getTime();
          if (!index[fid]) index[fid] = { latestDate: r.date };
          else if (rDate > new Date(index[fid].latestDate).getTime()) index[fid].latestDate = r.date;
        }
        if (!isCancelled) setTermReportsByFaculty(index);
      } catch {}
    }
    const id = setInterval(refresh, POLL_MS);
    return () => { isCancelled = true; clearInterval(id); };
  }, [currentTerm, academicYear]);

  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/audit-logs?limit=5`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(data.logs || []);
        }
      } catch (err) {
        console.error("Failed to fetch audit logs", err);
      }
    }
    fetchAuditLogs();
  }, []);

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

  const formatDateYMD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

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

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      <Principal_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64 flex flex-col md:flex-row gap-6">
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
        {/* Main Content */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Principal Dashboard</h2>
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

          {/* Faculty Report Preview */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Faculty Report Preview</h3>
              
            </div>
            {/* Build preview rows from live data */}
            {previewLoading ? (
              <div className="text-center py-6 text-sm text-gray-600">Loading preview...</div>
            ) : previewError ? (
              <div className="text-center py-6 text-sm text-red-600">{previewError}</div>
            ) : (
              <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-3 border w-2/3">Name</th>
                    <th className="p-3 border w-1/3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows = facultyData.slice(0, 3);
                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td colSpan={2} className="p-6 text-center text-gray-500">No data</td>
                        </tr>
                      );
                    }
                    return rows.map((f, idx) => (
                      <tr key={f._id || idx} className="hover:bg-gray-50">
                        <td className="p-3 border text-gray-900 whitespace-nowrap">{f.firstname} {f.lastname}</td>
                        <td className="p-3 border text-gray-900 whitespace-nowrap">
                          {termReportsByFaculty[f._id]
                            ? `Submitted - ${new Date(termReportsByFaculty[f._id].latestDate).toLocaleDateString()}`
                            : 'Pending'}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Right Side: ProfileMenu and Audit Preview stacked */}
        <div className="w-full md:w-96 flex flex-col gap-4 items-end">
          <div className="w-full flex justify-end">
            <ProfileMenu />
          </div>
          <div className="w-full bg-white rounded-2xl shadow p-4 h-fit max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Audit Preview</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-semibold p-1">Timestamp</th>
                    <th className="text-left font-semibold p-1">User</th>
                    <th className="text-left font-semibold p-1">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan={3} className="text-center text-gray-400 p-2">No logs found</td></tr>
                  ) : (
                    auditLogs.map((log, idx) => (
                      <tr key={log._id || idx} className="border-b last:border-0">
                        <td className="p-1 whitespace-nowrap">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
                        <td className="p-1 whitespace-nowrap">{log.userName || '-'}</td>
                        <td className="p-1 whitespace-nowrap">{log.details || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Academic Calendar */}
          <div className="w-full bg-white rounded-2xl shadow p-4 flex flex-col" style={{ maxWidth: 400, fontSize: '13px' }}>
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
  );
}
