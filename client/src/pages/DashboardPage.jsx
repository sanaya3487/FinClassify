import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import SummaryCards from '../components/SummaryCards';
import ChartsSection from '../components/ChartsSection';
import TransactionTable from '../components/TransactionTable';
import UploadModal from '../components/UploadModal';
import ColumnMapperModal from '../components/ColumnMapperModal';
import { downloadDashboardPdf } from '../utils/pdfExporter';
import { RefreshCw, Calendar, Sparkles, Download, Loader2, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({});
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [page, setPage] = useState(1);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [mappingData, setMappingData] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const getDatesForMonth = (monthVal) => {
    if (!monthVal || monthVal === 'ALL') return { start_date: '', end_date: '' };
    try {
      const [yearStr, monthStr] = monthVal.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const lastDay = new Date(year, month, 0).getDate();
      const start_date = `${monthVal}-01`;
      const end_date = `${monthVal}-${lastDay < 10 ? '0' + lastDay : lastDay}`;
      return { start_date, end_date };
    } catch (e) {
      return { start_date: '', end_date: '' };
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchTransactionsData();
  }, [searchQuery, selectedCategory, selectedMonth, page]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.categories || []);
    } catch (e) {}
  };

  const fetchDashboardData = async () => {
    try {
      const { start_date, end_date } = getDatesForMonth(selectedMonth);
      const res = await api.get('/summary', {
        params: { start_date, end_date }
      });
      setSummary(res.data.summary || {});
      setCategoryBreakdown(res.data.categoryBreakdown || []);
      setMonthlyTrends(res.data.monthlyTrends || []);
    } catch (e) {
      console.error('Failed to fetch summary data');
    }
  };

  const fetchTransactionsData = async () => {
    try {
      const { start_date, end_date } = getDatesForMonth(selectedMonth);
      const params = {
        search: searchQuery,
        category_id: selectedCategory,
        start_date,
        end_date,
        page,
        limit: 25
      };
      const res = await api.get('/transactions', { params });
      setTransactions(res.data.transactions || []);
      setPagination(res.data.pagination || {});
    } catch (e) {
      console.error('Failed to fetch transactions');
    }
  };

  const handleRecategorized = () => {
    fetchDashboardData();
    fetchTransactionsData();
  };

  const handleExportCsv = async () => {
    try {
      const { start_date, end_date } = getDatesForMonth(selectedMonth);
      const params = {};
      if (selectedCategory) params.category_id = selectedCategory;
      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;

      const res = await api.get('/export/csv', {
        params,
        responseType: 'blob'
      });

      const monthSuffix = selectedMonth && selectedMonth !== 'ALL' ? `_${selectedMonth}` : '_All_Time';
      const fileName = `bank_statement_report${monthSuffix}.csv`;

      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 200);
    } catch (err) {
      alert('Failed to download CSV export');
    }
  };

  const handleDownloadClientPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await handleExportPdfServer();
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportPdfServer = async () => {
    try {
      const { start_date, end_date } = getDatesForMonth(selectedMonth);
      const params = {};
      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;

      const res = await api.get('/export/pdf', {
        params,
        responseType: 'blob'
      });

      const monthSuffix = selectedMonth && selectedMonth !== 'ALL' ? `_${selectedMonth}` : '';
      const fileName = `bank_statement_report${monthSuffix}.pdf`;

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 200);
    } catch (err) {
      alert('Failed to download PDF report document');
    }
  };

  const formatMonthName = (monthStr) => {
    if (!monthStr || monthStr === 'ALL') return 'All Time';
    try {
      const [year, month] = monthStr.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch (e) {
      return monthStr;
    }
  };

  return (
    <div className="min-h-screen bg-mesh-light text-slate-900 pb-20 selection:bg-indigo-600 selection:text-white">
      
      {/* Navbar */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-8">
        
        {/* Header Bar with Month Filter & Download Report Dropdown */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Expense Dashboard</h1>
            <p className="text-xs text-slate-500 font-medium">Automatic classification, self-improving memory & PDF exports</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Month Selector Filter */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-xs text-xs text-slate-700 font-bold">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-slate-400 font-medium">Period:</span>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-extrabold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Time</option>
                {monthlyTrends.map((m) => (
                  <option key={m.month} value={m.month}>
                    {formatMonthName(m.month)}
                  </option>
                ))}
              </select>
            </div>

            {/* Unified Download Report Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setIsReportMenuOpen(!isReportMenuOpen)}
                disabled={isGeneratingPdf}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Report</span>
                    <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                  </>
                )}
              </button>

              {/* Dropdown Menu */}
              {isReportMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-2xl py-1.5 z-50 animate-fadeIn">
                  <button
                    onClick={() => {
                      setIsReportMenuOpen(false);
                      handleDownloadClientPdf();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <p className="font-extrabold text-slate-900">PDF Report</p>
                      <p className="text-[10px] text-slate-400 font-normal">Visual multi-page PDF document</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsReportMenuOpen(false);
                      handleExportCsv();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-t border-slate-100 text-left cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-extrabold text-slate-900">CSV Export</p>
                      <p className="text-[10px] text-slate-400 font-normal">Excel spreadsheet data file</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => { fetchDashboardData(); fetchTransactionsData(); }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw className="w-4 h-4 text-indigo-600" />
            </button>
          </div>
        </div>

        {/* Active Month Banner indicator if month filtered */}
        {selectedMonth !== 'ALL' && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-indigo-900 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 font-bold">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Showing analytics filtered for: <span className="underline decoration-indigo-400 underline-offset-2">{formatMonthName(selectedMonth)}</span></span>
            </div>
            <button
              onClick={() => setSelectedMonth('ALL')}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-extrabold underline"
            >
              Clear Month Filter ✕
            </button>
          </div>
        )}

        {/* --- REPORT CONTAINER CAPTURED FOR CLIENT PDF EXPORT --- */}
        <div id="dashboard-report-content" className="space-y-8 pb-4">
          
          {/* Report Header Banner */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <h2 className="text-base font-extrabold text-white block mb-1 leading-snug">
                Bank Statement & Expense Intelligence Report
              </h2>
              <p className="text-xs text-slate-300 font-medium block leading-normal">
                Account: {user?.email || 'User'} &nbsp;|&nbsp; Period: {formatMonthName(selectedMonth)}
              </p>
            </div>
            <div className="text-left sm:text-right font-mono text-[11px] text-slate-400 font-bold shrink-0">
              Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>

          {/* 1. Summary KPI Cards */}
          <SummaryCards
            summary={summary}
            categoryBreakdown={categoryBreakdown}
          />

          {/* 2. Visual Charts (Recharts Donut + Cashflow Area Chart) */}
          <ChartsSection
            categoryBreakdown={categoryBreakdown}
            monthlyTrends={monthlyTrends}
          />

          {/* 3. Transaction Table (Includes Bank Account Column) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Statement Transactions
              </h2>
              <span className="text-xs text-slate-500 font-mono font-bold px-3 py-1 rounded-full bg-white border border-slate-200 shadow-xs">
                {pagination.total || 0} parsed records
              </span>
            </div>

            <TransactionTable
              transactions={transactions}
              categories={categories}
              pagination={pagination}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onRecategorized={handleRecategorized}
              onPageChange={(p) => setPage(p)}
            />
          </div>

        </div>

      </main>

      {/* Upload Dropzone Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchDashboardData();
          fetchTransactionsData();
        }}
        onRequestMapping={(data) => setMappingData(data)}
      />

      {/* Column Mapper Modal */}
      <ColumnMapperModal
        mappingData={mappingData}
        onClose={() => setMappingData(null)}
        onSuccess={() => {
          fetchDashboardData();
          fetchTransactionsData();
        }}
      />

    </div>
  );
}
