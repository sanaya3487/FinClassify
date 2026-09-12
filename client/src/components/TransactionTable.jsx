import React, { useState } from 'react';
import api from '../services/api';
import { Search, Filter, Brain, ChevronLeft, ChevronRight, Loader2, Info, Edit3, Building2 } from 'lucide-react';

export default function TransactionTable({
  transactions = [],
  categories = [],
  pagination = {},
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onRecategorized,
  onPageChange
}) {
  const [updatingId, setUpdatingId] = useState(null);
  const [editingTxnId, setEditingTxnId] = useState(null);
  const [learnedNotice, setLearnedNotice] = useState('');

  const handleCategoryChange = async (txnId, newCategoryId) => {
    if (!newCategoryId) return;
    setUpdatingId(txnId);
    setEditingTxnId(null);
    setLearnedNotice('');

    try {
      const res = await api.patch(`/transactions/${txnId}`, { category_id: newCategoryId });
      setUpdatingId(null);
      setLearnedNotice(res.data.message || 'Learned! Rule saved to merchant map');

      setTimeout(() => setLearnedNotice(''), 4500);
      onRecategorized();
    } catch (err) {
      setUpdatingId(null);
      alert('Failed to update transaction category');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return dateStr.split('T')[0];
    } catch (e) {
      return dateStr.split('T')[0];
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
      
      {/* Toast Notice Banner */}
      {learnedNotice && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between shadow-md animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Brain className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="font-extrabold text-indigo-950 text-sm">Self-Improving Merchant Map Updated!</p>
              <p className="text-indigo-700 font-medium">{learnedNotice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search narrations (Swiggy, Electronics, Airtel, Uber...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 font-medium transition-all"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-semibold shrink-0">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-white">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-white">{c.name}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Clean Transaction Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-extrabold tracking-wider">
              <th className="py-3.5 px-5">Date</th>
              <th className="py-3.5 px-5">Bank Account</th>
              <th className="py-3.5 px-5">Narration / Payee</th>
              <th className="py-3.5 px-5">Category</th>
              <th className="py-3.5 px-5 text-right">Amount (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.length > 0 ? (
              transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors group">
                  
                  {/* Date */}
                  <td className="py-4 px-5 font-mono text-slate-600 whitespace-nowrap font-bold">
                    {formatDate(txn.txn_date)}
                  </td>

                  {/* Bank Name Pill */}
                  <td className="py-4 px-5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200 shadow-2xs">
                      <Building2 className="w-3 h-3 text-indigo-600" />
                      <span>{txn.bank_name || 'Bank Statement'}</span>
                    </span>
                  </td>

                  {/* Narration */}
                  <td className="py-4 px-5 max-w-xs">
                    <p className="font-extrabold text-slate-900 truncate leading-snug" title={txn.narration_raw}>
                      {txn.narration_raw}
                    </p>
                  </td>

                  {/* Category Pill (Clickable to Edit) */}
                  <td className="py-4 px-5 whitespace-nowrap">
                    {updatingId === txn.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    ) : editingTxnId === txn.id ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          autoFocus
                          value={txn.category_id || ''}
                          onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                          onBlur={() => setEditingTxnId(null)}
                          className="bg-white border border-indigo-500 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none shadow-sm"
                        >
                          <option value="">Select Category...</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditingTxnId(null)}
                          className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingTxnId(txn.id)}
                        className="group/btn px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 hover:opacity-80 transition-all cursor-pointer shadow-2xs"
                        style={{
                          backgroundColor: `${txn.category_color || '#9CA3AF'}15`,
                          color: txn.category_color || '#4B5563',
                          border: `1px solid ${txn.category_color || '#9CA3AF'}30`
                        }}
                        title="Click to change category"
                      >
                        <span>{txn.category_name || 'Uncategorized'}</span>
                        <Edit3 className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity text-slate-500" />
                      </button>
                    )}
                  </td>

                  {/* Amount */}
                  <td className={`py-4 px-5 text-right font-mono font-extrabold text-sm whitespace-nowrap ${
                    txn.txn_type === 'credit' ? 'text-emerald-600' : 'text-slate-900'
                  }`}>
                    {txn.txn_type === 'credit' ? '+' : ''}₹{parseFloat(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-16 text-center text-slate-400">
                  <div className="space-y-2">
                    <Info className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-extrabold text-slate-800">No Transactions Found</p>
                    <p className="text-xs text-slate-500 font-medium">Try clearing your filters or upload a statement CSV.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500 font-mono font-semibold">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-40 transition-all text-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-40 transition-all text-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
