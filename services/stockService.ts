
import { Stock, TimeRange } from "../types";

// Updated with roughly current market prices (approx 2024/2025 levels)
const INITIAL_STOCKS: Omit<Stock, 'history'>[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corp', price: 135.45, changePercent: 2.3, weeklyChangePercent: 5.4, twoWeekChangePercent: 8.1, oneMonthChangePercent: 12.5, threeMonthChangePercent: 25.4, sixMonthChangePercent: 45.2, oneYearChangePercent: 120.5, threeYearChangePercent: 300.2, fiveYearChangePercent: 500.1, tenYearChangePercent: 2000.5, change1m: 0.1, change15m: 0.5, change30m: 0.8, change1h: 1.2, change4h: 1.8, marketCap: 3300000000000, volume: 45000000, sector: 'Tech' },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 225.50, changePercent: -0.5, weeklyChangePercent: -1.2, twoWeekChangePercent: -0.8, oneMonthChangePercent: 3.4, threeMonthChangePercent: 8.2, sixMonthChangePercent: 15.1, oneYearChangePercent: 25.4, threeYearChangePercent: 45.2, fiveYearChangePercent: 80.5, tenYearChangePercent: 300.1, change1m: -0.05, change15m: -0.1, change30m: -0.2, change1h: -0.3, change4h: -0.4, marketCap: 3400000000000, volume: 52000000, sector: 'Tech' },
  { symbol: 'MSFT', name: 'Microsoft', price: 415.10, changePercent: 0.8, weeklyChangePercent: 2.1, twoWeekChangePercent: 3.5, oneMonthChangePercent: 5.6, threeMonthChangePercent: 12.4, sixMonthChangePercent: 20.3, oneYearChangePercent: 35.2, threeYearChangePercent: 60.1, fiveYearChangePercent: 110.5, tenYearChangePercent: 400.2, change1m: 0.05, change15m: 0.2, change30m: 0.4, change1h: 0.6, change4h: 0.7, marketCap: 3100000000000, volume: 22000000, sector: 'Tech' },
  // ... (simplified for brevity, applying random generation for others in createStock is more scalable but for initial list we can just map them or leave optional)
  { symbol: 'GOOGL', name: 'Alphabet', price: 165.20, changePercent: 1.1, weeklyChangePercent: 3.5, twoWeekChangePercent: 5.2, oneMonthChangePercent: 8.1, threeMonthChangePercent: 15.3, sixMonthChangePercent: 22.7, oneYearChangePercent: 42.1, threeYearChangePercent: 85.3, fiveYearChangePercent: 145.2, tenYearChangePercent: 520.8, change1m: 0.08, change15m: 0.3, change30m: 0.5, change1h: 0.9, change4h: 1.3, marketCap: 2000000000000, volume: 28000000, sector: 'Tech' },
  { symbol: 'AMZN', name: 'Amazon', price: 185.30, changePercent: -0.2, weeklyChangePercent: 0.5, twoWeekChangePercent: 1.8, oneMonthChangePercent: 4.2, threeMonthChangePercent: 9.5, sixMonthChangePercent: 18.3, oneYearChangePercent: 35.7, threeYearChangePercent: 72.4, fiveYearChangePercent: 125.6, tenYearChangePercent: 485.3, change1m: -0.02, change15m: 0.1, change30m: 0.2, change1h: 0.3, change4h: 0.5, marketCap: 1900000000000, volume: 31000000, sector: 'Retail' },
  { symbol: 'TSLA', name: 'Tesla', price: 235.40, changePercent: -2.5, weeklyChangePercent: -6.8, twoWeekChangePercent: -8.5, oneMonthChangePercent: -12.3, threeMonthChangePercent: -18.7, sixMonthChangePercent: -25.4, oneYearChangePercent: -15.2, threeYearChangePercent: 125.8, fiveYearChangePercent: 850.3, tenYearChangePercent: 2150.7, change1m: -0.15, change15m: -0.4, change30m: -0.7, change1h: -1.2, change4h: -2.1, marketCap: 750000000000, volume: 95000000, sector: 'Auto' },
  { symbol: 'META', name: 'Meta', price: 515.20, changePercent: 1.5, weeklyChangePercent: 4.2, twoWeekChangePercent: 6.8, oneMonthChangePercent: 11.5, threeMonthChangePercent: 22.3, sixMonthChangePercent: 38.7, oneYearChangePercent: 75.4, threeYearChangePercent: 145.2, fiveYearChangePercent: 285.6, tenYearChangePercent: 625.3, change1m: 0.12, change15m: 0.4, change30m: 0.7, change1h: 1.1, change4h: 1.6, marketCap: 1300000000000, volume: 18000000, sector: 'Tech' },
  { symbol: 'AMD', name: 'Adv Micro Dev', price: 155.10, changePercent: 3.1, weeklyChangePercent: 7.5, twoWeekChangePercent: 10.2, oneMonthChangePercent: 15.8, threeMonthChangePercent: 28.4, sixMonthChangePercent: 45.7, oneYearChangePercent: 85.3, threeYearChangePercent: 215.7, fiveYearChangePercent: 425.8, tenYearChangePercent: 1250.4, change1m: 0.18, change15m: 0.6, change30m: 1.0, change1h: 1.5, change4h: 2.3, marketCap: 250000000000, volume: 65000000, sector: 'Tech' },
  { symbol: 'NFLX', name: 'Netflix', price: 685.00, changePercent: -0.8, weeklyChangePercent: -2.1, twoWeekChangePercent: -3.5, oneMonthChangePercent: -5.2, threeMonthChangePercent: -8.7, sixMonthChangePercent: -12.4, oneYearChangePercent: 18.5, threeYearChangePercent: 45.7, fiveYearChangePercent: 125.3, tenYearChangePercent: 685.2, change1m: -0.05, change15m: -0.2, change30m: -0.3, change1h: -0.5, change4h: -0.8, marketCap: 290000000000, volume: 4000000, sector: 'Media' },
  { symbol: 'INTC', name: 'Intel', price: 22.50, changePercent: -1.5, weeklyChangePercent: -4.5, twoWeekChangePercent: -6.8, oneMonthChangePercent: -10.2, threeMonthChangePercent: -15.7, sixMonthChangePercent: -22.4, oneYearChangePercent: -35.8, threeYearChangePercent: -45.2, fiveYearChangePercent: -52.7, tenYearChangePercent: -38.5, change1m: -0.08, change15m: -0.3, change30m: -0.5, change1h: -0.8, change4h: -1.2, marketCap: 95000000000, volume: 35000000, sector: 'Tech' },
  { symbol: 'JPM', name: 'JPMorgan', price: 210.20, changePercent: 0.4, weeklyChangePercent: 1.2, twoWeekChangePercent: 2.1, oneMonthChangePercent: 3.8, threeMonthChangePercent: 7.5, sixMonthChangePercent: 12.3, oneYearChangePercent: 22.7, threeYearChangePercent: 45.8, fiveYearChangePercent: 85.2, tenYearChangePercent: 185.4, change1m: 0.03, change15m: 0.1, change30m: 0.2, change1h: 0.3, change4h: 0.5, marketCap: 600000000000, volume: 9000000, sector: 'Finance' },
  { symbol: 'V', name: 'Visa', price: 285.50, changePercent: 0.1, weeklyChangePercent: 0.3, twoWeekChangePercent: 0.8, oneMonthChangePercent: 2.1, threeMonthChangePercent: 5.4, sixMonthChangePercent: 10.2, oneYearChangePercent: 18.7, threeYearChangePercent: 42.5, fiveYearChangePercent: 95.3, tenYearChangePercent: 225.7, change1m: 0.01, change15m: 0.05, change30m: 0.1, change1h: 0.15, change4h: 0.2, marketCap: 550000000000, volume: 6000000, sector: 'Finance' },
  { symbol: 'WMT', name: 'Walmart', price: 75.20, changePercent: 0.2, weeklyChangePercent: 1.5, twoWeekChangePercent: 2.3, oneMonthChangePercent: 3.7, threeMonthChangePercent: 6.8, sixMonthChangePercent: 11.2, oneYearChangePercent: 18.5, threeYearChangePercent: 35.7, fiveYearChangePercent: 65.4, tenYearChangePercent: 145.8, change1m: 0.02, change15m: 0.08, change30m: 0.15, change1h: 0.25, change4h: 0.4, marketCap: 600000000000, volume: 12000000, sector: 'Retail' },
  { symbol: 'PG', name: 'Procter & Gamble', price: 168.30, changePercent: -0.1, weeklyChangePercent: -0.5, twoWeekChangePercent: -0.8, oneMonthChangePercent: -1.2, threeMonthChangePercent: -2.1, sixMonthChangePercent: -3.5, oneYearChangePercent: 5.2, threeYearChangePercent: 15.7, fiveYearChangePercent: 35.4, tenYearChangePercent: 85.2, change1m: -0.01, change15m: -0.03, change30m: -0.05, change1h: -0.08, change4h: -0.12, marketCap: 400000000000, volume: 5000000, sector: 'Consumer' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', price: 160.40, changePercent: -0.3, weeklyChangePercent: -1.1, twoWeekChangePercent: -1.8, oneMonthChangePercent: -2.7, threeMonthChangePercent: -4.5, sixMonthChangePercent: -6.8, oneYearChangePercent: 3.2, threeYearChangePercent: 12.5, fiveYearChangePercent: 28.7, tenYearChangePercent: 72.4, change1m: -0.02, change15m: -0.05, change30m: -0.08, change1h: -0.12, change4h: -0.18, marketCap: 380000000000, volume: 7000000, sector: 'Health' },
  { symbol: 'XOM', name: 'Exxon Mobil', price: 118.50, changePercent: 1.8, weeklyChangePercent: 3.2, twoWeekChangePercent: 4.8, oneMonthChangePercent: 7.5, threeMonthChangePercent: 12.3, sixMonthChangePercent: 18.7, oneYearChangePercent: 32.5, threeYearChangePercent: 65.8, fiveYearChangePercent: 95.4, tenYearChangePercent: 125.7, change1m: 0.12, change15m: 0.35, change30m: 0.6, change1h: 1.0, change4h: 1.5, marketCap: 500000000000, volume: 15000000, sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron', price: 155.10, changePercent: 1.2, weeklyChangePercent: 2.1, twoWeekChangePercent: 3.5, oneMonthChangePercent: 5.8, threeMonthChangePercent: 10.2, sixMonthChangePercent: 15.7, oneYearChangePercent: 28.4, threeYearChangePercent: 58.7, fiveYearChangePercent: 85.3, tenYearChangePercent: 115.8, change1m: 0.08, change15m: 0.25, change30m: 0.45, change1h: 0.75, change4h: 1.1, marketCap: 280000000000, volume: 8000000, sector: 'Energy' },
  { symbol: 'KO', name: 'Coca-Cola', price: 68.80, changePercent: 0.1, weeklyChangePercent: 0.2, twoWeekChangePercent: 0.5, oneMonthChangePercent: 1.2, threeMonthChangePercent: 2.8, sixMonthChangePercent: 5.4, oneYearChangePercent: 10.2, threeYearChangePercent: 22.5, fiveYearChangePercent: 42.7, tenYearChangePercent: 95.3, change1m: 0.01, change15m: 0.03, change30m: 0.05, change1h: 0.08, change4h: 0.12, marketCap: 290000000000, volume: 11000000, sector: 'Consumer' },
  { symbol: 'PEP', name: 'PepsiCo', price: 172.40, changePercent: -0.4, weeklyChangePercent: -0.8, twoWeekChangePercent: -1.2, oneMonthChangePercent: -1.8, threeMonthChangePercent: -3.2, sixMonthChangePercent: -5.7, oneYearChangePercent: 8.5, threeYearChangePercent: 20.3, fiveYearChangePercent: 38.7, tenYearChangePercent: 88.5, change1m: -0.03, change15m: -0.08, change30m: -0.12, change1h: -0.18, change4h: -0.25, marketCap: 230000000000, volume: 4500000, sector: 'Consumer' },
  { symbol: 'DIS', name: 'Disney', price: 95.30, changePercent: 0.9, weeklyChangePercent: 2.5, twoWeekChangePercent: 4.2, oneMonthChangePercent: 6.8, threeMonthChangePercent: 11.5, sixMonthChangePercent: 18.3, oneYearChangePercent: 28.7, threeYearChangePercent: 45.2, fiveYearChangePercent: 72.5, tenYearChangePercent: 185.4, change1m: 0.06, change15m: 0.18, change30m: 0.32, change1h: 0.55, change4h: 0.85, marketCap: 170000000000, volume: 20000000, sector: 'Media' },
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
    logoUrl: `https://financialmodelingprep.com/image-stock/${s.symbol}.png`,
    history: generateHistory(s.price)
  }));
};

