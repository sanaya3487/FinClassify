import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, UploadCloud, LogOut } from 'lucide-react';

export default function Navbar({ onOpenUpload }) {
  const { user, logout } = useAuth();

  return (
    <header className="glass-header sticky top-0 z-40 px-4 sm:px-8 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-slate-900">FinClassify</h1>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Bank Statement Classification & Financial Analytics</p>
          </div>
        </div>

        {/* Navigation & Action Buttons */}
        <div className="flex items-center gap-3">
          
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Statement</span>
          </button>

          {/* User Session Profile */}
          {user && (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{user.email}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> {user.isClerk ? 'Clerk Session' : 'Active Session'}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-all cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
