import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function Registration() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    personalEmail: '',
    schoolEmail: '', // School email for verification (studentSchoolEmail from assignment)
    schoolID: '',
    role: 'students',
    trackName: '',
    strandName: '',
    sectionName: '',
    agreeToPrivacyPolicy: false
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });
  const [privacyModal, setPrivacyModal] = useState(false);
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

  // Function to filter students based on input - only show exact matches for privacy
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
      schoolEmail: student.studentSchoolEmail || student.email || prev.schoolEmail, // Use school email from assignment
      personalEmail: student.personalEmail || prev.personalEmail, // Preserve existing personal email if student doesn't have one
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
    // Trim and validate inputs
    const trimmedSchoolID = (form.schoolID || '').trim();
    const trimmedSchoolEmail = (form.schoolEmail || '').trim();
    
    if (!trimmedSchoolID || !trimmedSchoolEmail) {
      setValidationModal({ 
        isOpen: true, 
        type: 'warning', 
        title: 'Missing Information', 
        message: 'Please enter both School ID and School Email to check your details.' 
      });
      return;
    }

    if (!isValidSchoolId(trimmedSchoolID)) {
      setValidationModal({ 
        isOpen: true, 
        type: 'warning', 
        title: 'Invalid Student Number', 
        message: 'Student Number must be in the format YY-00000 (e.g., 25-00001).' 
      });
      return;
    }

    // Validate school email format (sjdefilms.com domain)
    const schoolEmailRegex = /^[^\s@]+@sjdefilms\.com$/;
    if (!schoolEmailRegex.test(trimmedSchoolEmail)) {
      setValidationModal({ 
        isOpen: true, 
        type: 'warning', 
        title: 'Invalid School Email', 
        message: 'Please enter a valid school email address (e.g., students.firstname.lastname@sjdefilms.com).' 
      });
      return;
    }

    try {
      setIsCheckingStudent(true);
      // Send trimmed values to backend
      const response = await axios.post(`${API_BASE}/api/registrants/student-details`, {
        schoolID: trimmedSchoolID,
        schoolEmail: trimmedSchoolEmail
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
          sectionName: response.data.sectionName,
          personalEmail: response.data.personalEmail || prev.personalEmail // Keep school email or use provided personal email
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
          errorMessage = error.response.data.message || 'Student not found. Please verify that your School ID and School Email match the records in our system.';
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
    // Validate email format for SJDEFI domains
    const emailRegex = /^[^\s@]+@(sjdefi\.edu\.ph|students\.sjdefi\.edu\.ph)$/;
    if (!emailRegex.test(form.personalEmail)) {
      setValidationModal({ isOpen: true, type: 'warning', title: 'Invalid Email', message: 'Please enter a valid SJDEFI email address (e.g., username@sjdefi.edu.ph or username@students.sjdefi.edu.ph).' });
      setLoading(false); return;
    }
    if (!form.agreeToPrivacyPolicy) {
      setValidationModal({ isOpen: true, type: 'warning', title: 'Privacy Policy Agreement Required', message: 'You must agree to the Privacy Policy to continue with registration.' });
      setLoading(false); return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/registrants/register`, form);
      console.log('=== REGISTRATION SUCCESS ===', res.status, res.data);
      
      if (res.status === 200 && res.data.isReRegistration) {
        // Trigger event for admin page to refresh
        const timestamp = Date.now().toString();
        console.log('Setting localStorage with timestamp:', timestamp);
        localStorage.setItem('newRegistrantCreated', timestamp);
        
        // Dispatch event multiple times to ensure it's caught
        const event = new Event('registrantCreated', { bubbles: true, cancelable: true });
        window.dispatchEvent(event);
        console.log('Dispatched registrantCreated event');
        
        // Dispatch again after a small delay to ensure it's caught
        setTimeout(() => {
          window.dispatchEvent(new Event('registrantCreated', { bubbles: true, cancelable: true }));
        }, 100);
        
        setValidationModal({ isOpen: true, type: 'success', title: 'Re-registration Successful', message: res.data.message, onConfirm: handleReRegistrationSuccess, confirmText: 'Continue', showCancel: false });
        return;
      } else if (res.status === 201) {
        // Trigger event for admin page to refresh
        const timestamp = Date.now().toString();
        console.log('Setting localStorage with timestamp:', timestamp);
        localStorage.setItem('newRegistrantCreated', timestamp);
        
        // Dispatch event multiple times to ensure it's caught
        const event = new Event('registrantCreated', { bubbles: true, cancelable: true });
        window.dispatchEvent(event);
        console.log('Dispatched registrantCreated event');
        
        // Dispatch again after a small delay to ensure it's caught
        setTimeout(() => {
          window.dispatchEvent(new Event('registrantCreated', { bubbles: true, cancelable: true }));
        }, 100);
        
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
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Student Verification Required</p>
                  <p className="text-blue-700">Please select your Student ID from the dropdown or enter your School ID and School Email (from your student assignment) to verify your enrollment and load your details.</p>
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
                name="schoolEmail" 
                required 
                placeholder="students.firstname.lastname@sjdefilms.com" 
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  form.schoolEmail && !/^[^\s@]+@sjdefilms\.com$/.test(form.schoolEmail.trim())
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-blue-900'
                }`}
                value={form.schoolEmail} 
                onChange={handleChange} 
                disabled={loading || isCheckingStudent || !!studentDetails} 
              />
              <p className="text-xs text-gray-500 mt-1">
                {form.schoolEmail && !/^[^\s@]+@sjdefilms\.com$/.test(form.schoolEmail.trim())
                  ? 'Invalid format. Must be @sjdefilms.com'
                  : 'Enter your school email from your student assignment'}
              </p>
            </div>
            <div className="relative">
              <label className="block text-base mb-2">Student ID<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="schoolID" 
                required 
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 ${
                  form.schoolID && !isValidSchoolId(form.schoolID.trim())
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-blue-900 focus:ring-blue-500'
                }`}
                value={form.schoolID} 
                onChange={handleChange} 
                disabled={loading || isCheckingStudent || !!studentDetails} 
                placeholder={getSchoolIdPlaceholder()} 
                onFocus={() => {
                  if (form.schoolID && form.schoolID.length >= 1) {
                    filterStudents(form.schoolID);
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                {form.schoolID && !isValidSchoolId(form.schoolID.trim())
                  ? 'Invalid format. Must be YY-00000 (e.g., 25-00001)'
                  : 'Enter your student ID (e.g., 25-00001)'}
              </p>
              
              {/* Student ID Dropdown */}
              {showStudentDropdown && filteredStudents.length > 0 && (
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

          {/* Personal Email field - only show when student details are loaded */}
          {studentDetails && (
            <div>
              <label className="block text-base mb-2">Personal Email (SJDEFI)<span className="text-red-500">*</span></label>
              <input 
                type="email" 
                name="personalEmail" 
                required 
                placeholder="username@sjdefi.edu.ph" 
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900" 
                value={form.personalEmail} 
                onChange={handleChange} 
                disabled={loading} 
              />
              <p className="text-xs text-gray-500 mt-1">Enter your SJDEFI personal email address for registration</p>
            </div>
          )}

          {/* Verification button - only show when student details not loaded */}
          {!studentDetails && (() => {
            // Check if both fields are filled and valid
            const trimmedSchoolID = (form.schoolID || '').trim();
            const trimmedSchoolEmail = (form.schoolEmail || '').trim();
            const isSchoolIDValid = trimmedSchoolID && isValidSchoolId(trimmedSchoolID);
            const schoolEmailRegex = /^[^\s@]+@sjdefilms\.com$/;
            const isSchoolEmailValid = trimmedSchoolEmail && schoolEmailRegex.test(trimmedSchoolEmail);
            const canVerify = isSchoolIDValid && isSchoolEmailValid;
            
            return (
              <button 
                type="button" 
                onClick={checkStudentDetails} 
                className={`w-full p-3 rounded-lg transition ${
                  canVerify 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={loading || isCheckingStudent || !canVerify}
                title={!canVerify ? 'Please enter both a valid School ID and School Email to verify' : ''}
              >
                {isCheckingStudent ? 'Verifying...' : 'Verify Student Details'}
              </button>
            );
          })()}

          {/* Privacy Policy Agreement - only show when student details are loaded */}
          {studentDetails && (
            <div className="mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeToPrivacyPolicy"
                  checked={form.agreeToPrivacyPolicy}
                  onChange={handleChange}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  required
                />
                <span className="text-sm text-gray-700">
                  I agree to the <span 
                    className="text-blue-600 underline cursor-pointer hover:text-blue-800" 
                    onClick={() => setPrivacyModal(true)}
                  >
                    Privacy Policy
                  </span> and consent to the collection, processing, and storage of my personal information for the purpose of student registration and academic management. I understand that my data will be used in accordance with the school's data protection policies.
                </span>
              </label>
            </div>
          )}

          {/* Submit button - only show when student details are loaded */}
          {studentDetails && (
            <button 
              type="submit" 
              className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition disabled:bg-gray-400 disabled:cursor-not-allowed" 
              disabled={loading || !form.agreeToPrivacyPolicy}
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
        
        {/* Privacy Policy Modal */}
        {privacyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
                <button
                  onClick={() => setPrivacyModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="prose max-w-none">
                  <p className="text-sm text-gray-600 mb-4">Last updated: October 16, 2025</p>
                  
                  <p className="mb-4">
                    This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.
                  </p>
                  
                  <p className="mb-4">
                    We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy. This Privacy Policy has been created with the help of the Privacy Policy Generator.
                  </p>

                  <h3 className="text-lg font-semibold mt-6 mb-3">Interpretation and Definitions</h3>
                  
                  <h4 className="text-md font-semibold mt-4 mb-2">Interpretation</h4>
                  <p className="mb-4">
                    The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
                  </p>

                  <h4 className="text-md font-semibold mt-4 mb-2">Definitions</h4>
                  <p className="mb-2">For the purposes of this Privacy Policy:</p>
                  
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li><strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.</li>
                    <li><strong>Affiliate</strong> means an entity that controls, is controlled by, or is under common control with a party, where "control" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.</li>
                    <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to JuanLMS.</li>
                    <li><strong>Cookies</strong> are small files that are placed on Your computer, mobile device or any other device by a website, containing the details of Your browsing history on that website among its many uses.</li>
                    <li><strong>Country</strong> refers to: Philippines</li>
                    <li><strong>Device</strong> means any device that can access the Service such as a computer, a cell phone or a digital tablet.</li>
                    <li><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</li>
                    <li><strong>Service</strong> refers to the Website.</li>
                    <li><strong>Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company. It refers to third-party companies or individuals employed by the Company to facilitate the Service, to provide the Service on behalf of the Company, to perform services related to the Service or to assist the Company in analyzing how the Service is used.</li>
                    <li><strong>Usage Data</strong> refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself (for example, the duration of a page visit).</li>
                    <li><strong>Website</strong> refers to JuanLMS, accessible from https://sjdefilms.com</li>
                    <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
                  </ul>

                  <h3 className="text-lg font-semibold mt-6 mb-3">Collecting and Using Your Personal Data</h3>
                  
                  <h4 className="text-md font-semibold mt-4 mb-2">Types of Data Collected</h4>
                  
                  <h5 className="text-sm font-semibold mt-3 mb-2">Personal Data</h5>
                  <p className="mb-2">While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:</p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Email address</li>
                    <li>First name and last name</li>
                    <li>Usage Data</li>
                  </ul>

                  <h5 className="text-sm font-semibold mt-3 mb-2">Usage Data</h5>
                  <p className="mb-2">Usage Data is collected automatically when using the Service.</p>
                  <p className="mb-4">
                    Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.
                  </p>

                  <h3 className="text-lg font-semibold mt-6 mb-3">Use of Your Personal Data</h3>
                  <p className="mb-2">The Company may use Personal Data for the following purposes:</p>
                  <ul className="list-disc pl-6 mb-4 space-y-1">
                    <li>To provide and maintain our Service, including to monitor the usage of our Service.</li>
                    <li>To manage Your Account: to manage Your registration as a user of the Service.</li>
                    <li>For the performance of a contract: the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased.</li>
                    <li>To contact You: To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication.</li>
                    <li>To provide You with news, special offers, and general information about other goods, services and events which We offer.</li>
                    <li>To manage Your requests: To attend and manage Your requests to Us.</li>
                  </ul>

                  <h3 className="text-lg font-semibold mt-6 mb-3">Security of Your Personal Data</h3>
                  <p className="mb-4">
                    The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially reasonable means to protect Your Personal Data, We cannot guarantee its absolute security.
                  </p>

                  <h3 className="text-lg font-semibold mt-6 mb-3">Use of DeepSeek Analytics</h3>
                  <ul className="list-disc pl-6 mb-4 space-y-1">
                    <li>DeepSeek AI operates strictly under the institution's privacy guidelines.</li>
                    <li>It processes data only for educational analytics, such as measuring class engagement, predicting student performance risks, and enhancing learning outcomes.</li>
                    <li>No personal or sensitive information is shared externally, and all insights are aggregated and anonymized.</li>
                  </ul>

                  <h3 className="text-lg font-semibold mt-6 mb-3">Children's Privacy</h3>
                  <p className="mb-4">
                    Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13. If You are a parent or guardian and You are aware that Your child has provided Us with Personal Data, please contact Us.
                  </p>

                  <h3 className="text-lg font-semibold mt-6 mb-3">Changes to this Privacy Policy</h3>
                  <p className="mb-4">
                    We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page. We will let You know via email and/or a prominent notice on Our Service, prior to the change becoming effective and update the "Last updated" date at the top of this Privacy Policy.
                  </p>

                  <h3 className="text-lg font-semibold mt-6 mb-3">Contact Us</h3>
                  <p className="mb-4">
                    If you have any questions about this Privacy Policy, You can contact us:
                  </p>
                  <p className="mb-4">
                    By email: juanlms.sjddefi@gmail.com
                  </p>
                  <p className="text-sm text-gray-600">
                    Generated using TermsFeed Privacy Policy Generator
                  </p>
                </div>
              </div>
             
            </div>
          </div>
        )}
      </div>
    </div>
  );
}