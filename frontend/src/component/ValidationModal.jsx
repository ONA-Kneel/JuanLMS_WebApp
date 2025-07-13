import React from 'react';
import Modal from 'react-modal';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

// Set the app element for react-modal
Modal.setAppElement('#root');

const ValidationModal = ({ 
    isOpen, 
    onClose, 
    type = 'error', // 'error', 'warning', 'success', 'info'
    title, 
    message, 
    onConfirm,
    confirmText = 'OK',
    showCancel = false,
    cancelText = 'Cancel'
}) => {
    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-8 h-8 text-blue-500" />;
            case 'warning':
                return <AlertCircle className="w-8 h-8 text-blue-500" />;
            case 'info':
                return <Info className="w-8 h-8 text-blue-500" />;
            case 'error':
            default:
                return <XCircle className="w-8 h-8 text-blue-500" />;
        }
    };

    const getTitleColor = () => {
        switch (type) {
            case 'success':
                return 'text-blue-600';
            case 'warning':
                return 'text-blue-600';
            case 'info':
                return 'text-blue-600';
            case 'error':
            default:
                return 'text-blue-600';
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'success':
                return 'bg-blue-900 hover:bg-blue-950';
            case 'warning':
                return 'bg-blue-900 hover:bg-blue-950';
            case 'info':
                return 'bg-blue-900 hover:bg-blue-950';
            case 'error':
            default:
                return 'bg-blue-900 hover:bg-blue-950';
        }
    };

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm"
            contentLabel="Validation Modal"
        >
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-modal-pop">
                <div className="flex items-center gap-3 mb-4">
                    {getIcon()}
                    <h3 className={`text-xl font-bold ${getTitleColor()}`}>
                        {title}
                    </h3>
                </div>
                
                <div className="mb-6">
                    <p className="text-gray-700 leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className={`flex gap-3 ${showCancel ? 'justify-end' : 'justify-center'}`}>
                    {showCancel && (
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className={`px-6 py-2 text-white rounded-lg transition-colors ${getButtonColor()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .animate-modal-pop {
                    animation: modalPop 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                @keyframes modalPop {
                    0% {
                        opacity: 0;
                        transform: scale(0.9) translateY(-10px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            `}</style>
        </Modal>
    );
};

export default ValidationModal; 