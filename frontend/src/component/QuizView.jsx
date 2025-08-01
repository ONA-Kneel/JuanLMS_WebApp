import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import seedrandom from 'seedrandom';


const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

      // 🕒 Handle quiz time limit
      if (data.timing && data.timing.limit) {
        setTimeLeft(data.timing.limit * 60);
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
      console.error('Error loading quiz:', err);
      setError('Failed to load quiz.');
      setLoading(false);
    }
  };

  fetchQuiz();
}, [quizId]);


  // Timer logic
  useEffect(() => {
    if (!quiz || !quiz.timing || !quiz.timing.limit || submitted) return;
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [quiz, timeLeft, submitted]);

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

  const handleSubmit = async () => {
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: quiz.questions.map((q, i) => ({ questionId: q._id || i, answer: answers[i] })) })
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
      setError(e.message || 'Failed to submit quiz.');
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
        {quiz.timing?.limit && (
          <div className="mb-6 text-xl font-bold text-blue-900">Timer: {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
        )}
        <div className="mb-8 w-full text-sm text-gray-500 text-left">{studentInfo.name} {studentInfo.section && `| ${studentInfo.section}`}</div>
        <button className="bg-blue-800 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow" onClick={() => setShowIntro(false)}>Next</button>
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
      {quiz.timing?.limit && (
        <div className="mb-4 text-2xl font-bold text-blue-900 text-center">Timer: {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
      )}
      {/* Card */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-blue-800 flex flex-col items-stretch p-12 mb-8">
        <div className="flex w-full justify-between items-center mb-6">
          <span className="text-2xl font-bold text-blue-900">{current + 1}. {q.question}</span>
          <span className="text-lg text-gray-700 font-semibold">{q.points || quiz.points || ''} Points</span>
        </div>
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
              disabled={submitting || answers[current] == null}
            >{submitting ? 'Submitting...' : 'Submit'}</button>
          )}
        </div>
      </div>
    </div>
  );
}