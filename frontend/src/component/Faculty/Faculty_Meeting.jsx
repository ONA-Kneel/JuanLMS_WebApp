import React from 'react';
import Faculty_Navbar from './Faculty_Navbar';
import ProfileMenu from '../ProfileMenu';

const Faculty_Meeting = () => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Meeting</h2>
            <p className="text-base md:text-lg"> Academic Year and Term here | 
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <ProfileMenu/>
        </div>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Meeting Component</h1>
            <p>This component is currently under maintenance.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Faculty_Meeting; 