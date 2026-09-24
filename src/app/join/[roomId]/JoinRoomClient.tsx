'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useRoomPeer } from '@/lib/webrtc/useRoomPeer';
import ProctoringEngine, { type ProctoringEvent } from '@/components/ProctoringEngine';
import { proctoringService } from '@/lib/services/proctoringService';

export default function JoinRoomClient() {
  const params = useParams();
  const search = useSearchParams();
  const roomId = String(params?.roomId || '').toUpperCase();

  const candidateName = search.get('name') || 'Candidate';
  const jobTitle = search.get('job') || 'Interview';
  const company = search.get('company') || 'Triveda';
  const interviewId = search.get('iid');

  const [joined, setJoined] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const proctoringEventsRef = useRef<ProctoringEvent[]>([]);
  const proctoringFlushedRef = useRef(false);

  const {
    status,
    localStream,
    remoteStream,
    peerName,
    error,
    setMicMuted,
    setCameraOff,
    hangUp,
  } = useRoomPeer({
    roomId,
    role: 'candidate',
    displayName: candidateName,
    enabled: joined && !!roomId,
  });

  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);

  const flushProctoring = useCallback(async () => {
    if (proctoringFlushedRef.current) return;
    const events = proctoringEventsRef.current;
    if (!events.length) return;
    proctoringFlushedRef.current = true;
    const result = await proctoringService.flushEvents(events, {
      sessionId: roomId,
      interviewId: interviewId || null,
    });
    if (result.error === 'not_authenticated') {
      proctoringFlushedRef.current = false;
    } else if (result.error) {
      proctoringFlushedRef.current = false;
      console.warn('Join proctoring flush:', result.error);
    }
  }, [interviewId, roomId]);

  React.useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = isCameraOff ? null : localStream;
    }
  }, [localStream, isCameraOff]);

  React.useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  React.useEffect(() => {
    return () => {
      void flushProctoring();
    };
  }, [flushProctoring]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'media':
        return 'Requesting camera…';
      case 'signaling':
        return 'Joining room…';
      case 'waiting':
        return 'Waiting for recruiter…';
      case 'connecting':
        return 'Connecting video…';
      case 'connected':
        return 'Connected';
      case 'failed':
        return 'Connection failed';
      case 'ended':
        return 'Call ended';
      default:
        return 'Ready';
    }
  }, [status]);

  const toggleMic = () => {
    const next = !isMicMuted;
    setIsMicMuted(next);
    setMicMuted(next);
  };

  const toggleCam = () => {
    const next = !isCameraOff;
    setIsCameraOff(next);
    setCameraOff(next);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const leaveRoom = async () => {
    await flushProctoring();
    hangUp();
    toast.info('You left the room');
  };

  if (!roomId) {
    return (
      <div className="min-h-screen bg-[#0F1923] flex items-center justify-center text-white p-6">
        <p className="text-sm text-[#7A9BAA]">Invalid room link.</p>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-[#0F1923] flex items-center justify-center p-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="w-full max-w-md bg-[#141F2B] border border-[#1E2D3D] rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <p className="text-[11px] font-700 text-[#00C9B1] uppercase tracking-wider mb-2">Join interview</p>
            <h1 className="text-[22px] font-800 text-white">{jobTitle}</h1>
            <p className="text-[13px] text-[#7A9BAA] mt-1">{company} · Room {roomId}</p>
          </div>
          <div className="rounded-xl bg-[#0F1923] border border-[#1E2D3D] px-4 py-3">
            <p className="text-[12px] text-[#A8C5C5]">
              Joining as <span className="font-700 text-white">{candidateName}</span>. Your browser will ask for camera and microphone access.
            </p>
          </div>
          <p className="text-[11px] text-[#4A6B7A] leading-relaxed">
            Integrity monitoring runs during the session. Sign in before joining so proctoring events can be saved to your interview record.
          </p>
          <button
            type="button"
            onClick={() => setJoined(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00C9B1] to-[#00A896] text-[#0F1923] text-[14px] font-700"
          >
            Join with camera
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="w-full py-2.5 rounded-xl border border-[#1E2D3D] text-[12px] font-600 text-[#7A9BAA] hover:bg-[#0F1923] flex items-center justify-center gap-2"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy this link'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1923] flex flex-col text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="h-14 border-b border-[#1E2D3D] bg-[#141F2B] flex items-center px-4 gap-3">
        <div>
          <p className="text-[13px] font-700 leading-tight">{jobTitle}</p>
          <p className="text-[10px] text-[#4A6B7A]">{company} · {roomId}</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F1923] border border-[#1E2D3D] text-[11px]">
          <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-[#00C9B1]' : 'bg-[#F0B429] animate-pulse'}`} />
          {statusLabel}
          {peerName && status === 'connected' ? ` · ${peerName}` : ''}
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 text-[12px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 p-3 min-h-0">
        <div className="relative rounded-2xl overflow-hidden bg-[#141F2B] border border-[#1E2D3D] min-h-[220px]">
          {remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#4A6B7A]">
              <Loader2 size={28} className="animate-spin text-[#00C9B1]" />
              <p className="text-[13px] font-600">{statusLabel}</p>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 rounded-lg px-2.5 py-1 text-[11px] font-600">
            Recruiter
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-[#141F2B] border border-[#1E2D3D] min-h-[220px]">
          {!isCameraOff && localStream ? (
            <video ref={localVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#C8A87E] text-[13px] font-600">
              Camera off
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 rounded-lg px-2.5 py-1 text-[11px] font-600">
            You · {candidateName}
          </div>
        </div>
      </div>

      <div className="h-20 border-t border-[#1E2D3D] bg-[#141F2B] flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center border ${
            isMicMuted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-[#1E2D3D] border-[#2A3D4D] text-white'
          }`}
        >
          {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button
          type="button"
          onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center border ${
            isCameraOff ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-[#1E2D3D] border-[#2A3D4D] text-white'
          }`}
        >
          {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>
        <button
          type="button"
          onClick={leaveRoom}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white text-[13px] font-700"
        >
          <PhoneOff size={15} />
          Leave
        </button>
      </div>

      <ProctoringEngine
        sessionId={interviewId || roomId}
        onEvent={(event) => {
          proctoringEventsRef.current = [...proctoringEventsRef.current, event];
        }}
        showOverlay={true}
        requireFullscreen={false}
      />
    </div>
  );
}
