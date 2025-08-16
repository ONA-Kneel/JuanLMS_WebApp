import React, { useEffect, useState } from "react";
import VPE_Navbar from "./VPE_Navbar";
import ProfileMenu from "../ProfileMenu";
import ProfileModal from "../ProfileModal";
import { useNavigate } from "react-router-dom";
import compClassesIcon from "../../assets/compClassesIcon.png";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function VPE_Dashboard() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [classDates, setClassDates] = useState([]);

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

  // Fetch active general announcements for VPE and show the latest in a modal
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
      <VPE_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64 flex flex-col md:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">VPE Dashboard</h2>
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
            <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3 border w-1/3">Name</th>
                  <th className="p-3 border w-1/3">Track</th>
                  <th className="p-3 border w-1/3">Strand</th>
                </tr>
              </thead>
              <tbody>
                {/* Sample faculty data - 5 rows for preview */}
                {Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-3 border text-gray-900 whitespace-nowrap">
                      {index === 0 && "Test"}
                      {index === 1 && "Test"}
                      {index === 2 && "Test"}
                    </td>
                    <td className="p-3 border text-gray-900 whitespace-nowrap">
                      {index % 2 === 0 && "Academic Track"}
                      {index % 2 === 1 && "TVL Track"}
                    </td>
                    <td className="p-3 border text-gray-500">
                      {index % 2 === 0 && "ABM"}
                      {index % 3 === 1 && "Cookery"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
