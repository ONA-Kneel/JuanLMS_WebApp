import React, { useState, useEffect } from 'react';
import { Camera, Mic, MicOff, Video, VideoOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { mediaPermissions } from '../../utils/mediaPermissions';

const PermissionTestComponent = () => {
  const [permissionStates, setPermissionStates] = useState({
    camera: 'prompt',
    microphone: 'prompt'
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [showTest, setShowTest] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    await mediaPermissions.checkPermissions();
    setPermissionStates(mediaPermissions.getPermissionStates());
  };

  const testCamera = async () => {
    setIsTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Test for a short duration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      
      setTestResults(prev => ({ ...prev, camera: { success: true, message: 'Camera working correctly' } }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, camera: { success: false, message: error.message } }));
    }
    setIsTesting(false);
  };

  const testMicrophone = async () => {
    setIsTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Test for a short duration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      
      setTestResults(prev => ({ ...prev, microphone: { success: true, message: 'Microphone working correctly' } }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, microphone: { success: false, message: error.message } }));
    }
    setIsTesting(false);
  };

  const getStatusIcon = (type) => {
    const state = permissionStates[type];
    const testResult = testResults[type];
    
    if (testResult?.success) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (testResult?.success === false) return <XCircle className="w-5 h-5 text-red-500" />;
    if (state === 'granted') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (state === 'denied') return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusText = (type) => {
    const state = permissionStates[type];
    const testResult = testResults[type];
    
    if (testResult?.success) return 'Working';
    if (testResult?.success === false) return 'Failed';
    if (state === 'granted') return 'Granted';
    if (state === 'denied') return 'Denied';
    return 'Not Requested';
  };

  const getStatusColor = (type) => {
    const state = permissionStates[type];
    const testResult = testResults[type];
    
    if (testResult?.success) return 'text-green-600';
    if (testResult?.success === false) return 'text-red-600';
    if (state === 'granted') return 'text-green-600';
    if (state === 'denied') return 'text-red-600';
    return 'text-yellow-600';
  };

  if (!showTest) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">Camera & Microphone Test</h3>
          <button
            onClick={() => setShowTest(true)}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Test Permissions
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Verify that your camera and microphone are working correctly for video meetings.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">Camera & Microphone Test</h3>
        <button
          onClick={() => setShowTest(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Camera Test */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon('camera')}
            <div>
              <div className="font-medium flex items-center gap-2">
                Camera
                <span className={`text-sm ${getStatusColor('camera')}`}>
                  {getStatusText('camera')}
                </span>
              </div>
              {testResults.camera?.message && (
                <div className="text-xs text-gray-600">{testResults.camera.message}</div>
              )}
            </div>
          </div>
          <button
            onClick={testCamera}
            disabled={isTesting}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isTesting ? 'Testing...' : 'Test'}
          </button>
        </div>

        {/* Microphone Test */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon('microphone')}
            <div>
              <div className="font-medium flex items-center gap-2">
                Microphone
                <span className={`text-sm ${getStatusColor('microphone')}`}>
                  {getStatusText('microphone')}
                </span>
              </div>
              {testResults.microphone?.message && (
                <div className="text-xs text-gray-600">{testResults.microphone.message}</div>
              )}
            </div>
          </div>
          <button
            onClick={testMicrophone}
            disabled={isTesting}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isTesting ? 'Testing...' : 'Test'}
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>• This test will briefly access your camera/microphone to verify they work</p>
        <p>• No data is recorded or transmitted during the test</p>
        <p>• If tests fail, check your browser permissions and hardware</p>
      </div>
    </div>
  );
};

export default PermissionTestComponent;
