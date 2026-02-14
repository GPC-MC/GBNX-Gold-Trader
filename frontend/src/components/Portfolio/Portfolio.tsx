import React, { useState } from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, DollarSign, PieChart, LineChart as LineChartIcon, TrendingUpIcon } from 'lucide-react';
import { useGoldData } from '../../hooks/useGoldData';
import AllocationChart from './AllocationChart';
import PNLChart from './PNLChart';
import AssetValueChart from './AssetValueChart';

const Portfolio: React.FC = () => {
  const { portfolio } = useGoldData();
  const [activeChart, setActiveChart] = useState<'allocation' | 'pnl' | 'value'>('pnl');

  const goldValue = portfolio.holdings.gold.amount * portfolio.holdings.gold.current;
  const etfValue = portfolio.holdings.etf.amount * portfolio.holdings.etf.current;

  const chartTabs = [
    { id: 'pnl' as const, icon: TrendingUpIcon, label: 'P&L' },
    { id: 'value' as const, icon: LineChartIcon, label: 'Asset Value' },
    { id: 'allocation' as const, icon: PieChart, label: 'Allocation' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Portfolio Header */}
      <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-gold-500">
              PORTFOLIO OVERVIEW
            </div>
            <div className="mt-3 text-4xl sm:text-5xl font-bold bg-gradient-to-r from-gold-500 to-gold-300 bg-clip-text text-transparent">
              ${portfolio.totalValue.toLocaleString()}
            </div>
            <div className="mt-2 text-sm text-gray-400">Total portfolio value</div>
          </div>

          <div className="md:text-right">
            <div className="text-xs font-semibold tracking-[0.18em] text-gray-500">
              TODAY'S PERFORMANCE
            </div>
            <div className="mt-3 flex items-center gap-2 md:justify-end">
              {portfolio.profitTodayPercent >= 0 ? (
                <TrendingUp size={22} className="text-emerald-400" />
              ) : (
                <TrendingDown size={22} className="text-rose-400" />
              )}
              <span
                className={clsx(
                  'text-xl sm:text-2xl font-semibold',
                  portfolio.profitTodayPercent >= 0 ? 'text-emerald-300' : 'text-rose-300'
                )}
              >
                ${portfolio.profitToday} ({portfolio.profitTodayPercent >= 0 ? '+' : ''}
                {portfolio.profitTodayPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Holdings */}
        <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Holdings</h2>

          {/* Gold Holdings */}
          <div className="rounded-xl border border-gold-500/10 bg-ink-800/60 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-gold-500" />
                <span className="font-semibold text-white">GOLD</span>
              </div>
              <span className="font-semibold text-gold-300">{portfolio.holdings.gold.amount} oz</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500">Avg buy price</div>
                <div className="font-semibold text-gray-100">${portfolio.holdings.gold.avgBuy}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Current price</div>
                <div className="font-semibold text-emerald-300">${portfolio.holdings.gold.current}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gold-500/10">
              <div className="text-xs text-gray-500">Market value</div>
              <div className="text-xl font-bold text-gray-100">${goldValue.toLocaleString()}</div>
            </div>
          </div>

          {/* ETF Holdings */}
          <div className="rounded-xl border border-gold-500/10 bg-ink-800/60 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-sky-300" />
                <span className="font-semibold text-white">ETF (GLD)</span>
              </div>
              <span className="font-semibold text-sky-300">{portfolio.holdings.etf.amount} shares</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500">Avg buy price</div>
                <div className="font-semibold text-gray-100">${portfolio.holdings.etf.avgBuy}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Current price</div>
                <div className="font-semibold text-emerald-300">${portfolio.holdings.etf.current}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gold-500/10">
              <div className="text-xs text-gray-500">Market value</div>
              <div className="text-xl font-bold text-gray-100">${etfValue.toLocaleString()}</div>
            </div>
          </div>

          {/* Cash */}
          <div className="rounded-xl border border-gold-500/10 bg-ink-800/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-300" />
                <span className="font-semibold text-white">Cash</span>
              </div>
              <span className="font-semibold text-emerald-300">${portfolio.holdings.cash.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Charts Panel */}
        <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
          {/* Chart Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {chartTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id)}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 border',
                  activeChart === tab.id
                    ? 'bg-gold-500/10 border-gold-500/30 text-gold-300 shadow-glow'
                    : 'bg-white/0 border-transparent text-gray-400 hover:text-gray-100 hover:bg-gold-500/10'
                )}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Chart Content */}
          <div>
            {activeChart === 'pnl' && <PNLChart />}
            {activeChart === 'value' && <AssetValueChart />}
            {activeChart === 'allocation' && <AllocationChart portfolio={portfolio} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
