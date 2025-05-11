// Faculty_Classes.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import arrowRight from "../../assets/arrowRight.png";
import ProfileMenu from "../ProfileMenu";
import Faculty_Navbar from "./Faculty_Navbar";
import addClass from "../../assets/addClass.png";
import createEvent from "../../assets/createEvent.png";

export default function Faculty_Classes() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentFacultyID = localStorage.getItem("userID");

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch("http://localhost:5000/classes");
        const data = await res.json();
        const filtered = data.filter(cls => cls.facultyID === currentFacultyID);
        setClasses(filtered);
      } catch (err) {
        console.error("Failed to fetch classes", err);
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, [currentFacultyID]);

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
        {/* Create Class Button */}
        <div className="flex flex-col items-start mb-8">
          <button
            className="bg-[#00418b] hover:bg-[#002b5c] ml-5 rounded-full w-20 h-20 flex items-center justify-center mb-2 shadow-lg"
            onClick={() => navigate('/faculty_createclass')}
          >
            <img src={createEvent} alt="Create Class" className="w-12 h-12" />
          </button>
          <span className="font-bold text-xl text-[#222]">Create Class</span>
        </div>

        {/* Faculty's Classes */}
        <h3 className="text-2xl font-semibold mb-4">Your Classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <p>Loading...</p>
          ) : classes.length === 0 ? (
            <p>No classes found.</p>
          ) : (
            classes.map(cls => (
              <div
                key={cls.classID}
                className="relative bg-[#00418b] text-white p-4 md:p-6 rounded-2xl hover:bg-[#002b5c] transition flex flex-col justify-between"
              >
                <h4 className="text-base md:text-lg font-semibold">{cls.className}</h4>
                <p className="text-sm mt-1">0% progress</p>
                <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
                  <div className="bg-blue-500 h-full rounded-full w-[0%]"></div>
                </div>
                <img src={arrowRight} alt="Arrow" className="absolute top-4 right-4 w-5 h-5" />
              </div>
            ))
          )}
        </div>

        {/* <h3 className="text-2xl font-semibold mt-10">Completed Classes</h3> */}
      </div>
    </div>
  );
}
