// NicknameManager.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function NicknameManager({ userId, onNicknameUpdate, className = "" }) {
  const [nickname, setNickname] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userId) {
      fetchNickname();
    }
  }, [userId]);

  const fetchNickname = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE}/users/${userId}/nickname`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setNickname(response.data.nickname || "");
    } catch (error) {
      console.error('Error fetching nickname:', error);
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
      
      const response = await axios.patch(`${API_BASE}/users/${userId}/nickname`, 
        { nickname: nickname.trim() },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setNickname(response.data.nickname);
      setIsEditing(false);
      
      // Notify parent component of the update
      if (onNicknameUpdate) {
        onNicknameUpdate(response.data.nickname);
      }
    } catch (error) {
      console.error('Error updating nickname:', error);
      setError(error.response?.data?.error || 'Failed to update nickname');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError("");
    fetchNickname(); // Reset to original value
  };

  if (isLoading && !isEditing) {
    return <div className={`text-gray-500 ${className}`}>Loading...</div>;
  }

  return (
    <div className={`nickname-manager ${className}`}>
      {isEditing ? (
        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter nickname"
              className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
            />
            <button
              onClick={handleSaveNickname}
              disabled={isLoading}
              className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-400 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {error && (
            <div className="text-red-500 text-xs">{error}</div>
          )}
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            {nickname ? `Nickname: ${nickname}` : 'No nickname set'}
          </span>
          <button
            onClick={() => setIsEditing(true)}
            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
          >
            {nickname ? 'Edit' : 'Set'}
          </button>
        </div>
      )}
    </div>
  );
}


