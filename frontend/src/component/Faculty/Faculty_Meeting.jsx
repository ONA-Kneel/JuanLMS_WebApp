import React, { useState, useEffect } from 'react';
import { CallComposite, fromFlatCommunicationIdentifier, useAzureCommunicationCallAdapter } from '@azure/communication-react';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import axios from 'axios';

const Faculty_Meeting = () => {
  const [userId, setUserId] = useState('');
  const [token, setToken] = useState('');
  const [teamsMeetingLink, setTeamsMeetingLink] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create credential from token
  const credential = React.useMemo(() => {
    if (token) {
      return new AzureCommunicationTokenCredential(token);
    }
    return null;
  }, [token]);

  // Create call adapter
  const callAdapterArgs = React.useMemo(() => {
    if (userId && credential && displayName && teamsMeetingLink) {
      return {
        userId: fromFlatCommunicationIdentifier(userId),
        credential,
        displayName,
        teamsMeetingLink
      };
    }
    return null;
  }, [userId, credential, displayName, teamsMeetingLink]);

  const callAdapter = useAzureCommunicationCallAdapter(callAdapterArgs);

  useEffect(() => {
    const initializeMeeting = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with your actual API endpoint
        const response = await axios.get('/api/meeting/initialize', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const { userId, token, teamsMeetingLink, displayName } = response.data;
        setUserId(userId);
        setToken(token);
        setTeamsMeetingLink(teamsMeetingLink);
        setDisplayName(displayName);
      } catch (err) {
        setError('Failed to initialize meeting. Please try again later.');
        console.error('Meeting initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMeeting();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      {callAdapter && (
        <CallComposite
          adapter={callAdapter}
          options={{
            callControls: {
              cameraButton: true,
              microphoneButton: true,
              screenShareButton: true,
              moreButton: true,
              peopleButton: true,
              displayType: 'compact'
            }
          }}
        />
      )}
    </div>
  );
};

export default Faculty_Meeting; 