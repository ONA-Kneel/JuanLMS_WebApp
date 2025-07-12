import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ActivityTab from './ActivityTab';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import Student_Navbar from './Student/Student_Navbar';

export default function ActivityCreatePage() {
  const [role, setRole] = useState('');
  const [totalPoints, setTotalPoints] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setRole(localStorage.getItem('role'));
  }, []);

  if (role !== 'faculty') {
    return (
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Student_Navbar />
        <div className="flex-1 flex items-center justify-center bg-gray-100 p-10 md:ml-64">
          <div className="bg-white p-8 rounded shadow-xl text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="mb-4">Only faculty can create assignments or quizzes.</p>
            <button className="bg-blue-900 text-white px-4 py-2 rounded" onClick={() => navigate(-1)}>Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex items-center mb-6">
          <button
            className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 mr-4"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <h2 className="text-2xl md:text-3xl font-bold">Create Activity or Quiz</h2>
        </div>
        <div className="bg-white rounded-xl shadow-xl p-6 md:p-10">
          {/* <QuizTab alwaysRequireFileUploadForAssignment={true} /> */}
          <ActivityTab
            alwaysRequireFileUploadForAssignment={true}
            onPointsChange={(points) => setTotalPoints(points)}
          />
          <div className="text-right font-semibold text-lg text-gray-700 mt-4">
            Total Points: {totalPoints}
          </div>
        </div>
      </div>
    </div>
  );
} 