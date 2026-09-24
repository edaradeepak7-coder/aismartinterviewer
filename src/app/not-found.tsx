'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Home, ArrowLeft, LifeBuoy, BarChart2, Users, BookOpen } from 'lucide-react';

const RECOVERY_LINKS = [
  { href: '/', label: 'Dashboard', icon: <Home size={15} />, desc: 'Return to your main dashboard' },
  { href: '/support', label: 'Support', icon: <LifeBuoy size={15} />, desc: 'Raise a support ticket' },
  { href: '/interviews', label: 'Interviews', icon: <BarChart2 size={15} />, desc: 'View your interviews' },
  { href: '/jobs', label: 'Jobs', icon: <Users size={15} />, desc: 'Browse open positions' },
  { href: '/practice', label: 'Practice', icon: <BookOpen size={15} />, desc: 'Practice interview questions' },
];

export default function NotFound() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#060E22] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div
        className={`relative z-10 w-full max-w-2xl transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Image src="/assets/images/app_logo.png" alt="App logo" width={22} height={22} className="object-contain" />
            </div>
            <span className="text-white font-700 text-lg tracking-tight">AI Smart Interviewer</span>
          </Link>
        </div>

        {/* Error card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 sm:p-12 text-center backdrop-blur-sm">
          {/* 404 display */}
          <div className="relative inline-block mb-6">
            <span className="text-[120px] sm:text-[160px] font-800 leading-none bg-gradient-to-br from-teal-400 via-blue-400 to-purple-500 bg-clip-text text-transparent select-none">
              404
            </span>
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400/10 via-blue-400/10 to-purple-500/10 blur-2xl rounded-full" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-700 text-white mb-3">Page Not Found</h1>
          <p className="text-white/50 text-base mb-8 max-w-md mx-auto leading-relaxed">
            The page you're looking for has moved, been removed, or never existed. Let's get you back on track.
          </p>

          {/* Primary actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <button
              onClick={() => router?.back()}
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white px-5 py-2.5 rounded-xl font-500 text-sm transition-all duration-200"
            >
              <ArrowLeft size={15} />
              Go Back
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 text-white px-5 py-2.5 rounded-xl font-600 text-sm transition-all duration-200 shadow-lg shadow-teal-500/20"
            >
              <Home size={15} />
              Back to Dashboard
            </Link>
          </div>

          {/* Recovery links */}
          <div className="border-t border-white/10 pt-8">
            <p className="text-white/30 text-xs font-500 uppercase tracking-widest mb-4">Quick Navigation</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {RECOVERY_LINKS?.map((link) => (
                <Link
                  key={link?.href}
                  href={link?.href}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/10 transition-all duration-200 group text-left"
                >
                  <span className="text-teal-400/70 group-hover:text-teal-400 transition-colors">{link?.icon}</span>
                  <div className="min-w-0">
                    <p className="text-white/80 text-xs font-600 truncate">{link?.label}</p>
                    <p className="text-white/30 text-[10px] truncate">{link?.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          If you believe this is an error,{' '}
          <Link href="/support" className="text-teal-400/70 hover:text-teal-400 underline underline-offset-2 transition-colors">
            contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
