'use client';
import React, { useState, useCallback } from 'react';
import { Activity, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface Probe {
  probe_key: string;
  status: 'ok' | 'warn' | 'fail' | 'skip';
  latency_ms: number | null;
  detail: Record<string, unknown>;
}

export default function ProviderHealthContent() {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health-probes?persist=1');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      // Focus on provider-relevant probes
      const all: Probe[] = json.probes || [];
      setProbes(all.filter((p) =>
        p.probe_key.includes('supabase') ||
        p.probe_key.includes('openai') ||
        p.probe_key.includes('groq') ||
        p.probe_key.includes('resend'),
      ));
      setCheckedAt(json.checked_at || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="bg-[#070B14] text-white p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-700 flex items-center gap-2">
            <Activity size={20} className="text-teal-400" /> Provider Health
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Measured probe results — no Math.random latencies</p>
        </div>
        <button onClick={run} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-sm font-600 disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check Providers
        </button>
      </div>

      {checkedAt && <p className="text-xs text-white/30">Checked: {new Date(checkedAt).toLocaleString()}</p>}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>}

      {probes.length === 0 && !loading ? (
        <p className="text-sm text-white/40 text-center py-16">Run a check to see provider status.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {probes.map((p) => (
            <div key={p.probe_key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-2">
                {p.status === 'ok' ? <CheckCircle size={16} className="text-emerald-400" /> : p.status === 'warn' ? <AlertTriangle size={16} className="text-amber-400" /> : <XCircle size={16} className="text-red-400" />}
                <span className="text-sm font-600 text-white/80">{p.probe_key}</span>
              </div>
              <p className="text-xs text-white/40">{String(p.detail?.message || '')}</p>
              {p.latency_ms != null && <p className="text-lg font-700 text-teal-400 mt-3">{p.latency_ms}ms</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
