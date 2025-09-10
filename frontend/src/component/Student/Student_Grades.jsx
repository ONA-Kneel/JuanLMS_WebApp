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
  const [grades, setGrades] = useState([]);
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
        let studentID = localStorage.getItem("userID");
        
        // If userID is not available, try to get it from the JWT token
        if (!studentID || studentID === 'undefined' || studentID === 'null') {
          try {
            const tokenRaw = localStorage.getItem('token');
            if (tokenRaw) {
              const payload = JSON.parse(atob(tokenRaw.split('.')[1] || '')) || {};
              studentID = payload.userID || payload.userId || payload.sub;
            }
          } catch (e) {
            console.error('Error parsing JWT token:', e);
          }
        }
        
        console.log('🔍 Student ID for subjects fetch:', studentID);
        
        // Only try to fetch subjects if we have a valid student ID
        if (studentID && studentID !== 'undefined' && studentID !== 'null') {
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
        } else {
          console.log('⚠️ No valid student ID found, using fallback subjects');
          // If no valid student ID, create sample data for demonstration
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

  // Fetch actual grades for the student's subjects (or directly, even if subjects are missing)
  useEffect(() => {
    async function fetchGrades() {
      if (!currentTerm || !academicYear) return;
      
      try {
        const token = localStorage.getItem("token");
        // Prefer identifier from JWT payload if available for strict consistency
        let studentSchoolID = localStorage.getItem("schoolID");
        try {
          const tokenRaw = localStorage.getItem('token');
          if (tokenRaw) {
            const payload = JSON.parse(atob(tokenRaw.split('.')[1] || '')) || {};
            const claimSchool = payload.schoolID || payload.schoolId;
            const claimUser = payload.userID || payload.userId || payload.sub;
            if (claimSchool) studentSchoolID = claimSchool;
            if ((!studentSchoolID || studentSchoolID === 'null' || studentSchoolID === 'undefined') && claimUser) {
              studentSchoolID = claimUser;
            }
          }
        } catch {}
        if (!studentSchoolID || studentSchoolID === 'null' || studentSchoolID === 'undefined') {
          studentSchoolID = localStorage.getItem('userID');
        }
        
        console.log('🔍 Fetching grades using School ID:', studentSchoolID);
        console.log('🔍 JWT Token payload:', JSON.parse(atob(localStorage.getItem('token').split('.')[1] || '')));
        
        // First, test if the backend route is working
        try {
          const testResponse = await fetch(`${API_BASE}/api/semestral-grades/test`);
          if (testResponse.ok) {
            const testData = await testResponse.json();
            console.log('✅ Backend route test successful:', testData);
          } else {
            console.error('❌ Backend route test failed:', testResponse.status);
          }
        } catch (testError) {
          console.error('❌ Backend route test error:', testError);
        }
        
        // Try to fetch grades from the Semestral_Grades_Collection endpoint using schoolID
        const response = await fetch(`${API_BASE}/api/semestral-grades/student/${studentSchoolID}?termName=${currentTerm.termName}&academicYear=${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.grades) {
            console.log('✅ Grades loaded from Semestral_Grades_Collection using School ID:', studentSchoolID);
            console.log('Grades data:', data.grades);
            
            // Transform the grades data to match the expected format
            const transformedGrades = data.grades.map(grade => ({
              subjectCode: grade.subjectCode,
              subjectDescription: grade.subjectName,
              quarter1: grade.grades.quarter1 || '-',
              quarter2: grade.grades.quarter2 || '-',
              quarter3: grade.grades.quarter3 || '-',
              quarter4: grade.grades.quarter4 || '-',
              semestralGrade: grade.grades.semesterFinal || '-'
            }));
            
            setGrades(transformedGrades);
            setGradesLoaded(transformedGrades.length);
            return; // Exit early since we got grades from the new endpoint
          }
        } else {
          // Log the actual error response
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          console.error('❌ Semestral grades API error:', response.status, errorData);
        }
        
        // Fallback: Try to fetch from traditional grades endpoint
        console.log('Semestral grades endpoint not available, trying traditional grades...');
        const traditionalResponse = await fetch(`${API_BASE}/api/traditional-grades/student/${studentSchoolID}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (traditionalResponse.ok) {
          const traditionalData = await traditionalResponse.json();
          if (traditionalData.success && traditionalData.grades) {
            console.log('✅ Grades loaded from traditional grades endpoint using School ID:', studentSchoolID);
            console.log('Traditional grades data:', traditionalData.grades);
            
            // Transform traditional grades to match expected format
            const transformedTraditionalGrades = traditionalData.grades.map(grade => ({
              subjectCode: grade.subjectCode || 'N/A',
              subjectDescription: grade.subjectName || 'N/A',
              quarter1: grade.quarter1 || '-',
              quarter2: grade.quarter2 || '-',
              quarter3: grade.quarter3 || '-',
              quarter4: grade.quarter4 || '-',
              semestralGrade: grade.semesterFinal || '-'
            }));
            
            setGrades(transformedTraditionalGrades);
            setGradesLoaded(transformedTraditionalGrades.length);
            return;
          }
        }
        
        // If no grades found from either endpoint, try localStorage as last resort
        console.log('No grades found from API endpoints, checking localStorage...');
        const savedGrades = localStorage.getItem('classGrades');
        if (savedGrades) {
          try {
            const parsedGrades = JSON.parse(savedGrades);
            const studentGrades = parsedGrades.find(g => 
              g.schoolID === studentSchoolID
            );
            
            if (studentGrades) {
              console.log('✅ Grades loaded from localStorage using School ID:', studentSchoolID);
              console.log('LocalStorage grades:', studentGrades);
              
              // Transform localStorage grades to match expected format
              const transformedLocalGrades = [{
                subjectCode: studentGrades.subjectCode || 'N/A',
                subjectDescription: studentGrades.subjectName || 'N/A',
                quarter1: studentGrades.grades.quarter1 || '-',
                quarter2: studentGrades.grades.quarter2 || '-',
                quarter3: studentGrades.grades.quarter3 || '-',
                quarter4: studentGrades.grades.quarter4 || '-',
                semestralGrade: studentGrades.grades.semesterFinal || '-'
              }];
              
              setGrades(transformedLocalGrades);
              setGradesLoaded(transformedLocalGrades.length);
              return;
            }
          } catch (parseError) {
            console.error('Error parsing localStorage grades:', parseError);
          }
        }
        
        console.log('❌ No grades found from any source for School ID:', studentSchoolID);
        setGrades([]);
        setGradesLoaded(0);
        
      } catch (error) {
        console.error('Error fetching grades:', error);
        setGrades([]);
        setGradesLoaded(0);
      }
    }
    
    fetchGrades();
  }, [currentTerm, academicYear]);

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

  const testDatabaseConnection = async () => {
    try {
      const token = localStorage.getItem("token");
      const schoolID = localStorage.getItem("schoolID") || localStorage.getItem("userID");
      const response = await fetch(`${API_BASE}/api/test-db-connection`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Database connection successful:', data);
        alert('Database connection successful!');
      } else {
        const errorData = await response.json();
        console.error('❌ Database connection failed:', errorData);
        alert(`Database connection failed: ${errorData.message || response.statusText}`);
      }
    } catch (err) {
      console.error('❌ Error testing database connection:', err);
      alert('Error testing database connection.');
    }
  };

  // Function to manually fix schoolID issue
  const fixSchoolID = () => {
    const correctSchoolID = '123332123123';
    localStorage.setItem('schoolID', correctSchoolID);
    console.log('✅ School ID manually set to:', correctSchoolID);
    alert(`School ID set to: ${correctSchoolID}\n\nPlease refresh the page to see your grades.`);
    // Force a refresh to trigger the grades fetch
    window.location.reload();
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
                {(studentSubjects.length > 0 ? studentSubjects : grades.map(g => ({
                  subjectCode: g.subjectCode,
                  subjectDescription: g.subjectDescription || g.subjectName,
                  quarter1: g.quarter1,
                  quarter2: g.quarter2,
                  semestralGrade: g.semestralGrade
                }))).map((subject, index) => {
                    // Get grades for this subject if available
                    const subjectGrades = grades.find(g => g.subjectCode === subject.subjectCode || g.subjectDescription === subject.subjectDescription);
                    const quarter1 = subjectGrades?.quarter1 || subject.quarter1 || '';
                    const quarter2 = subjectGrades?.quarter2 || subject.quarter2 || '';
                    const semestralGrade = subjectGrades?.semestralGrade || calculateSemestralGrade(quarter1, quarter2);
                    
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
                  })}
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
