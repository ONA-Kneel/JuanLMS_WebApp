import Director_Navbar from "./Director_Navbar";
// import { useState } from "react";

import ProfileModal from "../ProfileModal";
// import { useNavigate } from "react-router-dom";
import compClassesIcon from "../../assets/compClassesIcon.png";
// import arrowRight from "../../assets/arrowRight.png";
import ProfileMenu from "../ProfileMenu";

export default function Director_Dashboard() {
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      <Director_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Director Dashboard</h2>
            <p className="text-base md:text-lg"> Academic Year and Term here | 
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <ProfileMenu/>
        </div>


        <h3 className="text-lg md:text-xl font-semibold mb-3">Overview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {[
                { icon: compClassesIcon, value: "0%", label: "Class Completion", bg: "bg-gray-300", text: "text-black" },
                { value: "Urgent Meeting", label: "https://www./......", bg: "bg-[#00418b]", text: "text-white" }
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

      </div>
    </div>
  );
}
