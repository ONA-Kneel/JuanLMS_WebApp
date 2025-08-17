// import { useState } from "react";

import Student_Navbar from "./Student_Navbar";
import ProfileModal from "../ProfileModal";

// import { useNavigate } from "react-router-dom";
import ProfileMenu from "../ProfileMenu";
import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Student_Grades() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState({});

  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const year = await yearRes.json();
          setAcademicYear(year);
        }
      } catch (err) {
        console.error("Failed to fetch academic year", err);
      }
    }
    fetchAcademicYear();
  }, []);

  useEffect(() => {
    async function fetchActiveTermForYear() {
      if (!academicYear) return;
      try {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const terms = await res.json();
          const active = terms.find(term => term.status === 'active');
          setCurrentTerm(active || null);
        } else {
          setCurrentTerm(null);
        }
      } catch {
        setCurrentTerm(null);
      }
    }
    fetchActiveTermForYear();
  }, [academicYear]);

  // Fetch student's enrolled subjects for the current term
  useEffect(() => {
    async function fetchStudentSubjects() {
      if (!currentTerm || !academicYear) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const studentID = localStorage.getItem("userID");
        
        // Try to fetch student's enrolled classes/subjects for the current term
        const response = await fetch(`${API_BASE}/api/student-assignments/enrolled-subjects/${studentID}?termName=${currentTerm.termName}&schoolYear=${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStudentSubjects(data.subjects || []);
        } else {
          // Fallback: try to get classes where student is a member
          const classesResponse = await fetch(`${API_BASE}/classes/my-classes`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (classesResponse.ok) {
            const classesData = await classesResponse.json();
            // Filter classes for current term
            const currentTermClasses = classesData.filter(cls => 
              cls.termName === currentTerm.termName && 
              cls.academicYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`
            );
            
            // Transform classes to subjects format
            const subjects = currentTermClasses.map(cls => ({
              subjectCode: cls.classCode || 'N/A',
              subjectDescription: cls.className || 'N/A',
              prelims: '', // Will be populated when grades are available
              midterms: '',
              final: '',
              finalGrade: '',
              remark: ''
            }));
            
            setStudentSubjects(subjects);
          } else {
            // If no specific endpoint, create sample data for demonstration
            setStudentSubjects([
              {
                subjectCode: 'MATH101',
                subjectDescription: 'Mathematics',
                prelims: '',
                midterms: '',
                final: '',
                finalGrade: '',
                remark: ''
              },
              {
                subjectCode: 'ENG101',
                subjectDescription: 'English',
                prelims: '',
                midterms: '',
                final: '',
                finalGrade: '',
                remark: ''
              }
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching student subjects:', error);
        // Set sample data for demonstration
        setStudentSubjects([
          {
            subjectCode: 'MATH101',
            subjectDescription: 'Mathematics',
            prelims: '',
            midterms: '',
            final: '',
            finalGrade: '',
            remark: ''
          },
          {
            subjectCode: 'ENG101',
            subjectDescription: 'English',
            prelims: '',
            midterms: '',
            final: '',
            finalGrade: '',
            remark: ''
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudentSubjects();
  }, [currentTerm, academicYear]);

  // Fetch actual grades for the student's subjects
  useEffect(() => {
    async function fetchGrades() {
      if (!studentSubjects.length || !currentTerm || !academicYear) return;
      
      try {
        const token = localStorage.getItem("token");
        
        // Try to fetch grades from the traditional grades endpoint
        const response = await fetch(`${API_BASE}/api/traditional-grades/student/my-grades?termId=${currentTerm._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.grades) {
            // Create a map of grades by subject code
            const gradesMap = {};
            data.grades.forEach(grade => {
              const key = grade.subjectCode || grade.subjectDescription;
              gradesMap[key] = {
                prelims: grade.prelims,
                midterms: grade.midterms,
                final: grade.final,
                finalGrade: grade.finalGrade
              };
            });
            setGrades(gradesMap);
          }
        }
      } catch (error) {
        console.error('Error fetching grades:', error);
      }
    }
    
    fetchGrades();
  }, [studentSubjects, currentTerm, academicYear]);

  // Helper function to get semester name based on term
  const getSemesterName = (termName) => {
    if (termName === 'Term 1') return '1st Semester';
    if (termName === 'Term 2') return '2nd Semester';
    return termName;
  };

  // Helper function to calculate final grade
  const calculateFinalGrade = (prelims, midterms, final) => {
    if (!prelims || !midterms || !final) return '';
    
    const prelimsNum = parseFloat(prelims) || 0;
    const midtermsNum = parseFloat(midterms) || 0;
    const finalNum = parseFloat(final) || 0;
    
    const finalGrade = (prelimsNum * 0.3) + (midtermsNum * 0.3) + (finalNum * 0.4);
    return finalGrade.toFixed(2);
  };

  // Helper function to get remark
  const getRemark = (finalGrade) => {
    if (!finalGrade) return '';
    const grade = parseFloat(finalGrade);
    if (grade >= 75) return 'PASSED';
    return 'FAILED';
  };

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Student_Navbar />
        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          <div className="text-center py-8">
            <p className="text-gray-600 text-lg">Loading your grades...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Student_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Grades</h1>
          <p className="text-gray-600">
            View your academic performance for the current term
          </p>
        </div>

        {/* Current Academic Period Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Current Academic Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Academic Year</label>
              <p className="text-lg font-semibold text-gray-900">
                {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Loading...'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Term</label>
              <p className="text-lg font-semibold text-gray-900">
                {currentTerm ? getSemesterName(currentTerm.termName) : 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {/* Grades Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 text-sm">
              <thead>
                <tr>
                  <th colSpan="7" className="text-center p-3 border-b font-bold text-lg bg-blue-50">
                    {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : ''} {currentTerm ? getSemesterName(currentTerm.termName) : ''}
                  </th>
                </tr>
                <tr className="bg-gray-100">
                  <th className="p-3 border border-gray-300 font-semibold text-left">Subject Code</th>
                  <th className="p-3 border border-gray-300 font-semibold text-left">Subject Description</th>
                  <th className="p-3 border border-gray-300 font-semibold text-center">Prelims</th>
                  <th className="p-3 border border-gray-300 font-semibold text-center">Midterms</th>
                  <th className="p-3 border border-gray-300 font-semibold text-center">Final</th>
                  <th className="p-3 border border-gray-300 font-semibold text-center">Finals Grade</th>
                  <th className="p-3 border border-gray-300 font-semibold text-center">Remark</th>
                </tr>
              </thead>
              <tbody>
                {studentSubjects.length > 0 ? (
                  studentSubjects.map((subject, index) => {
                    // Get grades for this subject if available
                    const subjectGrades = grades[subject.subjectCode] || grades[subject.subjectDescription] || {};
                    const prelims = subjectGrades.prelims || subject.prelims || '';
                    const midterms = subjectGrades.midterms || subject.midterms || '';
                    const final = subjectGrades.final || subject.final || '';
                    const finalGrade = subjectGrades.finalGrade || calculateFinalGrade(prelims, midterms, final);
                    const remark = getRemark(finalGrade);
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3 border border-gray-300 font-medium">
                          {subject.subjectCode}
                        </td>
                        <td className="p-3 border border-gray-300">
                          {subject.subjectDescription}
                        </td>
                        <td className="p-3 border border-gray-300 text-center">
                          {prelims || '-'}
                        </td>
                        <td className="p-3 border border-gray-300 text-center">
                          {midterms || '-'}
                        </td>
                        <td className="p-3 border border-gray-300 text-center">
                          {final || '-'}
                        </td>
                        <td className="p-3 border border-gray-300 text-center font-semibold">
                          {finalGrade || '-'}
                        </td>
                        <td className="p-3 border border-gray-300 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            remark === 'PASSED' ? 'bg-green-100 text-green-800' : 
                            remark === 'FAILED' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {remark || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  // Show empty rows if no subjects
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td className="p-3 border border-gray-300 h-12"></td>
                      <td className="p-3 border border-gray-300"></td>
                      <td className="p-3 border border-gray-300"></td>
                      <td className="p-3 border border-gray-300"></td>
                      <td className="p-3 border border-gray-300"></td>
                      <td className="p-3 border border-gray-300"></td>
                      <td className="p-3 border border-gray-300"></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* No Subjects Message */}
        {studentSubjects.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6 text-center">
            <p className="text-gray-600 text-lg">
              No subjects found for the current term. Please contact your administrator if you believe this is an error.
            </p>
          </div>
        )}

        {/* Grade Legend */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Grade Legend</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Prelims:</strong> 30% of final grade</p>
              <p><strong>Midterms:</strong> 30% of final grade</p>
              <p><strong>Final:</strong> 40% of final grade</p>
            </div>
            <div>
              <p><strong>Passing Grade:</strong> 75 and above</p>
              <p><strong>Grade Range:</strong> 75-100</p>
              <p><strong>Remark:</strong> PASSED/FAILED</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
