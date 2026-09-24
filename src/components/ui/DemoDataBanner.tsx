'use client';

import React from 'react';
import { FlaskConical, X } from 'lucide-react';
import { isDemoMode } from '@/lib/demoMode';

interface DemoDataBannerProps {
  /** Short label for what is mocked, e.g. "Security metrics" */
  feature?: string;
  className?: string;
}

/**
 * Amber banner shown on mock-backed screens when demo mode is on.
 */
export default function DemoDataBanner({ feature, className = '' }: DemoDataBannerProps) {
  const [hidden, setHidden] = React.useState(false);

  if (!isDemoMode() || hidden) return null;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 ${className}`}
      role="status"
    >
      <FlaskConical size={16} className="mt-0.5 shrink-0 text-amber-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-700">Demo data</p>
        <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
          {feature
            ? `${feature} on this page uses sample / mock data — not live production records.`
            : 'This page uses sample / mock data — not live production records.'}
          {' '}
          Set <code className="font-mono text-[11px] bg-amber-100 px-1 rounded">NEXT_PUBLIC_DEMO_MODE=false</code> to hide demo screens.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setHidden(true)}
        className="shrink-0 p-1 rounded-lg hover:bg-amber-100 text-amber-700"
        aria-label="Dismiss demo banner"
      >
        <X size={14} />
      </button>
    </div>
  );
}
