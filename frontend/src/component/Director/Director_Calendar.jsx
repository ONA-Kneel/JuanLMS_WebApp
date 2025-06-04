import React, { useEffect, useState } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import "@fullcalendar/common/main.css";
import interactionPlugin from "@fullcalendar/interaction";
import ProfileMenu from "../ProfileMenu";
import Director_Navbar from "./Director_Navbar";

export default function Director_Calendar() {
  const [holidays, setHolidays] = useState([]);
  const [adminEvents, setAdminEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

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

  const allEvents = [...adminEvents, ...holidays];

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
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Director_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Calendar</h2>
            <p className="text-base md:text-lg">
              {new Date().toLocaleDateString("en-US", {
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
