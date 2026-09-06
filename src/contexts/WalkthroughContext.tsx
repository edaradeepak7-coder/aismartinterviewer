'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface WalkthroughStep {
  target: string; // CSS selector or element ID
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: string; // optional CTA label
  highlight?: boolean;
}

export interface WalkthroughConfig {
  id: string;
  role: 'candidate' | 'recruiter' | 'admin';
  steps: WalkthroughStep[];
}

interface WalkthroughContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  config: WalkthroughConfig | null;
  startWalkthrough: (config: WalkthroughConfig) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipWalkthrough: () => void;
  completeWalkthrough: () => void;
  hasCompletedWalkthrough: (id: string) => boolean;
}

const WalkthroughContext = createContext<WalkthroughContextType>({
  isActive: false,
  currentStep: 0,
  totalSteps: 0,
  config: null,
  startWalkthrough: () => {},
  nextStep: () => {},
  prevStep: () => {},
  skipWalkthrough: () => {},
  completeWalkthrough: () => {},
  hasCompletedWalkthrough: () => false,
});

export const useWalkthrough = () => useContext(WalkthroughContext);

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<WalkthroughConfig | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('walkthrough_completed');
      if (stored) setCompleted(JSON.parse(stored));
    } catch {}
  }, []);

  const hasCompletedWalkthrough = useCallback((id: string) => completed.includes(id), [completed]);

  const startWalkthrough = useCallback((cfg: WalkthroughConfig) => {
    setConfig(cfg);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (!config) return;
    if (currentStep < config.steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      completeWalkthrough();
    }
  }, [config, currentStep]);

  const prevStep = useCallback(() => {
    setCurrentStep(s => Math.max(0, s - 1));
  }, []);

  const completeWalkthrough = useCallback(() => {
    if (config) {
      const updated = [...completed, config.id];
      setCompleted(updated);
      try { localStorage.setItem('walkthrough_completed', JSON.stringify(updated)); } catch {}
    }
    setIsActive(false);
    setConfig(null);
    setCurrentStep(0);
  }, [config, completed]);

  const skipWalkthrough = useCallback(() => {
    completeWalkthrough();
  }, [completeWalkthrough]);

  return (
    <WalkthroughContext.Provider value={{
      isActive, currentStep, totalSteps: config?.steps.length ?? 0,
      config, startWalkthrough, nextStep, prevStep, skipWalkthrough, completeWalkthrough, hasCompletedWalkthrough
    }}>
      {children}
      {isActive && config && (
        <WalkthroughOverlay
          step={config.steps[currentStep]}
          stepIndex={currentStep}
          totalSteps={config.steps.length}
          role={config.role}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipWalkthrough}
        />
      )}
    </WalkthroughContext.Provider>
  );
}

// ─── Overlay Component ────────────────────────────────────────────────────────
interface OverlayProps {
  step: WalkthroughStep;
  stepIndex: number;
  totalSteps: number;
  role: 'candidate' | 'recruiter' | 'admin';
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const ROLE_COLORS = {
  candidate: { bg: 'bg-teal-600', border: 'border-teal-500', text: 'text-teal-600', light: 'bg-teal-50', ring: 'ring-teal-500/30' },
  recruiter: { bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-600', light: 'bg-blue-50', ring: 'ring-blue-500/30' },
  admin: { bg: 'bg-violet-600', border: 'border-violet-500', text: 'text-violet-600', light: 'bg-violet-50', ring: 'ring-violet-500/30' },
};

const ROLE_LABELS = {
  candidate: 'Candidate Tour',
  recruiter: 'Recruiter Tour',
  admin: 'Admin Tour',
};

function WalkthroughOverlay({ step, stepIndex, totalSteps, role, onNext, onPrev, onSkip }: OverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const colors = ROLE_COLORS[role];
  const isCenter = step.placement === 'center' || !step.target || step.target === 'body';

  useEffect(() => {
    if (isCenter) { setTargetRect(null); return; }
    const el = document.querySelector(step.target);
    if (!el) { setTargetRect(null); return; }
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [step.target, isCenter]);

  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return;
    const tooltip = tooltipRef.current;
    const tw = tooltip.offsetWidth || 320;
    const th = tooltip.offsetHeight || 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const placement = step.placement || 'bottom';
    let top = 0, left = 0;

    if (placement === 'bottom') {
      top = targetRect.bottom + 16;
      left = targetRect.left + targetRect.width / 2 - tw / 2;
    } else if (placement === 'top') {
      top = targetRect.top - th - 16;
      left = targetRect.left + targetRect.width / 2 - tw / 2;
    } else if (placement === 'right') {
      top = targetRect.top + targetRect.height / 2 - th / 2;
      left = targetRect.right + 16;
    } else if (placement === 'left') {
      top = targetRect.top + targetRect.height / 2 - th / 2;
      left = targetRect.left - tw - 16;
    }

    top = Math.max(16, Math.min(top, vh - th - 16));
    left = Math.max(16, Math.min(left, vw - tw - 16));
    setTooltipPos({ top, left });
  }, [targetRect, step.placement]);

  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 z-[9990] pointer-events-none">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
        {/* Spotlight cutout */}
        {targetRect && (
          <div
            className="absolute rounded-xl ring-4 ring-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
            style={{
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
          />
        )}
      </div>

      {/* Click blocker */}
      <div className="fixed inset-0 z-[9991] pointer-events-auto" onClick={(e) => e.stopPropagation()} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`fixed z-[9999] w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden pointer-events-auto transition-all duration-300`}
        style={isCenter
          ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
          : { top: tooltipPos.top, left: tooltipPos.left }
        }
      >
        {/* Header */}
        <div className={`${colors.bg} px-5 py-3.5 flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-xs font-700">{stepIndex + 1}</span>
            </div>
            <span className="text-white text-xs font-600 opacity-90">{ROLE_LABELS[role]}</span>
          </div>
          <button onClick={onSkip} className="text-white/70 hover:text-white text-xs font-500 transition-colors px-2 py-1 rounded-lg hover:bg-white/10">
            Skip tour
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className={`h-full ${colors.bg} transition-all duration-500`} style={{ width: `${progress}%` }} />
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <h3 className="text-sm font-800 text-[#0D1B3E] mb-1.5">{step.title}</h3>
          <p className="text-xs text-[#6B7A99] leading-relaxed">{step.content}</p>
          {step.action && (
            <div className={`mt-3 px-3 py-2 ${colors.light} rounded-xl`}>
              <p className={`text-xs font-600 ${colors.text}`}>💡 {step.action}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <span className="text-xs text-[#6B7A99]">{stepIndex + 1} of {totalSteps}</span>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button onClick={onPrev} className="px-3 py-1.5 text-xs font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] transition-colors">
                Back
              </button>
            )}
            <button
              onClick={onNext}
              className={`px-4 py-1.5 text-xs font-700 text-white ${colors.bg} rounded-lg hover:opacity-90 transition-opacity`}
            >
              {stepIndex === totalSteps - 1 ? 'Finish 🎉' : 'Next →'}
            </button>
          </div>
        </div>

        {/* Step dots */}
        <div className="pb-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${i === stepIndex ? `w-4 h-1.5 ${colors.bg}` : 'w-1.5 h-1.5 bg-gray-200'}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
