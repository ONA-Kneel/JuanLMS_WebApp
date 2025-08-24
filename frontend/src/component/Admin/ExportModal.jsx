import React from 'react';

const ExportModal = ({ isOpen, onClose, onExport, loading }) => {
  if (!isOpen) return null;

  const exportOptions = [
    { value: 'all', label: 'All Statuses', description: 'Export all registrants regardless of status' },
    { value: 'pending', label: 'Pending Only', description: 'Export only registrants with pending status' },
    { value: 'approved', label: 'Approved Only', description: 'Export only registrants with approved status' },
    { value: 'rejected', label: 'Rejected Only', description: 'Export only rejected registrants with rejection notes' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Export Registrants</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">
          Select what you would like to export:
        </p>
        
        <div className="space-y-3">
          {exportOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onExport(option.value)}
              disabled={loading}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-medium text-gray-900">{option.label}</div>
              <div className="text-sm text-gray-500">{option.description}</div>
            </button>
          ))}
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
