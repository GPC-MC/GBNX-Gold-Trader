import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  TrendingUp,
  Briefcase,
  LayoutGrid,
  Bot,
  User,
  LogOut,
  Newspaper,
  ArrowLeftRight,
  BarChart3
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const apiBaseUrl = useMemo(() => {
    const raw = (import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined) || '';
    return raw.replace(/\/+$/, '');
  }, []);

  const [mcXau, setMcXau] = useState(0);

  useEffect(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/transactions/balance/MC`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const xau = data.balances?.find((b: { asset: string }) => b.asset === 'XAU')?.balance ?? 0;
        setMcXau(xau);
      })
      .catch(() => {});
  }, [apiBaseUrl]);

  const primaryNavItems = [
    { path: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { path: '/dashboard/portfolio', icon: Briefcase, label: 'Portfolio' },
    { path: '/dashboard/market', icon: TrendingUp, label: 'Market' },
    { path: '/dashboard/trade', icon: ArrowLeftRight, label: 'Trade' }
  ];

  const secondaryNavItems = [
    { path: '/dashboard/news', icon: Newspaper, label: 'Market News' },
    { path: '/dashboard/balances', icon: BarChart3, label: 'Balances' },
    { path: '/dashboard/ai-studio', icon: Bot, label: 'AI Studio' }
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-gold-500/20 bg-[#0b0f14]/80 backdrop-blur-md shadow-[0_1px_15px_-3px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {/* Logo with Glow */}
            <div className="mr-8 text-[20px] font-bold tracking-tight text-white drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]">
              <span className="text-gold-400">Gold</span> AI Platform
            </div>

            <div className="hidden md:flex items-center gap-x-2">
              {/* Primary Navigation */}
              {primaryNavItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/dashboard'}
                  className={({ isActive }) =>
                    clsx(
                      'group relative flex items-center px-4 py-2 rounded-lg transition-all duration-300 text-[15px] cursor-pointer select-none border border-transparent',
                      isActive
                        ? 'font-semibold tracking-[0.01em] text-white bg-gold-500/10 border-gold-500/20 shadow-[0_0_15px_-5px_rgba(212,175,55,0.3)]'
                        : 'font-medium tracking-normal text-gray-400 hover:text-gray-100 hover:bg-white/5 hover:border-white/5'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} className={clsx("mr-2.5 transition-colors duration-300", isActive ? "text-gold-400 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" : "text-gray-500 group-hover:text-gray-300")} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent mx-3"></div>

              {/* Secondary Navigation */}
              {secondaryNavItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    clsx(
                      'group relative flex items-center px-4 py-2 rounded-lg transition-all duration-300 text-[15px] cursor-pointer select-none border border-transparent',
                      isActive
                        ? 'font-semibold tracking-[0.01em] text-white bg-gold-500/10 border-gold-500/20 shadow-[0_0_15px_-5px_rgba(212,175,55,0.3)]'
                        : 'font-medium tracking-normal text-gray-400 hover:text-gray-100 hover:bg-white/5 hover:border-white/5'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} className={clsx("mr-2.5 transition-colors duration-300", isActive ? "text-gold-400 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" : "text-gray-500 group-hover:text-gray-300")} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Total Balance - Simplified */}
            <div className="hidden md:block">
              <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-gold-500/70 mb-0.5 text-right">MC Gold</div>
              <div className="flex items-baseline justify-end space-x-2">
                <span className="text-sm font-bold text-white tracking-wide">{mcXau.toFixed(3)} oz</span>
                <span className="text-xs font-semibold text-gold-400">XAU</span>
              </div>
            </div>

            {/* Utility Navigation */}
            <div className="flex items-center space-x-3 pl-6 border-l border-white/5">
              {/* Profile Link */}
              <NavLink
                to="/dashboard/profile"
                className={({ isActive }) =>
                  clsx(
                    'p-2 rounded-xl transition-all duration-200',
                    isActive ? 'text-gold-400 bg-gold-500/10 ring-1 ring-gold-500/20' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                  )
                }
                title="Profile"
              >
                <User size={20} />
              </NavLink>

              {/* Avatar */}
              <div className="relative group cursor-pointer">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-gold-500 to-amber-600 rounded-full opacity-30 group-hover:opacity-75 transition duration-500 blur-[2px]"></div>
                <img
                  src={user?.picture || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=40'}
                  alt={user?.name || 'User'}
                  className="relative w-9 h-9 rounded-full border border-gold-500/50 bg-[#0b0f14]"
                />
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="p-2 rounded-xl transition-all duration-200 text-gray-400 hover:text-red-400 hover:bg-white/5"
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
