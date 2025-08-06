import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function ActivityTab({ onAssignmentCreated }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editAssignmentId = searchParams.get('edit');
    
    // Removed unused classId
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [availableClasses, setAvailableClasses] = useState([]);
    const [selectedClassIDs, setSelectedClassIDs] = useState([]);
    const [classStudentMap, setClassStudentMap] = useState({}); // { classID: { students: [], selected: 'all' | [ids] } }
    const [showSuccess, setShowSuccess] = useState(false);
    const [activityPoints, setActivityPoints] = useState(100); // Default points for the whole activity
    const [showPointsDropdown, setShowPointsDropdown] = useState(false);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [attachmentLink, setAttachmentLink] = useState('');
    // Removed Google Drive attachment
    const fileInputRef = useRef(null);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [pendingLink, setPendingLink] = useState('');
    const [schedulePost, setSchedulePost] = useState(false);
    const [postAt, setPostAt] = useState("");
    const FAR_FUTURE_DATE = "2099-12-31T23:59";
    const [isEditMode, setIsEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Validation modal state
    const [validationModal, setValidationModal] = useState({
        isOpen: false,
        type: 'error',
        title: '',
        message: ''
    });

    // Fetch available classes on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/classes/my-classes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setAvailableClasses(Array.isArray(data) ? data : []));
    }, []);

    // Load assignment data if in edit mode
    useEffect(() => {
        if (editAssignmentId) {
            setIsEditMode(true);
            setLoading(true);
            const token = localStorage.getItem('token');
            
            fetch(`${API_BASE}/assignments/${editAssignmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(async res => {
                    if (!res.ok) {
                        const errorData = await res.json();
                        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                })
                .then(data => {
                    setTitle(data.title || "");
                    setDescription(data.instructions || data.description || "");
                    const points = data.points || 100;
                    setActivityPoints(points);
                    setAttachmentLink(data.attachmentLink || "");
                    
                    // Set due date if it exists
                    if (data.dueDate) {
                        const dueDateLocal = new Date(data.dueDate);
                        const year = dueDateLocal.getFullYear();
                        const month = String(dueDateLocal.getMonth() + 1).padStart(2, '0');
                        const day = String(dueDateLocal.getDate()).padStart(2, '0');
                        const hours = String(dueDateLocal.getHours()).padStart(2, '0');
                        const minutes = String(dueDateLocal.getMinutes()).padStart(2, '0');
                        setDueDate(`${year}-${month}-${day}T${hours}:${minutes}`);
                    }
                    
                    // Set post date if it exists and is not far future
                    if (data.postAt) {
                        const postDate = new Date(data.postAt);
                        const farFuture = new Date(FAR_FUTURE_DATE);
                        if (postDate < farFuture) {
                            setSchedulePost(true);
                            const year = postDate.getFullYear();
                            const month = String(postDate.getMonth() + 1).padStart(2, '0');
                            const day = String(postDate.getDate()).padStart(2, '0');
                            const hours = String(postDate.getHours() + 8).padStart(2, '0'); // Convert back to PH time
                            const minutes = String(postDate.getMinutes()).padStart(2, '0');
                            setPostAt(`${year}-${month}-${day}T${hours}:${minutes}`);
                        }
                    }
                    
                    // Set class IDs
                    if (data.classID) {
                        setSelectedClassIDs([data.classID]);
                    } else if (data.classIDs && Array.isArray(data.classIDs)) {
                        setSelectedClassIDs(data.classIDs);
                    }
                })
                .catch(err => {
                    console.error('Failed to load assignment:', err);
                    let errorMessage = 'Failed to load assignment data. Please try again.';
                    
                    if (err.message.includes('404')) {
                        errorMessage = 'Assignment not found. It may have been deleted or you may not have permission to view it.';
                    } else if (err.message.includes('403')) {
                        errorMessage = 'You do not have permission to edit this assignment.';
                    } else if (err.message.includes('401')) {
                        errorMessage = 'Your session has expired. Please log in again.';
                    } else if (err.message.includes('400')) {
                        errorMessage = 'Invalid assignment ID. Please check the URL and try again.';
                    }
                    
                    setValidationModal({
                        isOpen: true,
                        type: 'error',
                        title: 'Load Failed',
                        message: errorMessage
                    });
                })
                .finally(() => setLoading(false));
        }
    }, [editAssignmentId]);

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
        // Validate required fields
        if (!title.trim()) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'Missing Title',
                message: 'Please enter a title for the assignment.'
            });
            return;
        }

        if (!selectedClassIDs.length) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'No Classes Selected',
                message: 'Please select at least one class to post this assignment.'
            });
            return;
        }

        if (activityPoints < 1 || activityPoints > 100) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'Invalid Points',
                message: 'Points must be between 1 and 100.'
            });
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
        if (schedulePost && postAt) {
            // Treat the input as PH time (UTC+8), convert to UTC before saving
            // postAt is in 'YYYY-MM-DDTHH:mm' (local), treat as Asia/Manila
            const [datePart, timePart] = postAt.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute] = timePart.split(':').map(Number);
            // Create a Date object treating the input as Philippines time (UTC+8)
            // To convert PH time to UTC, we subtract 8 hours
            const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
            const isoPostAt = utcDate.toISOString();
            if (!isNaN(Date.parse(isoPostAt))) {
                payload.postAt = isoPostAt;
            }
        } else {
            // If not scheduled, set postAt to far future so students never see it
            const local = new Date(FAR_FUTURE_DATE);
            const utc = new Date(local.getTime() - local.getTimezoneOffset() * 60000);
            payload.postAt = utc.toISOString();
        }
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
        setShowPointsDropdown(false);
        setAttachmentFile(null);
        setAttachmentLink("");
        setShowAddDropdown(false);
        setShowLinkModal(false);
        setPendingLink("");
        setSchedulePost(false);
        setPostAt("");
    };

    const actuallySave = async (payload, isFormData = false) => {
        const token = localStorage.getItem('token');
        try {
            const url = isEditMode ? `${API_BASE}/assignments/${editAssignmentId}` : `${API_BASE}/assignments`;
            const method = isEditMode ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
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
                let errorMessage = err.error || `HTTP ${res.status}: ${res.statusText}`;
                let errorTitle = isEditMode ? 'Update Failed' : 'Save Failed';
                
                // Handle specific error cases
                if (res.status === 400) {
                    errorTitle = 'Validation Error';
                } else if (res.status === 401) {
                    errorTitle = 'Authentication Error';
                    errorMessage = 'Your session has expired. Please log in again.';
                } else if (res.status === 403) {
                    errorTitle = 'Permission Denied';
                    errorMessage = 'You do not have permission to ' + (isEditMode ? 'edit' : 'create') + ' this assignment.';
                } else if (res.status === 404) {
                    errorTitle = 'Not Found';
                    errorMessage = 'Assignment not found. It may have been deleted.';
                } else if (res.status >= 500) {
                    errorTitle = 'Server Error';
                    errorMessage = 'A server error occurred. Please try again later.';
                }
                
                setValidationModal({
                    isOpen: true,
                    type: 'error',
                    title: errorTitle,
                    message: errorMessage
                });
            }
        } catch (err) {
            console.error('Network error:', err);
            setValidationModal({
                isOpen: true,
                type: 'error',
                title: 'Network Error',
                message: 'Failed to ' + (isEditMode ? 'update' : 'save') + ' due to network error. Please check your connection and try again.'
            });
        }
    };

    const getMinDueDate = () => {
        const now = new Date();
        now.setSeconds(0, 0); // Removes seconds/milliseconds for compatibility
        return now.toISOString().slice(0, 16);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading assignment data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-row min-h-screen bg-gray-50 font-poppinsr">
            {/* Main Content */}
            <div className="flex-1 p-10">
                <h1 className="text-2xl font-bold mb-8 font-poppins">{isEditMode ? 'Edit Assignment' : 'Create an Assignment'}</h1>
                <div className="bg-white rounded-xl shadow p-8 mb-8">
                    <label className="block font-bold text-lg mb-1 font-poppins">Title of Assignment</label>
                            <input
                        className="w-full border-b text-lg font-semibold focus:outline-none focus:border-blue-600 bg-transparent mb-4 font-poppins"
                                placeholder="Title"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                    <label className="block font-bold text-lg mb-1 mt-4 font-poppins">Instructions</label>
                            <textarea
                        className="w-full border-b focus:outline-none focus:border-blue-400 bg-transparent min-h-[80px] resize-y mb-4 font-poppins"
                                placeholder="Instructions here"
                                value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
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
                <div className="flex gap-4 mt-8 justify-end">
                    <button className="bg-blue-900 hover:bg-blue-950 text-white px-6 py-2 rounded font-poppins" onClick={handleSave}>Save Assignment</button>
                    <button className="bg-gray-500 text-white px-6 py-2 rounded font-poppins" onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/faculty_activities')}>Cancel</button>
                </div>
                {/* Success confirmation modal */}
                {showSuccess && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center">
                            <h3 className="text-xl font-bold mb-4 text-green-600">
                                {isEditMode ? 'Assignment Updated!' : 'Activity/Quiz Created!'}
                            </h3>
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
            <div className="w-96 min-w-[380px] bg-white border-l px-8 py-10 flex flex-col gap-8">
                <div>
                    <label className="block text-sm font-medium mb-1 font-poppins">Points</label>
                    <div className="border rounded px-2 py-1 w-full font-poppins bg-white cursor-pointer" onClick={() => setShowPointsDropdown(!showPointsDropdown)}>
                        <div className="flex justify-between items-center">
                            <span>{activityPoints}</span>
                            <span className="text-gray-500">▼</span>
                        </div>
                    </div>
                                         {showPointsDropdown && (
                         <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                             <div className="p-2">
                                 <div className="text-sm font-semibold text-gray-700 mb-2">1 to 10</div>
                                 <div className="grid grid-cols-5 gap-1 mb-3">
                                     {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                                         <button
                                             key={num}
                                             className={`w-8 h-8 text-center rounded hover:bg-blue-50 ${activityPoints === num ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                             onClick={() => {
                                                 setActivityPoints(num);
                                                 setShowPointsDropdown(false);
                                             }}
                                         >
                                             {num}
                                         </button>
                                     ))}
                                 </div>
                                 <div className="text-sm font-semibold text-gray-700 mb-2">11 to 20</div>
                                 <div className="grid grid-cols-5 gap-1 mb-3">
                                     {Array.from({ length: 10 }, (_, i) => i + 11).map(num => (
                                         <button
                                             key={num}
                                             className={`w-8 h-8 text-center rounded hover:bg-blue-50 ${activityPoints === num ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                             onClick={() => {
                                                 setActivityPoints(num);
                                                 setShowPointsDropdown(false);
                                             }}
                                         >
                                             {num}
                                         </button>
                                     ))}
                                 </div>
                                 <div className="text-sm font-semibold text-gray-700 mb-2">21 to 30</div>
                                 <div className="grid grid-cols-5 gap-1 mb-3">
                                     {Array.from({ length: 10 }, (_, i) => i + 21).map(num => (
                                         <button
                                             key={num}
                                             className={`w-8 h-8 text-center rounded hover:bg-blue-50 ${activityPoints === num ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                             onClick={() => {
                                                 setActivityPoints(num);
                                                 setShowPointsDropdown(false);
                                             }}
                                         >
                                             {num}
                                         </button>
                                     ))}
                                 </div>
                                 <div className="text-sm font-semibold text-gray-700 mb-2">31 to 40</div>
                                 <div className="grid grid-cols-5 gap-1 mb-3">
                                     {Array.from({ length: 10 }, (_, i) => i + 31).map(num => (
                                         <button
                                             key={num}
                                             className={`w-8 h-8 text-center rounded hover:bg-blue-50 ${activityPoints === num ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                             onClick={() => {
                                                 setActivityPoints(num);
                                                 setShowPointsDropdown(false);
                                             }}
                                         >
                                             {num}
                                         </button>
                                     ))}
                                 </div>
                                 <div className="text-sm font-semibold text-gray-700 mb-2">41 to 50</div>
                                 <div className="grid grid-cols-5 gap-1 mb-3">
                                     {Array.from({ length: 10 }, (_, i) => i + 41).map(num => (
                                         <button
                                             key={num}
                                             className={`w-8 h-8 text-center rounded hover:bg-blue-50 ${activityPoints === num ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                             onClick={() => {
                                                 setActivityPoints(num);
                                                 setShowPointsDropdown(false);
                                             }}
                                         >
                                             {num}
                                         </button>
                                     ))}
                                 </div>
                                 <div className="text-sm font-semibold text-gray-700 mb-2">51 to 60</div>
                                 <div className="grid grid-cols-5 gap-1 mb-3">
                                     {Array.from({ length: 10 }, (_, i) => i + 51).map(num => (
                                         <button
                                             key={num}
                                             className={`w-8 h-8 text-center rounded hover:bg-blue-50 ${activityPoints === num ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                             onClick={() => {
                                                 setActivityPoints(num);
                                                 setShowPointsDropdown(false);
                                             }}
                                         >
                                             {num}
                                         </button>
                                     ))}
                                 </div>
                                 <div className="text-sm font-semibold text-gray-700 mb-2">61 to 70</div>
                                 <div className="grid grid-cols-5 gap-1 mb-3">
                                     {Array.from({ length: 10 }, (_, i) => i + 61).map(num => (
                                         <button
                                             key={num}
                                             className={`w-8 h-8 text-center rounded hover:bg-blue-50 ${activityPoints === num ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                             onClick={() => {
                                                 setActivityPoints(num);
                                                 setShowPointsDropdown(false);
                                             }}
                                         >
                                             {num}
                                         </button>
                                     ))}
                                 </div>
                                 <div className="text-sm font-semibold text-gray-700 mb-2">71 to 80</div>
                                 <div className="grid grid-cols-5 gap-1 mb-3">
                                     {Array.from({ length: 10 }, (_, i) => i + 71).map(num => (
                                         <button
                                             key={num}
                                             className={`w-8 h-8 text-center rounded hover:bg-blue-50 ${activityPoints === num ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                             onClick={() => {
                                                 setActivityPoints(num);
                                                 setShowPointsDropdown(false);
                                             }}
                                         >
                                             {num}
                                         </button>
                                     ))}
                                 </div>
                                 <div className="text-sm font-semibold text-gray-700 mb-2">81 to 90</div>
                                 <div className="grid grid-cols-5 gap-1 mb-3">
                                     {Array.from({ length: 10 }, (_, i) => i + 81).map(num => (
                                         <button
                                             key={num}
                                             className={`w-8 h-8 text-center rounded hover:bg-blue-50 ${activityPoints === num ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                             onClick={() => {
                                                 setActivityPoints(num);
                                                 setShowPointsDropdown(false);
                                             }}
                                         >
                                             {num}
                                         </button>
                                     ))}
                                 </div>
                                 <div className="text-sm font-semibold text-gray-700 mb-2">91 to 100</div>
                                 <div className="grid grid-cols-5 gap-1">
                                     {Array.from({ length: 10 }, (_, i) => i + 91).map(num => (
                                         <button
                                             key={num}
                                             className={`w-8 h-8 text-center rounded hover:bg-blue-50 ${activityPoints === num ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                             onClick={() => {
                                                 setActivityPoints(num);
                                                 setShowPointsDropdown(false);
                                             }}
                                         >
                                             {num}
                                         </button>
                                     ))}
                                 </div>
                             </div>
                         </div>
                     )}
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
                {/* Schedule Post Toggle and DateTime Picker */}
                <div className="mb-4 flex flex-col gap-2">
                    <label className="flex items-center gap-2 font-poppins">
                        <input type="checkbox" checked={schedulePost} onChange={e => setSchedulePost(e.target.checked)} />
                        Schedule Post
                    </label>
                    {schedulePost && (
                        <input
                            type="datetime-local"
                            className="border rounded px-2 py-1 font-poppins"
                            value={postAt}
                            onChange={e => setPostAt(e.target.value)}
                            min={getMinDueDate()}
                        />
                    )}
                </div>
            </div>
            {/* Validation Modal */}
            <ValidationModal
                isOpen={validationModal.isOpen}
                onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
                type={validationModal.type}
                title={validationModal.title}
                message={validationModal.message}
            />
        </div>
    );
} 