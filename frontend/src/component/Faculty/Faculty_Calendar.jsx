import React, { useState, useEffect } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react"; 
import dayGridPlugin from "@fullcalendar/daygrid";
import "@fullcalendar/common/main.css"; 
import interactionPlugin from "@fullcalendar/interaction";

import ProfileMenu from "../ProfileMenu";
import Faculty_Navbar from "./Faculty_Navbar";
import ProfileModal from "../ProfileModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Faculty_Calendar() {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [adminEvents, setAdminEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [assignmentEvents, setAssignmentEvents] = useState([]);
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
    const fetchAssignments = async () => {
      try {
        const token = localStorage.getItem('token');
        // Fetch all classes the faculty teaches
        const resClasses = await fetch(`${API_BASE}/classes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const classes = await resClasses.json();
        // Filter classes where the logged-in user is the faculty (use school ID)
        const userSchoolId = JSON.parse(atob(token.split('.')[1])).userID;
        const myClasses = classes.filter(cls => cls.facultyID === userSchoolId);
        let events = [];
        for (const cls of myClasses) {
          const classCode = cls.classID || cls.classCode || cls._id;
          // Assignments
          const resA = await fetch(`${API_BASE}/assignments?classID=${classCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const assignments = await resA.json();
          if (Array.isArray(assignments)) {
            assignments.forEach(a => {
              if (a.dueDate) {
                const due = new Date(a.dueDate);
                const start = new Date(due);
                start.setHours(0, 0, 0, 0);
                events.push({
                  title: a.title, // Only the activity title
                  subtitle: cls.className || cls.name || 'Class', // Subject as subtitle
                  start: start.toISOString(),
                  end: due.toISOString(),
                  color: '#52c41a', // green for assignments (matches screenshot)
                  assignmentId: a._id,
                  classId: classCode,
                  type: 'assignment',
                });
              }
            });
          }
          // Quizzes
          const resQ = await fetch(`${API_BASE}/api/quizzes?classID=${classCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const quizzes = await resQ.json();
          if (Array.isArray(quizzes)) {
            quizzes.forEach(q => {
              if (q.dueDate) {
                const due = new Date(q.dueDate);
                const start = new Date(due);
                start.setHours(0, 0, 0, 0);
                events.push({
                  title: q.title, // Only the quiz title
                  subtitle: cls.className || cls.name || 'Class', // Subject as subtitle
                  start: start.toISOString(),
                  end: due.toISOString(),
                  color: '#a259e6', // purple for quizzes
                  assignmentId: q._id,
                  classId: classCode,
                  type: 'quiz',
                });
              }
            });
          }
        }
        setAssignmentEvents(events);
      } catch {
        // ignore assignment fetch errors
      }
    };
    fetchAssignments();
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
    ...assignmentEvents,
    ...classDates.map(date => ({
      start: date.start,
      display: 'background',
      backgroundColor: '#93c5fd'
    })),
  ];

  const handleDateClick = (arg) => {
    const clickedDate = arg.dateStr;
    setSelectedDate(clickedDate);
    const eventsForDay = [
      ...adminEvents.filter(ev => {
        const start = ev.start ? ev.start.slice(0, 10) : ev.date;
        const end = ev.end ? ev.end.slice(0, 10) : start;
        return clickedDate >= start && clickedDate <= end;
      }),
      ...assignmentEvents.filter(ev => {
      const start = ev.start ? ev.start.slice(0, 10) : ev.date;
      const end = ev.end ? ev.end.slice(0, 10) : start;
      return clickedDate >= start && clickedDate <= end;
      })
    ];
    setSelectedDayEvents(eventsForDay);
    setShowDayModal(true);
  };

  // Custom event content for calendar cells
  function renderEventContent(arg) {
    const { event } = arg;
    // Show a colored dot before the event title, due time, and subject (subtitle)
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
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden relative">
      <Faculty_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Calendar</h2>
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
          <ProfileMenu onOpen={() => setShowProfileModal(true)} />
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

        {!showProfileModal && (
          <div className="flex justify-end gap-8 mt-8">
            {/* <div className="flex flex-col items-center">
              <button style={{ backgroundColor: sidebarColor }} className="rounded-full shadow-lg w-20 h-20 flex items-center justify-center mb-2">
                <img src={generateEvent} alt="Generate" className="w-12 h-12" />
              </button>
              <span className="font-semibold text-blue-900">Generate</span>
            </div>
            <div className="flex flex-col items-center">
              <button style={{ backgroundColor: sidebarColor }} className="rounded-full shadow-lg w-20 h-20 flex items-center justify-center mb-2">
                <img src={createEvent} alt="Create" className="w-12 h-12" />
              </button>
              <span className="font-semibold text-blue-900">Create</span>
            </div>
            <div className="flex flex-col items-center">
              <button style={{ backgroundColor: sidebarColor }} className="rounded-full shadow-lg w-20 h-20 flex items-center justify-center mb-2">
                <img src={editEvent} alt="Edit" className="w-12 h-12" />
              </button>
              <span className="font-semibold text-blue-900">Edit</span>
            </div> */}
          </div>
        )}
        {showProfileModal && (
          <>

            <div className="fixed inset-0 bg-black bg-opacity-50 z-40"></div>

            <div className="fixed inset-0 flex items-center justify-center z-50">
              <ProfileModal onClose={() => setShowProfileModal(false)} />
        </div>
          </>
        )}
        {showDayModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black/50"></div>
            <div className="relative bg-white rounded-lg shadow-lg p-8 z-10 w-96" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">
                Events for {new Date(selectedDate).toLocaleDateString()}
              </h3>
              {selectedDayEvents.length === 0 ? (
                <p>No events scheduled.</p>
              ) : (
                <ul>
                  {selectedDayEvents.map(ev => (
                    <li key={ev._id || ev.assignmentId || ev.title} className="mb-2">
                      <span className="font-semibold">{ev.title}</span>
                      {ev.type && (
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${ev.type === 'quiz' ? 'bg-purple-200 text-purple-800' : 'bg-green-200 text-green-800'}`}>{ev.type === 'quiz' ? 'Quiz' : 'Assignment'}</span>
                      )}
                      <br />
                      {ev.end && (
                      <span className="text-sm text-gray-600">
                          Due: {new Date(ev.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      )}
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
    </div>
  );
}
