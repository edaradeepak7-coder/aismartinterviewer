'use client';
import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, AlertTriangle, XCircle, Zap, Shield } from 'lucide-react';
import { FallbackChain, ProviderStatus } from './mockProviderData';

interface Props {
  chains: FallbackChain[];
}

const statusIcon: Record<ProviderStatus, React.ReactNode> = {
  operational: <CheckCircle2 size={15} className="text-emerald-400" />,
  degraded: <AlertTriangle size={15} className="text-amber-400" />,
  down: <XCircle size={15} className="text-red-400" />,
};

const statusDot: Record<ProviderStatus, string> = {
  operational: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  down: 'bg-red-400',
};

const categoryColors: Record<string, { bg: string; border: string; label: string }> = {
  STT: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'text-blue-400' },
  LLM: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', label: 'text-violet-400' },
  TTS: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', label: 'text-teal-400' },
  Evaluation: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'text-orange-400' },
};

export default function FallbackVisualization({ chains }: Props) {
  const [activeChain, setActiveChain] = useState<string>(chains[0]?.id ?? '');

  const selected = chains.find((c) => c.id === activeChain) ?? chains[0];
  const colors = categoryColors[selected.category];

  return (
    <div className="space-y-6">
      {/* Chain selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {chains.map((chain) => {
          const c = categoryColors[chain.category];
          const isActive = chain.id === activeChain;
          return (
            <button
              key={chain.id}
              onClick={() => setActiveChain(chain.id)}
              className={[
                'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-150',
                isActive
                  ? `${c.bg} ${c.border} ring-1 ring-inset ${c.border}`
                  : 'bg-card border-border hover:border-slate-600',
              ].join(' ')}
            >
              <span className={`text-[11px] font-700 uppercase tracking-wide ${isActive ? c.label : 'text-muted-foreground'}`}>
                {chain.category}
              </span>
              <span className="text-xs font-500 text-foreground leading-snug">{chain.label}</span>
              <span className="text-[10px] text-muted-foreground">{chain.steps.length} step{chain.steps.length > 1 ? 's' : ''}</span>
            </button>
          );
        })}
      </div>

      {/* Chain detail */}
      <div className={`rounded-xl border ${colors.border} ${colors.bg} p-5 space-y-5`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={15} className={colors.label} />
            <h3 className={`text-sm font-700 ${colors.label}`}>{selected.label}</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{selected.description}</p>
        </div>

        {/* Steps flow */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 flex-wrap">
          {selected.steps.map((step, idx) => (
            <React.Fragment key={step.provider}>
              {/* Step card */}
              <div className="flex-1 min-w-[200px] bg-card border border-border rounded-xl p-4 space-y-3">
                {/* Role badge */}
                <div className="flex items-center justify-between">
                  <span className={[
                    'text-[10px] font-700 uppercase tracking-wide px-2 py-0.5 rounded-full border',
                    step.role === 'primary' ?'bg-primary/15 text-primary border-primary/30'
                      : step.role === 'fallback' ?'bg-slate-500/15 text-slate-400 border-slate-500/30' :'bg-orange-500/15 text-orange-400 border-orange-500/30',
                  ].join(' ')}>
                    {step.role}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${statusDot[step.status]} ${step.status === 'operational' ? 'animate-pulse' : ''}`} />
                    {statusIcon[step.status]}
                  </div>
                </div>

                {/* Provider info */}
                <div>
                  <p className="text-sm font-700 text-foreground">{step.provider}</p>
                  <p className="text-[11px] text-muted-foreground">{step.model}</p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                  <div>
                    <p className="text-[13px] font-700 text-foreground">{step.latencyMs}ms</p>
                    <p className="text-[10px] text-muted-foreground">Avg latency</p>
                  </div>
                  <div>
                    <p className="text-[13px] font-700 text-foreground">{step.activatedCount.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Req today</p>
                  </div>
                </div>

                {/* Trigger condition */}
                {step.triggerCondition && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-start gap-1.5">
                      <Zap size={11} className="text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-amber-400 leading-relaxed">{step.triggerCondition}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Arrow connector */}
              {idx < selected.steps.length - 1 && (
                <div className="flex flex-col items-center gap-1 shrink-0 md:self-center">
                  <ArrowRight size={18} className="text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wide">failover</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Failover stats */}
        {selected.steps.length > 1 && (
          <div className="pt-3 border-t border-border/50">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Failovers today</p>
                <p className="text-lg font-700 text-foreground mt-0.5">
                  {selected.steps[1]?.activatedCount > 1000
                    ? `${(selected.steps[1].activatedCount / 1000).toFixed(1)}k`
                    : selected.steps[1]?.activatedCount ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Primary traffic share</p>
                <p className="text-lg font-700 text-foreground mt-0.5">
                  {Math.round(
                    (selected.steps[0].activatedCount /
                      selected.steps.reduce((s, st) => s + st.activatedCount, 0)) *
                      100
                  )}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Latency delta</p>
                <p className="text-lg font-700 text-amber-400 mt-0.5">
                  +{selected.steps[1].latencyMs - selected.steps[0].latencyMs}ms
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
