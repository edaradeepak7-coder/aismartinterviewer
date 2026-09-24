'use client';
import React, { useEffect, useRef } from 'react';
import { X, AlignLeft } from 'lucide-react';

interface TranscriptEntry {
  id: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
}

interface TranscriptPanelProps {
  transcript: TranscriptEntry[];
  onClose: () => void;
}

export default function TranscriptPanel({ transcript, onClose }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="flex flex-col h-full bg-[#0A0F1E]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 text-[13px] font-600 text-slate-300">
          <AlignLeft size={14} />
          Transcript
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-slate-400 transition-colors"
          aria-label="Close transcript"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {transcript.map((entry) => (
          <div key={entry.id} className={`flex flex-col gap-1 ${entry.speaker === 'candidate' ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-600 uppercase tracking-wide ${entry.speaker === 'interviewer' ? 'text-emerald-400' : 'text-blue-400'}`}>
                {entry.speaker === 'interviewer' ? 'AI Interviewer' : 'You'}
              </span>
              <span className="text-[10px] text-slate-600 tabular-nums">{entry.timestamp}</span>
            </div>
            <div className={`max-w-[90%] px-3 py-2 rounded-lg text-[13px] leading-relaxed ${
              entry.speaker === 'interviewer' ?'bg-white/5 border border-white/10 text-slate-200' :'bg-primary/20 border border-primary/30 text-blue-100'
            }`}>
              {entry.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}