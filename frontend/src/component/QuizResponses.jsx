import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import ValidationModal from './ValidationModal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function calculateStats(responses, quiz) {
  const scores = responses.map(r => typeof r.score === 'number' ? r.score : 0);
  const total = quiz?.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 1;
  if (!scores.length) return { avg: 0, median: 0, range: [0, 0], dist: {}, total };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)];
  const range = [Math.min(...scores), Math.max(...scores)];
  const dist = {};
  for (let s of scores) dist[s] = (dist[s] || 0) + 1;
  return { avg, median, range, dist, total };
}

export default function QuizResponses() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('toGrade');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editScoreIdx, setEditScoreIdx] = useState(null);
  const [editScoreValue, setEditScoreValue] = useState(0);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });
  // Add members state
  const [members, setMembers] = useState([]);
  const [showViolationsModal, setShowViolationsModal] = useState(false);

  const handleScoreEdit = idx => {
    setEditScoreIdx(idx);
    setEditScoreValue(typeof responses[idx].score === 'number' ? responses[idx].score : 0);
  };
  const handleScoreSave = async idx => {
    const resp = responses[idx];
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${quizId}/responses/${resp._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ score: editScoreValue })
      });
      if (res.ok) {
        const updated = await res.json();
        setResponses(r => r.map((item, i) => i === idx ? { ...item, score: updated.score } : item));
        setEditScoreIdx(null);
      } else {
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update score.'
        });
      }
    } catch {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to update score due to network error. Please try again.'
      });
    }
  };
  const handleScoreCancel = () => setEditScoreIdx(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Fetch quiz, responses, and members
    Promise.all([
      fetch(`${API_BASE}/api/quizzes/${quizId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_BASE}/api/quizzes/${quizId}/responses`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    ]).then(async ([quizData, respData]) => {
      setQuiz(quizData);
      setResponses(Array.isArray(respData) ? respData : []);
      let membersData = [];
      // Fetch only assigned students
      const assignedIDs = quizData?.assignedTo?.[0]?.studentIDs || [];
      if (assignedIDs.length > 0) {
        try {
          const res = await fetch(`${API_BASE}/api/quizzes/students/by-ids`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: assignedIDs })
          });
          const data = await res.json();
          membersData = Array.isArray(data.students) ? data.students : [];
          console.log("Loaded assigned members:", membersData);
        } catch {
          membersData = [];
        }
      }
      setMembers(membersData);
      setLoading(false);
    }).catch(() => {
      setError('Failed to load quiz or responses.');
      setLoading(false);
    });
  }, [quizId]);

  if (loading) return <div className="p-8 text-center">Loading responses...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  const stats = calculateStats(responses, quiz);
  const distLabels = Object.keys(stats.dist).sort((a, b) => Number(a) - Number(b));
  const distData = distLabels.map(k => stats.dist[k]);

  return (
    <div className="min-h-screen min-w-screen bg-gray-100 flex">
      {/* Sidebar Navigation */}
      <Faculty_Navbar />
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-start py-8 px-8 ml-0 md:ml-64 font-poppinsr">
        <button className="mb-4 text-blue-800 text-base hover:underline" onClick={() => window.history.back()}>&larr; Back</button>
        <div className="flex items-center justify-between w-full mb-2">
          <h1 className="text-3xl font-extrabold text-blue-900">{quiz?.title || 'Quiz Responses'}</h1>
          <span className="text-base font-semibold text-gray-700">Points: {stats.total}</span>
        </div>
        <div className="flex gap-8 border-b border-gray-300 mb-6 mt-4 w-full">
          <button className={`pb-2 px-2 text-lg font-semibold ${tab === 'assignment' ? 'border-b-2 border-blue-800 text-blue-900' : 'text-gray-600'}`} onClick={() => setTab('assignment')}>Details</button>
          <button className={`pb-2 px-2 text-lg font-semibold ${tab === 'toGrade' ? 'border-b-2 border-blue-800 text-blue-900' : 'text-gray-600'}`} onClick={() => setTab('toGrade')}>Submissions</button>
          <button className={`pb-2 px-2 text-lg font-semibold ${tab === 'status' ? 'border-b-2 border-blue-800 text-blue-900' : 'text-gray-600'}`} onClick={() => setTab('status')}>Status</button>
          <button className={`pb-2 px-2 text-lg font-semibold ${tab === 'insights' ? 'border-b-2 border-blue-800 text-blue-900' : 'text-gray-600'}`} onClick={() => setTab('insights')}>Insights</button>
        </div>
        {/* Assignment Tab */}
        {tab === 'assignment' && (
          <div className="w-full">
            <div className="mb-6">
              <div className="font-bold text-lg mb-1">Instructions</div>
              <div className="mb-4 text-gray-700">{quiz?.instructions || quiz?.description}</div>
              <div className="font-bold text-lg mb-1">Description</div>
              <div className="mb-4 text-gray-700">{quiz?.description}</div>
            </div>
          </div>
        )}
        {/* To Grade Tab (default) */}
        {tab === 'toGrade' && responses.length > 0 && (
          <div className="w-full">
            <div className="flex items-center gap-4 mb-4">
              <button disabled={selectedIdx === 0} onClick={() => setSelectedIdx(i => i - 1)} className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50">&lt;</button>
              <span> {selectedIdx + 1} of {responses.length} </span>
              <button disabled={selectedIdx === responses.length - 1} onClick={() => setSelectedIdx(i => i + 1)} className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50">&gt;</button>
            </div>
            <div className="mb-2 text-2xl font-bold text-blue-900">{responses[selectedIdx].studentId?.firstname} {responses[selectedIdx].studentId?.lastname}</div>
            <div className="mb-2 text-lg text-gray-700">Submitted: {new Date(responses[selectedIdx].submittedAt).toLocaleString()}</div>
            <div className="mb-4 flex items-center gap-4">
              <span className="text-2xl text-gray-800 font-bold">Score: </span>
              {editScoreIdx === selectedIdx ? (
                <>
                  <input
                    type="number"
                    min={0}
                    max={stats.total}
                    className="border-2 border-blue-400 rounded px-3 py-1 text-2xl w-24 text-center font-bold mr-2"
                    value={editScoreValue}
                    onChange={e => {
                      let val = Number(e.target.value);
                      if (val > stats.total) val = stats.total;
                      if (val < 0) val = 0;
                      setEditScoreValue(val);
                    }}
                  />
                  <span className="text-2xl font-bold">/ {stats.total}</span>
                  <button className="ml-2 px-3 py-1 bg-green-600 text-white rounded font-semibold" onClick={() => handleScoreSave(selectedIdx)}>Save</button>
                  <button className="ml-2 px-3 py-1 bg-gray-400 text-white rounded font-semibold" onClick={handleScoreCancel}>Cancel</button>
                </>
              ) : (
                <>
                  <span className="text-3xl font-extrabold text-blue-800">{typeof responses[selectedIdx].score === 'number' ? responses[selectedIdx].score : 0}</span>
                  <span className="text-2xl font-bold">/ {stats.total}</span>
                  <button className="ml-4 px-4 py-1 bg-blue-700 text-white rounded font-semibold hover:bg-blue-900 transition" onClick={() => handleScoreEdit(selectedIdx)}>Edit</button>
                </>
              )}
              {/* Show violation count and button */}
              <span className="ml-8 text-base text-red-600 font-semibold">Tab/Focus Violations: {responses[selectedIdx].violationCount || 0}</span>
              <button
                className="ml-4 px-4 py-1 bg-red-600 text-white rounded font-semibold hover:bg-red-800 transition"
                onClick={() => setShowViolationsModal(true)}
              >
                View Violations ({responses[selectedIdx].violationEvents?.length || 0})
              </button>
            </div>
            {responses[selectedIdx].feedback && <div className="mb-2 text-green-700">Feedback: {responses[selectedIdx].feedback}</div>}
            {/* Answers list with time spent per question on the right */}
            <div className="border rounded p-4 bg-gray-50 mb-4">
              <ol className="list-decimal ml-6">
                {quiz.questions.map((q, idx) => {
                  const ans = responses[selectedIdx].answers.find(a => (a.questionId === (q._id || idx) || (a.questionId?._id === (q._id || idx))));
                  const timeSpent = Array.isArray(responses[selectedIdx].questionTimes) ? responses[selectedIdx].questionTimes[idx] : null;
                  return (
                    <li key={q._id || idx} className="mb-3 flex justify-between items-start">
                      <div>
                        <div className="font-bold">{q.question}</div>
                        {q.image && <img src={q.image} alt="Question" className="max-h-32 mb-2" />}
                        <div className="ml-2">
                          <span className="italic">Student Answer: </span>
                          {q.type === 'multiple' && Array.isArray(ans?.answer) && (
                            <ul className="list-disc ml-4">
                              {ans.answer.map(i => <li key={i}>{q.choices[i]}</li>)}
                            </ul>
                          )}
                          {q.type === 'truefalse' && (
                            <span>{ans?.answer === true ? 'True' : ans?.answer === false ? 'False' : 'No answer'}</span>
                          )}
                          {q.type === 'identification' && (
                            <span>{ans?.answer || 'No answer'}</span>
                          )}
                        </div>
                      </div>
                      {/* Time spent per question on the far right with label */}
                      {timeSpent !== null && (
                        <div className="ml-8 text-xs text-blue-700 whitespace-nowrap self-center text-center">
                          <div className="font-semibold">Time Spent</div>
                          {timeSpent} seconds
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
        {tab === 'toGrade' && responses.length === 0 && (
          <div className="text-gray-600">No responses yet.</div>
        )}
        {/* Status Tab */}
        {tab === 'status' && (
          <div className="w-full">
            <h2 className="text-lg font-semibold mb-4">Student Quiz Status</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 border">Name</th>
                    <th className="p-3 border">Status</th>
                    <th className="p-3 border">Score</th>
                    {/* Removed Feedback column */}
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(members) && members.length > 0 ? (
                    members
                      .filter(student => {
                        const assignedIDs = quiz?.assignedTo?.[0]?.studentIDs || [];
                        return assignedIDs.includes(student._id) || assignedIDs.includes(student.userID);
                      })
                      .map(student => {
                        const response = responses.find(r =>
                          r.studentId?._id === student._id ||
                          r.studentId === student._id ||
                          r.studentId?.userID === student.userID
                        );
                        let status = "Not Yet Viewed";
                        if (response) {
                          status = "Submitted";
                        } else if (quiz?.views && quiz.views.map(String).includes(String(student._id))) {
                          status = "Viewed";
                        }
                        return (
                          <tr key={student._id}>
                            <td className="p-3 border">{student.lastname}, {student.firstname}</td>
                            <td className="p-3 border">{status}</td>
                            <td className="p-3 border">{response && typeof response.score === 'number' ? response.score : "-"}</td>
                            {/* Removed Feedback cell */}
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td className="p-3 border text-center" colSpan={3}>No students found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Insights Tab */}
        {tab === 'insights' && (
          <div className="w-full px-2">
            <div className="mb-4 flex flex-col md:flex-row gap-4 md:gap-8">
              <div className="bg-gray-50 p-4 rounded shadow text-center flex-1">
                <div className="text-xs text-gray-500">Average</div>
                <div className="text-lg font-bold">{stats.avg.toFixed(2)} / {stats.total} points</div>
              </div>
              <div className="bg-gray-50 p-4 rounded shadow text-center flex-1">
                <div className="text-xs text-gray-500">Median</div>
                <div className="text-lg font-bold">{stats.median} / {stats.total} points</div>
              </div>
              <div className="bg-gray-50 p-4 rounded shadow text-center flex-1">
                <div className="text-xs text-gray-500">Range</div>
                <div className="text-lg font-bold">{stats.range[0]} - {stats.range[1]} points</div>
              </div>
            </div>
            <div className="my-8">
              <div className="font-semibold mb-2">Total points distribution</div>
              <div className="w-full max-7xl ">
                <Bar
                  data={{
                    labels: distLabels,
                    datasets: [{
                      label: '# of respondents',
                      data: distData,
                      backgroundColor: 'rgba(99, 102, 241, 0.7)'
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      title: { display: false }
                    },
                    scales: {
                      x: { title: { display: true, text: 'Points scored' } },
                      y: { title: { display: true, text: '# of respondents' }, beginAtZero: true, precision: 0 }
                    }
                  }}
                  height={250}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <ValidationModal
        isOpen={validationModal.isOpen}
        onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
        type={validationModal.type}
        title={validationModal.title}
        message={validationModal.message}
      />
      {/* Modal for violation events */}
      {showViolationsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center border-2 border-red-500">
            <h3 className="text-2xl font-bold mb-4 text-red-700">Tab/Focus Violation Timeline</h3>
            <ul className="text-left mb-4">
              {responses[selectedIdx].violationEvents.map((v, i) => (
                <li key={i} className="mb-2 flex items-center">
                  <span className="mr-2 text-red-600">⛔</span>
                  <span>
                    <span className="font-semibold">Stopped viewing the quiz-taking page</span>
                    {v.question && <> (Question {v.question})</>}
                    <span className="ml-2 text-gray-500 text-xs">{new Date(v.time).toLocaleString()}</span>
                  </span>
                </li>
              ))}
            </ul>
            <button
              className="mt-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded"
              onClick={() => setShowViolationsModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}