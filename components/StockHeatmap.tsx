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
  sizeMetric: 'weeklyChangePercent' | 'marketCap' | 'oneMonthChangePercent' | 'threeMonthChangePercent' | 'sixMonthChangePercent' | 'none';
  colorMetric: 'change1m' | 'change15m' | 'change30m' | 'change1h' | 'change4h' | 'changePercent' | 'weeklyChangePercent' | 'twoWeekChangePercent' | 'oneMonthChangePercent' | 'threeMonthChangePercent' | 'sixMonthChangePercent' | 'oneYearChangePercent' | 'threeYearChangePercent' | 'fiveYearChangePercent';
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
  showChart,
  sizeMetric,
  colorMetric
}) => {

  const root = useMemo(() => {
    if (stocks.length === 0) return null;

    const hierarchyData = {
      name: "Market",
      children: stocks
    };

    const hierarchy = d3.hierarchy(hierarchyData)
      .sum((d: any) => {
        if (sizeMetric === 'none') return 1;

        // If d is a stock
        if (d.symbol) {
          if (sizeMetric === 'marketCap') {
            return d.marketCap || 1000000000; // Default to 1B if missing
          }
          const val = d[sizeMetric];
          if (val !== undefined) {
            return Math.abs(val) + 0.5; // Base size + magnitude
          }
        }
        return 0;
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3.treemap()
      .size([width, height])
      .padding(2)
      .round(true)
      .tile(d3.treemapResquarify.ratio(0.5)); // Prefer wider horizontal rectangles (ratio < 1)

    return treemap(hierarchy);
  }, [stocks, width, height, sizeMetric]); // Re-calculate when stocks array reference changes (data updates)

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
          sizeMetric={sizeMetric}
          colorMetric={colorMetric}
        />
      ))}
    </div>
  );
};