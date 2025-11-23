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
  sizeMetric?: 'weeklyChangePercent' | 'marketCap' | 'oneMonthChangePercent' | 'sixMonthChangePercent' | 'none';
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
  sizeMetric = 'none'
}) => {
  const tileRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHeldRef = useRef(false);
  const [isDragTarget, setIsDragTarget] = useState(false);

  // Color logic based on daily change percent
  const isPositive = stock.changePercent >= 0;
  const bgColor = isPositive
    ? `rgba(16, 185, 129, ${Math.min(Math.abs(stock.changePercent) / 3 + 0.3, 0.9)})` // Emerald
    : `rgba(244, 63, 94, ${Math.min(Math.abs(stock.changePercent) / 3 + 0.3, 0.9)})`; // Rose

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
    isHeldRef.current = false;
    timeoutRef.current = setTimeout(() => {
      if (tileRef.current) {
        isHeldRef.current = true;
        const rect = tileRef.current.getBoundingClientRect();
        onPressHold(stock, rect);
      }
    }, 500); // 500ms press to hold
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (isHeldRef.current) {
      onRelease();
    } else {
      onClick(stock);
    }
    isHeldRef.current = false;
  };

  const handleLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (isHeldRef.current) {
      onRelease();
    }
    isHeldRef.current = false;
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
      `}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleLeave}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
    >
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

      <div className="z-10 flex flex-col items-center pointer-events-none">
        <div className="font-bold tracking-tighter drop-shadow-md" style={{ fontSize: `${fontSize * 1.2}px` }}>
          {stock.symbol}
        </div>

        {showDetail && (
          <>
            <div className="font-mono mt-1 opacity-95 drop-shadow-md" style={{ fontSize: `${fontSize}px` }}>
              {stock.price.toFixed(2)}
            </div>
            <div
              className={`flex items-center gap-0.5 font-bold drop-shadow-md ${isPositive ? 'text-green-50' : 'text-red-50'}`}
              style={{ fontSize: `${fontSize * 0.9}px` }}
            >
              {isPositive ? <TrendingUp size={fontSize} /> : <TrendingDown size={fontSize} />}
              {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </div>
          </>
        )}
      </div>
    </div>
  );
};