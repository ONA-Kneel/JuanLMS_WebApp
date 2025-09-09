import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import seedrandom from 'seedrandom';
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function QuizView() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [studentInfo, setStudentInfo] = useState({ name: '', section: '' });
  const [showIntro, setShowIntro] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreData, setScoreData] = useState(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [timeWarned, setTimeWarned] = useState(false);
  const [showUnansweredModal, setShowUnansweredModal] = useState(false);
  const [unansweredNumbers, setUnansweredNumbers] = useState([]);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });
  const [violationMessage, setViolationMessage] = useState('');
  const violationCountRef = useRef(0);
  const [violationEvents, setViolationEvents] = useState([]); // {question: number, time: ISO string}
  const [questionTimes, setQuestionTimes] = useState([]); // seconds spent per question
  const questionStartTimeRef = useRef(Date.now());
  const [timerStarted, setTimerStarted] = useState(false); // Track if timer has started
  const timerStartTimeRef = useRef(null); // Track when timer actually started
  const [lightboxImage, setLightboxImage] = useState(null); // For image zoom modal

  // Fetch quiz details
  useEffect(() => {
  const token = localStorage.getItem('token');

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      // 🔐 Decode token to get student ID
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const studentId = tokenData._id || tokenData.id;

      // 🔀 Shuffle the questions using seedrandom (based on student + quiz)
      const rng = seedrandom(`${quizId}-${studentId}`);
      const shuffledQuestions = [...data.questions];
      for (let i = shuffledQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
      }
      data.questions = shuffledQuestions;

      setQuiz(data);
      setAnswers(Array(data.questions.length).fill(null));
      setLoading(false);

      // Debug: Log timing data

      // 🕒 Handle quiz time limit
      if (data.timing && data.timing.timeLimitEnabled && data.timing.timeLimit) {
        setTimeLeft(data.timing.timeLimit * 60);
        setTimeWarned(false); // Reset warning flag on new quiz load
      } else {
        // Timer not enabled or missing data
      }

      // 👤 Set student info
      setStudentInfo({
        name: tokenData.name || '',
        section: tokenData.section || ''
      });

      // ✅ Check for previous submission
      const userId = studentId;
      const subRes = await fetch(`${API_BASE}/api/quizzes/${quizId}/response/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData && subData._id) {
          setAlreadySubmitted(true);
          setSubmitted(true);
        }
      }

    } catch (err) {
      // Error loading quiz
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Quiz Load Failed',
        message: 'Failed to load quiz. Please try again later.'
      });
      setLoading(false);
    }
  };

  fetchQuiz();
}, [quizId]);


  // Timer logic
  useEffect(() => {
    
    // Only start timer when quiz has started (not on intro page) and timer is enabled
    if (!quiz || !quiz.timing || !quiz.timing.timeLimitEnabled || !quiz.timing.timeLimit || submitted || showIntro || !timerStarted) {
      // Timer effect early return
      return;
    }
    if (timeLeft === null || timerStartTimeRef.current === null) {
      // Timer effect: timeLeft or timerStartTime is null
      return;
    }
    
    const totalSeconds = quiz.timing.timeLimit * 60;
    // Timer running
    
    // Calculate elapsed time and update timeLeft based on actual elapsed time
    const updateTimer = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - timerStartTimeRef.current) / 1000);
      const remainingSeconds = totalSeconds - elapsedSeconds;
      
      if (remainingSeconds <= 0) {
        // Time expired, auto-submitting
        setTimeLeft(0);
        autoSubmit(); // Call auto-submit when timer expires
        return;
      }
      
      setTimeLeft(remainingSeconds);
      
      // Show warning modal at 60% elapsed (40% left)
      if (!timeWarned && remainingSeconds <= totalSeconds * 0.4 && remainingSeconds > 0) {
        // Showing time warning modal
        setShowTimeWarning(true);
        setTimeWarned(true);
      }
    };
    
    // Update timer immediately
    updateTimer();
    
    // Set up interval to update timer every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [quiz, submitted, timeWarned, quiz?.timing?.timeLimit, quiz?.timing?.timeLimitEnabled, timerStarted, showIntro, timeLeft]);

  // Track time spent per question
  useEffect(() => {
    if (!quiz || !quiz.questions) return;
    // Initialize questionTimes if not set
    if (questionTimes.length !== quiz.questions.length) {
      setQuestionTimes(Array(quiz.questions.length).fill(0));
    }
    // Reset start time when quiz loads
    questionStartTimeRef.current = Date.now();
    // eslint-disable-next-line
  }, [quiz]);
  // When current question changes, record time spent on previous question
  useEffect(() => {
    if (!quiz || !quiz.questions) return;
    if (current === 0) {
      questionStartTimeRef.current = Date.now();
      return;
    }
    setQuestionTimes(prev => {
      const now = Date.now();
      const prevTimes = [...prev];
      const prevIdx = current - 1;
      if (prevIdx >= 0) {
        prevTimes[prevIdx] += Math.floor((now - questionStartTimeRef.current) / 1000);
      }
      questionStartTimeRef.current = now;
      return prevTimes;
    });
    // eslint-disable-next-line
  }, [current]);
  // On quiz submit, record time for last question
  const recordLastQuestionTime = () => {
    if (!quiz || !quiz.questions) return;
    setQuestionTimes(prev => {
      const now = Date.now();
      const prevTimes = [...prev];
      prevTimes[current] += Math.floor((now - questionStartTimeRef.current) / 1000);
      return prevTimes;
    });
  };

  // Check quiz availability
  const isAvailable = () => {
    if (!quiz) return false;
    const now = new Date();
    if (quiz.timing?.open && new Date(quiz.timing.open) > now) return false;
    if (quiz.timing?.close && new Date(quiz.timing.close) < now) return false;
    return true;
  };

  const handleChange = (idx, value) => {
    setAnswers(ans => ans.map((a, i) => (i === idx ? value : a)));
  };

  // Function to start the quiz and timer
  const handleStartQuiz = () => {
    // Starting quiz and timer
    setShowIntro(false);
    setTimerStarted(true);
    timerStartTimeRef.current = Date.now(); // Record when timer actually started
    // Reset question start time when quiz begins
    questionStartTimeRef.current = Date.now();
  };

  // Canvas-style monitoring: focus loss/tab switch - ONLY WHEN QUIZ IS ACTIVE
  useEffect(() => {
    // Don't monitor if quiz is already submitted
    if (submitted || showIntro) return;
    
    const handleBlur = () => {
      // Record violation event with question number and timestamp
      setViolationEvents(events => [...events, { question: current + 1, time: new Date().toISOString() }]);
      violationCountRef.current += 1;
      setViolationMessage("You have left the quiz window. Your teacher will be notified.");
      setShowViolationModal(true);
      // Optionally, send to backend immediately (for real-time logging)
      /*
      fetch('/api/quiz-violation', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Tab switched', count: violationCountRef.current, quizId }),
        headers: { 'Content-Type': 'application/json' },
      });
      */
    };
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [current, submitted, showIntro]);
  
  // Disable right-click, copy, paste - ONLY WHEN QUIZ IS ACTIVE
  useEffect(() => {
    // Don't restrict if quiz is already submitted
    if (submitted || showIntro) return;
    
    const handleContextMenu = (e) => e.preventDefault();
    const handleCopy = (e) => e.preventDefault();
    const handlePaste = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [submitted, showIntro]);

  const handleSubmit = async () => {
    // Record time for last question
    recordLastQuestionTime();
    
    // Only check for unanswered required questions if timer hasn't expired
    if (quiz.timing?.timeLimitEnabled && quiz.timing?.timeLimit && timeLeft > 0) {
      const unanswered = quiz.questions
        .map((q, i) => (q.required && (answers[i] === null || answers[i] === undefined || answers[i] === "")) ? i + 1 : null)
        .filter(n => n !== null);
      if (unanswered.length > 0) {
        setUnansweredNumbers(unanswered);
        setShowUnansweredModal(true);
        return;
      }
    }
    
    // If we get here, either timer expired or all required questions are answered
    await submitQuiz();
  };

  // Separate function for auto-submit when timer expires (ignores required questions)
  const autoSubmit = async () => {
    // Auto-submitting due to time expiration
    // Record time for last question
    recordLastQuestionTime();
    // Auto-submit regardless of required questions
    await submitQuiz();
  };

  // Common submission logic
  const submitQuiz = async () => {
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          answers: quiz.questions.map((q, i) => ({ questionId: q._id || i, answer: answers[i] !== null && answers[i] !== undefined ? answers[i] : "" })),
          violationCount: violationCountRef.current,
          violationEvents,
          questionTimes
        })
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.error && err.error.includes('already submitted')) {
          setAlreadySubmitted(true);
          setSubmitted(true);
          return;
        }
        throw new Error(err.error || 'Failed to submit quiz.');
      }
      setSubmitted(true);
    } catch (e) {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Submission Failed',
        message: e.message || 'Failed to submit quiz. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Add this function to fetch the score
  const handleViewScore = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${quizId}/myscore`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch score');
      const data = await res.json();
      setScoreData(data);
      setShowScoreModal(true);
    } catch {
      setScoreData({ score: null, total: null, message: "Failed to fetch score." });
      setShowScoreModal(true);
    }
  };

  // Motivational message
  const getMessage = (score, total) => {
    if (score === total) return "Perfect! 🎉 Congratulations, you aced it!";
    if (score >= total * 0.8) return "Great job! Keep up the good work!";
    if (score >= total * 0.5) return "Not bad! Review and try again for a higher score!";
    return "Don't give up! Every attempt is a step closer to success!";
  };

  // Progress bar
  function ProgressBar({ value, max }) {
    return (
      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
        <div className="bg-blue-800 h-3 rounded-full" style={{ width: `${(value / max) * 100}%` }}></div>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center">Loading quiz...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!isAvailable()) {
    // Show open/close times if set
    const openTime = quiz.timing?.open ? new Date(quiz.timing.open) : null;
    const closeTime = quiz.timing?.close ? new Date(quiz.timing.close) : null;
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-50">
        <div className="w-full max-w-xl mx-auto p-10 bg-white rounded-3xl shadow-2xl border-4 border-blue-800 flex flex-col items-center">
          <h2 className="text-3xl font-extrabold mb-4 text-blue-900 text-center">Quiz Not Available</h2>
          <p className="mb-6 text-gray-700 text-lg text-center">This quiz is not available at this time.</p>
          {openTime && (
            <div className="mb-2 text-lg">
              <span className="font-semibold text-blue-800">Opens:</span> <span className="text-gray-800">{openTime.toLocaleString()}</span>
            </div>
          )}
          {closeTime && (
            <div className="mb-2 text-lg">
              <span className="font-semibold text-blue-800">Closes:</span> <span className="text-gray-800">{closeTime.toLocaleString()}</span>
            </div>
          )}
          <button
            className="mt-6 bg-blue-800 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow hover:bg-blue-900 transition"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else window.location.href = '/student_dashboard';
            }}
          >Back to Class</button>
        </div>
      </div>
    );
  }

  // Confirmation card after submission
  if (submitted) return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-50">
      <div className="w-full max-w-2xl mx-auto p-12 bg-white rounded-3xl shadow-2xl border-4 border-blue-800 flex flex-col items-center">
        <h2 className="text-4xl font-extrabold mb-4 text-blue-900 text-center">{quiz.title}</h2>
        <p className="mb-8 text-gray-700 text-xl text-center">Your response has been recorded.</p>
        <button
          className="bg-blue-800 text-white px-8 py-3 rounded-lg text-lg font-semibold mb-4 shadow"
          onClick={handleViewScore}
        >View score</button>
        <button className="text-blue-700 underline text-base font-medium" onClick={() => window.location.href =  '/student_dashboard'}>Back to Dashboard</button>
      </div>
      {/* Score Modal */}
      {showScoreModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center border-2 border-blue-800">
            <h3 className="text-2xl font-bold mb-4 text-blue-900">Your Score</h3>
            {scoreData && scoreData.score != null ? (
              <>
                <div className="text-3xl font-extrabold mb-2">{scoreData.score} / {scoreData.total}</div>
                <div className="text-lg mb-4">{getMessage(scoreData.score, scoreData.total)}</div>
              </>
            ) : (
              <div className="text-red-600 mb-4">Unable to fetch score.</div>
            )}
            <button
              className="mt-2 bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded"
              onClick={() => setShowScoreModal(false)}
            >Close</button>
          </div>
        </div>
      )}
    </div>
  );

  if (alreadySubmitted) return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-50">
      <div className="w-full max-w-2xl mx-auto p-12 bg-white rounded-3xl shadow-2xl border-4 border-blue-800 flex flex-col items-center">
        <h2 className="text-4xl font-extrabold mb-4 text-blue-900 text-center">{quiz.title}</h2>
        <p className="mb-8 text-gray-700 text-xl text-center">You have already submitted this quiz. You cannot submit again.</p>
        <button className="text-blue-700 underline text-base font-medium" onClick={() => window.location.href =  '/student_dashboard'}>Back to Dashboard</button>
      </div>
    </div>
  );

  // Intro page (title, instructions, timer, student info)
  if (showIntro) return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-50">
      <div className="w-full max-w-2xl mx-auto p-12 bg-white rounded-3xl shadow-2xl border-4 border-blue-800 flex flex-col items-center">
        <div className="flex w-full justify-between items-center mb-4">
          <h2 className="text-4xl font-extrabold text-blue-900">{quiz.title}</h2>
          <span className="text-lg text-gray-700 font-semibold">{quiz.points || ''} Points</span>
        </div>
        <div className="mb-6 w-full text-gray-700 text-lg text-left">{quiz.instructions || quiz.description}</div>
        {quiz.timing?.timeLimitEnabled && quiz.timing?.timeLimit && (
          <div className="mb-6 text-xl font-bold text-blue-900">
            Time Limit: {quiz.timing.timeLimit} minutes (Timer will start when you begin the quiz)
          </div>
        )}
        <div className="mb-8 w-full text-sm text-gray-500 text-left">{studentInfo.name} {studentInfo.section && `| ${studentInfo.section}`}</div>
        <button className="bg-blue-800 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow" onClick={handleStartQuiz}>Next</button>
      </div>
    </div>
  );

  const q = quiz.questions[current];

  // 2x2 grid for choices
  function renderChoices() {
    if (q.type === 'multiple' && Array.isArray(q.choices)) {
      return (
        <div className="flex flex-col gap-4 mb-6 w-full font-poppinsr">
          {q.choices.map((choice, idx) => (
            <label key={idx} className="flex items-center gap-3 text-lg">
              <input
                type="radio"
                className="w-5 h-5 accent-blue-800"
                name={`mcq${current}`}
                checked={answers[current] === idx}
                onChange={() => handleChange(current, idx)}
              />
              {choice}
            </label>
          ))}
          </div>
        );
    }
    if (q.type === 'truefalse') {
      return (
        <div className="flex gap-16 mb-6 w-full">
          <label className="flex items-center gap-3 w-1/2 text-lg">
            <input type="radio" className="w-5 h-5 accent-blue-800" name={`tf${current}`} checked={answers[current] === true} onChange={() => handleChange(current, true)} /> True
          </label>
          <label className="flex items-center gap-3 w-1/2 text-lg">
            <input type="radio" className="w-5 h-5 accent-blue-800" name={`tf${current}`} checked={answers[current] === false} onChange={() => handleChange(current, false)} /> False
          </label>
        </div>
      );
    }
    if (q.type === 'identification') {
      return (
        <input
          className="border-2 border-blue-200 rounded-xl px-4 py-3 w-full mb-6 text-lg"
          value={answers[current] || ''}
          onChange={e => handleChange(current, e.target.value)}
        />
      );
    }
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      {/* Timer centered above card */}
      {quiz.timing?.timeLimitEnabled && quiz.timing?.timeLimit && timerStarted && timeLeft !== null && (
        <div className="mb-4 text-2xl font-bold text-blue-900 text-center">Timer: {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
      )}
      {/* Time warning modal */}
      {showTimeWarning && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center border-2 border-yellow-500">
            <h3 className="text-2xl font-bold mb-4 text-yellow-700">Time is more than halfway done!</h3>
            <div className="text-lg mb-4">You have used 60% of your time. Please review and submit your answers soon.</div>
            <button
              className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded"
              onClick={() => setShowTimeWarning(false)}
            >OK</button>
          </div>
        </div>
      )}
      {/* Unanswered required questions modal */}
      {showUnansweredModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center border-2 border-red-500">
            <h3 className="text-2xl font-bold mb-4 text-red-700">Required Questions Not Answered</h3>
            <div className="text-lg mb-4">Please answer the following required question(s):<br/> {unansweredNumbers.join(", ")}</div>
            <button
              className="mt-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded"
              onClick={() => setShowUnansweredModal(false)}
            >OK</button>
          </div>
        </div>
      )}
      {/* Violation Warning Modal */}
      {showViolationModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center border-2 border-red-500">
            <h3 className="text-2xl font-bold mb-4 text-red-700">Quiz Violation Detected</h3>
            <div className="text-lg mb-4">{violationMessage}</div>
            <button
              className="mt-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded"
              onClick={() => setShowViolationModal(false)}
            >OK</button>
          </div>
        </div>
      )}
      
      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={lightboxImage}
              alt="Question"
              className="max-w-full max-h-full object-contain rounded shadow-2xl"
            />
          </div>
        </div>
      )}
      {/* Card */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-blue-800 flex flex-col items-stretch p-12 mb-8">
        <div className="flex w-full justify-between items-center mb-6">
          <span className="text-2xl font-bold text-blue-900">{current + 1}. {q.question}</span>
          <span className="text-lg text-gray-700 font-semibold">{q.points || quiz.points || ''} Points</span>
        </div>
        
        {/* Display question image if exists */}
        {q.image && (
          <div className="mb-6 relative group w-fit mx-auto">
            <button
              type="button"
              onClick={() => setLightboxImage(q.image)}
              className="focus:outline-none"
            >
              <img
                src={q.image}
                alt="Question"
                className="max-h-64 rounded border transition-transform duration-200 group-hover:scale-105 group-hover:brightness-90 cursor-zoom-in"
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
        
        <div className="mb-2 w-full">{renderChoices()}</div>
      </div>
      {/* Progress bar and navigation below card */}
      <div className="flex items-center gap-4 w-full max-w-2xl">
        <div className="flex-1">
          <ProgressBar value={current + 1} max={quiz.questions.length} />
          <span className="text-base text-gray-700">Question {current + 1}/{quiz.questions.length}</span>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-gray-300 px-6 py-2 rounded-lg text-lg font-medium"
            onClick={() => {
              if (current === 0) setShowIntro(true);
              else setCurrent(c => c - 1);
            }}
          >Back</button>
          {current < quiz.questions.length - 1 ? (
            <button
              className="bg-blue-800 text-white px-8 py-2 rounded-lg text-lg font-semibold"
              onClick={() => setCurrent(c => c + 1)}
              disabled={answers[current] == null}
            >Next</button>
          ) : (
            <button
              className="bg-blue-800 text-white px-8 py-2 rounded-lg text-lg font-semibold"
              onClick={handleSubmit}
              disabled={submitting || (quiz.timing?.timeLimitEnabled && quiz.timing?.timeLimit && timeLeft > 0 && answers[current] == null)}
            >{submitting ? 'Submitting...' : 'Submit'}</button>
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