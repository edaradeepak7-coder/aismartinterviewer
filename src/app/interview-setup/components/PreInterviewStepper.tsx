'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic, Volume2, Wifi, FileText, CheckCircle2,
  AlertCircle, Loader2, ChevronRight, ArrowLeft,
  RefreshCw, Play, Square, Clock, Shield, Info, Zap, Timer
} from 'lucide-react';
import { useCreditBalance, INTERVIEW_DURATION_OPERATIONS } from '@/lib/hooks/useCreditBalance';
import CreditCheckModal from '@/components/CreditCheckModal';
import { saveInterviewSessionConfig, loadInterviewSessionConfig } from '@/lib/interview/sessionConfig';

type StepStatus = 'pending' | 'active' | 'passed' | 'failed';

interface Step {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  { id: 'duration', label: 'Session Duration', shortLabel: 'Duration', icon: <Timer size={18} /> },
  { id: 'mic', label: 'Microphone Test', shortLabel: 'Microphone', icon: <Mic size={18} /> },
  { id: 'speaker', label: 'Speaker Test', shortLabel: 'Speaker', icon: <Volume2 size={18} /> },
  { id: 'network', label: 'Network Check', shortLabel: 'Network', icon: <Wifi size={18} /> },
  { id: 'instructions', label: 'Interview Instructions', shortLabel: 'Instructions', icon: <FileText size={18} /> },
];

interface DurationOption {
  minutes: 20 | 30 | 45 | 60;
  label: string;
  description: string;
  questions: string;
  recommended?: boolean;
}

const DURATION_OPTIONS: DurationOption[] = [
  {
    minutes: 20,
    label: '20 min',
    description: 'Quick screening round',
    questions: '5–6 questions',
  },
  {
    minutes: 30,
    label: '30 min',
    description: 'Standard practice session',
    questions: '8–10 questions',
    recommended: true,
  },
  {
    minutes: 45,
    label: '45 min',
    description: 'In-depth technical round',
    questions: '12–14 questions',
  },
  {
    minutes: 60,
    label: '60 min',
    description: 'Full interview simulation',
    questions: '16–18 questions',
  },
];

