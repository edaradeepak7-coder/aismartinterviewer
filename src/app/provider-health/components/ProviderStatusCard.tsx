'use client';
import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ProviderInfo, ProviderStatus } from './mockProviderData';

interface Props {
  provider: ProviderInfo;
}

const statusConfig: Record<ProviderStatus, { label: string; color: string; icon: React.ReactNode; dot: string }> = {
  operational: {
    label: 'Operational',
    color: 'text-emerald-400',
    icon: <CheckCircle2 size={14} className="text-emerald-400" />,
    dot: 'bg-emerald-400',
  },
  degraded: {
    label: 'Degraded',
    color: 'text-amber-400',
    icon: <AlertTriangle size={14} className="text-amber-400" />,
    dot: 'bg-amber-400',
  },
  down: {
    label: 'Down',
    color: 'text-red-400',
    icon: <XCircle size={14} className="text-red-400" />,
    dot: 'bg-red-400',
  },
};

const categoryColors: Record<string, string> = {
  STT: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  LLM: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  TTS: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  Evaluation: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
};

const roleColors: Record<string, string> = {
  primary: 'bg-primary/15 text-primary border-primary/20',
  fallback: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  evaluation: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
};

export default function ProviderStatusCard({ provider }: Props) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[provider.status];
  const latencyPct = Math.min((provider.latencyMs / provider.latencyTarget) * 100, 100);
  const latencyColor =
    latencyPct < 60 ? 'bg-emerald-400' : latencyPct < 85 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-600 uppercase tracking-wide px-2 py-0.5 rounded border ${categoryColors[provider.category]}`}>
                {provider.category}
              </span>
              <span className={`text-[11px] font-500 px-2 py-0.5 rounded border ${roleColors[provider.role]}`}>
                {provider.role}
              </span>
            </div>
            <h3 className="text-sm font-700 text-foreground mt-2">{provider.name}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{provider.model}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${status.dot} ${provider.status === 'operational' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-500 ${status.color}`}>{status.label}</span>
          </div>
        </div>

        {/* Latency bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-muted-foreground">Latency</span>
            <span className="text-[11px] font-600 text-foreground">
              {provider.latencyMs}ms
              <span className="text-muted-foreground font-400"> / {provider.latencyTarget}ms target</span>
            </span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${latencyColor}`}
              style={{ width: `${latencyPct}%` }}
            />
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="text-center">
            <p className="text-[13px] font-700 text-foreground">{provider.uptime}%</p>
            <p className="text-[10px] text-muted-foreground">Uptime</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-[13px] font-700 text-foreground">{provider.requestsToday.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Req / day</p>
          </div>
          <div className="text-center">
            <p className={`text-[13px] font-700 ${provider.errorRate > 1 ? 'text-amber-400' : 'text-foreground'}`}>
              {provider.errorRate}%
            </p>
            <p className="text-[10px] text-muted-foreground">Error rate</p>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground hover:text-foreground hover:bg-slate-800/40 transition-colors"
      >
        <span>Details</span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-border bg-slate-900/30">
          <p className="text-xs text-muted-foreground pt-3 leading-relaxed">{provider.description}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {provider.tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground pt-1">Last checked: {provider.lastChecked}</p>
        </div>
      )}
    </div>
  );
}
