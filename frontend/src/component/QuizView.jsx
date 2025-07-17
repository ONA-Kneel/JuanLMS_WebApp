import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

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

  // Fetch quiz details
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/quizzes/${quizId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setQuiz(data);
        setAnswers(Array(data.questions?.length || 0).fill(null));
        setLoading(false);
        // Handle timing
        if (data.timing && data.timing.limit) {
          setTimeLeft(data.timing.limit * 60); // minutes to seconds
        }
      })
      .catch(() => {
        setError('Failed to load quiz.');
        setLoading(false);
      });
    // Fetch student info (if available)
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      setStudentInfo({
        name: tokenData.name || '',
        section: tokenData.section || ''
      });
      // Check if already submitted
      const userId = tokenData._id || tokenData.id;
      fetch(`${API_BASE}/api/quizzes/quizzes/${quizId}/response/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 404) return null;
          return res.json();
        })
        .then(data => {
          if (data && data._id) {
            setAlreadySubmitted(true);
            setSubmitted(true);
          }
        })
        .catch(() => {});
    } catch {
      // ignore error
    }
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
  if (!isAvailable()) return <div className="p-8 text-center text-gray-600">This quiz is not available at this time.</div>;

  // Confirmation card after submission
  if (submitted) return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-50">
      <div className="w-full max-w-2xl mx-auto p-12 bg-white rounded-3xl shadow-2xl border-4 border-blue-800 flex flex-col items-center">
        <h2 className="text-4xl font-extrabold mb-4 text-blue-900 text-center">{quiz.title}</h2>
        <p className="mb-8 text-gray-700 text-xl text-center">Your response has been recorded.</p>
        <button className="bg-blue-800 text-white px-8 py-3 rounded-lg text-lg font-semibold mb-4 shadow">View score</button>
        <button className="text-blue-700 underline text-base font-medium" onClick={() => window.location.href =  '/student_dashboard'}>Back to Dashboard</button>
      </div>
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
      const grid = [];
      for (let i = 0; i < q.choices.length; i += 2) {
        grid.push(
          <div key={i} className="flex gap-16 mb-6 w-full">
            <label className="flex items-center gap-3 w-1/2 text-lg">
              <input
                type="checkbox"
                className="w-5 h-5 accent-blue-800"
                checked={Array.isArray(answers[current]) ? answers[current].includes(i) : false}
                onChange={e => {
                  let arr = Array.isArray(answers[current]) ? [...answers[current]] : [];
                  if (e.target.checked) arr.push(i);
                  else arr = arr.filter(x => x !== i);
                  handleChange(current, arr);
                }}
              />
              {q.choices[i]}
            </label>
            {q.choices[i + 1] !== undefined && (
              <label className="flex items-center gap-3 w-1/2 text-lg">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-blue-800"
                  checked={Array.isArray(answers[current]) ? answers[current].includes(i + 1) : false}
                  onChange={e => {
                    let arr = Array.isArray(answers[current]) ? [...answers[current]] : [];
                    if (e.target.checked) arr.push(i + 1);
                    else arr = arr.filter(x => x !== i + 1);
                    handleChange(current, arr);
                  }}
                />
                {q.choices[i + 1]}
              </label>
            )}
          </div>
        );
      }
      return grid;
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
              disabled={answers[current] == null || (q.type === 'multiple' && (!Array.isArray(answers[current]) || answers[current].length === 0))}
            >Next</button>
          ) : (
            <button
              className="bg-blue-800 text-white px-8 py-2 rounded-lg text-lg font-semibold"
              onClick={handleSubmit}
              disabled={submitting || answers[current] == null || (q.type === 'multiple' && (!Array.isArray(answers[current]) || answers[current].length === 0))}
            >{submitting ? 'Submitting...' : 'Submit'}</button>
          )}
        </div>
      </div>
    </div>
  );
} 