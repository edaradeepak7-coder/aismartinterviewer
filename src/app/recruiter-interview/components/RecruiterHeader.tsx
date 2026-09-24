import React from 'react';
import AppLogo from '@/components/ui/AppLogo';
import { Wifi, Clock, Radio, Briefcase, XCircle } from 'lucide-react';
import type { InterviewConfig } from './RecruiterInterviewScreen';

interface RecruiterHeaderProps {
  config: InterviewConfig;
  elapsed: string;
  elapsedSeconds: number;
  isRecording: boolean;
  questionNumber: number;
  totalQuestions: number;
  onEndInterview: () => void;
  onPostJob: () => void;
}

export default function RecruiterHeader({
  config, elapsed, elapsedSeconds, isRecording,
  questionNumber, totalQuestions, onEndInterview, onPostJob,
}: RecruiterHeaderProps) {
  const totalSeconds = config.duration * 60;
  const remaining = totalSeconds - elapsedSeconds;
  const isWarning = remaining < 600;
  const remainingMin = Math.max(0, Math.floor(remaining / 60));

  return (
    <header className="h-14 bg-[#0E1520] border-b border-[#1E2D3D] flex items-center px-4 lg:px-6 gap-4 shrink-0">
      <div className="flex items-center gap-2.5">
        <AppLogo size={28} />
        <div className="hidden sm:block">
          <p className="text-[13px] font-700 text-white leading-tight">{config.company}</p>
          <p className="text-[11px] text-[#4A6B7A] leading-tight">{config.jobTitle}</p>
        </div>
      </div>

      {/* Candidate info */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#2ABFBF]/10 border border-[#2ABFBF]/20 rounded-lg">
        <div className="w-6 h-6 rounded-full bg-[#2ABFBF]/20 flex items-center justify-center">
          <span className="text-[10px] font-700 text-[#2ABFBF]">{config.candidateName[0]}</span>
        </div>
        <div>
          <p className="text-[12px] font-600 text-[#7EC8C8] leading-tight">{config.candidateName}</p>
          <p className="text-[10px] text-[#3A5060] leading-tight">{config.candidateRole}</p>
        </div>
      </div>

      {/* Question counter */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#F5A623]/10 border border-[#F5A623]/20 rounded-lg">
        <span className="text-[12px] font-700 text-[#F5A623]">Q{questionNumber}</span>
        <span className="text-[11px] text-[#4A6B7A]">/ {totalQuestions}</span>
      </div>

      <div className="flex-1" />

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-1.5 text-[12px] text-red-400 font-600">
          <Radio size={13} className="animate-pulse" />
          <span className="hidden sm:inline">REC</span>
        </div>
      )}

      {/* Connection */}
      <div className="flex items-center gap-1.5 text-[12px] text-emerald-400 font-500">
        <Wifi size={14} />
        <span className="hidden sm:inline">Connected</span>
      </div>

      {/* Timer */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[13px] font-600 tabular-nums ${
        isWarning ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-[#111B27] border-[#1E2D3D] text-white'
      }`}>
        <Clock size={14} />
        <span>{elapsed}</span>
        <span className="text-[#3A5060] font-400 text-[11px]">/ {remainingMin}m left</span>
      </div>

      {/* Post Job */}
      <button
        onClick={onPostJob}
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2ABFBF]/10 border border-[#2ABFBF]/30 text-[#2ABFBF] text-[12px] font-600 hover:bg-[#2ABFBF]/20 transition-colors active:scale-95"
      >
        <Briefcase size={13} />
        Post Job
      </button>

      {/* End interview */}
      <button
        onClick={onEndInterview}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-[13px] font-600 hover:bg-red-500/20 transition-colors active:scale-95"
      >
        <XCircle size={14} />
        <span className="hidden sm:inline">End</span>
      </button>
    </header>
  );
}
