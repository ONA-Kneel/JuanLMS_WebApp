import React from 'react';
import { FaExclamationTriangle, FaTrash, FaTimes, FaInfoCircle } from 'react-icons/fa';

const DependencyWarningModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  entityName, 
  entityType, 
  dependencies, 
  isLoading = false 
}) => {
  if (!isOpen) return null;

  const getEntityIcon = (type) => {
    switch (type) {
      case 'tracks': return '🏃';
      case 'strands': return '🧬';
      case 'sections': return '📚';
      case 'subjects': return '📖';
      case 'studentAssignments': return '👨‍🎓';
      case 'facultyAssignments': return '👨‍🏫';
      case 'terms': return '📅';
      default: return '📋';
    }
  };

  const getEntityLabel = (type) => {
    switch (type) {
      case 'tracks': return 'Tracks';
      case 'strands': return 'Strands';
      case 'sections': return 'Sections';
      case 'subjects': return 'Subjects';
      case 'studentAssignments': return 'Student Assignments';
      case 'facultyAssignments': return 'Faculty Assignments';
      case 'terms': return 'Terms';
      default: return type;
    }
  };

  const dependencyItems = Object.entries(dependencies)
    .filter(([key, value]) => key !== 'totalConnections' && key !== entityType && Array.isArray(value) && value.length > 0)
    .map(([key, value]) => ({
      type: key,
      count: value.length,
      icon: getEntityIcon(key),
      label: getEntityLabel(key)
    }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-3 rounded-full">
              <FaExclamationTriangle className="text-red-600 text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">⚠️ Critical Warning</h2>
              <p className="text-gray-600">This action will permanently delete data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <FaInfoCircle className="text-red-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800 mb-2">
                  You are about to delete: <span className="font-bold">{entityName}</span>
                </h3>
                <p className="text-red-700 text-sm">
                  This {entityType} has connected data that will also be permanently deleted. 
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Dependencies List */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">📊 Connected Data That Will Be Deleted:</h4>
            <div className="space-y-3">
              {dependencyItems.map((item) => (
                <div key={item.type} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="font-medium text-gray-700">{item.label}</span>
                  </div>
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {item.count} {item.count === 1 ? 'record' : 'records'}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 bg-red-100 border border-red-300 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-red-800">Total Connected Records:</span>
                <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg">
                  {dependencies.totalConnections}
                </span>
              </div>
            </div>
          </div>

          {/* Final Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <FaExclamationTriangle className="text-yellow-600" />
              <span className="text-yellow-800 font-medium">
                ⚠️ This action will permanently remove all the data listed above from the system.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <FaTrash />
                <span>Delete All Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DependencyWarningModal;
