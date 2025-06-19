import Director_Navbar from "./Director_Navbar";
import { useState, useEffect } from "react";

import ProfileModal from "../ProfileModal";
import { useNavigate } from "react-router-dom";
import compClassesIcon from "../../assets/compClassesIcon.png";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Director_Dashboard() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

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

  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/audit-logs?limit=5`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(data.logs || []);
        }
      } catch (err) {
        console.error("Failed to fetch audit logs", err);
      }
    }
    fetchAuditLogs();
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      <Director_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64 flex flex-col md:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Director Dashboard</h2>
              <p className="text-base md:text-lg">
                {academicYear ? `AY: ${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
                {currentTerm ? `${currentTerm.termName}` : "Loading..."} | 
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
        {/* Right Side: ProfileMenu and Audit Preview stacked */}
        <div className="w-full md:w-96 flex flex-col gap-4 items-end">
          <div className="w-full flex justify-end">
            <ProfileMenu />
          </div>
          <div className="w-full bg-white rounded-2xl shadow p-4 h-fit max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Audit Preview</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-semibold p-1">Timestamp</th>
                    <th className="text-left font-semibold p-1">User</th>
                    <th className="text-left font-semibold p-1">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan={3} className="text-center text-gray-400 p-2">No logs found</td></tr>
                  ) : (
                    auditLogs.map((log, idx) => (
                      <tr key={log._id || idx} className="border-b last:border-0">
                        <td className="p-1 whitespace-nowrap">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
                        <td className="p-1 whitespace-nowrap">{log.userName || '-'}</td>
                        <td className="p-1 whitespace-nowrap">{log.details || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
