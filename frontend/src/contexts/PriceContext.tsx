import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface OhlcItem {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
}

interface PriceData {
  goldPrice: number;
  goldBid: number;
  goldAsk: number;
  goldSpread: number;
  lastUpdate: Date | null;
  isConnected: boolean;
  isLoading: boolean;
}

interface PriceContextValue extends PriceData {
  reconnect: () => void;
}

const PriceContext = createContext<PriceContextValue | undefined>(undefined);

export const PriceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const apiBaseUrl = ((import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined) || '').replace(/\/+$/, '');

  const [priceData, setPriceData] = useState<PriceData>({
    goldPrice: 0,
    goldBid: 0,
    goldAsk: 0,
    goldSpread: 0,
    lastUpdate: null,
    isConnected: false,
    isLoading: true
  });

  const fetchPrice = useCallback(async () => {
    if (!apiBaseUrl) {
      console.error('Missing VITE_BACKEND_API_BASE_URL');
      setPriceData(prev => ({ ...prev, isLoading: false, isConnected: false }));
      return;
    }

    setPriceData(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/pricing/ohlc/xau_usd?interval=3600&limit=1&sort=desc`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as OhlcItem[];
      const latest = Array.isArray(data) ? data[0] : null;
      if (!latest) throw new Error('No price data returned');

      setPriceData({
        goldPrice: latest.close,
        goldBid: latest.close,
        goldAsk: latest.close,
        goldSpread: 0,
        lastUpdate: new Date(latest.timestamp),
        isConnected: true,
        isLoading: false
      });
    } catch (err) {
      console.error('Failed to fetch gold price:', err);
      setPriceData(prev => ({ ...prev, isConnected: false, isLoading: false }));
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void fetchPrice();
  }, [fetchPrice]);

  const value: PriceContextValue = {
    ...priceData,
    reconnect: fetchPrice
  };

  return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>;
};

export const usePrice = (): PriceContextValue => {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePrice must be used within a PriceProvider');
  }
  return context;
};
