import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Registration() {
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    personalEmail: '',
    contactNo: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/registrants/register`, form);
      if (res.status === 201) {
        setSubmitted(true);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Registration failed. Please try again.');
      }
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
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <button
          className="mt-6 text-blue-700 hover:underline w-full"
          onClick={() => navigate('/')}
          disabled={loading}
        >
          Go Back
        </button>
      </div>
    </div>
  );
} 