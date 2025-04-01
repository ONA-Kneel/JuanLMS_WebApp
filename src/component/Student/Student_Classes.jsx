import arrowRight from "../../../src/assets/arrowRight.png";
import dropdown from "../../../src/assets/dropdown.png";
import Student_Navbar from "./Student_Navbar";

export default function Student_Classes() {
  

  return (
    <div className="flex min-h-screen">
      

      <Student_Navbar/>

      <div className="w-4/4 bg-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="mb-4">
            <h2 className="text-3xl font-bold leading-tight">Classes</h2>
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

        <div className="flex justify-start space-x-4 mb-8">
          <div className="bg-[#00418b] text-white p-4 rounded-2xl transition-transform transform hover:bg-[#002b5c] h-35 w-130 relative">
            <h4 className="text-2xl font-bold mb-5">Introduction to Computing</h4>
            <img src={arrowRight} alt="Arrow" className="absolute top-6 right-6 w-6 h-6" />
            <p className="text-lg mt-2">0% Progress</p>
            <div className="w-[15rem] rounded-full bg-gray-300 w-[100%]">
              <div className="bg-blue-500 h-full rounded-full w-[0%] min-h-[1rem]"></div>
            </div>
          </div>

          <div className="bg-[#00418b] text-white p-4 rounded-2xl transition-transform transform hover:bg-[#002b5c] h-35 w-130 relative">
            <h4 className="text-2xl font-bold mb-5">Fundamentals of Programming</h4>
            <img src={arrowRight} alt="Arrow" className="absolute top-6 right-6 w-6 h-6" />
            <p className="text-lg mt-2">0% Progress</p>
            <div className="w-[15rem] rounded-full bg-gray-300 w-[100%]">
              <div className="bg-blue-500 h-full rounded-full w-[0%] min-h-[1rem]"></div>
            </div>
          </div>

          <div className="bg-[#00418b] text-white p-4 rounded-2xl transition-transform transform hover:bg-[#002b5c] h-35 w-130 relative">
            <h4 className="text-2xl font-bold mb-5">Modern Mathematics</h4>
            <img src={arrowRight} alt="Arrow" className="absolute top-6 right-6 w-6 h-6" />
            <p className="text-lg mt-2">0% Progress</p>
            <div className="w-[15rem] rounded-full bg-gray-300 w-[100%]">
              <div className="bg-blue-500 h-full rounded-full w-[0%] min-h-[1rem]"></div>
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-semibold mt-70">Completed Classes</h3>
      </div>
    </div>
  );
}
