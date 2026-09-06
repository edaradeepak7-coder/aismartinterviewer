'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Camera, Monitor, Mic, Eye, EyeOff, Shield, X } from 'lucide-react';

export interface ProctoringEvent {
  type: 'tab_switch' | 'fullscreen_exit' | 'face_not_detected' | 'multiple_faces' | 'audio_spike' | 'copy_paste' | 'window_blur';
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  detail: string;
}

export interface ProctoringInsights {
  events: ProctoringEvent[];
  tabSwitchCount: number;
  fullscreenExitCount: number;
  faceNotDetectedSeconds: number;
  audioAnomalies: number;
  overallRiskScore: number; // 0-100, higher = more suspicious
  riskLevel: 'clean' | 'low' | 'medium' | 'high';
  summary: string;
}

interface ProctoringEngineProps {
  sessionId: string;
  onEvent?: (event: ProctoringEvent) => void;
  onInsightsUpdate?: (insights: ProctoringInsights) => void;
  showOverlay?: boolean;
  requireFullscreen?: boolean;
}

function computeInsights(events: ProctoringEvent[]): ProctoringInsights {
  const tabSwitchCount = events.filter(e => e.type === 'tab_switch' || e.type === 'window_blur').length;
  const fullscreenExitCount = events.filter(e => e.type === 'fullscreen_exit').length;
  const faceEvents = events.filter(e => e.type === 'face_not_detected');
  const faceNotDetectedSeconds = faceEvents.length * 3; // approx 3s per event
  const audioAnomalies = events.filter(e => e.type === 'audio_spike').length;

  const score = Math.min(100,
    tabSwitchCount * 15 +
    fullscreenExitCount * 10 +
    Math.min(faceNotDetectedSeconds, 30) * 0.5 +
    audioAnomalies * 8
  );

  const riskLevel: ProctoringInsights['riskLevel'] =
    score >= 60 ? 'high' : score >= 30 ? 'medium' : score >= 10 ? 'low' : 'clean';

  const summaryParts: string[] = [];
  if (tabSwitchCount > 0) summaryParts.push(`${tabSwitchCount} tab switch${tabSwitchCount > 1 ? 'es' : ''}`);
  if (fullscreenExitCount > 0) summaryParts.push(`${fullscreenExitCount} fullscreen exit${fullscreenExitCount > 1 ? 's' : ''}`);
  if (faceNotDetectedSeconds > 0) summaryParts.push(`face absent ~${faceNotDetectedSeconds}s`);
  if (audioAnomalies > 0) summaryParts.push(`${audioAnomalies} audio anomal${audioAnomalies > 1 ? 'ies' : 'y'}`);

  const summary = summaryParts.length > 0
    ? `Detected: ${summaryParts.join(', ')}.`
    : 'No suspicious activity detected.';

  return { events, tabSwitchCount, fullscreenExitCount, faceNotDetectedSeconds, audioAnomalies, overallRiskScore: Math.round(score), riskLevel, summary };
}

