// App.js - Updated with ToastContainer
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { setupCrossTabSessionListener, redirectToDashboardIfSessionExists } from './utils/sessionUtils';
// For Logging in into different user and accounts
import Login from './component/Login';
import ForgotPassword from './component/ForgotPassword';
import PdfViewer from './component/PdfViewer';
import ProtectedRoute from './component/ProtectedRoute';
import ActivityCreatePage from './component/ActivityCreatePage';
import AssignmentDetailPage from './component/AssignmentDetailPage';
import Registration from './component/Registration';

// Students Access
import Student_Dashboard from './component/Student/Student_Dashboard';
import Student_Classes from './component/Student/Student_Classes';
import Student_Activities from './component/Student/Student_Activities';
import Student_Chats from './component/Student/Student_Chats';
import Student_Progress from './component/Student/Student_Progress';
import Student_Grades from './component/Student/Student_Grades';
import Student_Calendar from './component/Student/Student_Calendar';
import Student_Meeting from './component/Student/Student_Meeting';
import Student_ClassWorkspace from './component/Student/Student_ClassWorkspace';

// Faculty Access
import Faculty_Dashboard from './component/Faculty/Faculty_Dashboard';
import Faculty_Classes from './component/Faculty/Faculty_Classes';
import Faculty_Activities from './component/Faculty/Faculty_Activities';
import Faculty_Chats from './component/Faculty/Faculty_Chats';
import Faculty_Progress from './component/Faculty/Faculty_Progress';
import Faculty_Grades from './component/Faculty/Faculty_Grades';
import Faculty_Calendar from './component/Faculty/Faculty_Calendar';
import Faculty_CreateClass from './component/Faculty/Faculty_CreateClass';
import Faculty_ClassWorkspace from './component/Faculty/Faculty_ClassWorkspace';
import Faculty_Meeting from './component/Faculty/Faculty_Meeting';
import Faculty_StudentReport from './component/Faculty/Faculty_StudentReport';
import SupportModal from './component/Support/SupportModal';

// Principal Access
import Principal_Dashboard from './component/Principal/Principal_Dashboard';
import Principal_Chats from './component/Principal/Principal_Chats';
import Principal_Grades from './component/Principal/Principal_Grades';
import Principal_Calendar from './component/Principal/Principal_Calendar';
import Principal_AuditTrail from './component/Principal/Principal_AuditTrail';
import Principal_FacultyReport from './component/Principal/Principal_FacultyReport';
import Principal_PostAnnouncement from './component/Principal/Principal_PostAnnouncement';

// Admin Access
import Admin_Dashboard from './component/Admin/Admin_Dashboard';
import Admin_Activities from './component/Admin/Admin_Activities';
import Admin_Calendar from './component/Admin/Admin_Calendar';
import Admin_Chats from './component/Admin/Admin_Chats';
import Admin_Accounts from './component/Admin/Admin_Accounts';
import Admin_Grades from './component/Admin/Admin_Grades';
import Admin_Progress from './component/Admin/Admin_Progress';
import Admin_AuditTrail from './component/Admin/Admin_AuditTrail';
import { AdminSupportCenter } from './component/Admin';
import Admin_AcademicSettings from './component/Admin/Admin_AcademicSettings';
import TermDetails from './component/Admin/TermDetails';
import Admin_Registrants from './component/Admin/Admin_Registrants';

// VPE Access
import VPE_Dashboard from './component/VPE/VPE_Dashboard';
import VPE_Chats from './component/VPE/VPE_Chats';
import VPE_Calendar from './component/VPE/VPE_Calendar';
import VPE_AuditTrail from './component/VPE/VPE_AuditTrail';
import VPE_FacultyReport from './component/VPE/VPE_FacultyReport';
import VPE_PostAnnouncement from './component/VPE/VPE_PostAnnouncement';

// All Around
import ActivityTab from './component/ActivityTab';
import QuizTab from './component/QuizTab';
import QuizView from './component/QuizView';
import QuizResponses from './component/QuizResponses';

