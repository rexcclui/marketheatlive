
import { Stock, NewsItem } from "../types";

const BASE_URL = "https://financialmodelingprep.com/api/v3";

interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

interface FMPHistoryItem {
  date: string;
  open: number;
  low: number;
  high: number;
  close: number;
  volume: number;
}

interface FMPNewsItem {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

export interface QuoteResult {
    data: Partial<Stock>[];
    error?: string;
    raw?: any; // For debugging
}

export const getBatchQuotes = async (symbols: string[], apiKey: string): Promise<QuoteResult> => {
  const cleanKey = apiKey.trim();
  if (!cleanKey || symbols.length === 0) return { data: [] };
  
  // FMP handles comma separated symbols
  const symbolString = symbols.join(',');
  const url = `${BASE_URL}/quote/${symbolString}?apikey=${cleanKey}`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    // Handle API Error Messages (e.g., "Invalid API KEY")
    if (data['Error Message']) {
        console.error("FMP API Error:", data['Error Message']);
        return { data: [], error: data['Error Message'], raw: data };
    }

    if (!Array.isArray(data)) {
        console.error("FMP API Unexpected Response:", data);
        return { data: [], error: "Invalid response format", raw: data };
    }

    const stocks = data.map((q: FMPQuote) => ({
      symbol: q.symbol,
      price: q.price,
      changePercent: q.changesPercentage,
      volume: q.volume,
      name: q.name
    }));
    
    return { data: stocks, raw: data.slice(0, 1) }; // Return first item for debug view

  } catch (error) {
    console.error("Failed to fetch quotes:", error);
    return { data: [], error: "Network request failed" };
  }
};

export const getIntradayChart = async (symbol: string, apiKey: string): Promise<{ time: string; price: number }[]> => {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return [];

  // Fetch 15 min interval data as requested
  const url = `${BASE_URL}/historical-chart/15min/${symbol}?apikey=${cleanKey}`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (!Array.isArray(data)) return [];

    // FMP returns newest first, reverse for chart. Take last 50 points ~ 1.5 market days
    const chartData = data.slice(0, 50).reverse().map((item: FMPHistoryItem) => ({
      time: item.date.split(' ')[1].substring(0, 5), // Extract HH:MM
      price: item.close
    }));

    return chartData;
  } catch (error) {
    console.error("Failed to fetch intraday history:", error);
    return [];
  }
};

export const getRealStockNews = async (symbol: string, apiKey: string): Promise<NewsItem[]> => {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return [];
  
  const url = `${BASE_URL}/stock_news?tickers=${symbol}&limit=5&apikey=${cleanKey}`;
  
  try {
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();
    
    if (!Array.isArray(data)) return [];

    return data.map((item: FMPNewsItem) => ({
      headline: item.title,
      source: item.site,
      // Simple heuristic for sentiment since FMP news doesn't always provide it directly in this endpoint
      sentiment: 'neutral',
      url: item.url
    }));
  } catch (error) {
    console.error("Failed to fetch news:", error);
    return [];
  }
};
