import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Registration() {
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    personalEmail: '',
    contactNo: '',
    schoolID: '',
    role: 'students',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });
  const navigate = useNavigate();

  // Handle re-registration success
  const handleReRegistrationSuccess = () => {
    setValidationModal({
      isOpen: false,
      type: 'success',
      title: '',
      message: ''
    });
    setSubmitted(true);
  };

  function isValidName(name) {
    return /^[\p{L}\s'-]+$/u.test(name);
  }
  function isValidContactNo(contactNo) {
    return /^09\d{9}$/.test(contactNo);
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'contactNo') {
      // Only allow numbers, max 11 digits
      newValue = value.replace(/[^0-9]/g, '').slice(0, 11);
    } else if (name === 'firstName' || name === 'middleName' || name === 'lastName') {
      // Allow international letters (including ñ, é, ü, etc.), spaces, apostrophes, hyphens
      newValue = value.replace(/[^\p{L}\s'-]/gu, '');
    }
    setForm({ ...form, [name]: newValue });
  };

  function getSchoolIdPlaceholder() {
    return 'Student Number (e.g., 25-00001)';
  }

  function isValidSchoolId(schoolID) {
    return /^\d{2}-\d{5}$/.test(schoolID); // Student Number YY-00000
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate name fields
    if (!isValidName(form.firstName) || (form.middleName && !isValidName(form.middleName)) || !isValidName(form.lastName)) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Name',
        message: 'Names must only contain letters (including international characters like ñ, é, ü), spaces, apostrophes, or hyphens.'
      });
      setLoading(false);
      return;
    }
    // Validate contact number
    if (!isValidContactNo(form.contactNo)) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Contact Number',
        message: 'Contact number must be 11 digits and start with 09.'
      });
      setLoading(false);
      return;
    }
    
    // Validate school ID format
    if (!isValidSchoolId(form.schoolID)) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Student Number',
        message: 'Student Number must be in the format YY-00000 (e.g., 25-00001).'
      });
      setLoading(false);
      return;
    }
    
    // Validate required fields
    if (!form.firstName.trim() || !form.lastName.trim() || !form.personalEmail.trim()) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please fill in all required fields.'
      });
      setLoading(false);
      return;
    }
    
    // Validate email format (must be a valid domain, not just '@com')
    const emailRegex = /^[^\s@]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(form.personalEmail)) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Email',
        message: 'Please enter a valid email address (e.g., username@gmail.com).'
      });
      setLoading(false);
      return;
    }
    
    try {
      const res = await axios.post(`${API_BASE}/api/registrants/register`, form);
      
      if (res.status === 200 && res.data.isReRegistration) {
        // Handle re-registration case
        setValidationModal({
          isOpen: true,
          type: 'success',
          title: 'Re-registration Successful',
          message: res.data.message,
          onConfirm: handleReRegistrationSuccess,
          confirmText: 'Continue',
          showCancel: false
        });
        // Don't set submitted to true yet, let user acknowledge the message
        return;
      } else if (res.status === 201) {
        // Handle new registration case
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Registration error:', err);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 400) {
          errorMessage = data.message || 'Invalid input data. Please check your information.';
        } else if (status === 409) {
          errorMessage = data.message || 'Student Number or email already exists.';
        } else if (status === 422) {
          errorMessage = data.message || 'Invalid data format.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = data.message || `Registration failed (${status}).`;
        }
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = err.message || 'An unexpected error occurred.';
      }
      
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Registration Failed',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
        <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Registration Submitted</h2>
          <p className="mb-6">Thank you for registering, expect an email in 1-2 business days. Thank you.</p>
          <button
            className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition"
            onClick={() => navigate('/')}
          >
            Go Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Register</h2>
        
        {/* Re-registration Info */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Previously Rejected?</p>
              <p className="text-blue-700">
                If you were previously rejected, you can re-register using the same email address. 
                Your application will be updated and reviewed again by our admissions team.
              </p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-base mb-2">First Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              name="firstName"
              required
              placeholder="First Name"
              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900"
              value={form.firstName}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-base mb-2">Middle Name</label>
            <input
              type="text"
              name="middleName"
              placeholder="Middle Name"
              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900"
              value={form.middleName}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-base mb-2">Last Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              name="lastName"
              required
              placeholder="Last Name"
              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900"
              value={form.lastName}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-base mb-2">Personal Email<span className="text-red-500">*</span></label>
            <input
              type="email"
              name="personalEmail"
              required
              placeholder="username@gmail.com"
              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900"
              value={form.personalEmail}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-base mb-2">Contact No.<span className="text-red-500">*</span></label>
            <input
              type="text"
              name="contactNo"
              required
              placeholder="09XXXXXXXXX"
              maxLength={11}
              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900"
              value={form.contactNo}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-base mb-2">School ID<span className="text-red-500">*</span></label>
            <input
              type="text"
              name="schoolID"
              required
              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900"
              value={form.schoolID}
              onChange={handleChange}
              disabled={loading}
              placeholder={getSchoolIdPlaceholder()}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        <ValidationModal
          isOpen={validationModal.isOpen}
          onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
          type={validationModal.type}
          title={validationModal.title}
          message={validationModal.message}
        />
      </div>
    </div>
  );
} 