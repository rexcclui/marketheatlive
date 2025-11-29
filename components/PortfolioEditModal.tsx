import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Trash2, Share, Check } from 'lucide-react';
import { Portfolio } from '../types';

interface PortfolioEditModalProps {
    portfolio: Portfolio;
    currentShares: Record<string, number>;
    onClose: () => void;
    onSave: (updatedPortfolio: Portfolio, updatedShares: Record<string, number>) => void;
}

export const PortfolioEditModal: React.FC<PortfolioEditModalProps> = ({ portfolio, currentShares, onClose, onSave }) => {
    const [name, setName] = useState(portfolio.name);
    const [symbols, setSymbols] = useState<string[]>(portfolio.symbols);
    const [shares, setShares] = useState<Record<string, number>>({});
    const [newSymbol, setNewSymbol] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setName(portfolio.name);
        setSymbols([...portfolio.symbols].sort());
        // Initialize shares from currentShares, filtering only for symbols in this portfolio
        const initialShares: Record<string, number> = {};
        portfolio.symbols.forEach(sym => {
            if (currentShares[sym]) {
                initialShares[sym] = currentShares[sym];
            }
        });
        setShares(initialShares);
    }, [portfolio, currentShares]);

    const handleAddSymbol = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (newSymbol && !symbols.includes(newSymbol.toUpperCase())) {
            const newSym = newSymbol.toUpperCase();
            setSymbols([...symbols, newSym].sort());
            setNewSymbol('');
        }
    };

    const handleRemoveSymbol = (symbolToRemove: string) => {
        setSymbols(symbols.filter(s => s !== symbolToRemove));
        // Optional: remove from shares map immediately or just leave it (it won't be saved if symbol is removed)
        const newShares = { ...shares };
        delete newShares[symbolToRemove];
        setShares(newShares);
    };

    const handleShareChange = (symbol: string, value: string) => {
        const numValue = parseFloat(value);
        const newShares = { ...shares };
        if (!isNaN(numValue) && numValue > 0) {
            newShares[symbol] = numValue;
        } else {
            delete newShares[symbol];
        }
        setShares(newShares);
    };

    const handleExport = () => {
        const exportString = symbols.map(sym => {
            const shareCount = shares[sym] || 0;
            return `${sym}:${shareCount}`;
        }).join(' ');

        navigator.clipboard.writeText(exportString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = () => {
        if (name.trim()) {
            onSave({
                ...portfolio,
                name: name.trim(),
                symbols: symbols
            }, shares);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="text-lg font-semibold text-white">Edit Portfolio</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Portfolio Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="My Portfolio"
                            autoFocus
                        />
                    </div>

                    {/* Holdings Section */}
                    <div className="space-y-3">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Holdings ({symbols.length})</label>

                        {/* Add Symbol Input */}
                        <form onSubmit={handleAddSymbol} className="flex gap-2">
                            <input
                                type="text"
                                value={newSymbol}
                                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase placeholder:normal-case"
                                placeholder="Add stock symbol (e.g. AAPL)"
                            />
                            <button
                                type="submit"
                                disabled={!newSymbol}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center"
                            >
                                <Plus size={20} />
                            </button>
                        </form>

                        {/* Symbols List */}
                        <div className="max-h-60 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {symbols.length === 0 ? (
                                <div className="text-center py-4 text-slate-500 text-sm italic">
                                    No stocks in this portfolio
                                </div>
                            ) : (
                                symbols.map(symbol => (
                                    <div key={symbol} className="flex items-center justify-between bg-slate-800/50 px-3 py-2 rounded-lg group hover:bg-slate-800 transition-colors">
                                        <span className="font-mono font-medium text-slate-200 w-20">{symbol}</span>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">Shares:</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={shares[symbol] || ''}
                                                    onChange={(e) => handleShareChange(symbol, e.target.value)}
                                                    className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-right text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                                    placeholder="0"
                                                />
                                            </div>

                                            <button
                                                onClick={() => handleRemoveSymbol(symbol)}
                                                className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                title="Remove stock"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-2 text-sm"
                        title="Copy portfolio to clipboard"
                    >
                        {copied ? <Check size={16} /> : <Share size={16} />}
                        {copied ? 'Copied!' : 'Export'}
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <Save size={16} />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
