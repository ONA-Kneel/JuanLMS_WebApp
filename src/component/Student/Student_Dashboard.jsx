import compClassesIcon from "../../../src/assets/compClassesIcon.png";
import compAssignsIcon from "../../../src/assets/compAssignsIcon.png";
import dueAssignsIcon from "../../../src/assets/dueAssignsIcon.png";
import arrowRight from "../../../src/assets/arrowRight.png";

import Student_Navbar from "./Student_Navbar";
import ProfileModal from "../ProfileModal";
import Login from "../Login";
import ProfileMenu from "../ProfileMenu";
import { Link } from 'react-router-dom';

export default function Student_Dashboard() {
  // Define the classTitles object
  const classTitles = {
    "1": { title: "Introduction to Computing", section: "CCINCOM1 - Section 1" },
    "2": { title: "Fundamentals of Programming", section: "CCPROG1 - Section 2" },
    "3": { title: "Modern Mathematics", section: "CCMATH1 - Section 3" },
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      <Student_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto  font-poppinsr md:ml-64">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Student Dashboard</h2>
            <p className="text-base md:text-lg">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <ProfileMenu />
        </div>

        {/* Overview Section */}
        <h3 className="text-lg md:text-xl font-semibold mb-3">Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[
            { icon: compClassesIcon, value: "78%", label: "Completed Classes", bg: "bg-gray-300", text: "text-black" },
            { icon: compAssignsIcon, value: "0%", label: "Completed Assignments", bg: "bg-[#00418b]", text: "text-white" },
            { icon: dueAssignsIcon, value: "You're good mah dude! :3 No due assignments", label: "", bg: "bg-gray-300", text: "text-black" },
          ].map((item, index) => (
            <div key={index} className={`${item.bg} rounded-2xl p-4 md:p-6 flex items-start space-x-4 hover:scale-105 transform transition`}>
              <img src={item.icon} alt={item.label} className="w-10 h-10" />
              <div>
                <p className={`text-base font-bold ${item.text}`}>{item.value}</p>
                <p className={`text-sm ${item.text}`}>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Classes Section */}
        <h3 className="text-lg md:text-4xl font-bold mb-3">Recent Classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {["1", "2", "3"].map((classId, index) => {
            const className = classTitles[classId].title; // Dynamically use class title
            return (
              <Link to={`/student_class/${classId}`} key={index} className="relative bg-[#00418b] text-white p-4 md:p-6 rounded-2xl hover:bg-[#002b5c] transition flex flex-col justify-between">
                <h4 className="text-base md:text-lg font-semibold">{className}</h4>
                <p className="text-sm mt-1">0% Progress</p>
                <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
                  <div className="bg-blue-500 h-full rounded-full w-[0%]"></div>
                </div>
                <img src={arrowRight} alt="Arrow" className="absolute top-4 right-4 w-5 h-5" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
