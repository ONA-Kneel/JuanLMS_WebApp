// ForgotPassword.jsx
// Handles the password reset process: requests OTP, verifies OTP, and sets new password.
// Step-based UI: 1) request OTP, 2) enter OTP, 3) enter new password, 4) success message.

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  const [, setOtpAttempts] = useState(0);
  const [otpLockout, setOtpLockout] = useState(false);
  const [otpLockoutTime, setOtpLockoutTime] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // Lockout timer effect
  useEffect(() => {
    let timer;
    if (otpLockout && otpLockoutTime > 0) {
      timer = setInterval(() => {
        setOtpLockoutTime(prev => {
          if (prev <= 1) {
            setOtpLockout(false);
            setOtpAttempts(0);
            localStorage.removeItem('otpLockoutUntil');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpLockout, otpLockoutTime]);

  // On mount, check lockout
  useEffect(() => {
    const lockoutUntil = localStorage.getItem('otpLockoutUntil');
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
      setOtpLockout(true);
      setOtpLockoutTime(Math.ceil((parseInt(lockoutUntil) - Date.now()) / 1000));
    }
  }, []);

  // Cooldown timer for resend
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // --- HANDLER: Request OTP to be sent to user's email ---
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (otpLockout) return;
    setError('');
    setMessage('');
    // Frontend email format validation
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/forgot-password`, { email });
      setMessage(response.data.message || 'If your email is registered, a reset link or OTP has been sent.');
      setStep(2); // Move to next step
      setCooldown(20); // 20s cooldown
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLER: Validate OTP ---
  const handleValidateOTP = async (e) => {
    e.preventDefault();
    if (otpLockout) return;
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
      setOtpAttempts(0); // reset attempts on success
    } catch (err) {
      setOtpAttempts(prev => {
        const newAttempts = prev + 1;
        if (newAttempts >= 5) {
          const lockoutUntil = Date.now() + 5 * 60 * 1000;
          localStorage.setItem('otpLockoutUntil', lockoutUntil);
          setOtpLockout(true);
          setOtpLockoutTime(5 * 60);
        }
        return newAttempts;
      });
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
                disabled={otpLockout}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition"
              disabled={loading || otpLockout}
            >
              {loading ? 'Validating...' : 'Validate OTP'}
            </button>
            <button
              type="button"
              className={`w-full p-3 rounded-lg transition mb-2 ${
                cooldown > 0 || loading || otpLockout
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              onClick={handleRequestOTP}
              disabled={cooldown > 0 || loading || otpLockout}
            >
              {otpLockout
                ? `Locked (${otpLockoutTime}s)`
                : cooldown > 0
                  ? `Resend OTP in ${cooldown}s`
                  : loading
                    ? 'Sending OTP...'
                    : 'Resend OTP'}
            </button>
            {otpLockout && (
              <div className="text-red-600 text-sm mt-2">Too many failed attempts. Try again in {otpLockoutTime}s.</div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => navigate('/')} className="px-4 py-2 rounded bg-gray-300">Cancel</button>
            </div>
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