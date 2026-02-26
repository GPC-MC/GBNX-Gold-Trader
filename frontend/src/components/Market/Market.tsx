import React, { useEffect, useState, useCallback } from 'react';
import clsx from 'clsx';
import Plot from 'react-plotly.js';
import { Activity, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';

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

interface GoldOhlcApiItem {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
}

interface CommodityConfig {
  name: string;
  basePrice: number;
  color: string;
}

const commodityConfigs: Record<Commodity, CommodityConfig> = {
  gold: { name: 'GOLD', basePrice: 2345, color: '#D4AF37' },
  silver: { name: 'SILVER', basePrice: 28.5, color: '#C0C0C0' },
  cobalt: { name: 'COBALT', basePrice: 34.2, color: '#4EA9FF' }
};

const EMA_PERIOD = 20;
const STOCHASTIC_PERIOD = 14;
const CCI_PERIOD = 20;
const ADX_PERIOD = 14;

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const withIndicators = (rows: ChartDataPoint[]): ChartDataPoint[] => {
  let ema = 0;
  let adx = 0;

  const stochasticK: number[] = [];
  const typicalPrices: number[] = [];
  const trueRanges: number[] = [];
  const plusDmValues: number[] = [];
  const minusDmValues: number[] = [];

  return rows.map((row, index) => {
    const close = row.Close;
    const high = row.High;
    const low = row.Low;

    const k = 2 / (EMA_PERIOD + 1);
    ema = index === 0 ? close : close * k + ema * (1 - k);

    const stochStart = Math.max(0, index - STOCHASTIC_PERIOD + 1);
    const stochWindow = rows.slice(stochStart, index + 1);
    const highestHigh = Math.max(...stochWindow.map((item) => item.High));
    const lowestLow = Math.min(...stochWindow.map((item) => item.Low));
    const stochK =
      highestHigh === lowestLow ? 50 : ((close - lowestLow) / (highestHigh - lowestLow)) * 100;
    stochasticK.push(stochK);
    const stochDWindow = stochasticK.slice(Math.max(0, stochasticK.length - 3));
    const stochasticD = clamp(average(stochDWindow), 0, 100);

    const typicalPrice = (high + low + close) / 3;
    typicalPrices.push(typicalPrice);
    const cciWindow = typicalPrices.slice(Math.max(0, typicalPrices.length - CCI_PERIOD));
    const cciMean = average(cciWindow);
    const meanDeviation = average(cciWindow.map((price) => Math.abs(price - cciMean)));
    const cci = meanDeviation === 0 ? 0 : (typicalPrice - cciMean) / (0.015 * meanDeviation);

    if (index > 0) {
      const prev = rows[index - 1];
      const upMove = high - prev.High;
      const downMove = prev.Low - low;
      const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
      const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;
      const trueRange = Math.max(high - low, Math.abs(high - prev.Close), Math.abs(low - prev.Close));

      trueRanges.push(trueRange);
      plusDmValues.push(plusDM);
      minusDmValues.push(minusDM);

      const trWindow = trueRanges.slice(Math.max(0, trueRanges.length - ADX_PERIOD));
      const plusWindow = plusDmValues.slice(Math.max(0, plusDmValues.length - ADX_PERIOD));
      const minusWindow = minusDmValues.slice(Math.max(0, minusDmValues.length - ADX_PERIOD));

      const trSum = trWindow.reduce((sum, value) => sum + value, 0);
      const plusSum = plusWindow.reduce((sum, value) => sum + value, 0);
      const minusSum = minusWindow.reduce((sum, value) => sum + value, 0);

      const plusDi = trSum === 0 ? 0 : (100 * plusSum) / trSum;
      const minusDi = trSum === 0 ? 0 : (100 * minusSum) / trSum;
      const dx =
        plusDi + minusDi === 0 ? 0 : (100 * Math.abs(plusDi - minusDi)) / (plusDi + minusDi);
      adx = index === 1 ? dx : (adx * (ADX_PERIOD - 1) + dx) / ADX_PERIOD;
    }

    return {
      ...row,
      EMA_20: ema,
      Stochastic_D: stochasticD,
      CCI: cci,
      ADX: clamp(adx, 0, 100)
    };
  });
};

const toChartPoint = (dateTime: string, open: number, high: number, low: number, close: number, volume: number): ChartDataPoint => ({
  Date_time: dateTime,
  Open: open,
  High: high,
  Low: low,
  Close: close,
  Volume: volume,
  EMA_20: close,
  Stochastic_D: 50,
  CCI: 0,
  ADX: 0
});

const mapGoldHistory = (rows: GoldOhlcApiItem[]) => {
  const sorted = [...rows].sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );

  return withIndicators(
    sorted.map((row) =>
      toChartPoint(
        row.timestamp,
        row.open,
        row.high,
        row.low,
        row.close,
        typeof row.volume === 'number' ? row.volume : 0
      )
    )
  );
};