export const createStock = (symbol: string): Stock => {
  const basePrice = Math.random() * 500 + 20;
  return {
    symbol: symbol.toUpperCase(),
    name: symbol.toUpperCase(), // Just use symbol as name until real data is fetched
    price: parseFloat(basePrice.toFixed(2)),
    changePercent: parseFloat(((Math.random() - 0.5) * 5).toFixed(2)),
    weeklyChangePercent: parseFloat(((Math.random() - 0.5) * 10).toFixed(2)),
    twoWeekChangePercent: parseFloat(((Math.random() - 0.5) * 15).toFixed(2)),
    oneMonthChangePercent: parseFloat(((Math.random() - 0.5) * 20).toFixed(2)),
    threeMonthChangePercent: parseFloat(((Math.random() - 0.5) * 30).toFixed(2)),
    sixMonthChangePercent: parseFloat(((Math.random() - 0.5) * 40).toFixed(2)),
    oneYearChangePercent: parseFloat(((Math.random() - 0.5) * 60).toFixed(2)),
    threeYearChangePercent: parseFloat(((Math.random() - 0.5) * 100).toFixed(2)),
    fiveYearChangePercent: parseFloat(((Math.random() - 0.5) * 200).toFixed(2)),
    tenYearChangePercent: parseFloat(((Math.random() - 0.5) * 400).toFixed(2)),
    change1m: parseFloat(((Math.random() - 0.5) * 0.2).toFixed(2)),
    change15m: parseFloat(((Math.random() - 0.5) * 0.5).toFixed(2)),
    change30m: parseFloat(((Math.random() - 0.5) * 0.8).toFixed(2)),
    change1h: parseFloat(((Math.random() - 0.5) * 1.5).toFixed(2)),
    change4h: parseFloat(((Math.random() - 0.5) * 2.5).toFixed(2)),
    marketCap: Math.floor(Math.random() * 2000000000000) + 1000000000,
    volume: Math.floor(Math.random() * 10000000),
    sector: 'Unknown',
    lastUpdated: Date.now(),
    logoUrl: `https://financialmodelingprep.com/image-stock/${symbol.toUpperCase()}.png`,
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

// Removed duplicate getBatchQuotes; real implementation is in fmpService.ts

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
