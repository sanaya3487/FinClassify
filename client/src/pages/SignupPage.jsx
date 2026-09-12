import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { Wallet } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-mesh-light relative overflow-hidden">
      
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col items-center space-y-4 z-10">
        
        <div className="text-center space-y-2 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
            <Wallet className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Account</h1>
          <p className="text-xs text-slate-500 font-medium">Get started with financial statement classification</p>
        </div>

        {/* Native Official Clerk SignUp Component */}
        <div className="shadow-2xl rounded-3xl overflow-hidden">
          <SignUp routing="virtual" />
        </div>

      </div>

    </div>
  );
}