const Market: React.FC = () => {
  const apiBaseUrl = ((import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined) || '').replace(/\/+$/, '');

  const [timeframe, setTimeframe] = useState('1D');
  const [selectedCommodity, setSelectedCommodity] = useState<Commodity>('gold');
  const [priceData, setPriceData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

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

  const loadMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (selectedCommodity !== 'gold') {
        setPriceData(generateMockData(selectedCommodity));
        setLastFetched(new Date());
        return;
      }

      if (!apiBaseUrl) {
        throw new Error('Missing VITE_BACKEND_API_BASE_URL');
      }

      const response = await fetch(`${apiBaseUrl}/api/pricing/ohlc/xau_usd?interval=3600&limit=100&sort=asc`);
      if (!response.ok) {
        throw new Error(`Failed to load gold history (${response.status})`);
      }

      const data = (await response.json()) as GoldOhlcApiItem[];
      setPriceData(mapGoldHistory(data));
      setLastFetched(new Date());
    } catch (err) {
      console.error('Error loading market data:', err);
      setError('Failed to load chart data');
      if (selectedCommodity !== 'gold') {
        setPriceData(generateMockData(selectedCommodity));
      } else {
        setPriceData([]);
      }
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, selectedCommodity]);

  useEffect(() => {
    void loadMarketData();
  }, [loadMarketData]);

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

      {/* Chart Section - Full Width */}
      <div className="w-full">
        <div className="rounded-2xl overflow-hidden h-full flex flex-col border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm">
            <div className="p-6 border-b border-gold-500/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Price Chart</h2>
                <div className="flex items-center gap-3">
                  <Activity size={18} className="text-gray-400" />
                  {lastFetched && (
                    <span className="text-xs text-gray-500">
                      Updated {lastFetched.toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={() => void loadMarketData()}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-gray-100 bg-ink-900/40 border border-gold-500/10 hover:bg-ink-850/40 disabled:opacity-50 transition-all"
                  >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    Reload
                  </button>
                  {error && <span className="text-sm text-amber-300" title={error}>⚠ {error}</span>}
                  {!loading && !error && selectedCommodity !== 'gold' && <span className="text-sm text-emerald-300">Mock Data</span>}
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
                      }
                    ]}
                    layout={{
                      title: { text: `${currentConfig.name} Price Chart`, font: { color: '#9CA3AF', size: 14 } },
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
                      height: 600,
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
                      <div className="text-gray-300">
                        {loading ? 'Loading chart data...' : 'No data available'}
                      </div>
                      {!loading && (
                        <button
                          onClick={() => void loadMarketData()}
                          className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-100 bg-ink-900/40 border border-gold-500/10 hover:bg-ink-850/40 transition-all"
                        >
                          <RefreshCw size={14} />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {priceData.length > 0 && (
                <div className="mt-4 text-xs text-center text-gray-500">
                  Showing {priceData.length} data points
                  {lastFetched && ` • Last updated: ${lastFetched.toLocaleTimeString()}`}
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};

export default Market;
