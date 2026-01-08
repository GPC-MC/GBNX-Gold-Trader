import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const DashboardLayout: React.FC = () => {
  return (
    <div className="relative min-h-screen text-white">
      <Navbar />
      <Outlet />
    </div>
  );
};

export default DashboardLayout;
