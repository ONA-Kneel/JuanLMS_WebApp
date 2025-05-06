// Student_ClassWorkspace.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react"; // <-- Import icon
import Student_Navbar from "./Student_Navbar";
import ProfileMenu from "../ProfileMenu";
import ClassContent from "../ClassContent";
import { useParams } from "react-router-dom";

export default function Student_ClassWorkspace() {
  const { classId } = useParams(); // grab id from route param
  const [selected, setSelected] = useState("home");
  const navigate = useNavigate();

  const classTitles = {
    "1": { title: "Introduction to Computing", section: "CCINCOM1 - Section 1" },
    "2": { title: "Fundamentals of Programming", section: "CCPROG1 - Section 2" },
    "3": { title: "Modern Mathematics", section: "CCMATH1 - Section 3" },
  };
  
  const classInfo = classTitles[classId] || classTitles[1]; // fallback

  const tabs = [
    { label: "Home Page", key: "home" },
    { label: "Classwork", key: "classwork" },
    { label: "Class Materials", key: "materials" },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Student_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Back Icon Button */}
            <button
              onClick={() => navigate("/student_classes")}
              className="p-2 rounded-full hover:bg-gray-300 transition text-blue-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-2xl md:text-3xl font-bold">{classInfo.title}</h2>
              <p className="text-base md:text-lg text-gray-600">{classInfo.section}</p>
            </div>
          </div>

          <ProfileMenu />
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-300">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelected(tab.key)}
              className={`px-4 py-2 rounded-t-lg text-sm md:text-base font-medium ${
                selected === tab.key
                  ? "bg-white text-blue-900 border border-gray-300 border-b-0"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <ClassContent selected={selected} />
      </div>
    </div>
  );
}
