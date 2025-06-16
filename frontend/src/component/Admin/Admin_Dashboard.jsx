import { useState, useEffect } from "react";
import Admin_Navbar from "./Admin_Navbar";
// import { useState } from "react";

import ProfileModal from "../ProfileModal"; // reuse if you want it for faculty too
// import { useNavigate } from "react-router-dom";
import ProfileMenu from "../ProfileMenu";

export default function Admin_Dashboard() {
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);
  const [accountCounts, setAccountCounts] = useState({ admin: 0, faculty: 0, student: 0 });

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch("http://https://juanlms-webapp-server.onrender.com/audit-logs?page=1&limit=5", {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.logs) setRecentAuditLogs(data.logs);
      });
    fetch("http://https://juanlms-webapp-server.onrender.com/user-counts", {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data) setAccountCounts(data);
      })
      .catch(() => {});
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex flex-col min-h-screen overflow-hidden font-poppinsr ">
      <Admin_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header (full width) */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h2>
            <p className="text-base md:text-lg"> Academic Year and Term here | 
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ProfileMenu />
          </div>
        </div>
        {/* Main Content and Sidebar */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Stats Row - aligned with header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <span className="text-2xl font-bold text-blue-950">{accountCounts.admin}</span>
                <span className="text-gray-700 mt-2">Admins</span>
              </div>
              <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <span className="text-2xl font-bold text-yellow-600">{accountCounts.faculty}</span>
                <span className="text-gray-700 mt-2">Faculty</span>
              </div>
              <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <span className="text-2xl font-bold text-blue-950">{accountCounts.student}</span>
                <span className="text-gray-700 mt-2">Students</span>
              </div>
            </div>

            {/* Graph/Chart Placeholder */}
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center mb-4 min-h-[220px]">
              <span className="text-lg font-bold text-gray-800 mb-2">User Registrations Over Time</span>
              <div className="w-full h-40 flex items-center justify-center text-gray-400">
                {/* Chart.js or Recharts graph can go here */}
                <span>(Graph coming soon)</span>
              </div>
            </div>

            {/* Active Users Today (Placeholder) */}
            <div className="bg-white rounded-xl shadow p-6 flex flex-col mb-2">
              <span className="text-lg font-bold text-gray-800 mb-2">Active Users Today</span>
              <span className="text-3xl font-bold text-indigo-600">--</span>
              <span className="text-gray-500 text-sm">(Coming soon)</span>
            </div>

            {/* Pending Account Approvals (Placeholder) */}
            {/* <div className="bg-white rounded-xl shadow p-6 flex flex-col mb-2">
              <span className="text-lg font-bold text-gray-800 mb-2">Pending Account Approvals</span>
              <span className="text-3xl font-bold text-yellow-600">--</span>
              <span className="text-gray-500 text-sm">(Coming soon)</span>
            </div> */}

            {/* System Announcements (Placeholder) */}
            {/* <div className="bg-white rounded-xl shadow p-6 flex flex-col mb-2">
              <span className="text-lg font-bold text-gray-800 mb-2">System Announcements</span>
              <ul className="list-disc ml-6 text-gray-700">
                <li>Welcome to the new Admin Dashboard!</li>
                <li>(More announcements soon...)</li>
              </ul>
            </div> */}
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-96 flex flex-col gap-6">
            {/* Audit Preview (smaller, scrollable) */}
            <div className="bg-white rounded-xl shadow p-4 mb-4 max-h-80 overflow-y-auto">
              <h3 className="text-lg md:text-xl font-bold mb-3">Audit Preview</h3>
              <table className="min-w-full bg-white border rounded-lg overflow-hidden text-xs table-fixed">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-2 border-b w-2/6 font-semibold text-gray-700">Timestamp</th>
                    <th className="p-2 border-b w-2/6 font-semibold text-gray-700">User</th>
                    <th className="p-2 border-b w-1/6 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center p-2 text-gray-500">
                        No recent audit logs found.
                      </td>
                    </tr>
                  ) : (
                    recentAuditLogs.map((log, idx) => (
                      <tr key={log._id} className={idx % 2 === 0 ? "bg-white hover:bg-gray-50 transition" : "bg-gray-50 hover:bg-gray-100 transition"}>
                        <td className="p-2 border-b text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                        <td className="p-2 border-b text-gray-900 whitespace-nowrap">{log.userName}</td>
                        <td className="p-2 border-b text-gray-900 whitespace-nowrap">{log.action}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Recent Logins (Placeholder) */}
            <div className="bg-white rounded-xl shadow p-4 mb-4">
              <h4 className="text-md font-bold mb-2">Last Logins Preview</h4>
              <ul className="text-gray-700 text-sm list-disc ml-4">
                <li>-- (Coming soon)</li>
              </ul>
            </div>

            {/* Quick Actions (Placeholder) */}
            {/* <div className="bg-white rounded-xl shadow p-4">
              <h4 className="text-md font-bold mb-2">Quick Actions</h4>
              <ul className="text-gray-700 text-sm list-disc ml-4">
                <li>Add User (Coming soon)</li>
                <li>View Reports (Coming soon)</li>
              </ul>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
