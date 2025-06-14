import React, { useState, useEffect } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react"; 
import dayGridPlugin from "@fullcalendar/daygrid";
import "@fullcalendar/common/main.css"; 
import interactionPlugin from "@fullcalendar/interaction";

import ProfileMenu from "../ProfileMenu";
import Faculty_Navbar from "./Faculty_Navbar";
import generateEvent from "../../assets/generateEvent.png";
import createEvent from "../../assets/createEvent.png";
import editEvent from "../../assets/editEvent.png";
import ProfileModal from "../ProfileModal";

export default function Faculty_Calendar() {
  const sidebarColor = "#002366";
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [adminEvents, setAdminEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [assignmentEvents, setAssignmentEvents] = useState([]);

  useEffect(() => {
    (async () => {
      setLoadingEvents(true);
      try {
        const res = await axios.get("http://localhost:5000/events");
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
        const resClasses = await fetch('http://localhost:5000/classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const classes = await resClasses.json();
        // Filter classes where the logged-in user is the faculty
        const userId = JSON.parse(atob(token.split('.')[1])).id || JSON.parse(atob(token.split('.')[1]))._id;
        const myClasses = classes.filter(cls => cls.facultyID === userId || cls.facultyID === userId?.toString());
        let events = [];
        for (const cls of myClasses) {
          const res = await fetch(`http://localhost:5000/assignments?classID=${cls._id}`, {
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
        setAssignmentEvents(events);
      } catch {
        // ignore assignment fetch errors
      }
    };
    fetchAssignments();
  }, []);

  const allEvents = [...adminEvents, ...holidays, ...assignmentEvents];

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

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden relative">
      <Faculty_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Calendar</h2>
              <p className="text-base md:text-lg"> Academic Year and Term here | 
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
    </div>
  );
}
