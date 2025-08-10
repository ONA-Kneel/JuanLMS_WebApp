// ContactNicknameManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Settings } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function ContactNicknameManager({ currentUserId, contactId, contactName, onNicknameUpdate, className = "", originalName = "" }) {
  const [nickname, setNickname] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (currentUserId && contactId) {
      fetchNickname();
    }
  }, [currentUserId, contactId]);

  const fetchNickname = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE}/users/${currentUserId}/contacts/${contactId}/nickname`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setNickname(response.data.nickname || "");
    } catch (error) {
      console.error('Error fetching contact nickname:', error);
      setError('Failed to fetch nickname');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNickname = async () => {
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
      
      const response = await axios.patch(`${API_BASE}/users/${currentUserId}/contacts/${contactId}/nickname`, 
        { nickname: nickname.trim() },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setNickname(response.data.nickname);
      setIsEditing(false);
      setShowDropdown(false);
      
      // Notify parent component of the update
      if (onNicknameUpdate) {
        onNicknameUpdate(contactId, response.data.nickname);
      }
    } catch (error) {
      console.error('Error updating contact nickname:', error);
      setError(error.response?.data?.error || 'Failed to update nickname');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNickname = async () => {
    try {
      setIsLoading(true);
      await axios.delete(`${API_BASE}/users/${currentUserId}/contacts/${contactId}/nickname`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setNickname("");
      setShowDropdown(false);
      
      // Notify parent component of the update
      if (onNicknameUpdate) {
        onNicknameUpdate(contactId, "");
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
    setShowDropdown(false);
  };

  const handleToggleDropdown = (e) => {
    e.stopPropagation();
    if (!showDropdown && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const messagesContainer = document.querySelector('.flex-1.overflow-y-auto');

      if (messagesContainer) {
        const messagesRect = messagesContainer.getBoundingClientRect();
        const dropdownHeight = 200; // Approximate height of dropdown
        const dropdownWidth = 256; // Width of dropdown

        let top = messagesRect.top - dropdownHeight - 10; // 10px gap above messages
        if (top < 10) { // Ensure dropdown doesn't go off the top of the screen
          top = 10;
        }

        let left = buttonRect.left - dropdownWidth + buttonRect.width; // Align with button
        if (left < 10) left = 10; // Minimum 10px from left edge
        if (left + dropdownWidth > window.innerWidth - 10) {
          left = window.innerWidth - dropdownWidth - 10; // Ensure it doesn't go off right edge
        }

        setDropdownPosition({ top, left });
      } else {
        // Fallback positioning if messages container not found
        const top = Math.max(buttonRect.top - 200 - 10, 10);
        const left = Math.max(buttonRect.left - 256 + buttonRect.width, 10);
        setDropdownPosition({ top, left });
      }
    }
    setShowDropdown(!showDropdown);
  };

  if (isLoading && !isEditing) {
    return <div className={`text-gray-500 ${className}`}>Loading...</div>;
  }

  return (
    <div className={`contact-nickname-manager ${className}`}>
      <div className="relative">
        {/* Settings Icon Button */}
        <button
          ref={buttonRef}
          onClick={handleToggleDropdown}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          title="Contact settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Dropdown Menu - Positioned above messages */}
      {showDropdown && (
        <div 
          className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <div className="p-3 border-b border-gray-200">
            <h4 className="font-semibold text-sm text-gray-800">Contact Settings</h4>
            <p className="text-xs text-gray-500 mt-1">{originalName || contactName}</p>
            {nickname && nickname.trim() && (
              <p className="text-xs text-blue-600 mt-1">Nickname: {nickname}</p>
            )}
          </div>
          
          <div className="p-3">
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
