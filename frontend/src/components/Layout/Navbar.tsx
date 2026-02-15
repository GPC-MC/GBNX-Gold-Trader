import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePrice } from '../../contexts/PriceContext';
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
  const { goldPrice, isConnected: isPriceConnected } = usePrice();

  const apiBaseUrl = useMemo(() => {
    const raw = (import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined) || '';
    return raw.replace(/\/+$/, '');
  }, []);

  const [mcXau, setMcXau] = useState(0);
  const [previousPrice, setPreviousPrice] = useState(goldPrice);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');

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

  // Track price direction
  useEffect(() => {
    if (goldPrice && previousPrice) {
      if (goldPrice > previousPrice) {
        setPriceDirection('up');
      } else if (goldPrice < previousPrice) {
        setPriceDirection('down');
      }
      setPreviousPrice(goldPrice);

      // Reset direction after animation
      const timer = setTimeout(() => setPriceDirection('neutral'), 1000);
      return () => clearTimeout(timer);
    }
  }, [goldPrice, previousPrice]);

  const primaryNavItems = [
    { path: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { path: '/dashboard/portfolio', icon: Briefcase, label: 'Portfolio' },
    { path: '/dashboard/market', icon: TrendingUp, label: 'Market' },
    { path: '/dashboard/trade', icon: ArrowLeftRight, label: 'Trade' }
  ];

  const secondaryNavItems = [
    { path: '/dashboard/news', icon: Newspaper, label: 'News' },
    { path: '/dashboard/balances', icon: BarChart3, label: 'Balances' },
    { path: '/dashboard/ai-studio', icon: Bot, label: 'AI Studio' }
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'group relative inline-flex items-center rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-200',
      isActive
        ? 'border-gold-500/40 bg-gold-500/15 text-gold-200 shadow-[0_0_14px_rgba(243,167,18,0.18)]'
        : 'border-gold-500/10 bg-ink-900/70 text-gray-400 hover:border-gold-500/30 hover:bg-ink-850/80 hover:text-gray-100'
    );

  return (
    <nav className="sticky top-0 z-50 border-b border-gold-500/20 bg-ink-975/92 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold-400">Command Terminal</div>
            <div className="font-display text-xl tracking-[0.18em] text-white">
              GBNX <span className="text-gold-400">MARKETS</span>
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
            {primaryNavItems.map(({ path, icon: Icon, label }) => (
              <NavLink key={path} to={path} end={path === '/dashboard'} className={linkClass}>
                {({ isActive }) => (
                  <>
                    <Icon
                      size={14}
                      className={clsx(
                        'mr-2 transition-colors',
                        isActive ? 'text-gold-300' : 'text-gray-500 group-hover:text-gray-300'
                      )}
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}

            <div className="mx-1 h-5 w-px bg-gradient-to-b from-transparent via-gold-500/30 to-transparent" />

            {secondaryNavItems.map(({ path, icon: Icon, label }) => (
              <NavLink key={path} to={path} className={linkClass}>
                {({ isActive }) => (
                  <>
                    <Icon
                      size={14}
                      className={clsx(
                        'mr-2 transition-colors',
                        isActive ? 'text-gold-300' : 'text-gray-500 group-hover:text-gray-300'
                      )}
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-3 border-l border-gold-500/20 pl-3">
            {/* Live Gold Price */}
            <div className="hidden rounded-md border border-gold-500/20 bg-ink-900/75 px-3 py-2 md:block">
              <div className="flex items-center gap-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">XAU/USD</div>
                <span className={`h-1.5 w-1.5 rounded-full ${isPriceConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              </div>
              <div className={clsx(
                "font-mono text-sm font-semibold transition-colors duration-300",
                priceDirection === 'up' ? 'text-emerald-300' :
                priceDirection === 'down' ? 'text-rose-300' :
                'text-gold-300'
              )}>
                {goldPrice ? `$${goldPrice.toFixed(2)}` : 'Loading...'}
              </div>
            </div>

            <div className="hidden rounded-md border border-gold-500/20 bg-ink-900/75 px-3 py-2 md:block">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">MC XAU</div>
              <div className="font-mono text-sm font-semibold text-gold-300">{mcXau.toFixed(3)} oz</div>
            </div>

            <NavLink
              to="/dashboard/profile"
              className={({ isActive }) =>
                clsx(
                  'rounded-md border p-2 transition',
                  isActive
                    ? 'border-gold-500/35 bg-gold-500/10 text-gold-300'
                    : 'border-gold-500/15 bg-ink-900/75 text-gray-400 hover:border-gold-500/30 hover:text-gray-100'
                )
              }
              title="Profile"
            >
              <User size={18} />
            </NavLink>

            <img
              src={
                user?.picture ||
                'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=40'
              }
              alt={user?.name || 'User'}
              className="h-9 w-9 rounded-md border border-gold-500/30 bg-ink-900 object-cover"
            />

            <button
              onClick={logout}
              className="rounded-md border border-gold-500/15 bg-ink-900/75 p-2 text-gray-400 transition hover:border-rose-500/35 hover:text-rose-300"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 md:hidden">
          {[...primaryNavItems, ...secondaryNavItems].map(({ path, icon: Icon, label }) => (
            <NavLink key={path} to={path} end={path === '/dashboard'} className={linkClass}>
              {({ isActive }) => (
                <>
                  <Icon
                    size={14}
                    className={clsx('mr-2 transition-colors', isActive ? 'text-gold-300' : 'text-gray-500')}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
