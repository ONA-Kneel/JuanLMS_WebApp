import ProfileMenu from "../ProfileMenu";
import Admin_Navbar from "./Admin_Navbar";

export default function Admin_Progress() {
  
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
    <Admin_Navbar />

    <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Progress</h2>
          <p className="text-base md:text-lg">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <ProfileMenu/>
      </div>
      </div>
    </div>
    )
}
