import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface TickPayload {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: string;
  spread?: number;
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

const GOLD_WS_SYMBOL = 'XAU/USD';
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;

const toWsBaseUrl = (apiBaseUrl: string) => {
  if (!apiBaseUrl) return '';
  try {
    const parsed = new URL(apiBaseUrl);
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
};

const isTickPayload = (value: unknown): value is TickPayload => {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.bid === 'number' &&
    typeof payload.ask === 'number' &&
    typeof payload.timestamp === 'string'
  );
};

export const PriceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const apiBaseUrl = ((import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined) || '').replace(/\/+$/, '');
  const wsBaseUrl = toWsBaseUrl(apiBaseUrl);

  const [priceData, setPriceData] = useState<PriceData>({
    goldPrice: 0,
    goldBid: 0,
    goldAsk: 0,
    goldSpread: 0,
    lastUpdate: null,
    isConnected: false,
    isLoading: true
  });

  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [shouldReconnect, setShouldReconnect] = useState(true);

  const connectWebSocket = useCallback(() => {
    if (!wsBaseUrl) {
      console.error('Missing or invalid VITE_BACKEND_API_BASE_URL for WebSocket');
      setPriceData(prev => ({ ...prev, isLoading: false, isConnected: false }));
      return;
    }

    console.log('Connecting to price WebSocket...');
    const ws = new WebSocket(`${wsBaseUrl}/api/pricing/ws/multi`);

    ws.onopen = () => {
      console.log('Price WebSocket connected');
      setPriceData(prev => ({ ...prev, isConnected: true, isLoading: false }));
      setReconnectAttempts(0);

      // Subscribe to gold prices
      ws.send(JSON.stringify({ action: 'subscribe', symbol: GOLD_WS_SYMBOL }));
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data as string);

        if (isTickPayload(parsed)) {
          const midPrice = (parsed.bid + parsed.ask) / 2;
          const spread = parsed.ask - parsed.bid;

          setPriceData(prev => ({
            ...prev,
            goldPrice: midPrice,
            goldBid: parsed.bid,
            goldAsk: parsed.ask,
            goldSpread: spread,
            lastUpdate: new Date(parsed.timestamp),
            isConnected: true,
            isLoading: false
          }));
        } else if (parsed.status === 'subscribed') {
          console.log(`Subscribed to ${parsed.symbol}`);
        } else if (parsed.error) {
          console.error('WebSocket error message:', parsed.error);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Price WebSocket error:', error);
      setPriceData(prev => ({ ...prev, isConnected: false }));
    };

    ws.onclose = () => {
      console.log('Price WebSocket closed');
      setPriceData(prev => ({ ...prev, isConnected: false }));

      // Attempt to reconnect with exponential backoff
      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts), 30000);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

        setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connectWebSocket();
        }, delay);
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
        setPriceData(prev => ({ ...prev, isLoading: false }));
      }
    };

    setWebsocket(ws);
  }, [wsBaseUrl, reconnectAttempts, shouldReconnect]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      setShouldReconnect(false);
      if (websocket?.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ action: 'unsubscribe', symbol: GOLD_WS_SYMBOL }));
        websocket.close();
      }
    };
  }, []);

  const reconnect = useCallback(() => {
    setReconnectAttempts(0);
    setShouldReconnect(true);
    if (websocket) {
      websocket.close();
    }
    connectWebSocket();
  }, [websocket, connectWebSocket]);

  const value: PriceContextValue = {
    ...priceData,
    reconnect
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
