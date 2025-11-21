import React from 'react';
import { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { TrendingUp, TrendingDown, Shield, AlertTriangle, Target, Newspaper, Globe } from 'lucide-react';

interface VisualizationPanelProps {
  activeVisualization: 'chart' | 'trade' | 'risk' | 'news';
}

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

const VisualizationPanel: React.FC<VisualizationPanelProps> = ({ activeVisualization }) => {
  const [priceData, setPriceData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiNews, setAiNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

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
    const fetchAINews = async () => {
      try {
        setNewsLoading(true);
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
        setAiNews(data.articles || []);
        console.log('AI News fetched successfully:', data);
      } catch (err) {
        console.error('Error fetching AI news:', err);
        // Fallback to mock news when API fails
        const mockNews: NewsArticle[] = [
          {
            title: "Gold Eclipses $3,900 as Government Shutdown Begins",
            summary: "On Wednesday, October 1, 2025, gold futures opened at a record $3,887.70 per ounce, up about 1.2% from the prior day, and later pushed above $3,900 amid heightened safe-haven demand triggered by the U.S. government shutdown.",
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
        setAiNews(mockNews);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchAINews();
  }, []);
  const renderChart = () => {
    const plotData = [
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
    ];

    const layout = {
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
    };

    const config = {
      displayModeBar: false,
      responsive: true
    };

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-yellow-400">Gold Price Chart</h3>
          <div className="flex items-center space-x-2">
            {loading && <div className="text-sm text-yellow-400">Loading...</div>}
            {error && <div className="text-sm text-red-400">API Error</div>}
            {!loading && !error && (
              <div className="text-sm text-green-400">
                {priceData.length > 0 && `$${priceData[priceData.length - 1]?.Close?.toFixed(2)}`}
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <Plot
            data={plotData}
            layout={layout}
            config={config}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        
        {/* Technical Indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-400">EMA (20)</div>
            <div className="text-blue-400 font-semibold">
              ${priceData.length > 0 ? priceData[priceData.length - 1]?.EMA_20?.toFixed(2) : 'NA'}
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-400">Stochastic %D</div>
            <div className="text-purple-400 font-semibold">
              {priceData.length > 0 ? priceData[priceData.length - 1]?.Stochastic_D?.toFixed(1) : 'NA'}
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-400">CCI</div>
            <div className="text-green-400 font-semibold">
              {priceData.length > 0 ? priceData[priceData.length - 1]?.CCI?.toFixed(1) : 'NA'}
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-400">ADX</div>
            <div className="text-yellow-400 font-semibold">
              {priceData.length > 0 ? priceData[priceData.length - 1]?.ADX?.toFixed(1) : 'NA'}
            </div>
          </div>
        </div>
        
        {/* Technical Analysis Summary */}
        <div className="mt-4 bg-gray-700 rounded-xl p-4">
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
    );
  };

  const renderTrade = () => (
    <div className="p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Target className="text-yellow-400" size={20} />
        <h3 className="text-lg font-semibold text-yellow-400">Trade Suggestion</h3>
      </div>
      
      <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-blue-400 font-semibold">BUY SIGNAL</span>
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Medium Risk</span>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Entry Price:</span>
            <span className="text-green-400 font-semibold">$2,325</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Target Price:</span>
            <span className="text-green-400 font-semibold">$2,355</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Stop Loss:</span>
            <span className="text-red-400 font-semibold">$2,310</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Risk/Reward:</span>
            <span className="text-yellow-400 font-semibold">1:2</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-700 rounded-xl p-4">
        <h4 className="text-white font-medium mb-2">Technical Analysis</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-gray-300">RSI: 68 (Bullish momentum)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-gray-300">MACD: Positive crossover</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span className="text-gray-300">Bollinger: Near upper band</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-gray-300">EMA (20): $2,340 (Above trend)</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRisk = () => (
    <div className="p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Shield className="text-yellow-400" size={20} />
        <h3 className="text-lg font-semibold text-yellow-400">Risk Assessment</h3>
      </div>

      {/* Risk Gauge */}
      <div className="bg-gray-700 rounded-xl p-4 mb-4">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-yellow-400 mb-1">MEDIUM</div>
          <div className="text-sm text-gray-400">Current Risk Level</div>
        </div>
        
        <div className="flex justify-center mb-4">
          <div className="w-32 h-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-t-full"></div>
            <div className="absolute top-0 left-1/2 w-1 h-16 bg-white transform -translate-x-0.5 rotate-12 origin-bottom"></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1"></div>
            <span className="text-gray-400">Low</span>
          </div>
          <div className="text-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mx-auto mb-1"></div>
            <span className="text-gray-400">Medium</span>
          </div>
          <div className="text-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-1"></div>
            <span className="text-gray-400">High</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Volatility Index</span>
            <span className="text-yellow-400 font-semibold">14%</span>
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Position Size Rec.</span>
            <span className="text-green-400 font-semibold">15% max</span>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Market Sentiment</span>
            <span className="text-green-400 font-semibold">Bullish</span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="text-yellow-400 mt-0.5" size={16} />
          <div className="text-sm">
            <div className="text-yellow-400 font-medium">Recommendation</div>
            <div className="text-gray-300">Use proper position sizing and maintain stop losses below $2,310.</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNews = () => (
    <div className="p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Globe className="text-yellow-400" size={20} />
        <h3 className="text-lg font-semibold text-yellow-400">Market News</h3>
      </div>

      {newsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-700 rounded-xl p-4">
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
          {aiNews.length > 0 ? (
            aiNews.slice(0, 3).map((article, index) => (
              <div key={index} className="bg-gray-700 rounded-xl p-4">
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
                  className="block hover:bg-gray-600/50 rounded p-1 -m-1 transition-colors duration-200"
                >
                  <h4 className="text-white font-medium mb-2 hover:text-yellow-400 transition-colors duration-200">
                    {article.title}
                  </h4>
                  <p className="text-sm text-gray-300 mb-2 line-clamp-3">
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
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-yellow-400">📊 Trading Insights</h2>
        <p className="text-sm text-gray-400">Dynamic insights based on your conversation</p>
      </div>
      
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 360px)' }}>
        {activeVisualization === 'chart' && renderChart()}
        {activeVisualization === 'trade' && renderTrade()}
        {activeVisualization === 'risk' && renderRisk()}
        {activeVisualization === 'news' && renderNews()}
      </div>
    </div>
  );
};

export default VisualizationPanel;