'use client';
import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { LatencyPoint } from './mockProviderData';

interface Props {
  data: LatencyPoint[];
}

const providerLines: { key: keyof LatencyPoint; label: string; color: string; dashed?: boolean }[] = [
  { key: 'deepgram', label: 'Deepgram (STT)', color: '#60a5fa' },
  { key: 'groq', label: 'Groq (LLM)', color: '#a78bfa' },
  { key: 'openai', label: 'OpenAI GPT-4o (LLM fallback)', color: '#818cf8', dashed: true },
  { key: 'cartesia', label: 'Cartesia (TTS)', color: '#34d399' },
  { key: 'elevenlabs', label: 'ElevenLabs (TTS fallback)', color: '#6ee7b7', dashed: true },
  { key: 'claude', label: 'Claude Sonnet (Eval)', color: '#fb923c' },
];

const allKeys = providerLines.map((p) => p.key);

export default function LatencyChart({ data }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-700 text-foreground">Latency Trends (24h)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Average response latency per provider over the last 24 hours</p>
        </div>
        <span className="text-xs text-muted-foreground">ms</span>
      </div>

      {/* Legend toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {providerLines.map((p) => (
          <button
            key={String(p.key)}
            onClick={() => toggle(String(p.key))}
            className={[
              'flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all',
              hidden.has(String(p.key))
                ? 'border-slate-700 text-slate-600 bg-transparent' :'border-slate-700 text-slate-300 bg-slate-800/60',
            ].join(' ')}
          >
            <span
              className="w-3 h-0.5 rounded-full inline-block"
              style={{
                backgroundColor: hidden.has(String(p.key)) ? '#475569' : p.color,
                borderBottom: p.dashed ? `2px dashed ${p.color}` : undefined,
                background: p.dashed ? 'none' : p.color,
              }}
            />
            {p.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}ms`}
            width={52}
          />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
            formatter={(value: number, name: string) => [`${value}ms`, name]}
          />
          {providerLines.map((p) =>
            hidden.has(String(p.key)) ? null : (
              <Line
                key={String(p.key)}
                type="monotone"
                dataKey={p.key}
                name={p.label}
                stroke={p.color}
                strokeWidth={2}
                strokeDasharray={p.dashed ? '5 3' : undefined}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
