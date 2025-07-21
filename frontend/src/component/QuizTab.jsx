import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function QuizTab({ onQuizCreated, onPointsChange }) {
    const [searchParams] = useSearchParams();
    const editAssignmentId = searchParams.get('edit');
    
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [questions, setQuestions] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        type: "multiple",
        question: "",
        choices: [""],
        correctAnswers: [],
        points: 1,
        required: true,
        identificationAnswer: "",
        trueFalseAnswer: true,
        image: null, // for quiz question image
    });
    const [dueDate, setDueDate] = useState("");
    const [availableClasses, setAvailableClasses] = useState([]);
    const [selectedClassIDs, setSelectedClassIDs] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [schedulePost, setSchedulePost] = useState(false);
    // Validation modal state
    const [validationModal, setValidationModal] = useState({
        isOpen: false,
        type: 'error',
        title: '',
        message: ''
    });
    const [showGrading, setShowGrading] = useState(false);
    const [gradeToPass, setGradeToPass] = useState(0);
    const [attemptsAllowed, setAttemptsAllowed] = useState('Unlimited');

    const [showTiming, setShowTiming] = useState(false);
    const [timingOpenEnabled, setTimingOpenEnabled] = useState(false);
    const [timingOpen, setTimingOpen] = useState("");
    const [timingCloseEnabled, setTimingCloseEnabled] = useState(false);
    const [timingClose, setTimingClose] = useState("");
    const [timingLimitEnabled, setTimingLimitEnabled] = useState(false);
    const [timingLimit, setTimingLimit] = useState(0);

    const [showQuestionBehaviour, setShowQuestionBehaviour] = useState(false);
    const [shuffleQuestions, setShuffleQuestions] = useState("Yes");

    const [showSafeExam, setShowSafeExam] = useState(false);
    const [safeExamRequired, setSafeExamRequired] = useState("No");

    const [classStudentMap, setClassStudentMap] = useState({}); // { classID: { students: [], selected: 'all' | [ids] } }
    const [lightboxImage, setLightboxImage] = useState(null);
    const [imageUploading, setImageUploading] = useState(false);

    const resetForm = () => setForm({
        type: "multiple",
        question: "",
        choices: [""],
        correctAnswers: [],
        points: 1,
        required: true,
        identificationAnswer: "",
        trueFalseAnswer: true,
    });

    useEffect(() => {
        const total = questions.reduce((sum, q) => sum + (q.points || 0), 0);
        if (typeof onPointsChange === 'function') {
            onPointsChange(total);
        }
    }, [questions, onPointsChange]);

    // Load quiz data if in edit mode
    useEffect(() => {
        if (editAssignmentId) {
            setIsEditMode(true);
            setLoading(true);
            const token = localStorage.getItem('token');
            // First, try to fetch as a quiz
            fetch(`${API_BASE}/api/quizzes/${editAssignmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(async res => {
                    if (res.ok) {
                    return res.json();
                    } else {
                        // If not found as quiz, try as assignment
                        return fetch(`${API_BASE}/assignments/${editAssignmentId}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        }).then(async res2 => {
                            if (!res2.ok) {
                                const errorData = await res2.json();
                                throw new Error(errorData.error || `HTTP ${res2.status}: ${res2.statusText}`);
                            }
                            const data2 = await res2.json();
                            // If it's not a quiz, redirect to ActivityTab
                            if (data2.type !== 'quiz') {
                                window.location.href = `/create-assignment?edit=${editAssignmentId}`;
                                return null;
                            }
                            return data2;
                        });
                    }
                })
                .then(data => {
                    if (!data) return;
                    setTitle(data.title || "");
                    setDescription(data.instructions || data.description || "");
                    if (data.questions && Array.isArray(data.questions)) {
                        setQuestions(data.questions);
                    }
                    if (data.dueDate) {
                        const dueDateLocal = new Date(data.dueDate);
                        const year = dueDateLocal.getFullYear();
                        const month = String(dueDateLocal.getMonth() + 1).padStart(2, '0');
                        const day = String(dueDateLocal.getDate()).padStart(2, '0');
                        const hours = String(dueDateLocal.getHours()).padStart(2, '0');
                        const minutes = String(dueDateLocal.getMinutes()).padStart(2, '0');
                        setDueDate(`${year}-${month}-${day}T${hours}:${minutes}`);
                    }
                    if (data.timing) {
                        setTimingOpenEnabled(data.timing.open !== null);
                        setTimingOpen(data.timing.open || "");
                        setTimingCloseEnabled(data.timing.close !== null);
                        setTimingClose(data.timing.close || "");
                        setTimingLimitEnabled(data.timing.limit !== null);
                        setTimingLimit(data.timing.limit || 0);
                    }
                    if (data.classID) {
                        setSelectedClassIDs([data.classID]);
                    } else if (data.classIDs && Array.isArray(data.classIDs)) {
                        setSelectedClassIDs(data.classIDs);
                    }
                    if (data.questionBehaviour && typeof data.questionBehaviour.shuffle === "boolean") {
                        setShuffleQuestions(data.questionBehaviour.shuffle ? "Yes" : "No");
                    } else if (typeof data.shuffleQuestions === "boolean") {
                        setShuffleQuestions(data.shuffleQuestions ? "Yes" : "No");
                    }
                })
                .catch(err => {
                    console.error('Failed to load quiz:', err);
                    let errorMessage = 'Failed to load quiz data. Please try again.';
                    if (err.message.includes('404')) {
                        errorMessage = 'Quiz not found. It may have been deleted or you may not have permission to view it.';
                    } else if (err.message.includes('403')) {
                        errorMessage = 'You do not have permission to edit this quiz.';
                    } else if (err.message.includes('401')) {
                        errorMessage = 'Your session has expired. Please log in again.';
                    } else if (err.message.includes('400')) {
                        errorMessage = 'Invalid quiz ID. Please check the URL and try again.';
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

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageUploading(true);
            const formData = new FormData();
            formData.append('image', file);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/quizzes/upload-image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                if (!res.ok) {
                    throw new Error('Image upload failed');
                }
                const data = await res.json();
                setForm(f => ({ ...f, image: data.url }));
            } catch (err) {
                setValidationModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Image Upload Failed',
                    message: err.message || 'Could not upload image. Please try again.'
                });
            } finally {
                setImageUploading(false);
            }
        }
    };

    const handleAddOrUpdate = () => {
        if (!form.question.trim()) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'Missing Question',
                message: 'Please enter a question.'
            });
            return;
        }
        if (form.points < 1) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'Invalid Points',
                message: 'Question points must be at least 1.'
            });
            return;
        }
        if (form.type === "multiple") {
            const validChoices = form.choices.filter(choice => choice.trim() !== '');
            if (validChoices.length < 2) {
                setValidationModal({
                    isOpen: true,
                    type: 'warning',
                    title: 'Insufficient Choices',
                    message: 'Multiple choice questions must have at least 2 choices.'
                });
                return;
            }
            if (form.correctAnswers.length === 0) {
                setValidationModal({
                    isOpen: true,
                    type: 'warning',
                    title: 'No Correct Answer',
                    message: 'Please select at least one correct answer.'
                });
                return;
            }
        }
        if (form.type === "identification" && !form.identificationAnswer.trim()) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'Missing Answer',
                message: 'Please enter the correct answer for the identification question.'
            });
            return;
        }
        let q = {
            type: form.type,
            question: form.question,
            points: form.points,
            required: form.required,
            image: form.image || null,
        };
        if (form.type === "multiple") {
            q.choices = form.choices;
            q.correctAnswers = form.correctAnswers;
        } else if (form.type === "truefalse") {
            q.correctAnswer = form.trueFalseAnswer;
        } else if (form.type === "identification") {
            q.correctAnswer = form.identificationAnswer;
        }
        if (editingIndex !== null) {
            setQuestions(questions.map((item, idx) => idx === editingIndex ? q : item));
            setEditingIndex(null);
        } else {
            setQuestions([...questions, q]);
        }
        resetForm();
    };

    const handleEdit = idx => {
        const q = questions[idx];
        setEditingIndex(idx);
        setForm({
            type: q.type,
            question: q.question,
            choices: q.choices || [""],
            correctAnswers: q.correctAnswers || [],
            points: q.points,
            required: q.required,
            identificationAnswer: q.correctAnswer || "",
            trueFalseAnswer: q.correctAnswer === false ? false : true,
            image: q.image || null,
        });
    };

    const handleDelete = idx => setQuestions(questions.filter((_, i) => i !== idx));
    const handleDuplicate = idx => setQuestions([...questions, { ...questions[idx] }]);

    const FAR_FUTURE_DATE = "2099-12-31T23:59";

    const handleSave = async () => {
        console.log("shuffleQuestions value at save:", shuffleQuestions);
        if (!title.trim()) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'Missing Title',
                message: 'Please enter a title for the quiz.'
            });
            return;
        }
        if (questions.length === 0) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'No Questions',
                message: 'Please add at least one question to the quiz.'
            });
            return;
        }
        if (!selectedClassIDs.length) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'No Classes Selected',
                message: 'Please select at least one class to post this quiz.'
            });
            return;
        }
        const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
        if (totalPoints < 1 || totalPoints > 100) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'Invalid Points',
                message: 'Points must be between 1 and 100.'
            });
            return;
        }
        // Timing validation
        if (timingOpenEnabled && !timingOpen) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'Missing Open Time',
                message: 'Please set the open time for the quiz.'
            });
            return;
        }
        if (timingCloseEnabled && !timingClose) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'Missing Close Time',
                message: 'Please set the close time for the quiz.'
            });
            return;
        }
        if (timingLimitEnabled && (!timingLimit || isNaN(Number(timingLimit)) || Number(timingLimit) < 1)) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'Invalid Time Limit',
                message: 'Please set a valid time limit (in minutes, at least 1).' 
            });
            return;
        }
        const token = localStorage.getItem('token');
        // Get user from localStorage
        let userId = null;
        try {
            const userObj = JSON.parse(localStorage.getItem('user'));
            userId = userObj?._id || null;
        } catch {
            userId = null;
        }
        // Build assignedTo array like ActivityTab.jsx
        const assignedTo = selectedClassIDs.map(classID => {
            const entry = classStudentMap[classID];
            if (!entry) return { classID, studentIDs: [] };
            if (entry.selected === 'all') {
                const allStudentIDs = entry.students.map(stu => stu.userID || stu._id);
                return { classID, studentIDs: allStudentIDs };
            } else {
                const ids = Array.isArray(entry.selected)
                  ? entry.selected.map(stuId => {
                        const stuObj = entry.students.find(s => (s.userID || s._id) === stuId);
                        return stuObj ? (stuObj.userID || stuObj._id) : stuId;
                    })
                  : [];
                return { classID, studentIDs: ids };
            }
        });

        // FIX: Convert shuffleQuestions to boolean
        const payload = {
            assignedTo,
            title,
            instructions: description,
            type: 'quiz',
            description,
            points: totalPoints,
            questions,
            timing: {
                open: timingOpenEnabled ? timingOpen : null,
                close: timingCloseEnabled ? timingClose : null,
                limit: timingLimitEnabled ? Number(timingLimit) : null
            },
            createdBy: userId,
            questionBehaviour: {
                shuffle: shuffleQuestions === "Yes"
            },
            // Remove shuffleQuestions: shuffleQuestions === "Yes"
        };

        // Schedule post logic (PH time)
        if (schedulePost && dueDate) {
            const [datePart, timePart] = dueDate.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute] = timePart.split(':').map(Number);
            // Convert PH time to UTC
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
        await actuallySave(payload, token);
    };

    const actuallySave = async (payload, token) => {
        // Ensure createdBy is always present
        if (!payload.createdBy) {
            try {
                const userObj = JSON.parse(localStorage.getItem('user'));
                payload.createdBy = userObj?._id || null;
            } catch {
                payload.createdBy = null;
            }
        }
        try {
            let url, method;
            if (isEditMode) {
                if (payload.type === 'quiz') {
                    url = `${API_BASE}/api/quizzes/${editAssignmentId}`;
                    method = 'PUT';
                } else {
                    url = `${API_BASE}/assignments/${editAssignmentId}`;
                    method = 'PUT';
                }
            } else {
                if (payload.type === 'quiz') {
                    url = `${API_BASE}/api/quizzes`;
                    method = 'POST';
                } else {
                    url = `${API_BASE}/assignments`;
                    method = 'POST';
                }
            }
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setShowSuccess(true);
                if (typeof onQuizCreated === 'function') onQuizCreated();
                setTimeout(() => {
                    if (window.history.length > 1) {
                        window.history.back();
                    } else {
                        window.location.assign('/faculty_activities');
                    }
                }, 800);
            } else {
                const err = await res.json();
                let errorMessage = err.error || `HTTP ${res.status}: ${res.statusText}`;
                let errorTitle = isEditMode ? 'Update Failed' : 'Save Failed';
                if (res.status === 400) {
                    errorTitle = 'Validation Error';
                } else if (res.status === 401) {
                    errorTitle = 'Authentication Error';
                    errorMessage = 'Your session has expired. Please log in again.';
                } else if (res.status === 403) {
                    errorTitle = 'Permission Denied';
                    errorMessage = 'You do not have permission to ' + (isEditMode ? 'edit' : 'create') + ' this quiz.';
                } else if (res.status === 404) {
                    errorTitle = 'Not Found';
                    errorMessage = 'Quiz not found. It may have been deleted.';
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
        now.setSeconds(0, 0);
        return now.toISOString().slice(0, 16);
    };

    // Lightbox close on Escape
    useEffect(() => {
        if (!lightboxImage) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') setLightboxImage(null);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [lightboxImage]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading quiz data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-row min-h-screen bg-gray-50">
            {/* Main Content */}
            <div className="flex-1 p-10 font-poppinsr">
                <h1 className="text-2xl font-bold mb-8">Create a Quiz</h1>
                <div className="bg-white rounded-xl shadow p-8 mb-8">
                    <label className="block font-bold text-lg mb-1">Title of Quiz</label>
                    <input
                        className="w-full border-b text-lg font-semibold focus:outline-none focus:border-blue-600 bg-transparent mb-4"
                        placeholder="Title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                    <label className="block font-bold text-lg mb-1 mt-4">Instructions </label>
                    <textarea
                        className="w-full border-b focus:outline-none focus:border-blue-400 bg-transparent min-h-[80px] resize-y mb-4"
                        placeholder="Instructions here"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                    <button className="border border-gray-400 rounded px-4 py-2 text-left hover:bg-gray-100 mb-4">Add Attachment</button>
                </div>
                {/* Questions List */}
                <div className="bg-white rounded-xl shadow p-8 mb-8">
                    <label className="block font-bold text-lg mb-4">Questions</label>
                    {questions.length === 0 && <div className="text-gray-500 mb-4">No questions added yet.</div>}
                    {questions.map((q, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg border border-gray-200 mb-6 p-4 relative">
                            <div className="flex gap-2 items-center mb-2">
                                <span className="text-lg font-semibold">{idx + 1}.</span>
                                <span className="font-bold">{q.question}</span>
                                <span className="ml-2 text-xs text-gray-500">({q.type}, {q.points} pt{q.points > 1 ? 's' : ''})</span>
                                {q.required && <span className="ml-2 text-xs text-red-600">*</span>}
                            </div>
                            {q.image && (
                                <div className="mb-2 relative group w-fit">
                                    <button
                                        type="button"
                                        onClick={() => setLightboxImage(q.image)}
                                        className="focus:outline-none"
                                    >
                                        <img
                                            src={q.image}
                                            alt="Question"
                                            className="max-h-40 rounded border transition-transform duration-200 group-hover:scale-105 group-hover:brightness-90 cursor-zoom-in"
                                        />
                                        {/* Zoom icon overlay */}
                                        <span className="absolute bottom-2 right-2 bg-white/80 rounded-full p-1 shadow group-hover:bg-blue-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l5 5m-5-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </span>
                                    </button>
                                </div>
                            )}
                            {q.type === "multiple" && (
                                <ul className="mb-2">
                                    {q.choices.map((c, i) => (
                                        <li key={i} className="flex items-center gap-2 mb-1">
                                            <input type="radio" disabled className="accent-blue-600" />
                                            <span>{c}</span>
                                            {q.correctAnswers && q.correctAnswers.includes(i) && <span className="ml-1 text-green-600">✔</span>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {q.type === "truefalse" && (
                                <div className="mb-2">
                                    <span className="mr-4">True</span>
                                    <input type="radio" checked={q.correctAnswer === true} disabled className="accent-blue-600" />
                                    <span className="ml-6 mr-4">False</span>
                                    <input type="radio" checked={q.correctAnswer === false} disabled className="accent-blue-600" />
                                </div>
                            )}
                            {q.type === "identification" && (
                                <div className="mb-2">
                                    <span className="italic">Answer: </span>
                                    <span className="ml-2">{q.correctAnswer}</span>
                                </div>
                            )}
                            <div className="flex gap-2 mt-2">
                                <button className="text-blue-700 hover:underline" onClick={() => handleEdit(idx)}>Edit</button>
                                <button className="text-gray-600 hover:underline" onClick={() => handleDuplicate(idx)}>Duplicate</button>
                                <button className="text-red-600 hover:underline" onClick={() => handleDelete(idx)}>Delete</button>
                            </div>
                        </div>
                    ))}
                    {/* Add/Edit Question Form */}
                    <div className="bg-white rounded-xl border-2 border-blue-400 shadow-lg p-6 max-w-4xl w-full mx-auto mt-8">
                        <div className="flex gap-4 mb-2 items-center">
                            <input
                                className="flex-1 border-b text-lg font-semibold focus:outline-none focus:border-blue-600 bg-transparent py-2 px-3"
                                placeholder="Question"
                                value={form.question}
                                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                            />
                            <div className="flex flex-col ml-2">
                                <label className="block text-sm font-medium mb-1 text-right">Points</label>
                                <input
                                    type="number"
                                    min={1}
                                    className="border rounded px-3 py-2 w-20"
                                    value={form.points}
                                    onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))}
                                />
                            </div>
                        </div>
                        {/* Image upload */}
                        <div className="mb-2">
                            <label className="block text-sm font-medium mb-1">Image (optional)</label>
                            <input type="file" accept="image/*" onChange={handleImageChange} disabled={imageUploading} />
                            {imageUploading && <span className="text-blue-600 ml-2">Uploading...</span>}
                            {form.image && (
                                <div className="mt-2 flex items-center gap-2">
                                    <img src={form.image} alt="Question" className="max-h-40 rounded border" />
                                    <button
                                        type="button"
                                        className="text-red-600 text-sm font-semibold ml-2"
                                        onClick={() => setForm(f => ({ ...f, image: null }))}
                                    >
                                        Remove Image
                                    </button>
                                </div>
                            )}
                        </div>
                            <select
                            className="border rounded px-3 py-2 w-60 mt-2 mb-2"
                                value={form.type}
                                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                            >
                                <option value="multiple">Multiple choice</option>
                                <option value="truefalse">True or False</option>
                                <option value="identification">Identification</option>
                            </select>
                        {form.type === "multiple" && (
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Choices</label>
                                <div className="flex flex-col gap-2">
                                {form.choices.map((choice, idx) => (
                                    <div key={idx} className="flex items-center gap-3 mb-1 w-full">
                                        <input
                                            className="border rounded px-3 py-2 flex-1 w-full"
                                            value={choice}
                                            onChange={e => setForm(f => ({ ...f, choices: f.choices.map((c, i) => i === idx ? e.target.value : c) }))}
                                        />
                                        <input
                                            type="checkbox"
                                            checked={form.correctAnswers.includes(idx)}
                                            onChange={e => {
                                                if (e.target.checked) setForm(f => ({ ...f, correctAnswers: [...f.correctAnswers, idx] }));
                                                else setForm(f => ({ ...f, correctAnswers: f.correctAnswers.filter(i => i !== idx) }));
                                            }}
                                        /> <span className="text-base">Correct</span>
                                        <button type="button" className="text-red-600 text-base font-semibold ml-2" onClick={() => setForm(f => ({ ...f, choices: f.choices.filter((_, i) => i !== idx), correctAnswers: f.correctAnswers.filter(i => i !== idx) }))}>Remove</button>
                                    </div>
                                ))}
                                </div>
                                <button type="button" className="bg-gray-200 px-3 py-2 rounded mt-2 text-base font-semibold w-full" onClick={() => setForm(f => ({ ...f, choices: [...f.choices, ""] }))}>Add Option</button>
                            </div>
                        )}
                        {form.type === "truefalse" && (
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Correct Answer</label>
                                <select
                                    className="border rounded px-3 py-2 w-60"
                                    value={form.trueFalseAnswer ? "true" : "false"}
                                    onChange={e => setForm(f => ({ ...f, trueFalseAnswer: e.target.value === "true" }))}
                                >
                                    <option value="true">True</option>
                                    <option value="false">False</option>
                                </select>
                            </div>
                        )}
                        {form.type === "identification" && (
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Correct Answer</label>
                                <input
                                    className="border rounded px-3 py-2 w-full"
                                    value={form.identificationAnswer}
                                    onChange={e => setForm(f => ({ ...f, identificationAnswer: e.target.value }))}
                                />
                            </div>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.required}
                                    onChange={e => setForm(f => ({ ...f, required: e.target.checked }))}
                                />
                                Required
                            </label>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 max-w-4xl w-full mx-auto">
                            <button
                                type="button"
                                className="bg-blue-700 text-white px-4 py-2 rounded shadow"
                                onClick={handleAddOrUpdate}
                            >
                                {editingIndex !== null ? "Update Question" : "Add Question"}
                            </button>
                            {editingIndex !== null && (
                                <button
                                    type="button"
                                    className="bg-gray-400 text-white px-4 py-2 rounded"
                                    onClick={() => { setEditingIndex(null); resetForm(); }}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                </div>
                <div className="flex gap-4 mt-8 justify-end">
                    <button className="bg-blue-700 text-white px-6 py-2 rounded" onClick={handleSave}>
                        {isEditMode ? 'Update Quiz' : 'Save Quiz'}
                    </button>
                    <button className="bg-gray-500 text-white px-6 py-2 rounded" onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/faculty_activities')}>Cancel</button>
                </div>
                {/* Success confirmation modal */}
                {showSuccess && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center">
                            <h3 className="text-xl font-bold mb-4 text-green-600">Quiz Created!</h3>
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
            <div className="w-96 min-w-[320px] bg-white border-l px-8 py-10 flex flex-col gap-8">
                <div>
                    <label className="block text-sm font-medium mb-1">Points</label>
                    <div className="border rounded px-2 py-1 w-full bg-gray-100 text-gray-700">
                        {questions.reduce((sum, q) => sum + (q.points || 0), 0)}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Due Date</label>
                    <input
                        type="datetime-local"
                        className="border rounded px-2 py-1 w-full"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        min={getMinDueDate()}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Class(es)</label>
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
                                    <span className="font-semibold">{cls.className || cls.name}</span>
                                    <br />
                                    <span className="text-xs text-gray-700">{cls.classCode || 'N/A'}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                    {/* For each selected class, show student selection at the bottom of the class section */}
                    <div className="flex flex-col gap-4 mt-4">
                    <label className="block text-sm font-medium mb-1">For</label>
                        {selectedClassIDs.map(classID => {
                            const entry = classStudentMap[classID];
                            const cls = availableClasses.find(c => c.classID === classID);
                            if (!entry || !cls) return null;
                            return (
                                <div key={classID} className="p-2 border rounded bg-gray-50">
                                    <div className="font-semibold mb-1">
                                        {cls.className || cls.name} <span className="text-xs text-gray-700">({cls.classCode || 'N/A'})</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-semibold">Assign to:</span>
                    <select
                                            className="border rounded px-2 py-1"
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
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={schedulePost} onChange={e => setSchedulePost(e.target.checked)} />
                        Schedule Post
                    </label>
                    {schedulePost && (
                        <input
                            type="datetime-local"
                            className="border rounded px-2 py-1"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            min={getMinDueDate()}
                        />
                    )}
                </div>
                {/* Timing Collapsible Section */}
                <div className="border rounded mb-2">
                    <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 font-semibold text-left text-lg focus:outline-none"
                        onClick={() => setShowTiming(v => !v)}
                    >
                        <span>Timing</span>
                        <span>{showTiming ? '▲' : '▼'}</span>
                    </button>
                    {showTiming && (
                        <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
                            <div className="mb-2">
                                <label className="block text-sm font-medium mb-1">Open the quiz</label>
                                <input
                                    type="datetime-local"
                                    className="border rounded px-2 py-1 w-full max-w-full"
                                    value={timingOpen}
                                    onChange={e => setTimingOpen(e.target.value)}
                                    disabled={!timingOpenEnabled}
                                />
                                <label className="flex items-center gap-1 mt-1">
                                    <input type="checkbox" checked={timingOpenEnabled} onChange={e => setTimingOpenEnabled(e.target.checked)} /> Enable
                                </label>
                                <span className="text-xs text-gray-500">If enabled, students can only start the quiz at or after this time.</span>
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm font-medium mb-1">Close the quiz</label>
                                <input
                                    type="datetime-local"
                                    className="border rounded px-2 py-1 w-full max-w-full"
                                    value={timingClose}
                                    onChange={e => setTimingClose(e.target.value)}
                                    disabled={!timingCloseEnabled}
                                />
                                <label className="flex items-center gap-1 mt-1">
                                    <input type="checkbox" checked={timingCloseEnabled} onChange={e => setTimingCloseEnabled(e.target.checked)} /> Enable
                                </label>
                                <span className="text-xs text-gray-500">If enabled, the quiz will be inaccessible after this time.</span>
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm font-medium mb-1">Time limit</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={1}
                                        className="border rounded px-2 py-1 w-20"
                                        value={timingLimit}
                                        onChange={e => setTimingLimit(e.target.value)}
                                        disabled={!timingLimitEnabled}
                                    />
                                    <span>minutes</span>
                                </div>
                                <label className="flex items-center gap-1 mt-1">
                                    <input type="checkbox" checked={timingLimitEnabled} onChange={e => setTimingLimitEnabled(e.target.checked)} /> Enable
                                </label>
                                <span className="text-xs text-gray-500">If enabled, students have only this much time to finish the quiz after starting. When the timer hits 0, answers are auto-submitted.</span>
                            </div>
                        </div>
                    )}
                </div>
                {/* Question Behaviour Collapsible Section */}
                <div className="border rounded mb-2">
                    <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 font-semibold text-left text-lg focus:outline-none"
                        onClick={() => setShowQuestionBehaviour(v => !v)}
                    >
                        <span>Question Behaviour</span>
                        <span>{showQuestionBehaviour ? '▲' : '▼'}</span>
                    </button>
                    {showQuestionBehaviour && (
                        <div className="px-4 pb-4 pt-2 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Shuffle within questions</label>
                    <select
                        className="border rounded px-2 py-1 w-full"
                                    value={shuffleQuestions}
                                    onChange={e => setShuffleQuestions(e.target.value)}
                    >
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                    </select>
                </div>
                        </div>
                    )}
                </div>
                {/* Safe Exam Browser Collapsible Section */}
                <div className="border rounded mb-2">
                    <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 font-semibold text-left text-lg focus:outline-none"
                        onClick={() => setShowSafeExam(v => !v)}
                    >
                        <span>Safe Exam Browser</span>
                        <span>{showSafeExam ? '▲' : '▼'}</span>
                    </button>
                    {showSafeExam && (
                        <div className="px-4 pb-4 pt-2 flex flex-col gap-4">
                <div>
                                <label className="block text-sm font-medium mb-1">Require the use of Safe Exam Browser</label>
                                <select
                                    className="border rounded px-2 py-1 w-full"
                                    value={safeExamRequired}
                                    onChange={e => setSafeExamRequired(e.target.value)}
                                >
                                    <option>No</option>
                                    <option>Yes</option>
                                </select>
                </div>
            </div>
                    )}
                </div>
                {/* Grading Collapsible Section */}
                <div className="border rounded mb-2">
                    <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 font-semibold text-left text-lg focus:outline-none"
                        onClick={() => setShowGrading(v => !v)}
                    >
                        <span>Grading</span>
                        <span>{showGrading ? '▲' : '▼'}</span>
                    </button>
                    {showGrading && (
                        <div className="px-4 pb-4 pt-2 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Grade to pass</label>
                                <input
                                    type="number"
                                    min={0}
                                    className="border rounded px-2 py-1 w-full"
                                    value={gradeToPass}
                                    onChange={e => setGradeToPass(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Attempts allowed</label>
                                <select
                                    className="border rounded px-2 py-1 w-full"
                                    value={attemptsAllowed}
                                    onChange={e => setAttemptsAllowed(e.target.value)}
                                >
                                    <option value="Unlimited">Unlimited</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                </select>
                            </div>
                        </div>
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
            {/* Lightbox Modal */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
                    onClick={() => setLightboxImage(null)}
                    style={{ cursor: 'zoom-out' }}
                >
                    <div
                        className="relative max-w-3xl w-full flex flex-col items-center"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-2 right-2 text-white bg-black/60 rounded-full p-2 hover:bg-black/80 text-2xl font-bold z-10"
                            onClick={() => setLightboxImage(null)}
                            aria-label="Close"
                        >
                            ×
                        </button>
                        <img
                            src={lightboxImage}
                            alt="Zoomed Question"
                            className="max-h-[80vh] max-w-full rounded shadow-lg border-4 border-white"
                            style={{ objectFit: 'contain' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}