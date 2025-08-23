// src/components/admin/AdminSupportCenter.jsx
import React, { useState, useEffect, useMemo } from "react";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import { getAllTickets, replyToTicket, openTicket } from "../../services/ticketService";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminSupportCenter() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySuccess, setReplySuccess] = useState("");
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all"); // all, new, opened, closed
  const [allTickets, setAllTickets] = useState([]);
  const [userDetails, setUserDetails] = useState({});
  const [search, setSearch] = useState("");

  // Attachment preview state
  const [showAttachment, setShowAttachment] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("attachment");
  const [attachmentType, setAttachmentType] = useState("application/octet-stream");
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  /* -------------------------- User details lookup -------------------------- */
  const fetchUserDetails = async (list) => {
    try {
      const res = await axios.get(`${API_BASE}/users`);
      const users = Array.isArray(res.data) ? res.data : res.data.users || [];

      const map = {};
      for (const u of users) {
        const name = `${u.firstname || ""} ${u.lastname || ""}`.trim() || "Unknown User";
        const role = u.role || "Unknown";
        if (u._id) map[u._id] = { name, role };
        if (u.userID) map[u.userID] = { name, role }; // fallback ID some datasets use
      }

      const details = {};
      for (const t of list) {
        const d = map[t.userId] || { name: "User Not Found", role: "Unknown" };
        details[t._id] = d;
      }
      setUserDetails(details);
    } catch (e) {
      console.error("Error fetching users:", e);
      const details = {};
      for (const t of list) details[t._id] = { name: "Error Loading User", role: "Unknown" };
      setUserDetails(details);
    }
  };

  /* ------------------------------- Fetch tickets ------------------------------- */
  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      setError("");
      try {
        const data = await getAllTickets(activeFilter === "all" ? null : activeFilter);
        setTickets(data || []);
        if (activeFilter !== "all") {
          const allData = await getAllTickets();
          setAllTickets(allData || []);
        } else {
          setAllTickets(data || []);
        }
        if (data?.length) await fetchUserDetails(data);
      } catch (err) {
        console.error("Error fetching tickets:", err);
        let msg = "Failed to fetch tickets. Please try again.";
        if (err.response) {
          const s = err.response.status;
          const d = err.response.data;
          if (s === 401) msg = "Your session has expired. Please log in again.";
          else if (s === 403) msg = "You do not have permission to view support tickets.";
          else if (s === 404) msg = "Support tickets not found.";
          else if (s >= 500) msg = "Server error occurred. Please try again later.";
          else msg = d.message || d.error || `Failed to fetch tickets (${s}).`;
        } else if (err.request) {
          msg = "Network error. Please check your connection and try again.";
        } else {
          msg = err.message || msg;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, [activeFilter]);

  /* --------------------------- AY / Term for header --------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem("token") || "";
        const token = raw.startsWith('"') ? JSON.parse(raw) : raw;
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (yearRes.ok) setAcademicYear(await yearRes.json());
      } catch (e) {
        console.error("AY fetch error:", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!academicYear) return;
      try {
        const raw = localStorage.getItem("token") || "";
        const token = raw.startsWith('"') ? JSON.parse(raw) : raw;
        const name = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${name}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return setCurrentTerm(null);
        const terms = await res.json();
        setCurrentTerm(terms.find((t) => t.status === "active") || null);
      } catch {
        setCurrentTerm(null);
      }
    })();
  }, [academicYear]);

  /* ------------------------------ Derived list (search) ------------------------------ */
  const filteredTickets = useMemo(() => {
    if (!search.trim()) return tickets;
    const q = search.trim().toLowerCase();

    return tickets.filter((t) => {
      const number = (t.number || "").toLowerCase();
      const subject = (t.subject || "").toLowerCase();
      const id = (t._id || "").toLowerCase();
      const requester = (userDetails[t._id]?.name || "").toLowerCase();
      return (
        number.includes(q) ||
        subject.includes(q) ||
        id.includes(q) ||
        requester.includes(q)
      );
    });
  }, [search, tickets, userDetails]);

  /* ------------------------------- Attachments ------------------------------- */
  async function fetchAttachmentBlob(ticketId) {
    // normalize token (handles raw string or JSON-stringified)
    const raw = localStorage.getItem("token") || "";
    const token = raw.startsWith('"') ? JSON.parse(raw) : raw;

    if (!token) {
      const err = new Error("Missing auth token");
      err.code = 401;
      throw err;
    }

    // This is the valid server route
    const url = `${API_BASE}/api/tickets/file/${ticketId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      const err = new Error("Unauthorized");
      err.code = 401;
      throw err;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const cd = res.headers.get("Content-Disposition") || "";
    // RFC6266 parsing (cover filename* and filename)
    let name = "attachment";
    const star = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
    const bare = cd.match(/filename\s*=\s*([^;]+)/i);
    if (star) name = decodeURIComponent(star[1]);
    else if (quoted) name = quoted[1];
    else if (bare) name = bare[1].trim();

    const type = res.headers.get("Content-Type") || "application/octet-stream";
    const blob = await res.blob();
    return { blob, name, type };
  }

  async function handleOpenAttachment(ticketId) {
    try {
      setAttachmentLoading(true);
      setAttachmentError("");
      const { blob, name, type } = await fetchAttachmentBlob(ticketId);
      const url = URL.createObjectURL(blob);

      setAttachmentName(name);
      setAttachmentType(type);

      // Try new tab first
      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (!popup) {
        // Fallback to in‑app viewer (popup blocked)
        setAttachmentUrl(url);
        setShowAttachment(true);
      } else {
        // Revoke after a short delay to avoid memory leaks
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (err) {
      console.error("Attachment preview error:", err);
      setAttachmentError(
        err.code === 401
          ? "Your session expired or token is missing. Please log in again."
          : "Failed to open attachment. You can try downloading it instead."
      );
      setShowAttachment(true);
    } finally {
      setAttachmentLoading(false);
    }
  }

  /* -------------------------------- Actions -------------------------------- */
  async function handleReply(ticketId) {
    setReplyLoading(true);
    setReplyError("");
    setReplySuccess("");
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userID = localStorage.getItem("userID");
      const adminId = user._id || userID;
      if (!adminId) {
        setReplyError("Admin ID not found. Please log in again.");
        setReplyLoading(false);
        return;
      }

      await replyToTicket(ticketId, {
        sender: "admin",
        senderId: adminId,
        message: reply,
      });

      setReply("");

      const updatedTickets = await getAllTickets(activeFilter === "all" ? null : activeFilter);
      setTickets(updatedTickets);
      const allData = await getAllTickets();
      setAllTickets(allData || []);
      if (updatedTickets?.length) await fetchUserDetails(updatedTickets);

      if (selected && !updatedTickets.find((t) => t._id === selected)) setSelected(null);

      setReplySuccess("Reply sent successfully");
      setTimeout(() => setReplySuccess(""), 3000);
    } catch (err) {
      console.error("Reply error:", err);
      if (err.response) {
        const msg = err.response.data?.error || err.response.data?.message || "Failed to send reply";
        setReplyError(msg);
      } else if (err.request) {
        setReplyError("Network error. Please check your connection and try again.");
      } else {
        setReplyError("Failed to send reply. Please try again.");
      }
    } finally {
      setReplyLoading(false);
    }
  }

  async function handleStatusChange(ticketId, newStatus) {
    try {
      const raw = localStorage.getItem("token") || "";
      const token = raw.startsWith('"') ? JSON.parse(raw) : raw;
      const endpoint = newStatus === "opened" ? "open" : "close";
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to update ticket status: ${res.status}`);

      const updatedTickets = await getAllTickets(activeFilter === "all" ? null : activeFilter);
      setTickets(updatedTickets);
      if (updatedTickets?.length) await fetchUserDetails(updatedTickets);
    } catch (e) {
      console.error("Status change error:", e);
      setReplyError("Failed to update ticket status. Please try again.");
    }
  }

  const handleOpenTicket = async (ticketId) => {
    try {
      await openTicket(ticketId);
      const updatedTickets = await getAllTickets(activeFilter === "all" ? null : activeFilter);
      setTickets(updatedTickets);
      const allData = await getAllTickets();
      setAllTickets(allData || []);
      if (updatedTickets?.length) await fetchUserDetails(updatedTickets);
      if (activeFilter === "new") setTimeout(() => handleFilterChange("opened"), 1000);
    } catch (e) {
      console.error("[OPEN TICKET] error:", e);
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setSelected(null);
    setSearch(""); // clear search when switching tabs
  };

  /* --------------------------------- Render --------------------------------- */
  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      <Admin_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Support Center</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} |{" "}
              {currentTerm ? currentTerm.termName : "Loading..."} |{" "}
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

        {/* Filters + Search */}
        <div className="mb-4 flex flex-col lg:flex-row gap-3">
          <div className="flex-1 flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => handleFilterChange("all")}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeFilter === "all" ? "bg-[#9575cd] text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              All ({allTickets.length})
            </button>
            <button
              onClick={() => handleFilterChange("new")}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeFilter === "new" ? "bg-[#9575cd] text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              New ({allTickets.filter((t) => t.status === "new").length})
            </button>
            <button
              onClick={() => handleFilterChange("opened")}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeFilter === "opened" ? "bg-[#9575cd] text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Opened ({allTickets.filter((t) => t.status === "opened").length})
            </button>
            <button
              onClick={() => handleFilterChange("closed")}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeFilter === "closed" ? "bg-[#9575cd] text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Closed ({allTickets.filter((t) => t.status === "closed").length})
            </button>
          </div>

          {/* Search bar */}
          <div className="lg:w-96">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket no., subject, _id, or name…"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9575cd] focus:border-[#9575cd] bg-white"
            />
          </div>
        </div>

        {/* Main panes */}
        <div className="flex h-[70vh] bg-white rounded-2xl shadow-md">
          {/* List */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto bg-white p-2" style={{ maxHeight: "100%" }}>
            {loading ? (
              <div className="text-center text-gray-500">Loading...</div>
            ) : error ? (
              <div className="text-center text-red-500">{error}</div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center text-gray-500">No tickets found</div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className={`p-4 mb-2 rounded-lg cursor-pointer border border-transparent hover:border-[#9575cd] hover:bg-[#ede7f6] transition-all ${
                    selected === ticket._id ? "bg-[#d1c4e9] border-[#9575cd] shadow" : ""
                  }`}
                  onClick={() => {
                    setSelected(ticket._id);
                    if (ticket.status === "new") handleOpenTicket(ticket._id);
                  }}
                >
                  <div className="text-xs text-gray-600 mb-1">
                    {userDetails[ticket._id]?.name || "Loading..."} ({userDetails[ticket._id]?.role || "Unknown"})
                  </div>
                  <b className="block text-base">{ticket.subject}</b>
                  <span className="block text-xs text-gray-500">{ticket.number}</span>
                  <span className="block text-xs mt-1 font-semibold text-[#7e57c2]">{ticket.status}</span>
                </div>
              ))
            )}
          </div>

          {/* Detail */}
          <div className="flex-1 p-8 bg-white rounded-r-2xl shadow-inner">
            {selected ? (
              (() => {
                const ticket = tickets.find((t) => t._id === selected);
                if (!ticket) return <div className="text-gray-500">Ticket not found</div>;
                return (
                  <>
                    <h3 className="text-xl font-semibold mb-2">{ticket.subject}</h3>
                    <div className="mb-2 text-sm text-[#7e57c2] font-semibold">
                      Ticket No: {ticket.number} | Status: {ticket.status}
                    </div>
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                      <div className="text-sm font-medium text-gray-700">
                        Submitted by:{" "}
                        <span className="font-semibold text-blue-600">{userDetails[ticket._id]?.name || "Loading..."}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Role: {userDetails[ticket._id]?.role || "Unknown"}</div>
                    </div>
                    <p className="mb-4 text-gray-700">{ticket.description}</p>

                    {ticket.file && (
                      <div className="mb-4">
                        <b>Attachment:</b>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => handleOpenAttachment(ticket._id)}
                            className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded"
                          >
                            {attachmentLoading ? "Loading…" : "View / Download Attachment"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <b>Messages:</b>
                      <ul className="mt-2 space-y-2">
                        {ticket.messages?.length ? (
                          ticket.messages.map((msg, idx) => (
                            <li key={idx} className="bg-gray-100 rounded p-2 text-sm">
                              <span className="font-semibold">{msg.sender}:</span> {msg.message}
                              <span className="block text-xs text-gray-400">
                                {new Date(msg.timestamp).toLocaleString()}
                              </span>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-400">No messages</li>
                        )}
                      </ul>
                    </div>

                    {ticket.status === "new" && (
                      <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                        💡 <strong>Note:</strong> This ticket will automatically be moved to the "Opened" tab when you view it.
                      </div>
                    )}

                    <textarea
                      placeholder={
                        ticket.status === "closed" ? "This ticket is closed. You cannot reply." : "Respond to this ticket..."
                      }
                      className={`w-full min-h-[100px] border rounded p-2 mb-4 ${
                        ticket.status === "closed" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                      }`}
                      value={reply}
                      onChange={(e) => {
                        setReply(e.target.value);
                        if (replySuccess) setReplySuccess("");
                        if (replyError) setReplyError("");
                      }}
                      disabled={ticket.status === "closed"}
                    />
                    {replyError && <div className="text-red-500 mb-2">{replyError}</div>}
                    {replySuccess && <div className="text-green-500 mb-2">{replySuccess}</div>}
                    <div className="flex gap-2">
                      <button
                        className={`px-4 py-2 rounded ${
                          ticket.status === "closed"
                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                        onClick={() => handleReply(ticket._id)}
                        disabled={replyLoading || ticket.status === "closed"}
                      >
                        {replyLoading ? "Sending..." : "Send Response"}
                      </button>
                      {ticket.status === "opened" && (
                        <button
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                          onClick={() => handleStatusChange(ticket._id, "closed")}
                        >
                          Mark as Closed
                        </button>
                      )}
                    </div>
                  </>
                );
              })()
            ) : (
              <p className="text-gray-500">Select a ticket to view details</p>
            )}
          </div>
        </div>

        {/* Attachment Preview Overlay (fallback if popup blocked) */}
        {showAttachment && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-3 border-b">
                <div className="font-semibold text-gray-800 truncate pr-2">{attachmentName}</div>
                <div className="flex items-center gap-2">
                  {attachmentUrl && (
                    <a
                      href={attachmentUrl}
                      download={attachmentName}
                      className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Download
                    </a>
                  )}
                  <button
                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    onClick={() => {
                      if (attachmentUrl) URL.revokeObjectURL(attachmentUrl);
                      setAttachmentUrl("");
                      setShowAttachment(false);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="flex-1">
                {attachmentLoading ? (
                  <div className="p-6 text-center text-gray-600">Loading attachment...</div>
                ) : attachmentUrl ? (
                  (() => {
                    const isImage =
                      (attachmentType || "").startsWith("image/") ||
                      /\.(png|jpe?g|gif|bmp|webp|svg|apng|avif|tiff?|ico|cur|heic|heif)$/i.test(
                        attachmentName
                      );
                    const isPdf =
                      (attachmentType || "") === "application/pdf" || /\.(pdf)$/i.test(attachmentName);
                    if (isImage) {
                      return (
                        <div className="w-full h-[70vh] flex items-center justify-center bg-gray-50">
                          <img
                            src={attachmentUrl}
                            alt={attachmentName}
                            className="max-h-[68vh] max-w-full object-contain"
                          />
                        </div>
                      );
                    }
                    if (isPdf) {
                      return (
                        <iframe
                          title="Attachment Preview"
                          src={attachmentUrl}
                          className="w-full h-[70vh]"
                        />
                      );
                    }
                    return (
                      <div className="p-6 text-center text-gray-700 text-sm">
                        Preview is not available for this file type. Use the Download button to view it locally.
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-6 text-center text-red-600 text-sm">
                    {attachmentError || "Unable to preview this file."}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
