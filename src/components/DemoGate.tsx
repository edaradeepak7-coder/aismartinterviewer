'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft } from 'lucide-react';
import { isDemoMode, isDemoOnlyRoute } from '@/lib/demoMode';
import DemoDataBanner from '@/components/ui/DemoDataBanner';

interface DemoGateProps {
  children: React.ReactNode;
  /** Optional feature label for the banner when demo is allowed */
  feature?: string;
  /** Force-treat this page as demo-only even if not in the registry */
  forceDemoOnly?: boolean;
}

/**
 * Wraps page content:
 * - Demo mode ON  → shows DemoDataBanner + children
 * - Demo mode OFF + demo-only route → blocked placeholder
 * - Live route     → children only
 */
export default function DemoGate({ children, feature, forceDemoOnly }: DemoGateProps) {
  const pathname = usePathname() || '';
  const demoOnly = forceDemoOnly || isDemoOnlyRoute(pathname);
  const demo = isDemoMode();

  if (demoOnly && !demo) {
    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[50vh] text-center px-6 py-16">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
          <Lock size={28} className="text-slate-500" />
        </div>
        <h1 className="text-xl font-800 text-[#0D1B3E] mb-2">Feature unavailable</h1>
        <p className="text-sm text-[#6B7A99] max-w-md leading-relaxed mb-6">
          This screen is still backed by demo data and is disabled in production.
          Enable it for previews with{' '}
          <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
            NEXT_PUBLIC_DEMO_MODE=true
          </code>
          .
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-600 text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      {demoOnly && demo && (
        <div className="mb-4">
          <DemoDataBanner feature={feature} />
        </div>
      )}
      {children}
    </>
  );
}
