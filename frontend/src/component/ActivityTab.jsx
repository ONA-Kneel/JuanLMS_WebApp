import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function ActivityTab({ onAssignmentCreated }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const classId = searchParams.get('classId');
    const editAssignmentId = searchParams.get('edit');
    const duplicateAssignmentId = searchParams.get('duplicate');
    const activityType = searchParams.get('type') || 'written'; // Default to 'written' if not specified
    
    // Get quarter parameters from URL
    const quarterFromUrl = searchParams.get('quarter');
    const termNameFromUrl = searchParams.get('termName');
    const academicYearFromUrl = searchParams.get('academicYear');
    
    // Quarter display state
    const [currentQuarter, setCurrentQuarter] = useState(null);
    
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
    const [isDuplicateMode, setIsDuplicateMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [tempClassStudentMap, setTempClassStudentMap] = useState({});
    
    // Add academic year and term states
    const [academicYear, setAcademicYear] = useState(null);
    const [currentTerm, setCurrentTerm] = useState(null);
    
    // Validation modal state
    const [validationModal, setValidationModal] = useState({
        isOpen: false,
        type: 'error',
        title: '',
        message: ''
    });

    // Fetch academic year and term
    useEffect(() => {
        async function fetchAcademicYear() {
            try {
                const token = localStorage.getItem("token");
                const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (yearRes.ok) {
                    const year = await yearRes.json();
                    setAcademicYear(year);
                }
            } catch (error) {
                console.error('Error fetching academic year:', error);
            }
        }
        fetchAcademicYear();
    }, []);

    useEffect(() => {
        async function fetchActiveTermForYear() {
            if (!academicYear) return;
            try {
                const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
                const token = localStorage.getItem("token");
                const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const terms = await res.json();
                    const active = terms.find(term => term.status === 'active');
                    setCurrentTerm(active || null);
                } else {
                    setCurrentTerm(null);
                }
            } catch {
                setCurrentTerm(null);
            }
        }
        fetchActiveTermForYear();
    }, [academicYear]);

    // Fetch available classes on mount - updated to filter by term and show only active classes
    useEffect(() => {
        async function fetchAvailableClasses() {
            if (!academicYear || !currentTerm) return;
            
            try {
                const token = localStorage.getItem('token');
                
                const res = await fetch(`${API_BASE}/classes/faculty-classes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    
                    // Filter classes: only show active classes for current term (faculty filtering already done by backend)
                    const filteredClasses = data.filter(cls => 
                        cls.isArchived !== true &&
                        cls.academicYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` &&
                        cls.termName === currentTerm.termName
                    );
                    
                    setAvailableClasses(filteredClasses);
                    
                    // Auto-select class from URL if classId is provided
                    if (classId && filteredClasses.length > 0) {
                        console.log('Looking for classId:', classId);
                        console.log('Available classes:', filteredClasses.map(c => ({ classID: c.classID, className: c.className })));
                        const foundClass = filteredClasses.find(cls => cls.classID === classId);
                        if (foundClass) {
                            console.log('Found class:', foundClass);
                            setSelectedClassIDs([foundClass.classID]);
                        } else {
                            console.log('Class not found with classId:', classId);
                        }
                    }
                } else {
                    setAvailableClasses([]);
                }
            } catch (error) {
                console.error('Error fetching classes:', error);
                setAvailableClasses([]);
            }
        }
        
        fetchAvailableClasses();
    }, [academicYear, currentTerm, classId]);

    // Fetch current active quarter when academic year and term are available
    useEffect(() => {
        async function fetchCurrentQuarter() {
            if (!academicYear || !currentTerm) return;
            
            try {
                const token = localStorage.getItem('token');
                const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
                const response = await fetch(`${API_BASE}/api/quarters/schoolyear/${schoolYearName}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const quarters = await response.json();
                    // Find the active quarter for current term
                    const activeQuarter = quarters.find(q => 
                        q.termName === currentTerm.termName && 
                        q.status === 'active'
                    );
                    if (activeQuarter) {
                        // Normalize quarter name to handle both formats
                        const normalizedQuarter = {
                            ...activeQuarter,
                            quarterName: activeQuarter.quarterName === 'Q1' ? 'Quarter 1' :
                                        activeQuarter.quarterName === 'Q2' ? 'Quarter 2' :
                                        activeQuarter.quarterName === 'Q3' ? 'Quarter 3' :
                                        activeQuarter.quarterName === 'Q4' ? 'Quarter 4' :
                                        activeQuarter.quarterName
                        };
                        setCurrentQuarter(normalizedQuarter);
                    }
                }
            } catch (error) {
                console.error('Error fetching current quarter:', error);
            }
        }
        
        fetchCurrentQuarter();
    }, [academicYear, currentTerm]);

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

    // Handle duplicate assignment
    useEffect(() => {
        if (duplicateAssignmentId) {
            setIsDuplicateMode(true);
            setLoading(true);
            const token = localStorage.getItem('token');
            
            fetch(`${API_BASE}/assignments/${duplicateAssignmentId}`, {
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
                    // Pre-fill form with original assignment data
                    setTitle(data.title ? `${data.title} (Copy)` : "");
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
                    
                    // Don't copy post date for duplicates - let it be posted immediately
                    setSchedulePost(false);
                    setPostAt("");
                    
                    // Set class ID from URL parameter (the target class for duplication)
                    if (classId) {
                        setSelectedClassIDs([classId]);
                    }
                })
                .catch(err => {
                    let errorMessage = 'Failed to load assignment data for duplication. Please try again.';
                    
                    if (err.message.includes('404')) {
                        errorMessage = 'Original assignment not found. It may have been deleted.';
                    } else if (err.message.includes('403')) {
                        errorMessage = 'You do not have permission to duplicate this assignment.';
                    } else if (err.message.includes('401')) {
                        errorMessage = 'Your session has expired. Please log in again.';
                    }
                    
                    setValidationModal({
                        isOpen: true,
                        type: 'error',
                        title: 'Duplicate Failed',
                        message: errorMessage
                    });
                })
                .finally(() => setLoading(false));
        }
    }, [duplicateAssignmentId, classId]);

    // Fetch students for each selected class
    useEffect(() => {
        const token = localStorage.getItem('token');
        selectedClassIDs.forEach(classID => {
            if (!classStudentMap[classID]) {
                // Primary: members endpoint
                fetch(`${API_BASE}/classes/${classID}/members`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(async res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.json();
                    })
                    .then(async data => {
                        let students = Array.isArray(data.students) ? data.students : [];

                        // Fallback #1: use class code against students-by-class endpoint
                        if (!students.length) {
                            const cls = availableClasses.find(c => c.classID === classID);
                            const classCode = cls?.classCode || cls?.classID || classID;
                            try {
                                const altRes = await fetch(`${API_BASE}/api/students/class/${classCode}`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (altRes.ok) {
                                    const alt = await altRes.json();
                                    if (Array.isArray(alt)) students = alt;
                                }
                            } catch (error) {
                                console.error('Alternative member fetch failed:', error);
                            }
                        }

                        // Fallback #2: if class has raw member IDs, map them from users directory
                        if (!students.length) {
                            try {
                                const classesRes = await fetch(`${API_BASE}/classes/faculty-classes`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (classesRes.ok) {
                                    const classesList = await classesRes.json();
                                    const found = Array.isArray(classesList)
                                        ? classesList.find(c => String(c.classID) === String(classID))
                                        : null;
                                    if (found && Array.isArray(found.members) && found.members.length) {
                                        const usersRes = await fetch(`${API_BASE}/users?page=1&limit=1000`, {
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        if (usersRes.ok) {
                                            const payload = await usersRes.json();
                                            const list = Array.isArray(payload?.users) ? payload.users : (Array.isArray(payload) ? payload : []);
                                            const getIds = (u) => {
                                                const ids = [];
                                                if (u?.userID) ids.push(String(u.userID));
                                                if (u?.schoolID) ids.push(String(u.schoolID));
                                                if (u?._id && typeof u._id === 'object' && u._id.$oid) ids.push(String(u._id.$oid));
                                                if (u?._id && typeof u._id !== 'object') ids.push(String(u._id));
                                                if (u?.id) ids.push(String(u.id));
                                                return Array.from(new Set(ids.filter(Boolean)));
                                            };
                                            const targetIds = found.members.map(v => String(v));
                                            students = list.filter(u => (u.role || '').toLowerCase() === 'students')
                                                .filter(u => getIds(u).some(v => targetIds.includes(v)));
                                        }
                                    }
                                }
                            } catch (error) {
                                console.error('Fallback class fetch failed:', error);
                            }
                        }

                        setClassStudentMap(prev => ({
                            ...prev,
                            [classID]: { students, selected: 'all' }
                        }));
                    })
                    .catch(() => {
                        // On error, ensure entry exists to avoid UI stall
                        setClassStudentMap(prev => ({
                            ...prev,
                            [classID]: { students: [], selected: 'all' }
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

    const _handleStudentSelection = (classID, typeOrId) => {
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

    const _handleStudentTypeChange = (classID, value) => {
        setClassStudentMap(prev => ({
            ...prev,
            [classID]: { ...prev[classID], selected: value === 'all' ? 'all' : [] }
        }));
    };

    const handleOpenStudentModal = () => {
        // Copy current state to temp state
        setTempClassStudentMap(JSON.parse(JSON.stringify(classStudentMap)));
        setShowStudentModal(true);
    };

    const handleCloseStudentModal = () => {
        // Discard changes and close modal
        setShowStudentModal(false);
    };

    const handleSaveStudentModal = () => {
        // Save changes and close modal
        setClassStudentMap(JSON.parse(JSON.stringify(tempClassStudentMap)));
        setShowStudentModal(false);
    };

    const handleTempStudentSelection = (classID, typeOrId) => {
        setTempClassStudentMap(prev => {
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

    const handleTempStudentTypeChange = (classID, value) => {
        setTempClassStudentMap(prev => ({
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
            activityType: activityType,
            description,
            points: activityPoints,
            // attachmentDrive removed
            attachmentLink,
            // Add quarter parameters (convert to short format for backend)
            quarter: (() => {
                const quarterName = currentQuarter?.quarterName || quarterFromUrl || 'Quarter 1';
                return quarterName === 'Quarter 1' ? 'Q1' :
                       quarterName === 'Quarter 2' ? 'Q2' :
                       quarterName === 'Quarter 3' ? 'Q3' :
                       quarterName === 'Quarter 4' ? 'Q4' :
                       quarterName;
            })(),
            termName: currentTerm?.termName || termNameFromUrl || 'Term 1',
            academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : academicYearFromUrl || '2024-2025',
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
        } catch (error) {
            console.error('Network error:', error);
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
                <h1 className="text-2xl font-bold mb-8 font-poppins">
                    {isEditMode ? 'Edit Assignment' : isDuplicateMode ? 'Duplicate Assignment' : 'Create an Assignment'}
                </h1>
                
                {/* Quarter Indicator */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">
                        Creating assignment for: <span className="font-semibold">
                            {currentQuarter ? currentQuarter.quarterName : 'Loading...'} - {currentTerm?.termName || 'Loading...'}
                        </span>
                        <span className="text-blue-600 ml-2">({academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Loading...'})</span>
                    </p>
                    {currentQuarter && (
                        <p className="text-xs text-blue-600 mt-1">
                            Quarter Period: {new Date(currentQuarter.startDate).toLocaleDateString()} - {new Date(currentQuarter.endDate).toLocaleDateString()}
                        </p>
                    )}
                </div>
                
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
                                {isEditMode ? 'Assignment Updated!' : isDuplicateMode ? 'Assignment Duplicated!' : 'Activity/Quiz Created!'}
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
                                 <div className="relative">
                     <label className="block text-sm font-medium mb-1 font-poppins">Points</label>
                     <div className="border rounded px-2 py-1 w-full font-poppins bg-white cursor-pointer" onClick={() => setShowPointsDropdown(!showPointsDropdown)}>
                         <div className="flex justify-between items-center">
                             <span>{activityPoints}</span>
                             <span className="text-gray-500">▼</span>
                         </div>
                     </div>
                     {showPointsDropdown && (
                         <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-96 overflow-y-auto">
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
                    <label className="block text-sm font-medium mb-1 font-poppins">Class</label>
                    {selectedClassIDs.length > 0 && availableClasses.length > 0 ? (
                        <div className="p-3 border rounded bg-gray-50">
                            {selectedClassIDs.map(classID => {
                                const cls = availableClasses.find(c => c.classID === classID);
                                const entry = classStudentMap[classID];
                                if (!cls) return null;
                                return (
                                    <div key={classID} className="mb-3">
                                        <div className="font-semibold font-poppinsr">
                                            {cls.className || cls.name}
                                        </div>
                                        <div className="text-xs text-gray-700 font-poppinsr mb-2">
                                            {cls.section || cls.classCode || 'N/A'}
                                        </div>
                                        
                                        {/* Student Selection Status */}
                                        {entry && (
                                            <div className="mb-2">
                                                {entry.selected === 'all' ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                                            All Students
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs text-gray-600 font-medium">Selected Students:</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {entry.selected && Array.isArray(entry.selected) && entry.selected.length > 0 ? (
                                                                entry.selected.map(studentId => {
                                                                    const student = entry.students.find(s => (s.userID || s._id) === studentId);
                                                                    return student ? (
                                                                        <span 
                                                                            key={studentId}
                                                                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium"
                                                                        >
                                                                            {student.firstname} {student.lastname}
                                                                        </span>
                                                                    ) : null;
                                                                })
                                                            ) : (
                                                                <span className="text-xs text-gray-500 italic">No students selected</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        <button
                                            type="button"
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-poppins text-sm"
                                            onClick={handleOpenStudentModal}
                                        >
                                            {entry ? 'Edit Students' : 'Select Students'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-3 border rounded bg-gray-100 text-gray-500 text-center">
                            No class selected
                        </div>
                    )}
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
            {/* Student Selection Modal */}
            {showStudentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4 text-blue-900">Select Students</h3>
                        {selectedClassIDs.map(classID => {
                            const entry = tempClassStudentMap[classID] || classStudentMap[classID];
                            const cls = availableClasses.find(c => c.classID === classID);
                            if (!entry || !cls) return null;
                            return (
                                <div key={classID} className="mb-6 p-4 border rounded bg-gray-50">
                                    <div className="font-semibold font-poppinsr mb-3">
                                        {cls.className || cls.name} <span className="text-xs text-gray-700 font-poppinsr">({cls.section || cls.classCode || 'N/A'})</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="font-semibold font-poppinsr">Assign to:</span>
                                        <select
                                            className="border rounded px-2 py-1 font-poppinsr"
                                            value={entry.selected === 'all' ? 'all' : 'specific'}
                                            onChange={e => handleTempStudentTypeChange(classID, e.target.value)}
                                        >
                                            <option value="all">All students</option>
                                            <option value="specific">Specific students</option>
                                        </select>
                                    </div>
                                    {entry.selected !== 'all' && (
                                        <div className="max-h-60 overflow-y-auto">
                                            <div className="grid grid-cols-1 gap-2">
                                                {entry.students.map(stu => (
                                                    <label key={stu.userID || stu._id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-100 rounded">
                                                        <input
                                                            type="checkbox"
                                                            checked={Array.isArray(entry.selected) && entry.selected.includes(stu.userID || stu._id)}
                                                            onChange={() => handleTempStudentSelection(classID, stu.userID || stu._id)}
                                                        />
                                                        <span className="text-base font-medium">{stu.firstname} {stu.lastname}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div className="flex gap-2 justify-end mt-4">
                            <button 
                                className="bg-gray-300 text-gray-800 px-4 py-2 rounded" 
                                onClick={handleCloseStudentModal}
                            >
                                Cancel
                            </button>
                            <button 
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" 
                                onClick={handleSaveStudentModal}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
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