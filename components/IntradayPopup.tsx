
import React, { useEffect, useState } from 'react';
import { Stock, NewsItem } from '../types';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { fetchQuickNews } from '../services/geminiService';
import { Sparkles, Loader2, ExternalLink } from 'lucide-react';

interface IntradayPopupProps {
  stock: Stock;
  rect: DOMRect | null;
  fmpApiKey?: string;
}

export const IntradayPopup: React.FC<IntradayPopupProps> = ({ stock, rect, fmpApiKey }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchQuickNews(stock.symbol, fmpApiKey).then(data => {
      if (mounted) {
        setNews(data.slice(0, 2)); // Show only top 2 for space
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [stock.symbol, fmpApiKey]);

  if (!rect) return null;

  // Simple positioning logic to keep it on screen
  const top = rect.top - 320 < 0 ? rect.bottom + 10 : rect.top - 320;
  const left = Math.min(Math.max(10, rect.left + rect.width / 2 - 150), window.innerWidth - 310);

  const isPositive = stock.changePercent >= 0;

  return (
    <div
      className="fixed z-50 w-[300px] bg-slate-800 rounded-xl shadow-2xl border border-slate-600 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      style={{ top, left }}
    >
      {/* Header */}
      <div className="p-3 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-white text-lg">{stock.symbol}</h3>
          <span className="text-xs text-slate-400">{stock.name}</span>
        </div>
        <div className={`text-right ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          <div className="font-mono font-bold text-lg">{stock.price.toFixed(2)}</div>
          <div className="text-xs">{stock.changePercent > 0 ? '+' : ''}{stock.changePercent}%</div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="h-32 w-full bg-slate-900/50 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stock.history}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? "#10b981" : "#f43f5e"}
              fillOpacity={1}
              fill="url(#colorPrice)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Historical Metrics Grid */}
      <div className="px-3 py-2 grid grid-cols-3 gap-2 border-b border-slate-700 bg-slate-900/30">
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
            <div key={i} className="flex flex-col items-center">
              <span className="text-[9px] text-slate-500 uppercase">{m.label}</span>
              <span className={`text-[10px] font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPos ? '+' : ''}{m.val.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Highlights */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
          <Sparkles size={12} />
          <span>{fmpApiKey ? 'Latest News' : 'AI Highlights'}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-500" /></div>
        ) : (
          <div className="space-y-2">
            {news.map((item, idx) => {
              const Wrapper = item.url ? 'a' : 'div';
              const props = item.url ? { href: item.url, target: "_blank", rel: "noopener noreferrer" } : {};

              return (
                <Wrapper
                  key={idx}
                  {...props}
                  className={`text-xs text-slate-300 border-l-2 border-slate-600 pl-2 line-clamp-2 block ${item.url ? 'hover:text-indigo-300 hover:border-indigo-500 transition-colors cursor-pointer' : ''}`}
                >
                  {item.headline} {item.url && <ExternalLink className="inline ml-1 opacity-50" size={8} />}
                </Wrapper>
              );
            })}
            {news.length === 0 && <div className="text-xs text-slate-500 italic">No news available.</div>}
          </div>
        )}
      </div>
    </div>
  );
};
