
import { Stock } from "../types";

// Updated with roughly current market prices (approx 2024/2025 levels)
const INITIAL_STOCKS: Omit<Stock, 'history'>[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corp', price: 135.45, changePercent: 2.3, weeklyChangePercent: 5.4, oneMonthChangePercent: 12.5, sixMonthChangePercent: 45.2, marketCap: 3300000000000, volume: 45000000, sector: 'Tech' },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 225.50, changePercent: -0.5, weeklyChangePercent: -1.2, oneMonthChangePercent: 3.4, sixMonthChangePercent: 15.1, marketCap: 3400000000000, volume: 52000000, sector: 'Tech' },
  { symbol: 'MSFT', name: 'Microsoft', price: 415.10, changePercent: 0.8, weeklyChangePercent: 2.1, oneMonthChangePercent: 5.6, sixMonthChangePercent: 20.3, marketCap: 3100000000000, volume: 22000000, sector: 'Tech' },
  { symbol: 'GOOGL', name: 'Alphabet', price: 165.20, changePercent: 1.1, weeklyChangePercent: 3.5, oneMonthChangePercent: 8.2, sixMonthChangePercent: 25.4, marketCap: 2000000000000, volume: 28000000, sector: 'Tech' },
  { symbol: 'AMZN', name: 'Amazon', price: 185.30, changePercent: -0.2, weeklyChangePercent: 0.5, oneMonthChangePercent: 2.1, sixMonthChangePercent: 18.5, marketCap: 1900000000000, volume: 31000000, sector: 'Retail' },
  { symbol: 'TSLA', name: 'Tesla', price: 235.40, changePercent: -2.5, weeklyChangePercent: -6.8, oneMonthChangePercent: -15.2, sixMonthChangePercent: -5.4, marketCap: 750000000000, volume: 95000000, sector: 'Auto' },
  { symbol: 'META', name: 'Meta', price: 515.20, changePercent: 1.5, weeklyChangePercent: 4.2, oneMonthChangePercent: 10.5, sixMonthChangePercent: 35.6, marketCap: 1300000000000, volume: 18000000, sector: 'Tech' },
  { symbol: 'AMD', name: 'Adv Micro Dev', price: 155.10, changePercent: 3.1, weeklyChangePercent: 7.5, oneMonthChangePercent: 15.3, sixMonthChangePercent: 40.2, marketCap: 250000000000, volume: 65000000, sector: 'Tech' },
  { symbol: 'NFLX', name: 'Netflix', price: 685.00, changePercent: -0.8, weeklyChangePercent: -2.1, oneMonthChangePercent: 5.4, sixMonthChangePercent: 28.1, marketCap: 290000000000, volume: 4000000, sector: 'Media' },
  { symbol: 'INTC', name: 'Intel', price: 22.50, changePercent: -1.5, weeklyChangePercent: -4.5, oneMonthChangePercent: -12.3, sixMonthChangePercent: -35.6, marketCap: 95000000000, volume: 35000000, sector: 'Tech' },
  { symbol: 'JPM', name: 'JPMorgan', price: 210.20, changePercent: 0.4, weeklyChangePercent: 1.2, oneMonthChangePercent: 4.5, sixMonthChangePercent: 12.3, marketCap: 600000000000, volume: 9000000, sector: 'Finance' },
  { symbol: 'V', name: 'Visa', price: 285.50, changePercent: 0.1, weeklyChangePercent: 0.3, oneMonthChangePercent: 1.2, sixMonthChangePercent: 8.5, marketCap: 550000000000, volume: 6000000, sector: 'Finance' },
  { symbol: 'WMT', name: 'Walmart', price: 75.20, changePercent: 0.2, weeklyChangePercent: 1.5, oneMonthChangePercent: 3.2, sixMonthChangePercent: 10.5, marketCap: 600000000000, volume: 12000000, sector: 'Retail' },
  { symbol: 'PG', name: 'Procter & Gamble', price: 168.30, changePercent: -0.1, weeklyChangePercent: -0.5, oneMonthChangePercent: 1.1, sixMonthChangePercent: 5.4, marketCap: 400000000000, volume: 5000000, sector: 'Consumer' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', price: 160.40, changePercent: -0.3, weeklyChangePercent: -1.1, oneMonthChangePercent: -2.3, sixMonthChangePercent: 1.2, marketCap: 380000000000, volume: 7000000, sector: 'Health' },
  { symbol: 'XOM', name: 'Exxon Mobil', price: 118.50, changePercent: 1.8, weeklyChangePercent: 3.2, oneMonthChangePercent: 5.4, sixMonthChangePercent: 15.6, marketCap: 500000000000, volume: 15000000, sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron', price: 155.10, changePercent: 1.2, weeklyChangePercent: 2.1, oneMonthChangePercent: 3.2, sixMonthChangePercent: 8.5, marketCap: 280000000000, volume: 8000000, sector: 'Energy' },
  { symbol: 'KO', name: 'Coca-Cola', price: 68.80, changePercent: 0.1, weeklyChangePercent: 0.2, oneMonthChangePercent: 1.5, sixMonthChangePercent: 6.2, marketCap: 290000000000, volume: 11000000, sector: 'Consumer' },
  { symbol: 'PEP', name: 'PepsiCo', price: 172.40, changePercent: -0.4, weeklyChangePercent: -0.8, oneMonthChangePercent: -1.2, sixMonthChangePercent: 4.5, marketCap: 230000000000, volume: 4500000, sector: 'Consumer' },
  { symbol: 'DIS', name: 'Disney', price: 95.30, changePercent: 0.9, weeklyChangePercent: 2.5, oneMonthChangePercent: 5.4, sixMonthChangePercent: -5.2, marketCap: 170000000000, volume: 20000000, sector: 'Media' },
];

const generateHistory = (basePrice: number) => {
  const points = [];
  let price = basePrice;
  const now = new Date();
  const start = new Date(now);
  start.setHours(9, 30, 0, 0); // Market open

  for (let i = 0; i <= 50; i++) {
    price = price * (1 + (Math.random() - 0.5) * 0.005);
    const time = new Date(start.getTime() + i * 6 * 60000); // 6 min intervals
    points.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: parseFloat(price.toFixed(2))
    });
  }
  return points;
};

