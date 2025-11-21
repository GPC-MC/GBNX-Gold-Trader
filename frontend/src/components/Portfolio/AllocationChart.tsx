import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Portfolio } from '../../types';

interface AllocationChartProps {
  portfolio: Portfolio;
}

const AllocationChart: React.FC<AllocationChartProps> = ({ portfolio }) => {
  const goldValue = portfolio.holdings.gold.amount * portfolio.holdings.gold.current;
  const etfValue = portfolio.holdings.etf.amount * portfolio.holdings.etf.current;
  const cashValue = portfolio.holdings.cash;
  const totalValue = goldValue + etfValue + cashValue;

  const data = [
    {
      name: 'Gold',
      value: goldValue,
      percentage: ((goldValue / totalValue) * 100).toFixed(1),
      color: '#fbbf24'
    },
    {
      name: 'ETF',
      value: etfValue,
      percentage: ((etfValue / totalValue) * 100).toFixed(1),
      color: '#60a5fa'
    },
    {
      name: 'Cash',
      value: cashValue,
      percentage: ((cashValue / totalValue) * 100).toFixed(1),
      color: '#34d399'
    }
  ];

  const renderLabel = (entry: any) => {
    return `${entry.percentage}%`;
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }}>
                {value}: ${entry.payload.value.toLocaleString()} ({entry.payload.percentage}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AllocationChart;