function App() {
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [logoutRequested, setLogoutRequested] = useState(false);

  // Decode JWT and proactively flag expiration (optional extra UX)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      // Lazy import to avoid adding jwt-decode to all routes
      import('jwt-decode').then(({ jwtDecode }) => {
        const decoded = jwtDecode(token);
        if (decoded && decoded.exp) {
          const expiresAtMs = decoded.exp * 1000;
          const now = Date.now();
          if (expiresAtMs <= now) {
            setIsSessionExpired(true);
          } else {
            const timeoutId = setTimeout(() => setIsSessionExpired(true), expiresAtMs - now);
            return () => clearTimeout(timeoutId);
          }
        }
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  // Cross-tab session sharing: Listen for authentication changes from other tabs
  useEffect(() => {
    // Setup cross-tab session listener
    const cleanup = setupCrossTabSessionListener();

    // Track if this is a new tab or existing tab
    let isNewTab = true;
    let lastVisibilityState = document.visibilityState;

    // Only check on page focus/visibility change for new tabs, not tab switching
    const handleVisibilityChange = () => {
      const currentVisibility = document.visibilityState;
      
      // Only redirect if:
      // 1. This is a new tab (first time becoming visible)
      // 2. We're coming from 'hidden' to 'visible' (not just tab switching)
      // 3. The previous state was 'hidden' (indicating a new tab or fresh page load)
      if (isNewTab && currentVisibility === 'visible' && lastVisibilityState === 'hidden') {
        console.log('[App] New tab detected, checking for session redirect...');
        redirectToDashboardIfSessionExists();
        isNewTab = false; // Mark as no longer a new tab
      }
      
      lastVisibilityState = currentVisibility;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup event listeners
    return () => {
      cleanup();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Global axios interceptor: catch 401 Token expired/Invalid token
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        const message = (error?.response?.data?.message || '').toLowerCase();
        if (status === 401 && (message.includes('token expired') || message.includes('invalid token') || message.includes('no valid token'))) {
          setIsSessionExpired(true);
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  const handleLogout = () => {
    if (logoutRequested) return;
    setLogoutRequested(true);
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('userID');
      localStorage.removeItem('role');
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
      localStorage.removeItem('shouldLogoutOnReturn');
    } catch {
      // ignore
    }
    // Hard redirect to login
    window.location.replace('/');
  };

  return (
    <Router>
      <Routes>
        {/* Login into different User Accounts */}
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/pdf-viewer" element={<PdfViewer />} />
        {/* Students */}
        <Route path="/student_dashboard" element={<ProtectedRoute allowedRoles={['students']}><Student_Dashboard /></ProtectedRoute>}/>
        <Route path="/student_classes" element={<ProtectedRoute allowedRoles={['students']}><Student_Classes /></ProtectedRoute>}/>
        <Route path="/student_activities" element={<ProtectedRoute allowedRoles={['students']}><Student_Activities /></ProtectedRoute>}/>
        <Route path="/student_chats" element={<ProtectedRoute allowedRoles={['students']}><Student_Chats /></ProtectedRoute>}/>
        <Route path="/student_progress" element={<ProtectedRoute allowedRoles={['students']}><Student_Progress /></ProtectedRoute>}/>
        <Route path="/student_grades" element={<ProtectedRoute allowedRoles={['students']}><Student_Grades /></ProtectedRoute>}/>
        <Route path="/student_calendar" element={<ProtectedRoute allowedRoles={['students']}><Student_Calendar /></ProtectedRoute>}/>
        <Route path="/student_meeting" element={<ProtectedRoute allowedRoles={['students']}><Student_Meeting /></ProtectedRoute>} />
        <Route path="/student_class/:classId" element={<ProtectedRoute allowedRoles={['students']}><Student_ClassWorkspace /></ProtectedRoute>} />

        
        {/* Faculty */}
        <Route path="/faculty_dashboard" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Dashboard/></ProtectedRoute>}/>
        <Route path="/faculty_classes" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Classes /></ProtectedRoute>}/>
        <Route path="/faculty_activities" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Activities /></ProtectedRoute>}/>
        <Route path="/faculty_chats" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Chats /></ProtectedRoute>}/>
        <Route path="/faculty_progress" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Progress /></ProtectedRoute>}/>
        <Route path="/faculty_grades" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Grades /></ProtectedRoute>}/>
        <Route path="/faculty_calendar" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Calendar /></ProtectedRoute>} /> 
        <Route path="/faculty_createclass" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_CreateClass/></ProtectedRoute>}/> 
        <Route path="/faculty_class/:classId" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_ClassWorkspace /></ProtectedRoute>} />
        <Route path="/faculty_meeting" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Meeting /></ProtectedRoute>} />
        <Route path="/faculty_student_report" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_StudentReport /></ProtectedRoute>} />


        {/* Principal */}
        <Route path="/principal_dashboard" element={<ProtectedRoute allowedRoles={['principal']}><Principal_Dashboard/></ProtectedRoute>}/>
        <Route path="/principal_calendar" element={<ProtectedRoute allowedRoles={['principal']}><Principal_Calendar /></ProtectedRoute>}/>
        <Route path="/principal_faculty_report" element={<ProtectedRoute allowedRoles={['principal']}><Principal_FacultyReport /></ProtectedRoute>}/>
        <Route path="/principal_post_announcement" element={<ProtectedRoute allowedRoles={['principal']}><Principal_PostAnnouncement /></ProtectedRoute>}/>
        <Route path="/principal_grades" element={<ProtectedRoute allowedRoles={['principal']}><Principal_Grades /></ProtectedRoute>}/>
        <Route path="/principal_audit_trail" element={<ProtectedRoute allowedRoles={['principal']}><Principal_AuditTrail /></ProtectedRoute>}/>
        <Route path="/principal_chats" element={<ProtectedRoute allowedRoles={['principal']}><Principal_Chats /></ProtectedRoute>}/>

        {/* Admin */}
        <Route path="/admin_dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Admin_Dashboard/></ProtectedRoute>}/>
        <Route path="/admin_accounts" element={<ProtectedRoute allowedRoles={['admin']}><Admin_Accounts /></ProtectedRoute>}/>
        <Route path="/admin_academic_settings" element={<ProtectedRoute allowedRoles={['admin']}><Admin_AcademicSettings /></ProtectedRoute>}/>
        <Route path="/admin_activities" element={<ProtectedRoute allowedRoles={['admin']}><Admin_Activities /></ProtectedRoute>}/>
        <Route path="/admin_chats" element={<ProtectedRoute allowedRoles={['admin']}><Admin_Chats /></ProtectedRoute>}/>
        <Route path="/admin_grades" element={<ProtectedRoute allowedRoles={['admin']}><Admin_Grades /></ProtectedRoute>}/>
        <Route path="/admin_calendar" element={<ProtectedRoute allowedRoles={['admin']}><Admin_Calendar /></ProtectedRoute>}/>
        <Route path="/admin_progress" element={<ProtectedRoute allowedRoles={['admin']}><Admin_Progress /></ProtectedRoute>}/>
        <Route path="/admin_audit_trail" element={<ProtectedRoute allowedRoles={['admin']}><Admin_AuditTrail /></ProtectedRoute>}/>
        <Route path="/admin/support-center" element={<ProtectedRoute allowedRoles={['admin']}><AdminSupportCenter /></ProtectedRoute>} />
        <Route path="/admin/academic-settings/terms/:termId" element={<ProtectedRoute allowedRoles={['admin']}><TermDetails /></ProtectedRoute>} />
        <Route path="/admin_registrants" element={<ProtectedRoute allowedRoles={['admin']}><Admin_Registrants /></ProtectedRoute>} />

        {/* VPE */}
        <Route path="/VPE_dashboard" element={<ProtectedRoute allowedRoles={['vice president of education']}><VPE_Dashboard/></ProtectedRoute>}/>
        <Route path="/VPE_chats" element={<ProtectedRoute allowedRoles={['vice president of education']}><VPE_Chats /></ProtectedRoute>}/>
        <Route path="/VPE_calendar" element={<ProtectedRoute allowedRoles={['vice president of education']}><VPE_Calendar /></ProtectedRoute>}/>
        <Route path="/VPE_audit_trail" element={<ProtectedRoute allowedRoles={['vice president of education']}><VPE_AuditTrail/></ProtectedRoute>}/>
        <Route path="/VPE_faculty_report" element={<ProtectedRoute allowedRoles={['vice president of education']}><VPE_FacultyReport/></ProtectedRoute>}/>
        <Route path="/vpe_post_announcement" element={<ProtectedRoute allowedRoles={['vice president of education']}><VPE_PostAnnouncement/></ProtectedRoute>}/>

        {/* Assignment Creation Page */}
        <Route path="/create-assignment" element={<ProtectedRoute allowedRoles={['faculty']}><ActivityTab /></ProtectedRoute>} />
        {/* Quiz Creation Page */}
        <Route path="/create-quiz" element={<ProtectedRoute allowedRoles={['faculty']}><QuizTab /></ProtectedRoute>} />

        {/* Assignment/Quiz Detail Page */}
        <Route path="/assignment/:assignmentId" element={<ProtectedRoute allowedRoles={['faculty','students']}><AssignmentDetailPage /></ProtectedRoute>} />

        {/* Quiz Taking Page (Student) */}
        <Route path="/quiz/:quizId" element={<ProtectedRoute allowedRoles={['students']}><QuizView /></ProtectedRoute>} />
        {/* Quiz Responses Page (Faculty) */}
        <Route path="/quiz/:quizId/responses" element={<ProtectedRoute allowedRoles={['faculty']}><QuizResponses /></ProtectedRoute>} />

        {/* Registration Page */}
        <Route path="/register" element={<Registration />} />

      </Routes>

      {/* Toast Container - Add this at the end, before closing Router */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ zIndex: 9999 }}
        toastClassName="custom-toast"
        bodyClassName="custom-toast-body"
      />
      {isSessionExpired && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-2 text-red-600">Session expired</h3>
            <p className="mb-4">Your session has ended. Please log in again to continue.</p>
            <button onClick={handleLogout} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full">Log out</button>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;