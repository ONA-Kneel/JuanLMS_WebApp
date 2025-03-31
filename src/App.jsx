// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// App.js
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './component/Login';
import Student_Dashboard from './component/Student/Student_Dashboard';
import Student_Classes from './component/Student/Student_Classes';
import Student_Activities from './component/Student/Student_Activities';
import Student_Chats from './component/Student/Student_Chats';
import Student_Progress from './component/Student/Student_Progress';
import Student_Grades from './component/Student/Student_Grades';
import Student_Calendar from './component/Student/Student_Calendar';

function App() {
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
      </Routes>
    </Router>
  );
}

export default App;
