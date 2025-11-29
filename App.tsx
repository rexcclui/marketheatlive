import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { getInitialStocks, simulateTick, createStock } from './services/stockService';
import { getBatchQuotes, getIntradayChart, getStockPriceChanges, type StockPriceChanges } from './services/fmpService';
import { Stock, Portfolio } from './types';
import { StockHeatmap } from './components/StockHeatmap';
import { IntradayPopup } from './components/IntradayPopup';
import { DetailModal } from './components/DetailModal';
import { ComparisonModal } from './components/ComparisonModal';
import { PortfolioEditModal } from './components/PortfolioEditModal';
import { BarChart3, Plus, Minus, Trash2, LineChart, FolderPlus, Edit3, X, Settings, Database, AlertCircle, KeyRound, RefreshCw, CheckCircle2, Terminal, DollarSign } from 'lucide-react';

const App: React.FC = () => {
    // Global Data Universe
    const [masterStocks, setMasterStocks] = useState<Stock[]>([]);

    // Portfolios State
    const [portfolios, setPortfolios] = useState<Portfolio[]>(() => {
        const saved = localStorage.getItem('portfolios');
        return saved ? JSON.parse(saved) : [{ id: 'default', name: 'My Portfolio', symbols: [] }];
    });
    const [activePortfolioId, setActivePortfolioId] = useState(() => localStorage.getItem('activePortfolioId') || 'default');

    // Stock Shares Persistence
    const [stockShares, setStockShares] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('stockShares');
        return saved ? JSON.parse(saved) : {};
    });

    const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);

    // ... (other state)



    // View Options
    const [showCharts, setShowCharts] = useState(false);
    const [showPositions, setShowPositions] = useState(true);
    const [sizeMetric, setSizeMetric] = useState<'weeklyChangePercent' | 'marketCap' | 'oneMonthChangePercent' | 'threeMonthChangePercent' | 'sixMonthChangePercent' | 'position' | 'none'>('weeklyChangePercent');
    const [colorMetric, setColorMetric] = useState<'change1m' | 'change15m' | 'change30m' | 'change1h' | 'change4h' | 'changePercent' | 'weeklyChangePercent' | 'twoWeekChangePercent' | 'oneMonthChangePercent' | 'threeMonthChangePercent' | 'sixMonthChangePercent' | 'oneYearChangePercent' | 'threeYearChangePercent' | 'fiveYearChangePercent'>('changePercent');

    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const apiKeyInputRef = useRef<HTMLInputElement>(null);

    // Interaction States
    const [activeStock, setActiveStock] = useState<Stock | null>(null);
    const [popupRect, setPopupRect] = useState<DOMRect | null>(null);
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

    // Add/Remove/Drag States
    // Add/Remove/Drag States

    const [isDragging, setIsDragging] = useState(false);
    const [dragOverBin, setDragOverBin] = useState(false);
    const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
    const [showBatchOverlay, setShowBatchOverlay] = useState(false);
    const [batchInput, setBatchInput] = useState('');

    // Comparison State
    const [comparisonStocks, setComparisonStocks] = useState<[Stock, Stock] | null>(null);

    // Esc Key Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setActiveStock(null);
                setPopupRect(null);
                setSelectedStock(null);
                setComparisonStocks(null);
                setShowSettings(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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

        const allStocks = [...initial, ...missingStocks].map(s => {
            if (stockShares[s.symbol] !== undefined) {
                return { ...s, shares: stockShares[s.symbol] };
            }
            return s;
        });

        setMasterStocks(allStocks);
    }, []); // Run once on mount (portfolios is stable from initial state, but we only want this once)

    // Persist Portfolios & Active ID
    useEffect(() => {
        localStorage.setItem('portfolios', JSON.stringify(portfolios));
    }, [portfolios]);

    // Persist Stock Shares
    useEffect(() => {
        localStorage.setItem('stockShares', JSON.stringify(stockShares));
    }, [stockShares]);

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

        // Fetch both quotes and price changes in parallel
        const [quoteResult, priceChanges] = await Promise.all([
            getBatchQuotes(uniqueSymbols, fmpApiKey),
            getStockPriceChanges(uniqueSymbols, fmpApiKey)
        ]);

        if (quoteResult.error) {
            setApiError(quoteResult.error);
            if (quoteResult.error.includes("Invalid")) {
                setUseRealData(false); // Safety switch off
                setShowSettings(true);
            }
        } else if (quoteResult.data.length > 0) {
            setApiError(null);
            setLastUpdated(new Date());
            setShowToast(true);

            // Create a map of price changes by symbol for easy lookup
            const priceChangeMap = new Map<string, StockPriceChanges>(
                priceChanges.map((pc: StockPriceChanges) => [pc.symbol, pc])
            );

            // Update master stocks
            setMasterStocks(prev => {
                const next = [...prev];
                quoteResult.data.forEach(upd => {
                    const idx = next.findIndex(s => s.symbol === upd.symbol);
                    const changes = priceChangeMap.get(upd.symbol!);

                    if (idx !== -1 && upd.price !== undefined) {
                        // Update existing
                        next[idx] = {
                            ...next[idx],
                            price: upd.price!,
                            changePercent: upd.changePercent || next[idx].changePercent,
                            volume: upd.volume || next[idx].volume,
                            marketCap: upd.marketCap || next[idx].marketCap,
                            // Update historical change percentages from API
                            weeklyChangePercent: changes?.weeklyChangePercent ?? next[idx].weeklyChangePercent,
                            twoWeekChangePercent: changes?.twoWeekChangePercent ?? next[idx].twoWeekChangePercent,
                            oneMonthChangePercent: changes?.oneMonthChangePercent ?? next[idx].oneMonthChangePercent,
                            threeMonthChangePercent: changes?.threeMonthChangePercent ?? next[idx].threeMonthChangePercent,
                            sixMonthChangePercent: changes?.sixMonthChangePercent ?? next[idx].sixMonthChangePercent,
                            oneYearChangePercent: changes?.oneYearChangePercent ?? next[idx].oneYearChangePercent,
                            threeYearChangePercent: changes?.threeYearChangePercent ?? next[idx].threeYearChangePercent,
                            fiveYearChangePercent: changes?.fiveYearChangePercent ?? next[idx].fiveYearChangePercent,
                            tenYearChangePercent: changes?.tenYearChangePercent ?? next[idx].tenYearChangePercent,
                        };
                    } else if (idx === -1 && upd.symbol) {
                        // Add new stock found in API
                        next.push({
                            symbol: upd.symbol,
                            name: upd.name || upd.symbol,
                            price: upd.price!,
                            changePercent: upd.changePercent || 0,
                            // Use price changes from API if available, otherwise default to 0
                            weeklyChangePercent: changes?.weeklyChangePercent ?? 0,
                            twoWeekChangePercent: changes?.twoWeekChangePercent ?? 0,
                            oneMonthChangePercent: changes?.oneMonthChangePercent ?? 0,
                            threeMonthChangePercent: changes?.threeMonthChangePercent ?? 0,
                            sixMonthChangePercent: changes?.sixMonthChangePercent ?? 0,
                            oneYearChangePercent: changes?.oneYearChangePercent ?? 0,
                            threeYearChangePercent: changes?.threeYearChangePercent ?? 0,
                            fiveYearChangePercent: changes?.fiveYearChangePercent ?? 0,
                            tenYearChangePercent: changes?.tenYearChangePercent ?? 0,
                            volume: upd.volume || 0,
                            marketCap: upd.marketCap || 0,
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
        const filtered = masterStocks.filter(s => activePortfolio.symbols.includes(s.symbol));

        // Calculate position values with currency adjustment
        const stocksWithPositionValues = filtered.map(stock => {
            if (stock.shares && stock.shares > 0) {
                const basePosition = stock.price * stock.shares;

                // Check stock type by suffix
                const isHKStock = stock.symbol.endsWith('.HK');
                const isUKStock = stock.symbol.endsWith('.L');
                const isJapanStock = stock.symbol.endsWith('.T');

                // Apply currency conversion based on stock type
                let positionValue: number;
                if (isHKStock) {
                    positionValue = basePosition; // HK stocks: no conversion
                } else if (isUKStock) {
                    positionValue = basePosition * 10.3 / 100; // UK stocks: × 10.3 / 100
                } else if (isJapanStock) {
                    positionValue = basePosition / 20; // Japan stocks: ÷ 20
                } else {
                    positionValue = basePosition * 7.8; // Other stocks (e.g., US): × 7.8
                }

                return { ...stock, positionValue };
            }
            return stock;
        });

        // Calculate average position from stocks that have positions
        const stocksWithPositions = stocksWithPositionValues.filter(s => s.positionValue && s.positionValue > 0);
        const averagePosition = stocksWithPositions.length > 0
            ? stocksWithPositions.reduce((sum, s) => sum + (s.positionValue || 0), 0) / stocksWithPositions.length
            : 0;

        // Assign average position to stocks without positions
        return stocksWithPositionValues.map(stock => {
            if (!stock.positionValue || stock.positionValue === 0) {
                return { ...stock, positionValue: averagePosition };
            }
            return stock;
        });
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

    // Auto-hide popup after 5 seconds
    useEffect(() => {
        if (activeStock) {
            const timer = setTimeout(() => {
                setActiveStock(null);
                setPopupRect(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [activeStock]);

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

    const addStock = useCallback((ticker: string) => {
        const symbol = ticker.trim().toUpperCase();
        if (!symbol) return;

        // Check if already in current portfolio
        const currentPortfolio = portfolios.find(p => p.id === activePortfolioId);
        if (currentPortfolio && currentPortfolio.symbols.includes(symbol)) {
            return false;
        }

        const now = Date.now();

        // Check if exists in universe, if not create it with addedAt timestamp
        setMasterStocks(prev => {
            const exists = prev.find(s => s.symbol === symbol);
            if (!exists) {
                const newStock = createStock(symbol);
                // Inject shares if available in state
                if (stockShares[symbol] !== undefined) {
                    newStock.shares = stockShares[symbol];
                }
                return [...prev, { ...newStock, addedAt: now }];
            } else {
                // Stock exists but being added to a new portfolio, update addedAt
                return prev.map(s => s.symbol === symbol ? { ...s, addedAt: now } : s);
            }
        });

        // Add to portfolio
        setPortfolios(prev => prev.map(p => {
            if (p.id === activePortfolioId && !p.symbols.includes(symbol)) {
                return { ...p, symbols: [...p.symbols, symbol] };
            }
            return p;
        }));
        return true;
    }, [activePortfolioId, portfolios]);



    const handleBatchAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!batchInput) return;

        const entries = batchInput.split(/[\s,]+/).filter(Boolean);
        const processedEntries: { symbol: string; shares?: number }[] = [];

        entries.forEach(entry => {
            // Check for SYMBOL:SHARES format
            const parts = entry.split(':');
            let rawSymbol = parts[0].trim();
            let shares: number | undefined = undefined;

            if (parts.length > 1) {
                const qty = parseFloat(parts[1]);
                if (!isNaN(qty)) {
                    shares = qty;
                }
            }

            if (!rawSymbol) return;

            // Check for .hk suffix (case insensitive)
            const hkMatch = rawSymbol.match(/^(.+)\.hk$/i);
            if (hkMatch) {
                rawSymbol = hkMatch[1]; // Extract the part before .hk
            }

            let finalSymbol = rawSymbol;
            // Check if it's a number (after stripping .hk if present)
            if (/^\d+$/.test(rawSymbol)) {
                // Pad to 4 digits and append .HK
                finalSymbol = rawSymbol.padStart(4, '0') + '.HK';
            } else {
                // Otherwise just uppercase
                finalSymbol = rawSymbol.toUpperCase();
            }

            processedEntries.push({ symbol: finalSymbol, shares });
        });

        const now = Date.now();

        // Update shares state if any shares were provided
        const newShares = { ...stockShares };
        let sharesUpdated = false;
        processedEntries.forEach(entry => {
            if (entry.shares !== undefined) {
                newShares[entry.symbol] = entry.shares;
                sharesUpdated = true;
            }
        });

        if (sharesUpdated) {
            setStockShares(newShares);
        }

        processedEntries.forEach(entry => {
            const sym = entry.symbol;
            setMasterStocks(prev => {
                const exists = prev.find(s => s.symbol === sym);
                if (!exists) {
                    const newStock = createStock(sym);
                    // Inject shares if available
                    if (entry.shares !== undefined) {
                        newStock.shares = entry.shares;
                    }
                    return [...prev, { ...newStock, addedAt: now }];
                } else {
                    // Stock exists but being added to portfolio, update addedAt and shares
                    return prev.map(s => {
                        if (s.symbol === sym) {
                            return {
                                ...s,
                                addedAt: now,
                                shares: entry.shares !== undefined ? entry.shares : s.shares
                            };
                        }
                        return s;
                    });
                }
            });

            setPortfolios(prev => prev.map(p => {
                if (p.id === activePortfolioId && !p.symbols.includes(sym)) {
                    return { ...p, symbols: [...p.symbols, sym] };
                }
                return p;
            }));
        });

        setBatchInput('');
        setShowBatchOverlay(false);
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

    const handleUpdateShares = useCallback((symbol: string, shares: number | undefined) => {
        const newShares = { ...stockShares };

        if (shares !== undefined && shares > 0) {
            newShares[symbol] = shares;
        } else {
            delete newShares[symbol];
        }

        setStockShares(newShares);

        // Update master stocks immediately
        setMasterStocks(prev => prev.map(s => {
            if (s.symbol === symbol) {
                return { ...s, shares: (shares !== undefined && shares > 0) ? shares : undefined };
            }
            return s;
        }));
    }, [stockShares]);

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
        const newPortfolio: Portfolio = {
            id: Date.now().toString(),
            name: 'New Portfolio',
            symbols: []
        };
        setPortfolios(prev => [...prev, newPortfolio]);
        setActivePortfolioId(newPortfolio.id);
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





    const handleSavePortfolio = (updatedPortfolio: Portfolio, updatedShares: Record<string, number>) => {
        setPortfolios(prev => prev.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p));

        // Update stock shares
        const newShares = { ...stockShares, ...updatedShares };
        setStockShares(newShares);

        // Update master stocks immediately to reflect share changes
        setMasterStocks(prev => prev.map(s => {
            if (updatedShares[s.symbol] !== undefined) {
                return { ...s, shares: updatedShares[s.symbol] };
            }
            return s;
        }));

        setEditingPortfolioId(null);
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



            {/* Portfolio Tabs */}
            <div className="px-6 pt-4 pb-0 flex items-center shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 mr-4">
                    <div className="bg-indigo-600 p-1.5 rounded-lg mr-2 shrink-0">
                        <BarChart3 className="text-white" size={20} />
                    </div>
                    {portfolios.map(p => (
                        <button
                            key={p.id}
                            onClick={() => { setActivePortfolioId(p.id); }}
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

                            <span
                                className="truncate"
                                onDoubleClick={() => { if (activePortfolioId === p.id) setEditingPortfolioId(p.id); }}>
                                {p.name}
                            </span>

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
                </div>
                <button
                    onClick={handleAddPortfolio}
                    className="p-1.5 rounded-full hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
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
                                onClick={() => setEditingPortfolioId(activePortfolio.id)}
                                className="text-slate-600 hover:text-indigo-400 cursor-pointer"
                            >
                                <Edit3 size={14} />
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Controls moved from header */}
                            <div className="flex items-center gap-2">
                                {/* Manual Refresh Button */}
                                {useRealData && (
                                    <button
                                        type="button"
                                        onClick={() => fetchRealData()}
                                        disabled={isFetching}
                                        className="p-1.5 rounded-md text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Refresh data now"
                                    >
                                        <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                                    </button>
                                )}

                                {/* Color Metric Slider */}
                                <div className="flex items-center gap-2 bg-slate-800 rounded-md border border-slate-700 px-2 py-1.5">
                                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Color:</span>

                                    {/* Minus Button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const metrics = ['change1m', 'change15m', 'change30m', 'change1h', 'change4h', 'changePercent', 'weeklyChangePercent', 'twoWeekChangePercent', 'oneMonthChangePercent', 'threeMonthChangePercent', 'sixMonthChangePercent', 'oneYearChangePercent', 'threeYearChangePercent', 'fiveYearChangePercent'];
                                            const currentIndex = metrics.indexOf(colorMetric);
                                            if (currentIndex > 0) {
                                                setColorMetric(metrics[currentIndex - 1] as any);
                                            }
                                        }}
                                        className="text-slate-400 hover:text-indigo-400 transition-colors"
                                        title="Shorter time period"
                                    >
                                        <Minus size={12} />
                                    </button>

                                    <input
                                        type="range"
                                        min="0"
                                        max="13"
                                        value={(() => {
                                            const metrics = ['change1m', 'change15m', 'change30m', 'change1h', 'change4h', 'changePercent', 'weeklyChangePercent', 'twoWeekChangePercent', 'oneMonthChangePercent', 'threeMonthChangePercent', 'sixMonthChangePercent', 'oneYearChangePercent', 'threeYearChangePercent', 'fiveYearChangePercent'];
                                            return metrics.indexOf(colorMetric);
                                        })()}
                                        onChange={(e) => {
                                            const metrics = ['change1m', 'change15m', 'change30m', 'change1h', 'change4h', 'changePercent', 'weeklyChangePercent', 'twoWeekChangePercent', 'oneMonthChangePercent', 'threeMonthChangePercent', 'sixMonthChangePercent', 'oneYearChangePercent', 'threeYearChangePercent', 'fiveYearChangePercent'];
                                            setColorMetric(metrics[parseInt(e.target.value)] as any);
                                        }}
                                        className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        title="Slide to select color metric"
                                    />

                                    {/* Plus Button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const metrics = ['change1m', 'change15m', 'change30m', 'change1h', 'change4h', 'changePercent', 'weeklyChangePercent', 'twoWeekChangePercent', 'oneMonthChangePercent', 'threeMonthChangePercent', 'sixMonthChangePercent', 'oneYearChangePercent', 'threeYearChangePercent', 'fiveYearChangePercent'];
                                            const currentIndex = metrics.indexOf(colorMetric);
                                            if (currentIndex < metrics.length - 1) {
                                                setColorMetric(metrics[currentIndex + 1] as any);
                                            }
                                        }}
                                        className="text-slate-400 hover:text-indigo-400 transition-colors"
                                        title="Longer time period"
                                    >
                                        <Plus size={12} />
                                    </button>

                                    <span className="text-[10px] text-slate-300 font-bold min-w-[32px]">
                                        {(() => {
                                            const labels = ['1m', '15m', '30m', '1h', '4h', 'Today', '7D', '14D', '1M', '3M', '6M', '1Y', '3Y', '5Y'];
                                            const metrics = ['change1m', 'change15m', 'change30m', 'change1h', 'change4h', 'changePercent', 'weeklyChangePercent', 'twoWeekChangePercent', 'oneMonthChangePercent', 'threeMonthChangePercent', 'sixMonthChangePercent', 'oneYearChangePercent', 'threeYearChangePercent', 'fiveYearChangePercent'];
                                            return labels[metrics.indexOf(colorMetric)];
                                        })()}
                                    </span>
                                </div>

                                {/* API Settings Toggle */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowSettings(!showSettings)}
                                        className={`flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium transition-colors
                                            ${useRealData
                                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}
                                            ${apiError && !showSettings ? 'animate-pulse border-red-500 text-red-400' : ''}    
                                        `}
                                    >
                                        {useRealData ? <Database size={14} /> : <Settings size={14} />}
                                    </button>

                                    {/* Settings Dropdown */}
                                    {showSettings && (
                                        <div
                                            className="absolute bottom-full right-0 mb-2 w-96 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-5 z-[60] animate-in fade-in zoom-in-95 origin-bottom-right"
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

                                {/* Size Metric Selector */}
                                <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 p-0.5">
                                    <select
                                        value={sizeMetric}
                                        onChange={(e) => setSizeMetric(e.target.value as any)}
                                        className="bg-transparent text-xs text-slate-300 border-none focus:ring-0 cursor-pointer py-1 pl-2 pr-1"
                                    >
                                        <option value="weeklyChangePercent">7D Chg</option>
                                        <option value="oneMonthChangePercent">1M Chg</option>
                                        <option value="threeMonthChangePercent">3M Chg</option>
                                        <option value="sixMonthChangePercent">6M Chg</option>
                                        <option value="marketCap">Market Cap</option>
                                        <option value="position">Position</option>
                                        <option value="none">None</option>
                                    </select>
                                </div>

                                {/* View Toggles */}
                                <button
                                    onClick={() => setShowCharts(!showCharts)}
                                    className={`p-1.5 rounded-md transition-all ${showCharts ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                                    title="Toggle Mini Charts"
                                >
                                    <LineChart size={16} />
                                </button>
                                <button
                                    onClick={() => setShowPositions(!showPositions)}
                                    className={`p-1.5 rounded-md transition-all ${showPositions ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                                    title="Toggle Position Values"
                                >
                                    <DollarSign size={16} />
                                </button>
                            </div>

                            <div className="w-px h-4 bg-slate-700 mx-2"></div>

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
                                showPositions={showPositions}
                                sizeMetric={sizeMetric}
                                colorMetric={colorMetric}
                            />
                        )}
                    </div>
                </div>
            </main>


            {/* Trash Bin Overlay */}
            <div
                className={`fixed bottom-0 left-0 right-0 h-24 flex items-center justify-center bg-gradient-to-t from-red-900/90 to-red-900/0 z-40 transition-transform duration-300 ease-in-out ${isDragging ? 'translate-y-0' : 'translate-y-full'}`}
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
            flex flex-col items-center justify-center p-4 rounded-full border-4 transition-all duration-200
            ${dragOverBin ? 'bg-red-600 border-white scale-110 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'bg-red-800/80 border-red-400 scale-100'}
        `}>
                    <Trash2 size={20} className="text-white mb-1" />
                    <span className="text-white font-bold text-[10px] uppercase tracking-wider">Remove from {activePortfolio.name}</span>
                </div>
            </div>

            {/* Overlays */}
            {
                activeStock && popupRect && !isDragging && (
                    <IntradayPopup
                        stock={activeStock}
                        rect={popupRect}
                        fmpApiKey={useRealData && fmpApiKey ? fmpApiKey : undefined}
                    />
                )
            }

            {
                selectedStock && !comparisonStocks && (
                    <DetailModal
                        stock={masterStocks.find(s => s.symbol === selectedStock.symbol) || selectedStock}
                        onClose={() => setSelectedStock(null)}
                        fmpApiKey={useRealData && fmpApiKey ? fmpApiKey : undefined}
                        onUpdateShares={handleUpdateShares}
                    />
                )
            }



            // ...

            {
                editingPortfolioId && (
                    <PortfolioEditModal
                        portfolio={portfolios.find(p => p.id === editingPortfolioId)!}
                        currentShares={stockShares}
                        onClose={() => setEditingPortfolioId(null)}
                        onSave={handleSavePortfolio}
                    />
                )
            }

            {
                comparisonStocks && (
                    <ComparisonModal
                        stockA={comparisonStocks[0]}
                        stockB={comparisonStocks[1]}
                        onClose={() => setComparisonStocks(null)}
                        fmpApiKey={useRealData && fmpApiKey ? fmpApiKey : undefined}
                    />
                )
            }

            {/* Settings Backdrop */}
            {
                showSettings && (
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowSettings(false)}></div>
                )
            }

            {/* Floating Add Button */}
            <button
                onClick={() => setShowBatchOverlay(true)}
                className="fixed bottom-6 left-6 z-40 bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
                title="Add Multiple Stocks"
            >
                <Plus size={24} />
            </button>

            {/* Batch Add Overlay */}
            {
                showBatchOverlay && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl w-full max-w-md mx-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white">Add Multiple Stocks</h3>
                                <button onClick={() => setShowBatchOverlay(false)} className="text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-sm text-slate-400 mb-4">
                                Enter stock symbols separated by spaces or commas (e.g., AAPL MSFT, GOOGL).
                            </p>
                            <form onSubmit={handleBatchAdd}>
                                <textarea
                                    value={batchInput}
                                    onChange={(e) => setBatchInput(e.target.value)}
                                    placeholder="AAPL MSFT NVDA..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 h-32 resize-none"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowBatchOverlay(false)}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!batchInput.trim()}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Add Stocks
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default App;