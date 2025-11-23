
export interface Stock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number; // Daily change
  weeklyChangePercent: number; // Weekly change (determines size)
  volume: number;
  sector: string;
  history: { time: string; price: number }[]; // Intraday history
}

export interface NewsItem {
  headline: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  url?: string;
}

export interface StockDetail {
  peRatio: number;
  marketCap: string;
  dividendYield: string;
  outlook: string;
  news: NewsItem[];
}

export interface Portfolio {
  id: string;
  name: string;
  symbols: string[];
}

export type TimeRange = '1D' | '1W' | '1M' | '1Y';
