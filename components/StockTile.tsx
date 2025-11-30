import React, { useRef, useState, useMemo } from 'react';
import { Stock } from '../types';
import { TrendingUp, TrendingDown, GitCompareArrows } from 'lucide-react';

interface StockTileProps {
  stock: Stock;
  width: number;
  height: number;
  x: number;
  y: number;
  onPressHold: (stock: Stock, rect: DOMRect) => void;
  onRelease: () => void;
  onClick: (stock: Stock) => void;
  onDragStart: (e: React.DragEvent, stock: Stock) => void;
  onDragEnd: () => void;
  onCombineStocks?: (sourceSymbol: string, targetSymbol: string) => void;
  showChart?: boolean;
  showPositions?: boolean;
  sizeMetric?: 'weeklyChangePercent' | 'marketCap' | 'oneMonthChangePercent' | 'threeMonthChangePercent' | 'sixMonthChangePercent' | 'position' | 'none';
  colorMetric?: 'change1m' | 'change15m' | 'change30m' | 'change1h' | 'change4h' | 'changePercent' | 'weeklyChangePercent' | 'twoWeekChangePercent' | 'oneMonthChangePercent' | 'threeMonthChangePercent' | 'sixMonthChangePercent' | 'oneYearChangePercent' | 'threeYearChangePercent' | 'fiveYearChangePercent';
}


