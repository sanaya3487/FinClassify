import React, { useState } from 'react';
import api from '../services/api';
import { Sliders, X, Check, Loader2 } from 'lucide-react';

export default function ColumnMapperModal({ mappingData, onClose, onSuccess }) {
  if (!mappingData) return null;

  const { uploadId, headers = [], fileToUpload } = mappingData;

  const [dateCol, setDateCol] = useState(headers[0] || '');
  const [narrationCol, setNarrationCol] = useState(headers[1] || '');
  const [debitCol, setDebitCol] = useState(headers[2] || '');
  const [creditCol, setCreditCol] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmitMapping = async () => {
    if (!dateCol || !narrationCol || !debitCol) {
      setError('Please select Date, Description/Narration, and Debit columns');
      return;
    }

    setSubmitting(true);
    setError('');

    const formData = new FormData();
    if (fileToUpload) {
      formData.append('statement', fileToUpload);
    }
    formData.append('dateCol', dateCol);
    formData.append('narrationCol', narrationCol);
    formData.append('debitCol', debitCol);
    formData.append('creditCol', creditCol);

    try {
      await api.post(`/uploads/${uploadId}/map`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSubmitting(false);
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitting(false);
      setError(err.response?.data?.error || 'Failed to submit column mapping');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl p-7 relative border border-slate-200 shadow-2xl space-y-5">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Configure CSV Columns</h2>
            <p className="text-xs text-slate-500 font-medium">Match your bank CSV column headers manually</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-4 text-xs font-bold text-slate-700">
          
          <div>
            <label className="block mb-1.5 uppercase text-[11px] tracking-wider text-slate-500 font-extrabold">Date Column *</label>
            <select
              value={dateCol}
              onChange={(e) => setDateCol(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
            >
              {headers.map((h, i) => (
                <option key={i} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1.5 uppercase text-[11px] tracking-wider text-slate-500 font-extrabold">Narration / Description Column *</label>
            <select
              value={narrationCol}
              onChange={(e) => setNarrationCol(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
            >
              {headers.map((h, i) => (
                <option key={i} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1.5 uppercase text-[11px] tracking-wider text-slate-500 font-extrabold">Debit / Withdrawal Column *</label>
            <select
              value={debitCol}
              onChange={(e) => setDebitCol(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
            >
              {headers.map((h, i) => (
                <option key={i} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1.5 uppercase text-[11px] tracking-wider text-slate-500 font-extrabold">Credit / Deposit Column (Optional)</label>
            <select
              value={creditCol}
              onChange={(e) => setCreditCol(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
            >
              <option value="">-- None --</option>
              {headers.map((h, i) => (
                <option key={i} value={h}>{h}</option>
              ))}
            </select>
          </div>

        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitMapping}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Apply Mapping</span>
          </button>
        </div>

      </div>
    </div>
  );
}
