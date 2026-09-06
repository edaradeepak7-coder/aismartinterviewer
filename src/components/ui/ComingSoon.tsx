'use client';
import React from 'react';
import { Clock, Lock, Sparkles } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: 'card' | 'page' | 'inline';
  expectedDate?: string;
  adminNote?: string;
}

export function ComingSoon({
  title,
  description,
  icon,
  variant = 'card',
  expectedDate,
  adminNote,
}: ComingSoonProps) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
        <Clock size={13} className="text-amber-500 shrink-0" />
        <span className="text-xs font-600 text-amber-700">{title} — Coming Soon</span>
      </div>
    );
  }

  if (variant === 'page') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 flex items-center justify-center mb-5 shadow-sm">
          {icon || <Sparkles size={32} className="text-teal-500" />}
        </div>
        <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-700 px-3 py-1.5 rounded-full mb-3 border border-amber-200">
          <Clock size={11} />
          Coming Soon
        </div>
        <h2 className="text-2xl font-800 text-[#0D1B3E] mb-2">{title}</h2>
        {description && (
          <p className="text-sm text-[#6B7A99] max-w-md leading-relaxed mb-4">{description}</p>
        )}
        {adminNote && (
          <p className="text-xs text-[#6B7A99] max-w-sm leading-relaxed bg-[#F4F6FA] border border-[#E8ECF4] rounded-xl px-4 py-3">
            {adminNote}
          </p>
        )}
        {expectedDate && (
          <p className="text-xs text-[#6B7A99] mt-3">Expected: {expectedDate}</p>
        )}
      </div>
    );
  }

  // card variant
  return (
    <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm overflow-hidden relative">
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-2 rounded-2xl">
        <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-700 px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">
          <Clock size={11} />
          Coming Soon
        </div>
        {adminNote && (
          <p className="text-[11px] text-[#6B7A99] text-center max-w-[200px] leading-relaxed px-4">{adminNote}</p>
        )}
      </div>
      {/* Blurred content */}
      <div className="p-5 filter blur-[2px] select-none pointer-events-none">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center">
            {icon || <Lock size={18} className="text-[#0D9488]" />}
          </div>
          <div>
            <h3 className="text-sm font-800 text-[#0D1B3E]">{title}</h3>
            {description && <p className="text-xs text-[#6B7A99]">{description}</p>}
          </div>
        </div>
        <div className="h-2 bg-[#F0F2F5] rounded-full mb-2" />
        <div className="h-2 bg-[#F0F2F5] rounded-full w-3/4" />
      </div>
    </div>
  );
}

interface LockedFeatureProps {
  title: string;
  reason: string;
  ctaLabel?: string;
  ctaHref?: string;
  prerequisites?: string[];
}

export function LockedFeature({ title, reason, ctaLabel, ctaHref, prerequisites }: LockedFeatureProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#F4F6FA] border border-[#E8ECF4] flex items-center justify-center mx-auto mb-4">
        <Lock size={24} className="text-[#6B7A99]" />
      </div>
      <h3 className="text-base font-800 text-[#0D1B3E] mb-2">{title}</h3>
      <p className="text-sm text-[#6B7A99] mb-4 leading-relaxed max-w-sm mx-auto">{reason}</p>
      {prerequisites && prerequisites.length > 0 && (
        <div className="bg-[#F4F6FA] rounded-xl p-4 mb-4 text-left">
          <p className="text-xs font-700 text-[#0D1B3E] mb-2">Prerequisites:</p>
          <ul className="space-y-1.5">
            {prerequisites.map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-[#6B7A99]">
                <div className="w-4 h-4 rounded-full border-2 border-[#DDE3EE] flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#DDE3EE]" />
                </div>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {ctaHref && ctaLabel && (
        <a
          href={ctaHref}
          className="inline-flex items-center gap-2 bg-[#0D9488] hover:bg-[#0B7A6E] text-white text-sm font-700 px-5 py-2.5 rounded-xl transition-colors"
        >
          {ctaLabel}
        </a>
      )}
    </div>
  );
}
