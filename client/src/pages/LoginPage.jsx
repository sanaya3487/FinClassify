import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Wallet } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-mesh-light relative overflow-hidden">
      
      {/* Background Glowing Elements */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col items-center space-y-4 z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
            <Wallet className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">FinClassify</h1>
          <p className="text-xs text-slate-500 font-medium">Bank Statement Classification & Financial Analytics</p>
        </div>

        {/* Native Official Clerk SignIn Widget - Reads all settings (Username, OTP, Google SSO) from Clerk Dashboard */}
        <div className="shadow-2xl rounded-3xl overflow-hidden">
          <SignIn routing="virtual" />
        </div>

      </div>

    </div>
  );
}
