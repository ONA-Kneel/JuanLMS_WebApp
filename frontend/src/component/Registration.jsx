import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Registration() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    personalEmail: '',
    schoolID: '',
    role: 'students',
    trackName: '',
    strandName: '',
    sectionName: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });
  const [studentDetails, setStudentDetails] = useState(null);
  const [isCheckingStudent, setIsCheckingStudent] = useState(false);
  const [studentOptions, setStudentOptions] = useState([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const navigate = useNavigate();

  const handleReRegistrationSuccess = () => {
    setValidationModal({ isOpen: false, type: 'success', title: '', message: '' });
    setSubmitted(true);
  };

  // Function to fetch student options for dropdown
  const fetchStudentOptions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/registrants/student-options`);
      console.log('Fetched student options:', response.data);
      
      // Filter out any invalid student objects
      const validStudents = (response.data || []).filter(student => 
        student && 
        student.studentSchoolID && 
        student.studentName
      );
      
      console.log('Valid students after filtering:', validStudents);
      setStudentOptions(validStudents);
    } catch (error) {
      console.error('Error fetching student options:', error);
      setStudentOptions([]);
    }
  };

  // Function to filter students based on input - only show exact matches
  const filterStudents = (input) => {
    if (!input || input.length < 1) {
      setFilteredStudents([]);
      setShowStudentDropdown(false);
      return;
    }
    
    // Only show students where the Student ID exactly matches the input
    // Add null/undefined checks to prevent errors
    const filtered = studentOptions.filter(student => 
      student && 
      student.studentSchoolID && 
      student.studentSchoolID.toLowerCase() === input.toLowerCase()
    );
    
    if (filtered.length > 0) {
      setFilteredStudents(filtered);
      setShowStudentDropdown(true);
    } else {
      setFilteredStudents([]);
      setShowStudentDropdown(false);
    }
  };

  // Function to select a student from dropdown
  const selectStudent = async (student) => {
    setForm(prev => ({
      ...prev,
      schoolID: student.studentSchoolID,
      personalEmail: student.personalEmail || '',
      firstName: student.firstName,
      lastName: student.lastName,
      trackName: student.trackName,
      strandName: student.strandName,
      sectionName: student.sectionName
    }));
    
    setStudentDetails(student);
    setShowStudentDropdown(false);
    setFilteredStudents([]);
    
    setValidationModal({ 
      isOpen: true, 
      type: 'success', 
      title: 'Student Selected', 
      message: `Welcome ${student.firstName} ${student.lastName}! Your details have been loaded. Please review and submit your registration.` 
    });
  };

  // Function to check student details from StudentAssignment
  const checkStudentDetails = async () => {
    if (!form.schoolID || !form.personalEmail) {
      setValidationModal({ 
        isOpen: true, 
        type: 'warning', 
        title: 'Missing Information', 
        message: 'Please enter both School ID and School Email to check your details.' 
      });
      return;
    }

    if (!isValidSchoolId(form.schoolID)) {
      setValidationModal({ 
        isOpen: true, 
        type: 'warning', 
        title: 'Invalid Student Number', 
        message: 'Student Number must be in the format YY-00000 (e.g., 25-00001).' 
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(form.personalEmail)) {
      setValidationModal({ 
        isOpen: true, 
        type: 'warning', 
        title: 'Invalid Email', 
        message: 'Please enter a valid email address (e.g., username@gmail.com).' 
      });
      return;
    }

    try {
      setIsCheckingStudent(true);
      const response = await axios.post(`${API_BASE}/api/registrants/student-details`, {
        schoolID: form.schoolID,
        personalEmail: form.personalEmail
      });

      if (response.data) {
        setStudentDetails(response.data);
        // Auto-populate form with student details
        setForm(prev => ({
          ...prev,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          trackName: response.data.trackName,
          strandName: response.data.strandName,
          sectionName: response.data.sectionName
        }));
        
        setValidationModal({ 
          isOpen: true, 
          type: 'success', 
          title: 'Student Found', 
          message: `Welcome ${response.data.firstName} ${response.data.lastName}! Your details have been loaded. Please review and submit your registration.` 
        });
      }
    } catch (error) {
      console.error('Error checking student details:', error);
      let errorMessage = 'Student not found in our records.';
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'Student not found in assignment records. Please verify your School ID and Email, or contact the registrar.';
        } else {
          errorMessage = error.response.data.message || 'Failed to verify student details.';
        }
      }
      setValidationModal({ 
        isOpen: true, 
        type: 'error', 
        title: 'Student Not Found', 
        message: errorMessage 
      });
    } finally {
      setIsCheckingStudent(false);
    }
  };


  function isValidName(name) { return /^[\p{L}\s'-]+$/u.test(name); }

  // Fetch student options on component mount
  useEffect(() => {
    fetchStudentOptions();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStudentDropdown && !event.target.closest('.relative')) {
        setShowStudentDropdown(false);
        setFilteredStudents([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStudentDropdown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'firstName' || name === 'lastName') {
      newValue = value.replace(/[^\p{L}\s'-]/gu, '');
    }
    setForm(prev => ({ ...prev, [name]: newValue }));
    
    // Handle student ID dropdown filtering
    if (name === 'schoolID') {
      filterStudents(value);
    }
  };

  function getSchoolIdPlaceholder() { return 'Student Number (e.g., 25-00001)'; }
  function isValidSchoolId(schoolID) { return /^\d{2}-\d{5}$/.test(schoolID); }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!isValidName(form.firstName) || !isValidName(form.lastName)) {
      setValidationModal({ isOpen: true, type: 'warning', title: 'Invalid Name', message: 'Names must only contain letters (including international characters), spaces, apostrophes, or hyphens.' });
      setLoading(false); return;
    }
    if (!isValidSchoolId(form.schoolID)) {
      setValidationModal({ isOpen: true, type: 'warning', title: 'Invalid Student Number', message: 'Student Number must be in the format YY-00000 (e.g., 25-00001).' });
      setLoading(false); return;
    }
    if (!form.firstName.trim() || !form.lastName.trim() || !form.personalEmail.trim() || !form.trackName.trim() || !form.strandName.trim() || !form.sectionName.trim()) {
      setValidationModal({ isOpen: true, type: 'warning', title: 'Missing Information', message: 'Please fill in all required fields.' });
      setLoading(false); return;
    }
    const emailRegex = /^[^\s@]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(form.personalEmail)) {
      setValidationModal({ isOpen: true, type: 'warning', title: 'Invalid Email', message: 'Please enter a valid email address (e.g., username@gmail.com).' });
      setLoading(false); return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/registrants/register`, form);
      if (res.status === 200 && res.data.isReRegistration) {
        setValidationModal({ isOpen: true, type: 'success', title: 'Re-registration Successful', message: res.data.message, onConfirm: handleReRegistrationSuccess, confirmText: 'Continue', showCancel: false });
        return;
      } else if (res.status === 201) {
        setSubmitted(true);
      }
    } catch (err) {
      let errorMessage = 'Registration failed. Please try again.';
      if (err.response) {
        const status = err.response.status; const data = err.response.data;
        if (status === 400) errorMessage = data.message || 'Invalid input data. Please check your information.';
        else if (status === 409) errorMessage = data.message || 'Student Number or email already exists.';
        else if (status === 422) errorMessage = data.message || 'Invalid data format.';
        else if (status >= 500) errorMessage = 'Server error. Please try again later.';
        else errorMessage = data.message || `Registration failed (${status}).`;
      } else if (err.request) { errorMessage = 'Network error. Please check your connection and try again.'; }
      else { errorMessage = err.message || 'An unexpected error occurred.'; }
      setValidationModal({ isOpen: true, type: 'error', title: 'Registration Failed', message: errorMessage });
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
        <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Registration Submitted</h2>
          <p className="mb-6">Thank you for registering, expect an email in 1-2 business days. Thank you.</p>
          <button className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition" onClick={() => navigate('/')}>Go Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Register</h2>
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Previously Rejected?</p>
              <p className="text-blue-700">If you were previously rejected, you can re-register using the same email address. Your application will be updated and reviewed again.</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Verification section */}
          {!studentDetails && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Student Verification Required</p>
                  <p className="text-yellow-700">Please select your Student ID from the dropdown or enter your School ID and School Email to verify your enrollment and load your details.</p>
                </div>
              </div>
            </div>
          )}

          {/* Success section */}
          {studentDetails && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Student Verified</p>
                  <p className="text-green-700">Your details have been loaded from our records. Please review and submit your registration.</p>
                </div>
              </div>
            </div>
          )}

          {/* Row 1: School Email and Student ID (moved to top) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base mb-2">School Email<span className="text-red-500">*</span></label>
              <input 
                type="email" 
                name="personalEmail" 
                required 
                placeholder="username@sjdefi.edu.ph" 
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900 ${studentDetails ? 'bg-gray-100' : ''}`} 
                value={form.personalEmail} 
                onChange={handleChange} 
                disabled={loading || isCheckingStudent || (studentDetails ? true : false)} 
              />
            </div>
            <div className="relative">
              <label className="block text-base mb-2">Student ID<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="schoolID" 
                required 
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900" 
                value={form.schoolID} 
                onChange={handleChange} 
                disabled={loading || isCheckingStudent || (studentDetails ? true : false)} 
                placeholder={getSchoolIdPlaceholder()} 
                onFocus={() => {
                  if (!studentDetails && form.schoolID.length >= 1) {
                    filterStudents(form.schoolID);
                  }
                }}
              />
              
              {/* Student ID Dropdown */}
              {showStudentDropdown && filteredStudents.length > 0 && !studentDetails && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredStudents.map((student, index) => (
                    <div
                      key={index}
                      className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                      onClick={() => selectStudent(student)}
                    >
                      <div className="font-medium text-gray-900">{student.studentName}</div>
                      <div className="text-sm text-gray-600">School ID: {student.studentSchoolID}</div>
                      <div className="text-xs text-gray-500">{student.trackName} - {student.strandName} - {student.sectionName}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Name fields (read-only from student assignment) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base mb-2">First Name<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900 bg-gray-100" 
                value={form.firstName} 
                disabled 
                placeholder={studentDetails ? '' : 'Will be loaded from your assignment'}
              />
            </div>
            <div>
              <label className="block text-base mb-2">Last Name<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900 bg-gray-100" 
                value={form.lastName} 
                disabled 
                placeholder={studentDetails ? '' : 'Will be loaded from your assignment'}
              />
            </div>
          </div>
          
          {/* Row 3: Academic Information - Track, Strand, Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-base mb-2">Track<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900 bg-gray-100" 
                value={form.trackName} 
                disabled 
                placeholder={studentDetails ? '' : 'Will be loaded from your assignment'}
              />
            </div>
            <div>
              <label className="block text-base mb-2">Strand<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900 bg-gray-100" 
                value={form.strandName} 
                disabled 
                placeholder={studentDetails ? '' : 'Will be loaded from your assignment'}
              />
            </div>
            <div>
              <label className="block text-base mb-2">Section<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900 bg-gray-100" 
                value={form.sectionName} 
                disabled 
                placeholder={studentDetails ? '' : 'Will be loaded from your assignment'}
              />
            </div>
          </div>

          {/* Verification button - only show when student details not loaded */}
          {!studentDetails && (
            <button 
              type="button" 
              onClick={checkStudentDetails} 
              className="w-full bg-yellow-600 text-white p-3 rounded-lg hover:bg-yellow-700 transition" 
              disabled={loading || isCheckingStudent}
            >
              {isCheckingStudent ? 'Verifying...' : 'Verify Student Details'}
            </button>
          )}

          {/* Submit button - only show when student details are loaded */}
          {studentDetails && (
            <button 
              type="submit" 
              className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition" 
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          )}
        </form>
        <ValidationModal 
          isOpen={validationModal.isOpen} 
          onClose={() => setValidationModal({ ...validationModal, isOpen: false })} 
          type={validationModal.type} 
          title={validationModal.title} 
          message={validationModal.message}
          onConfirm={validationModal.onConfirm}
          confirmText={validationModal.confirmText}
          showCancel={validationModal.showCancel}
        />
      </div>
    </div>
  );
}