export const StockTile: React.FC<StockTileProps> = ({
  stock,
  width,
  height,
  x,
  y,
  onPressHold,
  onRelease,
  onClick,
  onDragStart,
  onDragEnd,
  onCombineStocks,
  showChart = false,
  showPositions = true,
  sizeMetric = 'none',
  colorMetric = 'changePercent'
}) => {
  const tileRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHeldRef = useRef(false);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isNewlyAdded, setIsNewlyAdded] = useState(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isTouchScrolling = useRef(false);

  // Check if stock was recently added (within last 5 seconds)
  React.useEffect(() => {
    if (stock.addedAt) {
      const timeSinceAdded = Date.now() - stock.addedAt;
      if (timeSinceAdded < 5000) {
        setIsNewlyAdded(true);
        const timer = setTimeout(() => {
          setIsNewlyAdded(false);
        }, 5000 - timeSinceAdded);
        return () => clearTimeout(timer);
      }
    }
  }, [stock.addedAt]);

  // Color logic based on selected color metric
  const colorValue = stock[colorMetric] ?? 0;
  const isPositive = colorValue >= 0;
  const bgColor = isPositive
    ? `rgba(16, 185, 129, ${Math.min(Math.abs(colorValue) / 3 + 0.3, 0.9)})` // Emerald
    : `rgba(244, 63, 94, ${Math.min(Math.abs(colorValue) / 3 + 0.3, 0.9)})`; // Rose

  // Sparkline calculation
  const sparklinePath = useMemo(() => {
    if (!showChart || !stock.history || stock.history.length < 2) return '';

    const prices = stock.history.map(h => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    // Scale to fit nicely in the tile with some padding
    const padding = 4;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const points = prices.map((price, i) => {
      const xPos = (i / (prices.length - 1)) * w + padding;
      const yPos = h - ((price - min) / range) * h + padding;
      return `${xPos.toFixed(1)},${yPos.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  }, [stock.history, width, height, showChart]);



  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    // For touch devices, keep the press-hold behavior
    if ('touches' in e) {
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      isTouchScrolling.current = false;

      isHeldRef.current = false;
      timeoutRef.current = setTimeout(() => {
        if (tileRef.current && !isTouchScrolling.current) {
          isHeldRef.current = true;
          const rect = tileRef.current.getBoundingClientRect();
          onPressHold(stock, rect);
        }
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartPos.current && 'touches' in e) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

      // If moved more than 10px, consider it scrolling
      if (deltaX > 10 || deltaY > 10) {
        isTouchScrolling.current = true;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    }
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (isHeldRef.current) {
      onRelease();
    } else if (!isTouchScrolling.current) {
      onClick(stock);
    }
    isHeldRef.current = false;
    touchStartPos.current = null;
    isTouchScrolling.current = false;
  };

  const handleLeave = () => {
    setIsHovered(false);
    onRelease(); // Close popup on mouse leave
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (isHeldRef.current) {
      onRelease();
    }
    isHeldRef.current = false;
  };

  const handleEnter = () => {
    setIsHovered(true);
    // Trigger popup immediately on mouseover (desktop only)
    if (tileRef.current) {
      const rect = tileRef.current.getBoundingClientRect();
      onPressHold(stock, rect);
    }
  };


  const handleDragStartInternal = (e: React.DragEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isHeldRef.current = false;
    onDragStart(e, stock);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.stopPropagation();
    if (!isDragTarget) setIsDragTarget(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragTarget(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragTarget(false);

    const sourceSymbol = e.dataTransfer.getData('text/plain');
    if (sourceSymbol && sourceSymbol !== stock.symbol && onCombineStocks) {
      onCombineStocks(sourceSymbol, stock.symbol);
    }
  };

  // Font scaling based on tile size
  const fontSize = Math.min(width / 5, height / 5, 16);
  const showDetail = width > 60 && height > 40;

  // Layout thresholds
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isNarrow = width < height; // Narrow/tall tiles
  const showVerticalList = !isMobile && width > 140 && height >= 200;
  const showHorizontalList = width > 120 && height > 100;

  const renderChange = (label: string, value: number | undefined, metricKey?: string) => {
    if (value === undefined || value === null) return null;
    const isPos = value >= 0;
    const isSelected = metricKey && colorMetric === metricKey;

    // Create simple tooltip - just describe what it represents
    const tooltipText = `Last ${label}`;

    return (
      <div className="flex items-center" title={tooltipText}>
        <span className={`${isPos ? 'text-green-300' : 'text-rose-300'} font-bold ${isSelected ? 'text-[14px] font-extrabold underline' : 'text-[10px]'}`}>
          {isPos ? '+' : ''}{value.toFixed(1)}%
        </span>
      </div>
    );
  };

  const renderIntradayChange = (label: string, value: number | undefined) => {
    if (value === undefined || value === null) return null;
    const isPos = value >= 0;
    const isSignificant = Math.abs(value) > 1; // Highlight if change is greater than 1%

    // Use more prominent colors for significant moves
    const colorClass = isSignificant
      ? (isPos ? 'text-green-400' : 'text-red-400') // Brighter, more saturated
      : (isPos ? 'text-green-300' : 'text-rose-300'); // Standard colors

    // Create simple tooltip - just describe what it represents
    const tooltipText = `Last ${label}`;

    return (
      <div className="flex flex-col items-center gap-0.5" title={tooltipText}>
        <span className={`${colorClass} font-bold ${isSignificant ? 'text-[12px] animate-pulse' : 'text-[10px]'}`}>
          {isPos ? '+' : ''}{value.toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div
      ref={tileRef}
      draggable={true}
      onDragStart={handleDragStartInternal}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width - 2, // Gap
        height: height - 2, // Gap
        backgroundColor: bgColor,
        transition: 'background-color 0.5s ease, left 0.5s ease, top 0.5s ease, width 0.5s ease, height 0.5s ease',
      }}
      className={`
        rounded-sm cursor-pointer flex flex-col items-center justify-center text-white overflow-hidden 
        border shadow-sm select-none active:scale-95 transition-transform relative
        ${isDragTarget ? 'border-indigo-400 border-4 scale-[1.02] z-50 brightness-110' : 'border-white/10 hover:border-white/40 hover:z-10'}
        ${isNewlyAdded ? 'animate-pulse border-yellow-400 border-2 brightness-125 z-40' : ''}
      `}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onTouchStart={handleStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleEnd}
    >
      {/* Position Value - Top Left */}
      {stock.shares && stock.shares > 0 && width > 60 && height >= 110 && showPositions && (
        <div
          className="absolute top-1 left-1 text-[10px] text-emerald-300 font-mono font-bold z-20 bg-black/40 px-1 rounded backdrop-blur-sm"
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
        >
          ${(stock.positionValue || stock.price * stock.shares).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}

      {/* Last Update Timestamp - Top Right */}
      {stock.lastUpdated && width > 100 && height >= 110 && (
        <div className="absolute top-1 right-1 text-[8px] text-white/50 font-mono pointer-events-none z-20">
          {(() => {
            const date = new Date(stock.lastUpdated);
            const yy = String(date.getFullYear()).slice(-2);
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const mi = String(date.getMinutes()).padStart(2, '0');
            return `${yy}-${mm}-${dd}, ${hh}:${mi}`;
          })()}
        </div>
      )}

      {/* Logo */}

      {/* Background Chart */}
      {showChart && (
        <svg className="absolute inset-0 pointer-events-none opacity-40" width={width} height={height}>
          <path d={sparklinePath} fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      {isDragTarget && (
        <div className="absolute inset-0 bg-indigo-900/50 flex items-center justify-center z-20 backdrop-blur-sm pointer-events-none">
          <GitCompareArrows className="text-white animate-bounce" size={Math.min(width, height) / 3} />
        </div>
      )}

      <div className="z-10 flex flex-col items-center">
        <div className="flex items-center gap-1 font-bold tracking-tighter drop-shadow-md" style={{ fontSize: `${fontSize * 1.2}px` }}>
          {stock.logoUrl && width > 80 && (
            <img
              src={stock.logoUrl}
              alt=""
              className="object-contain rounded-sm bg-white/10"
              style={{ width: `${fontSize * 1.5}px`, height: `${fontSize * 1.5}px` }}
            />
          )}
          {stock.symbol}
        </div>

        {showDetail && (
          <>
            {/* Price and Change - wrap to column for narrow tiles */}
            <div className={`flex gap-2 mt-0.5 ${isNarrow ? 'flex-col items-center' : showHorizontalList ? 'items-center flex-row' : 'flex-col items-center'}`}>
              <div className="font-mono opacity-95 drop-shadow-md" style={{ fontSize: `${fontSize}px` }}>
                {stock.price.toFixed(2)}
              </div>
              <div
                className={`flex items-center gap-0.5 font-bold drop-shadow-md ${isPositive ? 'text-green-50' : 'text-red-50'}`}
                style={{ fontSize: `${fontSize * 0.9}px` }}
              >
                {isPositive ? <TrendingUp size={fontSize} /> : <TrendingDown size={fontSize} />}
                {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </div>
            </div>

            {/* Intraday Changes - wrap to 2 rows for narrow tiles */}
            {showHorizontalList && (
              <div className={`flex items-center gap-2 mt-2 bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm pointer-events-auto ${isNarrow ? 'flex-wrap max-w-full justify-center' : ''}`}>
                {renderIntradayChange('1m', stock.change1m)}
                {renderIntradayChange('15m', stock.change15m)}
                {renderIntradayChange('30m', stock.change30m)}
                {!isMobile && renderIntradayChange('1h', stock.change1h)}
                {!isMobile && renderIntradayChange('4h', stock.change4h)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Historical Changes - wrap to 2 rows for narrow tiles */}
      {showVerticalList && (
        <div className={`absolute bottom-1 left-1 right-1 flex items-center justify-center gap-2 bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm ${isNarrow ? 'flex-wrap' : ''}`}>
          {renderChange('7D', stock.weeklyChangePercent, 'weeklyChangePercent')}
          {renderChange('14D', stock.twoWeekChangePercent, 'twoWeekChangePercent')}
          {renderChange('1M', stock.oneMonthChangePercent, 'oneMonthChangePercent')}
          {renderChange('3M', stock.threeMonthChangePercent, 'threeMonthChangePercent')}
          {renderChange('6M', stock.sixMonthChangePercent, 'sixMonthChangePercent')}
          {renderChange('1Y', stock.oneYearChangePercent, 'oneYearChangePercent')}
        </div>
      )}

      {/* Hover Overlay for Small Tiles */}
      {!showDetail && isHovered && (
        <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center z-30 p-1 text-center animate-in fade-in duration-200 border border-slate-700">
          <div className="font-bold text-white text-xs mb-0.5">{stock.symbol}</div>
          <div className="font-mono text-xs text-slate-300">{stock.price.toFixed(2)}</div>
          <div className={`text-[10px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
          </div>
        </div>
      )}
    </div>
  );
};