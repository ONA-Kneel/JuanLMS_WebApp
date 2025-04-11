import dropdown from "../../../src/assets/dropdown.png";
import Student_Navbar from "./Student_Navbar";

export default function Student_Grades() {


  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Student_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Grades</h2>
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
      </div>
    </div>
  )
}
