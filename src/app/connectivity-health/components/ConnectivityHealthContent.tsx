'use client';
import React, { useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Loader2 } from 'lucide-react';

type CheckStatus = 'ok' | 'warn' | 'fail' | 'skip';

interface Probe {
  probe_key: string;
  status: CheckStatus;
  latency_ms: number | null;
  detail: Record<string, unknown>;
}

function StatusBadge({ status }: { status: CheckStatus }) {
  const map: Record<CheckStatus, string> = {
    ok: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    warn: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    fail: 'bg-red-400/10 text-red-400 border-red-400/20',
    skip: 'bg-white/5 text-white/40 border-white/10',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-700 border uppercase ${map[status]}`}>
      {status}
    </span>
  );
}

export default function ConnectivityHealthContent() {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [summary, setSummary] = useState({ ok: 0, warn: 0, fail: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const run = useCallback(async (persist = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/health-probes${persist ? '?persist=1' : ''}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Probe failed');
      setProbes(json.probes || []);
      setSummary(json.summary || { ok: 0, warn: 0, fail: 0 });
      setCheckedAt(json.checked_at || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Probe failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="bg-[#070B14] text-white p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-700 flex items-center gap-2">
            <Database size={20} className="text-teal-400" /> Connectivity Health
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Live probes — no simulated latencies</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => run(false)} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-sm font-600 disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Run Probes
          </button>
          <button onClick={() => run(true)} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm font-600 disabled:opacity-50">
            Run & Persist
          </button>
        </div>
      </div>

      {checkedAt && <p className="text-xs text-white/30">Last check: {new Date(checkedAt).toLocaleString()}</p>}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
          <p className="text-2xl font-700 text-emerald-400">{summary.ok}</p>
          <p className="text-xs text-white/40">OK</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
          <p className="text-2xl font-700 text-amber-400">{summary.warn}</p>
          <p className="text-xs text-white/40">Warn</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
          <p className="text-2xl font-700 text-red-400">{summary.fail}</p>
          <p className="text-xs text-white/40">Fail</p>
        </div>
      </div>

      {probes.length === 0 && !loading ? (
        <p className="text-sm text-white/40 text-center py-12">Click Run Probes to check connectivity.</p>
      ) : (
        <div className="space-y-2">
          {probes.map((p) => (
            <div key={p.probe_key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center gap-4">
              {p.status === 'ok' ? <CheckCircle size={16} className="text-emerald-400" /> : p.status === 'warn' ? <AlertTriangle size={16} className="text-amber-400" /> : <XCircle size={16} className="text-red-400" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-600 text-white/80">{p.probe_key}</p>
                <p className="text-xs text-white/40 truncate">{String(p.detail?.message || '')}</p>
              </div>
              {p.latency_ms != null && <span className="text-xs tabular-nums text-white/50">{p.latency_ms}ms</span>}
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
