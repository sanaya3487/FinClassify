import React from 'react';
import { TrendingDown, PieChart, ArrowUpRight, Building2 } from 'lucide-react';

export default function SummaryCards({ summary, categoryBreakdown = [] }) {
  const {
    totalSpend = 0,
    totalIncome = 0,
    totalTxns = 0,
    activeBanksCount = 0,
    activeBanks = [],
    topCategory = 'N/A',
    topMerchant = 'N/A'
  } = summary || {};

  const topCategoryData = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;
  const topCategoryAmount = topCategoryData ? parseFloat(topCategoryData.total_amount) : 0;
  const topCategoryPercentage = totalSpend > 0 && topCategoryAmount > 0 ? ((topCategoryAmount / totalSpend) * 100).toFixed(1) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      
      {/* Card 1: Total Expense */}
      <div className="glass-card glass-card-hover rounded-3xl p-6 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Total Expense</span>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-xs">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold text-rose-600">₹</span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </h2>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Processed</span>
          <span className="text-slate-900 font-bold font-mono">{totalTxns} items</span>
        </div>
      </div>

      {/* Card 2: Top Spend Category */}
      <div className="glass-card glass-card-hover rounded-3xl p-6 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Top Category Spend</span>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-xs">
            <PieChart className="w-5 h-5" />
          </div>
        </div>
        
        <h2 className="text-xl font-extrabold text-slate-900 block mb-1 truncate leading-snug">
          {topCategory}
        </h2>
        
        <p className="text-xs font-extrabold text-purple-700 font-mono block mb-2 leading-normal">
          ₹{topCategoryAmount.toLocaleString('en-IN')} <span className="text-[11px] text-slate-500 font-normal ml-1">({topCategoryPercentage}% of total)</span>
        </p>

        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Top Payee</span>
          <span className="text-slate-900 font-bold truncate max-w-[130px]">{topMerchant}</span>
        </div>
      </div>

      {/* Card 3: Total Credits / Income */}
      <div className="glass-card glass-card-hover rounded-3xl p-6 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Total Income / Credits</span>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold text-emerald-600">₹</span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </h2>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Net Balance</span>
          <span className={`font-bold font-mono ${totalIncome - totalSpend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ₹{(totalIncome - totalSpend).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Card 4: Uploaded Bank Accounts Card */}
      <div className="glass-card glass-card-hover rounded-3xl p-6 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Bank Accounts</span>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {activeBanksCount || 1}
          </h2>
          <span className="text-xs text-blue-700 font-bold">sources connected</span>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium truncate">
          <span>Banks</span>
          <span className="text-slate-900 font-bold font-mono truncate max-w-[140px]">
            {Array.isArray(activeBanks) && activeBanks.length > 0 ? activeBanks.join(', ') : 'HDFC, SBI'}
          </span>
        </div>
      </div>

    </div>
  );
}
