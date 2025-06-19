import { useState, useEffect } from "react";
import Admin_Navbar from "./Admin_Navbar";
// import { useState } from "react";

import ProfileModal from "../ProfileModal"; // reuse if you want it for faculty too
// import { useNavigate } from "react-router-dom";
import ProfileMenu from "../ProfileMenu";

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
// import '@fullcalendar/core/main.css';
// import '@fullcalendar/daygrid/main.css';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Admin_Dashboard() {
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);
  const [accountCounts, setAccountCounts] = useState({ admin: 0, faculty: 0, student: 0 });
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [holidays, setHolidays] = useState([]); 
  const [classDates, setClassDates] = useState([]); 

useEffect(() => {
  const token = localStorage.getItem('token');

  // Fetch recent audit logs
  fetch(`${API_BASE}/audit-logs?page=1&limit=5`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data?.logs) setRecentAuditLogs(data.logs);
    });

  // Fetch account counts
  fetch(`${API_BASE}/user-counts`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data) setAccountCounts(data);
    })
    .catch(() => {});

  // Fetch academic year only
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

// Fetch current term when academicYear changes
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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

  const schoolYearProgress = calculateSchoolYearProgress();

  // Helper to map holidays to FullCalendar events
  const holidayEvents = holidays.map(date => {
    // Try to find a label for the holiday (if you have a mapping)
    let title = '';
    if (date.includes('06-12')) title = 'Araw ng Kalayaan';
    else if (date.includes('06-06')) title = "Eid'l Adha";
    else title = 'Holiday';
    return { title, date, color: '#f87171' };
  });

  function renderEventContent(eventInfo) {
    return (
      <div style={{
        background: eventInfo.event.backgroundColor,
        color: 'white',
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '0.85em',
        marginTop: '2px',
        display: 'inline-block',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {eventInfo.event.title}
      </div>
    );
  }

  // Helper to format date as YYYY-MM-DD
  function formatDateYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return (
    <div className="flex flex-col min-h-screen overflow-hidden font-poppinsr ">
      <Admin_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header (full width) */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `AY: ${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
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
        {/* Main Content and Sidebar */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Stats Row - aligned with header */}
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

            {/* Graph/Chart Placeholder */}
            {/* <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center mb-4 min-h-[220px]">
              <span className="text-lg font-bold text-gray-800 mb-2">User Registrations Over Time</span>
              <div className="w-full h-40 flex items-center justify-center text-gray-400">
                <span>(Graph coming soon)</span>
              </div>
            </div> */}

            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center mb-4 min-h-[220px] w-full">
              <span className="text-lg font-bold text-gray-800 mb-4">School Year Progress</span>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
                <div
                  className="bg-indigo-600 h-6 text-white text-sm font-semibold text-center"
                  style={{ width: `${schoolYearProgress}%` }}
                >
                  {schoolYearProgress}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {academicYear?.startDate && academicYear?.endDate
                  ? `From ${new Date(academicYear.startDate).toLocaleDateString()} to ${new Date(academicYear.endDate).toLocaleDateString()}`
                  : `Estimating from June 1, ${academicYear?.schoolYearStart} to April 30, ${academicYear?.schoolYearEnd}`}
              </p>
            </div>

            {/* Active Users Today (Placeholder) */}
            <div className="bg-white rounded-xl shadow p-6 flex flex-col mb-2">
              <span className="text-lg font-bold text-gray-800 mb-2">Active Users Today</span>
              <span className="text-3xl font-bold text-indigo-600">--</span>
              <span className="text-gray-500 text-sm">(Coming soon)</span>
            </div>

            {/* Pending Account Approvals (Placeholder) */}
            {/* <div className="bg-white rounded-xl shadow p-6 flex flex-col mb-2">
              <span className="text-lg font-bold text-gray-800 mb-2">Pending Account Approvals</span>
              <span className="text-3xl font-bold text-yellow-600">--</span>
              <span className="text-gray-500 text-sm">(Coming soon)</span>
            </div> */}

            {/* System Announcements (Placeholder) */}
            {/* <div className="bg-white rounded-xl shadow p-6 flex flex-col mb-2">
              <span className="text-lg font-bold text-gray-800 mb-2">System Announcements</span>
              <ul className="list-disc ml-6 text-gray-700">
                <li>Welcome to the new Admin Dashboard!</li>
                <li>(More announcements soon...)</li>
              </ul>
            </div> */}
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-96 flex flex-col gap-6">
            {/* Audit Preview (smaller, scrollable) */}
            <div className="bg-white rounded-xl shadow p-4 mb-4 max-h-80 overflow-y-auto">
              <h3 className="text-lg md:text-xl font-bold mb-3">Audit Preview</h3>
              <table className="min-w-full bg-white border rounded-lg overflow-hidden text-xs table-fixed">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-2 border-b w-2/6 font-semibold text-gray-700">Timestamp</th>
                    <th className="p-2 border-b w-2/6 font-semibold text-gray-700">User</th>
                    <th className="p-2 border-b w-1/6 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center p-2 text-gray-500">
                        No recent audit logs found.
                      </td>
                    </tr>
                  ) : (
                    recentAuditLogs.map((log, idx) => (
                      <tr key={log._id} className={idx % 2 === 0 ? "bg-white hover:bg-gray-50 transition" : "bg-gray-50 hover:bg-gray-100 transition"}>
                        <td className="p-2 border-b text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                        <td className="p-2 border-b text-gray-900 whitespace-nowrap">{log.userName}</td>
                        <td className="p-2 border-b text-gray-900 whitespace-nowrap">{log.action}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Academic Calendar using FullCalendar */}
            <div
              className="bg-white rounded-xl shadow p-4 flex flex-col mb-4"
              style={{ maxWidth: 400, fontSize: '13px', maxHeight: ""}}
            >
              <span className="text-lg font-bold text-gray-800 mb-2">Academic Calendar</span>
              <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'today prev,next',
                  center: 'title',
                  right: ''
                }}
                events={holidayEvents}
                height={280}
                dayMaxEventRows={2}
                eventDisplay="block"
                eventContent={renderEventContent}
                dayCellDidMount={info => {
                  // For FullCalendar v6+, shade the .fc-daygrid-day-frame
                  const dateStr = formatDateYMD(info.date);
                  const frame = info.el.querySelector('.fc-daygrid-day-frame') || info.el;
                  if (holidays.includes(dateStr)) {
                    frame.style.background = '#fca5a5'; // red-300
                  } else if (classDates.includes(dateStr)) {
                    frame.style.background = '#bbf7d0'; // green-200
                  } else {
                    frame.style.background = '';
                  }
                }}
              />
              <style>
                {`
                  .fc .fc-toolbar-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                  }
                  .fc .fc-button, .fc .fc-button-primary {
                    font-size: 0.8rem !important;
                    padding: 2px 8px !important;
                    min-width: 0 !important;
                    height: 28px !important;
                    border-radius: 6px !important;
                  }
                  .fc .fc-button-group {
                    gap: 2px;
                  }
                  .fc .fc-daygrid-day-frame {
                    min-height: 32px;
                  }
                  .fc .fc-daygrid-day-number {
                    font-size: 0.85em;
                  }
                  .fc .fc-scrollgrid {
                    border-radius: 8px;
                  }
                `}
              </style>
            </div>

            {/* Recent Logins (Placeholder) */}
            <div className="bg-white rounded-xl shadow p-4 mb-4">
              <h4 className="text-md font-bold mb-2">Last Logins Preview</h4>
              <ul className="text-gray-700 text-sm list-disc ml-4">
                <li>-- (Coming soon)</li>
              </ul>
            </div>

            {/* Quick Actions (Placeholder) */}
            {/* <div className="bg-white rounded-xl shadow p-4">
              <h4 className="text-md font-bold mb-2">Quick Actions</h4>
              <ul className="text-gray-700 text-sm list-disc ml-4">
                <li>Add User (Coming soon)</li>
                <li>View Reports (Coming soon)</li>
              </ul>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
