import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { PieChart as PieIcon, TrendingUp, Layers } from 'lucide-react';

const COLOR_PALETTE = [
  '#4F46E5', '#10B981', '#F43F5E', '#8B5CF6', '#F59E0B',
  '#EC4899', '#0284C7', '#0D9488', '#65A30D', '#0891B2', '#64748B', '#94A3B8'
];

export default function ChartsSection({ categoryBreakdown = [], monthlyTrends = [] }) {
  const totalExpenseSum = categoryBreakdown.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);

  const pieData = categoryBreakdown.map((item, idx) => ({
    name: item.category_name,
    value: parseFloat(item.total_amount),
    color: item.category_color || COLOR_PALETTE[idx % COLOR_PALETTE.length],
    percentage: totalExpenseSum > 0 ? ((parseFloat(item.total_amount) / totalExpenseSum) * 100).toFixed(1) : '0'
  }));

  const areaData = monthlyTrends.map((item) => ({
    month: item.month,
    Spend: parseFloat(item.spend || 0),
    Income: parseFloat(item.income || 0)
  }));

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></span>
            <p className="font-bold text-slate-900">{data.name}</p>
          </div>
          <p className="text-indigo-600 font-mono font-bold text-sm">
            ₹{data.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">{data.percentage}% of total spend</p>
        </div>
      );
    }
    return null;
  };

  const CustomAreaTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xl text-xs space-y-1.5">
          <p className="font-bold text-slate-900 border-b border-slate-100 pb-1 font-mono">{label}</p>
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-slate-900">
                ₹{entry.value.toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Category Spend Donut Chart */}
      <div className="lg:col-span-5 glass-card rounded-3xl p-6 flex flex-col justify-between relative shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Category Breakdown</h3>
              <p className="text-[11px] text-slate-500 font-medium">Spending distribution across categories</p>
            </div>
          </div>
        </div>

        {pieData.length > 0 ? (
          <div className="h-64 w-full relative flex items-center justify-center">
            
            {/* Center Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center z-10">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Total Spend</span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                ₹{totalExpenseSum > 100000 ? `${(totalExpenseSum / 1000).toFixed(1)}k` : totalExpenseSum.toLocaleString('en-IN')}
              </span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={92}
                  paddingAngle={4}
                  dataKey="value"
                  cornerRadius={4}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 text-xs space-y-1">
            <Layers className="w-8 h-8 text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No Statement Uploaded</p>
            <p className="text-[11px] text-slate-500">Upload a CSV bank statement to view category chart.</p>
          </div>
        )}

        {/* Legend Pills */}
        {pieData.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 max-h-32 overflow-y-auto pr-1">
            {pieData.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                  <span className="text-slate-800 font-bold truncate text-[11px]">{cat.name}</span>
                </div>
                <span className="font-mono text-[10px] text-indigo-700 font-bold shrink-0 ml-1">{cat.percentage}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Cash Flow Trend Chart */}
      <div className="lg:col-span-7 glass-card rounded-3xl p-6 flex flex-col justify-between relative shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Monthly Cash Flow Trend</h3>
              <p className="text-[11px] text-slate-500 font-medium">Debits vs Credits over time</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Debits
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Credits
            </span>
          </div>
        </div>

        {areaData.length > 0 ? (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradientLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="incomeGradientLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area type="monotone" dataKey="Spend" stroke="#F43F5E" strokeWidth={3} fillOpacity={1} fill="url(#spendGradientLight)" />
                <Area type="monotone" dataKey="Income" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#incomeGradientLight)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex flex-col items-center justify-center text-center text-slate-400 text-xs space-y-1">
            <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No Monthly Data</p>
            <p className="text-[11px] text-slate-500">Upload statement to view trends.</p>
          </div>
        )}
      </div>

    </div>
  );
}
