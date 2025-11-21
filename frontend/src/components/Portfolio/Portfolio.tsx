import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useGoldData } from '../../hooks/useGoldData';
import AllocationChart from './AllocationChart';

const Portfolio: React.FC = () => {
  const { portfolio } = useGoldData();

  const goldValue = portfolio.holdings.gold.amount * portfolio.holdings.gold.current;
  const etfValue = portfolio.holdings.etf.amount * portfolio.holdings.etf.current;
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portfolio Header */}
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h1 className="text-2xl font-bold text-green-400 mb-2">Portfolio Overview</h1>
              <div className="text-4xl font-bold text-white mb-2">
                ${portfolio.totalValue.toLocaleString()}
              </div>
              <div className="text-lg text-green-400">Total Portfolio Value</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Today's Performance</div>
              <div className="flex items-center justify-end space-x-2">
                {portfolio.profitTodayPercent >= 0 ? (
                  <TrendingUp className="text-green-400" size={24} />
                ) : (
                  <TrendingDown className="text-red-400" size={24} />
                )}
                <span className={`text-2xl font-bold ${portfolio.profitTodayPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${portfolio.profitToday} ({portfolio.profitTodayPercent >= 0 ? '+' : ''}{portfolio.profitTodayPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Holdings */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-yellow-400 mb-6">Holdings</h2>
            
            {/* Gold Holdings */}
            <div className="bg-gray-700 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <DollarSign className="text-yellow-400" size={20} />
                  <span className="font-semibold">GOLD</span>
                </div>
                <span className="text-yellow-400 font-bold">{portfolio.holdings.gold.amount} oz</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Avg Buy Price</div>
                  <div className="text-white font-semibold">${portfolio.holdings.gold.avgBuy}</div>
                </div>
                <div>
                  <div className="text-gray-400">Current Price</div>
                  <div className="text-green-400 font-semibold">${portfolio.holdings.gold.current}</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div className="text-gray-400">Market Value</div>
                <div className="text-xl font-bold text-white">${goldValue.toLocaleString()}</div>
              </div>
            </div>

            {/* ETF Holdings */}
            <div className="bg-gray-700 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="text-blue-400" size={20} />
                  <span className="font-semibold">ETF (GLD)</span>
                </div>
                <span className="text-blue-400 font-bold">{portfolio.holdings.etf.amount} shares</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Avg Buy Price</div>
                  <div className="text-white font-semibold">${portfolio.holdings.etf.avgBuy}</div>
                </div>
                <div>
                  <div className="text-gray-400">Current Price</div>
                  <div className="text-green-400 font-semibold">${portfolio.holdings.etf.current}</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div className="text-gray-400">Market Value</div>
                <div className="text-xl font-bold text-white">${etfValue.toLocaleString()}</div>
              </div>
            </div>

            {/* Cash */}
            <div className="bg-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="text-green-400" size={20} />
                  <span className="font-semibold">Cash</span>
                </div>
                <span className="text-green-400 font-bold">${portfolio.holdings.cash.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Allocation Chart */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-yellow-400 mb-6">Asset Allocation</h2>
            <AllocationChart portfolio={portfolio} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;