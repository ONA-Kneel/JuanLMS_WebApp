import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function QuizResponses() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [studentResponse, setStudentResponse] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    Promise.all([
      fetch(`${API_BASE}/api/quizzes/${quizId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_BASE}/quizzes/${quizId}/responses`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    ]).then(([quizData, respData]) => {
      setQuiz(quizData);
      setResponses(Array.isArray(respData) ? respData : []);
      setLoading(false);
    }).catch(() => {
      setError('Failed to load quiz or responses.');
      setLoading(false);
    });
  }, [quizId]);

  const handleView = (studentId) => {
    setStudentLoading(true);
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/quizzes/${quizId}/response/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setStudentResponse(data);
        setSelected(studentId);
        setStudentLoading(false);
      })
      .catch(() => {
        setStudentResponse(null);
        setStudentLoading(false);
      });
  };

  if (loading) return <div className="p-8 text-center">Loading responses...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow mt-8">
      <h1 className="text-2xl font-bold mb-2">{quiz?.title || 'Quiz Responses'}</h1>
      <div className="mb-4 text-gray-700">{quiz?.instructions || quiz?.description}</div>
      <div className="mb-4 font-semibold">Total Responses: {responses.length}</div>
      <table className="w-full mb-8 border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">#</th>
            <th className="p-2 border">Student</th>
            <th className="p-2 border">Submitted At</th>
            <th className="p-2 border">Action</th>
          </tr>
        </thead>
        <tbody>
          {responses.map((resp, idx) => (
            <tr key={resp._id} className="hover:bg-blue-50">
              <td className="p-2 border">{idx + 1}</td>
              <td className="p-2 border">{resp.studentId?.firstname} {resp.studentId?.lastname}</td>
              <td className="p-2 border">{new Date(resp.submittedAt).toLocaleString()}</td>
              <td className="p-2 border">
                <button className="text-blue-700 underline" onClick={() => handleView(resp.studentId?._id || resp.studentId)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {studentLoading && <div className="mb-4 text-blue-700">Loading student response...</div>}
      {studentResponse && (
        <div className="border rounded p-4 bg-gray-50 mb-4">
          <div className="font-semibold mb-2">{studentResponse.studentId?.firstname} {studentResponse.studentId?.lastname}'s Answers</div>
          <ol className="list-decimal ml-6">
            {quiz.questions.map((q, idx) => {
              const ans = studentResponse.answers.find(a => (a.questionId === (q._id || idx) || (a.questionId?._id === (q._id || idx))));
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
          <button className="mt-2 bg-gray-300 px-4 py-2 rounded" onClick={() => { setSelected(null); setStudentResponse(null); }}>Close</button>
        </div>
      )}
    </div>
  );
} 