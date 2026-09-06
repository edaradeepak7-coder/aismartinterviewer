'use client';
import React from 'react';
import { Mic, MicOff, Video, VideoOff, Radio, RadioTower, PhoneOff, Briefcase } from 'lucide-react';

interface RecruiterControlsProps {
  isMicMuted: boolean;
  isCameraOff: boolean;
  isRecording: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleRecording: () => void;
  onEndInterview: () => void;
  onPostJob: () => void;
}

export default function RecruiterControls({
  isMicMuted, isCameraOff, isRecording,
  onToggleMic, onToggleCamera, onToggleRecording, onEndInterview, onPostJob,
}: RecruiterControlsProps) {
  return (
    <div className="bg-[#0E1520] border-t border-[#1E2D3D] px-4 py-3 flex items-center justify-center gap-3 shrink-0">
      {/* Mic */}
      <button
        onClick={onToggleMic}
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
          isMicMuted
            ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30' :'bg-[#1E2D3D] border-[#2A3D4D] text-[#7EC8C8] hover:bg-[#2A3D4D]'
        }`}
        title={isMicMuted ? 'Unmute' : 'Mute'}
      >
        {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
      </button>

      {/* Camera */}
      <button
        onClick={onToggleCamera}
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
          isCameraOff
            ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30' :'bg-[#1E2D3D] border-[#2A3D4D] text-[#7EC8C8] hover:bg-[#2A3D4D]'
        }`}
        title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
      >
        {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
      </button>

      {/* Recording */}
      <button
        onClick={onToggleRecording}
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
          isRecording
            ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30' :'bg-[#1E2D3D] border-[#2A3D4D] text-[#4A6B7A] hover:bg-[#2A3D4D]'
        }`}
        title={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? <Radio size={18} className="animate-pulse" /> : <RadioTower size={18} />}
      </button>

      {/* Post Job */}
      <button
        onClick={onPostJob}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#2ABFBF]/10 border border-[#2ABFBF]/30 text-[#2ABFBF] text-[12px] font-600 hover:bg-[#2ABFBF]/20 transition-all active:scale-95"
      >
        <Briefcase size={15} />
        <span>Post Job</span>
      </button>

      {/* End interview */}
      <button
        onClick={onEndInterview}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-[12px] font-700 transition-all active:scale-95"
      >
        <PhoneOff size={15} />
        <span>End Interview</span>
      </button>
    </div>
  );
}
