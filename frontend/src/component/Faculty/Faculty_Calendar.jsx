import React, { useState, useEffect } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react"; 
import dayGridPlugin from "@fullcalendar/daygrid";
import "@fullcalendar/common/main.css"; 

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

  useEffect(() => {
    (async () => {
      setLoadingEvents(true);
      try {
        const res = await axios.get("http://localhost:5000/events");
        setAdminEvents(res.data.map(ev => ({ ...ev, date: ev.date.slice(0, 10), color: '#1890ff' })));
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden relative">
      <Faculty_Navbar />
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
          <ProfileMenu onOpen={() => setShowProfileModal(true)} />
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            {loadingEvents ? (
              <div>Loading events...</div>
            ) : (
              <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                height="auto"
                events={allEvents}
              />
            )}
        </div>

        {!showProfileModal && (
          <div className="flex justify-end gap-8 mt-8">
            <div className="flex flex-col items-center">
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
            </div>
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
    </div>
    </div>
  );
}
