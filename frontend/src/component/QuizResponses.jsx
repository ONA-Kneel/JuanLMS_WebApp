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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function calculateStats(responses, quiz) {
  const scores = responses.map(r => typeof r.score === 'number' ? r.score : 0);
  const total = quiz?.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 1;
  if (!scores.length) return { avg: 0, median: 0, range: [0, 0], dist: {}, total };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0 ? (sorted[sorted.length/2-1] + sorted[sorted.length/2])/2 : sorted[Math.floor(sorted.length/2)];
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    Promise.all([
      fetch(`${API_BASE}/api/quizzes/${quizId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_BASE}/api/quizzes/${quizId}/responses`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    ]).then(([quizData, respData]) => {
      setQuiz(quizData);
      setResponses(Array.isArray(respData) ? respData : []);
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
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar Navigation */}
      <Faculty_Navbar />
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-start py-8 px-8 ml-0 md:ml-64">
        <button className="mb-4 text-blue-800 font-semibold text-base hover:underline" onClick={() => window.history.back()}>&lt; Back</button>
        <div className="flex items-center justify-between w-full mb-2">
          <h1 className="text-3xl font-extrabold text-blue-900">{quiz?.title || 'Quiz Responses'}</h1>
          <span className="text-base font-semibold text-gray-700">Points: {stats.total}</span>
        </div>
        <div className="flex gap-8 border-b border-gray-300 mb-6 mt-4 w-full">
          <button className={`pb-2 px-2 text-lg font-semibold ${tab==='assignment' ? 'border-b-2 border-blue-800 text-blue-900' : 'text-gray-600'}`} onClick={()=>setTab('assignment')}>Assignment</button>
          <button className={`pb-2 px-2 text-lg font-semibold ${tab==='toGrade' ? 'border-b-2 border-blue-800 text-blue-900' : 'text-gray-600'}`} onClick={()=>setTab('toGrade')}>To Grade</button>
          <button className={`pb-2 px-2 text-lg font-semibold ${tab==='insights' ? 'border-b-2 border-blue-800 text-blue-900' : 'text-gray-600'}`} onClick={()=>setTab('insights')}>Insights</button>
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
              <button disabled={selectedIdx===0} onClick={()=>setSelectedIdx(i=>i-1)} className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50">&lt;</button>
              <span> {selectedIdx+1} of {responses.length} </span>
              <button disabled={selectedIdx===responses.length-1} onClick={()=>setSelectedIdx(i=>i+1)} className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50">&gt;</button>
            </div>
            <div className="mb-2 text-sm text-gray-600">{responses[selectedIdx].studentId?.firstname} {responses[selectedIdx].studentId?.lastname}</div>
            <div className="mb-2 text-sm text-gray-600">Submitted: {new Date(responses[selectedIdx].submittedAt).toLocaleString()}</div>
            <div className="mb-2 text-sm text-gray-600">Score: <span className="font-bold">{typeof responses[selectedIdx].score === 'number' ? responses[selectedIdx].score : 0} / {stats.total}</span></div>
            {responses[selectedIdx].feedback && <div className="mb-2 text-green-700">Feedback: {responses[selectedIdx].feedback}</div>}
            <div className="border rounded p-4 bg-gray-50 mb-4">
              <ol className="list-decimal ml-6">
                {quiz.questions.map((q, idx) => {
                  const ans = responses[selectedIdx].answers.find(a => (a.questionId === (q._id || idx) || (a.questionId?._id === (q._id || idx))));
                  return (
                    <li key={q._id || idx} className="mb-3">
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
        {/* Insights Tab */}
        {tab === 'insights' && (
          <div className="w-full">
          <div className="mb-4 flex gap-8">
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
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                },
                scales: {
                  x: { title: { display: true, text: 'Points scored' } },
                  y: { title: { display: true, text: '# of respondents' }, beginAtZero: true, precision: 0 }
                }
              }}
              height={120}
            />
          </div>
        </div>
      )}
        </div>
    </div>
  );
} 