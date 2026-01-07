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

  const navItems = [
    { path: '/', icon: Briefcase, label: 'Portfolio' },
    { path: '/market', icon: TrendingUp, label: 'Market' },
    { path: '/news', icon: Newspaper, label: 'Market News' },
    { path: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
    { path: '/profile', icon: User, label: 'Profile' }
  ];

  return (
    <nav className="sticky top-0 z-50 border-b shadow-lg" style={{ backgroundColor: '#0B1220', borderColor: 'rgba(212, 175, 55, 0.15)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="font-bold text-xl mr-8" style={{ color: '#D4AF37', letterSpacing: '0.02em' }}>
              Assetra AI
            </div>
            <div className="hidden md:flex space-x-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `relative flex items-center px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#D4AF37] after:shadow-[0_0_8px_rgba(212,175,55,0.6)]'
                        : ''
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? '#D4AF37' : '#9CA3AF'
                  })}
                >
                  <Icon size={18} className="mr-2" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="font-semibold" style={{ color: '#16A34A' }}>
              $2,345 <span className="text-xs" style={{ color: '#9CA3AF' }}>+0.8%</span>
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <img
                src={user?.picture || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=40'}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full border-2"
                style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
              />
              <div className="hidden md:block">
                <div className="text-sm font-medium" style={{ color: '#E5E7EB' }}>{user?.name || 'Demo User'}</div>
                <div className="text-xs" style={{ color: '#9CA3AF' }}>{user?.email || 'demo@assetra.ai'}</div>
              </div>
              <button
                onClick={logout}
                className="p-2 transition-colors duration-200"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;