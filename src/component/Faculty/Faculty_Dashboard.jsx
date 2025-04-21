import Faculty_Navbar from "./Faculty_Navbar";
import { useState } from "react";
import profileicon from "../../../src/assets/profileicon (1).svg";
import dropdown from "../../../src/assets/dropdown.png";
import ProfileModal from "../ProfileModal"; // reuse if you want it for faculty too
import { useNavigate } from "react-router-dom";
import compClassesIcon from "../../../src/assets/compClassesIcon.png";
import arrowRight from "../../../src/assets/arrowRight.png";

export default function Faculty_Dashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [im, setim] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      <Faculty_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Faculty Dashboard</h2>
            <p className="text-base md:text-lg">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <button
            onClick={() => setIsOpen(prev => !prev)}
            className="flex items-center space-x-2 bg-gray-300 p-2 rounded-2xl hover:bg-gray-400 transition z-40 relative"
          >
            <img className="w-10 h-10 rounded-full bg-gray-600" src={im ? im : profileicon} />
            <span className="text-sm md:text-base font-medium">James, Johnson</span>
            <img src={dropdown} alt="Dropdown" className="w-5 h-5" />
          </button>
        </div>

        {isOpen && (
          <ProfileModal
            open={isOpen}
            onClose={() => navigate("/")}
            avatarImg={im || profileicon}
            name="Prof. John"
            email="prof.john@example.com"
            phone="09"
            cropModalOpen={modalIsOpen}
            openCropModal={() => setModalIsOpen(true)}
            closeCropModal={() => setModalIsOpen(false)}
            onCrop={(i) => setim(i)}
          />
        )}

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
        <h3 className="text-lg md:text-4xl font-bold mb-3">Current Term Classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {["Intro to Computing", "Modern Mathematics"].map((className, index) => (
                    <div key={index} className="relative bg-[#00418b] text-white p-4 md:p-6 rounded-2xl hover:bg-[#002b5c] transition flex flex-col justify-between">
                      <h4 className="text-base md:text-lg font-semibold">{className}</h4>
                      <p className="text-sm mt-1">0% Progress</p>
                      <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
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
