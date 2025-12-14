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
    <nav className="bg-gray-900 border-b border-yellow-500/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="text-yellow-400 font-bold text-xl mr-8">
              ⚡ GoldTrader AI
            </div>
            <div className="hidden md:flex space-x-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-yellow-500/20 text-yellow-400 shadow-lg'
                        : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-800'
                    }`
                  }
                >
                  <Icon size={18} className="mr-2" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-green-400 font-semibold">
              $2,345 <span className="text-xs">+0.8%</span>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <img
                src={user?.picture || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=40'}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full border-2 border-yellow-500/30"
              />
              <div className="hidden md:block">
                <div className="text-sm text-white font-medium">{user?.name || 'Demo User'}</div>
                <div className="text-xs text-gray-400">{user?.email || 'demo@goldtrader.ai'}</div>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors duration-200"
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