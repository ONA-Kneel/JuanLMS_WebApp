import React, { useState } from 'react';
import { X, Calendar, Clock, Video, Users } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CreateMeetingModal = ({ isOpen, onClose, classID, onMeetingCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetingType: 'scheduled',
    scheduledTime: '',
    duration: '' // Make duration optional by default
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Validate form
      if (!formData.title.trim()) {
        setError('Meeting title is required');
        setLoading(false);
        return;
      }

      if (formData.meetingType === 'scheduled' && !formData.scheduledTime) {
        setError('Scheduled time is required for scheduled meetings');
        setLoading(false);
        return;
      }

      // Prepare meeting data with explicit field names
      const meetingData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        classID: classID, // Ensure this is the correct field name
        meetingType: formData.meetingType,
        duration: formData.duration ? parseInt(formData.duration) : null,
        scheduledTime: formData.meetingType === 'scheduled' && formData.scheduledTime
          ? new Date(formData.scheduledTime).toISOString()
          : new Date().toISOString()
      };

      console.log('Sending meeting data:', meetingData);

      const response = await fetch(`${API_BASE}/api/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(meetingData)
      });

      const result = await response.json();
      console.log('Meeting creation response:', { status: response.status, result });

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create meeting');
      }

      // If we get here, the meeting was created successfully
      // Reset form
      setFormData({
        title: '',
        description: '',
        meetingType: 'scheduled',
        scheduledTime: '',
        duration: '' // Reset to no duration
      });
      
      // Notify parent component
      if (onMeetingCreated) {
        onMeetingCreated(result);
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating meeting:', error);
      setError(error.message || 'Failed to create meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMeetingTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      meetingType: type,
      scheduledTime: type === 'instant' ? '' : prev.scheduledTime
    }));
  };

  // Get minimum date/time (current time + 5 minutes)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            Create Meeting
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Meeting Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleMeetingTypeChange('instant')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.meetingType === 'instant'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Video className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Start Now</div>
                <div className="text-xs text-gray-500">Instant meeting</div>
              </button>
              <button
                type="button"
                onClick={() => handleMeetingTypeChange('scheduled')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.meetingType === 'scheduled'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Schedule</div>
                <div className="text-xs text-gray-500">Set date & time</div>
              </button>
            </div>
          </div>

          {/* Meeting Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter meeting title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter meeting description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Scheduled Time (only for scheduled meetings) */}
          {formData.meetingType === 'scheduled' && (
            <div>
              <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Time *
              </label>
              <input
                type="datetime-local"
                id="scheduledTime"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleInputChange}
                min={getMinDateTime()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}

          {/* Duration - Optional */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                Duration (optional)
              </label>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, duration: '' }))}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                No time limit
              </button>
            </div>
            <select
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No time limit</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
              <option value={240}>4 hours</option>
              <option value={300}>5 hours</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  {formData.meetingType === 'instant' ? (
                    <>
                      <Video className="w-4 h-4" />
                      Start Meeting
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      Schedule Meeting
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMeetingModal;