export const getInitialStocks = (): Stock[] => {
  return INITIAL_STOCKS.map(s => ({
    ...s,
    history: generateHistory(s.price)
  }));
};

export const createStock = (symbol: string): Stock => {
  const basePrice = Math.random() * 500 + 20;
  return {
    symbol: symbol.toUpperCase(),
    name: `${symbol.toUpperCase()} Inc.`,
    price: parseFloat(basePrice.toFixed(2)),
    changePercent: parseFloat(((Math.random() - 0.5) * 5).toFixed(2)),
    weeklyChangePercent: parseFloat(((Math.random() - 0.5) * 10).toFixed(2)),
    oneMonthChangePercent: parseFloat(((Math.random() - 0.5) * 20).toFixed(2)),
    sixMonthChangePercent: parseFloat(((Math.random() - 0.5) * 40).toFixed(2)),
    marketCap: Math.floor(Math.random() * 2000000000000) + 1000000000, // 1B to 2T
    volume: Math.floor(Math.random() * 10000000),
    sector: 'Unknown',
    lastUpdated: Date.now(),
    history: generateHistory(basePrice)
  };
};

export const simulateTick = (stocks: Stock[]): Stock[] => {
  return stocks.map(stock => {
    const volatility = 0.002; // 0.2% volatility per tick
    const change = (Math.random() - 0.5) * volatility;
    const newPrice = stock.price * (1 + change);
    const newChangePercent = stock.changePercent + (change * 100);

    // Update history
    const newHistory = [...stock.history];
    // Simple shift for simulation
    if (Math.random() > 0.7) {
      const lastTime = new Date();
      newHistory.push({
        time: lastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: parseFloat(newPrice.toFixed(2))
      });
      if (newHistory.length > 50) newHistory.shift();
    }

    return {
      ...stock,
      price: parseFloat(newPrice.toFixed(2)),
      changePercent: parseFloat(newChangePercent.toFixed(2)),
      lastUpdated: Date.now(),
      history: newHistory
    };
  });
};

import { TimeRange } from "../types";

export const generateHistoricalData = (basePrice: number, range: TimeRange): { time: string; price: number }[] => {
  if (range === '1D') {
    return generateHistory(basePrice);
  }

  const points = [];
  let price = basePrice;
  const now = new Date();
  let days = 0;

  switch (range) {
    case '1W': days = 7; break;
    case '1M': days = 30; break;
    case '3M': days = 90; break;
    case '6M': days = 180; break;
    case '1Y': days = 365; break;
    case '3Y': days = 365 * 3; break;
    case '5Y': days = 365 * 5; break;
    case 'Max': days = 365 * 10; break;
  }

  const start = new Date(now);
  start.setDate(now.getDate() - days);

  for (let i = 0; i <= days; i++) {
    // Skip weekends roughly
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    if (day.getDay() === 0 || day.getDay() === 6) continue;

    price = price * (1 + (Math.random() - 0.5) * 0.03); // 3% daily volatility
    points.push({
      time: day.toISOString().split('T')[0],
      price: parseFloat(price.toFixed(2))
    });
  }

  return points;
};
