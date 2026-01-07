import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const DashboardLayout: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-ink-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(212,175,55,0.20),_transparent_62%)] blur-3xl" />
        <div className="absolute -bottom-64 right-[-220px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,_rgba(242,210,124,0.10),_transparent_62%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,6,10,0.0),rgba(5,6,10,0.92))]" />
      </div>

      <div className="relative">
        <Navbar />
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
