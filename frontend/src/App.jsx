// App.js
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
// For Logging in into different user and accounts
import Login from './component/Login';
import ForgotPassword from './component/ForgotPassword';

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
        {/* Students */}
        <Route path="/student_dashboard" element={<Student_Dashboard />} />
        <Route path="/student_classes" element={<Student_Classes />}/>
        <Route path="/student_activities" element={<Student_Activities />}/>
        <Route path="/student_chats" element={<Student_Chats />}/>
        <Route path="/student_progress" element={<Student_Progress />}/>
        <Route path="/student_grades" element={<Student_Grades />}/>
        <Route path="/student_calendar" element={<Student_Calendar />}/>
        <Route path="/student_class/:classId" element={<Student_ClassWorkspace />} />

        
        {/* Faculty */}
        <Route path="/faculty_dashboard" element={<Faculty_Dashboard/>}/>
        <Route path="/faculty_classes" element={<Faculty_Classes />}/>
        <Route path="/faculty_activities" element={<Faculty_Activities />}/>
        <Route path="/faculty_chats" element={<Faculty_Chats />}/>
        <Route path="/faculty_progress" element={<Faculty_Progress />}/>
        <Route path="/faculty_grades" element={<Faculty_Grades />}/>
        <Route path="/faculty_calendar" element={<Faculty_Calendar />}/> 
        <Route path="/faculty_createclass" element={<Faculty_CreateClass/>}/> 
        <Route path="/faculty_class/:classId" element={<Faculty_ClassWorkspace />} />


        {/* Director */}
        <Route path="/director_dashboard" element={<Director_Dashboard/>}/>
        <Route path="/director_chats" element={<Director_Chats />}/>
        <Route path="/director_grades" element={<Director_Grades />}/>
        <Route path="/director_calendar" element={<Director_Calendar />}/> 
        <Route path="/director_audit_trail" element={<Director_AuditTrail/>}/>

        {/* Admin */}
        <Route path="/admin_dashboard" element={<Admin_Dashboard/>}/>
        <Route path="/admin_accounts" element={<Admin_Accounts />}/>
        <Route path="/admin_activities" element={<Admin_Activities />}/>
        <Route path="/admin_chats" element={<Admin_Chats />}/>
        <Route path="/admin_grades" element={<Admin_Grades />}/>
        <Route path="/admin_calendar" element={<Admin_Calendar />}/>
        <Route path="/admin_progress" element={<Admin_Progress />}/>
        <Route path="/admin_audit_trail" element={<Admin_AuditTrail />}/>
        <Route path="/admin/support-center" element={<AdminSupportCenter />} />

        {/* Parent */}
        <Route path="/parent_dashboard" element={<Parent_Dashboard/>}/>
        <Route path="/parent_grades" element={<Parent_Grades/>}/>
        <Route path="/parent_progress" element={<Parent_Progress/>}/>

      </Routes>
    </Router>
  );
}

export default App;