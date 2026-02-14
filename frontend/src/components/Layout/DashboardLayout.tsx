import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const DashboardLayout: React.FC = () => {
  return (
    <div className="relative min-h-screen text-white">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-60">
        <div className="h-full w-full bg-[radial-gradient(circle_at_12%_10%,rgba(47,209,255,0.12),transparent_36%),radial-gradient(circle_at_82%_6%,rgba(243,167,18,0.16),transparent_34%)]" />
      </div>

      <div className="relative z-10">
        <div className="border-b border-gold-500/20 bg-ink-975/90 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-gold-300 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <span>GBNX Terminal</span>
            <div className="hidden items-center gap-5 text-gray-400 sm:flex">
              <span className="text-emerald-300">Feed: Live</span>
              <span>Region: Global Macro</span>
              <span className="text-terminal-cyan">Session: New York</span>
            </div>
          </div>
        </div>
        <Navbar />
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
