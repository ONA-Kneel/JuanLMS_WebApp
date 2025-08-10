import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './StudentTraditionalGrades.css';

const StudentTraditionalGrades = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [terms, setTerms] = useState([]);

  useEffect(() => {
    fetchTerms();
    fetchStudentGrades();
  }, [selectedTerm]);

  const fetchTerms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/terms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTerms(response.data.terms || []);
      if (response.data.terms && response.data.terms.length > 0) {
        setSelectedTerm(response.data.terms[0]._id);
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchStudentGrades = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/traditional-grades/student/my-grades', {
        headers: { Authorization: `Bearer ${token}` },
        params: { termId: selectedTerm }
      });
      setGrades(response.data.grades);
    } catch (error) {
      console.error('Error fetching grades:', error);
      toast.error('Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  };

  const calculateFinalGrade = (prelims, midterms, final) => {
    if (!prelims || !midterms || !final) return '';
    
    const prelimsNum = parseFloat(prelims) || 0;
    const midtermsNum = parseFloat(midterms) || 0;
    const finalNum = parseFloat(final) || 0;
    
    const finalGrade = (prelimsNum * 0.3) + (midtermsNum * 0.3) + (finalNum * 0.4);
    return finalGrade.toFixed(2);
  };

  const getRemark = (finalGrade) => {
    if (!finalGrade) return '';
    const grade = parseFloat(finalGrade);
    if (grade >= 75) return 'PASSED';
    return 'FAILED';
  };

  const getGradeColor = (grade) => {
    if (!grade) return '';
    const numGrade = parseFloat(grade);
    if (numGrade >= 90) return 'excellent';
    if (numGrade >= 85) return 'very-good';
    if (numGrade >= 80) return 'good';
    if (numGrade >= 75) return 'fair';
    return 'poor';
  };

  if (loading) {
    return (
      <div className="student-traditional-grades">
        <div className="loading">Loading grades...</div>
      </div>
    );
  }

  return (
    <div className="student-traditional-grades">
      <div className="grades-header">
        <h2>My Traditional Grades</h2>
        <p>View your academic performance across all subjects</p>
      </div>

      <div className="term-selection">
        <div className="form-group">
          <label htmlFor="term-select">Select Term:</label>
          <select
            id="term-select"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          >
            {terms.map((term) => (
              <option key={term._id} value={term._id}>
                {term.termName} - {term.schoolYear}
              </option>
            ))}
          </select>
        </div>
      </div>

      {grades.length > 0 ? (
        <div className="grades-summary">
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Total Subjects:</span>
              <span className="stat-value">{grades.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Average Grade:</span>
              <span className="stat-value">
                {grades.length > 0 
                  ? (grades.reduce((sum, grade) => sum + (grade.finalGrade || 0), 0) / grades.length).toFixed(2)
                  : 'N/A'
                }
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Overall Status:</span>
              <span className="stat-value">
                {grades.every(grade => grade.remark === 'PASSED') ? 'PASSED' : 'FAILED'}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {grades.length > 0 ? (
        <div className="grades-table-container">
          <h3>Subject Grades</h3>
          <div className="table-responsive">
            <table className="grades-table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Description</th>
                  <th>Prelims</th>
                  <th>Midterms</th>
                  <th>Final</th>
                  <th>Final Grade</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((grade) => (
                  <tr key={grade._id}>
                    <td>{grade.subjectCode || 'N/A'}</td>
                    <td>{grade.subjectDescription || 'N/A'}</td>
                    <td className={`grade ${getGradeColor(grade.prelims)}`}>
                      {grade.prelims || 'N/A'}
                    </td>
                    <td className={`grade ${getGradeColor(grade.midterms)}`}>
                      {grade.midterms || 'N/A'}
                    </td>
                    <td className={`grade ${getGradeColor(grade.final)}`}>
                      {grade.final || 'N/A'}
                    </td>
                    <td className={`grade final-grade ${getGradeColor(grade.finalGrade)}`}>
                      {grade.finalGrade || 'N/A'}
                    </td>
                    <td className={`remark ${grade.remark === 'PASSED' ? 'passed' : 'failed'}`}>
                      {grade.remark || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="no-grades">
          <p>No grades available for the selected term.</p>
        </div>
      )}

      <div className="grade-legend">
        <h4>Grade Legend:</h4>
        <div className="legend-items">
          <span className="legend-item excellent">90-100: Excellent</span>
          <span className="legend-item very-good">85-89: Very Good</span>
          <span className="legend-item good">80-84: Good</span>
          <span className="legend-item fair">75-79: Fair</span>
          <span className="legend-item poor">Below 75: Poor</span>
        </div>
      </div>
    </div>
  );
};

export default StudentTraditionalGrades; 