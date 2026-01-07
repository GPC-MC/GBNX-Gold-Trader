import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

// Generate mock PNL data
const generatePNLData = () => {
  const data = [];
  const days = 30;
  let cumulativePNL = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));

    // Random daily PNL between -500 and +800 with slight upward bias
    const dailyPNL = (Math.random() - 0.4) * 1300;
    cumulativePNL += dailyPNL;

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pnl: parseFloat(cumulativePNL.toFixed(2)),
      dailyPNL: parseFloat(dailyPNL.toFixed(2))
    });
  }

  return data;
};

const PNLChart: React.FC = () => {
  const data = generatePNLData();
  const finalPNL = data[data.length - 1].pnl;
  const isProfitable = finalPNL >= 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg p-3 border" style={{ backgroundColor: '#121826', borderColor: 'rgba(212, 175, 55, 0.3)' }}>
          <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>{payload[0].payload.date}</p>
          <p className="text-sm font-semibold" style={{ color: payload[0].value >= 0 ? '#22C55E' : '#DC2626' }}>
            Total P&L: ${payload[0].value.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            Daily: ${payload[0].payload.dailyPNL.toLocaleString()}
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
              TOTAL P&L (30 DAYS)
            </div>
            <div className="text-3xl font-bold" style={{ color: isProfitable ? '#22C55E' : '#DC2626' }}>
              {isProfitable ? '+' : ''}${finalPNL.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium mb-1" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>
              RETURN
            </div>
            <div className="text-xl font-semibold" style={{ color: isProfitable ? '#22C55E' : '#DC2626' }}>
              {isProfitable ? '+' : ''}{((finalPNL / 50000) * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isProfitable ? '#22C55E' : '#DC2626'} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={isProfitable ? '#22C55E' : '#DC2626'} stopOpacity={0}/>
            </linearGradient>
          </defs>
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
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="pnl"
            stroke={isProfitable ? '#22C55E' : '#DC2626'}
            strokeWidth={2}
            fill="url(#pnlGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PNLChart;
