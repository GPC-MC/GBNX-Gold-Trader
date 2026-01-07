import React from 'react';
import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  TrendingUp,
  Briefcase,
  Bot,
  User,
  LogOut,
  Newspaper
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const primaryNavItems = [
    { path: '/dashboard', icon: Briefcase, label: 'Portfolio' },
    { path: '/dashboard/market', icon: TrendingUp, label: 'Market' }
  ];

  const secondaryNavItems = [
    { path: '/dashboard/news', icon: Newspaper, label: 'Market News' },
    { path: '/dashboard/ai-studio', icon: Bot, label: 'AI Studio' }
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-gold-500/10 bg-ink-950/65 backdrop-blur shadow-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="mr-8 text-[19px] font-semibold tracking-[0.02em] text-gold-500">
              Gold AI Platform
            </div>
            <div className="hidden md:flex items-center space-x-1">
              {/* Primary Navigation */}
              {primaryNavItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/dashboard'}
                  className={({ isActive }) =>
                    clsx(
                      'relative flex items-center px-4 py-2 rounded-lg transition-all duration-200 text-[15px] font-medium tracking-[0.02em]',
                      isActive
                        ? 'text-gold-300 bg-gold-500/10 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gold-500 after:shadow-[0_0_12px_rgba(212,175,55,0.8)]'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                    )
                  }
                >
                  <Icon size={18} className="mr-2" />
                  {label}
                </NavLink>
              ))}

              {/* Divider */}
              <div className="h-6 w-px mx-2 bg-white/10"></div>

              {/* Secondary Navigation */}
              {secondaryNavItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    clsx(
                      'relative flex items-center px-4 py-2 rounded-lg transition-all duration-200 text-[14px] font-normal',
                      isActive
                        ? 'text-gold-300 bg-gold-500/10 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gold-500 after:shadow-[0_0_12px_rgba(212,175,55,0.8)]'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                    )
                  }
                >
                  <Icon size={17} className="mr-2" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Total Balance - Simplified */}
            <div className="hidden md:block">
              <div className="text-xs font-semibold tracking-[0.18em] text-gray-500 mb-0.5">TOTAL BALANCE</div>
              <div className="flex items-baseline space-x-2">
                <span className="text-sm font-semibold text-gray-100">$2,345</span>
                <span className="text-xs font-semibold text-emerald-300/80">+0.8%</span>
              </div>
            </div>

            {/* Utility Navigation */}
            <div className="flex items-center space-x-3">
              {/* Profile Link */}
              <NavLink
                to="/dashboard/profile"
                className={({ isActive }) =>
                  clsx(
                    'p-2 rounded-xl transition-all duration-200',
                    isActive ? 'text-gold-300 bg-gold-500/10' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                  )
                }
                title="Profile"
              >
                <User size={20} />
              </NavLink>

              {/* Avatar */}
              <img
                src={user?.picture || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=40'}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full border-2 border-gold-500/30"
              />

              {/* Logout */}
              <button
                onClick={logout}
                className="p-2 rounded-xl transition-all duration-200 text-gray-400 hover:text-gray-100 hover:bg-white/5"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
