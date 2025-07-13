//ADMIN CALENDAR
import React, { useState, useEffect } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import "@fullcalendar/common/main.css";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
// import generateEvent from "../../assets/generateEvent.png";
import createEvent from "../../assets/createEvent.png";
// import editEvent from "../../assets/editEvent.png";
import ProfileModal from "../ProfileModal";
import interactionPlugin from "@fullcalendar/interaction";
import ValidationModal from "../ValidationModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  const [newEvent, setNewEvent] = useState({ title: '', start: '', end: '', color: '#1890ff', isRange: false });
  const [editEventData, setEditEventData] = useState({ _id: '', title: '', start: '', end: '', color: '#1890ff', isRange: false });
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [classDates, setClassDates] = useState([]);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

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
      const res = await axios.get(`${API_BASE}/events`);
      setEvents(res.data.map(ev => ({
        ...ev,
        id: ev._id,
        start: ev.start ? ev.start.slice(0, 16) : '',
        end: ev.end ? ev.end.slice(0, 16) : '',
        color: ev.color || '#1890ff'
      })));
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
    setLoadingEvents(false);
  };

  useEffect(() => {
    fetchEvents();
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
    ...classDates.map(date => ({
      start: date.start,
      display: 'background',
      backgroundColor: '#93c5fd'  // light blue background for class days
    })),
  ];


  // Modal handlers
  const openEventModal = () => {
    setNewEvent({ title: '', start: '', end: '', color: '#1890ff', isRange: false });
    setShowEventModal(true);
  };
  const closeEventModal = () => setShowEventModal(false);

  // Handle form input
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewEvent((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Add new event
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.start) return;
    try {
      await axios.post(`${API_BASE}/events`, {
        title: newEvent.title,
        start: newEvent.start,
        end: newEvent.isRange && newEvent.end ? newEvent.end : undefined,
        color: newEvent.color
      });
      await fetchEvents();
      setShowEventModal(false);
    } catch (error) {
      console.error("Error adding event:", error);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Add Failed',
        message: "Failed to add event"
      });
    }
  };

  // Edit event modal handlers
  const openEditModal = (eventInfo) => {
    // Only allow editing admin events (not holidays)
    const ev = events.find(ev => ev._id === eventInfo.event.id);
    if (!ev) return; // Not an admin event
    setEditEventData({
      _id: ev._id,
      title: ev.title,
      start: ev.start,
      end: ev.end || '',
      color: ev.color || '#1890ff',
      isRange: !!ev.end
    });
    setShowEditModal(true);
  };
  const closeEditModal = () => setShowEditModal(false);

  // Handle edit form input
  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditEventData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Save edited event
  const handleEditEvent = async (e) => {
    e.preventDefault();
    const { _id, title, start, end, color, isRange } = editEventData;
    if (!_id || !title || !start) return;
    try {
      await axios.put(`${API_BASE}/events/${_id}`, {
        title,
        start,
        end: isRange && end ? end : undefined,
        color
      });
      await fetchEvents();
      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating event:", error);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: "Failed to update event"
      });
    }
  };

  // Delete event
  const handleDeleteEvent = async () => {
    const { _id } = editEventData;
    if (!_id) return;
    try {
      await axios.delete(`${API_BASE}/events/${_id}`);
      await fetchEvents();
      setShowEditModal(false);
    } catch (error) {
      console.error("Error deleting event:", error);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: "Failed to delete event"
      });
    }
  };

  // FullCalendar event click handler
  const handleEventClick = (eventInfo) => {
    // Only allow editing admin events (not holidays)
    const isAdminEvent = events.some(ev => ev._id === eventInfo.event.id);
    if (isAdminEvent) {
      openEditModal(eventInfo);
    }
  };

  // FullCalendar day click handler
  const handleDateClick = (arg) => {
    const clickedDate = arg.dateStr; // e.g. '2025-05-01'
    setSelectedDate(clickedDate);
    // Filter events that occur on this day
    const eventsForDay = events.filter(ev => {
      const start = ev.start.slice(0, 10);
      const end = ev.end ? ev.end.slice(0, 10) : start;
      return clickedDate >= start && clickedDate <= end;
    });
    setSelectedDayEvents(eventsForDay);
    setShowDayModal(true);
  };

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
            <p className="text-base md:text-lg">
              {academicYear ? `AY: ${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} |
              {currentTerm ? `${currentTerm.termName}` : "Loading..."} |
              {formattedDate}
            </p>
          </div>
          <ProfileMenu onOpen={() => setShowProfileModal(true)} />
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl shadow p-4 cursor-pointer">
          {loadingEvents ? (
            <div>Loading events...</div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="auto"
              events={allEvents}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
            />
          )}
        </div>

        {/* Add Event Modal */}
        {showEventModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50" >
            <div className="absolute inset-0 bg-black/50 filter backdrop-blur-sm"></div>
            
              <form onSubmit={handleAddEvent} className="relative bg-white rounded-lg shadow-lg p-8 z-10 w-80" >
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
                <label className="block mb-2 font-medium">Event Type</label>
                <div className="flex gap-2 mb-4">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      name="isRange"
                      checked={newEvent.isRange}
                      onChange={handleInputChange}
                    />
                    Range
                  </label>
                </div>
                <label className="block mb-2 font-medium">{newEvent.isRange ? 'Start' : 'Date & Time'}</label>
                <input
                  type="datetime-local"
                  name="start"
                  value={newEvent.start}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 mb-4"
                  required
                />
                {newEvent.isRange && (
                  <>
                    <label className="block mb-2 font-medium">End</label>
                    <input
                      type="datetime-local"
                      name="end"
                      value={newEvent.end}
                      onChange={handleInputChange}
                      className="w-full border rounded px-3 py-2 mb-4"
                      required
                    />
                  </>
                )}
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
            <div className="absolute inset-0 bg-black/50 filter backdrop-blur-sm" ></div>
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
              <label className="block mb-2 font-medium">Event Type</label>
              <div className="flex gap-2 mb-4">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    name="isRange"
                    checked={editEventData.isRange}
                    onChange={handleEditInputChange}
                  />
                  Range
                </label>
              </div>
              <label className="block mb-2 font-medium">{editEventData.isRange ? 'Start' : 'Date & Time'}</label>
              <input
                type="datetime-local"
                name="start"
                value={editEventData.start}
                onChange={handleEditInputChange}
                className="w-full border rounded px-3 py-2 mb-4"
                required
              />
              {editEventData.isRange && (
                <>
                  <label className="block mb-2 font-medium">End</label>
                  <input
                    type="datetime-local"
                    name="end"
                    value={editEventData.end}
                    onChange={handleEditInputChange}
                    className="w-full border rounded px-3 py-2 mb-4"
                    required
                  />
                </>
              )}
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

        {/* Day Events Modal */}
        {showDayModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* BACKDROP ONLY handles the close click */}
            <div
              className="absolute inset-0 bg-black/50"
            ></div>

            {/* MODAL CONTENT stops propagation */}
            <div
              className="relative bg-white rounded-lg shadow-lg p-8 z-10 w-96"
              onClick={(e) => e.stopPropagation()}
            >
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
                <button
                  onClick={() => setShowDayModal(false)}
                  className="px-4 py-2 rounded bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <ValidationModal
          isOpen={validationModal.isOpen}
          onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
          type={validationModal.type}
          title={validationModal.title}
          message={validationModal.message}
        />

      </div>
    </div>
  );
}