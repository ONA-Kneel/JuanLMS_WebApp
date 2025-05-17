// login
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo/Logo4.svg';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { jwtDecode } from 'jwt-decode'; // ✅ import for decoding JWT

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    // Check for stored credentials on component mount
    const storedEmail = localStorage.getItem('rememberedEmail');
    const storedPassword = localStorage.getItem('rememberedPassword');
    
    if (storedEmail && storedPassword) {
      // Auto-login with stored credentials
      handleAutoLogin(storedEmail, storedPassword);
    }
  }, []);

  const handleAutoLogin = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/login', { email, password });
      const { token } = response.data;
  
      const decoded = jwtDecode(token);
      const { _id, role, name, email: userEmail, phone, profilePic, userID } = decoded;
  
      const imageUrl = profilePic ? `http://localhost:5000/uploads/${profilePic}` : null;
  
      localStorage.setItem('user', JSON.stringify({ _id, name, email: userEmail, phone, role, profilePic: imageUrl }));
      localStorage.setItem('token', token);
      localStorage.setItem('userID', userID);
  
      if (role === 'students') navigate('/student_dashboard');
      else if (role === 'faculty') navigate('/faculty_dashboard');
      else if (role === 'parent') navigate('/parent_dashboard');
      else if (role === 'admin') navigate('/admin_dashboard');
      else if (role === 'director') navigate('/director_dashboard');
      else alert('Unknown role');
    } catch (error) {
      console.log(error);
      // Clear stored credentials if auto-login fails
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.elements[0].value;
    const password = e.target.elements[1].value;
  
    try {
      const response = await axios.post('http://localhost:5000/login', { email, password });
      const { token } = response.data;
  
      const decoded = jwtDecode(token);
      const { _id, role, name, email: userEmail, phone, profilePic, userID } = decoded;
  
      const imageUrl = profilePic ? `http://localhost:5000/uploads/${profilePic}` : null;
  
      localStorage.setItem('user', JSON.stringify({ _id, name, email: userEmail, phone, role, profilePic: imageUrl }));
      localStorage.setItem('token', token);
      localStorage.setItem('userID', userID);

      // Store credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        // Clear any previously stored credentials
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }
  
      if (role === 'students') navigate('/student_dashboard');
      else if (role === 'faculty') navigate('/faculty_dashboard');
      else if (role === 'parent') navigate('/parent_dashboard');
      else if (role === 'admin') navigate('/admin_dashboard');
      else if (role === 'director') navigate('/director_dashboard');
      else alert('Unknown role');
  
    } catch (error) {
      console.log(error);
      alert('Invalid email or password');
    }
  };
  

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 inset-shadow-black px-4">
      <div className="w-full max-w-4xl bg-white shadow-lg flex flex-col md:flex-row h-auto md:h-[30rem] lg:w-[120rem]">

        {/* Left Section (Login Form) */}
        <div className="w-full md:w-1/2 p-8 md:p-12">
          <h2 className="text-3xl mb-8 font-poppinsb text-gray-900">Login</h2>

          <form onSubmit={handleLogin} className="space-y-4 mt-8">
            <div>
              <label className="block text-base font-poppinsr mb-2">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-poppinsr text-base border-blue-900"
                placeholder="username@gmail.com"
              />
            </div>

            <div>
              <label className="block text-base font-poppinsr mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-poppinsr text-base border-blue-900 pr-12"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-600 hover:text-blue-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center font-poppinsr text-sm">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember Me
              </label>
              <Link to="/forgot-password" className="text-blue-600 hover:underline font-poppinsr text-sm">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-900 text-white p-3 mt-12 rounded-lg hover:bg-blue-950 transition font-poppinsr text-base"
            >
              Login
            </button>
          </form>
        </div>

        {/* Right Section (Welcome Message) */}
        <div className="relative w-full md:w-1/2 flex flex-col items-start justify-center p-8 md:p-10 bg-[url('/src/assets/bg-JuanLMS.svg')] bg-cover bg-center text-white">
          <img src={logo} className="w-20 md:w-24 absolute top-5 right-5 md:right-10" alt="Logo" />
          <h2 className="text-3xl md:text-4xl font-bold font-poppinsb">Hello,</h2>
          <h2 className="text-3xl md:text-4xl font-bold font-poppinsb">welcome!</h2>
          <p className="text-sm mt-4 font-poppinsl max-w-xs">
            San Juan De Dios Educational Foundation, Inc. Learning Management System
          </p>
        </div>
      </div>
    </div>
  );
}