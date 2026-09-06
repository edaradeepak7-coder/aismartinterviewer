'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Database, Zap, Clock, RefreshCw, AlertTriangle, XCircle } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type PerfTab = 'overview' | 'queries' | 'api' | 'dbpool';

const TABS: { id: PerfTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'queries', label: 'Query Execution' },
  { id: 'api', label: 'API Latency' },
  { id: 'dbpool', label: 'DB Connection Pool' },
];

// --- Mock data ---
const queryData = [
  { time: '08:00', p50: 12, p95: 48, p99: 120, cacheHit: 82 },
  { time: '08:10', p50: 14, p95: 52, p99: 134, cacheHit: 79 },
  { time: '08:20', p50: 11, p95: 44, p99: 98, cacheHit: 85 },
  { time: '08:30', p50: 18, p95: 71, p99: 189, cacheHit: 74 },
  { time: '08:40', p50: 22, p95: 88, p99: 241, cacheHit: 68 },
  { time: '08:50', p50: 15, p95: 58, p99: 142, cacheHit: 81 },
  { time: '09:00', p50: 13, p95: 49, p99: 112, cacheHit: 84 },
  { time: '09:10', p50: 16, p95: 63, p99: 158, cacheHit: 77 },
];

const apiLatencyData = [
  { endpoint: '/api/interviews', p50: 142, p95: 412, p99: 820, rps: 24 },
  { endpoint: '/api/assessments', p50: 88, p95: 234, p99: 489, rps: 18 },
  { endpoint: '/api/ai/chat-completion', p50: 1240, p95: 3200, p99: 5800, rps: 6 },
  { endpoint: '/api/candidates', p50: 64, p95: 178, p99: 312, rps: 31 },
  { endpoint: '/api/notifications', p50: 38, p95: 112, p99: 198, rps: 42 },
  { endpoint: '/api/sessions', p50: 22, p95: 68, p99: 124, rps: 89 },
  { endpoint: '/api/audit-logs', p50: 198, p95: 512, p99: 980, rps: 8 },
];

const apiTrendData = [
  { time: '08:00', interviews: 142, assessments: 88, ai: 1240, candidates: 64 },
  { time: '08:10', interviews: 156, assessments: 92, ai: 1380, candidates: 71 },
  { time: '08:20', interviews: 138, assessments: 84, ai: 1120, candidates: 58 },
  { time: '08:30', interviews: 189, assessments: 118, ai: 1680, candidates: 88 },
  { time: '08:40', interviews: 212, assessments: 134, ai: 2140, candidates: 102 },
  { time: '08:50', interviews: 168, assessments: 98, ai: 1420, candidates: 74 },
  { time: '09:00', interviews: 144, assessments: 86, ai: 1280, candidates: 62 },
  { time: '09:10', interviews: 158, assessments: 94, ai: 1340, candidates: 68 },
];

const dbPoolData = [
  { time: '08:00', active: 12, idle: 28, waiting: 0, maxPool: 50 },
  { time: '08:10', active: 18, idle: 22, waiting: 0, maxPool: 50 },
  { time: '08:20', active: 14, idle: 26, waiting: 0, maxPool: 50 },
  { time: '08:30', active: 31, idle: 14, waiting: 2, maxPool: 50 },
  { time: '08:40', active: 42, idle: 6, waiting: 8, maxPool: 50 },
  { time: '08:50', active: 28, idle: 18, waiting: 1, maxPool: 50 },
  { time: '09:00', active: 19, idle: 27, waiting: 0, maxPool: 50 },
  { time: '09:10', active: 22, idle: 24, waiting: 0, maxPool: 50 },
];

const slowQueries = [
  { query: 'SELECT * FROM interviews JOIN candidates...', duration: 1842, table: 'interviews', calls: 12 },
  { query: 'SELECT * FROM audit_logs WHERE created_at...', duration: 1124, table: 'audit_logs', calls: 8 },
  { query: 'UPDATE candidates SET score = ... WHERE...', duration: 892, table: 'candidates', calls: 34 },
  { query: 'SELECT COUNT(*) FROM assessments GROUP BY...', duration: 678, table: 'assessments', calls: 21 },
  { query: 'INSERT INTO notifications SELECT ... FROM...', duration: 512, table: 'notifications', calls: 67 },
];

