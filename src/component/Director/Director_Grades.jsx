import { useState } from "react";
import dropdown from "../../../src/assets/dropdown.png";
import Director_Navbar from "./Director_Navbar";
import ProfileModal from "../ProfileModal";
import profileicon from "../../../src/assets/profileicon (1).svg";
import { useNavigate } from "react-router-dom";

export default function Director_Grades() {
  const [isOpen, setIsOpen] = useState(false);
  const [im, setIm] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const navigate = useNavigate();

  const openModal = () => setModalIsOpen(true);
  const closeModal = () => setModalIsOpen(false);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Director_Navbar />

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
          <div className="relative">
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="flex items-center space-x-2 bg-gray-300 p-2 rounded-2xl hover:bg-gray-400 transition"
            >
              <img
                className="w-10 h-10 rounded-full bg-gray-600"
                src={im ? im : profileicon}
                alt="Profile"
              />
              <span className="text-sm md:text-base font-medium">James, Johnson</span>
              <img src={dropdown} alt="Dropdown" className="w-5 h-5" />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 z-50">
                <ProfileModal
                  open={isOpen}
                  onClose={() => navigate("/")}
                  avatarImg={im || profileicon}
                  name="James, Johnson"
                  email="doejohn@sjdfdef.edu.ph"
                  phone="09"
                  cropModalOpen={modalIsOpen}
                  openCropModal={openModal}
                  closeCropModal={closeModal}
                  onCrop={(i) => setIm(i)}
                  userType="director"
                />
              </div>
            )}
          </div>
        </div>

        {/* Grades Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 text-sm">
            <thead>
              <tr>
                <th colSpan="7" className="text-center p-3 border-b font-bold">
                  2024-2025 2nd Semester
                </th>
              </tr>
              <tr className="bg-gray-100 table-fixed border-collapse">
                <th className="p-2 border">Subject Code</th>
                <th className="p-2 border">Subject Description</th>
                <th className="p-2 border">Prelims</th>
                <th className="p-2 border">Midterms</th>
                <th className="p-2 border">Final</th>
                <th className="p-2 border">Finals Grade</th>
                <th className="p-2 border">Remark</th>
              </tr>
            </thead>
            <tbody>
              {/* 5 Empty rows */}
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td className="p-2 border h-12"></td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
