
import React, { useEffect, useState } from 'react';
import { Stock, StockDetail } from '../types';
import { X, TrendingUp, TrendingDown, DollarSign, Activity, Sparkles, Newspaper, Loader2, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchStockInsights } from '../services/geminiService';

interface DetailModalProps {
  stock: Stock | null;
  onClose: () => void;
  fmpApiKey?: string;
}

export const DetailModal: React.FC<DetailModalProps> = ({ stock, onClose, fmpApiKey }) => {
  const [details, setDetails] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stock) {
      setLoading(true);
      setDetails(null);
      fetchStockInsights(stock.symbol, stock.price, stock.changePercent, fmpApiKey)
        .then(data => {
            setDetails(data);
            setLoading(false);
        });
    }
  }, [stock, fmpApiKey]);

  if (!stock) return null;

  const isPositive = stock.changePercent >= 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-800/50">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {isPositive ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white">{stock.symbol}</h2>
                    <p className="text-slate-400 text-lg">{stock.name}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Chart & Stats */}
            <div className="lg:col-span-2 space-y-6">
                {/* Price Display */}
                <div className="flex items-end gap-4">
                    <span className="text-5xl font-mono font-bold text-white">${stock.price.toFixed(2)}</span>
                    <span className={`text-xl font-bold mb-2 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}{stock.changePercent}%
                    </span>
                </div>

                {/* Chart */}
                <div className="h-[300px] w-full bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stock.history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickMargin={10} minTickGap={30} />
                            <YAxis stroke="#94a3b8" domain={['auto', 'auto']} fontSize={12} width={40} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                itemStyle={{ color: '#f1f5f9' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="price" 
                                stroke={isPositive ? "#10b981" : "#f43f5e"} 
                                strokeWidth={3} 
                                dot={false} 
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Fundamentals Grid */}
                <div className="grid grid-cols-3 gap-4">
                     <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div className="text-slate-400 text-sm mb-1 flex items-center gap-1"><Activity size={14} /> Volatility (Wk)</div>
                        <div className="text-xl font-mono font-bold text-white">{Math.abs(stock.weeklyChangePercent)}%</div>
                     </div>
                     <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div className="text-slate-400 text-sm mb-1 flex items-center gap-1"><DollarSign size={14} /> Market Cap</div>
                        <div className="text-xl font-mono font-bold text-white">{details?.marketCap || '-'}</div>
                     </div>
                     <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div className="text-slate-400 text-sm mb-1">P/E Ratio</div>
                        <div className="text-xl font-mono font-bold text-white">{details?.peRatio || '-'}</div>
                     </div>
                </div>
            </div>

            {/* Right Column: AI Analysis */}
            <div className="space-y-6">
                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4 text-indigo-300 font-bold uppercase text-sm tracking-wide">
                        <Sparkles size={16} />
                        <span>{fmpApiKey ? 'Gemini Analysis (Real Data)' : 'Gemini Analysis'}</span>
                    </div>
                    
                    {loading ? (
                        <div className="flex flex-col items-center py-10 text-slate-400">
                            <Loader2 className="animate-spin mb-2" size={32} />
                            <span className="text-sm">Analyzing market data...</span>
                        </div>
                    ) : details ? (
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Outlook</h4>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    {details.outlook}
                                </p>
                            </div>
                            
                            <div className="border-t border-indigo-500/30 pt-4">
                                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                    <Newspaper size={14} /> {fmpApiKey ? 'Latest News' : 'Generated News'}
                                </h4>
                                <ul className="space-y-3">
                                    {details.news.map((n, i) => {
                                        const Wrapper = n.url ? 'a' : 'div';
                                        const props = n.url ? { href: n.url, target: "_blank", rel: "noopener noreferrer" } : {};
                                        
                                        return (
                                            <li key={i}>
                                                <Wrapper 
                                                    {...props}
                                                    className={`block text-sm group ${n.url ? 'cursor-pointer hover:bg-slate-800/50 -mx-2 px-2 py-1 rounded transition-colors' : ''}`}
                                                >
                                                    <div className="text-indigo-200 group-hover:text-white transition-colors font-medium mb-0.5 flex items-start gap-1">
                                                        {n.headline}
                                                        {n.url && <ExternalLink size={10} className="mt-1 opacity-50 shrink-0" />}
                                                    </div>
                                                    <div className="text-xs text-slate-500 flex justify-between items-center">
                                                        <span className="truncate max-w-[150px]">{n.source}</span>
                                                        <span className={n.sentiment === 'positive' ? 'text-emerald-500' : n.sentiment === 'negative' ? 'text-rose-500' : 'text-slate-500'}>
                                                            {n.sentiment}
                                                        </span>
                                                    </div>
                                                </Wrapper>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    ) : (
                         <div className="text-slate-400 text-sm">Unable to load analysis.</div>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