export default function ProctoringEngine({
  sessionId, onEvent, onInsightsUpdate, showOverlay = true, requireFullscreen = true
}: ProctoringEngineProps) {
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [faceDetected, setFaceDetected] = useState(true);
  const [showWarning, setShowWarning] = useState<string | null>(null);
  const [warningCount, setWarningCount] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventsRef = useRef<ProctoringEvent[]>([]);

  const addEvent = useCallback((event: ProctoringEvent) => {
    eventsRef.current = [...eventsRef.current, event];
    setEvents([...eventsRef.current]);
    onEvent?.(event);
    onInsightsUpdate?.(computeInsights(eventsRef.current));

    if (event.severity === 'high' || event.severity === 'medium') {
      setShowWarning(event.detail);
      setWarningCount(c => c + 1);
      setTimeout(() => setShowWarning(null), 4000);
    }
  }, [onEvent, onInsightsUpdate]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addEvent({
          type: 'tab_switch',
          timestamp: new Date().toISOString(),
          severity: 'high',
          detail: 'Candidate switched to another tab or minimized the window',
        });
      }
    };

    const handleBlur = () => {
      addEvent({
        type: 'window_blur',
        timestamp: new Date().toISOString(),
        severity: 'medium',
        detail: 'Browser window lost focus',
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [addEvent]);

  // Fullscreen enforcement
  useEffect(() => {
    if (!requireFullscreen) return;

    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs && isActive) {
        addEvent({
          type: 'fullscreen_exit',
          timestamp: new Date().toISOString(),
          severity: 'high',
          detail: 'Candidate exited fullscreen mode',
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [requireFullscreen, isActive, addEvent]);

  // Copy-paste prevention
  useEffect(() => {
    const handleCopy = () => {
      addEvent({
        type: 'copy_paste',
        timestamp: new Date().toISOString(),
        severity: 'medium',
        detail: 'Candidate attempted to copy content during interview',
      });
    };
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
    };
  }, [addEvent]);

  // Camera + face detection (brightness-based heuristic)
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120 }, audio: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Audio monitoring
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          source.connect(analyserRef.current);

          let lastSpikeTime = 0;
          audioIntervalRef.current = setInterval(() => {
            if (!analyserRef.current) return;
            const data = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            const now = Date.now();
            if (avg > 80 && now - lastSpikeTime > 10000) {
              lastSpikeTime = now;
              addEvent({
                type: 'audio_spike',
                timestamp: new Date().toISOString(),
                severity: 'medium',
                detail: 'Unusual audio level detected — possible external voice or noise',
              });
            }
          }, 2000);
        }
      } catch { /* audio monitoring optional */ }

      // Face detection via canvas brightness analysis
      faceCheckIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, 160, 120);
        const imageData = ctx.getImageData(0, 0, 160, 120);
        const pixels = imageData.data;
        let brightnessSum = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          brightnessSum += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        }
        const avgBrightness = brightnessSum / (pixels.length / 4);
        const detected = avgBrightness > 20 && avgBrightness < 240;
        setFaceDetected(detected);
        if (!detected) {
          addEvent({
            type: 'face_not_detected',
            timestamp: new Date().toISOString(),
            severity: 'medium',
            detail: 'Face not detected in camera frame — candidate may have moved away',
          });
        }
      }, 3000);

      setIsActive(true);
    } catch {
      // Camera permission denied — log but don't block
      setIsActive(true);
    }
  }, [addEvent]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (faceCheckIntervalRef.current) clearInterval(faceCheckIntervalRef.current);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, [startCamera]);

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const insights = computeInsights(events);

  if (!showOverlay) return (
    <>
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} width={160} height={120} className="hidden" />
    </>
  );

  return (
    <>
      {/* Hidden camera elements */}
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} width={160} height={120} className="hidden" />

      {/* Warning toast */}
      {showWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm animate-bounce">
          <AlertTriangle size={16} className="shrink-0" />
          <p className="text-sm font-600">{showWarning}</p>
          <button onClick={() => setShowWarning(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Fullscreen prompt */}
      {requireFullscreen && !isFullscreen && isActive && (
        <div className="fixed inset-0 bg-black/80 z-[9998] flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Monitor size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-800 text-[#0D1B3E] mb-2">Fullscreen Required</h3>
            <p className="text-sm text-[#6B7A99] mb-5">This interview requires fullscreen mode. Exiting fullscreen will be flagged as a proctoring violation.</p>
            <button
              onClick={requestFullscreen}
              className="w-full py-3 bg-[#0D9488] text-white rounded-2xl text-sm font-700 hover:bg-[#0b8276] transition-colors"
            >
              Enter Fullscreen & Continue
            </button>
          </div>
        </div>
      )}

      {/* Proctoring status bar */}
      <div className="flex items-center gap-3 px-3 py-2 bg-[#0F1923] border border-[#1E2D3D] rounded-xl">
        <div className="flex items-center gap-1.5">
          <Shield size={12} className="text-[#00C9B1]" />
          <span className="text-[10px] font-700 text-[#00C9B1]">PROCTORED</span>
        </div>
        <div className="w-px h-3 bg-[#1E2D3D]" />
        <div className="flex items-center gap-1.5">
          {faceDetected
            ? <Eye size={11} className="text-emerald-400" />
            : <EyeOff size={11} className="text-red-400 animate-pulse" />
          }
          <span className={`text-[10px] font-600 ${faceDetected ? 'text-emerald-400' : 'text-red-400'}`}>
            {faceDetected ? 'Face OK' : 'No Face'}
          </span>
        </div>
        <div className="w-px h-3 bg-[#1E2D3D]" />
        <div className="flex items-center gap-1.5">
          <Camera size={11} className={streamRef.current ? 'text-emerald-400' : 'text-[#4A6B7A]'} />
          <span className="text-[10px] text-[#4A6B7A]">Cam</span>
        </div>
        <div className="w-px h-3 bg-[#1E2D3D]" />
        <div className="flex items-center gap-1.5">
          <Mic size={11} className={analyserRef.current ? 'text-emerald-400' : 'text-[#4A6B7A]'} />
          <span className="text-[10px] text-[#4A6B7A]">Audio</span>
        </div>
        {warningCount > 0 && (
          <>
            <div className="w-px h-3 bg-[#1E2D3D]" />
            <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full ${insights.riskLevel === 'high' ? 'bg-red-500/20 text-red-400' : insights.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {warningCount} flag{warningCount > 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>
    </>
  );
}

export { computeInsights };
