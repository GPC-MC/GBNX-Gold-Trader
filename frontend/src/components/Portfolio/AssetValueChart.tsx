import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Generate mock asset value data over time
const generateAssetData = () => {
  const data = [];
  const days = 30;
  let portfolioValue = 48000;
  let goldValue = 28000;
  let etfValue = 15000;
  let cashValue = 5000;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));

    // Simulate growth with some volatility
    const growthFactor = 1 + (Math.random() - 0.45) * 0.02;
    goldValue *= growthFactor;
    etfValue *= growthFactor * 0.98;
    portfolioValue = goldValue + etfValue + cashValue;

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total: parseFloat(portfolioValue.toFixed(2)),
      gold: parseFloat(goldValue.toFixed(2)),
      etf: parseFloat(etfValue.toFixed(2)),
      cash: cashValue
    });
  }

  return data;
};

const AssetValueChart: React.FC = () => {
  const data = generateAssetData();
  const currentValue = data[data.length - 1].total;
  const startValue = data[0].total;
  const change = currentValue - startValue;
  const changePercent = (change / startValue) * 100;
  const isPositive = change >= 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg p-3 border" style={{ backgroundColor: '#121826', borderColor: 'rgba(212, 175, 55, 0.3)' }}>
          <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>{payload[0].payload.date}</p>
          <p className="text-sm font-semibold mb-1" style={{ color: '#E5E7EB' }}>
            Total: ${payload[0].payload.total.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: '#D4AF37' }}>
            Gold: ${payload[0].payload.gold.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: '#38BDF8' }}>
            ETF: ${payload[0].payload.etf.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: '#22C55E' }}>
            Cash: ${payload[0].payload.cash.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-80">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>
              CURRENT VALUE
            </div>
            <div className="text-3xl font-bold" style={{ color: '#E5E7EB' }}>
              ${currentValue.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium mb-1" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>
              30-DAY CHANGE
            </div>
            <div className="text-xl font-semibold" style={{ color: isPositive ? '#22C55E' : '#DC2626' }}>
              {isPositive ? '+' : ''}${change.toLocaleString()} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
          <XAxis
            dataKey="date"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#6B7280' }}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#6B7280' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="line"
            formatter={(value) => {
              const colors: any = {
                total: '#E5E7EB',
                gold: '#D4AF37',
                etf: '#38BDF8',
                cash: '#22C55E'
              };
              return <span style={{ color: colors[value] }}>{value.toUpperCase()}</span>;
            }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#E5E7EB"
            strokeWidth={2}
            dot={false}
            name="total"
          />
          <Line
            type="monotone"
            dataKey="gold"
            stroke="#D4AF37"
            strokeWidth={1.5}
            dot={false}
            name="gold"
          />
          <Line
            type="monotone"
            dataKey="etf"
            stroke="#38BDF8"
            strokeWidth={1.5}
            dot={false}
            name="etf"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AssetValueChart;
