import React, { useEffect, useState } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import "@fullcalendar/common/main.css";
import interactionPlugin from "@fullcalendar/interaction";
import ProfileMenu from "../ProfileMenu";
import Principal_Navbar from "./Principal_Navbar";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Principal_Calendar() {
  const [holidays, setHolidays] = useState([]);
  const [adminEvents, setAdminEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [classDates, setClassDates] = useState([]);

  useEffect(() => {
    (async () => {
      setLoadingEvents(true);
      try {
        const res = await axios.get(`${API_BASE}/events`);
        setAdminEvents(res.data.map(ev => ({
          ...ev,
          start: ev.start ? ev.start.slice(0, 16) : '',
          end: ev.end ? ev.end.slice(0, 16) : '',
          color: ev.color || '#1890ff'
        })));
      } catch (err) {
        console.error("Failed to fetch events", err);
      }
      setLoadingEvents(false);
    })();
  }, []);

  useEffect(() => {
    const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
    Promise.all(
      years.map(year =>
        fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`).then(res => res.json())
      )
    ).then(results => {
      const allHolidayEvents = results.flatMap(data =>
        data.map(holiday => ({
          title: holiday.localName,
          date: holiday.date,
          color: '#ff4d4f',
        }))
      );
      setHolidays(allHolidayEvents);
    });
  }, []);

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

  const allEvents = [
    ...adminEvents,
    ...holidays,
    ...classDates.map(date => ({
      start: date.start,
      display: 'background',
      backgroundColor: '#93c5fd'
    })),
  ];

  const handleDateClick = (arg) => {
    const clickedDate = arg.dateStr;
    setSelectedDate(clickedDate);
    const eventsForDay = adminEvents.filter(ev => {
      const start = ev.start ? ev.start.slice(0, 10) : ev.date;
      const end = ev.end ? ev.end.slice(0, 10) : start;
      return clickedDate >= start && clickedDate <= end;
    });
    setSelectedDayEvents(eventsForDay);
    setShowDayModal(true);
  };

  // Add renderEventContent function for consistent event display
  function renderEventContent(arg) {
    const { event } = arg;
    const color = event.backgroundColor || event.color || '#1890ff';
    let timeStr = '';
    if (event.extendedProps.type === 'assignment' || event.extendedProps.type === 'quiz') {
      const end = event.end;
      if (end) {
        const d = new Date(end);
        timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
    const subtitle = event.extendedProps.subtitle;
    return (
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', marginRight: 4 }}></span>
          {timeStr && <b>{timeStr}</b>}
          <span style={{ marginLeft: timeStr ? 4 : 0 }}>{event.title}</span>
        </span>
        {subtitle && (
          <span style={{ fontSize: '0.8em', color: '#666', marginLeft: 16 }}>{subtitle}</span>
        )}
      </span>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Principal_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Calendar</h2>
            <p className="text-base md:text-lg">
              <span> </span>{academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
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
        <div className="bg-white rounded-xl shadow p-4">
          {loadingEvents ? (
            <div>Loading events...</div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="auto"
              events={allEvents}
              dateClick={handleDateClick}
              eventContent={renderEventContent}
            />
          )}
        </div>
      </div>

      {showDayModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDayModal(false)}></div>
          <div className="relative bg-white rounded-lg shadow-lg p-8 z-10 w-96">
            <h3 className="text-xl font-bold mb-4">
              Events for {new Date(selectedDate).toLocaleDateString()}
            </h3>
            {selectedDayEvents.length === 0 ? (
              <p>No events scheduled.</p>
            ) : (
              <ul>
                {selectedDayEvents.map(ev => (
                  <li key={ev._id} className="mb-2">
                    <span className="font-semibold">{ev.title}</span>
                    <br />
                    <span className="text-sm text-gray-600">
                      {ev.start
                        ? new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                      {ev.end && (
                        <>
                          {' - '}
                          {new Date(ev.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowDayModal(false)} className="px-4 py-2 rounded bg-gray-300">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
