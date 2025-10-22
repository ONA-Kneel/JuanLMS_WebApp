import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ProfileMenu from "../ProfileMenu";
import Faculty_Navbar from "./Faculty_Navbar";
import ValidationModal from "../ValidationModal";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";


export default function FacultyCreateClass() {
  const navigate = useNavigate();
  const [pendingClasses, setPendingClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });
  const [confirmingClass, setConfirmingClass] = useState(null);
  const [classImage, setClassImage] = useState(null);
  const [classDesc, setClassDesc] = useState("");
  const [viewingStudents, setViewingStudents] = useState(null);
  const [syncingStudents, setSyncingStudents] = useState(false);

  // Fetch pending classes function
  const fetchPendingClasses = useCallback(async () => {
    if (!academicYear || !currentTerm) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch pending confirmation classes
      const pendingRes = await fetch(`${API_BASE}/api/classes/pending-confirmation`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        console.log('Fetched pending classes:', pendingData);
        if (pendingData.length > 0) {
          console.log('Sample class data:', pendingData[0]);
          console.log('Sample class members:', pendingData[0].members);
        }
        setPendingClasses(pendingData);
      } else {
        console.error('Failed to fetch pending classes');
        setPendingClasses([]);
      }
    } catch (error) {
      console.error('Error fetching pending classes:', error);
      setPendingClasses([]);
    } finally {
      setLoading(false);
    }
  }, [academicYear, currentTerm]);

  // Fetch academic year and term first
  useEffect(() => {
    async function fetchAcademicData() {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch academic year
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const year = await yearRes.json();
          setAcademicYear(year);
        }
      } catch (error) {
        console.error('Error fetching academic year:', error);
      }
    }
    fetchAcademicData();
  }, []);

  // Fetch active term when academic year is available
  useEffect(() => {
    async function fetchActiveTerm() {
      if (!academicYear) return;
      
      try {
        const token = localStorage.getItem('token');
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const termRes = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (termRes.ok) {
          const terms = await termRes.json();
          const active = terms.find(term => term.status === 'active');
          setCurrentTerm(active || null);
        }
      } catch (error) {
        console.error('Error fetching active term:', error);
      }
    }
    fetchActiveTerm();
  }, [academicYear]);

  // Fetch pending confirmation classes when both academic year and term are available
  useEffect(() => {
    fetchPendingClasses();
  }, [academicYear, currentTerm, fetchPendingClasses]);

  // Handle class confirmation
  const handleConfirmClass = async (classData) => {
    setConfirmingClass(classData);
    setClassDesc(classData.classDesc || "");
    setClassImage(null);
  };

  const handleSubmitConfirmation = async () => {
    if (!confirmingClass) return;

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('classDesc', classDesc);
      if (classImage) {
        formData.append('image', classImage);
      }

      const res = await fetch(`${API_BASE}/api/classes/${confirmingClass.classID}/confirm`, {
        method: 'PATCH',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
      });

      if (res.ok) {
        setValidationModal({
          isOpen: true,
          type: 'success',
          title: 'Class Confirmed',
          message: `Class "${confirmingClass.className}" has been confirmed successfully!`
        });
        
        // Remove the confirmed class from pending list
        setPendingClasses(prev => prev.filter(c => c.classID !== confirmingClass.classID));
        setConfirmingClass(null);
        setClassDesc("");
        setClassImage(null);
      } else {
        const data = await res.json();
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Confirmation Failed',
          message: data.error || 'Failed to confirm class'
        });
      }
    } catch (error) {
      console.error('Error confirming class:', error);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Network error. Please check your connection and try again.'
      });
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Faculty_Navbar />
        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading pending classes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Classes</h2>
            <p className="text-base md:text-lg"> AY: {academicYear?.schoolYearStart}-{academicYear?.schoolYearEnd} | {currentTerm?.termName} | {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
          </div>
          <ProfileMenu />
        </div>

        {pendingClasses.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-md mx-auto">
              
              <h3 className="text-xl font-semibold text-blue-800 mb-2">No Pending Classes</h3>
              <p className="text-blue-900">
                All your classes have been confirmed! You can view your active classes in the Classes section.
              </p>
              <button
                onClick={() => navigate('/faculty_classes')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                View My Classes
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-4xl font-bold mt-5 mb-6">Confirm Classes</h3>
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">
                <strong>Classes have been automatically created for you!</strong> Please review and confirm each class below. 
                You can update the description and add a class image if needed.
              </p>
            </div>

            {/* Fix and Sync Buttons */}
            <div className="mb-6 flex gap-4">
              
              
              <button
                className={`${syncingStudents ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2`}
                disabled={syncingStudents}
                onClick={async () => {
                  try {
                    setSyncingStudents(true);
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${API_BASE}/sync-students-to-auto-classes`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    if (response.ok) {
                      setValidationModal({
                        isOpen: true,
                        type: 'success',
                        title: 'Sync Completed',
                        message: `Successfully syched students to classes.`
                      });
                      // Refresh the pending classes to show updated student counts
                      fetchPendingClasses();
                    } else {
                      const error = await response.json();
                      setValidationModal({
                        isOpen: true,
                        type: 'error',
                        title: 'Sync Failed',
                        message: error.message || 'Failed to sync students. Please try again.'
                      });
                    }
                  } catch (error) {
                    console.error('Sync error:', error);
                    setValidationModal({
                      isOpen: true,
                      type: 'error',
                      title: 'Network Error',
                      message: 'Failed to sync students. Please check your connection and try again.'
                    });
                  } finally {
                    setSyncingStudents(false);
                  }
                }}
              >
                {syncingStudents ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Syncing Students...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync Students to Classes
                  </>
                )}
              </button>
            </div>

            <div className="grid gap-6">
              {pendingClasses.map((classData) => (
                <div key={classData.classID} className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-800 truncate">{classData.className}</h4>
                      <p className="text-gray-600">Class Code: {classData.classCode}</p>
                      <p className="text-gray-600">Section: {classData.section}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-gray-600">Students: {classData.members?.length || 0}</p>
                        <button
                          onClick={() => setViewingStudents(classData)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                        >
                          View Students
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirmClass(classData)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Confirm Class
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <p>Academic Year: {classData.academicYear}</p>
                    <p>Term: {classData.termName}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Confirmation Modal */}
        {confirmingClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Confirm Class: {confirmingClass.className}</h3>
              
              {/* Student Members Section */}
              {confirmingClass.members && confirmingClass.members.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Class Members ({confirmingClass.members.length})</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="space-y-3">
                      {confirmingClass.members.map((member, index) => (
                        <div key={member._id || index} className="flex items-center justify-between bg-white p-4 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg overflow-hidden">
                              {member.profilePicture ? (
                                <img 
                                  src={member.profilePicture} 
                                  alt={`${member.firstname || member.firstName} ${member.lastname || member.lastName}`}
                                  className="w-full h-full object-cover rounded-full"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center text-lg ${member.profilePicture ? 'hidden' : 'flex'}`}>
                                {(member.firstname || member.firstName || 'S')?.[0]}{(member.lastname || member.lastName || '')?.[0]}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                {member.firstname || member.firstName} {member.lastname || member.lastName}
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  ✅ Active
                                </span>
                              </div>
                              <div className="text-sm text-blue-600 font-medium">ID: {member.schoolID || member.schoolId || member.userID || 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Class Description</label>
                  <textarea
                    value={classDesc}
                    onChange={(e) => setClassDesc(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Enter class description..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Class Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setClassImage(e.target.files[0])}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setConfirmingClass(null);
                    setClassDesc("");
                    setClassImage(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitConfirmation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirm Class
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Students Modal */}
        {viewingStudents && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Students in {viewingStudents.className}</h3>
                <button
                  onClick={() => setViewingStudents(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4 text-sm text-gray-600">
                <p><strong>Class Code:</strong> {viewingStudents.classCode}</p>
                <p><strong>Section:</strong> {viewingStudents.section}</p>
                <p><strong>Total Students:</strong> {viewingStudents.members?.length || 0}</p>
              </div>

              {/* Student Members Section */}
              {viewingStudents.members && viewingStudents.members.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {viewingStudents.members.map((member, index) => (
                      <div key={member._id || index} className="flex items-center justify-between bg-white p-4 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg overflow-hidden">
                            {member.profilePicture ? (
                              <img 
                                src={member.profilePicture} 
                                alt={`${member.firstname || member.firstName} ${member.lastname || member.lastName}`}
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center text-lg ${member.profilePicture ? 'hidden' : 'flex'}`}>
                              {(member.firstname || member.firstName || 'S')?.[0]}{(member.lastname || member.lastName || '')?.[0]}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                              {member.firstname || member.firstName} {member.lastname || member.lastName}
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                ✅ Active
                              </span>
                            </div>
                            <div className="text-sm text-blue-600 font-medium">ID: {member.schoolID || member.schoolId || member.userID || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="font-medium">No students assigned to this class yet.</p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setViewingStudents(null)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
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
          onConfirm={validationModal.type === 'success' ? () => navigate('/faculty_classes') : undefined}
          confirmText={validationModal.type === 'success' ? 'Go to Classes' : 'OK'}
        />
      </div>
    </div>
  );
}
