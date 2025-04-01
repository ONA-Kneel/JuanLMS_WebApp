import dropdown from "../../../src/assets/dropdown.png";
import Student_Navbar from "./Student_Navbar";

export default function Student_Progress() {
  
  
  return (
      <div>
        <div className="flex min-h-screen">
              <Student_Navbar/>
        
              <div className="w-4/4 bg-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="mb-4">
                    <h2 className="text-3xl font-bold leading-tight">Progress</h2>
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
          </div>
      </div>
    </div>
    )
}
