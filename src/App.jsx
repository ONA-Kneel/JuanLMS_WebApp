// App.js
import { useEffect, useState } from 'react'
import axios from 'axios';
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'


// MODULES/PAGES
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
// For Logging in into different user and accounts
import Login from './component/Login';

// Students Access
import Student_Dashboard from './component/Student/Student_Dashboard';
import Student_Classes from './component/Student/Student_Classes';
import Student_Activities from './component/Student/Student_Activities';
import Student_Chats from './component/Student/Student_Chats';
import Student_Progress from './component/Student/Student_Progress';
import Student_Grades from './component/Student/Student_Grades';
import Student_Calendar from './component/Student/Student_Calendar';

// Faculty Access
import Faculty_Dashboard from './component/Faculty/Faculty_Dashboard';
import Faculty_Classes from './component/Faculty/Faculty_Classes';
import Faculty_Activities from './component/Faculty/Faculty_Activities';
import Faculty_Chats from './component/Faculty/Faculty_Chats';
import Faculty_Progress from './component/Faculty/Faculty_Progress';
import Faculty_Grades from './component/Faculty/Faculty_Grades';
import Faculty_Calendar from './component/Faculty/Faculty_Calendar';

// Director Access
import Director_Dashboard from './component/Director/Director_Dashboard';
import Director_Classes from './component/Director/Director_Classes';
import Director_Activities from './component/Director/Director_Activities';
import Director_Chats from './component/Director/Director_Chats';
import Director_Grades from './component/Director/Director_Grades';
import Director_Calendar from './component/Director/Director_Calendar';

// Admin Access
import Admin_Dashboard from './component/Admin/Admin_Dashboard';

// Parent Access
import Parent_Dashboard from './component/Parent/Parent_Dashboard';
import Parent_Classes from './component/Parent/Parent_Classes';
import Parent_Grades from './component/Parent/Parent_Grades';
import Parent_Progress from './component/Parent/Parent_Progress';


function App() {
  const [data, setData] = useState()

  useEffect(()=>{
    async function grabdata() {
      const response = await axios.get("http://localhost:5000/users")
      if (response.status ==- 200)
      {
        setData(response.data)
      }
      
    }

    grabdata()
  },[])

  return (
    <Router>
      <Routes>
        {/* Login into different User Accounts */}
        <Route path="/" element={<Login />} />
        {/* Students */}
        <Route path="/student_dashboard" element={<Student_Dashboard />} />
        <Route path="/student_classes" element={<Student_Classes />}/>
        <Route path="/student_activities" element={<Student_Activities />}/>
        <Route path="/student_chats" element={<Student_Chats />}/>
        <Route path="/student_progress" element={<Student_Progress />}/>
        <Route path="/student_grades" element={<Student_Grades />}/>
        <Route path="/student_calendar" element={<Student_Calendar />}/>
        
        {/* Faculty */}
        <Route path="/faculty_dashboard" element={<Faculty_Dashboard/>}/>
        <Route path="/faculty_classes" element={<Faculty_Classes />}/>
        <Route path="/faculty_activities" element={<Faculty_Activities />}/>
        <Route path="/faculty_chats" element={<Faculty_Chats />}/>
        <Route path="/faculty_progress" element={<Faculty_Progress />}/>
        <Route path="/faculty_grades" element={<Faculty_Grades />}/>
        <Route path="/faculty_calendar" element={<Faculty_Calendar />}/>

        {/* Director */}
        <Route path="/director_dashboard" element={<Director_Dashboard/>}/>
        <Route path="/director_classes" element={<Director_Classes />}/>
        <Route path="/director_activities" element={<Director_Activities />}/>
        <Route path="/director_chats" element={<Director_Chats />}/>
        <Route path="/director_grades" element={<Director_Grades />}/>
        <Route path="/director_calendar" element={<Director_Calendar />}/>


        {/* Admin */}
        <Route path="/admin_Dashboard" element={<Admin_Dashboard/>}/>

        {/* Parent */}
        <Route path="/parent_dashboard" element={<Parent_Dashboard/>}/>
        <Route path="/parent_grades" element={<Parent_Grades/>}/>
        <Route path="/parent_classes" element={<Parent_Classes/>}/>
        <Route path="/parent_progress" element={<Parent_Progress/>}/>
      </Routes>
    </Router>
  );
}

export default App;