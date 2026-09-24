'use client';
import React, { useEffect, useRef } from 'react';
import { MicOff, VideoOff, Users, AlertCircle, Loader2 } from 'lucide-react';
import type { RoomConfig } from './RoomSetup';
import type { PeerStatus } from '@/lib/webrtc/useRoomPeer';

interface WebRTCVideoGridProps {
  config: RoomConfig;
  isMicMuted: boolean;
  isCameraOff: boolean;
  candidateConnected: boolean;
  peerStatus: PeerStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerError?: string | null;
  currentQuestion: string;
  lastAnswer: string;
}

export default function WebRTCVideoGrid({
  config,
  isMicMuted,
  isCameraOff,
  candidateConnected,
  peerStatus,
  localStream,
  remoteStream,
  peerError,
  currentQuestion,
  lastAnswer,
}: WebRTCVideoGridProps) {
  const recruiterVideoRef = useRef<HTMLVideoElement>(null);
  const candidateVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = recruiterVideoRef.current;
    if (!el) return;
    if (isCameraOff || !localStream) {
      el.srcObject = null;
      return;
    }
    el.srcObject = localStream;
  }, [localStream, isCameraOff]);

  useEffect(() => {
    const el = candidateVideoRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
  }, [remoteStream]);

  const waitingLabel =
    peerStatus === 'media' || peerStatus === 'signaling'
      ? 'Connecting media…'
      : peerStatus === 'waiting' || peerStatus === 'connecting'
        ? 'Waiting for candidate to join…'
        : peerStatus === 'failed'
          ? 'Peer connection failed'
          : 'Candidate video unavailable';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0F1923]">
      {(peerError || (!localStream && peerStatus === 'failed')) && (
        <div className="mx-3 mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-300">{peerError || 'Camera/microphone unavailable'}</p>
        </div>
      )}

      <div className="flex-1 grid grid-cols-2 gap-2 p-3 min-h-0">
        {/* Candidate video */}
        <div className="relative rounded-2xl overflow-hidden bg-[#141F2B] border border-[#1E2D3D] group">
          {candidateConnected && remoteStream ? (
            <video
              ref={candidateVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0F1923] to-[#141F2B]">
              <div className="w-20 h-20 rounded-full bg-[#1E2D3D] border-2 border-dashed border-[#2A3D4D] flex items-center justify-center mb-3">
                {peerStatus === 'waiting' || peerStatus === 'connecting' || peerStatus === 'media' || peerStatus === 'signaling' ? (
                  <Loader2 size={28} className="text-[#00C9B1] animate-spin" />
                ) : (
                  <Users size={28} className="text-[#3A5060]" />
                )}
              </div>
              <p className="text-[13px] font-600 text-[#4A6B7A]">{waitingLabel}</p>
              <p className="text-[11px] text-[#3A5060] mt-1.5 px-4 text-center">
                Share the join link so the candidate can connect video.
              </p>
            </div>
          )}

          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1">
            <div className={`w-1.5 h-1.5 rounded-full ${candidateConnected ? 'bg-[#00C9B1]' : 'bg-[#3A5060]'}`} />
            <span className="text-[11px] font-600 text-white">{config.candidateName || 'Candidate'}</span>
            <span className="text-[10px] text-[#4A6B7A]">· Candidate</span>
          </div>

          {lastAnswer && (
            <div className="absolute top-2 left-2 right-2 bg-black/75 backdrop-blur-sm rounded-xl p-2.5 max-h-16 overflow-hidden">
              <p className="text-[10px] text-[#A8C5C5] leading-relaxed line-clamp-3 italic">
                &ldquo;{lastAnswer.slice(0, 130)}{lastAnswer.length > 130 ? '…' : ''}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Recruiter video (local) */}
        <div className="relative rounded-2xl overflow-hidden bg-[#141F2B] border border-[#1E2D3D]">
          {!isCameraOff && localStream ? (
            <video
              ref={recruiterVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0F1923] to-[#141F2B]">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F0B429]/20 to-[#D4A017]/10 border-2 border-[#F0B429]/30 flex items-center justify-center mb-3">
                {isCameraOff ? (
                  <VideoOff size={28} className="text-[#F0B429]/60" />
                ) : (
                  <span className="text-2xl font-800 text-[#F0B429]/70">R</span>
                )}
              </div>
              <p className="text-[13px] font-600 text-[#C8A87E]">You (Recruiter)</p>
              {isCameraOff && <p className="text-[11px] text-[#4A6B7A] mt-0.5">Camera off</p>}
            </div>
          )}

          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F0B429]" />
            <span className="text-[11px] font-600 text-white">You</span>
            <span className="text-[10px] text-[#4A6B7A]">· Recruiter</span>
            {isMicMuted && <MicOff size={10} className="text-red-400 ml-1" />}
          </div>

          <div className="absolute top-2 right-2 bg-[#F0B429]/15 border border-[#F0B429]/30 rounded-lg px-2 py-0.5">
            <span className="text-[9px] font-700 text-[#F0B429] uppercase tracking-wider">Recruiter View</span>
          </div>
        </div>
      </div>

      {currentQuestion && (
        <div className="mx-3 mb-2 bg-[#141F2B] border border-[#00C9B1]/20 rounded-xl px-4 py-2.5 shrink-0">
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-700 text-[#00C9B1] uppercase tracking-wider shrink-0 mt-0.5">Asking:</span>
            <p className="text-[12px] text-white leading-relaxed">{currentQuestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}
