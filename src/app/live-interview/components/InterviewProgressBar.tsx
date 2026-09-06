import React from 'react';

interface InterviewProgressBarProps {
  current: number;
  total: number;
  answered: number;
}

export default function InterviewProgressBar({ current, total, answered }: InterviewProgressBarProps) {
  const pct = Math.round((answered / total) * 100);

  return (
    <div className="bg-[#0D1526] border-b border-white/10 px-4 lg:px-6 py-2.5 flex items-center gap-4">
      <div className="flex items-center gap-2 text-[12px] text-slate-400 shrink-0">
        <span className="font-600 text-white">Q{current}</span>
        <span>of {total}</span>
      </div>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-1.5 bg-primary rounded-full score-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[12px] text-slate-400 tabular-nums shrink-0">{answered} answered</span>
    </div>
  );
}