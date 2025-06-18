import { useState, useEffect } from "react";
import Admin_Navbar from "./Admin_Navbar";
// import { useState } from "react";

import ProfileModal from "../ProfileModal"; // reuse if you want it for faculty too
// import { useNavigate } from "react-router-dom";
import ProfileMenu from "../ProfileMenu";

import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

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

  // Fetch academic year and term, then compute holidays and class days
  async function fetchAcademicYearAndTerm() {
    try {
      const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (yearRes.ok) {
        const year = await yearRes.json();
        setAcademicYear(year);

        const termRes = await fetch(`${API_BASE}/api/terms/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (termRes.ok) {
          const term = await termRes.json();
          setCurrentTerm(term);
        }

        // Fetch Philippine holidays from Nager.Date API
    const today = new Date();
    const schoolYearStart = year?.schoolYearStart || today.getFullYear();
    const schoolYearEnd = year?.schoolYearEnd || (today.getMonth() > 4 ? today.getFullYear() + 1 : today.getFullYear());

    // Fetch holidays from Nager.Date API
    const [holidaysStart, holidaysEnd] = await Promise.all([
      fetch(`https://date.nager.at/api/v3/PublicHolidays/${schoolYearStart}/PH`).then(r => r.json()),
      fetch(`https://date.nager.at/api/v3/PublicHolidays/${schoolYearEnd}/PH`).then(r => r.json()),
    ]);

    // ✅ Skip Date conversion, just use API dates as strings
    const formattedHolidaysStart = holidaysStart.map(h => h.date); // 'YYYY-MM-DD'
    const formattedHolidaysEnd = holidaysEnd.map(h => h.date);     // 'YYYY-MM-DD'

    // Fallback critical holidays
    const fallbackHolidays = [
      `${schoolYearStart}-06-12`, // Independence Day
      `${schoolYearStart}-12-25`, // Christmas
      `${schoolYearStart}-01-01`, // New Year
    ];

    // ✅ Merge + remove duplicates
    const allHolidays = Array.from(new Set([
      ...formattedHolidaysStart,
      ...formattedHolidaysEnd,
      ...fallbackHolidays
    ]));

    // Build class days (excluding weekends & holidays)
    const start = new Date(`${year.schoolYearStart}-06-01`);
    const end = new Date(`${year.schoolYearEnd}-04-30`);
    console.log("📅 School Year Start Date:", start);
    console.log("📅 School Year End Date:", end);

    const tempClassDates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      // Skip holidays
      if (allHolidays.includes(dateStr)) continue;

      tempClassDates.push(dateStr);
    }

    console.log("✅ Valid classDates:", tempClassDates);
    setHolidays(allHolidays);
    setClassDates(tempClassDates);


      }
    } catch (err) {
      console.error("Failed to fetch academic year, term, or holidays", err);
    }
  }

  fetchAcademicYearAndTerm();
}, []);


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
              {currentTerm ? `Current Term: ${currentTerm.termName}` : "Loading..."} | 
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

            <div className="bg-white rounded-xl shadow p-6 flex flex-col mb-2">
              <span className="text-lg font-bold text-gray-800 mb-4">Academic Calendar</span>
                <Calendar
                  tileClassName={({ date }) => {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    const dateStr = `${y}-${m}-${d}`;

                    const isHoliday = holidays.includes(dateStr);
                    const isClassDay = classDates.includes(dateStr);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    if (isHoliday) return '!bg-red-300 !text-white !font-bold';
                    if (isClassDay) return '!bg-green-200 !text-black !font-semibold';
                    if (isWeekend) return '!text-black';
                    return '';
                  }}
                />
              <div className="mt-4 text-sm">
                <div><span className="inline-block w-3 h-3 bg-red-300 mr-2 rounded-full"></span> Holiday</div>
                <div><span className="inline-block w-3 h-3 bg-green-200 mr-2 rounded-full"></span> Class Day</div>
              </div>
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
