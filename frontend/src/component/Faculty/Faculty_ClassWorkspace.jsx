// Faculty_ClassWorkspace.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";
import ClassContent from "../ClassContent";

export default function Faculty_ClassWorkspace() {
    const { classId } = useParams();
    const [selected, setSelected] = useState("home");
    const navigate = useNavigate();

    const [classInfo, setClassInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        async function fetchClass() {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch("http://localhost:5000/classes", {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                });
                const data = await res.json();
                // Find the class by classID
                const found = data.find(cls => cls.classID === classId);
                setClassInfo(found);
            } catch {
                setClassInfo(null);
            } finally {
                setLoading(false);
            }
        }
        fetchClass();
    }, [classId]);

    const tabs = [
        { label: "Home Page", key: "home" },
        { label: "Classwork", key: "classwork" },
        { label: "Class Materials", key: "materials" },
        { label: "Members", key: "members" },
    ];

    

    function LessonItem({ lesson }) {
        const [expanded, setExpanded] = useState(false);

        return (
            <div
                className="p-4 rounded bg-blue-50 border border-blue-200 shadow-sm cursor-pointer hover:bg-blue-100 transition"
                onClick={() => setExpanded(!expanded)}
            >
                <h3 className="font-semibold text-blue-900">{lesson.title}</h3>
                {expanded && <p className="text-sm text-gray-700 mt-2">{lesson.description}</p>}
            </div>
        );
    }


    return (
        <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
            <Faculty_Navbar />

            <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/faculty_classes")}
                            className="p-2 rounded-full hover:bg-gray-300 transition text-blue-900"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div>
                            {loading ? (
                                <h2 className="text-2xl md:text-3xl font-bold">Loading...</h2>
                            ) : classInfo ? (
                                <>
                                    <h2 className="text-2xl md:text-3xl font-bold">{classInfo.className}</h2>
                                    <p className="text-base md:text-lg text-gray-600">{classInfo.classCode}</p>
                                </>
                            ) : (
                                <h2 className="text-2xl md:text-3xl font-bold text-red-600">Class not found</h2>
                            )}
                        </div>
                    </div>

                    <ProfileMenu />
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-300">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setSelected(tab.key)}
                            className={`px-4 py-2 rounded-t-lg text-sm md:text-base font-medium ${selected === tab.key
                                ? "bg-white text-blue-900 border border-gray-300 border-b-0"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <ClassContent selected={selected} isFaculty="true"/>
           

           
        </div>
        </div >
    );
}
