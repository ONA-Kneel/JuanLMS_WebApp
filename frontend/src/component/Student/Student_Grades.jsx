// import { useState } from "react";

import Student_Navbar from "./Student_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";
import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Student_Grades() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [gradesByTerm, setGradesByTerm] = useState({});
  const [gradesLoaded, setGradesLoaded] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    async function fetchTermsForYear() {
      if (!academicYear) return;
      try {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const terms = await res.json();
          setAllTerms(terms);
          const active = terms.find(term => term.status === 'active');
          setCurrentTerm(active || null);
        } else {
          setAllTerms([]);
          setCurrentTerm(null);
        }
      } catch {
        setAllTerms([]);
        setCurrentTerm(null);
      }
    }
    fetchTermsForYear();
  }, [academicYear]);

  // Fetch student's enrolled classes for the current term
  useEffect(() => {
    async function fetchStudentClasses() {
      if (!currentTerm || !academicYear) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        let studentID = localStorage.getItem("userID");
        
        // If userID is not available, try to get it from the JWT token
        if (!studentID || studentID === 'undefined' || studentID === 'null') {
          try {
            const tokenRaw = localStorage.getItem('token');
            if (tokenRaw) {
              const payload = JSON.parse(atob(tokenRaw.split('.')[1] || '')) || {};
              // Try multiple possible fields for user ID
              studentID = payload.userID || payload.userId || payload.sub || payload._id;
            }
          } catch (e) {
            console.error('Error parsing JWT token:', e);
          }
        }
        
        console.log('🔍 Student ID for classes fetch:', studentID);
        console.log('🔍 Current term:', currentTerm);
        console.log('🔍 Academic year:', academicYear);
        
        // Debug JWT token
        try {
          const tokenRaw = localStorage.getItem('token');
          if (tokenRaw) {
            const payload = JSON.parse(atob(tokenRaw.split('.')[1] || '')) || {};
            console.log('🔍 JWT Token payload:', payload);
            console.log('🔍 User role from token:', payload.role);
            console.log('🔍 User ID from token:', payload.userID);
            console.log('🔍 User ObjectId from token:', payload._id);
          }
        } catch (e) {
          console.error('Error parsing JWT token for debugging:', e);
        }
        
        // Only try to fetch classes if we have a valid student ID
        if (studentID && studentID !== 'undefined' && studentID !== 'null') {
          // Fetch all classes and filter for current term
            const classesResponse = await fetch(`${API_BASE}/classes/my-classes`, {
              headers: { Authorization: `Bearer ${token}` }
            });
          
          console.log('📚 Classes response status:', classesResponse.status);
            
            if (classesResponse.ok) {
              const classesData = await classesResponse.json();
            console.log('📚 All classes fetched:', classesData);
            console.log('📚 Number of classes:', classesData.length);
            
            // Filter classes for current term and where student is a member
            const currentTermClasses = classesData.filter(cls => {
              const matchesTerm = cls.termName === currentTerm.termName;
              const matchesYear = cls.academicYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
              console.log(`📚 Class ${cls.className}: term=${cls.termName} (${matchesTerm}), year=${cls.academicYear} (${matchesYear})`);
              return matchesTerm && matchesYear;
            });
            
            console.log('📚 Current term classes after filtering:', currentTermClasses);
            console.log('📚 Number of current term classes:', currentTermClasses.length);
            
            // If no classes found with strict filtering, show all classes for debugging
            let classesToUse = currentTermClasses;
            if (currentTermClasses.length === 0 && classesData.length > 0) {
              console.log('⚠️ No classes found with strict filtering, showing all classes for debugging');
              classesToUse = classesData;
            }
              
              // Transform classes to subjects format
            const subjects = classesToUse.map(cls => ({
              classId: cls.classID,
                subjectCode: cls.classCode || 'N/A',
                subjectDescription: cls.className || 'N/A',
              section: cls.section || 'N/A',
                quarter1: '', // Will be populated when grades are available
                quarter2: '',
              termFinalGrade: ''
              }));
              
              setStudentSubjects(subjects);
            console.log('📚 Transformed subjects:', subjects);
            } else {
            const errorText = await classesResponse.text();
            console.error('❌ Failed to fetch classes:', classesResponse.status, errorText);
            setStudentSubjects([]);
          }
        } else {
          console.log('⚠️ No valid student ID found');
          setStudentSubjects([]);
        }
      } catch (error) {
        console.error('Error fetching student classes:', error);
        setStudentSubjects([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudentClasses();
  }, [currentTerm, academicYear]);

  // Fetch posted grades for all terms
  useEffect(() => {
    async function fetchPostedGrades() {
      if (!academicYear || studentSubjects.length === 0 || allTerms.length === 0) return;
      
      try {
        const token = localStorage.getItem("token");
        let studentID = localStorage.getItem("userID");
        
        // Get student ID from JWT token if not available
        if (!studentID || studentID === 'undefined' || studentID === 'null') {
          try {
            const tokenRaw = localStorage.getItem('token');
            if (tokenRaw) {
              const payload = JSON.parse(atob(tokenRaw.split('.')[1] || '')) || {};
              // Try multiple possible fields for user ID
              studentID = payload.userID || payload.userId || payload.sub || payload._id;
            }
          } catch (e) {
            console.error('Error parsing JWT token:', e);
          }
        }
        
        console.log('🔍 Fetching posted grades for student:', studentID);
        
        if (studentID && studentID !== 'undefined' && studentID !== 'null') {
          const allGradesByTerm = {};
          
          // Process each term
          for (const term of allTerms) {
            console.log(`📚 Processing grades for term: ${term.termName}`);
            const termGrades = [];
            
            // Fetch grades for each subject in this term
            const gradesPromises = studentSubjects.map(async (subject) => {
              try {
                // Try to fetch posted quarterly grades for this class
                const apiUrl = `${API_BASE}/api/grades/student-posted-grades?studentId=${studentID}&classId=${subject.classId}&section=${subject.section}`;
                console.log(`🔍 Fetching grades from: ${apiUrl}`);
                
                const response = await fetch(apiUrl, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                console.log(`📡 Response status for ${subject.subjectDescription}:`, response.status);
                
                if (response.ok) {
                  const data = await response.json();
                  console.log(`📥 Response data for ${subject.subjectDescription}:`, data);
                  
                  if (data.success && data.data && data.data.grades && data.data.grades.length > 0) {
                    console.log(`✅ Posted grades found for ${subject.subjectDescription}:`, data.data.grades);
                    
                    // Find grades for this student
                    const studentGrades = data.data.grades.find(grade => grade.studentId === studentID);
                    if (studentGrades) {
                      console.log(`✅ Found student grades for ${subject.subjectDescription}:`, studentGrades);
                      return {
                        classId: subject.classId,
                        subjectCode: subject.subjectCode,
                        subjectDescription: subject.subjectDescription,
                        quarter1: studentGrades.grades?.Q1?.quarterlyGrade || '',
                        quarter2: studentGrades.grades?.Q2?.quarterlyGrade || '',
                        termFinalGrade: studentGrades.grades?.Q2?.termFinalGrade || '',
                        remarks: studentGrades.grades?.Q2?.remarks || ''
                      };
                    } else {
                      console.log(`⚠️ No student grades found in response for ${subject.subjectDescription}`);
                    }
                  } else {
                    console.log(`⚠️ No grades in response for ${subject.subjectDescription}:`, data);
                  }
                } else {
                  const errorText = await response.text();
                  console.log(`❌ API error for ${subject.subjectDescription}:`, response.status, errorText);
                }
              } catch (error) {
                console.error(`❌ Error fetching grades for ${subject.subjectDescription}:`, error);
              }
              
              // Return empty grades if no posted grades found
              return {
                classId: subject.classId,
                subjectCode: subject.subjectCode,
                subjectDescription: subject.subjectDescription,
                quarter1: '',
                quarter2: '',
                termFinalGrade: '',
                remarks: ''
              };
            });
            
            const gradesResults = await Promise.all(gradesPromises);
            const validGrades = gradesResults.filter(grade => grade.quarter1 || grade.quarter2);
            
            if (validGrades.length > 0) {
              allGradesByTerm[term.termName] = validGrades;
              console.log(`📊 Grades for ${term.termName}:`, validGrades);
            }
          }
          
          console.log('📊 All grades by term:', allGradesByTerm);
          setGradesByTerm(allGradesByTerm);
          setGradesLoaded(Object.keys(allGradesByTerm).length);
        } else {
          console.log('⚠️ No valid student ID for grades fetch');
          setGradesByTerm({});
          setGradesLoaded(0);
        }
        
      } catch (error) {
        console.error('Error fetching posted grades:', error);
        setGradesByTerm({});
        setGradesLoaded(0);
      }
    }
    
    fetchPostedGrades();
  }, [academicYear, studentSubjects, allTerms]);

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

        {/* Grades Tables for Each Term */}
        {Object.keys(gradesByTerm).map((termName) => {
          const termGrades = gradesByTerm[termName];
          const isTerm1 = termName === 'Term 1';
          const quarterLabels = isTerm1 ? { q1: '1st Quarter', q2: '2nd Quarter' } : { q1: '3rd Quarter', q2: '4th Quarter' };
          
          return (
            <div key={termName} className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead>
                    <tr>
                      <th colSpan="5" className="text-center p-3 border-b font-bold text-lg bg-blue-50">
                        {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : ''} {getSemesterName(termName)}
                      </th>
                    </tr>
                    <tr className="bg-gray-100">
                      <th className="p-3 border border-gray-300 font-semibold text-left">Subject Description</th>
                      <th className="p-3 border border-gray-300 font-semibold text-center">{quarterLabels.q1}</th>
                      <th className="p-3 border border-gray-300 font-semibold text-center">{quarterLabels.q2}</th>
                      <th className="p-3 border border-gray-300 font-semibold text-center">Term Final Grade</th>
                      <th className="p-3 border border-gray-300 font-semibold text-center">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentSubjects.map((subject, index) => {
                      // Get grades for this subject if available
                      const subjectGrades = termGrades.find(g => g.classId === subject.classId);
                      const quarter1 = subjectGrades?.quarter1 || '';
                      const quarter2 = subjectGrades?.quarter2 || '';
                      const termFinalGrade = subjectGrades?.termFinalGrade || '';
                      const remarks = subjectGrades?.remarks || '';
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
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
                            {termFinalGrade || '-'}
                          </td>
                          <td className="p-3 border border-gray-300 text-center">
                            {remarks || '-'}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* General Average Row - Only Term Final */}
                    <tr className="bg-blue-50 font-bold">
                      <td className="p-3 border border-gray-300 text-center font-semibold">
                        General Average
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        -
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        -
                      </td>
                      <td className="p-3 border border-gray-300 text-center bg-blue-100 font-semibold">
                        {(() => {
                          const termFinalGrades = termGrades
                            .map(g => g.termFinalGrade)
                            .filter(grade => grade && grade !== '' && !isNaN(parseFloat(grade)))
                            .map(grade => parseFloat(grade));
                          
                          if (termFinalGrades.length > 0) {
                            const average = termFinalGrades.reduce((sum, grade) => sum + grade, 0) / termFinalGrades.length;
                            return Math.round(average * 100) / 100;
                          }
                          return '-';
                        })()}
                      </td>
                      <td className="p-3 border border-gray-300 text-center bg-blue-100 font-semibold">
                        {(() => {
                          const termFinalGrades = termGrades
                            .map(g => g.termFinalGrade)
                            .filter(grade => grade && grade !== '' && !isNaN(parseFloat(grade)))
                            .map(grade => parseFloat(grade));
                          
                          if (termFinalGrades.length > 0) {
                            const average = termFinalGrades.reduce((sum, grade) => sum + grade, 0) / termFinalGrades.length;
                            return average >= 75 ? 'PASSED' : 'REPEAT';
                          }
                          return '-';
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

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
              <p><strong>{quarterLabels.q1}:</strong> First quarter grade (posted by faculty)</p>
              <p><strong>{quarterLabels.q2}:</strong> Second quarter grade (posted by faculty)</p>
              <p><strong>Term Final Grade:</strong> Average of {quarterLabels.q1} and {quarterLabels.q2}</p>
            </div>
            <div>
              <p><strong>Passing Grade:</strong> 75 and above</p>
              <p><strong>Grade Range:</strong> 60-100 (DepEd minimum)</p>
              <p><strong>Remark:</strong> PASSED/REPEAT</p>
            </div>
          </div>
        </div>

        {/* Grades Status Info */}
        {Object.keys(gradesByTerm).length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Grades are posted by your faculty and are now visible.
                </p>
                <p className="text-sm text-green-700 mt-1">
                  You have grades for {Object.keys(gradesByTerm).length} term{Object.keys(gradesByTerm).length !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>
          </div>
        )}

        {studentSubjects.length > 0 && Object.keys(gradesByTerm).length === 0 && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">
                  No grades posted yet.
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your faculty will post grades once they are ready. Check back later.
                </p>
              </div>
            </div>
          </div>
        )}

        

        {/* Profile Modal */}
        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}
      </div>
    </div>
  );
}
