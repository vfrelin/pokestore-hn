import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PriceChart({ history = [], exchangeRate = 25 }) {
  if (!history || history.length === 0) return null;

  const firstPrice = history[0]?.price || 0;
  const lastPrice = history[history.length - 1]?.price || 0;
  const diff = lastPrice - firstPrice;
  const percentChange = firstPrice > 0 ? ((diff / firstPrice) * 100).toFixed(1) : 0;
  const isPositive = diff >= 0;

  const data = history.map(item => ({
    date: item.date,
    usd: item.price,
    hnl: Number((item.price * exchangeRate).toFixed(2))
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const p = payload[0].value;
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-2.5 rounded-xl shadow-xl text-xs backdrop-blur-md">
          <p className="font-semibold text-slate-400 mb-1">{label}</p>
          <p className="text-emerald-400 font-bold text-sm">
            ${p.toFixed(2)} USD
          </p>
          <p className="text-amber-400 font-medium">
            L. {(p * exchangeRate).toLocaleString('es-HN', { minimumFractionDigits: 2 })} HNL
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Historial de Mercado (USA)</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-lg font-extrabold text-white">${lastPrice.toFixed(2)} USD</span>
            <span className="text-xs text-amber-400 font-semibold">~L. {(lastPrice * exchangeRate).toFixed(2)}</span>
          </div>
        </div>

        <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
          isPositive 
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
        }`}>
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{isPositive ? `+${percentChange}%` : `${percentChange}%`} (30d)</span>
        </div>
      </div>

      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={['dataMin - 1', 'dataMax + 1']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="usd" 
              stroke={isPositive ? "#10b981" : "#f43f5e"} 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill="url(#priceGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
