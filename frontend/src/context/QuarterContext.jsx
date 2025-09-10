import React, { createContext, useContext, useState, useEffect } from 'react';

const QuarterContext = createContext();

export const QuarterProvider = ({ children }) => {
  // Default values
  const [globalQuarter, setGlobalQuarter] = useState('Q1');
  const [globalTerm, setGlobalTerm] = useState('Term 1');
  const [globalAcademicYear, setGlobalAcademicYear] = useState('2024-2025');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active academic year from API on mount
  useEffect(() => {
    async function fetchActiveAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setIsLoading(false);
          return;
        }

        const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";
        const response = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const academicYear = await response.json();
          if (academicYear) {
            const yearString = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
            setGlobalAcademicYear(yearString);
            // Update localStorage with the fetched value
            localStorage.setItem('selectedAcademicYear', yearString);
          }
        }
      } catch (error) {
        console.error('Failed to fetch active academic year:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchActiveAcademicYear();
  }, []);

  // Load saved values from localStorage on mount (but don't override API-fetched academic year)
  useEffect(() => {
    const savedQuarter = localStorage.getItem('selectedQuarter');
    const savedTerm = localStorage.getItem('selectedTerm');
    const savedAcademicYear = localStorage.getItem('selectedAcademicYear');

    if (savedQuarter) setGlobalQuarter(savedQuarter);
    if (savedTerm) setGlobalTerm(savedTerm);
    // Only use saved academic year if we haven't fetched from API yet
    if (savedAcademicYear && !isLoading) {
      setGlobalAcademicYear(savedAcademicYear);
    }
  }, [isLoading]);

  // Save to localStorage whenever values change
  useEffect(() => {
    console.log('🎯 QuarterContext: Quarter changed to', globalQuarter);
    localStorage.setItem('selectedQuarter', globalQuarter);
  }, [globalQuarter]);

  useEffect(() => {
    localStorage.setItem('selectedTerm', globalTerm);
  }, [globalTerm]);

  useEffect(() => {
    localStorage.setItem('selectedAcademicYear', globalAcademicYear);
  }, [globalAcademicYear]);

  const updateQuarter = (quarter) => {
    console.log('🎯 QuarterContext: Updating quarter from', globalQuarter, 'to', quarter);
    setGlobalQuarter(quarter);
  };

  const updateTerm = (term) => {
    setGlobalTerm(term);
    // Reset quarter when term changes
    if (term === 'Term 1') {
      setGlobalQuarter('Q1');
    } else if (term === 'Term 2') {
      setGlobalQuarter('Q3');
    }
  };

  const updateAcademicYear = (year) => {
    setGlobalAcademicYear(year);
  };

  // Get available quarters based on current term
  const getAvailableQuarters = () => {
    if (globalTerm === 'Term 1') {
      return [
        { value: 'Q1', label: 'Quarter 1' },
        { value: 'Q2', label: 'Quarter 2' }
      ];
    } else if (globalTerm === 'Term 2') {
      return [
        { value: 'Q3', label: 'Quarter 3' },
        { value: 'Q4', label: 'Quarter 4' }
      ];
    }
    return [];
  };

  // Get current quarter info
  const getCurrentQuarterInfo = () => {
    return {
      quarter: globalQuarter,
      term: globalTerm,
      academicYear: globalAcademicYear,
      displayName: `${globalQuarter} - ${globalTerm}`,
      fullDisplayName: `${globalQuarter} - ${globalTerm} (${globalAcademicYear})`
    };
  };

  // Validate quarter and term combination
  const isValidQuarterTerm = (quarter, term) => {
    if (term === 'Term 1') {
      return ['Q1', 'Q2'].includes(quarter);
    } else if (term === 'Term 2') {
      return ['Q3', 'Q4'].includes(quarter);
    }
    return false;
  };

  const value = {
    // State
    globalQuarter,
    globalTerm,
    globalAcademicYear,
    isLoading,
    
    // Setters
    setGlobalQuarter: updateQuarter,
    setGlobalTerm: updateTerm,
    setGlobalAcademicYear: updateAcademicYear,
    
    // Helpers
    getAvailableQuarters,
    getCurrentQuarterInfo,
    isValidQuarterTerm
  };

  return (
    <QuarterContext.Provider value={value}>
      {children}
    </QuarterContext.Provider>
  );
};

export const useQuarter = () => {
  const context = useContext(QuarterContext);
  if (!context) {
    throw new Error('useQuarter must be used within a QuarterProvider');
  }
  return context;
};

export default QuarterContext;
