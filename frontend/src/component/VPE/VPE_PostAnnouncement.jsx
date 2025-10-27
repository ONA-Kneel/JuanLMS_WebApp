import { useState, useEffect } from "react";
import VPE_Navbar from "./VPE_Navbar";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function VPE_PostAnnouncement() {
  const [isLoading, setIsLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  
  // Form state
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState({
    everyone: false,
    principal: false,
    faculty: false,
    admin: false,
    student: false
  });

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

  // Announcements list state
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);

  // Filter state
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState("");

  // Character limits
  const TITLE_MAX_LENGTH = 100;
  const BODY_MAX_LENGTH = 2000;

  // Loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Handle checkbox changes
  const handleRecipientChange = (recipient) => {
    if (recipient === 'everyone') {
      // If "Everyone" is checked, check all others
      const newRecipients = {
        everyone: !recipients.everyone,
        principal: !recipients.everyone,
        faculty: !recipients.everyone,
        admin: !recipients.everyone,
        student: !recipients.everyone
      };
      setRecipients(newRecipients);
    } else {
      // For other checkboxes, update individual state
      setRecipients(prev => ({
        ...prev,
        [recipient]: !prev[recipient],
        // If any individual checkbox is unchecked, uncheck "everyone"
        everyone: recipient === 'everyone' ? !prev[recipient] : false
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!announcementTitle.trim() || !body.trim()) {
      setSubmitMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    if (announcementTitle.length > TITLE_MAX_LENGTH) {
      setSubmitMessage({ type: 'error', text: `Title must be ${TITLE_MAX_LENGTH} characters or less.` });
      return;
    }

    if (body.length > BODY_MAX_LENGTH) {
      setSubmitMessage({ type: 'error', text: `Body must be ${BODY_MAX_LENGTH} characters or less.` });
      return;
    }

    if (!currentTerm || !academicYear) {
      setSubmitMessage({ type: 'error', text: 'Academic year and term information is required.' });
      return;
    }

    // Get selected recipients
    const selectedRecipients = [];
    if (recipients.everyone) {
      selectedRecipients.push('admin', 'faculty', 'students', 'vice president of education', 'principal');
    } else {
      if (recipients.admin) selectedRecipients.push('admin');
      if (recipients.faculty) selectedRecipients.push('faculty');
      if (recipients.student) selectedRecipients.push('students');
      if (recipients.principal) selectedRecipients.push('principal');
    }

    if (selectedRecipients.length === 0) {
      setSubmitMessage({ type: 'error', text: 'Please select at least one recipient.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/general-announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: announcementTitle.trim(),
          body: body.trim(),
          recipientRoles: selectedRecipients,
          termName: currentTerm.termName,
          schoolYear: `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitMessage({ type: 'success', text: 'Announcement posted successfully!' });
        // Reset form
        setAnnouncementTitle("");
        setBody("");
        setRecipients({
          everyone: false,
          principal: false,
          faculty: false,
          admin: false,
          student: false
        });
        // Refresh announcements list
        fetchAnnouncements();
      } else {
        setSubmitMessage({ type: 'error', text: data.message || 'Failed to post announcement.' });
      }
    } catch (error) {
      console.error('Error posting announcement:', error);
      setSubmitMessage({ type: 'error', text: 'An error occurred while posting the announcement.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    setIsLoadingAnnouncements(true);
    try {
      const token = localStorage.getItem("token");
      console.log('Fetching announcements with token:', token ? 'Token exists' : 'No token'); // Debug log
      
      const response = await fetch(`${API_BASE}/api/general-announcements/all`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      console.log('Response status:', response.status); // Debug log
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched announcements:', data); // Debug log
        setAnnouncements(data);
        // Do not auto-select any announcement
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch announcements:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  // Fetch school years
  const fetchSchoolYears = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/schoolyears`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSchoolYears(data);
        if (data.length > 0) {
          setSelectedSchoolYear(data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching school years:', error);
    }
  };

  // Fetch terms for selected school year
  const fetchTermsForSchoolYear = async (schoolYearId) => {
    if (!schoolYearId) return;
    try {
      const token = localStorage.getItem("token");
      const schoolYear = schoolYears.find(sy => sy._id === schoolYearId);
      if (schoolYear) {
        const schoolYearName = `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}`;
        const response = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setTerms(data);
          if (data.length > 0) {
            setSelectedTerm(data[0]._id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  // Filter announcements based on search and filters
  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.body.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSchoolYear = !selectedSchoolYear || 
      announcement.schoolYear === schoolYears.find(sy => sy._id === selectedSchoolYear)?.schoolYearStart + '-' + 
      schoolYears.find(sy => sy._id === selectedSchoolYear)?.schoolYearEnd;
    
    const matchesTerm = !selectedTerm || 
      announcement.termName === terms.find(t => t._id === selectedTerm)?.termName;
    
    return matchesSearch && matchesSchoolYear && matchesTerm;
  });

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric"
    });
  };

  // Format recipient roles for display
  const formatRecipientRoles = (roles) => {
    return roles.map(role => {
      if (role === 'vice president of education') return 'VPE';
      if (role === 'students') return 'Student';
      return role.charAt(0).toUpperCase() + role.slice(1);
    }).join(', ');
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

  useEffect(() => {
    if (currentTerm && academicYear) {
      console.log('Fetching announcements for:', { currentTerm, academicYear }); // Debug log
      fetchAnnouncements();
    } else {
      console.log('Not fetching announcements yet:', { currentTerm, academicYear }); // Debug log
    }
  }, [currentTerm, academicYear]);

  useEffect(() => {
    fetchSchoolYears();
  }, []);

  useEffect(() => {
    if (selectedSchoolYear) {
      fetchTermsForSchoolYear(selectedSchoolYear);
    }
  }, [selectedSchoolYear]);

  // Clear selected announcement when filters change
  useEffect(() => {
    setSelectedAnnouncement(null);
  }, [selectedSchoolYear, selectedTerm]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen h-screen max-h-screen">
        <VPE_Navbar />
        <div className="flex-1 flex flex-col bg-gray-100 font-poppinsr overflow-hidden md:ml-64 h-full min-h-screen">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading announcements...</p>
            <p className="text-gray-500 text-sm mt-2">Setting up VPE announcement system</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <VPE_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Post Announcement</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              {currentTerm ? `${currentTerm.termName}` : "Loading..."} | 
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

        {/* Create Announcement Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-[#00418B]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Announcement Title */}
            <div>
              <label htmlFor="announcementTitle" className="block text-sm font-medium text-gray-700 mb-2 ">
                Announcement Title *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="announcementTitle"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  maxLength={TITLE_MAX_LENGTH}
                  className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:border-[#00418B]"
                  placeholder="Enter announcement title"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-xs text-gray-500">
                    {announcementTitle.length}/{TITLE_MAX_LENGTH}
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div>
              <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-2">
                Body *
              </label>
              <div className="relative">
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={BODY_MAX_LENGTH}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:border-[#00418B]"
                  placeholder="Enter announcement content"
                  required
                />
                <div className="absolute top-2 right-2 pointer-events-none">
                  <span className="text-xs text-gray-500 bg-white px-1 rounded">
                    {body.length}/{BODY_MAX_LENGTH}
                  </span>
                </div>
              </div>
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Who will receive the announcement? *
              </label>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="everyone"
                    checked={recipients.everyone}
                    onChange={() => handleRecipientChange('everyone')}
                    className="h-4 w-4 text-blue-600 focus:ring-[#00418B] border-gray-300 rounded"
                  />
                  <label htmlFor="everyone" className="ml-2 block text-sm text-gray-900">
                    Everyone
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="principal"
                    checked={recipients.principal}
                    onChange={() => handleRecipientChange('principal')}
                    className="h-4 w-4 text-blue-600 focus:ring-[#00418B] border-gray-300 rounded"
                  />
                  <label htmlFor="principal" className="ml-2 block text-sm text-gray-900">
                    Principal
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="faculty"
                    checked={recipients.faculty}
                    onChange={() => handleRecipientChange('faculty')}
                    className="h-4 w-4 text-blue-600 focus:ring-[#00418B] border-gray-300 rounded"
                  />
                  <label htmlFor="faculty" className="ml-2 block text-sm text-gray-900">
                    Faculty
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="admin"
                    checked={recipients.admin}
                    onChange={() => handleRecipientChange('admin')}
                    className="h-4 w-4 text-blue-600 focus:ring-[#00418B] border-gray-300 rounded"
                  />
                  <label htmlFor="admin" className="ml-2 block text-sm text-gray-900">
                    Admin
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="student"
                    checked={recipients.student}
                    onChange={() => handleRecipientChange('student')}
                    className="h-4 w-4 text-blue-600 focus:ring-[#00418B] border-gray-300 rounded"
                  />
                  <label htmlFor="student" className="ml-2 block text-sm text-gray-900">
                    Student
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Message */}
            {submitMessage.text && (
              <div className={`p-3 rounded-md ${
                submitMessage.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {submitMessage.text}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#00418B] hover:bg-[#0055B3] focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:ring-offset-2'
                }`}
              >
                {isSubmitting ? 'Posting...' : 'Post Announcement'}
              </button>
            </div>
          </form>
        </div>

        {/* Previous Announcements Section */}
        <div className="bg-white rounded-lg shadow-md border-2 border-[#00418B]">
          <div className="flex flex-col lg:flex-row">
            {/* Left Panel - Announcements List */}
            <div className="lg:w-1/3 border-r border-gray-200">
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Previous Announcements</h3>
                  {/* <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem("token");
                        const response = await fetch(`${API_BASE}/api/general-announcements/count`, {
                          headers: { "Authorization": `Bearer ${token}` }
                        });
                        if (response.ok) {
                          const data = await response.json();
                          alert(`Total announcements in database: ${data.count}`);
                        } else {
                          alert('Failed to get count');
                        }
                      } catch (error) {
                        alert('Error getting count: ' + error.message);
                      }
                    }}
                    className="text-xs bg-[#00418B] text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    Test Count
                  </button> */}
                </div>
                
                {/* Search Bar */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search announcement title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:border-[#00418B]"
                  />
                </div>

                {/* Filters */}
                <div className="mb-4 space-y-3">
                  {/* School Year Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      School Year
                    </label>
                    <select
                      value={selectedSchoolYear}
                      onChange={(e) => setSelectedSchoolYear(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:border-[#00418B]"
                    >
                      <option value="">All School Years</option>
                      {schoolYears.map((year) => (
                        <option key={year._id} value={year._id}>
                          {year.schoolYearStart}-{year.schoolYearEnd}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Term Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Term
                    </label>
                    <select
                      value={selectedTerm}
                      onChange={(e) => setSelectedTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00418B] focus:border-[#00418B]"
                      disabled={!selectedSchoolYear}
                    >
                      <option value="">All Terms</option>
                      {terms.map((term) => (
                        <option key={term._id} value={term._id}>
                          {term.termName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Announcements List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {isLoadingAnnouncements ? (
                    <div className="text-center py-4 text-gray-500">Loading announcements...</div>
                  ) : filteredAnnouncements.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No announcements found</div>
                  ) : (
                    filteredAnnouncements.map((announcement) => (
                      <div
                        key={announcement._id}
                        onClick={() => setSelectedAnnouncement(announcement)}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${
                          selectedAnnouncement?._id === announcement._id
                            ? 'bg-blue-50 border-l-4 border-[#00418B]'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900 truncate">
                          {announcement.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          {announcement.termName} • {announcement.schoolYear}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(announcement.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Announcement Details */}
            <div className="lg:w-2/3 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Announcement Details</h3>
              
              {selectedAnnouncement ? (
                <div className="space-y-4">
                  {/* 3x3 Grid Layout */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Term</label>
                      <p className="text-sm text-gray-900">{selectedAnnouncement.termName}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">School Year</label>
                      <p className="text-sm text-gray-900">{selectedAnnouncement.schoolYear}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <p className="text-sm text-gray-900">{selectedAnnouncement.title}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created By</label>
                      <p className="text-sm text-gray-900">
                        {selectedAnnouncement.createdBy?.firstname && selectedAnnouncement.createdBy?.lastname 
                          ? `${selectedAnnouncement.createdBy.firstname} ${selectedAnnouncement.createdBy.lastname}`
                          : 'Unknown'
                        }
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Creator Role</label>
                      <p className="text-sm text-gray-900">
                        {selectedAnnouncement.createdBy?.role 
                          ? selectedAnnouncement.createdBy.role.charAt(0).toUpperCase() + selectedAnnouncement.createdBy.role.slice(1)
                          : 'Unknown'
                        }
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Recipients</label>
                      <p className="text-sm text-gray-900">{formatRecipientRoles(selectedAnnouncement.recipientRoles)}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedAnnouncement.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Content</label>
                    <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 min-h-32">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedAnnouncement.body}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select an announcement to view details
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
