import { useState, useEffect, useMemo } from 'react';
import { GoldPrice, Portfolio } from '../types';
import { usePrice } from '../contexts/PriceContext';

export const useGoldData = () => {
  const { goldPrice: livePrice, goldBid, goldAsk, isConnected, isLoading } = usePrice();

  const [previousPrice, setPreviousPrice] = useState(livePrice);
  const [openPrice] = useState(livePrice || 2845); // Store opening price

  // Calculate change based on live price vs opening price
  const change = useMemo(() => {
    if (!livePrice) return 0;
    return livePrice - openPrice;
  }, [livePrice, openPrice]);

  const changePercent = useMemo(() => {
    if (!livePrice || !openPrice) return 0;
    return ((livePrice - openPrice) / openPrice) * 100;
  }, [livePrice, openPrice]);

  // Update previous price when live price changes
  useEffect(() => {
    if (livePrice && livePrice !== previousPrice) {
      setPreviousPrice(livePrice);
    }
  }, [livePrice, previousPrice]);

  // Calculate support and resistance based on live price
  const support = useMemo(() => Math.floor(livePrice * 0.985), [livePrice]);
  const resistance = useMemo(() => Math.ceil(livePrice * 1.015), [livePrice]);

  // Calculate volatility based on bid-ask spread
  const volatility = useMemo(() => {
    if (!goldBid || !goldAsk || !livePrice) return 14;
    const spreadPercent = ((goldAsk - goldBid) / livePrice) * 100;
    return Math.min(Math.max(spreadPercent * 100, 5), 30); // Clamp between 5-30%
  }, [goldBid, goldAsk, livePrice]);

  // Determine sentiment based on price movement
  const sentiment = useMemo(() => {
    if (changePercent > 0.5) return 'Bullish';
    if (changePercent < -0.5) return 'Bearish';
    return 'Neutral';
  }, [changePercent]);

  const goldPrice: GoldPrice = {
    current: livePrice || 2845,
    change,
    changePercent,
    support,
    resistance,
    volatility,
    sentiment
  };

  // Calculate portfolio value based on live gold price
  const goldHoldings = 2.5; // oz
  const avgBuy = 2200;
  const goldValue = goldHoldings * (livePrice || 2845);
  const goldProfit = goldHoldings * ((livePrice || 2845) - avgBuy);

  const etfHoldings = 10;
  const etfAvgBuy = 170;
  const etfCurrent = 180;
  const etfValue = etfHoldings * etfCurrent;
  const etfProfit = etfHoldings * (etfCurrent - etfAvgBuy);

  const cash = 1250;
  const totalValue = goldValue + etfValue + cash;
  const profitToday = goldProfit + etfProfit;
  const profitTodayPercent = ((profitToday) / (totalValue - profitToday)) * 100;

  const portfolio: Portfolio = {
    totalValue: Math.round(totalValue),
    profitToday: Math.round(profitToday),
    profitTodayPercent,
    holdings: {
      gold: {
        amount: goldHoldings,
        avgBuy,
        current: livePrice || 2845
      },
      etf: {
        amount: etfHoldings,
        avgBuy: etfAvgBuy,
        current: etfCurrent
      },
      cash
    }
  };

  return { goldPrice, portfolio, isConnected, isLoading };
};