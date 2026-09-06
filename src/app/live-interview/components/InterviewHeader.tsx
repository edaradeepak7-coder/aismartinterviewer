import React from 'react';

import AppLogo from '@/components/ui/AppLogo';
import { Wifi, Clock, XCircle } from 'lucide-react';

interface InterviewHeaderProps {
  company: string;
  role: string;
  elapsed: string;
  totalDuration: number;
  elapsedSeconds: number;
  onEndInterview: () => void;
}

export default function InterviewHeader({
  company, role, elapsed, totalDuration, elapsedSeconds, onEndInterview
}: InterviewHeaderProps) {
  const totalSeconds = totalDuration * 60;
  const remaining = totalSeconds - elapsedSeconds;
  const remainingMin = Math.floor(remaining / 60);
  const isWarning = remaining < 600; // < 10 min

  const formatRemaining = () => {
    if (remaining <= 0) return '0:00 left';
    return `${remainingMin}m left`;
  };

  return (
    <header className="h-14 bg-[#0D1526] border-b border-white/10 flex items-center px-4 lg:px-6 gap-4 shrink-0">
      <div className="flex items-center gap-2.5">
        <AppLogo size={28} />
        <div className="hidden sm:block">
          <p className="text-[13px] font-600 text-white leading-tight">{company}</p>
          <p className="text-[11px] text-slate-400 leading-tight">{role}</p>
        </div>
      </div>

      <div className="flex-1" />

      {/* Connection status */}
      <div className="flex items-center gap-1.5 text-[12px] text-emerald-400 font-500">
        <Wifi size={14} />
        <span className="hidden sm:inline">Connected</span>
      </div>

      {/* Timer */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[13px] font-600 tabular-nums ${
        isWarning
          ? 'bg-danger-bg border-danger-border text-danger' :'bg-white/5 border-white/10 text-white'
      }`}>
        <Clock size={14} />
        <span>{elapsed}</span>
        <span className="text-slate-400 font-400 text-[11px]">/ {formatRemaining()}</span>
      </div>

      {/* End interview */}
      <button
        onClick={onEndInterview}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-danger/10 border border-danger/30 text-danger text-[13px] font-600 hover:bg-danger/20 transition-colors active:scale-95"
      >
        <XCircle size={14} />
        <span className="hidden sm:inline">End Interview</span>
      </button>
    </header>
  );
}