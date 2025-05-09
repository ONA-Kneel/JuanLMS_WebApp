import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import "@fullcalendar/common/main.css";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import generateEvent from "../../assets/generateEvent.png";
import createEvent from "../../assets/createEvent.png";
import editEvent from "../../assets/editEvent.png";
import ProfileModal from "../ProfileModal";

export default function Admin_Calendar() {
  const today = new Date();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Sidebar color (adjust if your sidebar uses a different blue)
  const sidebarColor = "#002366";

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden relative">
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
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            height="auto"
          />
        </div>

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
      </div>
    </div>
  );
}