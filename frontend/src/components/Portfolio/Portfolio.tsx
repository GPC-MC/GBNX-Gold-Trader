import React, { useState } from 'react';
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
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0B1220' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portfolio Header */}
        <div className="border rounded-2xl mb-8" style={{ backgroundColor: '#121826', borderColor: 'rgba(212, 175, 55, 0.15)', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h1 className="text-lg font-semibold mb-3" style={{ color: '#9CA3AF', letterSpacing: '0.03em' }}>PORTFOLIO OVERVIEW</h1>
              <div className="text-5xl font-bold mb-2" style={{ color: '#D4AF37' }}>
                ${portfolio.totalValue.toLocaleString()}
              </div>
              <div className="text-sm" style={{ color: '#6B7280' }}>Total Portfolio Value</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium mb-1" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>TODAY'S PERFORMANCE</div>
              <div className="flex items-center justify-end space-x-2">
                {portfolio.profitTodayPercent >= 0 ? (
                  <TrendingUp size={24} style={{ color: '#22C55E' }} />
                ) : (
                  <TrendingDown size={24} style={{ color: '#DC2626' }} />
                )}
                <span className="text-2xl font-bold" style={{ color: portfolio.profitTodayPercent >= 0 ? '#22C55E' : '#DC2626' }}>
                  ${portfolio.profitToday} ({portfolio.profitTodayPercent >= 0 ? '+' : ''}{portfolio.profitTodayPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Holdings */}
          <div className="rounded-2xl p-6 border" style={{ backgroundColor: '#121826', borderColor: 'rgba(212, 175, 55, 0.15)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
            <h2 className="text-xl font-semibold mb-6" style={{ color: '#E5E7EB' }}>Holdings</h2>
            
            {/* Gold Holdings */}
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#161E2E' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <DollarSign size={20} style={{ color: '#D4AF37' }} />
                  <span className="font-semibold" style={{ color: '#E5E7EB' }}>GOLD</span>
                </div>
                <span className="font-bold" style={{ color: '#D4AF37' }}>{portfolio.holdings.gold.amount} oz</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs" style={{ color: '#6B7280' }}>Avg Buy Price</div>
                  <div className="font-semibold" style={{ color: '#E5E7EB' }}>${portfolio.holdings.gold.avgBuy}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: '#6B7280' }}>Current Price</div>
                  <div className="font-semibold" style={{ color: 'rgba(34, 197, 94, 0.9)' }}>${portfolio.holdings.gold.current}</div>
                </div>
              </div>
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}>
                <div className="text-xs" style={{ color: '#6B7280' }}>Market Value</div>
                <div className="text-xl font-bold" style={{ color: '#E5E7EB' }}>${goldValue.toLocaleString()}</div>
              </div>
            </div>

            {/* ETF Holdings */}
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#161E2E' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp size={20} style={{ color: '#38BDF8' }} />
                  <span className="font-semibold" style={{ color: '#E5E7EB' }}>ETF (GLD)</span>
                </div>
                <span className="font-bold" style={{ color: '#38BDF8' }}>{portfolio.holdings.etf.amount} shares</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs" style={{ color: '#6B7280' }}>Avg Buy Price</div>
                  <div className="font-semibold" style={{ color: '#E5E7EB' }}>${portfolio.holdings.etf.avgBuy}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: '#6B7280' }}>Current Price</div>
                  <div className="font-semibold" style={{ color: 'rgba(34, 197, 94, 0.9)' }}>${portfolio.holdings.etf.current}</div>
                </div>
              </div>
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}>
                <div className="text-xs" style={{ color: '#6B7280' }}>Market Value</div>
                <div className="text-xl font-bold" style={{ color: '#E5E7EB' }}>${etfValue.toLocaleString()}</div>
              </div>
            </div>

            {/* Cash */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#161E2E' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign size={20} style={{ color: 'rgba(34, 197, 94, 0.9)' }} />
                  <span className="font-semibold" style={{ color: '#E5E7EB' }}>Cash</span>
                </div>
                <span className="font-bold" style={{ color: 'rgba(34, 197, 94, 0.9)' }}>${portfolio.holdings.cash.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Charts Panel */}
          <div className="rounded-2xl p-6 border" style={{ backgroundColor: '#121826', borderColor: 'rgba(212, 175, 55, 0.15)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
            {/* Chart Tabs */}
            <div className="flex items-center space-x-2 mb-6">
              {chartTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChart(tab.id)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: activeChart === tab.id ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                    color: activeChart === tab.id ? '#D4AF37' : '#9CA3AF',
                    borderBottom: activeChart === tab.id ? '2px solid #D4AF37' : 'none'
                  }}
                >
                  <tab.icon size={16} />
                  <span className="text-sm font-medium">{tab.label}</span>
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
    </div>
  );
};

export default Portfolio;