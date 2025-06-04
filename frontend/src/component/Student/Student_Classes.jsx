// student classes
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import arrowRight from "../../assets/arrowRight.png";
import ProfileMenu from "../ProfileMenu";
import Student_Navbar from "./Student_Navbar";

export default function Student_Classes() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classProgress, setClassProgress] = useState({}); // { classID: percent }

  const currentUserID = localStorage.getItem("userID");
  const token = localStorage.getItem("token");

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch("http://localhost:5000/classes", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await res.json();
        const filtered = data.filter(cls => cls.members.includes(currentUserID));
        setClasses(filtered);

        // --- Fetch progress for each class ---
        const progressMap = {};
        for (const cls of filtered) {
          // Fetch lessons for this class
          const lessonRes = await fetch(`http://localhost:5000/lessons?classID=${cls.classID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const lessons = await lessonRes.json();
          let totalPages = 0;
          let totalRead = 0;
          for (const lesson of lessons) {
            if (lesson.files && lesson.files.length > 0) {
              for (const file of lesson.files) {
                // Fetch progress for this file
                try {
                  const progRes = await fetch(`http://localhost:5000/lessons/lesson-progress?lessonId=${lesson._id}&fileUrl=${encodeURIComponent(file.fileUrl)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  const prog = await progRes.json();
                  if (prog && prog.totalPages) {
                    totalPages += prog.totalPages;
                    totalRead += Math.min(prog.lastPage, prog.totalPages);
                  } else if (file.totalPages) {
                    // fallback if file has totalPages but no progress
                    totalPages += file.totalPages;
                  }
                } catch { /* ignore progress fetch errors */ }
              }
            }
          }
          let percent = 0;
          if (totalPages > 0) {
            percent = Math.round((totalRead / totalPages) * 100);
          }
          progressMap[cls.classID] = percent;
        }
        setClassProgress(progressMap);
      } catch (err) {
        console.error("Failed to fetch classes", err);
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, [currentUserID, token]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Student_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
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

        {/* Registered Classes */}
        <h3 className="text-2xl font-semibold mb-4">Registered Classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <p>Loading...</p>
          ) : classes.length === 0 ? (
            <p>No registered classes found.</p>
          ) : (
            classes.map(cls => (
              <div
                key={cls.classID}
                className="relative bg-[#00418b] text-white p-4 md:p-6 rounded-2xl hover:bg-[#002b5c] transition flex flex-col justify-between cursor-pointer"
                onClick={() => navigate(`/student_class/${cls.classID}`)}
              >
                <h4 className="text-base md:text-lg font-semibold">{cls.className}</h4>
                <p className="text-sm mt-1">{cls.classCode}</p>
                <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${classProgress[cls.classID] || 0}%` }}></div>
                </div>
                <span className="text-xs font-bold mt-1">{classProgress[cls.classID] || 0}%</span>
                <img src={arrowRight} alt="Arrow" className="absolute top-4 right-4 w-5 h-5" />
              </div>
            ))
          )}
        </div>

        <h3 className="text-2xl font-semibold mt-10">Completed Classes</h3>
      </div>
    </div>
  );
}
