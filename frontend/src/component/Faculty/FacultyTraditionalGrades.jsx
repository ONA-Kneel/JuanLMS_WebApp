import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './FacultyTraditionalGrades.css';

const FacultyTraditionalGrades = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchFacultyClasses();
  }, []);

  const fetchFacultyClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/traditional-grades/faculty/classes-sections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setClasses(response.data.classes);
      } else {
        toast.error('Failed to fetch classes');
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setSelectedSubject(''); // Reset subject selection
    
    if (classId) {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/traditional-grades/faculty/students/${classId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setStudents(response.data.students);
          
          // Extract unique subjects from students
          const uniqueSubjects = [];
          const subjectMap = new Map();
          
          response.data.students.forEach(student => {
            student.subjects.forEach(subject => {
              if (!subjectMap.has(subject._id)) {
                subjectMap.set(subject._id, subject);
                uniqueSubjects.push(subject);
              }
            });
          });
          
          setSubjects(uniqueSubjects);
        } else {
          toast.error('Failed to fetch students');
          setStudents([]);
          setSubjects([]);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error('Failed to fetch students');
        setStudents([]);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    } else {
      setStudents([]);
      setSubjects([]);
    }
  };

  const handleSubjectChange = (e) => {
    setSelectedSubject(e.target.value);
  };

  const downloadTemplate = async () => {
    if (!selectedClass) {
      toast.warning('Please select a class first');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/traditional-grades/faculty/template/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'traditional-grades-template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const uploadGrades = async () => {
    if (!selectedFile) {
      toast.warning('Please select a file to upload');
      return;
    }

    if (!selectedClass) {
      toast.warning('Please select a class first');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('classId', selectedClass);

      const response = await axios.post('/api/traditional-grades/faculty/upload', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setSelectedFile(null);
        document.getElementById('file-input').value = '';
        
        // Refresh students list to show updated grades
        handleClassChange({ target: { value: selectedClass } });
      } else {
        toast.error(response.data.message || 'Failed to upload grades');
      }
    } catch (error) {
      console.error('Error uploading grades:', error);
      toast.error(error.response?.data?.message || 'Failed to upload grades');
    } finally {
      setUploading(false);
    }
  };

  const updateGrade = async (studentId, subjectId, field, value) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/traditional-grades/faculty/update`, {
        studentId,
        subjectId,
        field,
        value,
        classId: selectedClass
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Grade updated successfully');
    } catch (error) {
      console.error('Error updating grade:', error);
      toast.error('Failed to update grade');
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

  // Filter students to show only the selected subject
  const filteredStudents = selectedSubject 
    ? students.filter(student => 
        student.subjects.some(subject => subject._id === selectedSubject)
      )
    : students;

  // Get the selected subject object
  const currentSubject = subjects.find(subject => subject._id === selectedSubject);

  return (
    <div className="faculty-traditional-grades">
      <div className="grades-header">
        <h2>Traditional Grades Management</h2>
        <p>Manage student grades with prelims, midterms, and finals</p>
      </div>

      <div className="class-selection">
        <div className="form-group">
          <label htmlFor="class-select">Select Class & Section:</label>
          <select
            id="class-select"
            value={selectedClass}
            onChange={handleClassChange}
            disabled={loading}
          >
            <option value="">Choose a class...</option>
            {classes.map((cls) => (
              <option key={cls.classId} value={cls.classId}>
                {cls.className} - {cls.sectionName} ({cls.trackName} | {cls.strandName} | {cls.gradeLevel})
              </option>
            ))}
          </select>
        </div>

        {selectedClass && subjects.length > 0 && (
          <div className="form-group subject-selection">
            <label htmlFor="subject-select">Select Subject:</label>
            <select
              id="subject-select"
              value={selectedSubject}
              onChange={handleSubjectChange}
              disabled={loading}
            >
              <option value="">Choose a subject...</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.subjectCode} - {subject.subjectDescription}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedClass && (
        <div className="template-actions">
          <button 
            onClick={downloadTemplate}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Downloading...' : 'Download CSV Template'}
          </button>
          
          <div className="upload-section">
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="file-input"
            />
            <button
              onClick={uploadGrades}
              disabled={!selectedFile || uploading}
              className="btn btn-success"
            >
              {uploading ? 'Uploading...' : 'Upload Grades'}
            </button>
          </div>
        </div>
      )}

      {selectedClass && selectedSubject && currentSubject && (
        <div className="subject-info">
          <h3>Subject: {currentSubject.subjectCode} - {currentSubject.subjectDescription}</h3>
          <p>Managing grades for {filteredStudents.length} students</p>
        </div>
      )}

      {selectedClass && selectedSubject && filteredStudents.length > 0 && (
        <div className="grades-table-container">
          <h3>Student Grades - {currentSubject?.subjectCode}</h3>
          <div className="table-responsive">
            <table className="grades-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>School ID</th>
                  <th>Prelims</th>
                  <th>Midterms</th>
                  <th>Final</th>
                  <th>Final Grade</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const subject = student.subjects.find(sub => sub._id === selectedSubject);
                  if (!subject) return null;

                  const finalGrade = calculateFinalGrade(subject.prelims, subject.midterms, subject.final);
                  const remark = getRemark(finalGrade);

                  return (
                    <tr key={student._id}>
                      <td>{student.name}</td>
                      <td>{student.schoolID}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Grade"
                          className="grade-input"
                          defaultValue={subject.prelims || ''}
                          onChange={(e) => updateGrade(student._id, subject._id, 'prelims', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Grade"
                          className="grade-input"
                          defaultValue={subject.midterms || ''}
                          onChange={(e) => updateGrade(student._id, subject._id, 'midterms', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Grade"
                          className="grade-input"
                          defaultValue={subject.final || ''}
                          onChange={(e) => updateGrade(student._id, subject._id, 'final', e.target.value)}
                        />
                      </td>
                      <td className="final-grade">
                        {finalGrade}
                      </td>
                      <td className="remark">
                        {remark}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedClass && selectedSubject && filteredStudents.length === 0 && (
        <div className="no-data">
          <p>No students found for the selected subject.</p>
        </div>
      )}

      {selectedClass && !selectedSubject && (
        <div className="no-data">
          <p>Please select a subject to view and manage grades.</p>
        </div>
      )}

      {selectedClass && students.length === 0 && (
        <div className="no-data">
          <p>No students found in this class/section.</p>
        </div>
      )}
    </div>
  );
};

export default FacultyTraditionalGrades; 