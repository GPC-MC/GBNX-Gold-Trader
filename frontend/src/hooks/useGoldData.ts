import { useState, useEffect } from 'react';
import { GoldPrice, Portfolio } from '../types';

export const useGoldData = () => {
  const [goldPrice, setGoldPrice] = useState<GoldPrice>({
    current: 2345,
    change: 18.5,
    changePercent: 0.8,
    support: 2320,
    resistance: 2360,
    volatility: 14,
    sentiment: 'Bullish'
  });

  const [portfolio, setPortfolio] = useState<Portfolio>({
    totalValue: 12500,
    profitToday: 250,
    profitTodayPercent: 2.0,
    holdings: {
      gold: {
        amount: 2.5,
        avgBuy: 2200,
        current: 2345
      },
      etf: {
        amount: 10,
        avgBuy: 170,
        current: 180
      },
      cash: 1250
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setGoldPrice(prev => ({
        ...prev,
        current: prev.current + (Math.random() - 0.5) * 2,
        change: prev.change + (Math.random() - 0.5) * 0.5,
        changePercent: prev.changePercent + (Math.random() - 0.5) * 0.1
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return { goldPrice, portfolio };
};