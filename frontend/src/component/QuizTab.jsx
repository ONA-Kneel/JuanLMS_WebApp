import { useState } from "react";
import { useParams } from "react-router-dom";

export default function QuizTab({ onClose }) {
    const { classId } = useParams();
    const [activityType, setActivityType] = useState("quiz"); // 'quiz' or 'assignment'
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [questions, setQuestions] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
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
    const [requireFileUpload, setRequireFileUpload] = useState(false);
    const [allowedFileTypes, setAllowedFileTypes] = useState(".pdf,.zip,.docx");
    const [fileInstructions, setFileInstructions] = useState("");
    const [dueDate, setDueDate] = useState("");

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

    const handleAddOrUpdate = () => {
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
        const token = localStorage.getItem('token');
        const payload = {
            classID: classId,
            title,
            instructions: description,
            type: activityType,
            description,
            points: questions.reduce((sum, q) => sum + (q.points || 0), 0),
            fileUploadRequired: requireFileUpload,
            allowedFileTypes,
            fileInstructions,
            questions: activityType === 'quiz' ? questions : undefined,
        };
        if (dueDate) {
            const isoDueDate = new Date(dueDate).toISOString();
            if (!isNaN(Date.parse(isoDueDate))) {
                payload.dueDate = isoDueDate;
            }
        }
        try {
            const res = await fetch('http://https://juanlms-webapp-server.onrender.com/assignments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert(`${activityType === 'quiz' ? 'Quiz' : 'Assignment'} saved!`);
                onClose && onClose();
            } else {
                const err = await res.json();
                alert('Failed to save: ' + (err.error || res.status));
            }
        } catch {
            alert('Failed to save (network error)');
        }
    };

    return (
        <div className="p-0">
            <div className="bg-white rounded-t-xl px-8 pt-8 pb-4 border-b">

                <input
                    className="text-2xl font-bold w-full mb-2 border-b focus:outline-none focus:border-blue-600 bg-transparent"
                    placeholder={activityType === "quiz" ? "Untitled quiz" : "Untitled assignment"}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />
                <input
                    className="w-full mb-2 border-b focus:outline-none focus:border-blue-400 bg-transparent"
                    placeholder="Description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                />

                <div className="flex gap-4 items-center mb-4">
                    <select
                        className="border rounded px-3 py-2 text-sm font-semibold bg-gray-50  "
                        value={activityType}
                        onChange={e => setActivityType(e.target.value)}
                    >
                        <option value="quiz">Quiz/Questionnaire</option>
                        <option value="assignment">Assignment</option>
                    </select>
                    <span className="text-gray-400">Choose activity type</span>
                </div>
            </div>
            <div className="px-8 py-6 bg-gray-50 min-h-[60vh]">
                {activityType === "quiz" && (
                    <>
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
                    </>
                )}
                {/* --- FILE UPLOAD REQUIREMENT (like Teams) --- */}
                <div className="bg-white rounded-xl shadow border border-purple-200 p-6 max-w-2xl mx-auto mt-8">
                    <label className="flex items-center gap-2 mb-2">
                        <input type="checkbox" checked={requireFileUpload} onChange={e => setRequireFileUpload(e.target.checked)} />
                        <span className="font-semibold">Require file upload (e.g., project, code, document)</span>
                    </label>
                    {requireFileUpload && (
                        <div className="space-y-2 mt-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Allowed file types</label>
                                <input className="border rounded px-2 py-1 w-full" value={allowedFileTypes} onChange={e => setAllowedFileTypes(e.target.value)} placeholder="e.g. .pdf,.zip,.docx" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">File upload instructions (optional)</label>
                                <textarea className="border rounded px-2 py-1 w-full" value={fileInstructions} onChange={e => setFileInstructions(e.target.value)} placeholder="Describe what students should upload..." />
                            </div>
                        </div>
                    )}
                </div>
                {/* --- DUE DATE FOR ASSIGNMENT TYPE --- */}
                {activityType === "assignment" && (
                    <div className="bg-white rounded-xl shadow border border-gray-200 p-6 max-w-2xl mx-auto mt-8">
                        <label className="block text-sm font-medium mb-1">Due Date</label>
                        <input
                            type="datetime-local"
                            className="border rounded px-2 py-1 w-full"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                        />
                    </div>
                )}
            </div>
            <div className="flex gap-2 mt-4 px-8 pb-8">
                <button className="bg-green-600 text-white px-6 py-2 rounded" onClick={handleSave}>Save {activityType === "quiz" ? "Quiz" : "Assignment"}</button>
                <button className="bg-gray-500 text-white px-6 py-2 rounded" onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
} 