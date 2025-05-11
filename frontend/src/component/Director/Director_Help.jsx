import ProfileMenu from "../ProfileMenu";
import Director_Navbar from "./Director_Navbar";

export default function Director_Help(){
    
    return(
        <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Director_Navbar/>

        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div>
                    <h2 classname="text-2xl md:text-3xl font-bold">Help Center</h2>
                    <p classname="text-base md:text-lg">
                        {new Date().toLocaleDateString("en-US",{
                            weekday:"long",
                            year:"numeric",
                            month:"long",
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