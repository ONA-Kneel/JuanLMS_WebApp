// import { useState } from "react";

import Student_Navbar from "./Student_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";
import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Student_Grades() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState({});
  const [showProfileModal, setShowProfileModal] = useState(false);

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
              quarter1: '', // Will be populated when grades are available
              quarter2: '',
              semestralGrade: ''
            }));
            
            setStudentSubjects(subjects);
          } else {
            // If no specific endpoint, create sample data for demonstration
            setStudentSubjects([
              {
                subjectCode: 'INT-CK-25',
                subjectDescription: 'Introduction to Cooking',
                quarter1: '',
                quarter2: '',
                semestralGrade: ''
              }
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching student subjects:', error);
        // Set sample data for demonstration
        setStudentSubjects([
          {
            subjectCode: 'INT-CK-25',
            subjectDescription: 'Introduction to Cooking',
            quarter1: '',
            quarter2: '',
            semestralGrade: ''
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
                quarter1: grade.quarter1 || grade.prelims || '',
                quarter2: grade.quarter2 || grade.midterms || '',
                semestralGrade: grade.semestralGrade || grade.finalGrade || ''
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

  // Helper function to get quarter labels based on current term
  const getQuarterLabels = () => {
    if (currentTerm?.termName === 'Term 1') {
      return { q1: '1st Quarter', q2: '2nd Quarter' };
    } else if (currentTerm?.termName === 'Term 2') {
      return { q1: '3rd Quarter', q2: '4th Quarter' };
    } else {
      return { q1: '1st Quarter', q2: '2nd Quarter' };
    }
  };

  // Helper function to calculate semestral grade
  const calculateSemestralGrade = (quarter1, quarter2) => {
    if (!quarter1 || !quarter2) return '';
    
    const q1 = parseFloat(quarter1) || 0;
    const q2 = parseFloat(quarter2) || 0;
    
    const semestralGrade = (q1 + q2) / 2;
    return semestralGrade.toFixed(2);
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

  const quarterLabels = getQuarterLabels();

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Student_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header with Profile Menu */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Grades</h1>
            <p className="text-gray-600">
              View your academic performance for the current term
            </p>
          </div>
          <ProfileMenu onOpen={() => setShowProfileModal(true)} />
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
                  <th colSpan="5" className="text-center p-3 border-b font-bold text-lg bg-blue-50">
                    {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : ''} {currentTerm ? getSemesterName(currentTerm.termName) : ''}
                  </th>
                </tr>
                <tr className="bg-gray-100">
                  <th className="p-3 border border-gray-300 font-semibold text-left">Subject Code</th>
                  <th className="p-3 border border-gray-300 font-semibold text-left">Subject Description</th>
                  <th className="p-3 border border-gray-300 font-semibold text-center">{quarterLabels.q1}</th>
                  <th className="p-3 border border-gray-300 font-semibold text-center">{quarterLabels.q2}</th>
                  <th className="p-3 border border-gray-300 font-semibold text-center">Semestral Grade</th>
                </tr>
              </thead>
              <tbody>
                {studentSubjects.length > 0 ? (
                  studentSubjects.map((subject, index) => {
                    // Get grades for this subject if available
                    const subjectGrades = grades[subject.subjectCode] || grades[subject.subjectDescription] || {};
                    const quarter1 = subjectGrades.quarter1 || subject.quarter1 || '';
                    const quarter2 = subjectGrades.quarter2 || subject.quarter2 || '';
                    const semestralGrade = subjectGrades.semestralGrade || calculateSemestralGrade(quarter1, quarter2);
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3 border border-gray-300 font-medium">
                          {subject.subjectCode}
                        </td>
                        <td className="p-3 border border-gray-300">
                          {subject.subjectDescription}
                        </td>
                        <td className="p-3 border border-gray-300 text-center">
                          {quarter1 || '-'}
                        </td>
                        <td className="p-3 border border-gray-300 text-center">
                          {quarter2 || '-'}
                        </td>
                        <td className="p-3 border border-gray-300 text-center font-semibold">
                          {semestralGrade || '-'}
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
              <p><strong>{quarterLabels.q1}:</strong> First quarter grade</p>
              <p><strong>{quarterLabels.q2}:</strong> Second quarter grade</p>
              <p><strong>Semestral Grade:</strong> Average of {quarterLabels.q1} and {quarterLabels.q2}</p>
            </div>
            <div>
              <p><strong>Passing Grade:</strong> 75 and above</p>
              <p><strong>Grade Range:</strong> 75-100</p>
              <p><strong>Remark:</strong> PASSED/FAILED</p>
            </div>
          </div>
        </div>

        {/* Profile Modal */}
        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}
      </div>
    </div>
  );
}
