import { useState } from "react";
import { useParams } from "react-router-dom";

export default function ClassContent({ selected }) {
  const { classId } = useParams();
  const [activeLesson, setActiveLesson] = useState(null);

  const dummyData = {
    1: {
      name: "Introduction to Computing",
      lessons: [
        { id: 1, title: "What is Computing?", content: "This lesson introduces the concept of computing, data, and information." },
        { id: 2, title: "Evolution of Computers", content: "Learn the historical milestones of computers from mechanical to modern era." },
        { id: 3, title: "Components of a Computer System", content: "Understand hardware, software, and peripheral components." },
      ],
      posts: [
        { title: "Essay Submission", content: "Don't forget to submit your essay about the History of Computing by Friday." },
        { title: "Quiz #1 Announcement", content: "Quiz #1 will cover Lessons 1 to 3. Study well!" },
      ],
    },
    2: {
      name: "Fundamentals of Programming",
      lessons: [
        { id: 1, title: "Introduction to Programming Languages", content: "Overview of high-level vs low-level languages, compilers, and interpreters." },
        { id: 2, title: "Variables & Data Types", content: "Learn about integer, float, string, and other data types in programming." },
        { id: 3, title: "Conditional Statements", content: "Understand how if-else and switch-case structures work." },
      ],
      posts: [
        { title: "Coding Activity Due", content: "Coding activity on variables is due this Friday. Submit via LMS." },
        { title: "Midterm Announcement", content: "Midterm will cover Lessons 1 to 5. Practice coding exercises!" },
      ],
    },
    3: {
      name: "Modern Mathematics",
      lessons: [
        { id: 1, title: "Logic & Set Theory", content: "Introduction to logic gates, truth tables, and basic set operations." },
        { id: 2, title: "Functions & Relations", content: "Learn about mappings, domain, range, and types of functions." },
        { id: 3, title: "Probability & Statistics", content: "Understand basic probability concepts and descriptive statistics." },
      ],
      posts: [
        { title: "Assignment #2", content: "Solve 10 probability problems and submit by next week." },
        { title: "Online Quiz Reminder", content: "Online quiz on Sets will be open this weekend. Don't miss it!" },
      ],
    },
  };

  const classContent = dummyData[classId] || dummyData[1]; // fallback if no id

  const goBack = () => setActiveLesson(null);

  return (
    <div className="bg-white rounded-2xl shadow p-6 md:p-8 h-full overflow-auto">
      {selected === "home" && (
        <>
          <h2 className="text-2xl font-bold mb-4">Home Page</h2>

          {classContent.posts.map((post, index) => (
            <div key={index} className="mb-6">
              <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
              <p className="text-sm text-gray-700 mb-2">{post.content}</p>
              <button className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 transition text-sm">
                View Details
              </button>
            </div>
          ))}
        </>
      )}

      {selected === "classwork" && (
        <p className="text-gray-700">Classwork content here for {classContent.name}...</p>
      )}

      {selected === "materials" && (
        <>
          {!activeLesson && (
            <>
              <h2 className="text-2xl font-bold mb-4">Class Materials</h2>
              <p className="text-gray-700 mb-6">Select a lesson to view its content.</p>

              <div className="space-y-4">
                {classContent.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setActiveLesson(lesson)}
                    className="w-full text-left py-4 px-6 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium transition shadow-sm border border-blue-200"
                  >
                    {lesson.title}
                  </button>
                ))}
              </div>
            </>
          )}

          {activeLesson && (
            <>
              <button
                onClick={goBack}
                className="mb-4 inline-flex items-center text-sm text-blue-700 hover:underline"
              >
                ← Back to Class Materials
              </button>

              <h2 className="text-2xl font-bold mb-4">{activeLesson.title}</h2>
              <p className="text-sm text-gray-700 mb-6">{activeLesson.content}</p>

              <div className="flex items-center gap-4 mt-6">
                <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                  <div className="bg-blue-500 h-full w-[30%]"></div>
                </div>
                <button className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 transition text-sm">
                  Next
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
