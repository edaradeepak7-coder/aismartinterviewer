'use client';
import React, { useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Server, Play, Loader2 } from 'lucide-react';

type CheckStatus = 'ok' | 'warn' | 'fail' | 'skip';

interface Probe {
  probe_key: string;
  status: CheckStatus;
  latency_ms: number | null;
  detail: Record<string, unknown>;
}

const STATUS_CFG: Record<CheckStatus, { label: string; color: string; bg: string; border: string }> = {
  ok: { label: 'PASS', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  warn: { label: 'WARN', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  fail: { label: 'FAIL', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  skip: { label: 'SKIP', color: 'text-white/30', bg: 'bg-white/5', border: 'border-white/10' },
};

export default function PreLaunchContent() {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [summary, setSummary] = useState({ ok: 0, warn: 0, fail: 0 });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runChecks = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/health-probes?persist=1');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Checks failed');
      setProbes(json.probes || []);
      setSummary(json.summary || { ok: 0, warn: 0, fail: 0 });
      setLastRun(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checks failed');
    } finally {
      setRunning(false);
    }
  }, []);

  const total = probes.length || 1;
  const readyToLaunch = summary.fail === 0 && summary.warn === 0 && probes.length > 0;
  const overallScore = probes.length ? Math.round((summary.ok / total) * 100) : 0;

  return (
    <div className="bg-[#070B14] text-white p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-700 flex items-center gap-2">
            <Server size={20} className="text-teal-400" /> Pre-Launch Validation
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Environment flags + Supabase auth/DB probes</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && <span className="text-xs text-white/30">Last run: {lastRun}</span>}
          <button onClick={runChecks} disabled={running} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-sm font-600 disabled:opacity-50">
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {running ? 'Running…' : 'Run All Checks'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div className={`rounded-xl border p-4 flex items-center gap-4 ${
        !probes.length ? 'bg-white/5 border-white/10' : readyToLaunch ? 'bg-emerald-500/10 border-emerald-500/20' : summary.fail > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'
      }`}>
        {!probes.length ? <RefreshCw size={28} className="text-white/30" /> : readyToLaunch ? <CheckCircle size={28} className="text-emerald-400" /> : summary.fail > 0 ? <XCircle size={28} className="text-red-400" /> : <AlertTriangle size={28} className="text-amber-400" />}
        <div className="flex-1">
          <p className="font-700 text-base">
            {!probes.length ? 'Not run yet' : readyToLaunch ? 'Ready to Launch' : summary.fail > 0 ? 'Not Ready — Critical Failures' : 'Warnings Require Attention'}
          </p>
          <p className="text-xs text-white/40 mt-0.5">{summary.ok} passed · {summary.warn} warnings · {summary.fail} failed · score {overallScore}%</p>
        </div>
      </div>

      {probes.length === 0 && !running ? (
        <p className="text-sm text-white/40 text-center py-12">Run checks to validate launch readiness.</p>
      ) : (
        <div className="space-y-2">
          {probes.map((p) => {
            const cfg = STATUS_CFG[p.status];
            return (
              <div key={p.probe_key} className={`rounded-xl border p-4 flex items-center gap-3 ${cfg.bg} ${cfg.border}`}>
                <span className={`text-[10px] font-700 px-2 py-0.5 rounded border ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
                <div className="flex-1">
                  <p className="text-sm font-600 text-white/80">{p.probe_key}</p>
                  <p className="text-xs text-white/40">{String(p.detail?.message || '')}</p>
                </div>
                {p.latency_ms != null && <span className="text-xs text-white/50">{p.latency_ms}ms</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
