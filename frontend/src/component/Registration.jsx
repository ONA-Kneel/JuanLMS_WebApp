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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.personalEmail)) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Email',
        message: 'Please enter a valid email address.'
      });
      setLoading(false);
      return;
    }
    
    try {
      const res = await axios.post(`${API_BASE}/api/registrants/register`, form);
      if (res.status === 201) {
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-base mb-2">First Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              name="firstName"
              required
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