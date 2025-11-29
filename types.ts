
export interface Stock {
  symbol: string;
  name: string;
  price: number;
  // Historical Changes
  changePercent: number; // Daily change (1D)
  weeklyChangePercent: number; // 7D
  twoWeekChangePercent?: number; // 14D
  oneMonthChangePercent?: number; // 1M
  threeMonthChangePercent?: number; // 3M
  sixMonthChangePercent?: number; // 6M
  oneYearChangePercent?: number; // 1Y
  threeYearChangePercent?: number; // 3Y
  fiveYearChangePercent?: number; // 5Y
  tenYearChangePercent?: number; // 10Y

  // Intraday Changes
  change1m?: number;
  change15m?: number;
  change30m?: number;
  change1h?: number;
  change4h?: number;

  lastUpdated?: number;
  marketCap?: number;
  volume: number;
  sector: string;
  history: { time: string; price: number }[]; // Intraday history
  logoUrl?: string; // Optional logo image URL
  addedAt?: number; // Timestamp when stock was added (for blinking animation)
  shares?: number; // Number of shares owned
  positionValue?: number; // Calculated position value (price * shares, adjusted for currency)
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

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'Max';
