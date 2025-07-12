import { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ActivityTab({ onAssignmentCreated }) {
    const navigate = useNavigate();
    // Removed unused classId
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [availableClasses, setAvailableClasses] = useState([]);
    const [selectedClassIDs, setSelectedClassIDs] = useState([]);
    const [classStudentMap, setClassStudentMap] = useState({}); // { classID: { students: [], selected: 'all' | [ids] } }
    const [showSuccess, setShowSuccess] = useState(false);
    const [activityPoints, setActivityPoints] = useState(100); // Default points for the whole activity
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [attachmentLink, setAttachmentLink] = useState('');
    // Removed Google Drive attachment
    const fileInputRef = useRef(null);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [pendingLink, setPendingLink] = useState('');

    // Fetch available classes on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/classes/my-classes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setAvailableClasses(Array.isArray(data) ? data : []));
    }, []);

    // Fetch students for each selected class
    useEffect(() => {
        const token = localStorage.getItem('token');
        selectedClassIDs.forEach(classID => {
            if (!classStudentMap[classID]) {
                fetch(`${API_BASE}/classes/${classID}/members`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(res => res.json())
                    .then(data => {
                        const students = Array.isArray(data.students) ? data.students : [];
                        setClassStudentMap(prev => ({
                            ...prev,
                            [classID]: { students, selected: 'all' }
                        }));
                    });
            }
        });
        // Remove classes that are no longer selected
        setClassStudentMap(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(cid => {
                if (!selectedClassIDs.includes(cid)) delete updated[cid];
            });
            return updated;
        });
    }, [selectedClassIDs]);

    const handleStudentSelection = (classID, typeOrId) => {
        setClassStudentMap(prev => {
            const entry = prev[classID] || { students: [], selected: 'all' };
            if (typeOrId === 'all') {
                return { ...prev, [classID]: { ...entry, selected: 'all' } };
            } else {
                // Toggle student ID
                let selected = Array.isArray(entry.selected) ? [...entry.selected] : [];
                if (selected.includes(typeOrId)) {
                    selected = selected.filter(id => id !== typeOrId);
                } else {
                    selected.push(typeOrId);
                }
                return { ...prev, [classID]: { ...entry, selected } };
            }
        });
    };

    const handleStudentTypeChange = (classID, value) => {
        setClassStudentMap(prev => ({
            ...prev,
            [classID]: { ...prev[classID], selected: value === 'all' ? 'all' : [] }
        }));
    };

    const handleSave = async () => {
        if (!selectedClassIDs.length) {
            alert('Please select at least one class to post this assignment.');
            return;
        }
        // Build assignedTo array
        const assignedTo = selectedClassIDs.map(classID => {
            const entry = classStudentMap[classID];
            if (!entry) return { classID, studentIDs: [] };
            if (entry.selected === 'all') {
                const allStudentIDs = entry.students.map(stu => stu.userID || stu._id);
                return { classID, studentIDs: allStudentIDs };
            } else {
                // Always send userID (school ID) strings
                const ids = Array.isArray(entry.selected)
                  ? entry.selected.map(stuId => {
                        // If entry.students is available, map to userID
                        const stuObj = entry.students.find(s => (s.userID || s._id) === stuId);
                        return stuObj ? (stuObj.userID || stuObj._id) : stuId;
                    })
                  : [];
                return { classID, studentIDs: ids };
            }
        });
        const payload = {
            classIDs: selectedClassIDs,
            assignedTo, // keep for future use
            title,
            instructions: description,
            type: "assignment",
            description,
            points: activityPoints,
            // attachmentDrive removed
            attachmentLink,
        };
        if (dueDate) {
            const isoDueDate = new Date(dueDate).toISOString();
            if (!isNaN(Date.parse(isoDueDate))) {
                payload.dueDate = isoDueDate;
            }
        }
        // If file is attached, use FormData
        if (attachmentFile) {
            const formData = new FormData();
            Object.entries(payload).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
                }
            });
            formData.append('attachmentFile', attachmentFile);
            await actuallySave(formData, true);
        } else {
            await actuallySave(payload, false);
        }
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setDueDate("");
        setSelectedClassIDs([]);
        setClassStudentMap({});
        setActivityPoints(100);
        setAttachmentFile(null);
        setAttachmentLink("");
        setShowAddDropdown(false);
        setShowLinkModal(false);
        setPendingLink("");
    };

    const actuallySave = async (payload, isFormData = false) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/assignments`, {
                method: 'POST',
                headers: isFormData ? { 'Authorization': `Bearer ${token}` } : {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: isFormData ? payload : JSON.stringify(payload)
            });
            if (res.ok) {
                resetForm();
                setShowSuccess(true);
                if (typeof onAssignmentCreated === 'function') onAssignmentCreated();
                // Redirect after a short delay to allow modal to show
                setTimeout(() => {
                    if (window.history.length > 1) {
                        navigate(-1);
                    } else {
                        navigate('/faculty_activities');
                    }
                }, 800);
            } else {
                const err = await res.json();
                alert('Failed to save: ' + (err.error || res.status));
            }
        } catch {
            alert('Failed to save (network error)');
        }
    };

    const getMinDueDate = () => {
        const now = new Date();
        now.setSeconds(0, 0); // Removes seconds/milliseconds for compatibility
        return now.toISOString().slice(0, 16);
    };

    return (
        <div className="flex flex-row p-0 font-poppinsr">
            {/* Main Content */}
            <div className="flex-1">
                <div className="bg-white rounded-t-xl px-8 pt-8 pb-4 border-b">
                    <h1 className="text-3xl font-bold mb-2 font-poppins">Create an Assignment</h1>
                    
                </div>
                <div className="px-8 py-6 bg-gray-50 min-h-[60vh]">

                        
                    {/* Remove activityType === "quiz" && ( */}
                        <>
                            
                            <div className="bg-white rounded-xl shadow border border-gray-200 p-6 max-w-5xl mx-auto mt-8">
                            <label className="block text-2xl font-bold mb-2 font-poppins">Title of Assignment</label>
                            <input
                                className=" font-poppins w-full mb-5 border-b focus:outline-none focus:border-blue-600 bg-transparent"
                                placeholder="Title"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                            {/* Add button and dropdown */}
                            {/* Add Attachment button below instructions */}
                            <label className="block text-2xl font-bold mb-1 font-poppins">Instructions (optional)</label>
                            <textarea
                                className="w-full mb-2 border-b focus:outline-none focus:border-blue-400 bg-transparent min-h-[80px] resize-y font-poppins"
                                placeholder="Instructions here"
                                value={description}
                                onChange={e => setDescription(e.target.value)} />
                            <div className="relative mb-4 mt-2">
                                <button
                                    type="button"
                                    className={`flex items-center gap-2 px-4 py-2 rounded border ${showAddDropdown ? 'bg-blue-100 border-blue-400' : 'bg-white border-gray-300'} text-blue-900 font-semibold hover:bg-blue-50`}
                                    onClick={() => setShowAddDropdown(v => !v)}
                                >
                                    Add Attachment
                                </button>
                                {showAddDropdown && (
                                    <div className="absolute left-0 mt-2 w-48 bg-white border rounded shadow-lg z-10">
                                        <button
                                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left"
                                            onClick={() => { setShowAddDropdown(false); setShowLinkModal(true); }}
                                        >
                                            <span className="material-icons">link</span> Link
                                        </button>
                                        <button
                                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left"
                                            onClick={() => { setShowAddDropdown(false); setTimeout(() => { fileInputRef.current && fileInputRef.current.click(); }, 100); }}
                                        >
                                            <span className="material-icons">attach_file</span> File
                                        </button>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={e => setAttachmentFile(e.target.files[0])}
                                />
                            </div>
                            {/* Link Modal */}
                            {showLinkModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                                        <h3 className="text-lg font-semibold mb-4 text-blue-900">Add Link Attachment</h3>
                                        <input
                                            type="url"
                                            className="border rounded px-2 py-1 w-full mb-4"
                                            placeholder="Paste your link here (e.g. Google Drive, GitHub, etc.)"
                                            value={pendingLink}
                                            onChange={e => setPendingLink(e.target.value)}
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button className="bg-gray-300 text-gray-800 px-4 py-2 rounded" onClick={() => { setShowLinkModal(false); setPendingLink(''); }}>Cancel</button>
                                            <button className="bg-blue-900 text-white px-4 py-2 rounded" onClick={() => { setAttachmentLink(pendingLink); setShowLinkModal(false); setPendingLink(''); }}>Add Link</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Show selected attachments */}
                            {(attachmentLink || attachmentFile) && (
                                <div className="mb-4 flex flex-col gap-2">
                                    {attachmentLink && (
                                        <div className="flex items-center gap-2 text-sm"><span className="material-icons">link</span> <a href={attachmentLink} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{attachmentLink}</a> <button className="ml-2 text-red-500" onClick={() => setAttachmentLink('')}>Remove</button></div>
                                    )}
                                    {attachmentFile && (
                                        <div className="flex items-center gap-2 text-sm"><span className="material-icons">attach_file</span> {attachmentFile.name} <button className="ml-2 text-red-500" onClick={() => setAttachmentFile(null)}>Remove</button></div>
                                    )}
                                </div>
                            )}
                            
                            </div>
                            
                        </>
                    {/* --- FILE UPLOAD REQUIREMENT (like Teams) --- */}
                </div>
                <div className="flex gap-2 mt-4 px-8 pb-8">
                    <button className="bg-blue-900 hover:bg-blue-950 text-white px-6 py-2 rounded font-poppins" onClick={handleSave}>Save Assignment</button>
                    <button className="bg-gray-500 text-white px-6 py-2 rounded font-poppins" onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/faculty_activities')}>Cancel</button>
                </div>
                {/* Success confirmation modal */}
                {showSuccess && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center">
                            <h3 className="text-xl font-bold mb-4 text-green-600">Activity/Quiz Created!</h3>
                            <button
                                className="mt-4 bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded w-full"
                                onClick={() => setShowSuccess(false)}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Sidebar */}
            <div className="w-96 min-w-[380px] bg-white border-l px-6 py-8 flex flex-col gap-6">
                <div>
                    <label className="block text-sm font-medium mb-1 font-poppins">Points</label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        maxLength={3}
                        className="border rounded px-2 py-1 w-full font-poppins"
                        value={activityPoints}
                        onChange={e => {
                            let val = e.target.value.replace(/[^0-9]/g, '');
                            if (val.length > 3) val = val.slice(0, 3);
                            let num = Number(val);
                            if (num > 100) num = 100;
                            setActivityPoints(num);
                        }}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 font-poppins">Due Date</label>
                    <input
                        type="datetime-local"
                        className="border rounded px-2 py-1 w-full font-poppins"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        min={getMinDueDate()}
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium mb-1 font-poppins">Class(es)</label>
                    <div className="flex flex-col gap-2">
                        {availableClasses.map(cls => (
                            <label key={cls._id} className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mt-1"
                                    value={cls.classID}
                                    checked={selectedClassIDs.includes(cls.classID)}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            setSelectedClassIDs(ids => [...ids, cls.classID]);
                                        } else {
                                            setSelectedClassIDs(ids => ids.filter(id => id !== cls.classID));
                                        }
                                    }}
                                />
                                <span>
                                    <span className="font-semibold font-poppinsr">{cls.className || cls.name}</span>
                                    <br />
                                    <span className="text-xs text-gray-700 font-poppinsr">{cls.classCode || 'N/A'}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                    {/* For each selected class, show student selection at the bottom of the class section */}
                    <div className="flex flex-col gap-4 mt-4">
                    <label className="block text-sm font-medium mb-1 font-poppins">For</label>
                        {selectedClassIDs.map(classID => {
                            const entry = classStudentMap[classID];
                            const cls = availableClasses.find(c => c.classID === classID);
                            if (!entry || !cls) return null;
                            return (
                                <div key={classID} className="p-2 border rounded bg-gray-50">
                                    <div className="font-semibold font-poppinsr mb-1">
                                        {cls.className || cls.name} <span className="text-xs text-gray-700 font-poppinsr">({cls.classCode || 'N/A'})</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-semibold font-poppinsr">Assign to:</span>
                                        <select
                                            className="border rounded px-2 py-1 font-poppinsr"
                                            value={entry.selected === 'all' ? 'all' : 'specific'}
                                            onChange={e => handleStudentTypeChange(classID, e.target.value)}
                                        >
                                            <option value="all">All students</option>
                                            <option value="specific">Specific students</option>
                                        </select>
                                    </div>
                                    {entry.selected !== 'all' && (
                                        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                                            {entry.students.map(stu => (
                                                <label key={stu.userID || stu._id} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={Array.isArray(entry.selected) && entry.selected.includes(stu.userID || stu._id)}
                                                        onChange={() => handleStudentSelection(classID, stu.userID || stu._id)}
                                                    />
                                                    <span>{stu.firstname} {stu.lastname}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
} 