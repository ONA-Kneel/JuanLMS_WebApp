// Reusable Confirmation Modal Component
// 
// Usage Example:
// const [showConfirm, setShowConfirm] = useState(false);
// 
// <ConfirmationModal
//   isOpen={showConfirm}
//   onClose={() => setShowConfirm(false)}
//   onConfirm={() => { /* your action */ setShowConfirm(false); }}
//   title="Confirm Action"
//   message="Are you sure you want to proceed?"
//   confirmText="Yes, Continue"
//   cancelText="Cancel"
//   type="danger" // "warning", "danger", "info", "success"
//   isLoading={false}
// />
//
import React from 'react';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // "warning", "danger", "info", "success"
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: (
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          iconBg: "bg-red-100",
          borderColor: "border-red-200",
          confirmButton: "bg-red-600 hover:bg-red-700 focus:ring-red-500"
        };
      case 'success':
        return {
          icon: (
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          iconBg: "bg-green-100",
          borderColor: "border-green-200",
          confirmButton: "bg-green-600 hover:bg-green-700 focus:ring-green-500"
        };
      case 'info':
        return {
          icon: (
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          iconBg: "bg-blue-100",
          borderColor: "border-blue-200",
          confirmButton: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
        };
      default: // warning
        return {
          icon: (
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          iconBg: "bg-yellow-100",
          borderColor: "border-yellow-200",
          confirmButton: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
        };
    }
  };

  const styles = getTypeStyles();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
      <div className={`bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border-2 ${styles.borderColor}`}>
        {/* Header */}
        <div className="text-center p-6 border-b border-gray-200">
          <div className={`mx-auto w-16 h-16 ${styles.iconBg} rounded-full flex items-center justify-center mb-4`}>
            {styles.icon}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 text-white py-3 px-4 rounded-lg font-semibold transition-colors focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmButton}`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
