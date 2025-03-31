import { useNavigate } from "react-router-dom";
import dashboardIcon from "../../../src/assets/dashboard.png";
import classesIcon from "../../../src/assets/classes.png";
import activitiesIcon from "../../../src/assets/activities.png";
import chatsIcon from "../../../src/assets/chats.png";
import progressIcon from "../../../src/assets/progress.png";
import gradesIcon from "../../../src/assets/grades.png";
import calendarIcon from "../../../src/assets/calendar.png";
import compClassesIcon from "../../../src/assets/compClassesIcon.png";
import compAssignsIcon from "../../../src/assets/compAssignsIcon.png";
import dueAssignsIcon from "../../../src/assets/dueAssignsIcon.png";
import arrowRight from "../../../src/assets/arrowRight.png";
import dropdown from "../../../src/assets/dropdown.png";

export default function Student_Dashboard() {
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
          {[
            { handler: handleDashboard, icon: dashboardIcon, label: "Dashboard" },
            { handler: handleClasses, icon: classesIcon, label: "Classes" },
            { handler: handleActivities, icon: activitiesIcon, label: "Activities" },
            { handler: handleChats, icon: chatsIcon, label: "Chats" },
            { handler: handleProgress, icon: progressIcon, label: "Progress" },
            { handler: handleGrades, icon: gradesIcon, label: "Grades" },
            { handler: handleCalendar, icon: calendarIcon, label: "Calendar" },
          ].map((item, index) => (
            <button
              key={index}
              onClick={item.handler}
              className="flex items-center space-x-7 p-2 w-full rounded-lg transition-colors duration-300 hover:bg-[#1a237e]"
            >
              <img src={item.icon} alt={item.label} className="w-6 h-6" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="w-4/4 bg-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="mb-4">
            <h2 className="text-3xl font-bold leading-tight">Dashboard</h2>
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

        <h3 className="text-xl font-semibold mb-4">Overview</h3>
        <div className="flex justify-start space-x-4 mb-30">
          {[
            { icon: compClassesIcon, value: "0%", label: "Completed Classes", bg: "bg-gray-300", text: "text-black" },
            { icon: compAssignsIcon, value: "0%", label: "Completed Assignments", bg: "bg-[#00418b]", text: "text-white" },
            { icon: dueAssignsIcon, value: "You're good mah dude! :3 No due assignments", label: "", bg: "bg-gray-300", text: "text-black" },
          ].map((item, index) => (
            <div
              key={index}
              className={`${item.bg} rounded-2xl transition-transform transform hover:scale-105 h-35 w-130 flex items-center space-x-4 p-20 pl-8`}
            >
              <img src={item.icon} alt={item.label} className="w-14 h-18 mr-20" />
              <div>
                <p className={`text-2xl font-bold ${item.text}`}>{item.value}</p>
                <p className="text-xl font-bold">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-5xl font-bold mb-4">Recent Classes</h3>
        <div className="flex justify-start space-x-4 mb-8">
          {[
            "Introduction to Computing",
            "Fundamentals of Programming",
            "Modern Mathematics",
          ].map((className, index) => (
            <div
              key={index}
              className="bg-[#00418b] text-white p-4 rounded-2xl transition-transform transform hover:bg-[#002b5c] h-35 w-130 relative"
            >
              <h4 className="text-2xl font-bold mb-5">{className}</h4>
              <img src={arrowRight} alt="Arrow" className="absolute top-6 right-6 w-6 h-6" />
              <p className="text-lg mt-2">0% Progress</p>
              <div className="w-[15rem] rounded-full bg-gray-300 w-[100%]">
                <div className="bg-blue-500 h-full rounded-full w-[0%] min-h-[1rem]"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
