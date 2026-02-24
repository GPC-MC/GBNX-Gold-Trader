import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { NavLink, useLocation } from 'react-router-dom';
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
  BarChart3,
  ChevronDown
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { goldPrice, isConnected: isPriceConnected } = usePrice();
  const location = useLocation();

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

  const navGroups = [
    {
      key: 'trading',
      label: 'Trading',
      items: [
        { path: '/dashboard/trade', icon: ArrowLeftRight, label: 'Trade' },
        { path: '/dashboard/portfolio', icon: Briefcase, label: 'Portfolio' },
        { path: '/dashboard/balances', icon: BarChart3, label: 'Balances' }
      ]
    }
  ];
  const primaryTabs = [
    { path: '/dashboard', icon: LayoutGrid, label: 'Dashboard', end: true },
    { path: '/dashboard/news', icon: Newspaper, label: 'News' },
    { path: '/dashboard/market', icon: TrendingUp, label: 'Market' },
    { path: '/dashboard/ai-studio', icon: Bot, label: 'AI Studio' }
  ];

  const isGroupActive = (items: Array<{ path: string; end?: boolean }>) =>
    items.some(({ path, end }) => (end ? location.pathname === path : location.pathname.startsWith(path)));

  const dropdownLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'group/item relative flex items-center rounded-md border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all duration-200',
      isActive
        ? 'border-gold-500/40 bg-gold-500/15 text-gold-200 shadow-[0_0_14px_rgba(243,167,18,0.16)]'
        : 'border-gold-500/10 bg-ink-900/80 text-gray-400 hover:border-gold-500/30 hover:bg-ink-850/90 hover:text-gray-100'
    );

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'group/item relative inline-flex items-center rounded-md border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all duration-200',
      isActive
        ? 'border-gold-500/40 bg-gold-500/15 text-gold-200 shadow-[0_0_14px_rgba(243,167,18,0.16)]'
        : 'border-gold-500/10 bg-ink-900/70 text-gray-400 hover:border-gold-500/30 hover:bg-ink-850/90 hover:text-gray-100'
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
            {primaryTabs.map(({ path, icon: Icon, label, end }) => (
              <NavLink key={path} to={path} end={end} className={dropdownLinkClass}>
                {({ isActive }) => (
                  <>
                    <Icon
                      size={14}
                      className={clsx(
                        'mr-2 transition-colors',
                        isActive ? 'text-gold-300' : 'text-gray-500 group-hover/item:text-gray-300'
                      )}
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}

            {navGroups.map(({ key, label, items }) => (
              <div key={key} className="group/nav relative">
                <button
                  type="button"
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-md border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-all duration-200',
                    isGroupActive(items)
                      ? 'border-gold-500/35 bg-gold-500/10 text-gold-300'
                      : 'border-gold-500/12 bg-ink-950/65 text-gray-400 group-hover/nav:border-gold-500/28 group-hover/nav:bg-ink-900/85 group-hover/nav:text-gray-200'
                  )}
                >
                  {label}
                  <ChevronDown
                    size={13}
                    className="text-gray-500 transition-colors group-hover/nav:text-gold-300 group-focus-within/nav:text-gold-300"
                  />
                </button>

                <div className="pointer-events-none invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-2 opacity-0 transition-all duration-200 group-hover/nav:pointer-events-auto group-hover/nav:visible group-hover/nav:opacity-100 group-focus-within/nav:pointer-events-auto group-focus-within/nav:visible group-focus-within/nav:opacity-100">
                  <div className="rounded-lg border border-gold-500/24 bg-ink-950/96 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur">
                    <div className="flex flex-col gap-1.5">
                      {items.map(({ path, icon: Icon, label: itemLabel, end }) => (
                        <NavLink key={path} to={path} end={end} className={dropdownLinkClass}>
                          {({ isActive }) => (
                            <>
                              <Icon
                                size={14}
                                className={clsx(
                                  'mr-2 transition-colors',
                                  isActive ? 'text-gold-300' : 'text-gray-500 group-hover/item:text-gray-300'
                                )}
                              />
                              {itemLabel}
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
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

        <div className="mt-3 grid grid-cols-1 gap-2 md:hidden">
          {primaryTabs.map(({ path, icon: Icon, label, end }) => (
            <NavLink key={path} to={path} end={end} className={mobileLinkClass}>
              {({ isActive }) => (
                <>
                  <Icon
                    size={14}
                    className={clsx(
                      'mr-2 transition-colors',
                      isActive ? 'text-gold-300' : 'text-gray-500 group-hover/item:text-gray-300'
                    )}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}

          {navGroups.map(({ key, label, items }) => (
            <details key={key} className="rounded-lg border border-gold-500/14 bg-ink-950/70 p-2">
              <summary className="flex list-none items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-gold-400/90 [&::-webkit-details-marker]:hidden">
                {label}
                <ChevronDown size={13} className="text-gray-500" />
              </summary>
              <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
                {items.map(({ path, icon: Icon, label: itemLabel, end }) => (
                  <NavLink key={path} to={path} end={end} className={mobileLinkClass}>
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={14}
                          className={clsx(
                            'mr-2 transition-colors',
                            isActive ? 'text-gold-300' : 'text-gray-500 group-hover/item:text-gray-300'
                          )}
                        />
                        {itemLabel}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
