import compClassesIcon from "../../../src/assets/compClassesIcon.png";
import compAssignsIcon from "../../../src/assets/compAssignsIcon.png";
import dueAssignsIcon from "../../../src/assets/dueAssignsIcon.png";
import arrowRight from "../../../src/assets/arrowRight.png";
import dropdown from "../../../src/assets/dropdown.png";
import Student_Navbar from "./Student_Navbar";

export default function Student_Dashboard() {
  return (
    <div className="flex min-h-screen overflow-hidden">
      <Student_Navbar />
      <div className="w-full bg-gray-100 p-6 md:p-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Dashboard</h2>
            <p className="text-lg md:text-xl">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-gray-300 p-2 md:p-3 rounded-2xl transition hover:bg-gray-400">
            <span className="bg-blue-900 w-10 h-10 md:w-12 md:h-12 rounded-full"></span>
            <span className="text-lg md:text-xl font-medium">Doe, John</span>
            <img src={dropdown} alt="Dropdown" className="w-6 h-6" />
          </div>
        </div>

        {/* Overview Section */}
        <h3 className="text-lg md:text-xl font-semibold mb-4">Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[
            { icon: compClassesIcon, value: "0%", label: "Completed Classes", bg: "bg-gray-300", text: "text-black" },
            { icon: compAssignsIcon, value: "0%", label: "Completed Assignments", bg: "bg-[#00418b]", text: "text-white" },
            { icon: dueAssignsIcon, value: "You're good mah dude! :3 No due assignments", label: "", bg: "bg-gray-300", text: "text-black" },
          ].map((item, index) => (
            <div key={index} className={`${item.bg} rounded-2xl p-6 flex items-center space-x-4 transition-transform transform hover:scale-105`}>
              <img src={item.icon} alt={item.label} className="w-12 h-12" />
              <div>
                <p className={`text-lg font-bold ${item.text}`}>{item.value}</p>
                <p className="text-sm md:text-base font-semibold">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Classes Section */}
        <h3 className="text-xl md:text-2xl font-bold mb-4">Recent Classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ">
          {["Intro to Computing", "Programming Fundamentals", "Modern Mathematics"].map((className, index) => (
            <div key={index} className="relative bg-[#00418b] text-white p-6 md:p-8 h-30 md:h-35 rounded-2xl transition-transform hover:bg-[#002b5c] flex flex-col justify-between">
              <h4 className="text-lg font-bold">{className}</h4>
              <p className="text-sm mt-1">0% Progress</p>
              <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
                <div className="bg-blue-500 h-full rounded-full w-[0%]"></div>
              </div>
              <img src={arrowRight} alt="Arrow" className="absolute top-6 right-6 w-5 h-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
