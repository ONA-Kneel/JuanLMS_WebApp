// GroupNicknameManager.jsx
import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Settings } from 'lucide-react';
import { getUserDisplayName } from '../utils/userDisplayUtils';
import defaultAvatar from '../assets/profileicon (1).svg';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function GroupNicknameManager({ currentUserId, groupName, participants, users, contactNicknames, onNicknameUpdate, className = "" }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [nickname, setNickname] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const buttonRef = useRef(null);

  const handleToggleDropdown = (e) => {
    e.stopPropagation();
    if (!showDropdown && buttonRef.current) {
      // Calculate position for dropdown to appear above messages
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const messagesContainer = document.querySelector('.flex-1.overflow-y-auto');
      
      if (messagesContainer) {
        const messagesRect = messagesContainer.getBoundingClientRect();
        const dropdownHeight = 300; // Approximate height of dropdown
        const dropdownWidth = 300; // Width of dropdown
        
        // Position above the messages area
        let top = messagesRect.top - dropdownHeight - 10; // 10px gap above messages
        
        // Ensure dropdown doesn't go off the top of the screen
        if (top < 10) {
          top = 10; // Minimum 10px from top edge
        }
        
        // Align with the button, but ensure it doesn't go off-screen
        let left = buttonRect.left - dropdownWidth + buttonRect.width;
        if (left < 10) left = 10; // Minimum 10px from left edge
        if (left + dropdownWidth > window.innerWidth - 10) {
          left = window.innerWidth - dropdownWidth - 10; // Ensure it doesn't go off right edge
        }
        
        setDropdownPosition({ top, left });
      } else {
        // Fallback positioning if messages container not found
        const top = Math.max(buttonRect.top - 300 - 10, 10);
        const left = Math.max(buttonRect.left - 300 + buttonRect.width, 10);
        setDropdownPosition({ top, left });
      }
    }
    setShowDropdown(!showDropdown);
  };

  const handleParticipantSelect = async (participantId) => {
    setSelectedParticipant(participantId);
    setIsEditing(false);
    setError("");
    
    // Fetch existing nickname for this participant
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE}/users/${currentUserId}/contacts/${participantId}/nickname`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setNickname(response.data.nickname || "");
    } catch (error) {
      console.error('Error fetching contact nickname:', error);
      setNickname("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNickname = async () => {
    if (!selectedParticipant) return;
    
    if (!nickname.trim()) {
      setError('Nickname cannot be empty');
      return;
    }

    if (nickname.length > 50) {
      setError('Nickname must be 50 characters or less');
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      
      const response = await axios.patch(`${API_BASE}/users/${currentUserId}/contacts/${selectedParticipant}/nickname`, 
        { nickname: nickname.trim() },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setNickname(response.data.nickname);
      setIsEditing(false);
      
      if (onNicknameUpdate) {
        onNicknameUpdate(selectedParticipant, response.data.nickname);
      }
    } catch (error) {
      console.error('Error updating contact nickname:', error);
      setError(error.response?.data?.error || 'Failed to update nickname');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNickname = async () => {
    if (!selectedParticipant) return;

    try {
      setIsLoading(true);
      await axios.delete(`${API_BASE}/users/${currentUserId}/contacts/${selectedParticipant}/nickname`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setNickname("");
      
      if (onNicknameUpdate) {
        onNicknameUpdate(selectedParticipant, "");
      }
    } catch (error) {
      console.error('Error deleting contact nickname:', error);
      setError(error.response?.data?.error || 'Failed to delete nickname');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError("");
    setSelectedParticipant(null);
    setNickname("");
  };

  // Helper function to get original name
  const getOriginalName = (user) => {
    if (!user) return '';
    const firstName = user.firstname || '';
    const lastName = user.lastname || '';
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    }
    return '';
  };

  return (
    <div className={`group-nickname-manager ${className}`}>
      <div className="relative">
        {/* Settings Icon Button */}
        <button
          ref={buttonRef}
          onClick={handleToggleDropdown}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          title="Group member nicknames"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Dropdown Menu - Positioned above messages */}
      {showDropdown && (
        <div 
          className="fixed w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <div className="p-3 border-b border-gray-200">
            <h4 className="font-semibold text-sm text-gray-800">Group Member Nicknames</h4>
            <p className="text-xs text-gray-500 mt-1">{groupName}</p>
          </div>
          
          <div className="p-3 max-h-60 overflow-y-auto">
            {!selectedParticipant ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 mb-3">Select a member to set their nickname:</p>
                {participants.map((participantId) => {
                  const participant = users.find(u => u._id === participantId);
                  if (!participant) return null;
                  
                  const displayName = getUserDisplayName(participant, contactNicknames[participantId]);
                  const currentNickname = contactNicknames[participantId];
                  
                  return (
                    <div
                      key={participantId}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => handleParticipantSelect(participantId)}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={participant.profilePic ? `${API_BASE}/uploads/${participant.profilePic}` : defaultAvatar}
                          alt="Profile"
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => { e.target.src = defaultAvatar; }}
                        />
                        <div>
                          <div className="text-sm font-medium">{getOriginalName(participant) || displayName}</div>
                          {currentNickname && (
                            <div className="text-xs text-blue-600">Nickname: {currentNickname}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">Click to edit</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-sm">
                    Set nickname for {selectedParticipant ? getUserDisplayName(users.find(u => u._id === selectedParticipant), contactNicknames[selectedParticipant]) : ''}
                  </h5>
                  <button
                    onClick={handleCancel}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Back
                  </button>
                </div>
                
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Set Nickname
                      </label>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Enter nickname"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={50}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveNickname();
                          } else if (e.key === 'Escape') {
                            handleCancel();
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    {error && (
                      <div className="text-red-500 text-xs">{error}</div>
                    )}
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveNickname}
                        disabled={isLoading}
                        className="flex-1 px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50"
                      >
                        {isLoading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="flex-1 px-3 py-1 bg-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-400 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nickname ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          <strong>Current nickname:</strong> {nickname}
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        No nickname set
                      </div>
                    )}
                    
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex-1 px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                      >
                        {nickname ? 'Change' : 'Set'} Nickname
                      </button>
                      {nickname && (
                        <button
                          onClick={handleDeleteNickname}
                          disabled={isLoading}
                          className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-[99]"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
