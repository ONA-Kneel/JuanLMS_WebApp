import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './FacultyTraditionalGrades.css';

const FacultyTraditionalGrades = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  useEffect(() => {
    fetchAcademicYear();
  }, []);

  useEffect(() => {
    if (academicYear) {
      fetchActiveTerm();
    }
  }, [academicYear]);

  useEffect(() => {
    if (academicYear && currentTerm) {
      fetchFacultyClasses();
    }
  }, [academicYear, currentTerm]);

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchStudents();
    }
  }, [selectedClass, selectedSubject]);

  const fetchAcademicYear = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/schoolyears/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setAcademicYear(response.data);
      }
    } catch (error) {
      console.error('Error fetching academic year:', error);
    }
  };

  const fetchActiveTerm = async () => {
    try {
      const token = localStorage.getItem('token');
      const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
      const response = await axios.get(`/api/terms/schoolyear/${schoolYearName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        const active = response.data.find(term => term.status === 'active');
        setCurrentTerm(active || null);
      }
    } catch (error) {
      console.error('Error fetching active term:', error);
    }
  };

  const fetchFacultyClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const currentFacultyID = localStorage.getItem("userID");
      
      const response = await axios.get('/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        // Filter classes for current faculty in current term
        const filteredClasses = response.data.filter(cls => 
          cls.facultyID === currentFacultyID && 
          cls.isArchived !== true &&
          cls.academicYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` &&
          cls.termName === currentTerm.termName
        );
        setClasses(filteredClasses);
      }
    } catch (error) {
      console.error('Error fetching faculty classes:', error);
      toast.error('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const selectedClassObj = classes[selectedClass];
      
      // Fetch subjects for the selected class
      const response = await axios.get(`/api/classes/${selectedClassObj.classID}/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.subjects) {
        setSubjects(response.data.subjects);
      } else {
        // If no subjects endpoint, create default subjects based on class
        const defaultSubjects = [
          {
            _id: 'subject_1',
            subjectCode: selectedClassObj.className,
            subjectDescription: selectedClassObj.className,
            trackName: selectedClassObj.trackName || 'STEM',
            gradeLevel: selectedClassObj.gradeLevel || '12'
          }
        ];
        setSubjects(defaultSubjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      // Create default subject if API fails
      const selectedClassObj = classes[selectedClass];
      const defaultSubjects = [
        {
          _id: 'subject_1',
          subjectCode: selectedClassObj.className,
          subjectDescription: selectedClassObj.className,
          trackName: selectedClassObj.trackName || 'STEM',
          gradeLevel: selectedClassObj.gradeLevel || '12'
        }
      ];
      setSubjects(defaultSubjects);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const selectedClassObj = classes[selectedClass];
      
      // Try multiple endpoints to get students
      let studentsData = [];
      
      try {
        // Try class members endpoint first
        const response = await axios.get(`/classes/${selectedClassObj.classID}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data && response.data.students) {
          studentsData = response.data.students;
        }
      } catch (error) {
        console.log('Class members endpoint failed, trying alternatives');
      }
      
      // If no students found, try alternative endpoints
      if (studentsData.length === 0) {
        try {
          const altResponse = await axios.get(`/api/students/class/${selectedClassObj.classCode || selectedClassObj.classID}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (altResponse.data) {
            studentsData = altResponse.data;
          }
        } catch (altError) {
          console.log('Alternative endpoint also failed');
        }
      }
      
      // Transform students data to include grades structure
      const transformedStudents = studentsData.map(student => ({
        _id: student._id || student.userID || student.studentID,
        name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
        schoolID: student.schoolID || student.userID || student.studentID,
        grades: {
          [selectedSubject]: {
            prelims: '',
            midterms: '',
            final: '',
            finalGrade: '',
            remarks: ''
          }
        }
      }));
      
      setStudents(transformedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (e) => {
    const classIndex = e.target.value;
    setSelectedClass(classIndex);
    setSelectedSubject('');
    setStudents([]);
  };

  const handleSubjectChange = (e) => {
    const subjectId = e.target.value;
    setSelectedSubject(subjectId);
    
    // Update students to include grades for the new subject
    if (students.length > 0) {
      const updatedStudents = students.map(student => ({
        ...student,
        grades: {
          ...student.grades,
          [subjectId]: {
            prelims: student.grades[subjectId]?.prelims || '',
            midterms: student.grades[subjectId]?.midterms || '',
            final: student.grades[subjectId]?.final || '',
            finalGrade: student.grades[subjectId]?.finalGrade || '',
            remarks: student.grades[subjectId]?.remarks || ''
          }
        }
      }));
      setStudents(updatedStudents);
    }
  };

  const downloadTemplate = async () => {
    if (!selectedClass || !selectedSubject) {
      toast.warning('Please select both class and subject first');
      return;
    }

    try {
      setLoading(true);
      
      // Create CSV content matching the Google Sheets layout
      const selectedClassObj = classes[selectedClass];
      const selectedSubjectObj = subjects.find(s => s._id === selectedSubject);
      
      let csvContent = 'Subject,Student Name,School ID,Prelims,Midterms,Final,Final Grade,Remarks\n';
      
      students.forEach(student => {
        const grades = student.grades[selectedSubject] || {};
        csvContent += `${selectedSubjectObj.subjectCode},${student.name},${student.schoolID},${grades.prelims || ''},${grades.midterms || ''},${grades.final || ''},${grades.finalGrade || ''},${grades.remarks || ''}\n`;
      });
      
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedClassObj.className}_${selectedSubjectObj.subjectCode}_TraditionalGrades.csv`);
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

    if (!selectedClass || !selectedSubject) {
      toast.warning('Please select both class and subject first');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('classId', classes[selectedClass].classID);
      formData.append('subjectId', selectedSubject);

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
        fetchStudents();
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

  const updateGrade = async (studentId, field, value) => {
    try {
      // Update local state first for immediate UI feedback
      const updatedStudents = students.map(student => {
        if (student._id === studentId) {
          const updatedGrades = {
            ...student.grades[selectedSubject],
            [field]: value
          };
          
          // Calculate final grade if all three grades are present
          if (updatedGrades.prelims && updatedGrades.midterms && updatedGrades.final) {
            const prelims = parseFloat(updatedGrades.prelims) || 0;
            const midterms = parseFloat(updatedGrades.midterms) || 0;
            const final = parseFloat(updatedGrades.final) || 0;
            
            const finalGrade = (prelims * 0.3) + (midterms * 0.3) + (final * 0.4);
            updatedGrades.finalGrade = finalGrade.toFixed(2);
            updatedGrades.remarks = finalGrade >= 75 ? 'PASSED' : 'FAILED';
          }
          
          return {
            ...student,
            grades: {
              ...student.grades,
              [selectedSubject]: updatedGrades
            }
          };
        }
        return student;
      });
      
      setStudents(updatedStudents);
      
      // Send update to backend
      const token = localStorage.getItem('token');
      await axios.put(`/api/traditional-grades/faculty/update`, {
        studentId,
        subjectId: selectedSubject,
        field,
        value,
        classId: classes[selectedClass].classID
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

  return (
    <div className="faculty-traditional-grades">
      <div className="grades-header">
        <h2>Traditional Grades Management</h2>
        <p>Manage student grades with prelims (30%), midterms (30%), and finals (40%)</p>
      </div>

      {/* Academic Period Display */}
      <div className="academic-period">
        <div className="period-info">
          <div className="info-item">
            <label>Academic Year:</label>
            <span>{academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Loading...'}</span>
          </div>
          <div className="info-item">
            <label>Term:</label>
            <span>{currentTerm ? currentTerm.termName : 'Loading...'}</span>
          </div>
        </div>
      </div>

      {/* Class and Subject Selection */}
      <div className="selection-section">
        <div className="form-group">
          <label htmlFor="class-select">Select Class & Section:</label>
          <select
            id="class-select"
            value={selectedClass}
            onChange={handleClassChange}
            disabled={loading}
          >
            <option value="">Choose a class...</option>
            {classes.map((cls, index) => (
              <option key={cls.classID} value={index}>
                {cls.className} - {cls.sectionName || 'No Section'} ({cls.trackName || 'N/A'} | {cls.strandName || 'N/A'} | {cls.gradeLevel || 'N/A'})
              </option>
            ))}
          </select>
        </div>

        {selectedClass && (
          <div className="form-group">
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

      {/* Template Actions */}
      {selectedClass && selectedSubject && (
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

      {/* Grades Table */}
      {selectedClass && selectedSubject && students.length > 0 && (
        <div className="grades-table-container">
          <h3>Student Grades - {subjects.find(s => s._id === selectedSubject)?.subjectCode}</h3>
          <div className="table-responsive">
            <table className="grades-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>School ID</th>
                  <th>Prelims (30%)</th>
                  <th>Midterms (30%)</th>
                  <th>Final (40%)</th>
                  <th>Final Grade</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const grades = student.grades[selectedSubject] || {};
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
                          value={grades.prelims || ''}
                          onChange={(e) => updateGrade(student._id, 'prelims', e.target.value)}
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
                          value={grades.midterms || ''}
                          onChange={(e) => updateGrade(student._id, 'midterms', e.target.value)}
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
                          value={grades.final || ''}
                          onChange={(e) => updateGrade(student._id, 'final', e.target.value)}
                        />
                      </td>
                      <td className="final-grade">
                        {grades.finalGrade || ''}
                      </td>
                      <td className="remarks">
                        {grades.remarks || ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedClass && selectedSubject && students.length === 0 && (
        <div className="no-data">
          <p>No students found in this class/subject combination.</p>
        </div>
      )}

      {(!selectedClass || !selectedSubject) && (
        <div className="no-data">
          <p>Please select both a class and subject to view grades.</p>
        </div>
      )}
    </div>
  );
};

export default FacultyTraditionalGrades;
