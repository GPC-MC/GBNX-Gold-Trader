import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

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
  const indicators = ['D%', 'ADX', 'CCI', 'EMA (20 period)'];
  const commodities: Commodity[] = ['gold', 'silver', 'cobalt'];

  // Generate mock data for different commodities
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

        // Only fetch real data for gold
        if (selectedCommodity === 'gold') {
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

          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await response.text();
            throw new Error(`API did not return JSON. Content-Type: ${contentType}. Response: ${textResponse.substring(0, 100)}...`);
          }

          const data: ApiResponse = await response.json();
          setPriceData(data.data);
          setError(null);
        } else {
          // Use mock data for silver and cobalt
          setPriceData(generateMockData(selectedCommodity));
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError('Failed to load chart data');
        // Fallback to mock data when API fails
        setPriceData(generateMockData(selectedCommodity));
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [selectedCommodity]);

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

  const currentConfig = commodityConfigs[selectedCommodity];

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0B1220' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Commodity Selection Tabs */}
        <div className="mb-6 flex items-center space-x-3">
          {commodities.map((commodity) => (
            <button
              key={commodity}
              onClick={() => setSelectedCommodity(commodity)}
              className="px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: selectedCommodity === commodity ? commodityConfigs[commodity].color : '#161E2E',
                color: selectedCommodity === commodity ? '#0B1220' : '#9CA3AF',
                fontWeight: selectedCommodity === commodity ? 600 : 500
              }}
            >
              {commodityConfigs[commodity].name}
            </button>
          ))}
        </div>

        {/* Market Header */}
        <div className="border rounded-2xl mb-8" style={{ backgroundColor: '#121826', borderColor: 'rgba(212, 175, 55, 0.15)', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h1 className="text-lg font-semibold mb-3" style={{ color: '#9CA3AF', letterSpacing: '0.03em' }}>{currentConfig.name} MARKET</h1>
              <div className="text-5xl font-bold mb-2" style={{ color: currentConfig.color }}>
                ${marketData.price.toFixed(2)}
              </div>
              <div className="flex items-center space-x-2">
                {marketData.changePercent >= 0 ? (
                  <TrendingUp size={20} style={{ color: '#16A34A' }} />
                ) : (
                  <TrendingDown size={20} style={{ color: '#DC2626' }} />
                )}
                <span className="text-lg font-semibold" style={{ color: marketData.changePercent >= 0 ? '#16A34A' : '#DC2626' }}>
                  {marketData.changePercent >= 0 ? '+' : ''}${marketData.change.toFixed(2)} ({marketData.changePercent >= 0 ? '+' : ''}{marketData.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>24H HIGH</div>
                <div className="text-lg font-semibold" style={{ color: '#E5E7EB' }}>${marketData.high24h.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>24H LOW</div>
                <div className="text-lg font-semibold" style={{ color: '#E5E7EB' }}>${marketData.low24h.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>VOLUME</div>
                <div className="text-lg font-semibold" style={{ color: '#E5E7EB' }}>{marketData.volume}</div>
              </div>
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>MARKET CAP</div>
                <div className="text-lg font-semibold" style={{ color: '#E5E7EB' }}>$142.8B</div>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="text-right">
                <div className="text-xs font-medium mb-2" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>TIMEFRAME</div>
                <div className="flex space-x-2">
                  {timeframes.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className="px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200"
                      style={{
                        backgroundColor: timeframe === tf ? '#D4AF37' : '#161E2E',
                        color: timeframe === tf ? '#0B1220' : '#9CA3AF'
                      }}
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
            <div className="rounded-2xl overflow-hidden h-full flex flex-col" style={{ backgroundColor: '#121826', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
              <div className="p-6 border-b" style={{ borderColor: 'rgba(212, 175, 55, 0.1)' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold" style={{ color: '#E5E7EB' }}>Price Chart</h2>
                  <div className="flex items-center space-x-2">
                    <Activity size={20} style={{ color: '#9CA3AF' }} />
                    {loading && <span className="text-sm" style={{ color: '#F59E0B' }}>Loading...</span>}
                    {error && <span className="text-sm" style={{ color: '#DC2626' }}>API Error</span>}
                    {!loading && !error && <span className="text-sm" style={{ color: '#16A34A' }}>Live Data</span>}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {/* Real Chart Area */}
                <div className="rounded-xl border overflow-hidden mb-6" style={{ backgroundColor: '#0B1220', borderColor: 'rgba(212, 175, 55, 0.1)' }}>
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
                          name: 'Gold Price',
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
                        height: 400,
                        showlegend: true,
                        legend: {
                          x: 0,
                          y: 1,
                          bgcolor: 'rgba(18, 24, 38, 0.8)',
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
                        <Activity size={48} className="mx-auto mb-4" style={{ color: '#D4AF37' }} />
                        <div style={{ color: '#9CA3AF' }}>Loading Chart Data...</div>
                        <div className="text-sm mt-2" style={{ color: '#6B7280' }}>
                          Chart with {timeframe} timeframe
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Technical Indicators - Pill Style */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="inline-flex items-center px-4 py-2 rounded-full border" style={{ backgroundColor: '#161E2E', borderColor: 'rgba(212, 175, 55, 0.2)' }}>
                    <span className="text-xs font-medium mr-2" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>EMA 20:</span>
                    <span className="text-sm font-semibold" style={{ color: '#E5E7EB' }}>
                      ${priceData.length > 0 ? priceData[priceData.length - 1]?.EMA_20?.toFixed(2) : 'Loading...'}
                    </span>
                  </div>
                  <div className="inline-flex items-center px-4 py-2 rounded-full border" style={{ backgroundColor: '#161E2E', borderColor: 'rgba(212, 175, 55, 0.2)' }}>
                    <span className="text-xs font-medium mr-2" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>Stochastic %D:</span>
                    <span className="text-sm font-semibold" style={{ color: '#E5E7EB' }}>
                      {priceData.length > 0 ? priceData[priceData.length - 1]?.Stochastic_D?.toFixed(1) : 'Loading...'}
                    </span>
                  </div>
                  <div className="inline-flex items-center px-4 py-2 rounded-full border" style={{ backgroundColor: '#161E2E', borderColor: 'rgba(212, 175, 55, 0.2)' }}>
                    <span className="text-xs font-medium mr-2" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>CCI:</span>
                    <span className="text-sm font-semibold" style={{ color: '#E5E7EB' }}>
                      {priceData.length > 0 ? priceData[priceData.length - 1]?.CCI?.toFixed(1) : 'Loading...'}
                    </span>
                  </div>
                  <div className="inline-flex items-center px-4 py-2 rounded-full border" style={{ backgroundColor: '#161E2E', borderColor: 'rgba(212, 175, 55, 0.2)' }}>
                    <span className="text-xs font-medium mr-2" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>ADX:</span>
                    <span className="text-sm font-semibold" style={{ color: '#E5E7EB' }}>
                      {priceData.length > 0 ? priceData[priceData.length - 1]?.ADX?.toFixed(1) : 'Loading...'}
                    </span>
                  </div>
                </div>

                {/* Technical Analysis Summary - Badge Style */}
                <div className="rounded-xl p-5" style={{ backgroundColor: '#161E2E', boxShadow: '0 4px 15px rgba(0,0,0,0.25)' }}>
                  <h4 className="font-semibold mb-4" style={{ color: '#E5E7EB' }}>Technical Analysis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#9CA3AF' }}>EMA (20):</span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: priceData.length > 0 && priceData[priceData.length - 1]?.Close > priceData[priceData.length - 1]?.EMA_20
                            ? 'rgba(22, 163, 74, 0.2)' : 'rgba(220, 38, 38, 0.2)',
                          color: priceData.length > 0 && priceData[priceData.length - 1]?.Close > priceData[priceData.length - 1]?.EMA_20
                            ? '#16A34A' : '#DC2626'
                        }}
                      >
                        {priceData.length > 0 && priceData[priceData.length - 1]?.Close > priceData[priceData.length - 1]?.EMA_20
                          ? 'Bullish' : 'Bearish'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#9CA3AF' }}>Stochastic:</span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: priceData.length > 0 && priceData[priceData.length - 1]?.Stochastic_D > 80
                            ? 'rgba(220, 38, 38, 0.2)' : priceData[priceData.length - 1]?.Stochastic_D < 20
                            ? 'rgba(22, 163, 74, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                          color: priceData.length > 0 && priceData[priceData.length - 1]?.Stochastic_D > 80
                            ? '#DC2626' : priceData[priceData.length - 1]?.Stochastic_D < 20
                            ? '#16A34A' : '#9CA3AF'
                        }}
                      >
                        {priceData.length > 0 && priceData[priceData.length - 1]?.Stochastic_D > 80
                          ? 'Overbought' : priceData[priceData.length - 1]?.Stochastic_D < 20
                          ? 'Oversold' : 'Neutral'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#9CA3AF' }}>CCI:</span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: priceData.length > 0 && priceData[priceData.length - 1]?.CCI > 100
                            ? 'rgba(220, 38, 38, 0.2)' : priceData[priceData.length - 1]?.CCI < -100
                            ? 'rgba(22, 163, 74, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                          color: priceData.length > 0 && priceData[priceData.length - 1]?.CCI > 100
                            ? '#DC2626' : priceData[priceData.length - 1]?.CCI < -100
                            ? '#16A34A' : '#38BDF8'
                        }}
                      >
                        {priceData.length > 0 && priceData[priceData.length - 1]?.CCI > 100
                          ? 'Overbought' : priceData[priceData.length - 1]?.CCI < -100
                          ? 'Oversold' : 'Normal'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#9CA3AF' }}>ADX:</span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: priceData.length > 0 && priceData[priceData.length - 1]?.ADX > 50
                            ? 'rgba(22, 163, 74, 0.2)' : priceData[priceData.length - 1]?.ADX > 25
                            ? 'rgba(245, 158, 11, 0.2)' : 'rgba(220, 38, 38, 0.2)',
                          color: priceData.length > 0 && priceData[priceData.length - 1]?.ADX > 50
                            ? '#16A34A' : priceData[priceData.length - 1]?.ADX > 25
                            ? '#F59E0B' : '#DC2626'
                        }}
                      >
                        {priceData.length > 0 && priceData[priceData.length - 1]?.ADX > 50
                          ? 'Strong' : priceData[priceData.length - 1]?.ADX > 25
                          ? 'Moderate' : 'Weak'}
                      </span>
                    </div>
                  </div>
                </div>

                {priceData.length > 0 && (
                  <div className="mt-4 text-xs text-center" style={{ color: '#6B7280' }}>
                    Showing {priceData.length} data points • Last updated: {new Date().toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            {/* Order Book */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#121826', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#E5E7EB' }}>Order Book</h2>
              <div className="space-y-3">
                <div className="text-xs font-medium grid grid-cols-2 gap-4 pb-3 border-b" style={{ color: '#6B7280', letterSpacing: '0.03em', borderColor: 'rgba(212, 175, 55, 0.1)' }}>
                  <span>PRICE (USD)</span>
                  <span className="text-right">SIZE (OZ)</span>
                </div>

                {/* Asks */}
                <div className="space-y-2">
                  <div className="text-sm grid grid-cols-2 gap-4 py-1 px-2 rounded" style={{ color: '#DC2626' }}>
                    <span className="font-medium">2,348.50</span>
                    <span className="text-right" style={{ color: '#9CA3AF' }}>1.2</span>
                  </div>
                  <div className="text-sm grid grid-cols-2 gap-4 py-1 px-2 rounded" style={{ color: '#DC2626' }}>
                    <span className="font-medium">2,347.25</span>
                    <span className="text-right" style={{ color: '#9CA3AF' }}>2.8</span>
                  </div>
                  <div className="text-sm grid grid-cols-2 gap-4 py-1 px-2 rounded" style={{ color: '#DC2626' }}>
                    <span className="font-medium">2,346.00</span>
                    <span className="text-right" style={{ color: '#9CA3AF' }}>1.5</span>
                  </div>
                </div>

                {/* Current Price - Highlighted */}
                <div className="py-3 px-3 text-center rounded-lg" style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)' }}>
                  <span className="font-bold text-lg" style={{ color: '#D4AF37' }}>${marketData.price.toFixed(2)}</span>
                </div>

                {/* Bids */}
                <div className="space-y-2">
                  <div className="text-sm grid grid-cols-2 gap-4 py-1 px-2 rounded" style={{ color: '#16A34A' }}>
                    <span className="font-medium">2,344.75</span>
                    <span className="text-right" style={{ color: '#9CA3AF' }}>3.1</span>
                  </div>
                  <div className="text-sm grid grid-cols-2 gap-4 py-1 px-2 rounded" style={{ color: '#16A34A' }}>
                    <span className="font-medium">2,343.50</span>
                    <span className="text-right" style={{ color: '#9CA3AF' }}>2.4</span>
                  </div>
                  <div className="text-sm grid grid-cols-2 gap-4 py-1 px-2 rounded" style={{ color: '#16A34A' }}>
                    <span className="font-medium">2,342.25</span>
                    <span className="text-right" style={{ color: '#9CA3AF' }}>1.8</span>
                  </div>
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