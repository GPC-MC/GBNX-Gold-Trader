import React from 'react';
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
    { path: '/', icon: Briefcase, label: 'Portfolio' },
    { path: '/market', icon: TrendingUp, label: 'Market' }
  ];

  const secondaryNavItems = [
    { path: '/news', icon: Newspaper, label: 'Market News' },
    { path: '/ai-studio', icon: Bot, label: 'AI Studio' }
  ];

  return (
    <nav className="sticky top-0 z-50 border-b shadow-lg" style={{ backgroundColor: '#0B1220', borderColor: 'rgba(212, 175, 55, 0.15)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="mr-8" style={{ fontSize: '19px', fontWeight: 600, color: '#D4AF37', letterSpacing: '0.02em' }}>
              Assetra AI
            </div>
            <div className="hidden md:flex items-center space-x-1">
              {/* Primary Navigation */}
              {primaryNavItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `relative flex items-center px-4 py-2 transition-all duration-200 rounded-lg ${
                      isActive
                        ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#D4AF37] after:shadow-[0_0_12px_rgba(212,175,55,0.8)]'
                        : ''
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? '#F2D27C' : '#9CA3AF',
                    fontSize: '15px',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    backgroundColor: isActive ? 'rgba(212, 175, 55, 0.08)' : 'transparent'
                  })}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.classList.contains('active')) {
                      e.currentTarget.style.color = '#E5E7EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.classList.contains('active')) {
                      e.currentTarget.style.color = '#9CA3AF';
                    }
                  }}
                >
                  <Icon size={18} className="mr-2" />
                  {label}
                </NavLink>
              ))}

              {/* Divider */}
              <div className="h-6 w-px mx-2" style={{ backgroundColor: 'rgba(156, 163, 175, 0.2)' }}></div>

              {/* Secondary Navigation */}
              {secondaryNavItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `relative flex items-center px-4 py-2 transition-all duration-200 rounded-lg ${
                      isActive
                        ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#D4AF37] after:shadow-[0_0_12px_rgba(212,175,55,0.8)]'
                        : ''
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? '#F2D27C' : '#9CA3AF',
                    fontSize: '14px',
                    fontWeight: 400,
                    backgroundColor: isActive ? 'rgba(212, 175, 55, 0.08)' : 'transparent'
                  })}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.classList.contains('active')) {
                      e.currentTarget.style.color = '#E5E7EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.classList.contains('active')) {
                      e.currentTarget.style.color = '#9CA3AF';
                    }
                  }}
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
              <div className="text-xs font-medium mb-0.5" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>TOTAL BALANCE</div>
              <div className="flex items-baseline space-x-2">
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#E5E7EB' }}>$2,345</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(34, 197, 94, 0.7)' }}>+0.8%</span>
              </div>
            </div>

            {/* Utility Navigation */}
            <div className="flex items-center space-x-3">
              {/* Profile Link */}
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `p-2 rounded-lg transition-all duration-200 ${
                    isActive ? 'bg-[rgba(212,175,55,0.08)]' : ''
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? '#F2D27C' : '#9CA3AF'
                })}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.classList.contains('active')) {
                    e.currentTarget.style.color = '#E5E7EB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.classList.contains('active')) {
                    e.currentTarget.style.color = '#9CA3AF';
                  }
                }}
                title="Profile"
              >
                <User size={20} />
              </NavLink>

              {/* Avatar */}
              <img
                src={user?.picture || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=40'}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full border-2"
                style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
              />

              {/* Logout */}
              <button
                onClick={logout}
                className="p-2 rounded-lg transition-all duration-200"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#E5E7EB';
                  e.currentTarget.style.backgroundColor = 'rgba(229, 231, 235, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#9CA3AF';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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