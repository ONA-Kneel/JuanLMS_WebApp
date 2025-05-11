//student_calendar.js

import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import "@fullcalendar/common/main.css";
import Student_Navbar from "./Student_Navbar";
import ProfileMenu from "../ProfileMenu";
import axios from "axios";

export default function Student_Calendar() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const res = await axios.get("http://localhost:5000/events");
      console.log("Fetched events:", res.data); // <--- Add this
      setEvents(res.data.map(e => ({
        title: e.title,
        date: e.date,
        allDay: true,
      })));
    };
    fetchEvents();
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Student_Navbar />
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
          <ProfileMenu />
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            height="auto"
            events={events}
          />
        </div>
      </div>
    </div>
  );
};