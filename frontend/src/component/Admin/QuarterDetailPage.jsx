import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import TermDetails from './TermDetails';

const API_BASE = "";

export default function QuarterDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { quarterId } = useParams();
  const { quarter, schoolYear, quarterName } = location.state || {};
  
  const [quarterData, setQuarterData] = useState(null);
  const [termData, setTermData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (quarterId) {
      fetchQuarterAndTermData();
    } else if (quarter && quarterName) {
      // Fallback to location state if quarterId is not available
      setQuarterData(quarter);
      fetchTermForQuarter();
    } else {
      setError('Quarter information not found');
      setLoading(false);
    }
  }, [quarterId, quarter, quarterName]);

  const fetchQuarterAndTermData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch quarter details
      const quarterRes = await fetch(`${API_BASE}/api/quarters/${quarterId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!quarterRes.ok) {
        const errorData = await quarterRes.json();
        console.error('Failed to fetch quarter data:', errorData);
        throw new Error('Failed to fetch quarter data');
      }
      
      const quarterData = await quarterRes.json();
      console.log('Fetched quarter data:', quarterData);
      setQuarterData(quarterData);
      
      // Find the term that contains this quarter
      await fetchTermForQuarter(quarterData);
      
    } catch (err) {
      console.error('Error fetching quarter data:', err);
      setError('Failed to load quarter data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTermForQuarter = async (quarter = quarterData) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching term for quarter:', quarter);
      
      // Fetch the term that contains this quarter
      const termRes = await fetch(`${API_BASE}/api/terms/schoolyear/${quarter.schoolYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (termRes.ok) {
        const terms = await termRes.json();
        console.log('Fetched terms:', terms);
        // Find the term that matches the quarter's termName
        const term = terms.find(t => t.termName === quarter.termName);
        console.log('Found term:', term);
        if (term) {
          setTermData(term);
        } else {
          setError('Associated term not found for this quarter');
        }
      } else {
        const errorData = await termRes.json();
        console.error('Failed to fetch term data:', errorData);
        setError('Failed to fetch term data');
      }
    } catch (err) {
      console.error('Error fetching term data:', err);
      setError('Failed to load term data');
    }
  };

  const handleBack = () => {
    navigate('/admin/academic-settings');
  };

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Admin_Navbar />
        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading quarter data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Admin_Navbar />
        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-600 text-xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If we have both quarter and term data, render the TermDetails component directly
  if (quarterData && termData) {
    return <TermDetails termData={termData} quarterData={quarterData} />;
  }

  // Fallback if data is not ready
  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Admin_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Preparing quarter view...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
