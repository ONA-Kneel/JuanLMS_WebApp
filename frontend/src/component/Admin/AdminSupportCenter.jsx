import React, { useState } from "react";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";

// Dummy data for tickets (20+ samples)
const tickets = [
  { id: "SJDD1234567890", subject: "Login Issue", context: "Can't login", status: "Open" },
  { id: "SJDD0987654321", subject: "Bug Report", context: "Page crashes", status: "Open" },
  { id: "SJDD1111111111", subject: "Feature Request", context: "Add dark mode", status: "In Transit" },
  { id: "SJDD2222222222", subject: "Account Issue", context: "Cannot update email", status: "Seen" },
  { id: "SJDD3333333333", subject: "UI Glitch", context: "Sidebar overlaps content", status: "Completed" },
  { id: "SJDD4444444444", subject: "Performance", context: "App is slow on login", status: "Open" },
  { id: "SJDD5555555555", subject: "Security", context: "Password reset not working", status: "Open" },
  { id: "SJDD6666666666", subject: "Notification Bug", context: "No notifications received", status: "Seen" },
  { id: "SJDD7777777777", subject: "Mobile Issue", context: "Layout broken on mobile", status: "In Transit" },
  { id: "SJDD8888888888", subject: "File Upload", context: "Cannot upload PDF", status: "Completed" },
  { id: "SJDD9999999999", subject: "Integration", context: "Google login fails", status: "Open" },
  { id: "SJDD1010101010", subject: "Accessibility", context: "Screen reader issues", status: "Seen" },
  { id: "SJDD1212121212", subject: "Crash", context: "App crashes on submit", status: "Open" },
  { id: "SJDD1313131313", subject: "Data Loss", context: "Lost progress after refresh", status: "Completed" },
  { id: "SJDD1414141414", subject: "Sync Issue", context: "Data not syncing", status: "Open" },
  { id: "SJDD1515151515", subject: "Email Bug", context: "No confirmation email", status: "Seen" },
  { id: "SJDD1616161616", subject: "Export Problem", context: "Cannot export CSV", status: "Open" },
  { id: "SJDD1717171717", subject: "Import Problem", context: "Import stuck at 99%", status: "In Transit" },
  { id: "SJDD1818181818", subject: "UI Feedback", context: "Button color too light", status: "Completed" },
  { id: "SJDD1919191919", subject: "Other", context: "Miscellaneous feedback", status: "Open" },
  { id: "SJDD2020202020", subject: "Test Ticket", context: "This is a test ticket", status: "Open" },
];

export default function AdminSupportCenter() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr ">
      <Admin_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Support Center</h2>
            <p className="text-base md:text-lg">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <ProfileMenu isAdmin={true} />
        </div>
        <div className="flex h-[70vh] bg-white rounded-2xl shadow-md">
          <div className="w-80 border-r border-gray-200 overflow-y-auto bg-white p-2" style={{ maxHeight: '100%' }}>
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                className={`p-4 mb-2 rounded-lg cursor-pointer border border-transparent hover:border-[#9575cd] hover:bg-[#ede7f6] transition-all ${selected === ticket.id ? 'bg-[#d1c4e9] border-[#9575cd] shadow' : ''}`}
                onClick={() => setSelected(ticket.id)}
              >
                <b className="block text-base">{ticket.subject}</b>
                <span className="block text-xs text-gray-500">{ticket.id}</span>
                <span className="block text-xs mt-1 font-semibold text-[#7e57c2]">{ticket.status}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 p-8 bg-white rounded-r-2xl shadow-inner">
            {selected ? (
              <>
                <h3 className="text-xl font-semibold mb-2">{tickets.find(t => t.id === selected).subject}</h3>
                <div className="mb-2 text-sm text-[#7e57c2] font-semibold">Ticket No: {tickets.find(t => t.id === selected).id} | Status: {tickets.find(t => t.id === selected).status}</div>
                <p className="mb-4 text-gray-700">{tickets.find(t => t.id === selected).context}</p>
                <textarea placeholder="Respond to this ticket..." className="w-full min-h-[100px] border rounded p-2 mb-4" />
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Send Response</button>
              </>
            ) : (
              <p className="text-gray-500">Select a ticket to view details</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 