export default function PreInterviewStepper() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({
    duration: 'active', mic: 'pending', speaker: 'pending', network: 'pending', instructions: 'pending',
  });
  const [showCreditModal, setShowCreditModal] = useState(false);
  const { balance, canAfford, getCost } = useCreditBalance();
  const [selectedDuration, setSelectedDuration] = useState<20 | 30 | 45 | 60>(() => {
    const existing = loadInterviewSessionConfig();
    const d = existing?.durationMinutes;
    return d === 20 || d === 30 || d === 45 || d === 60 ? d : 30;
  });
  const [presetMeta] = useState(() => {
    const existing = loadInterviewSessionConfig();
    return {
      role: existing?.role,
      company: existing?.company,
      subjectName: existing?.subjectName,
    };
  });

  const setStatus = (id: string, status: StepStatus) => {
    setStepStatuses(prev => ({ ...prev, [id]: status }));
  };

  const goNext = () => {
    const nextIndex = currentStep + 1;
    if (nextIndex < STEPS.length) {
      setStatus(STEPS[nextIndex].id, 'active');
      setCurrentStep(nextIndex);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      const prevId = STEPS[currentStep - 1].id;
      setStatus(prevId, 'active');
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepPass = () => {
    setStatus(STEPS[currentStep].id, 'passed');
    goNext();
  };

  const handleStepFail = () => {
    setStatus(STEPS[currentStep].id, 'failed');
  };

  const handleRetry = () => {
    setStatus(STEPS[currentStep].id, 'active');
  };

  const allPassed = STEPS.every(s => stepStatuses[s.id] === 'passed');
  const stepId = STEPS[currentStep]?.id;
  const stepStatus = stepStatuses[stepId];

  const handleEnterInterview = () => {
    setShowCreditModal(true);
  };

  const handleCreditConfirm = () => {
    setShowCreditModal(false);
    const existing = loadInterviewSessionConfig();
    saveInterviewSessionConfig({
      durationMinutes: selectedDuration,
      subjectId: existing?.subjectId,
      subjectName: presetMeta.subjectName || existing?.subjectName,
      role: presetMeta.role || existing?.role,
      company: presetMeta.company || existing?.company,
    });
    router.push('/live-interview');
  };

  const durationOperation = INTERVIEW_DURATION_OPERATIONS[selectedDuration];

  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col text-white">
      {showCreditModal && (
        <CreditCheckModal
          operation={durationOperation}
          balance={balance}
          onConfirm={handleCreditConfirm}
          onCancel={() => setShowCreditModal(false)}
        />
      )}
      {/* Top bar */}
      <header className="h-14 border-b border-white/10 flex items-center px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center">
            <Shield size={14} className="text-primary" />
          </div>
          <span className="text-sm font-semibold text-white">Interview Setup Check</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          <Clock size={13} />
          <span>
            {presetMeta.role ? `${presetMeta.role}` : 'Mock Interview'}
            {presetMeta.company ? ` · ${presetMeta.company}` : ''}
            {' · '}{selectedDuration} min session
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <StepProgress steps={STEPS} statuses={stepStatuses} currentStep={currentStep} />

          <div className="mt-8 bg-[#111827] border border-white/10 rounded-xl overflow-hidden">
            {stepId === 'duration' && (
              <DurationStep
                status={stepStatus}
                selectedDuration={selectedDuration}
                onSelectDuration={setSelectedDuration}
                onPass={handleStepPass}
                balance={balance}
                getCost={getCost}
              />
            )}
            {stepId === 'mic' && (
              <MicrophoneStep status={stepStatus} onPass={handleStepPass} onFail={handleStepFail} onRetry={handleRetry} />
            )}
            {stepId === 'speaker' && (
              <SpeakerStep status={stepStatus} onPass={handleStepPass} onFail={handleStepFail} onRetry={handleRetry} />
            )}
            {stepId === 'network' && (
              <NetworkStep status={stepStatus} onPass={handleStepPass} onFail={handleStepFail} onRetry={handleRetry} />
            )}
            {stepId === 'instructions' && (
              <InstructionsStep status={stepStatus} onPass={handleStepPass} duration={selectedDuration} />
            )}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft size={15} />
              Back
            </button>

            {allPassed ? (
              <button
                onClick={handleEnterInterview}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-all duration-150 active:scale-95"
              >
                Enter Live Interview
                <ChevronRight size={16} />
              </button>
            ) : (
              <div className="text-xs text-slate-500">
                Step {currentStep + 1} of {STEPS.length}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Duration Step ─── */
function DurationStep({
  status, selectedDuration, onSelectDuration, onPass, balance, getCost
}: {
  status: StepStatus;
  selectedDuration: 20 | 30 | 45 | 60;
  onSelectDuration: (d: 20 | 30 | 45 | 60) => void;
  onPass: () => void;
  balance: any;
  getCost: (op: any) => number;
}) {
  const selectedOp = INTERVIEW_DURATION_OPERATIONS[selectedDuration];
  const cost = getCost(selectedOp);
  const canAffordSelected = balance.remaining >= cost;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 text-primary">
          <Timer size={20} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Choose Session Duration</h2>
          <p className="text-sm text-slate-400 mt-0.5">Select how long you want your mock interview to be.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {DURATION_OPTIONS.map(opt => {
          const op = INTERVIEW_DURATION_OPERATIONS[opt.minutes];
          const c = getCost(op);
          const affordable = balance.remaining >= c;
          const isSelected = selectedDuration === opt.minutes;

          return (
            <button
              key={opt.minutes}
              onClick={() => onSelectDuration(opt.minutes)}
              className={[
                'relative p-4 rounded-xl border-2 text-left transition-all duration-150',
                isSelected
                  ? 'border-primary bg-primary/10' :'border-white/10 bg-white/5 hover:border-white/20',
                !affordable ? 'opacity-60' : '',
              ].join(' ')}
            >
              {opt.recommended && (
                <span className="absolute top-2 right-2 text-[9px] font-700 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full border border-primary/30">
                  POPULAR
                </span>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className={isSelected ? 'text-primary' : 'text-slate-400'} />
                <span className={`text-base font-700 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {opt.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2">{opt.description}</p>
              <p className="text-[11px] text-slate-500 mb-3">{opt.questions}</p>
              <div className="flex items-center gap-1.5">
                <Zap size={12} className={affordable ? 'text-amber-400' : 'text-red-400'} />
                <span className={`text-xs font-700 ${affordable ? 'text-amber-300' : 'text-red-400'}`}>
                  {c} credits
                </span>
                {!affordable && (
                  <span className="text-[10px] text-red-400 ml-1">Insufficient</span>
                )}
              </div>
              {isSelected && (
                <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <CheckCircle2 size={10} className="text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Balance summary */}
      <div className="bg-[#0B1120] rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-amber-400" />
          <span className="text-sm text-slate-300">Your balance:</span>
          <span className="text-sm font-700 text-white">{balance.remaining.toLocaleString()} credits</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">This session:</span>
          <span className={`text-sm font-700 ${canAffordSelected ? 'text-amber-300' : 'text-red-400'}`}>
            {cost} credits
          </span>
        </div>
      </div>

      {!canAffordSelected && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          Insufficient credits for this duration. Choose a shorter session or top up from the Subscription page.
        </div>
      )}

      <button
        onClick={onPass}
        disabled={!canAffordSelected}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-all active:scale-95"
      >
        <CheckCircle2 size={15} />
        Confirm {selectedDuration}-Minute Session
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

/* ─── Step Progress Bar ─── */
function StepProgress({ steps, statuses, currentStep }: {
  steps: Step[];
  statuses: Record<string, StepStatus>;
  currentStep: number;
}) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const status = statuses[step.id];
        const isLast = i === steps.length - 1;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div className={[
                'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0',
                status === 'passed' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : status === 'failed' ? 'bg-red-500/20 border-red-500 text-red-400'
                  : status === 'active'? 'bg-primary/20 border-primary text-primary' :'bg-white/5 border-white/20 text-slate-500',
              ].join(' ')}>
                {status === 'passed' ? <CheckCircle2 size={16} /> :
                 status === 'failed' ? <AlertCircle size={16} /> :
                 step.icon}
              </div>
              <span className={[
                'text-[11px] font-medium whitespace-nowrap hidden sm:block',
                status === 'active' ? 'text-white' :
                status === 'passed' ? 'text-emerald-400' :
                status === 'failed' ? 'text-red-400' : 'text-slate-500',
              ].join(' ')}>
                {step.shortLabel}
              </span>
            </div>
            {!isLast && (
              <div className={[
                'flex-1 h-px mx-2 mb-5 transition-all duration-300',
                statuses[steps[i + 1].id] !== 'pending' || statuses[step.id] === 'passed'
                  ? 'bg-primary/40' : 'bg-white/10',
              ].join(' ')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Shared Step Shell ─── */
interface StepProps {
  status: StepStatus;
  onPass: () => void;
  onFail: () => void;
  onRetry: () => void;
}

function StepShell({
  icon, title, description, status, onRetry, failMessage, children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: StepStatus;
  onRetry: () => void;
  failMessage?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start gap-4">
        <div className={[
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          status === 'passed' ? 'bg-emerald-500/20 text-emerald-400' :
          status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary',
        ].join(' ')}>
          {status === 'passed' ? <CheckCircle2 size={20} /> :
           status === 'failed' ? <AlertCircle size={20} /> : icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>

      {status === 'passed' && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 size={15} />
          Test passed successfully. Proceeding to next step…
        </div>
      )}

      {status === 'failed' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-300">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{failMessage || 'Test failed. Please check your device settings and try again.'}</span>
          </div>
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 border border-white/15 hover:bg-white/5 text-white text-sm font-medium py-2.5 rounded-lg transition-all"
          >
            <RefreshCw size={14} />
            Retry Test
          </button>
        </div>
      )}

      {status === 'active' && children}
    </div>
  );
}

/* ─── Microphone Step ─── */
const MIC_PASS_PEAK = 3;
const MIC_SPEECH_FLOOR = 0.01;
const MIC_SPEECH_FRAMES = 6;

function MicrophoneStep({ status, onPass, onFail, onRetry }: StepProps) {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(20).fill(4));
  const [failMessage, setFailMessage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const peakRef = useRef(0);
  const speechFramesRef = useRef(0);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);
  const onPassRef = useRef(onPass);
  const onFailRef = useRef(onFail);
  onPassRef.current = onPass;
  onFailRef.current = onFail;

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    autoStopRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const evaluateAndFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const peak = peakRef.current;
    const speechFrames = speechFramesRef.current;
    cleanup();
    setRecording(false);
    setBars(Array(20).fill(4));
    setLevel(0);
    const heard = peak >= MIC_PASS_PEAK || speechFrames >= MIC_SPEECH_FRAMES;
    if (heard) {
      setFailMessage(null);
      onPassRef.current();
    } else {
      setFailMessage(
        peak > 0
          ? `Peak level ${peak}% was too quiet. Speak a bit louder and retry.`
          : 'No microphone input detected. Check your mic is unmuted and try again.'
      );
      onFailRef.current();
    }
  };

  const startRecording = async () => {
    setFailMessage(null);
    peakRef.current = 0;
    speechFramesRef.current = 0;
    finishedRef.current = false;
    cleanup();
    try {
      // Prefer raw capture for the level test — AGC/NS can flatten quiet speech to "silence".
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const track = stream.getAudioTracks()[0];
      if (!track || track.readyState === 'ended') {
        cleanup();
        setFailMessage('Microphone track is unavailable. Pick another input device and retry.');
        onFailRef.current();
        return;
      }
      track.enabled = true;

      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.35;
      source.connect(analyser);
      const timeData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      setRecording(true);

      const tick = () => {
        if (ctx.state === 'suspended') void ctx.resume();
        analyser.getByteTimeDomainData(timeData);
        let sumSq = 0;
        let peakSample = 0;
        for (let i = 0; i < timeData.length; i++) {
          const v = (timeData[i] - 128) / 128;
          sumSq += v * v;
          peakSample = Math.max(peakSample, Math.abs(v));
        }
        const rms = Math.sqrt(sumSq / timeData.length);
        if (rms >= MIC_SPEECH_FLOOR || peakSample >= 0.04) speechFramesRef.current += 1;
        // Scale so quiet speech (~0.01–0.08 RMS) maps to a readable meter
        const pct = Math.min(100, Math.round(Math.max(rms * 400, peakSample * 120)));
        peakRef.current = Math.max(peakRef.current, pct);
        setLevel(pct);

        analyser.getByteFrequencyData(freqData);
        const step = Math.floor(freqData.length / 20) || 1;
        setBars(
          Array.from({ length: 20 }, (_, i) => {
            const v = freqData[i * step] || 0;
            return Math.max(4, Math.round((v / 255) * 36));
          })
        );
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      autoStopRef.current = setTimeout(() => {
        evaluateAndFinish();
      }, 4500);
    } catch (err: unknown) {
      cleanup();
      setRecording(false);
      const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
      const msg =
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Microphone permission denied. Allow access in the browser and retry.'
          : name === 'NotFoundError'
            ? 'No microphone found. Plug in a mic or select an input device and retry.'
            : 'Could not access the microphone. Check device settings and retry.';
      setFailMessage(msg);
      onFailRef.current();
    }
  };

  useEffect(() => {
    if (status === 'active') {
      setFailMessage(null);
      setRecording(false);
      setLevel(0);
      setBars(Array(20).fill(4));
    }
  }, [status]);

  useEffect(() => () => cleanup(), []);

  return (
    <StepShell
      icon={<Mic size={22} />}
      title="Microphone Test"
      description="Speak a few words to verify your microphone is working correctly."
      status={status}
      onRetry={onRetry}
      failMessage={failMessage}
    >
      <div className="space-y-5">
        <div className="bg-[#0B1120] rounded-lg p-5 flex flex-col items-center gap-4">
          <div className="flex items-end gap-[3px] h-10">
            {bars.map((h, i) => (
              <div key={i} className={['rounded-sm transition-all duration-75', recording ? 'bg-primary' : 'bg-white/15'].join(' ')} style={{ width: 4, height: recording ? h : 4 }} />
            ))}
          </div>
          {recording && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Listening… speak now (real mic levels)
            </div>
          )}
        </div>
        {recording && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400"><span>Input level</span><span>{level}%</span></div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-75" style={{ width: `${level}%` }} />
            </div>
          </div>
        )}
        {status === 'active' && !recording && (
          <button onClick={startRecording} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold py-2.5 rounded-lg transition-all active:scale-95">
            <Play size={15} /> Start Microphone Test
          </button>
        )}
        {recording && (
          <button onClick={evaluateAndFinish} className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold py-2.5 rounded-lg transition-all">
            <Square size={14} /> Stop Recording
          </button>
        )}
      </div>
    </StepShell>
  );
}

/* ─── Speaker Step ─── */
function SpeakerStep({ status, onPass, onFail, onRetry }: StepProps) {
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const playAudio = async () => {
    setError(null);
    setPlaying(true);
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      await new Promise((r) => setTimeout(r, 1200));
      osc.stop();
      await ctx.close();
      ctxRef.current = null;
      setPlayed(true);
    } catch {
      setError('Could not play audio. Check speaker permissions and try again.');
      onFail();
    } finally {
      setPlaying(false);
    }
  };

  useEffect(() => () => {
    if (ctxRef.current) void ctxRef.current.close().catch(() => {});
  }, []);

  return (
    <StepShell icon={<Volume2 size={22} />} title="Speaker Test" description="Play the test tone, then confirm you can hear it." status={status} onRetry={onRetry}>
      <div className="space-y-5">
        <div className="bg-[#0B1120] rounded-lg p-5 flex flex-col items-center gap-4">
          <div className={['w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all', playing ? 'border-primary bg-primary/20 animate-pulse' : 'border-white/20 bg-white/5'].join(' ')}>
            <Volume2 size={24} className={playing ? 'text-primary' : 'text-slate-400'} />
          </div>
          {playing && <p className="text-xs text-slate-400">Playing 880 Hz test tone…</p>}
          {!playing && played && (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={13} /> Tone played — confirm below</p>
          )}
          {error && <p className="text-xs text-red-300 text-center">{error}</p>}
        </div>
        {status === 'active' && !played && (
          <button onClick={playAudio} disabled={playing} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-all active:scale-95">
            <Play size={15} /> {playing ? 'Playing…' : 'Play Test Tone'}
          </button>
        )}
        {played && status === 'active' && (
          <div className="flex gap-3">
            <button onClick={onFail} className="flex-1 text-sm font-medium py-2.5 rounded-lg border border-white/15 text-slate-300 hover:bg-white/5 transition-all">I didn't hear anything</button>
            <button onClick={onPass} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-2.5 rounded-lg transition-all active:scale-95">
              <CheckCircle2 size={15} /> Sounds good
            </button>
          </div>
        )}
      </div>
    </StepShell>
  );
}

/* ─── Network Step ─── */
function NetworkStep({ status, onPass, onFail, onRetry }: StepProps) {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<null | {
    latency: number;
    samples: number;
    downlink: number | null;
    effectiveType: string | null;
    online: boolean;
    quality: 'excellent' | 'good' | 'poor';
  }>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async () => {
    setChecking(true);
    setResults(null);
    setError(null);
    try {
      if (!navigator.onLine) {
        setResults({
          latency: 0,
          samples: 0,
          downlink: null,
          effectiveType: null,
          online: false,
          quality: 'poor',
        });
        setChecking(false);
        return;
      }

      const samples: number[] = [];
      for (let i = 0; i < 4; i++) {
        const t0 = performance.now();
        const res = await fetch(`/api/ping?n=${i}&t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
        });
        const t1 = performance.now();
        if (!res.ok) throw new Error(`Ping failed (${res.status})`);
        await res.json().catch(() => ({}));
        samples.push(Math.round(t1 - t0));
      }

      const latency = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const downlink = typeof conn?.downlink === 'number' ? conn.downlink : null;
      const effectiveType = typeof conn?.effectiveType === 'string' ? conn.effectiveType : null;

      let quality: 'excellent' | 'good' | 'poor' = 'good';
      if (latency < 120 && (downlink == null || downlink >= 5) && effectiveType !== '2g' && effectiveType !== 'slow-2g') {
        quality = 'excellent';
      } else if (latency > 400 || effectiveType === '2g' || effectiveType === 'slow-2g' || (downlink != null && downlink < 1)) {
        quality = 'poor';
      }

      setResults({
        latency,
        samples: samples.length,
        downlink,
        effectiveType,
        online: true,
        quality,
      });
      if (quality !== 'poor') setTimeout(onPass, 600);
    } catch (err: any) {
      setError(err?.message || 'Network check failed');
      setResults({
        latency: 0,
        samples: 0,
        downlink: null,
        effectiveType: null,
        online: navigator.onLine,
        quality: 'poor',
      });
    } finally {
      setChecking(false);
    }
  };

  const qualityColor = results?.quality === 'excellent' ? 'text-emerald-400' : results?.quality === 'good' ? 'text-amber-400' : 'text-red-400';

  return (
    <StepShell icon={<Wifi size={22} />} title="Network Check" description="Measures real round-trip latency to this app (not simulated Mbps)." status={status} onRetry={onRetry}>
      <div className="space-y-5">
        <div className="bg-[#0B1120] rounded-lg p-5 space-y-4">
          {checking && (
            <div className="flex flex-col items-center gap-3 py-2">
              <Loader2 size={28} className="text-primary animate-spin" />
              <p className="text-sm text-slate-400">Pinging /api/ping…</p>
            </div>
          )}
          {results && (
            <div className="space-y-3">
              <div className={['flex items-center gap-2 text-sm font-semibold', qualityColor].join(' ')}>
                <CheckCircle2 size={16} />
                Connection quality: {results.quality.charAt(0).toUpperCase() + results.quality.slice(1)}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Latency', value: results.samples ? `${results.latency} ms` : '—', good: results.latency > 0 && results.latency < 200 },
                  { label: 'Online', value: results.online ? 'Yes' : 'No', good: results.online },
                  {
                    label: 'Browser hint',
                    value: results.downlink != null
                      ? `${results.downlink} Mbps`
                      : (results.effectiveType || 'n/a'),
                    good: results.quality !== 'poor',
                  },
                ].map(m => (
                  <div key={m.label} className="bg-white/5 rounded-lg p-3 text-center">
                    <p className={['text-base font-bold tabular-nums', m.good ? 'text-emerald-400' : 'text-amber-400'].join(' ')}>{m.value}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Latency is measured. Browser hint uses Network Information API when available (not invented).
              </p>
              {error && <p className="text-xs text-red-300 text-center">{error}</p>}
            </div>
          )}
          {!checking && !results && (
            <div className="flex flex-col items-center gap-2 py-2 text-slate-500">
              <Wifi size={28} className="opacity-40" />
              <p className="text-sm">Ready to test your connection</p>
            </div>
          )}
        </div>
        {status === 'active' && !results && (
          <button onClick={runCheck} disabled={checking} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-all active:scale-95">
            {checking ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />}
            {checking ? 'Checking…' : 'Run Network Check'}
          </button>
        )}
        {results?.quality === 'poor' && status === 'active' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              Your connection may affect interview quality. Consider switching networks.
            </div>
            <div className="flex gap-3">
              <button onClick={onRetry} className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-lg border border-white/15 text-slate-300 hover:bg-white/5 transition-all">
                <RefreshCw size={13} /> Retry
              </button>
              <button onClick={onPass} className="flex-1 text-sm font-medium py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-all">Continue anyway</button>
            </div>
          </div>
        )}
      </div>
    </StepShell>
  );
}

/* ─── Instructions Step ─── */
function InstructionsStep({ status, onPass, duration }: { status: StepStatus; onPass: () => void; duration: number }) {
  const [acknowledged, setAcknowledged] = useState(false);

  const instructions = [
    { icon: <Mic size={15} />, text: 'Speak clearly and at a natural pace. The AI interviewer will wait for you to finish.' },
    { icon: <Clock size={15} />, text: `This session is ${duration} minutes. Aim for concise, focused answers (1–3 minutes each).` },
    { icon: <Volume2 size={15} />, text: 'You can switch between voice and text mode at any time during the interview.' },
    { icon: <FileText size={15} />, text: 'A live transcript is available on the right panel. You can collapse it if preferred.' },
    { icon: <RefreshCw size={15} />, text: 'If you need a question repeated, use the "Replay Question" button.' },
    { icon: <Shield size={15} />, text: 'This session is recorded for evaluation purposes. Ensure you are in a quiet environment.' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 text-primary">
          <FileText size={20} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Interview Instructions</h2>
          <p className="text-sm text-slate-400 mt-0.5">Please read carefully before starting your interview.</p>
        </div>
      </div>

      <div className="bg-[#0B1120] rounded-lg divide-y divide-white/5">
        {instructions.map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <span className="text-primary shrink-0 mt-0.5">{item.icon}</span>
            <p className="text-sm text-slate-300 leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
        <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200 leading-relaxed">
          <span className="font-semibold">Session details:</span> Mock Interview · {duration} minutes · AI-powered evaluation with detailed feedback on technical skills, communication, and behavioral competencies.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          onClick={() => setAcknowledged(a => !a)}
          className={['w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all', acknowledged ? 'bg-primary border-primary' : 'border-white/30 group-hover:border-white/50'].join(' ')}
        >
          {acknowledged && <CheckCircle2 size={12} className="text-white" />}
        </div>
        <span className="text-sm text-slate-300 leading-relaxed">
          I have read and understood the interview instructions and confirm I am ready to begin.
        </span>
      </label>

      <button
        onClick={onPass}
        disabled={!acknowledged}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-all active:scale-95"
      >
        I&apos;m Ready — Begin Interview
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
