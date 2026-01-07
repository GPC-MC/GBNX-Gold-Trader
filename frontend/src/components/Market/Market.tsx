import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import Plot from 'react-plotly.js';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';

type Commodity = 'gold' | 'silver' | 'cobalt';

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

interface CommodityConfig {
  name: string;
  basePrice: number;
  color: string;
}

const commodityConfigs: Record<Commodity, CommodityConfig> = {
  gold: { name: 'GOLD', basePrice: 2345, color: '#D4AF37' },
  silver: { name: 'SILVER', basePrice: 28.5, color: '#C0C0C0' },
  cobalt: { name: 'COBALT', basePrice: 34.2, color: '#6366F1' }
};

const Market: React.FC = () => {
  const [timeframe, setTimeframe] = useState('1D');
  const [selectedCommodity, setSelectedCommodity] = useState<Commodity>('gold');
  const [priceData, setPriceData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeframes = ['1H', '1D', '1W', '1M'];
  const commodities: Commodity[] = ['gold', 'silver', 'cobalt'];

  const generateMockData = (commodity: Commodity): ChartDataPoint[] => {
    const config = commodityConfigs[commodity];
    return Array.from({ length: 50 }, (_, i) => {
      const date = new Date();
      date.setHours(date.getHours() - (49 - i));

      return {
        Date_time: date.toISOString(),
        Open: config.basePrice + Math.random() * 20 - 10,
        High: config.basePrice + Math.random() * 25,
        Low: config.basePrice - Math.random() * 25,
        Close: config.basePrice + Math.random() * 20 - 10,
        Volume: Math.floor(Math.random() * 10000) + 5000,
        EMA_20: config.basePrice + Math.random() * 10 - 5,
        Stochastic_D: Math.random() * 100,
        CCI: Math.random() * 200 - 100,
        ADX: Math.random() * 100
      };
    });
  };

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);

        if (selectedCommodity === 'gold') {
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

          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await response.text();
            throw new Error(
              `API did not return JSON. Content-Type: ${contentType}. Response: ${textResponse.substring(0, 100)}...`
            );
          }

          const data: ApiResponse = await response.json();
          setPriceData(data.data);
          setError(null);
        } else {
          setPriceData(generateMockData(selectedCommodity));
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError('Failed to load chart data');
        setPriceData(generateMockData(selectedCommodity));
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [selectedCommodity]);

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

  const currentConfig = commodityConfigs[selectedCommodity];
  const latest = priceData.length > 0 ? priceData[priceData.length - 1] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Commodity Selection */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {commodities.map((commodity) => {
          const config = commodityConfigs[commodity];
          const isSelected = selectedCommodity === commodity;

          return (
            <button
              key={commodity}
              onClick={() => setSelectedCommodity(commodity)}
              className={clsx(
                'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200',
                isSelected
                  ? 'bg-ink-850/55 border-gold-500/25 text-gray-100 shadow-glow'
                  : 'bg-ink-900/40 border-gold-500/10 text-gray-400 hover:text-gray-100 hover:bg-ink-850/40'
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
              {config.name}
            </button>
          );
        })}
      </div>

      {/* Market Header */}
      <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-gold-500">
              {currentConfig.name} MARKET
            </div>
            <div
              className={clsx(
                'mt-3 text-4xl sm:text-5xl font-bold',
                selectedCommodity === 'gold' ? 'bg-gradient-to-r from-gold-500 to-gold-300 bg-clip-text text-transparent' : ''
              )}
              style={selectedCommodity === 'gold' ? undefined : { color: currentConfig.color }}
            >
              ${marketData.price.toFixed(2)}
            </div>

            <div className="mt-2 flex items-center gap-2">
              {marketData.changePercent >= 0 ? (
                <TrendingUp size={18} className="text-emerald-400" />
              ) : (
                <TrendingDown size={18} className="text-rose-400" />
              )}
              <span
                className={clsx(
                  'text-base font-semibold',
                  marketData.changePercent >= 0 ? 'text-emerald-300' : 'text-rose-300'
                )}
              >
                {marketData.changePercent >= 0 ? '+' : ''}${marketData.change.toFixed(2)} (
                {marketData.changePercent >= 0 ? '+' : ''}
                {marketData.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-gray-500 mb-1">24H HIGH</div>
              <div className="text-lg font-semibold text-gray-100">${marketData.high24h.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-gray-500 mb-1">24H LOW</div>
              <div className="text-lg font-semibold text-gray-100">${marketData.low24h.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-gray-500 mb-1">VOLUME</div>
              <div className="text-lg font-semibold text-gray-100">{marketData.volume}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-gray-500 mb-1">MARKET CAP</div>
              <div className="text-lg font-semibold text-gray-100">$142.8B</div>
            </div>
          </div>

          <div className="flex justify-start lg:justify-end">
            <div className="lg:text-right">
              <div className="text-xs font-semibold tracking-[0.18em] text-gray-500 mb-2">TIMEFRAME</div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 border',
                      timeframe === tf
                        ? 'bg-gold-500/10 border-gold-500/30 text-gold-300'
                        : 'bg-ink-900/40 border-gold-500/10 text-gray-400 hover:text-gray-100 hover:bg-ink-850/40'
                    )}
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
          <div className="rounded-2xl overflow-hidden h-full flex flex-col border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm">
            <div className="p-6 border-b border-gold-500/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Price Chart</h2>
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-gray-400" />
                  {loading && <span className="text-sm text-amber-300">Loading...</span>}
                  {error && <span className="text-sm text-rose-300">API Error</span>}
                  {!loading && !error && <span className="text-sm text-emerald-300">Live Data</span>}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Chart */}
              <div className="rounded-xl border border-gold-500/10 bg-ink-900/60 overflow-hidden mb-6">
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
                        line: { color: '#D4AF37', width: 1.5 },
                        name: 'EMA (20)',
                        yaxis: 'y'
                      }
                    ]}
                    layout={{
                      title: { text: `${currentConfig.name} Price & Technical Indicators`, font: { color: '#9CA3AF', size: 14 } },
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
                      height: 400,
                      showlegend: true,
                      legend: {
                        x: 0,
                        y: 1,
                        bgcolor: 'rgba(11, 18, 32, 0.82)',
                        bordercolor: 'rgba(212, 175, 55, 0.2)',
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
                      <Activity size={44} className="mx-auto mb-3 text-gold-500" />
                      <div className="text-gray-300">Loading chart data...</div>
                      <div className="text-sm mt-2 text-gray-500">Chart with {timeframe} timeframe</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Indicator Pills */}
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold-500/15 bg-ink-800/55">
                  <span className="text-xs font-semibold tracking-[0.18em] text-gray-500">EMA 20</span>
                  <span className="text-sm font-semibold text-gray-100">
                    {latest ? `$${latest.EMA_20.toFixed(2)}` : '—'}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold-500/15 bg-ink-800/55">
                  <span className="text-xs font-semibold tracking-[0.18em] text-gray-500">STOCH %D</span>
                  <span className="text-sm font-semibold text-gray-100">
                    {latest ? latest.Stochastic_D.toFixed(1) : '—'}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold-500/15 bg-ink-800/55">
                  <span className="text-xs font-semibold tracking-[0.18em] text-gray-500">CCI</span>
                  <span className="text-sm font-semibold text-gray-100">
                    {latest ? latest.CCI.toFixed(1) : '—'}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold-500/15 bg-ink-800/55">
                  <span className="text-xs font-semibold tracking-[0.18em] text-gray-500">ADX</span>
                  <span className="text-sm font-semibold text-gray-100">
                    {latest ? latest.ADX.toFixed(1) : '—'}
                  </span>
                </div>
              </div>

              {/* Technical Summary */}
              <div className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-5 shadow-[0_4px_15px_rgba(0,0,0,0.25)]">
                <h4 className="font-semibold text-white mb-4">Technical Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">EMA (20)</span>
                    <span
                      className={clsx(
                        'px-3 py-1 rounded-full text-xs font-semibold',
                        latest && latest.Close > latest.EMA_20
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-rose-500/15 text-rose-300'
                      )}
                    >
                      {latest && latest.Close > latest.EMA_20 ? 'Bullish' : 'Bearish'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Stochastic</span>
                    <span
                      className={clsx(
                        'px-3 py-1 rounded-full text-xs font-semibold',
                        latest && latest.Stochastic_D > 80
                          ? 'bg-rose-500/15 text-rose-300'
                          : latest && latest.Stochastic_D < 20
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-white/10 text-gray-300'
                      )}
                    >
                      {latest && latest.Stochastic_D > 80 ? 'Overbought' : latest && latest.Stochastic_D < 20 ? 'Oversold' : 'Neutral'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">CCI</span>
                    <span
                      className={clsx(
                        'px-3 py-1 rounded-full text-xs font-semibold',
                        latest && latest.CCI > 100
                          ? 'bg-rose-500/15 text-rose-300'
                          : latest && latest.CCI < -100
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-sky-500/15 text-sky-300'
                      )}
                    >
                      {latest && latest.CCI > 100 ? 'Overbought' : latest && latest.CCI < -100 ? 'Oversold' : 'Normal'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">ADX</span>
                    <span
                      className={clsx(
                        'px-3 py-1 rounded-full text-xs font-semibold',
                        latest && latest.ADX > 50
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : latest && latest.ADX > 25
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-rose-500/15 text-rose-300'
                      )}
                    >
                      {latest && latest.ADX > 50 ? 'Strong' : latest && latest.ADX > 25 ? 'Moderate' : 'Weak'}
                    </span>
                  </div>
                </div>
              </div>

              {priceData.length > 0 && (
                <div className="mt-4 text-xs text-center text-gray-500">
                  Showing {priceData.length} data points • Last updated: {new Date().toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          {/* Order Book */}
          <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Order Book</h2>
            <div className="space-y-3">
              <div className="text-xs font-semibold tracking-[0.18em] grid grid-cols-2 gap-4 pb-3 border-b border-gold-500/10 text-gray-500">
                <span>PRICE (USD)</span>
                <span className="text-right">SIZE (OZ)</span>
              </div>

              <div className="space-y-2">
                <div className="text-sm grid grid-cols-2 gap-4 py-1 px-2 rounded text-rose-300">
                  <span className="font-medium">2,348.50</span>
                  <span className="text-right text-gray-400">1.2</span>
                </div>
                <div className="text-sm grid grid-cols-2 gap-4 py-1 px-2 rounded text-rose-300">
                  <span className="font-medium">2,347.25</span>
                  <span className="text-right text-gray-400">2.8</span>
                </div>
                <div className="text-sm grid grid-cols-2 gap-4 py-1 px-2 rounded text-rose-300">
                  <span className="font-medium">2,346.00</span>
                  <span className="text-right text-gray-400">1.5</span>
                </div>
              </div>

              <div className="py-3 px-3 text-center rounded-lg bg-gold-500/10 border border-gold-500/15">
                <span className="font-bold text-lg text-gold-300">${marketData.price.toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                <div className="text-sm grid grid-cols-2 gap-4 py-1 px-2 rounded text-emerald-300">
                  <span className="font-medium">2,344.75</span>
                  <span className="text-right text-gray-400">3.1</span>
                </div>
                <div className="text-sm grid grid-cols-2 gap-4 py-1 px-2 rounded text-emerald-300">
                  <span className="font-medium">2,343.50</span>
                  <span className="text-right text-gray-400">2.4</span>
                </div>
                <div className="text-sm grid grid-cols-2 gap-4 py-1 px-2 rounded text-emerald-300">
                  <span className="font-medium">2,342.25</span>
                  <span className="text-right text-gray-400">1.8</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Market;

