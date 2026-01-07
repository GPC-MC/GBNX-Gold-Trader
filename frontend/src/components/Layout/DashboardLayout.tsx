import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B1220' }}>
      <Navbar />
      <Outlet />
    </div>
  );
};

export default DashboardLayout;

