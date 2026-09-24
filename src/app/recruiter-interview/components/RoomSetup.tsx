'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Users, Loader2, Copy, Link2 } from 'lucide-react';
import { trackInterviewEvent } from '@/lib/analytics';
import CalendlyInvitePanel from './CalendlyInvitePanel';
import { buildJoinUrl } from '@/lib/webrtc/useRoomPeer';

interface RoomSetupProps {
  onRoomReady: (roomId: string, config: RoomConfig) => void;
}

export interface RoomConfig {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  department: string;
  company: string;
  duration: number;
  questionMix: { Technical: number; HR: number; Managerial: number; Behavioral: number };
}

const DEPT_OPTIONS = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Operations', 'Finance', 'HR'];

export default function RoomSetup({ onRoomReady }: RoomSetupProps) {
  const [config, setConfig] = useState<RoomConfig>({
    candidateName: '',
    candidateEmail: '',
    jobTitle: '',
    department: 'Engineering',
    company: 'Triveda',
    duration: 45,
    questionMix: { Technical: 30, HR: 30, Managerial: 20, Behavioral: 20 },
  });
  const [roomId] = useState(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  });
  const [starting, setStarting] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);

  const totalMix = Object.values(config.questionMix).reduce((a, b) => a + b, 0);

  const handleStart = () => {
    if (!config.candidateName.trim() || !config.jobTitle.trim()) {
      toast.error('Please fill in candidate name and job title');
      return;
    }
    if (totalMix !== 100) {
      toast.error('Question mix must total 100%');
      return;
    }
    setStarting(true);
    trackInterviewEvent('recruiter_room_created', { job_title: config.jobTitle, room_id: roomId });
    setTimeout(() => onRoomReady(roomId, config), 600);
  };

  const updateMix = (key: keyof RoomConfig['questionMix'], val: number) => {
    setConfig(prev => ({ ...prev, questionMix: { ...prev.questionMix, [key]: val } }));
  };

  const mixColors: Record<string, string> = {
    Technical: '#00C9B1',
    HR: '#F0B429',
    Managerial: '#818CF8',
    Behavioral: '#F87171',
  };

  return (
    <div className="min-h-screen bg-[#0F1923] flex items-center justify-center p-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00C9B1]/10 border border-[#00C9B1]/20 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#00C9B1] animate-pulse" />
            <span className="text-[12px] font-600 text-[#00C9B1] uppercase tracking-wider">AI Assist Interview</span>
          </div>
          <h1 className="text-[28px] font-800 text-white mb-2">Configure Interview Session</h1>
        </div>

        <div className="bg-[#141F2B] border border-[#1E2D3D] rounded-2xl p-6 space-y-6">
          {/* Shareable join link */}
          <div className="rounded-xl border border-[#00C9B1]/25 bg-[#00C9B1]/5 px-4 py-3 space-y-2">
            <p className="text-[12px] font-700 text-[#00C9B1]">Candidate join link</p>
            <p className="text-[11px] text-[#7A9BAA] leading-relaxed">
              After you start, share this link so the candidate can join with camera (room{' '}
              <span className="font-700 text-[#C8A87E]">{roomId}</span>).
            </p>
            <button
              type="button"
              onClick={async () => {
                const url = buildJoinUrl(roomId, {
                  candidateName: config.candidateName || 'Candidate',
                  jobTitle: config.jobTitle || 'Interview',
                  company: config.company,
                });
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success('Join link copied');
                } catch {
                  toast.error('Could not copy link');
                }
              }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[#0F1923] border border-[#1E2D3D] text-[12px] text-[#7EC8C8] hover:border-[#00C9B1]/40 transition-colors"
            >
              <Link2 size={14} />
              <span className="flex-1 text-left truncate font-600">
                /join/{roomId}
              </span>
              <Copy size={13} className="text-[#4A6B7A]" />
            </button>
          </div>

          {/* Calendly scheduling toggle */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider">Schedule via Calendly</label>
              <button
                onClick={() => setShowCalendly(!showCalendly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-600 transition-all ${
                  showCalendly
                    ? 'bg-[#00C9B1]/20 text-[#00C9B1] border border-[#00C9B1]/40'
                    : 'bg-[#0F1923] text-[#4A6B7A] border border-[#1E2D3D] hover:border-[#00C9B1]/30'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
                {showCalendly ? 'Hide' : 'Send Invite'}
              </button>
            </div>
            {showCalendly && (
              <CalendlyInvitePanel
                candidateName={config.candidateName}
                candidateEmail={config.candidateEmail}
                jobTitle={config.jobTitle}
                onEmailChange={(email) => setConfig((p) => ({ ...p, candidateEmail: email }))}
                onClose={() => setShowCalendly(false)}
              />
            )}
          </div>

          {/* Candidate & Job info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1.5 block">Candidate Name *</label>
              <input
                value={config.candidateName}
                onChange={e => setConfig(p => ({ ...p, candidateName: e.target.value }))}
                placeholder="e.g. Priya Sharma"
                className="w-full bg-[#0F1923] border border-[#1E2D3D] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-[#3A5060] focus:outline-none focus:ring-1 focus:ring-[#00C9B1]/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1.5 block">Candidate Email</label>
              <input
                type="email"
                value={config.candidateEmail}
                onChange={e => setConfig(p => ({ ...p, candidateEmail: e.target.value }))}
                placeholder="e.g. priya@email.com"
                className="w-full bg-[#0F1923] border border-[#1E2D3D] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-[#3A5060] focus:outline-none focus:ring-1 focus:ring-[#00C9B1]/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1.5 block">Job Title *</label>
              <input
                value={config.jobTitle}
                onChange={e => setConfig(p => ({ ...p, jobTitle: e.target.value }))}
                placeholder="e.g. Senior Product Manager"
                className="w-full bg-[#0F1923] border border-[#1E2D3D] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-[#3A5060] focus:outline-none focus:ring-1 focus:ring-[#00C9B1]/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1.5 block">Department</label>
              <select
                value={config.department}
                onChange={e => setConfig(p => ({ ...p, department: e.target.value }))}
                className="w-full bg-[#0F1923] border border-[#1E2D3D] rounded-xl px-3 py-2.5 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-[#00C9B1]/50"
              >
                {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1.5 block">Duration (minutes)</label>
              <select
                value={config.duration}
                onChange={e => setConfig(p => ({ ...p, duration: Number(e.target.value) }))}
                className="w-full bg-[#0F1923] border border-[#1E2D3D] rounded-xl px-3 py-2.5 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-[#00C9B1]/50"
              >
                {[20, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          {/* Question mix */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider">Question Mix</label>
              <span className={`text-[12px] font-700 ${totalMix === 100 ? 'text-[#00C9B1]' : 'text-red-400'}`}>
                {totalMix}% {totalMix !== 100 ? `(need ${100 - totalMix > 0 ? '+' : ''}${100 - totalMix}%)` : '✓'}
              </span>
            </div>
            <div className="space-y-3">
              {(Object.keys(config.questionMix) as Array<keyof RoomConfig['questionMix']>).map(key => (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-24 shrink-0">
                    <span className="text-[12px] font-600" style={{ color: mixColors[key] }}>{key}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={config.questionMix[key]}
                    onChange={e => updateMix(key, Number(e.target.value))}
                    className="flex-1 accent-current"
                    style={{ accentColor: mixColors[key] }}
                  />
                  <div className="w-12 text-right">
                    <span className="text-[13px] font-700 text-white">{config.questionMix[key]}%</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Visual mix bar */}
            <div className="mt-3 h-2 rounded-full overflow-hidden flex">
              {(Object.entries(config.questionMix) as [string, number][]).map(([key, val]) => (
                <div
                  key={key}
                  style={{ width: `${val}%`, backgroundColor: mixColors[key] }}
                  className="transition-all duration-300"
                />
              ))}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={starting || !config.candidateName.trim() || !config.jobTitle.trim() || totalMix !== 100}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00C9B1] to-[#00A896] text-[#0F1923] text-[15px] font-800 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#00C9B1]/20"
          >
            {starting ? (
              <><Loader2 size={18} className="animate-spin" /> Setting up room...</>
            ) : (
              <><Users size={18} /> Start Interview Room</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
