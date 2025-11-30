
import React, { useEffect, useState } from 'react';
import { Stock, StockDetail, TimeRange } from '../types';
import { X, TrendingUp, TrendingDown, DollarSign, Activity, Sparkles, Newspaper, Loader2, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchStockInsights } from '../services/geminiService';
import { getHistoricalData } from '../services/fmpService';
import { generateHistoricalData } from '../services/stockService';

interface DetailModalProps {
    stock: Stock | null;
    onClose: () => void;
    fmpApiKey?: string;
    onUpdateShares?: (symbol: string, shares: number | undefined) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ stock, onClose, fmpApiKey, onUpdateShares }) => {
    const [details, setDetails] = useState<StockDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>('1D');
    const [chartData, setChartData] = useState<{ time: string, price: number }[]>([]);
    const [chartLoading, setChartLoading] = useState(false);

    // Share Editing State
    const [isEditingShares, setIsEditingShares] = useState(false);
    const [sharesInput, setSharesInput] = useState('');

    useEffect(() => {
        if (stock) {
            setLoading(true);
            setDetails(null);
            fetchStockInsights(stock.symbol, stock.price, stock.changePercent, fmpApiKey)
                .then(data => {
                    setDetails(data);
                    setLoading(false);
                });

            // Reset to 1D on open
            setTimeRange('1D');
            setChartData(stock.history || []);

            // Initialize shares input only when stock symbol changes
            setSharesInput(stock.shares?.toString() || '');
            setIsEditingShares(false);
        }
    }, [stock?.symbol, fmpApiKey]); // Only depend on symbol, not the entire stock object

    // Update shares input when stock.shares changes (but not while editing)
    useEffect(() => {
        if (stock && !isEditingShares) {
            setSharesInput(stock.shares?.toString() || '');
        }
    }, [stock?.shares, isEditingShares]);

    const handleSaveShares = () => {
        if (!stock || !onUpdateShares) return;
        const shares = parseFloat(sharesInput);
        if (!isNaN(shares) && shares > 0) {
            onUpdateShares(stock.symbol, shares);
        } else {
            onUpdateShares(stock.symbol, undefined);
        }
        setIsEditingShares(false);
    };

    // Fetch chart data when range changes
    useEffect(() => {
        if (!stock) return;

        const fetchChart = async () => {
            if (timeRange === '1D') {
                setChartData(stock.history || []);
                return;
            }

            setChartLoading(true);
            let data;
            if (fmpApiKey) {
                data = await getHistoricalData(stock.symbol, timeRange, fmpApiKey);
            } else {
                data = generateHistoricalData(stock.price, timeRange);
            }
            setChartData(data);
            setChartLoading(false);
        };

        fetchChart();
    }, [timeRange, stock, fmpApiKey]);

    if (!stock) return null;

    const isPositive = stock.changePercent >= 0;
    const ranges: TimeRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'Max'];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {isPositive ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                        </div>
                        <div className="flex items-start gap-4 flex-1">
                            <h2 className="text-3xl font-bold text-white">{stock.name || stock.symbol}</h2>
                            <p className="text-slate-400 text-lg">{stock.symbol}</p>

                            {/* Position / Share Editing */}
                            <div className="mt-2 flex items-center gap-2">
                                {isEditingShares ? (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                        <input
                                            type="number"
                                            value={sharesInput}
                                            onChange={(e) => setSharesInput(e.target.value)}
                                            className="bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-white w-24 focus:outline-none focus:border-indigo-500"
                                            placeholder="Shares"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveShares();
                                                if (e.key === 'Escape') setIsEditingShares(false);
                                            }}
                                        />
                                        <button
                                            onClick={handleSaveShares}
                                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-medium transition-colors"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setIsEditingShares(false)}
                                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className="flex items-center gap-2 group cursor-pointer"
                                        onClick={() => setIsEditingShares(true)}
                                        title="Click to edit shares"
                                    >
                                        <div className="bg-slate-700/50 px-2 py-1 rounded border border-slate-700 group-hover:border-slate-600 transition-colors flex items-center gap-2">
                                            <span className="text-xs text-slate-400 font-medium">Position:</span>
                                            {stock.shares && stock.shares > 0 ? (
                                                <span className="text-sm font-mono font-bold text-emerald-400">
                                                    ${(stock.positionValue || stock.price * stock.shares).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    <span className="text-slate-500 ml-1 text-xs">({stock.shares} shares)</span>
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">No position</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
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


                        {/* Chart Controls */}
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 w-fit">
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

                        {/* Chart */}
                        <div className="h-[300px] w-full bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 relative">
                            {chartLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10 backdrop-blur-sm rounded-xl">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                </div>
                            )}
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis
                                        dataKey="time"
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickMargin={10}
                                        minTickGap={30}
                                        tickFormatter={(val) => {
                                            if (timeRange !== '1D' && val.includes('-')) {
                                                const date = new Date(val);
                                                return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: timeRange === 'Max' || timeRange === '5Y' ? '2-digit' : undefined });
                                            }
                                            return val;
                                        }}
                                    />
                                    <YAxis stroke="#94a3b8" domain={['auto', 'auto']} fontSize={12} width={40} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                        itemStyle={{ color: '#f1f5f9' }}
                                        labelFormatter={(label) => {
                                            if (timeRange !== '1D' && label.includes('-')) {
                                                return new Date(label).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                                            }
                                            return label;
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="price"
                                        stroke={isPositive ? "#10b981" : "#f43f5e"}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 6 }}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Historical Performance Metrics */}
                        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Historical Performance</h3>
                            <div className="grid grid-cols-5 md:grid-cols-9 gap-3">
                                {[
                                    { label: '7D', val: stock.weeklyChangePercent },
                                    { label: '14D', val: stock.twoWeekChangePercent },
                                    { label: '1M', val: stock.oneMonthChangePercent },
                                    { label: '3M', val: stock.threeMonthChangePercent },
                                    { label: '6M', val: stock.sixMonthChangePercent },
                                    { label: '1Y', val: stock.oneYearChangePercent },
                                    { label: '3Y', val: stock.threeYearChangePercent },
                                    { label: '5Y', val: stock.fiveYearChangePercent },
                                    { label: '10Y', val: stock.tenYearChangePercent },
                                ].map((m, i) => {
                                    if (m.val === undefined) return null;
                                    const isPos = m.val >= 0;
                                    return (
                                        <div key={i} className="flex flex-col items-center bg-slate-900/50 rounded-lg p-2">
                                            <span className="text-xs text-slate-500 uppercase font-medium">{m.label}</span>
                                            <span className={`text-sm font-bold mt-1 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {isPos ? '+' : ''}{m.val.toFixed(1)}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
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
