// Faculty_Classes.jsx
import { useNavigate } from "react-router-dom";
import arrowRight from "../../../src/assets/arrowRight.png";
import ProfileMenu from "../ProfileMenu";
import Faculty_Navbar from "./Faculty_Navbar";
import addClass from "../../../src/assets/addClass.png";

export default function Faculty_Classes() {
  const navigate = useNavigate();

  const classList = [
    { id: 1, title: "Introduction to Computing", section: "CCINCOM1 - Section 1" },
    { id: 2, title: "Fundamentals of Programming", section: "CCPROG1 - Section 2" },
    { id: 3, title: "Modern Mathematics", section: "CCMATH1 - Section 3" },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Classes</h2>
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
        <h3 className="text-2xl font-bold mt-10">Create Classes</h3>

        {/* Class Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {classList.map((cls) => (
            <button
              key={cls.id}
              onClick={() => navigate(`/faculty_class/${cls.id}`)}
              className="bg-[#00418b] text-white p-4 rounded-2xl hover:bg-[#002b5c] relative text-left"
            >
              <h4 className="text-lg font-bold mb-5">{cls.title}</h4>
              <img src={arrowRight} alt="Arrow" className="absolute top-6 right-6 w-6 h-6" />
              <p className="text-sm mt-2">0% Progress</p>
              <div className="w-full rounded-full bg-gray-300 mt-2">
                <div className="bg-blue-500 h-4 rounded-full w-[0%]"></div>
              </div>
            </button>
          ))}
        </div>

        <h3 className="text-2xl font-semibold mt-10">Completed Classes</h3>
      </div>
    </div>
  );
}
