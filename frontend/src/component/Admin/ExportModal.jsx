import React from 'react';

const ExportModal = ({ isOpen, onClose, onExport, onExportPDF, loading, exportingPDF }) => {
  if (!isOpen) return null;

  const exportOptions = [
    { value: 'all', label: 'All Statuses', description: 'Export all registrants regardless of status' },
    { value: 'pending', label: 'Pending Only', description: 'Export only registrants with pending status' },
    { value: 'approved', label: 'Approved Only', description: 'Export only registrants with approved status' },
    { value: 'rejected', label: 'Rejected Only', description: 'Export only rejected registrants with rejection notes' }
  ];

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200">
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
            <div key={option.value} className="border border-gray-200 rounded-lg p-3">
              <div className="font-medium text-gray-900 mb-1">{option.label}</div>
              <div className="text-sm text-gray-500 mb-3">{option.description}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => onExport(option.value)}
                  disabled={loading || exportingPDF}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Exporting...' : 'Export Excel'}
                </button>
                <button
                  onClick={() => onExportPDF(option.value)}
                  disabled={loading || exportingPDF}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {exportingPDF ? 'Exporting...' : 'Export PDF'}
                </button>
              </div>
            </div>
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
