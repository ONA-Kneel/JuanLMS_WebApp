// App.js
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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

// Director Access
import Director_Dashboard from './component/Director/Director_Dashboard';
import Director_Chats from './component/Director/Director_Chats';
import Director_Grades from './component/Director/Director_Grades';
import Director_Calendar from './component/Director/Director_Calendar';
import Director_AuditTrail from './component/Director/Director_AuditTrail';


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

// Parent Access
import Parent_Dashboard from './component/Parent/Parent_Dashboard';
import Parent_Grades from './component/Parent/Parent_Grades';
import Parent_Progress from './component/Parent/Parent_Progress';

function App() {
  return (
    <Router>
      <Routes>
        {/* Login into different User Accounts */}
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/pdf-viewer" element={<PdfViewer />} />
        {/* Students */}
        <Route path="/student_dashboard" element={<ProtectedRoute allowedRoles={['students']}><Student_Dashboard /></ProtectedRoute>} />
        <Route path="/student_classes" element={<ProtectedRoute allowedRoles={['students']}><Student_Classes /></ProtectedRoute>}/>
        <Route path="/student_activities" element={<ProtectedRoute allowedRoles={['students']}><Student_Activities /></ProtectedRoute>}/>
        <Route path="/student_chats" element={<ProtectedRoute allowedRoles={['students']}><Student_Chats /></ProtectedRoute>}/>
        <Route path="/student_progress" element={<ProtectedRoute allowedRoles={['students']}><Student_Progress /></ProtectedRoute>}/>
        <Route path="/student_grades" element={<ProtectedRoute allowedRoles={['students']}><Student_Grades /></ProtectedRoute>}/>
        <Route path="/student_calendar" element={<ProtectedRoute allowedRoles={['students']}><Student_Calendar /></ProtectedRoute>}/>
        <Route path="/student_class/:classId" element={<ProtectedRoute allowedRoles={['students']}><Student_ClassWorkspace /></ProtectedRoute>} />

        
        {/* Faculty */}
        <Route path="/faculty_dashboard" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Dashboard/></ProtectedRoute>}/>
        <Route path="/faculty_classes" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Classes /></ProtectedRoute>}/>
        <Route path="/faculty_activities" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Activities /></ProtectedRoute>}/>
        <Route path="/faculty_chats" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Chats /></ProtectedRoute>}/>
        <Route path="/faculty_progress" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Progress /></ProtectedRoute>}/>
        <Route path="/faculty_grades" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Grades /></ProtectedRoute>}/>
        <Route path="/faculty_calendar" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Calendar /></ProtectedRoute>}/> 
        <Route path="/faculty_createclass" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_CreateClass/></ProtectedRoute>}/> 
        <Route path="/faculty_class/:classId" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_ClassWorkspace /></ProtectedRoute>} />
        <Route path="/faculty_meeting" element={<ProtectedRoute allowedRoles={['faculty']}><Faculty_Meeting /></ProtectedRoute>} />


        {/* Director */}
        <Route path="/director_dashboard" element={<ProtectedRoute allowedRoles={['director']}><Director_Dashboard/></ProtectedRoute>}/>
        <Route path="/director_chats" element={<ProtectedRoute allowedRoles={['director']}><Director_Chats /></ProtectedRoute>}/>
        <Route path="/director_grades" element={<ProtectedRoute allowedRoles={['director']}><Director_Grades /></ProtectedRoute>}/>
        <Route path="/director_calendar" element={<ProtectedRoute allowedRoles={['director']}><Director_Calendar /></ProtectedRoute>}/> 
        <Route path="/director_audit_trail" element={<ProtectedRoute allowedRoles={['director']}><Director_AuditTrail/></ProtectedRoute>}/>

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

        {/* Parent */}
        <Route path="/parent_dashboard" element={<ProtectedRoute allowedRoles={['parent']}><Parent_Dashboard/></ProtectedRoute>}/>
        <Route path="/parent_grades" element={<ProtectedRoute allowedRoles={['parent']}><Parent_Grades/></ProtectedRoute>}/>
        <Route path="/parent_progress" element={<ProtectedRoute allowedRoles={['parent']}><Parent_Progress/></ProtectedRoute>}/>

        {/* Shared Activity Creation Page */}
        <Route path="/create-activity" element={<ProtectedRoute allowedRoles={['faculty','students']}><ActivityCreatePage /></ProtectedRoute>} />

        {/* Assignment/Quiz Detail Page */}
        <Route path="/assignment/:assignmentId" element={<ProtectedRoute allowedRoles={['faculty','students']}><AssignmentDetailPage /></ProtectedRoute>} />

        {/* Registration Page */}
        <Route path="/register" element={<Registration />} />

      </Routes>
    </Router>
  );
}

export default App;