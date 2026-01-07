import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import Plot from 'react-plotly.js';
import { AlertTriangle, Globe, Shield, Target } from 'lucide-react';

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
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trading_pairs: 'xau_usd',
            timezone: 'UTC',
            interval: 3600,
            sort: 'asc',
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
        const basePrice = 2345;
        const mockData: ChartDataPoint[] = Array.from({ length: 50 }, (_, i) => {
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
            accept: 'application/json',
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
      } catch (err) {
        console.error('Error fetching AI news:', err);
        const mockNews: NewsArticle[] = [
          {
            title: 'Gold Eclipses $3,900 as Government Shutdown Begins',
            summary:
              'Gold futures opened at a record $3,887.70 per ounce and later pushed above $3,900 amid heightened safe-haven demand.',
            source_url:
              'https://finance.yahoo.com/personal-finance/investing/article/gold-price-today-wednesday-october-1-gold-eclipses-3900-as-government-shutdown-begins-113229852.html',
            source_name: 'finance.yahoo.com'
          },
          {
            title: 'Gold hits record high as US government shuts down',
            summary:
              'Spot gold reached a record high, fueled by safe-haven demand amid a U.S. government shutdown and expectations of a rate cut.',
            source_url:
              'https://www.reuters.com/world/india/gold-hits-record-high-us-shutdown-risks-rate-cut-bets-2025-10-01/',
            source_name: 'reuters.com'
          }
        ];
        setAiNews(mockNews);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchAINews();
  }, []);

  const latest = priceData.length > 0 ? priceData[priceData.length - 1] : null;

  const plotData = useMemo(() => {
    return [
      {
        x: priceData.map(d => d.Date_time),
        open: priceData.map(d => d.Open),
        high: priceData.map(d => d.High),
        low: priceData.map(d => d.Low),
        close: priceData.map(d => d.Close),
        type: 'candlestick' as const,
        increasing: { line: { color: '#16A34A' } },
        decreasing: { line: { color: '#DC2626' } },
        name: 'Price',
        yaxis: 'y'
      },
      {
        x: priceData.map(d => d.Date_time),
        y: priceData.map(d => d.EMA_20),
        type: 'scatter' as const,
        mode: 'lines' as const,
        line: { color: '#D4AF37', width: 1.8 },
        name: 'EMA (20)',
        yaxis: 'y'
      }
    ];
  }, [priceData]);

  const layout = useMemo(() => {
    return {
      title: { text: 'Gold Price & Technical Indicators', font: { color: '#9CA3AF', size: 14 } },
      paper_bgcolor: '#0B1220',
      plot_bgcolor: '#0B1220',
      font: { color: '#9CA3AF' },
      grid: { rows: 1, columns: 1, pattern: 'independent' },
      xaxis: {
        gridcolor: '#1F2937',
        color: '#6B7280',
        type: 'date' as const,
        rangeslider: { visible: false }
      },
      yaxis: {
        gridcolor: '#1F2937',
        color: '#6B7280',
        title: { text: 'Price (USD)', font: { color: '#6B7280' } },
        domain: [0, 1]
      },
      margin: { l: 60, r: 20, t: 40, b: 40 },
      height: 380,
      showlegend: true,
      legend: {
        x: 0,
        y: 1,
        bgcolor: 'rgba(11, 18, 32, 0.82)',
        bordercolor: 'rgba(212, 175, 55, 0.2)',
        borderwidth: 1
      }
    };
  }, []);

  const plotConfig = useMemo(() => ({ displayModeBar: false, responsive: true }), []);

  const renderChart = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Gold Price Chart</h3>
        <div className="flex items-center gap-2">
          {loading && <div className="text-sm text-amber-300">Loading…</div>}
          {error && <div className="text-sm text-rose-300">API Error</div>}
          {!loading && !error && latest && <div className="text-sm text-emerald-300">${latest.Close.toFixed(2)}</div>}
        </div>
      </div>

      <div className="rounded-xl border border-gold-500/10 bg-ink-900/60 overflow-hidden">
        <Plot data={plotData} layout={layout} config={plotConfig} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <div className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-3">
          <div className="text-xs font-semibold tracking-[0.18em] text-gray-500">EMA (20)</div>
          <div className="text-gold-300 font-semibold mt-1">
            {latest ? `$${latest.EMA_20.toFixed(2)}` : '—'}
          </div>
        </div>
        <div className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-3">
          <div className="text-xs font-semibold tracking-[0.18em] text-gray-500">STOCH %D</div>
          <div className="text-violet-300 font-semibold mt-1">
            {latest ? latest.Stochastic_D.toFixed(1) : '—'}
          </div>
        </div>
        <div className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-3">
          <div className="text-xs font-semibold tracking-[0.18em] text-gray-500">CCI</div>
          <div className="text-sky-300 font-semibold mt-1">
            {latest ? latest.CCI.toFixed(1) : '—'}
          </div>
        </div>
        <div className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-3">
          <div className="text-xs font-semibold tracking-[0.18em] text-gray-500">ADX</div>
          <div className="text-amber-300 font-semibold mt-1">
            {latest ? latest.ADX.toFixed(1) : '—'}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 rounded-xl border border-gold-500/10 bg-ink-800/55 p-4">
        <h4 className="text-white font-semibold mb-3">Technical Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">EMA (20)</span>
            <span
              className={clsx(
                'font-semibold',
                latest && latest.Close > latest.EMA_20 ? 'text-emerald-300' : 'text-rose-300'
              )}
            >
              {latest && latest.Close > latest.EMA_20 ? 'Bullish' : 'Bearish'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Stochastic</span>
            <span
              className={clsx(
                'font-semibold',
                latest && latest.Stochastic_D > 80
                  ? 'text-rose-300'
                  : latest && latest.Stochastic_D < 20
                    ? 'text-emerald-300'
                    : 'text-amber-300'
              )}
            >
              {latest && latest.Stochastic_D > 80 ? 'Overbought' : latest && latest.Stochastic_D < 20 ? 'Oversold' : 'Neutral'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">CCI</span>
            <span
              className={clsx(
                'font-semibold',
                latest && latest.CCI > 100
                  ? 'text-rose-300'
                  : latest && latest.CCI < -100
                    ? 'text-emerald-300'
                    : 'text-sky-300'
              )}
            >
              {latest && latest.CCI > 100 ? 'Overbought' : latest && latest.CCI < -100 ? 'Oversold' : 'Normal'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">ADX</span>
            <span
              className={clsx(
                'font-semibold',
                latest && latest.ADX > 50
                  ? 'text-emerald-300'
                  : latest && latest.ADX > 25
                    ? 'text-amber-300'
                    : 'text-rose-300'
              )}
            >
              {latest && latest.ADX > 50 ? 'Strong' : latest && latest.ADX > 25 ? 'Moderate' : 'Weak'}
            </span>
          </div>
        </div>
      </div>

      {priceData.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Showing {priceData.length} data points • Last updated: {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );

  const renderTrade = () => (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="text-gold-300" size={20} />
        <h3 className="text-lg font-semibold text-white">Trade Suggestion</h3>
      </div>

      <div className="rounded-xl border border-gold-500/12 bg-ink-800/55 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sky-300 font-semibold tracking-[0.12em] text-xs">BUY SIGNAL</span>
          <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/20 px-2 py-1 rounded">
            Medium Risk
          </span>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Entry Price</span>
            <span className="text-emerald-300 font-semibold">$2,325</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Target Price</span>
            <span className="text-emerald-300 font-semibold">$2,355</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Stop Loss</span>
            <span className="text-rose-300 font-semibold">$2,310</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Risk/Reward</span>
            <span className="text-gold-300 font-semibold">1:2</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-4">
        <h4 className="text-white font-semibold mb-2">Notes</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-300 rounded-full" />
            <span className="text-gray-300">RSI: 68 (Bullish momentum)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-300 rounded-full" />
            <span className="text-gray-300">MACD: Positive crossover</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-300 rounded-full" />
            <span className="text-gray-300">Bollinger: Near upper band</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-300 rounded-full" />
            <span className="text-gray-300">EMA (20): $2,340 (Above trend)</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRisk = () => (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="text-gold-300" size={20} />
        <h3 className="text-lg font-semibold text-white">Risk Assessment</h3>
      </div>

      <div className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-4 mb-4">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-gold-300 mb-1">MEDIUM</div>
          <div className="text-sm text-gray-400">Current risk level</div>
        </div>

        <div className="flex justify-center mb-4">
          <div className="w-32 h-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-t-full" />
            <div className="absolute top-0 left-1/2 w-1 h-16 bg-white transform -translate-x-0.5 rotate-12 origin-bottom" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="w-3 h-3 bg-emerald-500 rounded-full mx-auto mb-1" />
            <span className="text-gray-500">Low</span>
          </div>
          <div className="text-center">
            <div className="w-3 h-3 bg-amber-500 rounded-full mx-auto mb-1" />
            <span className="text-gray-500">Medium</span>
          </div>
          <div className="text-center">
            <div className="w-3 h-3 bg-rose-500 rounded-full mx-auto mb-1" />
            <span className="text-gray-500">High</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Volatility Index</span>
            <span className="text-gold-300 font-semibold">14%</span>
          </div>
        </div>
        <div className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Position Size Rec.</span>
            <span className="text-emerald-300 font-semibold">15% max</span>
          </div>
        </div>
        <div className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Market Sentiment</span>
            <span className="text-emerald-300 font-semibold">Bullish</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gold-500/12 bg-gold-500/5 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="text-gold-300 mt-0.5" size={16} />
          <div className="text-sm">
            <div className="text-gold-300 font-semibold">Recommendation</div>
            <div className="text-gray-300">Use proper position sizing and maintain stop losses below $2,310.</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNews = () => (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="text-gold-300" size={20} />
        <h3 className="text-lg font-semibold text-white">Market News</h3>
      </div>

      {newsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-ink-900/60 rounded mb-2" />
                <div className="h-3 bg-ink-900/60 rounded w-3/4 mb-1" />
                <div className="h-3 bg-ink-900/60 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {aiNews.length > 0 ? (
            aiNews.slice(0, 3).map((article, index) => (
              <div key={index} className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="text-xs bg-sky-500/15 text-sky-300 border border-sky-500/20 px-2 py-1 rounded">
                    LIVE
                  </div>
                  <span className="text-xs text-gray-500">{article.source_name}</span>
                </div>
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg p-1 -m-1 transition-colors duration-200 hover:bg-white/5"
                >
                  <h4 className="text-gray-100 font-semibold mb-2 hover:text-gold-300 transition-colors duration-200">
                    {article.title}
                  </h4>
                  <p className="text-sm text-gray-400 line-clamp-3">{article.summary}</p>
                </a>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-6">
              <Globe size={32} className="mx-auto mb-2 opacity-60" />
              <p className="text-sm">No news available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gold-500/10">
        <h2 className="text-xl font-semibold text-white">Trading Insights</h2>
        <p className="mt-1 text-sm text-gray-400">Insights update based on your conversation.</p>
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

