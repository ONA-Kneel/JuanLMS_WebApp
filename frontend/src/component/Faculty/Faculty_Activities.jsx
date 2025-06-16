import { useState, useEffect } from "react";

import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";

export default function Faculty_Activities() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [createForm, setCreateForm] = useState({
    title: '',
    instructions: '',
    type: 'assignment',
    dueDate: '',
    points: '',
    fileUploadRequired: false,
    allowedFileTypes: '',
    classIDs: [],
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState('');

  const tabs = [
    { id: "upcoming", label: "Upcoming" },
    { id: "past-due", label: "Past Due" },
    { id: "completed", label: "Completed" },
  ];

  useEffect(() => {
    if (showCreateModal) {
      // Fetch classes for this faculty
      const token = localStorage.getItem('token');
      fetch('https://juanlms-webapp-server.onrender.com/classes/my-classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setClasses(Array.isArray(data) ? data : []));
    }
  }, [showCreateModal]);

  const handleCreateChange = e => {
    const { name, value, type, checked } = e.target;
    setCreateForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  const handleClassSelect = e => {
    const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setCreateForm(prev => ({ ...prev, classIDs: options }));
  };
  const handleCreateSubmit = async e => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    if (!createForm.classIDs || createForm.classIDs.length === 0) {
      setCreateError('Please select at least one class.');
      setCreateLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://juanlms-webapp-server.onrender.com/assignments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });
      if (res.ok) {
        setCreateSuccess(true);
        setShowCreateModal(false);
        setCreateForm({
          title: '', instructions: '', type: 'assignment', dueDate: '', points: '', fileUploadRequired: false, allowedFileTypes: '', classIDs: []
        });
      } else {
        const data = await res.json();
        setCreateError(data.error || 'Failed to create activity.');
      }
    } catch {
      setCreateError('Failed to create activity.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Activities</h2>
            <p className="text-base md:text-lg"> Academic Year and Term here | 
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

        {/* Tabs */}
        <ul className="flex flex-wrap border-b border-gray-700 text-xl sm:text-2xl font-medium text-gray-400">
          {tabs.map((tab) => (
            <li
              key={tab.id}
              className={`me-4 cursor-pointer py-2 px-4 ${activeTab === tab.id
                  ? "text-black border-b-4 border-blue-500"
                  : "hover:text-gray-600"
                }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </li>
          ))}
        </ul>

        {/* Add Create Activity/Quiz Button */}
        <div className="flex justify-end mb-4">
          <button
            className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Activity/Quiz
          </button>
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === "upcoming" && (
            <div>
              <h3 className="text-black text-2xl font-bold mb-4">December 32</h3>
              <div className="bg-[#00418B] p-4 rounded-xl shadow-lg mb-4 hover:bg-[#002d5a] relative">
                <div className="absolute top-3 right-3 text-white px-3 py-1 font-bold">20 points</div>
                <h3 className="text-white text-xl md:text-2xl font-semibold">Activity 1</h3>
                <p className="text-white">Due at 11:59 PM</p>
                <p className="text-lg text-white font-medium">Introduction to Computing</p>
              </div>
            </div>
          )}
          {activeTab === "past-due" && (
            <div>
              <h3 className="text-2xl font-semibold">Past Due</h3>
              <p className="mt-4">No activities here.</p>
            </div>
          )}
          {activeTab === "completed" && (
            <div>
              <h3 className="text-2xl font-semibold">Completed</h3>
              <p className="mt-4">No completed activities yet.</p>
            </div>
          )}
        </div>

        {/* Create Activity/Quiz Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
              <h3 className="text-xl font-semibold mb-4">Create Activity/Quiz</h3>
              <form onSubmit={handleCreateSubmit} className="space-y-3">
                <input name="title" value={createForm.title} onChange={handleCreateChange} placeholder="Title" className="w-full border rounded px-3 py-2" required />
                <textarea name="instructions" value={createForm.instructions} onChange={handleCreateChange} placeholder="Instructions" className="w-full border rounded px-3 py-2" required />
                <select name="type" value={createForm.type} onChange={handleCreateChange} className="w-full border rounded px-3 py-2">
                  <option value="assignment">Activity</option>
                  <option value="quiz">Quiz</option>
                </select>
                <input name="dueDate" type="datetime-local" value={createForm.dueDate} onChange={handleCreateChange} className="w-full border rounded px-3 py-2" required />
                <input name="points" type="number" value={createForm.points} onChange={handleCreateChange} placeholder="Points" className="w-full border rounded px-3 py-2" required />
                <label className="flex items-center gap-2">
                  <input name="fileUploadRequired" type="checkbox" checked={createForm.fileUploadRequired} onChange={handleCreateChange} /> File Upload Required
                </label>
                {createForm.fileUploadRequired && (
                  <input name="allowedFileTypes" value={createForm.allowedFileTypes} onChange={handleCreateChange} placeholder="Allowed File Types (e.g. pdf, docx)" className="w-full border rounded px-3 py-2" />
                )}
                <label className="block font-medium">Assign to Classes</label>
                <select multiple value={createForm.classIDs} onChange={handleClassSelect} className="w-full border rounded px-3 py-2 h-32">
                  {classes.map(cls => (
                    <option key={cls._id} value={cls._id}>{cls.className || cls.name}</option>
                  ))}
                </select>
                {createError && <div className="text-red-600 text-sm">{createError}</div>}
                <button type="submit" className="w-full bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950" disabled={createLoading}>{createLoading ? 'Creating...' : 'Create'}</button>
              </form>
            </div>
          </div>
        )}
        {createSuccess && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-xl font-semibold mb-2 text-green-600">Activity/Quiz Created!</h3>
              <button onClick={() => setCreateSuccess(false)} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full">OK</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
