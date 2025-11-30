import React, { useState, useMemo } from 'react';
import { Stock } from '../types';
import { X } from 'lucide-react';

interface PLModalProps {
    stocks: Stock[]; // stocks to display (e.g., visibleStocks)
    colorMetric: string; // selected color period metric key
    onClose: () => void;
}

export const PLModal: React.FC<PLModalProps> = ({ stocks, colorMetric, onClose }) => {
    // Compute PL for each stock based on selected color metric
    const computePL = (stock: Stock) => {
        const change = (stock as any)[colorMetric] ?? stock.changePercent ?? 0;
        const pl = (stock.positionValue ?? 0) * (change / 100);
        return pl;
    };

    const [sortKey, setSortKey] = useState<'pl' | 'daily'>('pl');
    const [ascending, setAscending] = useState(false); // default descending by absolute PL

    const sortedStocks = useMemo(() => {
        const sorted = [...stocks];
        sorted.sort((a, b) => {
            if (sortKey === 'pl') {
                const aVal = Math.abs(computePL(a));
                const bVal = Math.abs(computePL(b));
                return ascending ? aVal - bVal : bVal - aVal;
            } else {
                const aVal = Math.abs(a.changePercent ?? 0);
                const bVal = Math.abs(b.changePercent ?? 0);
                return ascending ? aVal - bVal : bVal - aVal;
            }
        });
        return sorted;
    }, [stocks, sortKey, ascending, colorMetric]);

    const toggleSort = (key: 'pl' | 'daily') => {
        if (sortKey === key) {
            setAscending(!ascending);
        } else {
            setSortKey(key);
            setAscending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-slate-900 text-slate-200 rounded-lg w-11/12 max-w-4xl max-h-[80vh] overflow-auto shadow-2xl">
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold">Profit / Loss Overview</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
                        <X size={20} />
                    </button>
                </div>
                <table className="w-full table-auto">
                    <thead className="bg-slate-800">
                        <tr>
                            <th className="p-2 cursor-pointer" onClick={() => toggleSort('pl')}>Stock Code</th>
                            <th className="p-2">Position</th>
                            <th className="p-2 cursor-pointer" onClick={() => toggleSort('pl')}>PL ({colorMetric})</th>
                            <th className="p-2 cursor-pointer" onClick={() => toggleSort('daily')}>Daily Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedStocks.map((stock) => {
                            const pl = computePL(stock);
                            const daily = stock.changePercent ?? 0;
                            const isPositive = pl >= 0;
                            return (
                                <tr key={stock.symbol} className="border-b border-slate-700">
                                    <td className="p-2 text-center font-mono">{stock.symbol}</td>
                                    <td className="p-2 text-center">
                                        {(stock.positionValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className={`p-2 text-center ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {isPositive ? '+' : ''}${Math.abs(pl).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </td>
                                    <td className={`p-2 text-center ${daily >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                        {daily >= 0 ? '+' : ''}{daily.toFixed(2)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
