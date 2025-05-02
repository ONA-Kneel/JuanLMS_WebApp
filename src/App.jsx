// App.js
import { useEffect, useState } from 'react'
import axios from 'axios';
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'


// MODULES/PAGES
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './component/Login';
import Student_Dashboard from './component/Student/Student_Dashboard';
import Student_Classes from './component/Student/Student_Classes';
import Student_Activities from './component/Student/Student_Activities';
import Student_Chats from './component/Student/Student_Chats';
import Student_Progress from './component/Student/Student_Progress';
import Student_Grades from './component/Student/Student_Grades';
import Student_Calendar from './component/Student/Student_Calendar';
import Faculty_Dashboard from './component/Faculty/Faculty_Dashboard';
// import Faculty_Classes from './component/Faculty/Faculty_Classes';
// import Faculty_Activities from './component/Faculty/Faculty_Activities';
// import Faculty_Chats from './component/Faculty/Faculty_Chats';
// import Faculty_Progress from './component/Faculty/Faculty_Progress';
// import Faculty_Grades from './component/Faculty/Faculty_Grades';
// import Faculty_Calendar from './component/Faculty/Faculty_Calendar';
import Parent_Dashboard from './component/Parent/Parent_Dashboard';
import Admin_Dashboard from './component/Admin/Admin_Dashboard';




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
        <Route path="/" element={<Login />} />
        <Route path="/student_dashboard" element={<Student_Dashboard />} />
        <Route path="/student_classes" element={<Student_Classes />}/>
        <Route path="/student_activities" element={<Student_Activities />}/>
        <Route path="/student_chats" element={<Student_Chats />}/>
        <Route path="/student_progress" element={<Student_Progress />}/>
        <Route path="/student_grades" element={<Student_Grades />}/>
        <Route path="/student_calendar" element={<Student_Calendar />}/>
        <Route path="/faculty_dashboard" element={<Faculty_Dashboard/>}/>
        {/* <Route path="/faculty_classes" element={<Faculty_Classes />}/>
        <Route path="/faculty_activities" element={<Faculty_Activities />}/>
        <Route path="/faculty_chats" element={<Faculty_Chats />}/>
        <Route path="/faculty_progress" element={<Faculty_Progress />}/>
        <Route path="/faculty_grades" element={<Faculty_Grades />}/>
        <Route path="/faculty_calendar" element={<Faculty_Calendar />}/> */}
        <Route path="/parent_dashboard" element={<Parent_Dashboard/>}/>
        <Route path="/admin_Dashboard" element={<Admin_Dashboard/>}/>
      </Routes>
    </Router>
  );
}

export default App;
