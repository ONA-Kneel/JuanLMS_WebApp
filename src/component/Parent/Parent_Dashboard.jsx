import Parent_Navbar from "./Parent_Navbar";
// import { useState } from "react";
import ProfileModal from "../ProfileModal"; // optional reuse
// import { useNavigate } from "react-router-dom";
import arrowRight from "../../../src/assets/arrowRight.png";
import ProfileMenu from "../ProfileMenu";

export default function Parent_Dashboard() {
 

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      <Parent_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Parent Dashboard</h2>
            <p className="text-base md:text-lg">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {["Semester 1"].map((className, index) => (
            <div key={index} className="relative bg-gray-300 text-white p-4 md:p-6 rounded-2xl hover:bg-gray-400 transition flex flex-col justify-between">
              <h4 className="text-base text-[#00418B] md:text-lg font-semibold">{className}</h4>
              <p className="text-sm text-[#00418B] mt-1">0% Progress - 17 weeks remaining </p>
              <div className="w-full bg-white rounded-full h-2 mt-2">
                <div className="bg-blue-500 h-full rounded-full w-[0%]"></div>
              </div>
              <img src={arrowRight} alt="Arrow" className="absolute top-4 right-4 w-5 h-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
