import React, { useMemo, useState, useEffect } from 'react';
import { Stock, TimeRange } from '../types';
import { getHistoricalData } from '../services/fmpService';
import { generateHistoricalData } from '../services/stockService';
import { X, TrendingUp, TrendingDown, Percent, GitCompareArrows, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

interface ComparisonModalProps {
    stockA: Stock;
    stockB: Stock;
    onClose: () => void;
    fmpApiKey?: string;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ stockA, stockB, onClose, fmpApiKey }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('1D');
    const [fetchedData, setFetchedData] = useState<{ a: { time: string, price: number }[], b: { time: string, price: number }[] } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (timeRange === '1D') {
            setFetchedData(null);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            let dataA, dataB;

            if (fmpApiKey) {
                // Real Data
                [dataA, dataB] = await Promise.all([
                    getHistoricalData(stockA.symbol, timeRange, fmpApiKey),
                    getHistoricalData(stockB.symbol, timeRange, fmpApiKey)
                ]);
            } else {
                // Mock Data
                dataA = generateHistoricalData(stockA.price, timeRange);
                dataB = generateHistoricalData(stockB.price, timeRange);
            }

            setFetchedData({ a: dataA, b: dataB });
            setLoading(false);
        };

        fetchData();
    }, [timeRange, stockA.symbol, stockB.symbol, fmpApiKey]); // Depend on symbols, not full stock objects to avoid refetching on tick

    // Normalize data to percentage change from market open (first data point)
    const chartData = useMemo(() => {
        const historyA = fetchedData ? fetchedData.a : stockA.history;
        const historyB = fetchedData ? fetchedData.b : stockB.history;

        if (!historyA.length || !historyB.length) return [];

        const baseA = historyA[0]?.price || 1;
        const baseB = historyB[0]?.price || 1;

        // Map based on the longer history or intersection? 
        // Usually dates match for historical. For intraday they might differ slightly in simulation but we map by index or time.
        // For simplicity, we map over historyA and try to find matching time in historyB, or just index if lengths match.
        // Given simulation/FMP data usually aligns well enough for this view:

        return historyA.map((h, i) => {
            // Try to find by time if possible, else index
            const matchB = historyB.find(hb => hb.time === h.time) || historyB[i];
            const priceB = matchB?.price || baseB;

            return {
                time: h.time,
                [stockA.symbol]: ((h.price - baseA) / baseA) * 100,
                [stockB.symbol]: ((priceB - baseB) / baseB) * 100,
                rawPriceA: h.price,
                rawPriceB: priceB,
            };
        });
    }, [stockA, stockB, fetchedData]);

    const colorA = "#6366f1"; // Indigo
    const colorB = "#eab308"; // Yellow

    const ranges: TimeRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y'];

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
                            <p className="text-slate-400 text-sm">Performance Comparison</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Time Range Selector */}
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                            {ranges.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setTimeRange(r)}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${timeRange === r ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>

                        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
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
                    <div className="h-[400px] w-full bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 relative">
                        <div className="flex items-center gap-2 mb-4 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                            <Percent size={14} />
                            <span>Relative Performance (%) - {timeRange}</span>
                        </div>

                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10 backdrop-blur-sm rounded-xl">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            </div>
                        )}

                        <ResponsiveContainer width="100%" height="90%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colorA} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={colorA} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colorB} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={colorB} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    minTickGap={40}
                                    tickFormatter={(val) => {
                                        // Format date for longer ranges
                                        if (timeRange !== '1D' && val.includes('-')) {
                                            const date = new Date(val);
                                            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                        }
                                        return val;
                                    }}
                                />
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
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />

                                <Area
                                    type="monotone"
                                    dataKey={stockA.symbol}
                                    stroke={colorA}
                                    fill="url(#gradA)"
                                    strokeWidth={2}
                                    name={`${stockA.symbol} Returns`}
                                    isAnimationActive={false}
                                />
                                <Area
                                    type="monotone"
                                    dataKey={stockB.symbol}
                                    stroke={colorB}
                                    fill="url(#gradB)"
                                    strokeWidth={2}
                                    name={`${stockB.symbol} Returns`}
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};