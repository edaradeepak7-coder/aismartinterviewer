'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Database, Clock, RefreshCw, Loader2 } from 'lucide-react';

interface PerfData {
  process: {
    memory: { rssMb: number | null; heapUsedMb: number | null; heapTotalMb: number | null };
    uptimeSec: number | null;
    nodeVersion: string | null;
  };
  recentLatency: {
    probe_key: string;
    samples: number;
    latestMs: number | null;
    p50Ms: number | null;
    history: { latency_ms: number; created_at: string }[];
  }[];
  empty: boolean;
  note?: string;
  checked_at: string;
}

export default function PerformanceMonitorContent() {
  const [data, setData] = useState<PerfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/performance-monitor');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const mem = data?.process?.memory;

  return (
    <div className="bg-[#070B14] text-white p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-700 flex items-center gap-2">
            <Activity size={20} className="text-teal-400" /> Performance Monitor
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Process memory + recent health probe latencies</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-600 text-white/50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>}

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-white/40" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-4">
              <div className="flex items-center gap-2 text-teal-400 mb-2"><Database size={14} /> RSS</div>
              <p className="text-2xl font-700">{mem?.rssMb != null ? `${mem.rssMb} MB` : '—'}</p>
            </div>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
              <div className="flex items-center gap-2 text-violet-400 mb-2"><Activity size={14} /> Heap Used</div>
              <p className="text-2xl font-700">{mem?.heapUsedMb != null ? `${mem.heapUsedMb} MB` : '—'}</p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <div className="flex items-center gap-2 text-cyan-400 mb-2"><Database size={14} /> Heap Total</div>
              <p className="text-2xl font-700">{mem?.heapTotalMb != null ? `${mem.heapTotalMb} MB` : '—'}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 text-amber-400 mb-2"><Clock size={14} /> Uptime</div>
              <p className="text-2xl font-700">{data?.process?.uptimeSec != null ? `${Math.floor(data.process.uptimeSec / 60)}m` : '—'}</p>
            </div>
          </div>

          {data?.note && <p className="text-xs text-white/40 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">{data.note}</p>}

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="text-sm font-600 text-white/70 mb-4">Recent Probe Latency</h2>
            {data?.empty || !data?.recentLatency?.length ? (
              <p className="text-sm text-white/40 text-center py-8">No latency samples yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recentLatency.map((r) => (
                  <div key={r.probe_key} className="flex items-center gap-4 p-3 rounded-lg border border-white/[0.06]">
                    <div className="flex-1">
                      <p className="text-sm font-600 text-white/80">{r.probe_key}</p>
                      <p className="text-xs text-white/40">{r.samples} samples</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-700 text-teal-400">{r.latestMs != null ? `${r.latestMs}ms` : '—'}</p>
                      <p className="text-[10px] text-white/30">p50: {r.p50Ms != null ? `${r.p50Ms}ms` : '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {data?.process?.nodeVersion && (
            <p className="text-xs text-white/30">Node {data.process.nodeVersion} · Checked {data.checked_at ? new Date(data.checked_at).toLocaleString() : ''}</p>
          )}
        </>
      )}
    </div>
  );
}
