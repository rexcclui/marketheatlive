import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { Stock } from '../types';
import { StockTile } from './StockTile';

interface StockHeatmapProps {
  stocks: Stock[];
  width: number;
  height: number;
  onPressHold: (stock: Stock, rect: DOMRect) => void;
  onRelease: () => void;
  onClick: (stock: Stock) => void;
  onDragStart: (e: React.DragEvent, stock: Stock) => void;
  onDragEnd: () => void;
  onCombineStocks: (sourceSymbol: string, targetSymbol: string) => void;
  showChart?: boolean;
}

export const StockHeatmap: React.FC<StockHeatmapProps> = ({ 
  stocks, 
  width, 
  height,
  onPressHold,
  onRelease,
  onClick,
  onDragStart,
  onDragEnd,
  onCombineStocks,
  showChart
}) => {
  
  const root = useMemo(() => {
    if (stocks.length === 0) return null;

    // Size determined by "change in a week time" magnitude.
    // We add a small base to prevent 0 size.
    const hierarchyData = {
      name: "Market",
      children: stocks
    };

    const hierarchy = d3.hierarchy(hierarchyData)
      .sum((d: any) => {
        // If d is a stock (has weeklyChangePercent)
        if (d.weeklyChangePercent !== undefined) {
             return Math.abs(d.weeklyChangePercent) + 0.5; // Base size + magnitude
        }
        return 0;
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3.treemap()
      .size([width, height])
      .padding(2)
      .round(true);

    return treemap(hierarchy);
  }, [stocks, width, height]); // Re-calculate when stocks array reference changes (data updates)

  if (!root) return <div>No Data</div>;

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900 rounded-lg shadow-2xl border border-slate-800">
        {root.leaves().map((leaf: any) => (
            <StockTile
                key={leaf.data.symbol}
                stock={leaf.data}
                x={leaf.x0}
                y={leaf.y0}
                width={leaf.x1 - leaf.x0}
                height={leaf.y1 - leaf.y0}
                onPressHold={onPressHold}
                onRelease={onRelease}
                onClick={onClick}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onCombineStocks={onCombineStocks}
                showChart={showChart}
            />
        ))}
    </div>
  );
};