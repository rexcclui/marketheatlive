import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { getInitialStocks, simulateTick, createStock } from './services/stockService';
import { getBatchQuotes, getIntradayChart } from './services/fmpService';
import { Stock, Portfolio } from './types';
import { StockHeatmap } from './components/StockHeatmap';
import { IntradayPopup } from './components/IntradayPopup';
import { DetailModal } from './components/DetailModal';
import { ComparisonModal } from './components/ComparisonModal';
import { BarChart3, Plus, Trash2, LineChart, FolderPlus, Edit3, X, Settings, Database, AlertCircle, KeyRound, RefreshCw, CheckCircle2, Terminal } from 'lucide-react';

const App: React.FC = () => {
    // Global Data Universe
    const [masterStocks, setMasterStocks] = useState<Stock[]>([]);

    // Portfolios State
    const [portfolios, setPortfolios] = useState<Portfolio[]>(() => {
        const saved = localStorage.getItem('portfolios');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse portfolios from local storage", e);
            }
        }
        return [
            { id: '1', name: 'Main Watchlist', symbols: ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META'] },
            { id: '2', name: 'Div Yielders', symbols: ['JPM', 'KO', 'PEP', 'PG', 'JNJ', 'XOM', 'CVX'] },
            { id: '3', name: 'High Beta', symbols: ['AMD', 'NFLX', 'DIS', 'TSLA'] }
        ];
    });

    const [activePortfolioId, setActivePortfolioId] = useState(() => {
        return localStorage.getItem('activePortfolioId') || '1';
    });

    const [isRenamingPortfolio, setIsRenamingPortfolio] = useState(false);
    const [editingName, setEditingName] = useState('');

    // View Options
    const [showCharts, setShowCharts] = useState(false);

    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const apiKeyInputRef = useRef<HTMLInputElement>(null);

    // Interaction States
    const [activeStock, setActiveStock] = useState<Stock | null>(null);
    const [popupRect, setPopupRect] = useState<DOMRect | null>(null);
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

    // Add/Remove/Drag States
    const [newTicker, setNewTicker] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [dragOverBin, setDragOverBin] = useState(false);
    const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

    // Comparison State
    const [comparisonStocks, setComparisonStocks] = useState<[Stock, Stock] | null>(null);

    // FMP Data Settings
    const [showSettings, setShowSettings] = useState(false);

    // Default Key provided by user
    const DEFAULT_KEY = 'zGcTWbE1JPSBQB43vW4NGgTow69y5ksM';

    const [fmpApiKey, setFmpApiKey] = useState(() => localStorage.getItem('fmpApiKey') || DEFAULT_KEY);
    // Enable real data by default if a key is present (which it is now via default)
    const [useRealData, setUseRealData] = useState(() => {
        const key = localStorage.getItem('fmpApiKey') || DEFAULT_KEY;
        return !!key;
    });

    const [apiError, setApiError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [debugResponse, setDebugResponse] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);

    // Initialize Data
    useEffect(() => {
        // Initial fetch of universe
        const initial = getInitialStocks();

        // Ensure all stocks in persisted portfolios exist in the universe
        const allSymbols = new Set(portfolios.flatMap(p => p.symbols));
        const existingSymbols = new Set(initial.map(s => s.symbol));

        const missingStocks = Array.from(allSymbols)
            .filter(s => !existingSymbols.has(s))
            .map(s => createStock(s));

        setMasterStocks([...initial, ...missingStocks]);
    }, []); // Run once on mount (portfolios is stable from initial state, but we only want this once)

    // Persist Portfolios & Active ID
    useEffect(() => {
        localStorage.setItem('portfolios', JSON.stringify(portfolios));
    }, [portfolios]);

    useEffect(() => {
        localStorage.setItem('activePortfolioId', activePortfolioId);
    }, [activePortfolioId]);

    // Persist API Key
    useEffect(() => {
        localStorage.setItem('fmpApiKey', fmpApiKey);
        if (fmpApiKey && apiError === "Please enter an API Key first.") {
            setApiError(null);
        }
    }, [fmpApiKey, apiError]);

    // Toast timer
    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => setShowToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showToast]);

    // Test Connection Function
    const testConnection = async () => {
        if (!fmpApiKey) {
            setApiError("Enter key first");
            return;
        }
        setIsFetching(true);
        setDebugResponse("Testing connection with 'AAPL'...");
        try {
            const result = await getBatchQuotes(['AAPL'], fmpApiKey);
            if (result.error) {
                setApiError(result.error);
                setDebugResponse(`Error: ${result.error}`);
            } else if (result.data.length > 0) {
                setApiError(null);
                setDebugResponse(`Success! Received:\n${JSON.stringify(result.data[0], null, 2)}`);
            } else {
                setDebugResponse("Connected, but received empty data array.");
            }
        } catch (e) {
            setDebugResponse(`Network Error: ${e}`);
        }
        setIsFetching(false);
    };

    // Data Fetching Function
    const fetchRealData = useCallback(async () => {
        if (!fmpApiKey) return;

        setIsFetching(true);
        const uniqueSymbols = Array.from(new Set(portfolios.flatMap(p => p.symbols)));
        if (uniqueSymbols.length === 0) {
            setIsFetching(false);
            return;
        }

        const result = await getBatchQuotes(uniqueSymbols, fmpApiKey);

        if (result.error) {
            setApiError(result.error);
            if (result.error.includes("Invalid")) {
                setUseRealData(false); // Safety switch off
                setShowSettings(true);
            }
        } else if (result.data.length > 0) {
            setApiError(null);
            setLastUpdated(new Date());
            setShowToast(true);

            // Update master stocks
            setMasterStocks(prev => {
                const next = [...prev];
                result.data.forEach(upd => {
                    const idx = next.findIndex(s => s.symbol === upd.symbol);
                    if (idx !== -1 && upd.price !== undefined) {
                        // Update existing
                        next[idx] = {
                            ...next[idx],
                            price: upd.price!,
                            changePercent: upd.changePercent || next[idx].changePercent,
                            volume: upd.volume || next[idx].volume,
                        };
                    } else if (idx === -1 && upd.symbol) {
                        // Add new stock found in API
                        next.push({
                            symbol: upd.symbol,
                            name: upd.name || upd.symbol,
                            price: upd.price!,
                            changePercent: upd.changePercent || 0,
                            weeklyChangePercent: 0, // API doesn't return this in simple quote
                            volume: upd.volume || 0,
                            sector: 'Unknown',
                            history: []
                        } as Stock);
                    }
                });
                return next;
            });
        }
        setIsFetching(false);
    }, [fmpApiKey, portfolios]);

    // Data Loop Manager
    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval>;

        if (useRealData && fmpApiKey) {
            // REAL DATA MODE
            fetchRealData(); // Run immediately
            intervalId = setInterval(fetchRealData, 60000); // Poll every 60s
        } else {
            // SIMULATION MODE
            intervalId = setInterval(() => {
                setMasterStocks(prevStocks => simulateTick(prevStocks));
            }, 2000);
        }

        return () => clearInterval(intervalId);
    }, [useRealData, fmpApiKey, fetchRealData]);

    // Resize Observer
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Computed stocks for current portfolio
    const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || portfolios[0];

    const visibleStocks = useMemo(() => {
        return masterStocks.filter(s => activePortfolio.symbols.includes(s.symbol));
    }, [masterStocks, activePortfolio]);

    // Handlers
    const handlePressHold = useCallback(async (stock: Stock, rect: DOMRect) => {
        if (isDragging) return;

        let stockToSet = stock;

        // If real data is on, fetch the latest intraday chart (15min)
        if (useRealData && fmpApiKey) {
            const history = await getIntradayChart(stock.symbol, fmpApiKey);
            if (history.length > 0) {
                stockToSet = { ...stock, history };
                setMasterStocks(prev => prev.map(s => s.symbol === stock.symbol ? { ...s, history } : s));
            }
        }

        setActiveStock(stockToSet);
        setPopupRect(rect);
    }, [isDragging, useRealData, fmpApiKey]);

    const handleRelease = useCallback(() => {
        setActiveStock(null);
        setPopupRect(null);
    }, []);

    const handleClick = useCallback(async (stock: Stock) => {
        if (isDragging) return;

        // Also fetch history on click if real data enabled
        if (useRealData && fmpApiKey && (!stock.history || stock.history.length === 0)) {
            const history = await getIntradayChart(stock.symbol, fmpApiKey);
            if (history.length > 0) {
                const updatedStock = { ...stock, history };
                setMasterStocks(prev => prev.map(s => s.symbol === stock.symbol ? updatedStock : s));
                setSelectedStock(updatedStock);
                handleRelease();
                return;
            }
        }

        setSelectedStock(stock);
        handleRelease();
    }, [isDragging, handleRelease, useRealData, fmpApiKey]);

    const handleAddStock = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTicker.trim()) return;

        const symbol = newTicker.trim().toUpperCase();

        // Check if already in current portfolio
        if (activePortfolio.symbols.includes(symbol)) {
            alert(`Stock ${symbol} is already in ${activePortfolio.name}.`);
            setNewTicker('');
            return;
        }

        // Check if exists in universe, if not create it
        const existsInUniverse = masterStocks.find(s => s.symbol === symbol);
        if (!existsInUniverse) {
            const newStock = createStock(symbol);
            setMasterStocks(prev => [...prev, newStock]);
        }

        // Add to portfolio
        setPortfolios(prev => prev.map(p => {
            if (p.id === activePortfolioId) {
                return { ...p, symbols: [...p.symbols, symbol] };
            }
            return p;
        }));

        setNewTicker('');
    };

    const handleRemoveStock = useCallback((symbol: string) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === activePortfolioId) {
                return { ...p, symbols: p.symbols.filter(s => s !== symbol) };
            }
            return p;
        }));
    }, [activePortfolioId]);

    const handleCombineStocks = useCallback((sourceSymbol: string, targetSymbol: string) => {
        const source = masterStocks.find(s => s.symbol === sourceSymbol);
        const target = masterStocks.find(s => s.symbol === targetSymbol);

        if (source && target) {
            setComparisonStocks([source, target]);
        }
    }, [masterStocks]);

    const handleDragStart = useCallback((e: React.DragEvent, stock: Stock) => {
        e.dataTransfer.setData('text/plain', stock.symbol);
        handleRelease();
        setTimeout(() => setIsDragging(true), 0);
    }, [handleRelease]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        setDragOverBin(false);
        setDragOverTabId(null);
    }, []);

    const handleAddPortfolio = () => {
        const newId = Date.now().toString();
        setPortfolios(prev => [...prev, { id: newId, name: 'New Portfolio', symbols: [] }]);
        setActivePortfolioId(newId);
        setEditingName('New Portfolio');
        setIsRenamingPortfolio(true);
    };

    const handleDeletePortfolio = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (portfolios.length <= 1) {
            alert("You must have at least one portfolio.");
            return;
        }

        const newPortfolios = portfolios.filter(p => p.id !== id);
        setPortfolios(newPortfolios);

        // If we deleted the active one, switch to the first one
        if (activePortfolioId === id) {
            setActivePortfolioId(newPortfolios[0].id);
        }
    };

    const handleRenamePortfolio = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingName.trim()) {
            setPortfolios(prev => prev.map(p => p.id === activePortfolioId ? { ...p, name: editingName.trim() } : p));
        }
        setIsRenamingPortfolio(false);
    };

    const handleTabDragOver = (e: React.DragEvent, portfolioId: string) => {
        e.preventDefault();
        if (portfolioId !== activePortfolioId) {
            setDragOverTabId(portfolioId);
        }
    };

    const handleTabDragLeave = () => {
        setDragOverTabId(null);
    };

    const handleTabDrop = (e: React.DragEvent, targetPortfolioId: string) => {
        e.preventDefault();
        setDragOverTabId(null);
        const symbol = e.dataTransfer.getData('text/plain');
        if (!symbol || targetPortfolioId === activePortfolioId) return;

        setPortfolios(prev => prev.map(p => {
            // Remove from current
            if (p.id === activePortfolioId) {
                return { ...p, symbols: p.symbols.filter(s => s !== symbol) };
            }
            // Add to target if not exists
            if (p.id === targetPortfolioId && !p.symbols.includes(symbol)) {
                return { ...p, symbols: [...p.symbols, symbol] };
            }
            return p;
        }));
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden relative">
            {/* Navbar */}
            <header className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shadow-md z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <BarChart3 className="text-white" size={24} />
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight hidden sm:block">MarketHeat <span className="text-indigo-400 font-light">Live</span></h1>
                </div>

                <div className="flex items-center gap-4">
                    {/* Status Indicators */}
                    {useRealData && (
                        <div className="hidden md:flex items-center gap-3 mr-2 text-[10px] text-slate-400 border-r border-slate-800 pr-4">
                            <button
                                onClick={fetchRealData}
                                disabled={isFetching}
                                className={`flex items-center gap-1 hover:text-indigo-400 transition-colors ${isFetching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                title="Force Refresh"
                            >
                                <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
                                <span>{isFetching ? 'Updating...' : 'Refresh'}</span>
                            </button>
                            <span className="text-slate-600">|</span>
                            <span>
                                Updated: {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--'}
                            </span>
                        </div>
                    )}

                    {/* API Settings Toggle */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors
                        ${useRealData
                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}
                        ${apiError && !showSettings ? 'animate-pulse border-red-500 text-red-400' : ''}    
                    `}
                        >
                            {useRealData ? <Database size={14} /> : <Settings size={14} />}
                            {useRealData ? 'Live Data' : 'Simulated'}
                        </button>

                        {/* Settings Dropdown */}
                        {showSettings && (
                            <div
                                className="absolute top-full right-0 mt-2 w-96 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-5 z-[60] animate-in fade-in zoom-in-95 origin-top-right"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-2">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Settings size={16} /> Data Configuration
                                    </h3>
                                    <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
                                            <KeyRound size={12} /> FMP API KEY
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                ref={apiKeyInputRef}
                                                type="password"
                                                value={fmpApiKey}
                                                onChange={(e) => setFmpApiKey(e.target.value)}
                                                placeholder="e.g. abc1234..."
                                                className={`flex-1 bg-slate-950 border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-slate-600 transition-colors ${apiError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-700'}`}
                                                autoComplete="off"
                                            />
                                            <button
                                                onClick={testConnection}
                                                disabled={isFetching || !fmpApiKey}
                                                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-md text-xs font-medium disabled:opacity-50"
                                                title="Test Connection"
                                            >
                                                Test
                                            </button>
                                        </div>
                                        {!fmpApiKey ? (
                                            <p className={`text-[10px] mt-1.5 font-medium ${apiError ? 'text-red-400' : 'text-amber-500'}`}>
                                                {apiError || "* Required for Real-Time Data"}
                                            </p>
                                        ) : (
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-[10px] text-emerald-400">Key Saved locally</span>
                                                <a href="https://site.financialmodelingprep.com/developer/docs" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline block">
                                                    Need a key?
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {debugResponse && (
                                        <div className="bg-slate-950 rounded-md p-3 border border-slate-700 text-[10px] font-mono max-h-32 overflow-y-auto">
                                            <div className="flex items-center gap-2 text-indigo-400 mb-1 border-b border-slate-800 pb-1">
                                                <Terminal size={10} />
                                                <span>Raw Response Preview</span>
                                            </div>
                                            <pre className="whitespace-pre-wrap text-slate-300 break-all">
                                                {debugResponse}
                                            </pre>
                                        </div>
                                    )}

                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-200">Real-time Feeds</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!fmpApiKey && !useRealData) {
                                                        setApiError("Please enter an API Key first.");
                                                        apiKeyInputRef.current?.focus();
                                                        return;
                                                    }
                                                    setUseRealData(!useRealData);
                                                }}
                                                title={!fmpApiKey ? "Enter API Key to enable" : "Toggle Real-time Data"}
                                                className={`
                                            w-12 h-6 rounded-full p-1 transition-all cursor-pointer border border-transparent
                                            ${useRealData ? 'bg-emerald-500' : 'bg-slate-600 hover:bg-slate-500'}
                                            focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                                        `}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${useRealData ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                            </button>
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-2 leading-tight">
                                            {useRealData
                                                ? 'Fetching live quotes every 60s. Charts use 15min intervals.'
                                                : 'Using simulated mock data for demonstration.'}
                                        </div>
                                    </div>

                                    {apiError && (
                                        <div className="bg-rose-500/20 border border-rose-500/30 text-rose-300 p-2 rounded text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <AlertCircle size={14} className="shrink-0" />
                                            <span>{apiError}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-6 bg-slate-700 mx-1"></div>

                    {/* View Toggles */}
                    <button
                        onClick={() => setShowCharts(!showCharts)}
                        className={`p-2 rounded-md transition-all ${showCharts ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                        title="Toggle Mini Charts"
                    >
                        <LineChart size={20} />
                    </button>

                    {/* Add Stock Input */}
                    <form onSubmit={handleAddStock} className="flex items-center bg-slate-800 rounded-md border border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                        <input
                            type="text"
                            value={newTicker}
                            onChange={(e) => setNewTicker(e.target.value)}
                            placeholder="ADD STOCK"
                            className="bg-transparent border-none text-white text-xs px-3 py-2 w-32 placeholder:text-slate-500 focus:outline-none uppercase font-mono"
                            maxLength={12}
                        />
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 transition-colors cursor-pointer">
                            <Plus size={16} />
                        </button>
                    </form>
                </div>
            </header>

            {/* Success Toast */}
            {showToast && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-5">
                    <CheckCircle2 size={16} />
                    <span>Data Refreshed</span>
                </div>
            )}

            {/* Portfolio Tabs */}
            <div className="px-6 pt-4 pb-0 flex items-center gap-2 overflow-x-auto scrollbar-hide shrink-0">
                {portfolios.map(p => (
                    <button
                        key={p.id}
                        onClick={() => { setActivePortfolioId(p.id); setIsRenamingPortfolio(false); }}
                        onDragOver={(e) => handleTabDragOver(e, p.id)}
                        onDragLeave={handleTabDragLeave}
                        onDrop={(e) => handleTabDrop(e, p.id)}
                        className={`
                    px-4 py-2 rounded-t-lg text-sm font-medium transition-all relative group flex items-center gap-2 min-w-[120px] justify-between cursor-pointer
                    ${activePortfolioId === p.id
                                ? 'bg-slate-800 text-white border-t border-x border-slate-700/50'
                                : dragOverTabId === p.id
                                    ? 'bg-indigo-600 text-white scale-105 shadow-lg z-10' // Highlight on Drag Over
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}
                `}
                    >
                        {activePortfolioId === p.id && isRenamingPortfolio ? (
                            <div className="flex items-center" onClick={e => e.stopPropagation()}>
                                <input
                                    autoFocus
                                    className="bg-slate-900 border border-indigo-500 rounded px-1 py-0.5 text-xs text-white outline-none w-20"
                                    value={editingName}
                                    onChange={e => setEditingName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleRenamePortfolio(e as any) }}
                                    onBlur={handleRenamePortfolio}
                                />
                            </div>
                        ) : (
                            <span
                                className="truncate"
                                onDoubleClick={() => { if (activePortfolioId === p.id) { setEditingName(p.name); setIsRenamingPortfolio(true); } }}>
                                {p.name}
                            </span>
                        )}

                        {/* Delete Button - Show on hover or if active */}
                        <span
                            onClick={(e) => handleDeletePortfolio(e, p.id)}
                            className={`
                        p-0.5 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer
                        ${activePortfolioId === p.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    `}
                            title="Delete Portfolio"
                        >
                            <X size={14} />
                        </span>

                        {activePortfolioId === p.id && !dragOverTabId && (
                            <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-slate-800 z-10"></div>
                        )}
                    </button>
                ))}
                <button
                    onClick={handleAddPortfolio}
                    className="p-1.5 rounded-full hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer"
                    title="Create New Portfolio"
                >
                    <FolderPlus size={18} />
                </button>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 px-4 md:px-6 pb-6 pt-0 relative bg-slate-950">
                {/* Background connector for active tab */}
                <div className="w-full h-4 bg-slate-800 absolute top-0 left-0 right-0 z-0 mx-6 rounded-b-lg opacity-0"></div>

                <div className="h-full w-full flex flex-col gap-4 pt-4 border-t border-slate-800">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-slate-200">{activePortfolio.name}</h2>
                            <button
                                onClick={() => { setEditingName(activePortfolio.name); setIsRenamingPortfolio(true); }}
                                className="text-slate-600 hover:text-indigo-400 cursor-pointer"
                            >
                                <Edit3 size={14} />
                            </button>
                        </div>

                        <div className="flex gap-4 text-xs font-medium text-slate-500">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-emerald-500 rounded-sm opacity-80"></div> +3%
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-slate-700 rounded-sm"></div> 0%
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-rose-500 rounded-sm opacity-80"></div> -3%
                            </div>
                        </div>
                    </div>

                    {/* Heatmap Container */}
                    <div ref={containerRef} className="flex-1 min-h-0 relative">
                        {dimensions.width > 0 && dimensions.height > 0 && (
                            <StockHeatmap
                                stocks={visibleStocks}
                                width={dimensions.width}
                                height={dimensions.height}
                                onPressHold={handlePressHold}
                                onRelease={handleRelease}
                                onClick={handleClick}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onCombineStocks={handleCombineStocks}
                                showChart={showCharts}
                            />
                        )}
                    </div>
                </div>
            </main>

            {/* Trash Bin Overlay */}
            <div
                className={`fixed bottom-0 left-0 right-0 h-40 flex items-center justify-center bg-gradient-to-t from-red-900/90 to-red-900/0 z-40 transition-transform duration-300 ease-in-out ${isDragging ? 'translate-y-0' : 'translate-y-full'}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverBin(true);
                }}
                onDragLeave={() => setDragOverBin(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    const symbol = e.dataTransfer.getData('text/plain');
                    if (symbol) handleRemoveStock(symbol);
                    setIsDragging(false);
                    setDragOverBin(false);
                }}
            >
                <div className={`
            flex flex-col items-center justify-center p-8 rounded-full border-4 transition-all duration-200
            ${dragOverBin ? 'bg-red-600 border-white scale-110 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'bg-red-800/80 border-red-400 scale-100'}
        `}>
                    <Trash2 size={40} className="text-white mb-2" />
                    <span className="text-white font-bold text-sm uppercase tracking-wider">Remove from {activePortfolio.name}</span>
                </div>
            </div>

            {/* Overlays */}
            {activeStock && popupRect && !isDragging && (
                <IntradayPopup
                    stock={activeStock}
                    rect={popupRect}
                    fmpApiKey={useRealData && fmpApiKey ? fmpApiKey : undefined}
                />
            )}

            {selectedStock && !comparisonStocks && (
                <DetailModal
                    stock={selectedStock}
                    onClose={() => setSelectedStock(null)}
                    fmpApiKey={useRealData && fmpApiKey ? fmpApiKey : undefined}
                />
            )}

            {comparisonStocks && (
                <ComparisonModal
                    stockA={comparisonStocks[0]}
                    stockB={comparisonStocks[1]}
                    onClose={() => setComparisonStocks(null)}
                />
            )}

            {/* Settings Backdrop */}
            {showSettings && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowSettings(false)}></div>
            )}
        </div>
    );
};

export default App;