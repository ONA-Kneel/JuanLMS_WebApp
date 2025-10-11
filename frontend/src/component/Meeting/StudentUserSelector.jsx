import React, { useState, useEffect } from 'react';
import { Search, UserPlus, ChevronDown, ChevronRight, Users, Check } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

const StudentUserSelector = ({ selectedUsers, onUsersChange }) => {
  const [allStudents, setAllStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});

  // Fetch all students for invitation
  useEffect(() => {
    const fetchAllStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        console.log('🔍 Fetching students for invitation...');
        let response = await fetch(`${API_BASE}/users/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('📡 Response status:', response.status);
        
        // If /users/all fails, try /users/active as fallback
        if (!response.ok) {
          console.log('🔄 /users/all failed, trying /users/active...');
          response = await fetch(`${API_BASE}/users/active`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('📡 Fallback response status:', response.status);
        }
        
        if (response.ok) {
          const users = await response.json();
          console.log('📊 Users fetched:', users);
          console.log('📊 Total users:', users.length);
          
          // Filter to only include students and exclude current user
          const currentUserId = JSON.parse(atob(token.split('.')[1]))._id;
          console.log('👤 Current user ID:', currentUserId);
          
          const students = users.filter(user => {
            const isNotCurrentUser = user._id !== currentUserId;
            const isStudent = user.role === 'students' || user.role === 'student'; // Check both plural and singular
            const isActive = user.status !== 'inactive';
            
            console.log(`👤 User ${user.firstName || user.firstname} ${user.lastName || user.lastname}:`, {
              id: user._id,
              role: user.role,
              status: user.status,
              isNotCurrentUser,
              isStudent,
              isActive,
              passes: isNotCurrentUser && isStudent && isActive
            });
            
            return isNotCurrentUser && isStudent && isActive;
          });
          
          console.log('👨‍🎓 Filtered students:', students);
          console.log('👨‍🎓 Student count:', students.length);
          setAllStudents(students);
        } else {
          const errorData = await response.json();
          console.error('❌ Failed to fetch users:', errorData);
        }
      } catch (error) {
        console.error('💥 Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllStudents();
  }, []);

  // Filter students based on search term
  const filteredStudents = allStudents.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    const firstName = student.firstName || student.firstname || '';
    const lastName = student.lastName || student.lastname || '';
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    const email = (student.email || '').toLowerCase();
    const studentId = (student.studentId || student.schoolID || '').toLowerCase();
    
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           studentId.includes(searchLower);
  });

  // Group students by grade level or section if available
  const groupedStudents = filteredStudents.reduce((groups, student) => {
    const groupKey = student.gradeLevel || student.section || 'Other Students';
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(student);
    return groups;
  }, {});

  const toggleUserSelection = (user) => {
    const isSelected = selectedUsers.some(selected => selected._id === user._id);
    if (isSelected) {
      onUsersChange(selectedUsers.filter(selected => selected._id !== user._id));
    } else {
      onUsersChange([...selectedUsers, user]);
    }
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const isUserSelected = (user) => {
    return selectedUsers.some(selected => selected._id === user._id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading students...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search students by name, email, or student ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Selected Users Summary */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600 font-medium">Selected Students</p>
              <p className="text-xs text-blue-500">{selectedUsers.length} student{selectedUsers.length !== 1 ? 's' : ''} selected</p>
            </div>
          </div>
        </div>
      )}

      {/* Students List */}
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        {Object.keys(groupedStudents).length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No students found</p>
            {searchTerm && <p className="text-sm">Try adjusting your search terms</p>}
          </div>
        ) : (
          Object.entries(groupedStudents).map(([sectionKey, students]) => (
            <div key={sectionKey} className="border-b border-gray-100 last:border-b-0">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(sectionKey)}
                className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {expandedSections[sectionKey] ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="font-medium text-gray-700">{sectionKey}</span>
                  <span className="text-sm text-gray-500">({students.length})</span>
                </div>
              </button>

              {/* Students in Section */}
              {expandedSections[sectionKey] && (
                <div className="bg-white">
                  {students.map(student => (
                    <div
                      key={student._id}
                      onClick={() => toggleUserSelection(student)}
                      className={`px-4 py-3 border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                        isUserSelected(student) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isUserSelected(student) 
                          ? 'bg-blue-600 border-blue-600' 
                          : 'border-gray-300'
                      }`}>
                        {isUserSelected(student) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {student.firstName || student.firstname} {student.lastName || student.lastname}
                          </p>
                          {(student.studentId || student.schoolID) && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {student.studentId || student.schoolID}
                            </span>
                          )}
                        </div>
                        {student.email && (
                          <p className="text-sm text-gray-500 truncate">{student.email}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      {filteredStudents.length > 0 && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              const allFilteredSelected = filteredStudents.filter(student => 
                selectedUsers.some(selected => selected._id === student._id)
              );
              if (allFilteredSelected.length === filteredStudents.length) {
                // Deselect all filtered
                const remaining = selectedUsers.filter(selected => 
                  !filteredStudents.some(filtered => filtered._id === selected._id)
                );
                onUsersChange(remaining);
              } else {
                // Select all filtered
                const newSelections = filteredStudents.filter(student => 
                  !selectedUsers.some(selected => selected._id === student._id)
                );
                onUsersChange([...selectedUsers, ...newSelections]);
              }
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {filteredStudents.every(student => 
              selectedUsers.some(selected => selected._id === student._id)
            ) ? 'Deselect All' : 'Select All'}
          </button>
          {selectedUsers.length > 0 && (
            <button
              onClick={() => onUsersChange([])}
              className="text-sm text-red-600 hover:text-red-800 font-medium ml-4"
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentUserSelector;
