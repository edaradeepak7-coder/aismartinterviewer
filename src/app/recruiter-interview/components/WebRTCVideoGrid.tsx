'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MicOff, Video, VideoOff, Users, AlertCircle } from 'lucide-react';
import type { RoomConfig } from './RoomSetup';

interface WebRTCVideoGridProps {
  config: RoomConfig;
  isMicMuted: boolean;
  isCameraOff: boolean;
  onStreamReady?: (stream: MediaStream) => void;
  candidateConnected: boolean;
  currentQuestion: string;
  lastAnswer: string;
}

export default function WebRTCVideoGrid({
  config, isMicMuted, isCameraOff, onStreamReady, candidateConnected, currentQuestion, lastAnswer,
}: WebRTCVideoGridProps) {
  const recruiterVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    let stream: MediaStream | null = null;

    const getMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setPermissionError(null);
        if (recruiterVideoRef.current) {
          recruiterVideoRef.current.srcObject = stream;
        }
        onStreamReady?.(stream);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          setPermissionError('Camera/microphone access denied. Please allow permissions and refresh.');
        } else if (err.name === 'NotFoundError') {
          setPermissionError('No camera or microphone found on this device.');
        } else {
          setPermissionError('Could not access camera/microphone. Check your device settings.');
        }
      }
    };

    getMedia();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, [mounted]);

  // Handle mic mute
  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(t => { t.enabled = !isMicMuted; });
  }, [isMicMuted, localStream]);

  // Handle camera toggle
  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(t => { t.enabled = !isCameraOff; });
    if (recruiterVideoRef.current) {
      recruiterVideoRef.current.srcObject = isCameraOff ? null : localStream;
    }
  }, [isCameraOff, localStream]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0F1923]">
      {permissionError && (
        <div className="mx-3 mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-300">{permissionError}</p>
        </div>
      )}

      {/* Video grid */}
      <div className="flex-1 grid grid-cols-2 gap-2 p-3 min-h-0">
        {/* Candidate video */}
        <div className="relative rounded-2xl overflow-hidden bg-[#141F2B] border border-[#1E2D3D] group">
          {candidateConnected ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0F1923] to-[#141F2B]">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00C9B1]/30 to-[#00A896]/20 border-2 border-[#00C9B1]/50 flex items-center justify-center mb-3">
                <span className="text-2xl font-800 text-[#00C9B1]">{config.candidateName[0]?.toUpperCase() || 'C'}</span>
              </div>
              <p className="text-[13px] font-600 text-white">{config.candidateName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00C9B1] animate-pulse" />
                <span className="text-[11px] text-[#00C9B1]">Connected</span>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0F1923] to-[#141F2B]">
              <div className="w-20 h-20 rounded-full bg-[#1E2D3D] border-2 border-dashed border-[#2A3D4D] flex items-center justify-center mb-3">
                <Users size={28} className="text-[#3A5060]" />
              </div>
              <p className="text-[13px] font-600 text-[#4A6B7A]">Waiting for candidate...</p>
              <div className="flex gap-1 mt-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#3A5060] animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* Name tag */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1">
            <div className={`w-1.5 h-1.5 rounded-full ${candidateConnected ? 'bg-[#00C9B1]' : 'bg-[#3A5060]'}`} />
            <span className="text-[11px] font-600 text-white">{config.candidateName || 'Candidate'}</span>
            <span className="text-[10px] text-[#4A6B7A]">· Candidate</span>
          </div>

          {/* Live answer overlay */}
          {lastAnswer && (
            <div className="absolute top-2 left-2 right-2 bg-black/75 backdrop-blur-sm rounded-xl p-2.5 max-h-16 overflow-hidden">
              <p className="text-[10px] text-[#A8C5C5] leading-relaxed line-clamp-3 italic">
                "{lastAnswer.slice(0, 130)}{lastAnswer.length > 130 ? '…' : ''}"
              </p>
            </div>
          )}
        </div>

        {/* Recruiter video (local) */}
        <div className="relative rounded-2xl overflow-hidden bg-[#141F2B] border border-[#1E2D3D]">
          {!isCameraOff && !permissionError ? (
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

          {/* Name tag */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F0B429]" />
            <span className="text-[11px] font-600 text-white">You</span>
            <span className="text-[10px] text-[#4A6B7A]">· Recruiter</span>
            {isMicMuted && <MicOff size={10} className="text-red-400 ml-1" />}
          </div>

          {/* Recruiter-only badge */}
          <div className="absolute top-2 right-2 bg-[#F0B429]/15 border border-[#F0B429]/30 rounded-lg px-2 py-0.5">
            <span className="text-[9px] font-700 text-[#F0B429] uppercase tracking-wider">Recruiter View</span>
          </div>
        </div>
      </div>

      {/* Current question display */}
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
