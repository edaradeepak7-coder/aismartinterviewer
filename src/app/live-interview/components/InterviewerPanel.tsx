'use client';
import React from 'react';
import { VoiceState } from './LiveInterviewScreen';

interface InterviewerPanelProps {
  voiceState: VoiceState;
}

const stateLabels: Record<VoiceState, string> = {
  idle: 'Waiting for your response',
  listening: 'Listening...',
  processing: 'Processing your response',
  interviewer_speaking: 'Speaking...',
  candidate_speaking: 'You are speaking',
  thinking: 'Thinking...',
  error: 'Connection error',
  reconnecting: 'Reconnecting...',
  completed: 'Interview completed',
};

const stateColors: Record<VoiceState, string> = {
  idle: 'border-slate-600',
  listening: 'border-danger',
  processing: 'border-primary',
  interviewer_speaking: 'border-emerald-500',
  candidate_speaking: 'border-danger',
  thinking: 'border-amber-500',
  error: 'border-danger',
  reconnecting: 'border-amber-500',
  completed: 'border-emerald-500',
};

const ringColors: Record<VoiceState, string> = {
  idle: '',
  listening: 'recording-ring',
  processing: '',
  interviewer_speaking: 'pulse-dot',
  candidate_speaking: 'recording-ring',
  thinking: '',
  error: '',
  reconnecting: '',
  completed: '',
};

export default function InterviewerPanel({ voiceState }: InterviewerPanelProps) {
  const isActive = voiceState === 'interviewer_speaking' || voiceState === 'listening';

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar */}
      <div className="relative">
        <div
          className={`w-20 h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-2 ${stateColors[voiceState]} flex items-center justify-center transition-all duration-300`}
        >
          <span className="text-2xl font-700 text-white select-none">AI</span>
        </div>
        {/* Status dot */}
        <span
          className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#0B1120] ${
            voiceState === 'idle' ? 'bg-slate-500' :
            voiceState === 'listening' || voiceState === 'candidate_speaking' ? 'bg-danger' :
            voiceState === 'interviewer_speaking' ? 'bg-emerald-500' :
            voiceState === 'error' ? 'bg-danger' :
            voiceState === 'reconnecting'? 'bg-amber-500' : 'bg-primary'
          } ${isActive ? 'pulse-dot' : ''}`}
        />
      </div>

      {/* AI Interviewer label */}
      <div className="text-center">
        <p className="text-sm font-600 text-white">AI Technical Interviewer</p>
        <p className="text-[12px] text-slate-400">Meridian Technologies</p>
      </div>

      {/* State indicator */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-500 ${
        voiceState === 'listening' || voiceState === 'candidate_speaking' ?'bg-danger/10 border-danger/30 text-danger'
          : voiceState === 'interviewer_speaking' ?'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : voiceState === 'error' ?'bg-danger/10 border-danger/30 text-danger'
          : voiceState === 'reconnecting' ?'bg-amber-500/10 border-amber-500/30 text-amber-400'
          : voiceState === 'processing' ?'bg-primary/10 border-primary/30 text-primary' :'bg-white/5 border-white/10 text-slate-400'
      }`}>
        {(voiceState === 'listening' || voiceState === 'interviewer_speaking') && (
          <span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot" />
        )}
        <span>{stateLabels[voiceState]}</span>
      </div>

      {/* Waveform visualization */}
      {(voiceState === 'listening' || voiceState === 'interviewer_speaking') && (
        <div className="flex items-center gap-1 h-8">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={`wave-${i}`}
              className={`w-1 rounded-full waveform-bar ${
                voiceState === 'listening' ? 'bg-danger/70' : 'bg-emerald-500/70'
              }`}
              style={{
                height: `${20 + (i % 5) * 8}px`,
                animationDelay: `${i * 0.06}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}