'use client';
import React, { useEffect, useRef, useState } from 'react';
import { MicOff, Video, VideoOff, Users } from 'lucide-react';
import type { InterviewConfig, QAPair, RecruiterVoiceState } from './RecruiterInterviewScreen';

interface RecruiterVideoGridProps {
  config: InterviewConfig;
  voiceState: RecruiterVoiceState;
  isMicMuted: boolean;
  isCameraOff: boolean;
  qaHistory: QAPair[];
}

export default function RecruiterVideoGrid({
  config, voiceState, isMicMuted, isCameraOff, qaHistory,
}: RecruiterVideoGridProps) {
  const candidateVideoRef = useRef<HTMLVideoElement>(null);
  const recruiterVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
      .then(s => {
        stream = s;
        setCameraStream(s);
        if (recruiterVideoRef.current) {
          recruiterVideoRef.current.srcObject = s;
        }
      })
      .catch(() => setCameraError(true));
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, [mounted]);

  useEffect(() => {
    if (!recruiterVideoRef.current || !cameraStream) return;
    if (isCameraOff) {
      recruiterVideoRef.current.srcObject = null;
    } else {
      recruiterVideoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOff, cameraStream]);

  const lastQA = qaHistory[qaHistory.length - 1];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0C1017]">
      {/* Video grid — Zoom-style 2-up */}
      <div className="flex-1 grid grid-cols-2 gap-2 p-3 min-h-0">
        {/* Candidate video */}
        <div className="relative rounded-xl overflow-hidden bg-[#111B27] border border-[#1E2D3D] group">
          {/* Simulated candidate feed — placeholder */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0E1A2B] to-[#162030]">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2ABFBF]/30 to-[#1A8F8F]/20 border-2 border-[#2ABFBF]/40 flex items-center justify-center mb-3">
              <Users size={32} className="text-[#2ABFBF]/70" />
            </div>
            <p className="text-[13px] font-600 text-[#A8C5C5]">{config.candidateName}</p>
            <p className="text-[11px] text-[#4A6B7A] mt-0.5">{config.candidateRole}</p>
          </div>

          {/* Speaking indicator */}
          {voiceState === 'candidate_speaking' && (
            <div className="absolute inset-0 border-2 border-[#2ABFBF] rounded-xl pointer-events-none" />
          )}

          {/* Name tag */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2ABFBF]" />
            <span className="text-[11px] font-600 text-white">{config.candidateName}</span>
            <span className="text-[10px] text-[#4A6B7A]">· Candidate</span>
          </div>

          {/* Live answer preview */}
          {lastQA && (
            <div className="absolute top-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg p-2 max-h-16 overflow-hidden">
              <p className="text-[10px] text-[#A8C5C5] leading-relaxed line-clamp-3">
                "{lastQA.answer.slice(0, 120)}{lastQA.answer.length > 120 ? '…' : ''}"
              </p>
            </div>
          )}
        </div>

        {/* Recruiter video */}
        <div className="relative rounded-xl overflow-hidden bg-[#111B27] border border-[#1E2D3D]">
          {!isCameraOff && !cameraError ? (
            <video
              ref={recruiterVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0E1A2B] to-[#162030]">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F5A623]/20 to-[#E8941A]/10 border-2 border-[#F5A623]/30 flex items-center justify-center mb-3">
                {isCameraOff ? (
                  <VideoOff size={32} className="text-[#F5A623]/60" />
                ) : (
                  <span className="text-2xl font-700 text-[#F5A623]/70">R</span>
                )}
              </div>
              <p className="text-[13px] font-600 text-[#C8A87E]">Recruiter</p>
              {isCameraOff && <p className="text-[11px] text-[#4A6B7A] mt-0.5">Camera off</p>}
            </div>
          )}

          {/* Speaking indicator */}
          {voiceState === 'recruiter_speaking' && (
            <div className="absolute inset-0 border-2 border-[#F5A623] rounded-xl pointer-events-none" />
          )}

          {/* Name tag */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F5A623]" />
            <span className="text-[11px] font-600 text-white">You</span>
            <span className="text-[10px] text-[#4A6B7A]">· Recruiter</span>
            {isMicMuted && <MicOff size={10} className="text-red-400 ml-1" />}
          </div>

          {/* RECRUITER ONLY badge */}
          <div className="absolute top-2 right-2 bg-[#F5A623]/20 border border-[#F5A623]/40 rounded-md px-2 py-0.5">
            <span className="text-[9px] font-700 text-[#F5A623] uppercase tracking-wider">Recruiter View</span>
          </div>
        </div>
      </div>

      {/* Q&A history strip */}
      {qaHistory.length > 0 && (
        <div className="px-3 pb-2 shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {qaHistory.slice(-5).map((qa, i) => (
              <div
                key={`qa-${i}`}
                className="shrink-0 bg-[#111B27] border border-[#1E2D3D] rounded-lg px-3 py-2 min-w-[160px] max-w-[200px]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-700 text-[#2ABFBF] uppercase">{qa.category}</span>
                  {qa.score !== undefined && (
                    <span className={`text-[10px] font-700 ${qa.score >= 7 ? 'text-emerald-400' : qa.score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                      {qa.score}/10
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#7A9BAA] line-clamp-2">{qa.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
