'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, RefreshCw, LifeBuoy, AlertTriangle } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleCopyError = () => {
    const msg = error?.digest ? `Error ID: ${error.digest}` : 'An unexpected error occurred';
    if (typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(msg).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#060E22] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div
        className={`relative z-10 w-full max-w-xl transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Image src="/assets/images/app_logo.png" alt="App logo" width={22} height={22} className="object-contain" />
            </div>
            <span className="text-white font-700 text-lg tracking-tight">AI Smart Interviewer</span>
          </Link>
        </div>

        {/* Error card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 sm:p-12 text-center backdrop-blur-sm">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle size={36} className="text-red-400" />
            </div>
          </div>

          {/* Error code */}
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1 mb-4">
            <span className="text-red-400 text-xs font-600">500 — Server Error</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-700 text-white mb-3">Something Went Wrong</h1>
          <p className="text-white/50 text-sm mb-6 max-w-md mx-auto leading-relaxed">
            An unexpected error occurred on our end. Our team has been notified. Please try again or return to the dashboard.
          </p>

          {/* Error digest (safe to show) */}
          {error?.digest && (
            <button
              onClick={handleCopyError}
              className="inline-flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 rounded-lg px-3 py-1.5 mb-6 transition-colors"
            >
              <span className="text-white/30 text-[11px] font-mono">
                {copied ? 'Copied!' : `Error ID: ${error.digest}`}
              </span>
            </button>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 text-white px-5 py-2.5 rounded-xl font-600 text-sm transition-all duration-200 shadow-lg shadow-teal-500/20"
            >
              <RefreshCw size={15} />
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white px-5 py-2.5 rounded-xl font-500 text-sm transition-all duration-200"
            >
              <Home size={15} />
              Back to Dashboard
            </Link>
          </div>

          {/* Support link */}
          <div className="border-t border-white/10 pt-6">
            <Link
              href="/support"
              className="inline-flex items-center gap-2 text-teal-400/70 hover:text-teal-400 text-sm transition-colors"
            >
              <LifeBuoy size={14} />
              Contact Support if the issue persists
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
