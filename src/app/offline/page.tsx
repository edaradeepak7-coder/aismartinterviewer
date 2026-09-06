'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WifiOff, RefreshCw, Home, LifeBuoy } from 'lucide-react';

export default function OfflinePage() {
  const [mounted, setMounted] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location?.reload();
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#060E22] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-slate-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div
        className={`relative z-10 w-full max-w-xl transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg shadow-teal-500/20 opacity-60">
              <Image src="/assets/images/app_logo.png" alt="App logo" width={22} height={22} className="object-contain" />
            </div>
            <span className="text-white/60 font-700 text-lg tracking-tight">AI Smart Interviewer</span>
          </div>
        </div>

        {/* Offline card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 sm:p-12 text-center backdrop-blur-sm">
          {/* Animated wifi icon */}
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
              <WifiOff size={36} className="text-slate-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#060E22] animate-pulse" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-slate-500/10 border border-slate-500/20 rounded-full px-3 py-1 mb-4">
            <span className="text-slate-400 text-xs font-600">No Internet Connection</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-700 text-white mb-3">You're Offline</h1>
          <p className="text-white/50 text-sm mb-8 max-w-md mx-auto leading-relaxed">
            It looks like you've lost your internet connection. Check your network settings and try again.
          </p>

          {/* Tips */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-8 text-left">
            <p className="text-white/40 text-xs font-600 uppercase tracking-widest mb-3">Troubleshooting Tips</p>
            <ul className="space-y-2">
              {[
                'Check your Wi-Fi or mobile data connection',
                'Try disabling and re-enabling your network adapter',
                'Move closer to your router if on Wi-Fi',
                'Contact your network administrator if on a corporate network',
              ]?.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-white/50 text-xs">
                  <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-700 flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-600 text-sm transition-all duration-200 shadow-lg shadow-teal-500/20"
            >
              <RefreshCw size={15} className={retrying ? 'animate-spin' : ''} />
              {retrying ? 'Checking...' : 'Retry Connection'}
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white px-5 py-2.5 rounded-xl font-500 text-sm transition-all duration-200"
            >
              <Home size={15} />
              Back to Dashboard
            </Link>
          </div>

          <Link
            href="/support"
            className="inline-flex items-center gap-2 text-teal-400/50 hover:text-teal-400 text-xs transition-colors"
          >
            <LifeBuoy size={12} />
            Need help? Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
