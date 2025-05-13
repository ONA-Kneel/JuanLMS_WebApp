import React, { useState, useEffect } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import "@fullcalendar/common/main.css";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import generateEvent from "../../assets/generateEvent.png";
import createEvent from "../../assets/createEvent.png";
import editEvent from "../../assets/editEvent.png";
import ProfileModal from "../ProfileModal";

const PRESET_COLORS = [
  "#1890ff", // blue
  "#52c41a", // green
  "#faad14", // yellow
  "#eb2f96", // pink
  "#722ed1", // purple
];

// Add custom style for event cursor
const calendarEventCursorStyle = `
  .fc-event:not(.fc-holiday-event):hover {
    cursor: pointer;
  }
`;

export default function Admin_Calendar() {
  const today = new Date();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', color: '#1890ff' });
  const [editEventData, setEditEventData] = useState({ _id: '', title: '', date: '', color: '#1890ff' });
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sidebarColor = "#002366";

  // Load events from backend on mount
  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await axios.get("http://localhost:5000/events");
      setEvents(res.data.map(ev => ({ ...ev, date: ev.date.slice(0, 10), color: ev.color || '#1890ff' })));
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
    setLoadingEvents(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch holidays
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

  // Combine user events and holidays
  const allEvents = [
    ...events.map(ev => ({ ...ev, className: 'cursor-pointer' })),
    ...holidays.map(ev => ({ ...ev, className: 'fc-holiday-event' })),
  ];

  // Modal handlers
  const openEventModal = () => {
    setNewEvent({ title: '', date: '', color: '#1890ff' });
    setShowEventModal(true);
  };
  const closeEventModal = () => setShowEventModal(false);

  // Handle form input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEvent((prev) => ({ ...prev, [name]: value }));
  };

  // Add new event
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;
    try {
      await axios.post("http://localhost:5000/events", newEvent);
      await fetchEvents();
      setShowEventModal(false);
    } catch (err) {
      alert("Failed to add event");
    }
  };

  // Edit event modal handlers
  const openEditModal = (eventInfo) => {
    // Only allow editing admin events (not holidays)
    const ev = events.find(ev => ev.title === eventInfo.event.title && ev.date === eventInfo.event.startStr);
    if (!ev) return; // Not an admin event
    setEditEventData({ _id: ev._id, title: ev.title, date: ev.date, color: ev.color || '#1890ff' });
    setShowEditModal(true);
  };
  const closeEditModal = () => setShowEditModal(false);

  // Handle edit form input
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditEventData((prev) => ({ ...prev, [name]: value }));
  };

  // Save edited event
  const handleEditEvent = async (e) => {
    e.preventDefault();
    const { _id, title, date, color } = editEventData;
    if (!_id || !title || !date) return;
    try {
      await axios.put(`http://localhost:5000/events/${_id}`, { title, date, color });
      await fetchEvents();
      setShowEditModal(false);
    } catch (err) {
      alert("Failed to update event");
    }
  };

  // Delete event
  const handleDeleteEvent = async () => {
    const { _id } = editEventData;
    if (!_id) return;
    try {
      await axios.delete(`http://localhost:5000/events/${_id}`);
      await fetchEvents();
      setShowEditModal(false);
    } catch (err) {
      alert("Failed to delete event");
    }
  };

  // FullCalendar event click handler
  const handleEventClick = (eventInfo) => {
    // Only allow editing admin events (not holidays)
    const isAdminEvent = events.some(ev => ev.title === eventInfo.event.title && ev.date === eventInfo.event.startStr);
    if (isAdminEvent) {
      openEditModal(eventInfo);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden relative">
      {/* Inject custom style for event cursor */}
      <style>{calendarEventCursorStyle}</style>
      <Admin_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Calendar</h2>
            <p className="text-base md:text-lg">{formattedDate}</p>
          </div>
          <ProfileMenu onOpen={() => setShowProfileModal(true)} />
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl shadow p-4">
          {loadingEvents ? (
            <div>Loading events...</div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin]}
              initialView="dayGridMonth"
              height="auto"
              events={allEvents}
              eventClick={handleEventClick}
            />
          )}
        </div>

        {/* Add Event Modal */}
        {showEventModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black bg-opacity-20" onClick={closeEventModal}></div>
            <form onSubmit={handleAddEvent} className="relative bg-white rounded-lg shadow-lg p-8 z-10 w-80">
              <h3 className="text-xl font-bold mb-4">Add Event</h3>
              <label className="block mb-2 font-medium">Title</label>
              <input
                type="text"
                name="title"
                value={newEvent.title}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2 mb-4"
                required
              />
              <label className="block mb-2 font-medium">Date</label>
              <input
                type="date"
                name="date"
                value={newEvent.date}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2 mb-4"
                required
              />
              <label className="block mb-2 font-medium">Color</label>
              <div className="flex gap-2 mb-4">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="w-8 h-8 rounded-full border-2"
                    style={{ backgroundColor: preset, borderColor: newEvent.color === preset ? 'black' : '#e5e7eb' }}
                    onClick={() => setNewEvent((prev) => ({ ...prev, color: preset }))}
                    aria-label={`Choose color ${preset}`}
                  />
                ))}
              </div>
              <input
                type="color"
                name="color"
                value={newEvent.color}
                onChange={handleInputChange}
                className="w-12 h-8 mb-4 border-none"
                style={{ background: 'none' }}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeEventModal} className="px-4 py-2 rounded bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Add</button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Event Modal */}
        {showEditModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black bg-opacity-20" onClick={closeEditModal}></div>
            <form onSubmit={handleEditEvent} className="relative bg-white rounded-lg shadow-lg p-8 z-10 w-80">
              <h3 className="text-xl font-bold mb-4">Edit Event</h3>
              <label className="block mb-2 font-medium">Title</label>
              <input
                type="text"
                name="title"
                value={editEventData.title}
                onChange={handleEditInputChange}
                className="w-full border rounded px-3 py-2 mb-4"
                required
              />
              <label className="block mb-2 font-medium">Date</label>
              <input
                type="date"
                name="date"
                value={editEventData.date}
                onChange={handleEditInputChange}
                className="w-full border rounded px-3 py-2 mb-4"
                required
              />
              <label className="block mb-2 font-medium">Color</label>
              <div className="flex gap-2 mb-4">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="w-8 h-8 rounded-full border-2"
                    style={{ backgroundColor: preset, borderColor: editEventData.color === preset ? 'black' : '#e5e7eb' }}
                    onClick={() => setEditEventData((prev) => ({ ...prev, color: preset }))}
                    aria-label={`Choose color ${preset}`}
                  />
                ))}
              </div>
              <input
                type="color"
                name="color"
                value={editEventData.color}
                onChange={handleEditInputChange}
                className="w-12 h-8 mb-4 border-none"
                style={{ background: 'none' }}
              />
              <div className="flex justify-between gap-2 mt-4">
                <button type="button" onClick={handleDeleteEvent} className="px-4 py-2 rounded bg-red-500 text-white">Delete</button>
                <div className="flex gap-2">
                  <button type="button" onClick={closeEditModal} className="px-4 py-2 rounded bg-gray-300">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
                </div>
              </div>
            </form>
          </div>
        )}

        {showProfileModal && (
          <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40"></div>
            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <ProfileModal onClose={() => setShowProfileModal(false)} />
            </div>
          </>
        )}

        {/* Action Buttons Row (not floating) */}
        {!showProfileModal && (
          <div className="flex justify-end gap-8 mt-8">
            {/* <div className="flex flex-col items-center">
              <button style={{ backgroundColor: sidebarColor }} className="rounded-full shadow-lg w-20 h-20 flex items-center justify-center mb-2">
                <img src={generateEvent} alt="Generate" className="w-12 h-12" />
              </button>
              <span className="font-semibold text-blue-900">Generate</span>
            </div> */}
            <div className="flex flex-col items-center">
              <button
                style={{ backgroundColor: sidebarColor }}
                className="rounded-full shadow-lg w-20 h-20 flex items-center justify-center mb-2"
                onClick={openEventModal}
              >
                <img src={createEvent} alt="Create" className="w-12 h-12" />
              </button>
              <span className="font-semibold text-blue-900">Create</span>
            </div>
            {/* <div className="flex flex-col items-center">
              <button style={{ backgroundColor: sidebarColor }} className="rounded-full shadow-lg w-20 h-20 flex items-center justify-center mb-2">
                <img src={editEvent} alt="Edit" className="w-12 h-12" />
              </button>
              <span className="font-semibold text-blue-900">Edit</span>
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
}