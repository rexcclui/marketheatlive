
import { Stock } from "../types";

// Updated with roughly current market prices (approx 2024/2025 levels)
const INITIAL_STOCKS: Omit<Stock, 'history'>[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corp', price: 135.45, changePercent: 2.3, weeklyChangePercent: 5.4, volume: 45000000, sector: 'Tech' },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 225.50, changePercent: -0.5, weeklyChangePercent: -1.2, volume: 52000000, sector: 'Tech' },
  { symbol: 'MSFT', name: 'Microsoft', price: 415.10, changePercent: 0.8, weeklyChangePercent: 2.1, volume: 22000000, sector: 'Tech' },
  { symbol: 'GOOGL', name: 'Alphabet', price: 165.20, changePercent: 1.1, weeklyChangePercent: 3.5, volume: 28000000, sector: 'Tech' },
  { symbol: 'AMZN', name: 'Amazon', price: 185.30, changePercent: -0.2, weeklyChangePercent: 0.5, volume: 31000000, sector: 'Retail' },
  { symbol: 'TSLA', name: 'Tesla', price: 235.40, changePercent: -2.5, weeklyChangePercent: -6.8, volume: 95000000, sector: 'Auto' },
  { symbol: 'META', name: 'Meta', price: 515.20, changePercent: 1.5, weeklyChangePercent: 4.2, volume: 18000000, sector: 'Tech' },
  { symbol: 'AMD', name: 'Adv Micro Dev', price: 155.10, changePercent: 3.1, weeklyChangePercent: 7.5, volume: 65000000, sector: 'Tech' },
  { symbol: 'NFLX', name: 'Netflix', price: 685.00, changePercent: -0.8, weeklyChangePercent: -2.1, volume: 4000000, sector: 'Media' },
  { symbol: 'INTC', name: 'Intel', price: 22.50, changePercent: -1.5, weeklyChangePercent: -4.5, volume: 35000000, sector: 'Tech' },
  { symbol: 'JPM', name: 'JPMorgan', price: 210.20, changePercent: 0.4, weeklyChangePercent: 1.2, volume: 9000000, sector: 'Finance' },
  { symbol: 'V', name: 'Visa', price: 285.50, changePercent: 0.1, weeklyChangePercent: 0.3, volume: 6000000, sector: 'Finance' },
  { symbol: 'WMT', name: 'Walmart', price: 75.20, changePercent: 0.2, weeklyChangePercent: 1.5, volume: 12000000, sector: 'Retail' },
  { symbol: 'PG', name: 'Procter & Gamble', price: 168.30, changePercent: -0.1, weeklyChangePercent: -0.5, volume: 5000000, sector: 'Consumer' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', price: 160.40, changePercent: -0.3, weeklyChangePercent: -1.1, volume: 7000000, sector: 'Health' },
  { symbol: 'XOM', name: 'Exxon Mobil', price: 118.50, changePercent: 1.8, weeklyChangePercent: 3.2, volume: 15000000, sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron', price: 155.10, changePercent: 1.2, weeklyChangePercent: 2.1, volume: 8000000, sector: 'Energy' },
  { symbol: 'KO', name: 'Coca-Cola', price: 68.80, changePercent: 0.1, weeklyChangePercent: 0.2, volume: 11000000, sector: 'Consumer' },
  { symbol: 'PEP', name: 'PepsiCo', price: 172.40, changePercent: -0.4, weeklyChangePercent: -0.8, volume: 4500000, sector: 'Consumer' },
  { symbol: 'DIS', name: 'Disney', price: 95.30, changePercent: 0.9, weeklyChangePercent: 2.5, volume: 20000000, sector: 'Media' },
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
    volume: Math.floor(Math.random() * 10000000),
    sector: 'Unknown',
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
      history: newHistory
    };
  });
};
