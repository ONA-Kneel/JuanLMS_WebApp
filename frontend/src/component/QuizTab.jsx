import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function QuizTab({ onClose, onQuizCreated, onPointsChange }) {
    const { classId } = useParams();
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
    });
    const [dueDate, setDueDate] = useState("");
    const [showClassModal, setShowClassModal] = useState(false);
    const [availableClasses, setAvailableClasses] = useState([]);
    const [selectedClassIDs, setSelectedClassIDs] = useState([]);
    const [pendingSavePayload, setPendingSavePayload] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [quizPoints, setQuizPoints] = useState(100);
    const [environment, setEnvironment] = useState('Environment 1');
    const [studentGroup, setStudentGroup] = useState('All students');
    
    // Validation modal state
    const [validationModal, setValidationModal] = useState({
        isOpen: false,
        type: 'error',
        title: '',
        message: ''
    });

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
                    setQuizPoints(data.points || 100);
                    
                    // Set questions if they exist
                    if (data.questions && Array.isArray(data.questions)) {
                        setQuestions(data.questions);
                    }
                    
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
                    
                    // Set class IDs
                    if (data.classID) {
                        setSelectedClassIDs([data.classID]);
                    } else if (data.classIDs && Array.isArray(data.classIDs)) {
                        setSelectedClassIDs(data.classIDs);
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

    const handleAddOrUpdate = () => {
        // Validate question form
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
        });
    };

    const handleDelete = idx => setQuestions(questions.filter((_, i) => i !== idx));
    const handleDuplicate = idx => setQuestions([...questions, { ...questions[idx] }]);

    const handleSave = async () => {
        // Validate required fields
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

        if (quizPoints < 1 || quizPoints > 100) {
            setValidationModal({
                isOpen: true,
                type: 'warning',
                title: 'Invalid Points',
                message: 'Points must be between 1 and 100.'
            });
            return;
        }

        const token = localStorage.getItem('token');
        const userRole = localStorage.getItem('role');
        const payload = {
            classID: classId,
            title,
            instructions: description,
            type: 'quiz',
            description,
            points: quizPoints,
            questions,
        };
        if (dueDate) {
            const isoDueDate = new Date(dueDate).toISOString();
            if (!isNaN(Date.parse(isoDueDate))) {
                payload.dueDate = isoDueDate;
            }
        }
        // If faculty, show class selection modal before saving
        if (userRole === 'faculty') {
            setPendingSavePayload(payload);
            // Fetch classes if not already fetched
            if (availableClasses.length === 0) {
                fetch(`${API_BASE}/classes/my-classes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(res => res.json())
                    .then(data => setAvailableClasses(Array.isArray(data) ? data : []));
            }
            setShowClassModal(true);
            return;
        }
        // For non-faculty, just save (should not happen with current routing)
        await actuallySave(payload);
    };

    const actuallySave = async (payload) => {
        const token = localStorage.getItem('token');
        if (selectedClassIDs.length > 0) {
            payload.classIDs = selectedClassIDs;
        }
        try {
            const url = isEditMode ? `${API_BASE}/assignments/${editAssignmentId}` : `${API_BASE}/assignments`;
            const method = isEditMode ? 'PUT' : 'POST';
            
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
                onClose && onClose();
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
        <div className="flex flex-row p-0">
            {/* Main Content */}
            <div className="flex-1">
                <div className="bg-white rounded-t-xl px-8 pt-8 pb-4 border-b">
                    <input
                        className="text-2xl font-bold w-full mb-2 border-b focus:outline-none focus:border-blue-600 bg-transparent"
                        placeholder={isEditMode ? "Quiz title" : "Untitled quiz"}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                    <textarea
                        className="w-full mb-2 border-b focus:outline-none focus:border-blue-400 bg-transparent min-h-[80px] resize-y"
                        placeholder="Instructions (optional)"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                    {isEditMode && (
                        <p className="text-gray-600 text-sm">You are editing an existing quiz. Changes will be saved when you click "Save Quiz".</p>
                    )}
                </div>
                <div className="px-8 py-6 bg-gray-50 min-h-[60vh]">
                    {questions.map((q, idx) => (
                        <div key={idx} className="bg-white rounded-xl shadow border border-gray-200 mb-8 p-6 relative">
                            <div className="flex gap-2 items-center mb-2">
                                <span className="text-lg font-semibold">{idx + 1}.</span>
                                <span className="font-bold">{q.question}</span>
                                <span className="ml-2 text-xs text-gray-500">({q.type}, {q.points} pt{q.points > 1 ? 's' : ''})</span>
                                {q.required && <span className="ml-2 text-xs text-red-600">*</span>}
                            </div>
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
                    {/* --- QUESTION FORM --- */}
                    <div className="bg-white rounded-xl shadow border border-blue-200 p-6 max-w-2xl mx-auto">
                        <div className="flex gap-4 mb-2">
                            <input
                                className="flex-1 border-b text-lg font-semibold focus:outline-none focus:border-blue-600 bg-transparent"
                                placeholder="Question"
                                value={form.question}
                                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                            />
                            <select
                                className="border rounded px-2 py-1"
                                value={form.type}
                                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                            >
                                <option value="multiple">Multiple choice</option>
                                <option value="truefalse">True or False</option>
                                <option value="identification">Identification</option>
                            </select>
                        </div>
                        <div className="mb-2">
                            <label className="block text-sm font-medium mb-1">Points</label>
                            <input
                                type="number"
                                min={1}
                                className="border rounded px-2 py-1 w-20"
                                value={form.points}
                                onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))}
                            />
                        </div>
                        {form.type === "multiple" && (
                            <div className="mb-2">
                                <label className="block text-sm font-medium mb-1">Choices</label>
                                {form.choices.map((choice, idx) => (
                                    <div key={idx} className="flex items-center gap-2 mb-1">
                                        <input
                                            className="border rounded px-2 py-1 flex-1"
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
                                        /> Correct
                                        <button type="button" className="text-red-600" onClick={() => setForm(f => ({ ...f, choices: f.choices.filter((_, i) => i !== idx), correctAnswers: f.correctAnswers.filter(i => i !== idx) }))}>Remove</button>
                                    </div>
                                ))}
                                <button type="button" className="bg-gray-200 px-2 py-1 rounded mt-1" onClick={() => setForm(f => ({ ...f, choices: [...f.choices, ""] }))}>Add Option</button>
                            </div>
                        )}
                        {form.type === "truefalse" && (
                            <div className="mb-2">
                                <label className="block text-sm font-medium mb-1">Correct Answer</label>
                                <select
                                    className="border rounded px-2 py-1"
                                    value={form.trueFalseAnswer ? "true" : "false"}
                                    onChange={e => setForm(f => ({ ...f, trueFalseAnswer: e.target.value === "true" }))}
                                >
                                    <option value="true">True</option>
                                    <option value="false">False</option>
                                </select>
                            </div>
                        )}
                        {form.type === "identification" && (
                            <div className="mb-2">
                                <label className="block text-sm font-medium mb-1">Correct Answer</label>
                                <input
                                    className="border rounded px-2 py-1 w-full"
                                    value={form.identificationAnswer}
                                    onChange={e => setForm(f => ({ ...f, identificationAnswer: e.target.value }))}
                                />
                            </div>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.required}
                                    onChange={e => setForm(f => ({ ...f, required: e.target.checked }))}
                                />
                                Required
                            </label>
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
                </div>
                <div className="flex gap-2 mt-4 px-8 pb-8">
                    <button className="bg-green-600 text-white px-6 py-2 rounded" onClick={handleSave}>
                        {isEditMode ? 'Update Quiz' : 'Save Quiz'}
                    </button>
                    <button className="bg-gray-500 text-white px-6 py-2 rounded" onClick={onClose}>Cancel</button>
                </div>
                {/* Class selection modal */}
                {showClassModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full relative">
                            <button
                                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold"
                                onClick={() => setShowClassModal(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                            <h3 className="text-xl font-bold mb-4">Assign to Classes</h3>
                            <select
                                multiple
                                className="w-full border rounded px-3 py-2 h-32 mb-4"
                                value={selectedClassIDs}
                                onChange={e => setSelectedClassIDs(Array.from(e.target.selectedOptions).map(opt => opt.value))}
                            >
                                {availableClasses.map(cls => (
                                    <option key={cls._id} value={cls.classID}>{cls.className || cls.name}</option>
                                ))}
                            </select>
                            <button
                                className="bg-blue-900 text-white px-4 py-2 rounded w-full"
                                onClick={async () => {
                                    setShowClassModal(false);
                                    await actuallySave({ ...pendingSavePayload, classIDs: selectedClassIDs });
                                }}
                                disabled={selectedClassIDs.length === 0}
                            >
                                Assign & Save
                            </button>
                        </div>
                    </div>
                )}
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
            <div className="w-80 min-w-[320px] bg-white border-l px-6 py-8 flex flex-col gap-6">
                <div>
                    <label className="block text-sm font-medium mb-1">Points</label>
                    <input
                        type="number"
                        min={1}
                        className="border rounded px-2 py-1 w-full"
                        value={quizPoints}
                        onChange={e => setQuizPoints(Number(e.target.value))}
                    />
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
                    <label className="block text-sm font-medium mb-1">For</label>
                    <select
                        className="border rounded px-2 py-1 w-full mb-2"
                        value={environment}
                        onChange={e => setEnvironment(e.target.value)}
                    >
                        <option value="Environment 1">Environment 1</option>
                        <option value="Environment 2">Environment 2</option>
                    </select>
                    <select
                        className="border rounded px-2 py-1 w-full"
                        value={studentGroup}
                        onChange={e => setStudentGroup(e.target.value)}
                    >
                        <option value="All students">All students</option>
                        <option value="Group A">Group A</option>
                        <option value="Group B">Group B</option>
                    </select>
                </div>
                <div>
                    <button type="button" className="border border-gray-400 rounded px-4 py-2 w-full text-left hover:bg-gray-100">+ Rubric</button>
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