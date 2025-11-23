import React, { useMemo } from 'react';
import { Stock } from '../types';
import { X, TrendingUp, TrendingDown, Percent, GitCompareArrows } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

interface ComparisonModalProps {
  stockA: Stock;
  stockB: Stock;
  onClose: () => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ stockA, stockB, onClose }) => {
  
  // Normalize data to percentage change from market open (first data point)
  const chartData = useMemo(() => {
    const baseA = stockA.history[0]?.price || 1;
    const baseB = stockB.history[0]?.price || 1;

    // Assuming history lengths are roughly synced by the simulator
    return stockA.history.map((h, i) => {
      const priceB = stockB.history[i]?.price || baseB;
      return {
        time: h.time,
        [stockA.symbol]: ((h.price - baseA) / baseA) * 100,
        [stockB.symbol]: ((priceB - baseB) / baseB) * 100,
        rawPriceA: h.price,
        rawPriceB: priceB,
      };
    });
  }, [stockA, stockB]);

  const colorA = "#6366f1"; // Indigo
  const colorB = "#eab308"; // Yellow

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
            <div className="flex items-center gap-3">
                <div className="bg-slate-700 p-2 rounded-lg">
                    <GitCompareArrows className="text-white" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {stockA.symbol} <span className="text-slate-500 text-lg">vs</span> {stockB.symbol}
                    </h2>
                    <p className="text-slate-400 text-sm">Intraday Performance Comparison</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
            {/* Stats Comparison */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Stock A Card */}
                <div className="bg-slate-800/50 rounded-xl p-4 border-l-4 border-indigo-500">
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-xl text-indigo-400">{stockA.symbol}</span>
                        <span className={`text-sm font-bold ${stockA.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stockA.changePercent > 0 ? '+' : ''}{stockA.changePercent}%
                        </span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400">
                        <span>Price: ${stockA.price.toFixed(2)}</span>
                        <span>Vol: {(stockA.volume / 1000000).toFixed(1)}M</span>
                    </div>
                </div>

                {/* Stock B Card */}
                <div className="bg-slate-800/50 rounded-xl p-4 border-l-4 border-yellow-500">
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-xl text-yellow-500">{stockB.symbol}</span>
                        <span className={`text-sm font-bold ${stockB.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stockB.changePercent > 0 ? '+' : ''}{stockB.changePercent}%
                        </span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400">
                        <span>Price: ${stockB.price.toFixed(2)}</span>
                        <span>Vol: {(stockB.volume / 1000000).toFixed(1)}M</span>
                    </div>
                </div>
            </div>

            {/* Comparison Chart */}
            <div className="h-[400px] w-full bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-4 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    <Percent size={14} />
                    <span>Relative Performance (%)</span>
                </div>
                <ResponsiveContainer width="100%" height="90%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colorA} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={colorA} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colorB} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={colorB} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} minTickGap={40} />
                        <YAxis stroke="#94a3b8" fontSize={12} unit="%" />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                            itemStyle={{ color: '#f1f5f9' }}
                            formatter={(value: number, name: string) => [
                                `${value.toFixed(2)}%`, 
                                name
                            ]}
                            labelStyle={{ color: '#94a3b8' }}
                        />
                        <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }}/>
                        
                        <Area 
                            type="monotone" 
                            dataKey={stockA.symbol} 
                            stroke={colorA} 
                            fill="url(#gradA)" 
                            strokeWidth={2}
                            name={`${stockA.symbol} Returns`}
                        />
                        <Area 
                            type="monotone" 
                            dataKey={stockB.symbol} 
                            stroke={colorB} 
                            fill="url(#gradB)" 
                            strokeWidth={2} 
                            name={`${stockB.symbol} Returns`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};