const overviewMetrics = [
  { label: 'Avg Query Time', value: '14ms', sub: 'P50 across all queries', trend: -8, icon: <Clock size={16} />, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  { label: 'Cache Hit Rate', value: '81%', sub: 'Last 1 hour', trend: +3, icon: <Zap size={16} />, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { label: 'API P95 Latency', value: '234ms', sub: 'Across all endpoints', trend: +12, icon: <Activity size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { label: 'DB Pool Usage', value: '44%', sub: '22/50 connections', trend: -5, icon: <Database size={16} />, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { label: 'Slow Queries', value: '5', sub: '>500ms in last hour', trend: -2, icon: <AlertTriangle size={16} />, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { label: 'Error Rate', value: '0.12%', sub: 'API 5xx responses', trend: -0.04, icon: <XCircle size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1424] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-white/50 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="text-white font-600">{p.value}{p.dataKey === 'cacheHit' ? '%' : 'ms'}</span>
        </div>
      ))}
    </div>
  );
};

export default function PerformanceMonitorContent() {
  const [activeTab, setActiveTab] = useState<PerfTab>('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString());
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="min-h-screen bg-[#070B14] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-700 text-white flex items-center gap-2">
            <Activity size={20} className="text-teal-400" />
            Performance Monitor
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Query execution times, cache hit rates, API latency, and DB connection pool health
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">Updated: {lastUpdated}</span>
          <button
            onClick={() => setAutoRefresh(p => !p)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-600 transition-colors ${
              autoRefresh
                ? 'bg-teal-500/20 border-teal-500/30 text-teal-300' :'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
            }`}
          >
            <RefreshCw size={12} className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? 'Live' : 'Auto-refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06] w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-600 transition-all ${
              activeTab === t.id
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :'text-white/40 hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {overviewMetrics.map(m => (
              <div key={m.label} className={`rounded-xl border ${m.bg} ${m.border} p-4`}>
                <div className={`${m.color} mb-2`}>{m.icon}</div>
                <div className="text-xl font-700 text-white">{m.value}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{m.label}</div>
                <div className={`text-[10px] mt-1 font-600 ${m.trend < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {m.trend > 0 ? '+' : ''}{m.trend}{m.label.includes('Rate') || m.label.includes('Hit') ? '%' : 'ms'} vs prev
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-600 text-white/70 mb-4">Query Execution Time (ms)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={queryData}>
                  <defs>
                    <linearGradient id="p50g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="p95g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="p50" name="P50" stroke="#14b8a6" fill="url(#p50g)" strokeWidth={2} />
                  <Area type="monotone" dataKey="p95" name="P95" stroke="#f59e0b" fill="url(#p95g)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-600 text-white/70 mb-4">Cache Hit Rate (%)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={queryData}>
                  <defs>
                    <linearGradient id="cacheg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[60, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="cacheHit" name="Cache Hit" stroke="#8b5cf6" fill="url(#cacheg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Query Execution */}
      {activeTab === 'queries' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-sm font-600 text-white/70 mb-4">Query Latency Percentiles (ms)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={queryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
                <Line type="monotone" dataKey="p50" name="P50" stroke="#14b8a6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p95" name="P95" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p99" name="P99" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06]">
              <h3 className="text-sm font-600 text-white/70">Slow Queries (&gt;500ms)</h3>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {slowQueries.map((q, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                  <span className={`text-xs font-700 px-2 py-0.5 rounded-full ${
                    q.duration > 1500 ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                    q.duration > 800 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20': 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                  }`}>{q.duration}ms</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-white/60 truncate">{q.query}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">Table: {q.table} · {q.calls} calls/hr</p>
                  </div>
                  <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* API Latency */}
      {activeTab === 'api' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-sm font-600 text-white/70 mb-4">API Latency Trend by Endpoint (ms)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={apiTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
                <Line type="monotone" dataKey="interviews" name="Interviews" stroke="#14b8a6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="assessments" name="Assessments" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="candidates" name="Candidates" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06]">
              <h3 className="text-sm font-600 text-white/70">Latency per Endpoint</h3>
            </div>
            <div className="divide-y divide-white/[0.04]">
              <div className="px-5 py-2.5 grid grid-cols-5 text-[10px] font-700 text-white/25 uppercase tracking-wide">
                <span className="col-span-2">Endpoint</span>
                <span>P50</span>
                <span>P95</span>
                <span>RPS</span>
              </div>
              {apiLatencyData.map((row, i) => (
                <div key={i} className="px-5 py-3 grid grid-cols-5 items-center hover:bg-white/[0.02] transition-colors">
                  <span className="col-span-2 text-xs font-mono text-white/60 truncate">{row.endpoint}</span>
                  <span className={`text-xs font-600 ${row.p50 > 500 ? 'text-amber-400' : 'text-emerald-400'}`}>{row.p50}ms</span>
                  <span className={`text-xs font-600 ${row.p95 > 1000 ? 'text-red-400' : row.p95 > 500 ? 'text-amber-400' : 'text-white/60'}`}>{row.p95}ms</span>
                  <span className="text-xs text-white/40">{row.rps}/s</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DB Pool */}
      {activeTab === 'dbpool' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Active', value: 22, max: 50, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
              { label: 'Idle', value: 24, max: 50, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
              { label: 'Waiting', value: 0, max: 50, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
              { label: 'Max Pool', value: 50, max: 50, color: 'text-white/50', bg: 'bg-white/5', border: 'border-white/10' },
            ].map(m => (
              <div key={m.label} className={`rounded-xl border ${m.bg} ${m.border} p-4`}>
                <div className={`text-2xl font-700 ${m.color}`}>{m.value}</div>
                <div className="text-xs text-white/40 mt-0.5">{m.label} Connections</div>
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m.color.replace('text-', 'bg-')}`} style={{ width: `${(m.value / m.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-sm font-600 text-white/70 mb-4">Connection Pool Over Time</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dbPoolData}>
                <defs>
                  <linearGradient id="activeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="idleg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 55]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
                <Area type="monotone" dataKey="active" name="Active" stroke="#14b8a6" fill="url(#activeg)" strokeWidth={2} />
                <Area type="monotone" dataKey="idle" name="Idle" stroke="#06b6d4" fill="url(#idleg)" strokeWidth={2} />
                <Line type="monotone" dataKey="waiting" name="Waiting" stroke="#ef4444" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs text-amber-300 font-600 flex items-center gap-2">
              <AlertTriangle size={12} />
              Bottleneck detected at 08:40 — pool reached 84% utilization with 8 waiting connections. Consider increasing max pool size or optimizing long-running queries.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
