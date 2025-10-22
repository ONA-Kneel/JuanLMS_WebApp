import React, { useState, useEffect } from 'react';
import { Camera, Mic, MicOff, Video, VideoOff, AlertCircle, CheckCircle, X } from 'lucide-react';
import { mediaPermissions } from '../../utils/mediaPermissions';

const PermissionRequestModal = ({ 
  isOpen, 
  onClose, 
  onPermissionsGranted, 
  onPermissionsDenied 
}) => {
  const [permissionStates, setPermissionStates] = useState({
    camera: 'prompt',
    microphone: 'prompt'
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestResults, setRequestResults] = useState({});
  const [showInstructions, setShowInstructions] = useState(false);
  const [browserInstructions, setBrowserInstructions] = useState(null);

  useEffect(() => {
    if (isOpen) {
      checkCurrentPermissions();
      setBrowserInstructions(mediaPermissions.getBrowserInstructions());
    }
  }, [isOpen]);

  const checkCurrentPermissions = async () => {
    await mediaPermissions.checkPermissions();
    setPermissionStates(mediaPermissions.getPermissionStates());
  };

  const handleRequestCamera = async () => {
    setIsRequesting(true);
    const result = await mediaPermissions.requestCameraPermission();
    setRequestResults(prev => ({ ...prev, camera: result }));
    setPermissionStates(mediaPermissions.getPermissionStates());
    setIsRequesting(false);
  };

  const handleRequestMicrophone = async () => {
    setIsRequesting(true);
    const result = await mediaPermissions.requestMicrophonePermission();
    setRequestResults(prev => ({ ...prev, microphone: result }));
    setPermissionStates(mediaPermissions.getPermissionStates());
    setIsRequesting(false);
  };

  const handleRequestBoth = async () => {
    setIsRequesting(true);
    const results = await mediaPermissions.requestBothPermissions();
    setRequestResults(results);
    setPermissionStates(mediaPermissions.getPermissionStates());
    setIsRequesting(false);
  };

  const handleContinue = () => {
    if (mediaPermissions.arePermissionsGranted()) {
      onPermissionsGranted?.();
    } else if (mediaPermissions.arePermissionsDenied()) {
      onPermissionsDenied?.();
    }
    onClose();
  };

  const getPermissionIcon = (type) => {
    const state = permissionStates[type];
    if (state === 'granted') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (state === 'denied') return <AlertCircle className="w-5 h-5 text-red-500" />;
    return type === 'camera' ? <Video className="w-5 h-5 text-gray-400" /> : <Mic className="w-5 h-5 text-gray-400" />;
  };

  const getPermissionText = (type) => {
    const state = permissionStates[type];
    if (state === 'granted') return 'Granted';
    if (state === 'denied') return 'Denied';
    return 'Not Requested';
  };

  const getPermissionColor = (type) => {
    const state = permissionStates[type];
    if (state === 'granted') return 'text-green-600';
    if (state === 'denied') return 'text-red-600';
    return 'text-gray-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Camera & Microphone Access
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            To participate in video meetings, we need access to your camera and microphone. 
            This allows you to see and hear other participants.
          </p>

          <div className="space-y-3">
            {/* Camera Permission */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getPermissionIcon('camera')}
                <div>
                  <div className="font-medium">Camera</div>
                  <div className={`text-sm ${getPermissionColor('camera')}`}>
                    {getPermissionText('camera')}
                  </div>
                </div>
              </div>
              {permissionStates.camera !== 'granted' && (
                <button
                  onClick={handleRequestCamera}
                  disabled={isRequesting}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isRequesting ? 'Requesting...' : 'Enable'}
                </button>
              )}
            </div>

            {/* Microphone Permission */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getPermissionIcon('microphone')}
                <div>
                  <div className="font-medium">Microphone</div>
                  <div className={`text-sm ${getPermissionColor('microphone')}`}>
                    {getPermissionText('microphone')}
                  </div>
                </div>
              </div>
              {permissionStates.microphone !== 'granted' && (
                <button
                  onClick={handleRequestMicrophone}
                  disabled={isRequesting}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isRequesting ? 'Requesting...' : 'Enable'}
                </button>
              )}
            </div>
          </div>

          {/* Error Messages */}
          {(requestResults.camera?.error || requestResults.microphone?.error) && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  {requestResults.camera?.error && (
                    <div>Camera: {requestResults.camera.error}</div>
                  )}
                  {requestResults.microphone?.error && (
                    <div>Microphone: {requestResults.microphone.error}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Browser Instructions */}
          {mediaPermissions.arePermissionsDenied() && (
            <div className="mt-4">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                {showInstructions ? 'Hide' : 'Show'} browser instructions
              </button>
              
              {showInstructions && browserInstructions && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-2">
                      Enable permissions in {browserInstructions.browser}:
                    </div>
                    <ol className="list-decimal list-inside space-y-1">
                      {browserInstructions.steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex gap-2">
            {!mediaPermissions.arePermissionsGranted() && (
              <button
                onClick={handleRequestBoth}
                disabled={isRequesting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isRequesting ? 'Requesting...' : 'Enable Both'}
              </button>
            )}
            
            <button
              onClick={handleContinue}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionRequestModal;
