import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await axios.post('http://localhost:5000/forgot-password', { email });
      setMessage(response.data.message || 'If your email is registered, a reset link or OTP has been sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Forgot Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-base mb-2">Enter your registered email</label>
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
        {message && <p className="text-green-600 mt-4">{message}</p>}
        {error && <p className="text-red-600 mt-4">{error}</p>}
        <button className="mt-6 text-blue-700 hover:underline" onClick={() => navigate('/login')}>Back to Login</button>
      </div>
    </div>
  );
} 