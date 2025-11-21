export interface GoldPrice {
  current: number;
  change: number;
  changePercent: number;
  support: number;
  resistance: number;
  volatility: number;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
}

export interface Portfolio {
  totalValue: number;
  profitToday: number;
  profitTodayPercent: number;
  holdings: {
    gold: {
      amount: number;
      avgBuy: number;
      current: number;
    };
    etf: {
      amount: number;
      avgBuy: number;
      current: number;
    };
    cash: number;
  };
}

export interface TradeIdea {
  action: 'Buy' | 'Sell';
  entry: number;
  target: number;
  stop: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}