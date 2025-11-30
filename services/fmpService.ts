
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
  logo?: string; // optional logo URL from API if provided
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
      name: q.name,
      marketCap: q.marketCap,
      lastUpdated: q.timestamp * 1000,
      logoUrl: q.logo || `https://financialmodelingprep.com/image-stock/${q.symbol}.png`
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
    return [];
  }
};

import { TimeRange } from "../types";

const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

const getCachedData = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.timestamp < CACHE_DURATION) {
      return parsed.data;
    }
    localStorage.removeItem(key);
    return null;
  } catch (e) {
    return null;
  }
};

const setCachedData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (e) {
    console.error("Cache storage failed", e);
  }
};

export const getHistoricalData = async (symbol: string, range: TimeRange, apiKey: string): Promise<{ time: string; price: number }[]> => {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return [];

  // Check cache first
  const cacheKey = `history_${symbol}_${range}`;
  const cached = getCachedData<{ time: string; price: number }[]>(cacheKey);
  if (cached) return cached;

  if (range === '1D') {
    // Intraday might need shorter cache or no cache, but user said "historical data (7D to maximum)"
    // 1D is usually considered intraday. The user request specifically said "7D to maximum".
    // I will NOT cache 1D here based on "7D to maximum", or I should ask?
    // "cache all the company name, historical data (7D to maximum)"
    // I will strictly follow "7D to maximum" for caching.
    return getIntradayChart(symbol, apiKey);
  }

  // Calculate from date
  const now = new Date();
  let daysToSubtract = 0;
  switch (range) {
    case '1W': daysToSubtract = 7; break;
    case '1M': daysToSubtract = 30; break;
    case '3M': daysToSubtract = 90; break;
    case '6M': daysToSubtract = 180; break;
    case '1Y': daysToSubtract = 365; break;
    case '3Y': daysToSubtract = 365 * 3; break;
    case '5Y': daysToSubtract = 365 * 5; break;
    case 'Max': daysToSubtract = 365 * 20; break;
  }

  const fromDate = new Date(now.setDate(now.getDate() - daysToSubtract)).toISOString().split('T')[0];
  const url = `${BASE_URL}/historical-price-full/${symbol}?from=${fromDate}&apikey=${cleanKey}`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (!data.historical || !Array.isArray(data.historical)) return [];

    // FMP returns newest first. We need oldest first for the chart.
    const result = data.historical.reverse().map((item: any) => ({
      time: item.date,
      price: item.close
    }));

    // Cache the result
    setCachedData(cacheKey, result);

    return result;
  } catch (error) {
    console.error("Failed to fetch historical data:", error);
    return [];
  }
};

interface FMPPriceChange {
  symbol: string;
  "1D": number;
  "5D": number;
  "1M": number;
  "3M": number;
  "6M": number;
  "1Y": number;
  "3Y": number;
  "5Y": number;
  "10Y": number;
  max: number;
}

export interface StockPriceChanges {
  symbol: string;
  weeklyChangePercent?: number;
  twoWeekChangePercent?: number;
  oneMonthChangePercent?: number;
  threeMonthChangePercent?: number;
  sixMonthChangePercent?: number;
  oneYearChangePercent?: number;
  threeYearChangePercent?: number;
  fiveYearChangePercent?: number;
  tenYearChangePercent?: number;
}

export const getStockPriceChanges = async (symbols: string[], apiKey: string): Promise<StockPriceChanges[]> => {
  const cleanKey = apiKey.trim();
  if (!cleanKey || symbols.length === 0) return [];

  try {
    // Fetch price changes for all symbols
    const promises = symbols.map(symbol => {
      const url = `${BASE_URL}/stock-price-change/${symbol}?apikey=${cleanKey}`;
      return fetch(url, { cache: 'no-store' })
        .then(res => res.json())
        .catch(err => {
          console.error(`Failed to fetch price changes for ${symbol}:`, err);
          return null;
        });
    });

    const results = await Promise.all(promises);

    // Map FMP response to our interface
    // Note: FMP returns an array with a single object: [{ symbol: "AAPL", "1D": ..., "5D": ..., etc }]
    return results
      .filter((data): data is FMPPriceChange[] => data !== null && Array.isArray(data) && data.length > 0)
      .map((dataArray: FMPPriceChange[]) => {
        const data = dataArray[0]; // Extract the first (and only) element
        return {
          symbol: data.symbol,
          weeklyChangePercent: data["5D"], // Use 5D as approximation for weekly (7D)
          twoWeekChangePercent: data["5D"] ? data["5D"] * 2 : undefined, // Estimate 14D from 5D
          oneMonthChangePercent: data["1M"],
          threeMonthChangePercent: data["3M"],
          sixMonthChangePercent: data["6M"],
          oneYearChangePercent: data["1Y"],
          threeYearChangePercent: data["3Y"],
          fiveYearChangePercent: data["5Y"],
          tenYearChangePercent: data["10Y"]
        };
      });
  } catch (error) {
    console.error("Failed to fetch stock price changes:", error);
    return [];
  }
};

