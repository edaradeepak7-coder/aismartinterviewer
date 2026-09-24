'use client';
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ArrowRightLeft, Info } from 'lucide-react';
import { ProviderEvent } from './mockProviderData';

interface Props {
  events: ProviderEvent[];
}

const typeConfig = {
  failover: {
    icon: <ArrowRightLeft size={14} className="text-amber-400" />,
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    label: 'Failover',
    labelColor: 'text-amber-400',
  },
  recovery: {
    icon: <CheckCircle2 size={14} className="text-emerald-400" />,
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    label: 'Recovery',
    labelColor: 'text-emerald-400',
  },
  degraded: {
    icon: <AlertTriangle size={14} className="text-red-400" />,
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
    label: 'Degraded',
    labelColor: 'text-red-400',
  },
  info: {
    icon: <Info size={14} className="text-blue-400" />,
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    label: 'Info',
    labelColor: 'text-blue-400',
  },
};

const categoryColors: Record<string, string> = {
  STT: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  LLM: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  TTS: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  Evaluation: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

type FilterType = 'all' | 'failover' | 'recovery' | 'degraded' | 'info';

export default function ProviderEventLog({ events }: Props) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All Events' },
    { id: 'failover', label: 'Failovers' },
    { id: 'degraded', label: 'Degraded' },
    { id: 'recovery', label: 'Recoveries' },
    { id: 'info', label: 'Info' },
  ];

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={[
              'text-xs px-3 py-1.5 rounded-full border transition-all',
              filter === f.id
                ? 'bg-primary/15 text-primary border-primary/30' :'bg-card text-muted-foreground border-border hover:border-slate-600',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Event list */}
      <div className="space-y-2">
        {filtered.map((event) => {
          const cfg = typeConfig[event.type];
          return (
            <div
              key={event.id}
              className={`flex gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}
            >
              <div className="shrink-0 mt-0.5">{cfg.icon}</div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[11px] font-700 uppercase tracking-wide ${cfg.labelColor}`}>
                    {cfg.label}
                  </span>
                  <span className={`text-[10px] font-600 px-2 py-0.5 rounded border ${categoryColors[event.category] ?? 'text-slate-400'}`}>
                    {event.category}
                  </span>
                  <span className="text-[11px] font-600 text-foreground">{event.provider}</span>
                  {event.durationMs && (
                    <span className="text-[10px] text-muted-foreground">
                      Duration: {event.durationMs >= 60000
                        ? `${Math.round(event.durationMs / 60000)}m`
                        : event.durationMs >= 1000
                        ? `${(event.durationMs / 1000).toFixed(0)}s`
                        : `${event.durationMs}ms`}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{event.timestamp}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{event.message}</p>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No events match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}
