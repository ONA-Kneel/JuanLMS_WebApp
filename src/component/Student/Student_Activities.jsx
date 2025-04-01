
import { useState } from "react";
import dropdown from "../../../src/assets/dropdown.png";
import Student_Navbar from "./Student_Navbar";

export default function Student_Activities() {

  const [activeTab, setActiveTab] = useState("upcoming");

  const tabs = [
    { id: "upcoming", label: "Upcoming" },
    { id: "past-due", label: "Past Due" },
    { id: "completed", label: "Completed" },
  ];


  return (
    <div className="flex min-h-screen">
      <Student_Navbar/>

      <div className="w-4/4 bg-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="mb-4">
            <h2 className="text-3xl font-bold leading-tight">Activities</h2>
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

        <ul className="flex flex-wrap border-b border-gray-700 text-2xl text-center font-medium text-gray-400">
          {tabs.map((tab) => (
            <li
              key={tab.id}
              className={`me-2 cursor-pointer p-4 ${activeTab === tab.id ? "text-black border-b-4 border-blue-500" : "hover:text-gray-600"
                }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {activeTab === "upcoming" && (
            <div>
              <h3 className="text-black text-2xl font-bold mb-4 ml-2"> December 32</h3>
              <div className="bg-[#00418B] pt-4 w-406 h-35 rounded-xl shadow-lg relative mb-4 transition-colors duration-300 hover:bg-[#002d5a]">
                <div className="absolute top-3 right-3 text-white px-3 py-1 font-bold">20 points</div>
                <h3 className="text-white text-2xl font-semibold ml-7">Activity 1</h3>
                <p className="text-white mb-5 ml-7">Due at 11:59 PM</p>
                <p className="text-lg text-white font-medium ml-7">Introduction to Computing</p>
              </div>
            </div>
          )}
          {activeTab === "past-due" && (
            <div>
              <h3 className="text-2xl font-semibold">Past Due</h3>
              <p className="mt-4">No activities here.</p>
            </div>
          )}
          {activeTab === "completed" && (
            <div>
              <h3 className="text-2xl font-semibold">Completed</h3>
              <p className="mt-4">No completed activities yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
