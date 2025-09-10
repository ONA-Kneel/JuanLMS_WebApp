import React from 'react';
import { useQuarter } from '../context/QuarterContext';

const QuarterSelector = ({ showTitle = true, className = "" }) => {
  const {
    globalQuarter,
    globalTerm,
    globalAcademicYear,
    isLoading,
    setGlobalQuarter,
    getAvailableQuarters,
    getCurrentQuarterInfo
  } = useQuarter();

  const availableQuarters = getAvailableQuarters();
  const quarterInfo = getCurrentQuarterInfo();

  const handleQuarterChange = (e) => {
    const newQuarter = e.target.value;
    setGlobalQuarter(newQuarter);
  };

  return (
    <div className={`quarter-selector ${className}`}>
      {showTitle && (
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Quarter Management
        </h3>
      )}
      
      <div className="quarter-controls grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Academic Year Display (read-only) */}
        <div className="control-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Academic Year
          </label>
          <div className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
            {isLoading ? "Loading..." : globalAcademicYear}
          </div>
        </div>

        {/* Term Display (read-only) */}
        <div className="control-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Term
          </label>
          <div className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
            {globalTerm}
          </div>
        </div>

        {/* Quarter Selection */}
        <div className="control-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quarter
          </label>
          <select
            value={globalQuarter}
            onChange={handleQuarterChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableQuarters.map((quarter) => (
              <option key={quarter.value} value={quarter.value}>
                {quarter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Current Selection Display */}
      <div className="quarter-info mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800">
              Current Selection: <span className="font-semibold">{quarterInfo.displayName}</span>
            </p>
            <p className="text-xs text-blue-600">
              Academic Year: {quarterInfo.academicYear}
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {quarterInfo.quarter}
            </div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="help-text mt-2 text-xs text-gray-500">
        <p>
          Select the quarter you're currently working on. Current term and academic year are read-only here.
        </p>
      </div>
    </div>
  );
};

export default QuarterSelector;
