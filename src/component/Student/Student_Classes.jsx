import arrowRight from "../../../src/assets/arrowRight.png";
import dropdown from "../../../src/assets/dropdown.png";
import Student_Navbar from "./Student_Navbar";

export default function Student_Classes() {


  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Student_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr">
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
          <div className="flex items-center space-x-2 bg-gray-300 p-2 rounded-2xl hover:bg-gray-400 transition">
            <span className="bg-blue-900 w-10 h-10 rounded-full"></span>
            <span className="text-sm md:text-base font-medium">Doe, John</span>
            <img src={dropdown} alt="Dropdown" className="w-5 h-5" />
          </div>
        </div>

        {/* Class Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, idx) => (
            <div
              key={idx}
              className="bg-[#00418b] text-white p-4 rounded-2xl hover:bg-[#002b5c] relative"
            >
              <h4 className="text-lg font-bold mb-5">
                {["Intro to Computing", "Fundamentals of Programming", "Modern Math"][idx]}
              </h4>
              <img src={arrowRight} alt="Arrow" className="absolute top-6 right-6 w-6 h-6" />
              <p className="text-sm mt-2">0% Progress</p>
              <div className="w-full rounded-full bg-gray-300 mt-2">
                <div className="bg-blue-500 h-4 rounded-full w-[0%]"></div>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-semibold mt-10">Completed Classes</h3>
      </div>
    </div>

  );
}
