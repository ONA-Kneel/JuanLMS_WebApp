import { useState, useEffect } from "react";
import Admin_Navbar from "./Admin_Navbar";
// import { useState } from "react";

import ProfileModal from "../ProfileModal"; // reuse if you want it for faculty too
// import { useNavigate } from "react-router-dom";
import compClassesIcon from "../../assets/compClassesIcon.png";
import ProfileMenu from "../ProfileMenu";

export default function Admin_Dashboard() {
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch("${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/audit-logs?page=1&limit=5", {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.logs) setRecentAuditLogs(data.logs);
      });
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
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr ">
      <Admin_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h2>
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

        

        
        <h3 className="text-lg md:text-4xl font-bold mb-3">Audit Preview</h3>
        <div className="bg-white rounded-xl shadow p-4 mb-8">
          <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm table-fixed">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3 border w-1/5">Timestamp</th>
                <th className="p-3 border w-1/5">User</th>
                <th className="p-3 border w-1/5">Action</th>
                <th className="p-3 border w-2/5">Details</th>
              </tr>
            </thead>
            <tbody>
              {recentAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center p-4 text-gray-500">
                    No recent audit logs found.
                  </td>
                </tr>
              ) : (
                recentAuditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="p-3 border text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="p-3 border text-gray-900 whitespace-nowrap">{log.userName}</td>
                    <td className="p-3 border text-gray-900 whitespace-nowrap">{log.action}</td>
                    <td className="p-3 border text-gray-500">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  );
}
