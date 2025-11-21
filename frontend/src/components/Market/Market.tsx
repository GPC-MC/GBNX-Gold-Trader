import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { TrendingUp, TrendingDown, Activity, Globe, RefreshCw } from 'lucide-react';

interface ChartDataPoint {
  Date_time: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  EMA_20: number;
  Stochastic_D: number;
  CCI: number;
  ADX: number;
}

interface ApiResponse {
  total_records: number;
  limit: number;
  offset: number;
  sort: string;
  data: ChartDataPoint[];
}

interface NewsArticle {
  title: string;
  summary: string;
  source_url: string;
  source_name: string;
}

interface NewsResponse {
  articles: NewsArticle[];
  count: number;
}

const Market: React.FC = () => {
  const [timeframe, setTimeframe] = useState('1D');
  const [priceData, setPriceData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [refreshingNews, setRefreshingNews] = useState(false);
  
  const timeframes = ['1H', '1D', '1W', '1M'];
  const indicators = ['D%', 'ADX', 'CCI', 'EMA (20 period)'];
  
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://bf1bd891617c.ngrok-free.app/livechart_data', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trading_pairs: "xau_usd",
            timezone: "UTC",
            interval: 3600,
            sort: "asc",
            limit: 100,
            offset: 7001
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await response.text();
          throw new Error(`API did not return JSON. Content-Type: ${contentType}. Response: ${textResponse.substring(0, 100)}...`);
        }

        const data: ApiResponse = await response.json();
        setPriceData(data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError('Failed to load chart data');
        // Fallback to mock data when API fails
        const mockData: ChartDataPoint[] = Array.from({ length: 50 }, (_, i) => {
          const basePrice = 2345;
          const date = new Date();
          date.setHours(date.getHours() - (49 - i));
          
          return {
            Date_time: date.toISOString(),
            Open: basePrice + Math.random() * 20 - 10,
            High: basePrice + Math.random() * 25,
            Low: basePrice - Math.random() * 25,
            Close: basePrice + Math.random() * 20 - 10,
            Volume: Math.floor(Math.random() * 10000) + 5000,
            EMA_20: basePrice + Math.random() * 10 - 5,
            Stochastic_D: Math.random() * 100,
            CCI: Math.random() * 200 - 100,
            ADX: Math.random() * 100
          };
        });
        setPriceData(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshingNews(true);
      } else {
        setNewsLoading(true);
      }
      
      const response = await fetch('https://bf1bd891617c.ngrok-free.app/latest_news', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: 'gold'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: NewsResponse = await response.json();
      setNews(data.articles || []);
      console.log('News fetched successfully:', data);
    } catch (err) {
      console.error('Error fetching news:', err);
      // Fallback to mock news when API fails
      const mockNews: NewsArticle[] = [
        {
          title: "Gold Eclipses $3,900 as Government Shutdown Begins",
          summary: "On Wednesday, October 1, 2025, gold futures opened at a record $3,887.70 per ounce, up about 1.2% from the prior day, and later pushed above $3,900 amid heightened safe-haven demand triggered by the U.S. government shutdown ([finance.yahoo.com](https://finance.yahoo.com/personal-finance/investing/article/gold-price-today-wednesday-october-1-gold-eclipses-3900-as-government-shutdown-begins-113229852.html?utm_source=openai)).",
          source_url: "https://finance.yahoo.com/personal-finance/investing/article/gold-price-today-wednesday-october-1-gold-eclipses-3900-as-government-shutdown-begins-113229852.html",
          source_name: "finance.yahoo.com"
        },
        {
          title: "Gold hits record high as US government shuts down",
          summary: "Spot gold reached a record high—peaking at around $3,898.18 per ounce—while U.S. December futures climbed to $3,914.50, fueled by safe-haven demand amid a U.S. government shutdown and heightened expectations of an interest rate cut by the Federal Reserve.",
          source_url: "https://www.reuters.com/world/india/gold-hits-record-high-us-shutdown-risks-rate-cut-bets-2025-10-01/",
          source_name: "reuters.com"
        }
      ];
      setNews(mockNews);
    } finally {
      if (isRefresh) {
        setRefreshingNews(false);
      } else {
        setNewsLoading(false);
      }
    }
  };

  const handleRefreshNews = () => {
    fetchNews(true);
  };

  // Calculate market data from API response
  const marketData = priceData.length > 0 ? {
    price: priceData[priceData.length - 1].Close,
    change: priceData.length > 1 ? priceData[priceData.length - 1].Close - priceData[priceData.length - 2].Close : 0,
    changePercent: priceData.length > 1 ? ((priceData[priceData.length - 1].Close - priceData[priceData.length - 2].Close) / priceData[priceData.length - 2].Close) * 100 : 0,
    volume: `${(priceData[priceData.length - 1].Volume / 1000).toFixed(1)}K`,
    high24h: Math.max(...priceData.slice(-24).map(d => d.High)),
    low24h: Math.min(...priceData.slice(-24).map(d => d.Low))
  } : {
    price: 2345.67,
    change: 18.45,
    changePercent: 0.79,
    volume: '2.4M',
    high24h: 2352.10,
    low24h: 2328.90
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Market Header */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h1 className="text-2xl font-bold text-yellow-400 mb-2">Gold Market</h1>
              <div className="text-4xl font-bold text-white mb-2">
                ${marketData.price.toFixed(2)}
              </div>
              <div className="flex items-center space-x-2">
                {marketData.changePercent >= 0 ? (
                  <TrendingUp className="text-green-400" size={20} />
                ) : (
                  <TrendingDown className="text-red-400" size={20} />
                )}
                <span className={`text-lg font-semibold ${marketData.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  +${marketData.change.toFixed(2)} ({marketData.changePercent >= 0 ? '+' : ''}{marketData.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400">24h High</div>
                <div className="text-lg font-semibold text-red-400">${marketData.high24h.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">24h Low</div>
                <div className="text-lg font-semibold text-blue-400">${marketData.low24h.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Volume</div>
                <div className="text-lg font-semibold text-purple-400">{marketData.volume}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Market Cap</div>
                <div className="text-lg font-semibold text-green-400">$142.8B</div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-2">Timeframe</div>
                <div className="flex space-x-2">
                  {timeframes.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                        timeframe === tf
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 h-full">
            <div className="bg-gray-800 rounded-2xl overflow-hidden h-full flex flex-col">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-yellow-400">Price Chart</h2>
                  <div className="flex items-center space-x-2">
                    <Activity className="text-yellow-400" size={20} />
                    {loading && <span className="text-sm text-yellow-400">Loading...</span>}
                    {error && <span className="text-sm text-red-400">API Error</span>}
                    {!loading && !error && <span className="text-sm text-green-400">Live Data</span>}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {/* Real Chart Area */}
                <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden mb-6">
                  {priceData.length > 0 ? (
                    <Plot
                      data={[
                        {
                          x: priceData.map(d => d.Date_time),
                          open: priceData.map(d => d.Open),
                          high: priceData.map(d => d.High),
                          low: priceData.map(d => d.Low),
                          close: priceData.map(d => d.Close),
                          type: 'candlestick' as const,
                          increasing: { line: { color: '#10b981' } },
                          decreasing: { line: { color: '#ef4444' } },
                          name: 'Gold Price',
                          yaxis: 'y'
                        },
                        {
                          x: priceData.map(d => d.Date_time),
                          y: priceData.map(d => d.EMA_20),
                          type: 'scatter' as const,
                          mode: 'lines' as const,
                          line: { color: '#fbbf24', width: 2 },
                          name: 'EMA (20)',
                          yaxis: 'y'
                        }
                      ]}
                      layout={{
                        title: { text: 'Gold Price & Technical Indicators', font: { color: '#fbbf24', size: 16 } },
                        paper_bgcolor: '#1f2937',
                        plot_bgcolor: '#111827',
                        font: { color: '#d1d5db' },
                        grid: { rows: 1, columns: 1, pattern: 'independent' },
                        xaxis: {
                          gridcolor: '#374151',
                          color: '#9ca3af',
                          type: 'date' as const,
                          rangeslider: { visible: false }
                        },
                        yaxis: {
                          gridcolor: '#374151',
                          color: '#9ca3af',
                          title: { text: 'Price (USD)', font: { color: '#9ca3af' } },
                          domain: [0, 1]
                        },
                        margin: { l: 60, r: 20, t: 40, b: 40 },
                        height: 400,
                        showlegend: true,
                        legend: {
                          x: 0,
                          y: 1,
                          bgcolor: 'rgba(31, 41, 55, 0.8)',
                          bordercolor: '#374151',
                          borderwidth: 1
                        }
                      }}
                      config={{
                        displayModeBar: false,
                        responsive: true
                      }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <div className="h-80 flex items-center justify-center">
                      <div className="text-center">
                        <Activity size={48} className="text-yellow-400 mx-auto mb-4" />
                        <div className="text-gray-400">Loading Chart Data...</div>
                        <div className="text-sm text-gray-500 mt-2">
                          Chart with {timeframe} timeframe
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Technical Indicators Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400">EMA (20)</div>
                    <div className="text-blue-400 font-semibold">
                      ${priceData.length > 0 ? priceData[priceData.length - 1]?.EMA_20?.toFixed(2) : 'Loading...'}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400">Stochastic %D</div>
                    <div className="text-purple-400 font-semibold">
                      {priceData.length > 0 ? priceData[priceData.length - 1]?.Stochastic_D?.toFixed(1) : 'Loading...'}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400">CCI</div>
                    <div className="text-green-400 font-semibold">
                      {priceData.length > 0 ? priceData[priceData.length - 1]?.CCI?.toFixed(1) : 'Loading...'}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400">ADX</div>
                    <div className="text-yellow-400 font-semibold">
                      {priceData.length > 0 ? priceData[priceData.length - 1]?.ADX?.toFixed(1) : 'Loading...'}
                    </div>
                  </div>
                </div>

                {/* Technical Analysis Summary */}
                <div className="bg-gray-700 rounded-xl p-4">
                  <h4 className="text-white font-medium mb-3">Technical Analysis Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">EMA (20) Signal:</span>
                      <span className={`font-semibold ${
                        priceData.length > 0 && priceData[priceData.length - 1]?.Close > priceData[priceData.length - 1]?.EMA_20 
                          ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {priceData.length > 0 && priceData[priceData.length - 1]?.Close > priceData[priceData.length - 1]?.EMA_20 
                          ? 'Bullish' : 'Bearish'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Stochastic Signal:</span>
                      <span className={`font-semibold ${
                        priceData.length > 0 && priceData[priceData.length - 1]?.Stochastic_D > 80 
                          ? 'text-red-400' : priceData[priceData.length - 1]?.Stochastic_D < 20 
                          ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {priceData.length > 0 && priceData[priceData.length - 1]?.Stochastic_D > 80 
                          ? 'Overbought' : priceData[priceData.length - 1]?.Stochastic_D < 20 
                          ? 'Oversold' : 'Neutral'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">CCI Signal:</span>
                      <span className={`font-semibold ${
                        priceData.length > 0 && priceData[priceData.length - 1]?.CCI > 100 
                          ? 'text-red-400' : priceData[priceData.length - 1]?.CCI < -100 
                          ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {priceData.length > 0 && priceData[priceData.length - 1]?.CCI > 100 
                          ? 'Overbought' : priceData[priceData.length - 1]?.CCI < -100 
                          ? 'Oversold' : 'Normal'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">ADX Trend:</span>
                      <span className={`font-semibold ${
                        priceData.length > 0 && priceData[priceData.length - 1]?.ADX > 50 
                          ? 'text-green-400' : priceData[priceData.length - 1]?.ADX > 25 
                          ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {priceData.length > 0 && priceData[priceData.length - 1]?.ADX > 50 
                          ? 'Strong' : priceData[priceData.length - 1]?.ADX > 25 
                          ? 'Moderate' : 'Weak'}
                      </span>
                    </div>
                  </div>
                </div>

                {priceData.length > 0 && (
                  <div className="mt-4 text-xs text-gray-400 text-center">
                    Showing {priceData.length} data points • Last updated: {new Date().toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            {/* Order Book */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-yellow-400 mb-4">Order Book</h2>
              <div className="space-y-2">
                <div className="text-xs text-gray-400 grid grid-cols-2 gap-4 pb-2 border-b border-gray-700">
                  <span>Price (USD)</span>
                  <span className="text-right">Size (oz)</span>
                </div>
                
                {/* Asks */}
                <div className="space-y-1">
                  <div className="text-xs text-red-400 grid grid-cols-2 gap-4">
                    <span>2,348.50</span>
                    <span className="text-right">1.2</span>
                  </div>
                  <div className="text-xs text-red-400 grid grid-cols-2 gap-4">
                    <span>2,347.25</span>
                    <span className="text-right">2.8</span>
                  </div>
                  <div className="text-xs text-red-400 grid grid-cols-2 gap-4">
                    <span>2,346.00</span>
                    <span className="text-right">1.5</span>
                  </div>
                </div>

                {/* Current Price */}
                <div className="py-2 text-center">
                  <span className="text-yellow-400 font-semibold">${marketData.price.toFixed(2)}</span>
                </div>

                {/* Bids */}
                <div className="space-y-1">
                  <div className="text-xs text-green-400 grid grid-cols-2 gap-4">
                    <span>2,344.75</span>
                    <span className="text-right">3.1</span>
                  </div>
                  <div className="text-xs text-green-400 grid grid-cols-2 gap-4">
                    <span>2,343.50</span>
                    <span className="text-right">2.4</span>
                  </div>
                  <div className="text-xs text-green-400 grid grid-cols-2 gap-4">
                    <span>2,342.25</span>
                    <span className="text-right">1.8</span>
                  </div>
                </div>
              </div>
            </div>

            {/* News Feed */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Globe className="text-yellow-400" size={20} />
                <h2 className="text-xl font-semibold text-yellow-400">Market News</h2>
                <div className="flex items-center space-x-2 ml-auto">
                  {(newsLoading || refreshingNews) && (
                    <span className="text-sm text-yellow-400">
                      {refreshingNews ? 'Refreshing...' : 'Loading...'}
                    </span>
                  )}
                  <button
                    onClick={handleRefreshNews}
                    disabled={refreshingNews}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      refreshingNews 
                        ? 'text-gray-500 cursor-not-allowed' 
                        : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'
                    }`}
                    title="Refresh News"
                  >
                    <RefreshCw 
                      size={16} 
                      className={refreshingNews ? 'animate-spin' : ''} 
                    />
                  </button>
                </div>
              </div>
              {newsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border-b border-gray-700 pb-3">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-600 rounded mb-2"></div>
                        <div className="h-3 bg-gray-600 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {news.length > 0 ? (
                    news.slice(0, 5).map((article, index) => (
                      <div key={index} className="border-b border-gray-700 pb-3 last:border-b-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                            LIVE
                          </div>
                          <span className="text-xs text-gray-400">{article.source_name}</span>
                        </div>
                        <a 
                          href={article.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block hover:bg-gray-700/50 rounded p-1 -m-1 transition-colors duration-200"
                        >
                          <h3 className="text-sm font-medium text-white mb-2 hover:text-yellow-400 transition-colors duration-200">
                            {article.title}
                          </h3>
                          <p className="text-xs text-gray-400 line-clamp-3">
                            {article.summary}
                          </p>
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-4">
                      <Globe size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No news available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Market;