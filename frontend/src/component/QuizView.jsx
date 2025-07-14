import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function QuizView() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timer, setTimer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

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
      await fetch(`${API_BASE}/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: quiz.questions.map((q, i) => ({ questionId: q._id || i, answer: answers[i] })) })
      });
      setSubmitted(true);
    } catch {
      setError('Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading quiz...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!isAvailable()) return <div className="p-8 text-center text-gray-600">This quiz is not available at this time.</div>;
  if (submitted) return <div className="p-8 text-center text-green-600">Quiz submitted! You will see your score after your teacher reviews it.</div>;

  const q = quiz.questions[current];

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow mt-8">
      <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
      <div className="mb-4 text-gray-700">{quiz.instructions || quiz.description}</div>
      {quiz.timing?.limit && (
        <div className="mb-4 text-right text-sm text-blue-700">Time left: {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
      )}
      <div className="mb-6">
        <div className="font-semibold mb-2">Question {current + 1} of {quiz.questions.length}</div>
        <div className="mb-2">{q.question}</div>
        {q.image && <img src={q.image} alt="Question" className="max-h-40 mb-2" />}
        {q.type === 'multiple' && (
          <div className="flex flex-col gap-2">
            {q.choices.map((choice, i) => (
              <label key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Array.isArray(answers[current]) ? answers[current].includes(i) : false}
                  onChange={e => {
                    let arr = Array.isArray(answers[current]) ? [...answers[current]] : [];
                    if (e.target.checked) arr.push(i);
                    else arr = arr.filter(x => x !== i);
                    handleChange(current, arr);
                  }}
                />
                {choice}
              </label>
            ))}
          </div>
        )}
        {q.type === 'truefalse' && (
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name={`tf${current}`} checked={answers[current] === true} onChange={() => handleChange(current, true)} /> True
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name={`tf${current}`} checked={answers[current] === false} onChange={() => handleChange(current, false)} /> False
            </label>
          </div>
        )}
        {q.type === 'identification' && (
          <input
            className="border rounded px-3 py-2 w-full"
            value={answers[current] || ''}
            onChange={e => handleChange(current, e.target.value)}
          />
        )}
      </div>
      <div className="flex gap-4 justify-between">
        <button
          className="bg-gray-300 px-4 py-2 rounded"
          onClick={() => setCurrent(c => c - 1)}
          disabled={current === 0}
        >Back</button>
        {current < quiz.questions.length - 1 ? (
          <button
            className="bg-blue-700 text-white px-4 py-2 rounded"
            onClick={() => setCurrent(c => c + 1)}
            disabled={answers[current] == null || (q.type === 'multiple' && (!Array.isArray(answers[current]) || answers[current].length === 0))}
          >Next</button>
        ) : (
          <button
            className="bg-green-700 text-white px-4 py-2 rounded"
            onClick={handleSubmit}
            disabled={submitting || answers[current] == null || (q.type === 'multiple' && (!Array.isArray(answers[current]) || answers[current].length === 0))}
          >{submitting ? 'Submitting...' : 'Submit'}</button>
        )}
      </div>
    </div>
  );
} 