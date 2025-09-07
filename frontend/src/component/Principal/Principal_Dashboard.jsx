import Principal_Navbar from "./Principal_Navbar";
import { useState, useEffect } from "react";
import ProfileModal from "../ProfileModal";
import { useNavigate } from "react-router-dom";
import compClassesIcon from "../../assets/compClassesIcon.png";
import ProfileMenu from "../ProfileMenu";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  // Announcement modal state
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementToShow, setAnnouncementToShow] = useState(null);

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

  // Fetch active general announcements for principal and show the latest in a modal
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

      {/* Announcement Modal */}
      {showAnnouncementModal && announcementToShow && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full relative">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">{announcementToShow.title}</h3>
            <div className="text-sm text-gray-500 mb-4">
              {announcementToShow.termName} • {announcementToShow.schoolYear}
            </div>
            <div className="mb-6 text-gray-800 whitespace-pre-wrap break-words overflow-hidden">
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
