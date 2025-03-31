import { useNavigate } from "react-router-dom";
import dashboardIcon from "../../../src/assets/dashboard.png";
import classesIcon from "../../../src/assets/classes.png";
import activitiesIcon from "../../../src/assets/activities.png";
import chatsIcon from "../../../src/assets/chats.png";
import progressIcon from "../../../src/assets/progress.png";
import gradesIcon from "../../../src/assets/grades.png";
import calendarIcon from "../../../src/assets/calendar.png";
import arrowRight from "../../../src/assets/arrowRight.png";
import dropdown from "../../../src/assets/dropdown.png";

export default function Student_Classes() {
  const navigate = useNavigate();

  const handleDashboard = () => navigate("/student_dashboard");
  const handleClasses = () => navigate("/student_classes");
  const handleActivities = () => navigate("/student_activities");
  const handleChats = () => navigate("/student_chats");
  const handleProgress = () => navigate("/student_progress");
  const handleGrades = () => navigate("/student_grades");
  const handleCalendar = () => navigate("/student_calendar");

  return (
    <div className="flex min-h-screen">
      <div className="w-1/7 bg-[#010a51] text-white p-6 flex flex-col justify-center">
        <h2 className="text-3xl mb-12 text-center">
          <span className="font-bold">JUAN</span>
          <span className="font-bold italic">LMS</span>
        </h2>
        <nav className="space-y-10 text-2xl flex flex-col items-center h-full">
          <button
            onClick={handleDashboard}
            className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]"
          >
            <img src={dashboardIcon} alt="Dashboard" className="w-6 h-6" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={handleClasses}
            className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]"
          >
            <img src={classesIcon} alt="Classes" className="w-6 h-6" />
            <span>Classes</span>
          </button>
          <button
            onClick={handleActivities}
            className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]"
          >
            <img src={activitiesIcon} alt="Activities" className="w-6 h-6" />
            <span>Activities</span>
          </button>
          <button
            onClick={handleChats}
            className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]"
          >
            <img src={chatsIcon} alt="Chats" className="w-6 h-6" />
            <span>Chats</span>
          </button>
          <button
            onClick={handleProgress}
            className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]"
          >
            <img src={progressIcon} alt="Progress" className="w-6 h-6" />
            <span>Progress</span>
          </button>
          <button
            onClick={handleGrades}
            className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]"
          >
            <img src={gradesIcon} alt="Grades" className="w-6 h-6" />
            <span>Grades</span>
          </button>
          <button
            onClick={handleCalendar}
            className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]"
          >
            <img src={calendarIcon} alt="Calendar" className="w-6 h-6 mt-1" />
            <span>Calendar</span>
          </button>
        </nav>
      </div>

      <div className="w-4/4 bg-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="mb-4">
            <h2 className="text-3xl font-bold leading-tight">Classes</h2>
            <p className="text-xl">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center space-x-4 bg-gray-300 p-3 rounded-2xl transition-colors duration-300 hover:bg-gray-400 w-55">
            <span className="bg-blue-900 w-12 h-12 rounded-full"></span>
            <span className="text-xl font-medium">Doe, John</span>
            <img src={dropdown} alt="Arrow" className="absolute w-10 h-9 mt-2 ml-40" />
          </div>
        </div>

        <div className="flex justify-start space-x-4 mb-8">
          <div className="bg-[#00418b] text-white p-4 rounded-2xl transition-transform transform hover:bg-[#002b5c] h-35 w-130 relative">
            <h4 className="text-2xl font-bold mb-5">Introduction to Computing</h4>
            <img src={arrowRight} alt="Arrow" className="absolute top-6 right-6 w-6 h-6" />
            <p className="text-lg mt-2">0% Progress</p>
            <div className="w-[15rem] rounded-full bg-gray-300 w-[100%]">
              <div className="bg-blue-500 h-full rounded-full w-[0%] min-h-[1rem]"></div>
            </div>
          </div>

          <div className="bg-[#00418b] text-white p-4 rounded-2xl transition-transform transform hover:bg-[#002b5c] h-35 w-130 relative">
            <h4 className="text-2xl font-bold mb-5">Fundamentals of Programming</h4>
            <img src={arrowRight} alt="Arrow" className="absolute top-6 right-6 w-6 h-6" />
            <p className="text-lg mt-2">0% Progress</p>
            <div className="w-[15rem] rounded-full bg-gray-300 w-[100%]">
              <div className="bg-blue-500 h-full rounded-full w-[0%] min-h-[1rem]"></div>
            </div>
          </div>

          <div className="bg-[#00418b] text-white p-4 rounded-2xl transition-transform transform hover:bg-[#002b5c] h-35 w-130 relative">
            <h4 className="text-2xl font-bold mb-5">Modern Mathematics</h4>
            <img src={arrowRight} alt="Arrow" className="absolute top-6 right-6 w-6 h-6" />
            <p className="text-lg mt-2">0% Progress</p>
            <div className="w-[15rem] rounded-full bg-gray-300 w-[100%]">
              <div className="bg-blue-500 h-full rounded-full w-[0%] min-h-[1rem]"></div>
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-semibold mt-70">Completed Classes</h3>
      </div>
    </div>
  );
}
