// Faculty_ClassWorkspace.jsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";
import ClassContent from "../ClassContent";

export default function Faculty_ClassWorkspace() {
    const { classId } = useParams();
    const [selected, setSelected] = useState("home");
    const navigate = useNavigate();

    const classTitles = {
        "1": { title: "Introduction to Computing", section: "CCINCOM1 - Section 1" },
        "2": { title: "Fundamentals of Programming", section: "CCPROG1 - Section 2" },
        "3": { title: "Modern Mathematics", section: "CCMATH1 - Section 3" },
    };

    const classInfo = classTitles[classId] || classTitles[1];

    const tabs = [
        { label: "Home Page", key: "home" },
        { label: "Classwork", key: "classwork" },
        { label: "Class Materials", key: "materials" },
    ];

    // // State for content
    // const [announcements, setAnnouncements] = useState([]);
    // const [assignments, setAssignments] = useState([]);
    // const [lessons, setLessons] = useState([]);

    // // Toggle states for showing forms
    // const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
    // const [showAssignmentForm, setShowAssignmentForm] = useState(false);
    // const [showLessonForm, setShowLessonForm] = useState(false);

    // // Handlers
    // const handleAddAnnouncement = (e) => {
    //     e.preventDefault();
    //     const form = e.target;
    //     const newAnnouncement = {
    //         id: announcements.length + 1,
    //         title: form.title.value,
    //         content: form.content.value,
    //     };
    //     setAnnouncements([...announcements, newAnnouncement]);
    //     setShowAnnouncementForm(false);
    //     form.reset();
    // };

    // const handleAddAssignment = (e) => {
    //     e.preventDefault();
    //     const form = e.target;
    //     const newAssignment = {
    //         id: assignments.length + 1,
    //         title: form.title.value,
    //         instructions: form.instructions.value,
    //     };
    //     setAssignments([...assignments, newAssignment]);
    //     setShowAssignmentForm(false);
    //     form.reset();
    // };

    // const handleAddLesson = (e) => {
    //     e.preventDefault();
    //     const form = e.target;
    //     const newLesson = {
    //         id: lessons.length + 1,
    //         title: form.title.value,
    //         description: form.description.value,
    //     };
    //     setLessons([...lessons, newLesson]);
    //     setShowLessonForm(false);
    //     form.reset();
    // };

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
                            <h2 className="text-2xl md:text-3xl font-bold">{classInfo.title}</h2>
                            <p className="text-base md:text-lg text-gray-600">{classInfo.section}</p>
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
           

            {/* Content
                <div className="bg-white rounded-2xl shadow p-6 md:p-8">
                    {selected === "home" && (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold">Manage Announcements</h2>
                                <button
                                    onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                                    className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm"
                                >
                                    {showAnnouncementForm ? "Cancel" : "+ Create New Announcement"}
                                </button>
                            </div>

                            {showAnnouncementForm && (
                                <form onSubmit={handleAddAnnouncement} className="mb-6 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <div>
                                        <label className="block text-sm font-medium text-blue-900 mb-1">Title</label>
                                        <input name="title" required className="w-full border rounded px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-blue-900 mb-1">Content</label>
                                        <textarea name="content" required className="w-full border rounded px-3 py-2 text-sm" rows={3} />
                                    </div>
                                    <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 text-sm">
                                        Save Announcement
                                    </button>
                                </form>
                            )}

                            <div className="space-y-4">
                                {announcements.length > 0 ? (
                                    announcements.map((item) => (
                                        <div key={item.id} className="p-4 rounded bg-blue-50 border border-blue-200 shadow-sm">
                                            <h3 className="font-semibold text-blue-900">{item.title}</h3>
                                            <p className="text-sm text-gray-700">{item.content}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-700">No announcements yet.</p>
                                )}
                            </div>
                        </>
                    )}

                    {selected === "classwork" && (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold">Manage Assignments</h2>
                                <button
                                    onClick={() => setShowAssignmentForm(!showAssignmentForm)}
                                    className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm"
                                >
                                    {showAssignmentForm ? "Cancel" : "+ Create New Assignment"}
                                </button>
                            </div>

                            {showAssignmentForm && (
                                <form onSubmit={handleAddAssignment} className="mb-6 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <div>
                                        <label className="block text-sm font-medium text-blue-900 mb-1">Title</label>
                                        <input name="title" required className="w-full border rounded px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-blue-900 mb-1">Instructions</label>
                                        <textarea name="instructions" required className="w-full border rounded px-3 py-2 text-sm" rows={3} />
                                    </div>
                                    <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 text-sm">
                                        Save Assignment
                                    </button>
                                </form>
                            )}

                            <div className="space-y-4">
                                {assignments.length > 0 ? (
                                    assignments.map((item) => (
                                        <div key={item.id} className="p-4 rounded bg-blue-50 border border-blue-200 shadow-sm">
                                            <h3 className="font-semibold text-blue-900">{item.title}</h3>
                                            <p className="text-sm text-gray-700">{item.instructions}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-700">No assignments yet.</p>
                                )}
                            </div>
                        </>
                    )}

                    {selected === "materials" && (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold">Manage Lessons</h2>
                                <button
                                    onClick={() => setShowLessonForm(!showLessonForm)}
                                    className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm"
                                >
                                    {showLessonForm ? "Cancel" : "+ Create New Lesson"}
                                </button>
                            </div>

                            {showLessonForm && (
                                <form
                                    onSubmit={handleAddLesson}
                                    className="mb-6 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200"
                                >
                                    <div>
                                        <label className="block text-sm font-medium text-blue-900 mb-1">Title</label>
                                        <input
                                            name="title"
                                            required
                                            className="w-full border rounded px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-blue-900 mb-1">Description / Content</label>
                                        <textarea
                                            name="description"
                                            required
                                            className="w-full border rounded px-3 py-2 text-sm"
                                            rows={4}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 text-sm"
                                    >
                                        Save Lesson
                                    </button>
                                </form>
                            )}

                            <div className="space-y-4">
                                {lessons.length > 0 ? (
                                    lessons.map((item) => (
                                        <LessonItem key={item.id} lesson={item} />
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-700">No lessons yet.</p>
                                )}
                            </div>
                        </>
                    )}

                </div> */}
        </div>
        </div >
    );
}
