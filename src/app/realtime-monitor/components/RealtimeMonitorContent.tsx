'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity, Database, Cpu, Users, Wifi, WifiOff, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, Zap, Server, Radio,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import type { RealtimeMetrics } from '@/app/api/admin/realtime-metrics/route';
import MetricGauge from './MetricGauge';
import LiveSparkline from './LiveSparkline';

const POLL_INTERVAL = 8000; // 8 s
const HISTORY_MAX = 30;

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
    />
  );
}

function Trend({ current, prev }: { current: number; prev: number }) {
  if (prev === 0) return <Minus size={12} className="text-white/30" />;
  const delta = current - prev;
  if (Math.abs(delta) < 1) return <Minus size={12} className="text-white/30" />;
  return delta > 0
    ? <TrendingUp size={12} className="text-red-400" />
    : <TrendingDown size={12} className="text-emerald-400" />;
}

function formatMs(ms: number): string {
  if (ms === 0) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatBytes(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

function latencyColor(ms: number): string {
  if (ms === 0) return '#6b7280';
  if (ms < 300) return '#34d399';
  if (ms < 800) return '#fbbf24';
  return '#f87171';
}

export default function RealtimeMonitorContent() {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // History buffers for sparklines
  const [jobHistory, setJobHistory] = useState<number[]>([]);
  const [redisHitHistory, setRedisHitHistory] = useState<number[]>([]);
  const [sessionHistory, setSessionHistory] = useState<number[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<Record<string, number[]>>({});

  const prevMetrics = useRef<RealtimeMetrics | null>(null);

  const fetchMetrics = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/realtime-metrics', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RealtimeMetrics = await res.json();
      prevMetrics.current = metrics;
      setMetrics(data);
      setLastUpdated(new Date());

      // Update history buffers
      setJobHistory(h => [...h.slice(-HISTORY_MAX + 1), data.jobQueue.pending + data.jobQueue.running]);
      setRedisHitHistory(h => [...h.slice(-HISTORY_MAX + 1), data.redis.hitRate]);
      setSessionHistory(h => [...h.slice(-HISTORY_MAX + 1), data.sessions.activeInterviews]);

      setLatencyHistory(prev => {
        const next = { ...prev };
        data.aiLatency.forEach(({ provider, p50Ms }) => {
          next[provider] = [...(prev[provider] ?? []).slice(-HISTORY_MAX + 1), p50Ms];
        });
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [metrics]);

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchMetrics(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [autoRefresh, fetchMetrics]);

  const totalQueueDepth = metrics
    ? metrics.jobQueue.pending + metrics.jobQueue.running
    : 0;

  const prevTotalQueue = prevMetrics.current
    ? prevMetrics.current.jobQueue.pending + prevMetrics.current.jobQueue.running
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-700 text-foreground flex items-center gap-2">
            <Activity size={20} className="text-primary" />
            Real-Time Infrastructure Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live metrics — job queue depth, Redis cache, AI latency, concurrent sessions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              autoRefresh
                ? 'bg-primary/15 border-primary/30 text-primary' :'bg-muted border-border text-muted-foreground'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={() => fetchMetrics()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {/* ── Top KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Job Queue Depth */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Zap size={15} className="text-violet-400" />
              </div>
              <span className="text-sm font-600 text-foreground">Job Queue</span>
            </div>
            <Trend current={totalQueueDepth} prev={prevTotalQueue} />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-800 text-foreground tabular-nums">
              {loading ? '—' : totalQueueDepth}
            </span>
            <span className="text-xs text-muted-foreground mb-1">jobs</span>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-amber-400">{metrics?.jobQueue.pending ?? 0} pending</span>
            <span className="text-blue-400">{metrics?.jobQueue.running ?? 0} running</span>
            <span className="text-red-400">{metrics?.jobQueue.failed ?? 0} failed</span>
          </div>
          <LiveSparkline data={jobHistory} color="#a78bfa" />
        </div>

        {/* Redis Cache Hit Rate */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
                <Database size={15} className="text-teal-400" />
              </div>
              <span className="text-sm font-600 text-foreground">Redis Cache</span>
            </div>
            <StatusDot ok={metrics?.redis.available ?? false} />
          </div>
          {metrics?.redis.available ? (
            <>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-800 text-foreground tabular-nums">
                  {metrics.redis.hitRate}
                </span>
                <span className="text-xs text-muted-foreground mb-1">% hit rate</span>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-muted-foreground">{metrics.redis.keyCount.toLocaleString()} keys</span>
                <span className="text-muted-foreground">{formatBytes(metrics.redis.usedMemoryMb)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <WifiOff size={14} />
              Not configured
            </div>
          )}
          <LiveSparkline data={redisHitHistory} color="#2dd4bf" />
        </div>

        {/* Concurrent Sessions */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Users size={15} className="text-blue-400" />
              </div>
              <span className="text-sm font-600 text-foreground">Sessions</span>
            </div>
            <Trend
              current={metrics?.sessions.activeInterviews ?? 0}
              prev={prevMetrics.current?.sessions.activeInterviews ?? 0}
            />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-800 text-foreground tabular-nums">
              {loading ? '—' : (metrics?.sessions.activeInterviews ?? 0)}
            </span>
            <span className="text-xs text-muted-foreground mb-1">interviews</span>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-muted-foreground">{metrics?.sessions.activeSessions ?? 0} user sessions</span>
          </div>
          <LiveSparkline data={sessionHistory} color="#60a5fa" />
        </div>

        {/* Signaling Server */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Radio size={15} className="text-emerald-400" />
              </div>
              <span className="text-sm font-600 text-foreground">Signaling</span>
            </div>
            <StatusDot ok={(metrics?.sessions.signalingPeers ?? 0) >= 0} />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-800 text-foreground tabular-nums">
              {loading ? '—' : (metrics?.sessions.signalingPeers ?? 0)}
            </span>
            <span className="text-xs text-muted-foreground mb-1">peers</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Dedicated Node.js server
          </div>
          <div className="text-[11px] text-muted-foreground/60 font-mono truncate">
            {process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL
              ? 'Configured ✓' :'Set NEXT_PUBLIC_SIGNALING_SERVER_URL'}
          </div>
        </div>
      </div>

      {/* ── AI Provider Latency ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-primary" />
          <h2 className="text-sm font-700 text-foreground">AI Provider Latency</h2>
          <span className="text-xs text-muted-foreground ml-auto">p50 / p95 response time</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(metrics?.aiLatency ?? [
            { provider: 'OpenAI', p50Ms: 0, p95Ms: 0, errorRate: 0, requestsLastMinute: 0 },
            { provider: 'Groq', p50Ms: 0, p95Ms: 0, errorRate: 0, requestsLastMinute: 0 },
            { provider: 'ElevenLabs', p50Ms: 0, p95Ms: 0, errorRate: 0, requestsLastMinute: 0 },
          ]).map(({ provider, p50Ms, p95Ms, errorRate }) => (
            <div
              key={provider}
              className="bg-muted/40 border border-border rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-600 text-foreground">{provider}</span>
                {errorRate > 0 ? (
                  <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                    {errorRate}% errors
                  </span>
                ) : (
                  <CheckCircle2 size={13} className="text-emerald-400" />
                )}
              </div>

              <div className="flex items-center gap-4">
                <MetricGauge
                  value={p50Ms}
                  max={2000}
                  label="p50"
                  unit="ms"
                  color={latencyColor(p50Ms)}
                  size={72}
                  strokeWidth={6}
                />
                <MetricGauge
                  value={p95Ms}
                  max={2000}
                  label="p95"
                  unit="ms"
                  color={latencyColor(p95Ms)}
                  size={72}
                  strokeWidth={6}
                />
                <div className="flex-1 min-w-0">
                  <LiveSparkline
                    data={latencyHistory[provider] ?? []}
                    color={latencyColor(p50Ms)}
                    width={80}
                    height={36}
                  />
                </div>
              </div>

              <div className="flex gap-3 text-xs">
                <span className="text-muted-foreground">p50: <span className="text-foreground font-500">{formatMs(p50Ms)}</span></span>
                <span className="text-muted-foreground">p95: <span className="text-foreground font-500">{formatMs(p95Ms)}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Job Queue Detail + Redis Detail ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Job Queue Detail */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-violet-400" />
            <h2 className="text-sm font-700 text-foreground">Job Queue Detail</h2>
          </div>

          <div className="space-y-2.5">
            {[
              { label: 'Pending', value: metrics?.jobQueue.pending ?? 0, color: 'bg-amber-400', max: 200 },
              { label: 'Running', value: metrics?.jobQueue.running ?? 0, color: 'bg-blue-400', max: 50 },
              { label: 'Failed', value: metrics?.jobQueue.failed ?? 0, color: 'bg-red-400', max: 50 },
              { label: 'Completed (1h)', value: metrics?.jobQueue.completed_last_hour ?? 0, color: 'bg-emerald-400', max: 500 },
            ].map(({ label, value, color, max }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-600 text-foreground tabular-nums">{value.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            <Clock size={12} />
            Avg wait time: <span className="text-foreground font-500 ml-1">
              {metrics ? formatMs(metrics.jobQueue.avg_wait_ms) : '—'}
            </span>
          </div>
        </div>

        {/* Redis Detail */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-teal-400" />
            <h2 className="text-sm font-700 text-foreground">Redis Cache Detail</h2>
            <StatusDot ok={metrics?.redis.available ?? false} />
          </div>

          {metrics?.redis.available ? (
            <>
              <div className="flex items-center justify-around py-2">
                <MetricGauge
                  value={metrics.redis.hitRate}
                  max={100}
                  label="Hit Rate"
                  unit="%"
                  color="#2dd4bf"
                  size={88}
                />
                <MetricGauge
                  value={metrics.redis.missRate}
                  max={100}
                  label="Miss Rate"
                  unit="%"
                  color="#f87171"
                  size={88}
                />
                <MetricGauge
                  value={metrics.redis.connectedClients}
                  max={100}
                  label="Clients"
                  unit=""
                  color="#a78bfa"
                  size={88}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Total Keys', value: metrics.redis.keyCount.toLocaleString() },
                  { label: 'Memory Used', value: formatBytes(metrics.redis.usedMemoryMb) },
                  { label: 'Commands Processed', value: metrics.redis.totalCommands.toLocaleString() },
                  { label: 'Connected Clients', value: metrics.redis.connectedClients },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/40 rounded-lg px-3 py-2">
                    <div className="text-muted-foreground">{label}</div>
                    <div className="font-600 text-foreground mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <WifiOff size={32} className="text-muted-foreground/40" />
              <div>
                <p className="text-sm font-500 text-muted-foreground">Redis not configured</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Set <code className="bg-muted px-1 rounded">REDIS_URL</code> to enable caching metrics
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Signaling Server Info ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Server size={16} className="text-emerald-400" />
          <h2 className="text-sm font-700 text-foreground">WebRTC Signaling Server</h2>
          <span className="text-xs text-muted-foreground ml-auto">Dedicated Node.js — 20K scale</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Radio size={12} /> Architecture
            </div>
            <p className="text-sm font-600 text-foreground">Dedicated Node.js Process</p>
            <p className="text-xs text-muted-foreground">Not serverless — persistent WebSocket connections</p>
          </div>
          <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users size={12} /> Capacity
            </div>
            <p className="text-sm font-600 text-foreground">20,000 concurrent peers</p>
            <p className="text-xs text-muted-foreground">4–10 instances with Redis pub/sub adapter</p>
          </div>
          <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wifi size={12} /> Connected Peers
            </div>
            <p className="text-3xl font-800 text-foreground tabular-nums">
              {metrics?.sessions.signalingPeers ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Active WebRTC peer connections</p>
          </div>
        </div>

        <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1">
          <p className="font-600 text-foreground text-[11px] uppercase tracking-wider mb-2">Deployment Guide</p>
          <p>1. Deploy <code className="bg-muted px-1 rounded">signaling-server/</code> as a standalone Node.js service (Railway, Fly.io, or EC2).</p>
          <p>2. Set <code className="bg-muted px-1 rounded">NEXT_PUBLIC_SIGNALING_SERVER_URL</code> to the WebSocket URL (e.g. <code className="bg-muted px-1 rounded">wss://signal.yourdomain.com</code>).</p>
          <p>3. Set <code className="bg-muted px-1 rounded">SIGNALING_SERVER_API_KEY</code> for server-to-server auth.</p>
          <p>4. For 20K scale: add Redis adapter and run 4–10 instances behind a sticky-session load balancer.</p>
        </div>
      </div>
    </div>
  );
}
