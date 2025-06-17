//student_calendar.js

import React, { useEffect, useState } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "@fullcalendar/common/main.css";
import Student_Navbar from "./Student_Navbar";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Student_Calendar() {
  const [adminEvents, setAdminEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  // const [assignmentEvents, setAssignmentEvents] = useState([]); // commented out with assignments useEffect

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
    async function fetchAcademicYearAndTerm() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const year = await yearRes.json();
          setAcademicYear(year);
        }
        const termRes = await fetch(`${API_BASE}/api/terms/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (termRes.ok) {
          const term = await termRes.json();
          setCurrentTerm(term);
        }
      } catch (err) {
        console.error("Failed to fetch academic year or term", err);
      }
    }
    fetchAcademicYearAndTerm();
  }, []);

  // Fetch assignments/quizzes for student's classes and add as calendar events
  /*
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const token = localStorage.getItem('token');
        const resClasses = await fetch('https://juanlms-webapp-server.onrender.com/classes/my-classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const classes = await resClasses.json();
        let events = [];
        for (const cls of classes) {
          const res = await fetch(`https://juanlms-webapp-server.onrender.com/assignments?classID=${cls._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach(a => {
              if (a.dueDate) {
                events.push({
                  title: `${a.title} (${cls.className || cls.name || 'Class'})`,
                  start: a.dueDate,
                  end: a.dueDate,
                  color: a.type === 'quiz' ? '#a259e6' : '#00b894',
                  assignmentId: a._id,
                  classId: cls._id,
                  type: a.type,
                });
              }
            });
          }
        }
        console.log('Assignment events for calendar:', events);
        setAssignmentEvents(events);
      } catch {
        // ignore assignment fetch errors
      }
    };
    fetchAssignments();
  }, []);
  */

  const allEvents = [...adminEvents, ...holidays /*, ...assignmentEvents*/];

  const handleDateClick = (arg) => {
    const clickedDate = arg.dateStr;
    setSelectedDate(clickedDate);
    const eventsForDay = [
      ...adminEvents.filter(ev => {
        const start = ev.start ? ev.start.slice(0, 10) : ev.date;
        const end = ev.end ? ev.end.slice(0, 10) : start;
        return clickedDate >= start && clickedDate <= end;
      }),
      // ...assignmentEvents.filter(ev => {
      //   const start = ev.start ? ev.start.slice(0, 10) : ev.date;
      //   const end = ev.end ? ev.end.slice(0, 10) : start;
      //   return clickedDate >= start && clickedDate <= end;
      // })
    ];
    setSelectedDayEvents(eventsForDay);
    setShowDayModal(true);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Student_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Calendar</h2>
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
          <ProfileMenu />
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
            />
          )}
        </div>

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
    </div>
  );
};