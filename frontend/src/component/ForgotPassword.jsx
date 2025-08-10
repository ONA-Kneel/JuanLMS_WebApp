// ForgotPassword.jsx
// Handles the password reset process: requests OTP, verifies OTP, and sets new password.
// Step-based UI: 1) request OTP, 2) enter OTP, 3) enter new password, 4) success message.

import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function ForgotPassword() {
  // --- STATE ---
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: request OTP, 2: enter OTP, 3: enter new password
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  // --- HANDLER: Request OTP to be sent to user's email ---
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await axios.post(`${API_BASE}/forgot-password`, { email });
      setMessage(response.data.message || 'If your email is registered, a reset link or OTP has been sent.');
      setStep(2); // Move to next step
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLER: Validate OTP ---
  const handleValidateOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await axios.post(`${API_BASE}/validate-otp`, {
        personalemail: email,
        otp,
      });
      setMessage('OTP validated. Please enter your new password.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLER: Reset password using OTP (step 3) ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    try {
      const response = await axios.post(`${API_BASE}/reset-password`, {
        personalemail: email,
        otp,
        newPassword,
      });
      setMessage(response.data.message || 'Password reset successful.');
      setStep(4); // Show success message
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Forgot Password</h2>
        {/* Step 1: Request OTP */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label className="block text-base mb-2">Enter your registered personal email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900"
                placeholder="username@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link/OTP'}
            </button>
          </form>
        )}
        {/* Step 2: Enter OTP */}
        {step === 2 && (
          <form onSubmit={handleValidateOTP} className="space-y-4">
            <div>
              <label className="block text-base mb-2">Enter the OTP sent to your email</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900"
                placeholder="Enter OTP"
                value={otp}
                onChange={e => setOtp(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition"
              disabled={loading}
            >
              {loading ? 'Validating...' : 'Validate OTP'}
            </button>
          </form>
        )}
        {/* Step 3: Enter new password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-base mb-2">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900"
                placeholder="New password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-base mb-2">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-900"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
        {/* Step 4: Success message */}
        {step === 4 && (
          <div>
            <p className="text-green-600 mt-4">{message}</p>
            <button className="mt-6 text-blue-700 hover:underline" onClick={() => navigate('/')}>Back to Login</button>
          </div>
        )}
        {/* Show message or error if not on step 4 */}
        {message && step !== 4 && <p className="text-green-600 mt-4">{message}</p>}
        {error && <p className="text-red-600 mt-4">{error}</p>}
        {/* Back to login button (not on step 4) */}
        {step !== 4 && (
          <button className="mt-6 text-blue-700 hover:underline" onClick={() => navigate('/')}>Back to Login</button>
        )}
      </div>
    </div>
  );
} 