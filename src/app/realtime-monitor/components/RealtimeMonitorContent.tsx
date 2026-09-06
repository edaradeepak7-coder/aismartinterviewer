'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity, Database, Cpu, Users, Wifi, WifiOff, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, Zap, Server, Radio,
  TrendingUp, TrendingDown, Minus, Bell, Settings, X, Mail, MessageSquare, Save,
} from 'lucide-react';
import type { RealtimeMetrics } from '@/app/api/admin/realtime-metrics/route';
import MetricGauge from './MetricGauge';
import LiveSparkline from './LiveSparkline';

const POLL_INTERVAL = 8000; // 8 s
const HISTORY_MAX = 30;

// ── Threshold types ──────────────────────────────────────────────────────────
interface MonitorThresholds {
  jobQueueDepth: { warn: number; critical: number; enabled: boolean };
  redisHitRateDrop: { warn: number; critical: number; enabled: boolean };
  aiLatencySpike: { warn: number; critical: number; enabled: boolean };
  sessionOverload: { warn: number; critical: number; enabled: boolean };
}

interface NotificationConfig {
  slackEnabled: boolean;
  slackWebhookUrl: string;
  emailEnabled: boolean;
  emailRecipients: string;
}

interface ActiveAlert {
  metric: string;
  metricLabel: string;
  currentValue: number;
  threshold: number;
  severity: 'warn' | 'critical';
  unit: string;
  ts: number;
}

const DEFAULT_THRESHOLDS: MonitorThresholds = {
  jobQueueDepth:    { warn: 50,  critical: 200, enabled: true },
  redisHitRateDrop: { warn: 70,  critical: 50,  enabled: true },
  aiLatencySpike:   { warn: 800, critical: 2000, enabled: true },
  sessionOverload:  { warn: 200, critical: 500, enabled: true },
};

const DEFAULT_NOTIF: NotificationConfig = {
  slackEnabled: false,
  slackWebhookUrl: '',
  emailEnabled: false,
  emailRecipients: '',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Threshold Settings Panel ─────────────────────────────────────────────────
interface ThresholdPanelProps {
  thresholds: MonitorThresholds;
  notif: NotificationConfig;
  onSave: (t: MonitorThresholds, n: NotificationConfig) => void;
  onClose: () => void;
}

function ThresholdPanel({ thresholds, notif, onSave, onClose }: ThresholdPanelProps) {
  const [t, setT] = useState<MonitorThresholds>(JSON.parse(JSON.stringify(thresholds)));
  const [n, setN] = useState<NotificationConfig>({ ...notif });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(t, n);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const metricRows: { key: keyof MonitorThresholds; label: string; unit: string; warnLabel: string; critLabel: string; hint: string }[] = [
    { key: 'jobQueueDepth',    label: 'Job Queue Depth',      unit: 'jobs',  warnLabel: 'Warn above',     critLabel: 'Critical above', hint: 'Total pending + running jobs' },
    { key: 'redisHitRateDrop', label: 'Redis Hit Rate Drop',  unit: '%',     warnLabel: 'Warn below',     critLabel: 'Critical below', hint: 'Cache hit rate — lower is worse' },
    { key: 'aiLatencySpike',   label: 'AI Latency Spike',     unit: 'ms',    warnLabel: 'Warn above',     critLabel: 'Critical above', hint: 'Highest p50 across AI providers' },
    { key: 'sessionOverload',  label: 'Session Overload',     unit: 'sessions', warnLabel: 'Warn above',  critLabel: 'Critical above', hint: 'Concurrent active interview sessions' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-primary" />
            <h3 className="text-sm font-700 text-foreground">Alert Threshold Configuration</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Metric Thresholds */}
          <div>
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">Metric Thresholds</p>
            <div className="space-y-3">
              {metricRows.map(({ key, label, unit, warnLabel, critLabel, hint }) => (
                <div key={key} className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-600 text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{hint}</p>
                    </div>
                    <button
                      onClick={() => setT(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }))}
                      className={`text-xs px-3 py-1 rounded-lg border transition-colors ${t[key].enabled ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground'}`}
                    >
                      {t[key].enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-yellow-400/80 uppercase tracking-wider block mb-1">{warnLabel} ({unit})</label>
                      <input
                        type="number"
                        value={t[key].warn}
                        onChange={e => setT(prev => ({ ...prev, [key]: { ...prev[key], warn: Number(e.target.value) } }))}
                        className="w-full bg-yellow-400/5 border border-yellow-400/20 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-yellow-400/50"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-red-400/80 uppercase tracking-wider block mb-1">{critLabel} ({unit})</label>
                      <input
                        type="number"
                        value={t[key].critical}
                        onChange={e => setT(prev => ({ ...prev, [key]: { ...prev[key], critical: Number(e.target.value) } }))}
                        className="w-full bg-red-400/5 border border-red-400/20 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-red-400/50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notification Channels */}
          <div>
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">Notification Channels</p>
            <div className="space-y-3">
              {/* Slack */}
              <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-[#4A154B]" />
                    <span className="text-sm font-600 text-foreground">Slack Webhook</span>
                  </div>
                  <button
                    onClick={() => setN(prev => ({ ...prev, slackEnabled: !prev.slackEnabled }))}
                    className={`text-xs px-3 py-1 rounded-lg border transition-colors ${n.slackEnabled ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground'}`}
                  >
                    {n.slackEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                {n.slackEnabled && (
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Webhook URL</label>
                    <input
                      type="url"
                      value={n.slackWebhookUrl}
                      onChange={e => setN(prev => ({ ...prev, slackWebhookUrl: e.target.value }))}
                      placeholder="https://hooks.slack.com/services/T.../B.../..."
                      className="w-full bg-muted/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Create an Incoming Webhook in your Slack workspace settings</p>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-blue-400" />
                    <span className="text-sm font-600 text-foreground">Email Notifications</span>
                  </div>
                  <button
                    onClick={() => setN(prev => ({ ...prev, emailEnabled: !prev.emailEnabled }))}
                    className={`text-xs px-3 py-1 rounded-lg border transition-colors ${n.emailEnabled ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground'}`}
                  >
                    {n.emailEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                {n.emailEnabled && (
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Recipients (comma-separated)</label>
                    <input
                      type="text"
                      value={n.emailRecipients}
                      onChange={e => setN(prev => ({ ...prev, emailRecipients: e.target.value }))}
                      placeholder="admin@example.com, ops@example.com"
                      className="w-full bg-muted/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Sent via Brevo (or Resend as fallback) — configure BREVO_API_KEY in .env</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-border">
          <button
            onClick={handleSave}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-500 border transition-colors ${saved ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25'}`}
          >
            {saved ? <><CheckCircle2 size={14} /> Saved!</> : <><Save size={14} /> Save Thresholds</>}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground border border-border text-sm hover:text-foreground transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Alert Banner ─────────────────────────────────────────────────────────────
function AlertBanner({ alerts, onDismiss }: { alerts: ActiveAlert[]; onDismiss: (metric: string) => void }) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <div
          key={alert.metric}
          className={`flex items-start gap-3 rounded-xl px-4 py-3 border text-sm ${
            alert.severity === 'critical' ?'bg-red-400/10 border-red-400/25 text-red-300' :'bg-amber-400/10 border-amber-400/25 text-amber-300'
          }`}
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-600">{alert.severity === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING'}: {alert.metricLabel}</span>
            <span className="text-xs ml-2 opacity-80">
              Current: <strong>{alert.currentValue}{alert.unit}</strong> — threshold: {alert.threshold}{alert.unit}
            </span>
          </div>
          <button onClick={() => onDismiss(alert.metric)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
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

  // Threshold state
  const [showThresholdPanel, setShowThresholdPanel] = useState(false);
  const [thresholds, setThresholds] = useState<MonitorThresholds>(DEFAULT_THRESHOLDS);
  const [notifConfig, setNotifConfig] = useState<NotificationConfig>(DEFAULT_NOTIF);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const notifCooldown = useRef<Record<string, number>>({});

  const prevMetrics = useRef<RealtimeMetrics | null>(null);

  // ── Threshold breach detection ──────────────────────────────────────────
  const checkThresholds = useCallback(async (data: RealtimeMetrics) => {
    const totalQueue = data.jobQueue.pending + data.jobQueue.running;
    const maxAiLatency = data.aiLatency.length > 0
      ? Math.max(...data.aiLatency.map(a => a.p50Ms).filter(v => v > 0))
      : 0;

    const checks: { key: keyof MonitorThresholds; metric: string; label: string; value: number; unit: string; lowerIsBad?: boolean }[] = [
      { key: 'jobQueueDepth',    metric: 'job_queue_depth',    label: 'Job Queue Depth',     value: totalQueue,                          unit: ' jobs' },
      { key: 'redisHitRateDrop', metric: 'redis_hit_rate',     label: 'Redis Hit Rate',       value: data.redis.hitRate,                  unit: '%',  lowerIsBad: true },
      { key: 'aiLatencySpike',   metric: 'ai_latency_spike',   label: 'AI Latency Spike',     value: maxAiLatency,                        unit: 'ms' },
      { key: 'sessionOverload',  metric: 'session_overload',   label: 'Session Overload',     value: data.sessions.activeInterviews,      unit: ' sessions' },
    ];

    const newAlerts: ActiveAlert[] = [];

    for (const check of checks) {
      const cfg = thresholds[check.key];
      if (!cfg.enabled) continue;

      let severity: 'warn' | 'critical' | null = null;
      let breachedThreshold = 0;

      if (check.lowerIsBad) {
        if (check.value > 0 && check.value <= cfg.critical) { severity = 'critical'; breachedThreshold = cfg.critical; }
        else if (check.value > 0 && check.value <= cfg.warn) { severity = 'warn'; breachedThreshold = cfg.warn; }
      } else {
        if (check.value >= cfg.critical) { severity = 'critical'; breachedThreshold = cfg.critical; }
        else if (check.value >= cfg.warn) { severity = 'warn'; breachedThreshold = cfg.warn; }
      }

      if (severity && !dismissedAlerts.has(check.metric)) {
        newAlerts.push({ metric: check.metric, metricLabel: check.label, currentValue: check.value, threshold: breachedThreshold, severity, unit: check.unit, ts: Date.now() });

        // Send notification (with 5-min cooldown per metric)
        const lastSent = notifCooldown.current[check.metric] ?? 0;
        if (Date.now() - lastSent > 5 * 60 * 1000 && (notifConfig.slackEnabled || notifConfig.emailEnabled)) {
          notifCooldown.current[check.metric] = Date.now();
          const emailRecipients = notifConfig.emailRecipients
            .split(',')
            .map(e => e.trim())
            .filter(Boolean);

          fetch('/api/admin/alert-notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metric: check.metric,
              metricLabel: check.label,
              currentValue: check.value,
              threshold: breachedThreshold,
              severity,
              unit: check.unit,
              slackEnabled: notifConfig.slackEnabled,
              slackWebhookUrl: notifConfig.slackWebhookUrl,
              emailEnabled: notifConfig.emailEnabled,
              emailRecipients,
            }),
          }).catch(() => { /* silent */ });
        }
      }
    }

    setActiveAlerts(newAlerts);
  }, [thresholds, notifConfig, dismissedAlerts]);

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

      // Check thresholds after update
      checkThresholds(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [metrics, checkThresholds]);

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

  const dismissAlert = (metric: string) => {
    setDismissedAlerts(prev => new Set([...prev, metric]));
    setActiveAlerts(prev => prev.filter(a => a.metric !== metric));
  };

  const handleSaveThresholds = (t: MonitorThresholds, n: NotificationConfig) => {
    setThresholds(t);
    setNotifConfig(n);
    setDismissedAlerts(new Set()); // reset dismissals when thresholds change
    setShowThresholdPanel(false);
    if (metrics) checkThresholds(metrics);
  };

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
          {/* Alert Thresholds Button */}
          <button
            onClick={() => setShowThresholdPanel(true)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors relative ${
              activeAlerts.length > 0
                ? 'bg-red-400/15 border-red-400/30 text-red-300' :'bg-muted border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell size={12} />
            Thresholds
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-700 rounded-full flex items-center justify-center">
                {activeAlerts.length}
              </span>
            )}
          </button>
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

      {/* ── Active Alert Banners ── */}
      <AlertBanner alerts={activeAlerts} onDismiss={dismissAlert} />

      {error && (
        <div className="flex items-center gap-2 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {/* ── Top KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Job Queue Depth */}
        <div className={`bg-card border rounded-xl p-5 space-y-3 transition-colors ${activeAlerts.find(a => a.metric === 'job_queue_depth')?.severity === 'critical' ? 'border-red-400/40' : activeAlerts.find(a => a.metric === 'job_queue_depth')?.severity === 'warn' ? 'border-amber-400/40' : 'border-border'}`}>
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
            <span className={`text-3xl font-800 tabular-nums ${activeAlerts.find(a => a.metric === 'job_queue_depth')?.severity === 'critical' ? 'text-red-400' : activeAlerts.find(a => a.metric === 'job_queue_depth')?.severity === 'warn' ? 'text-amber-400' : 'text-foreground'}`}>
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
          <div className="text-[10px] text-muted-foreground/60">
            Warn ≥{thresholds.jobQueueDepth.warn} · Critical ≥{thresholds.jobQueueDepth.critical}
          </div>
        </div>

        {/* Redis Cache Hit Rate */}
        <div className={`bg-card border rounded-xl p-5 space-y-3 transition-colors ${activeAlerts.find(a => a.metric === 'redis_hit_rate')?.severity === 'critical' ? 'border-red-400/40' : activeAlerts.find(a => a.metric === 'redis_hit_rate')?.severity === 'warn' ? 'border-amber-400/40' : 'border-border'}`}>
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
                <span className={`text-3xl font-800 tabular-nums ${activeAlerts.find(a => a.metric === 'redis_hit_rate')?.severity === 'critical' ? 'text-red-400' : activeAlerts.find(a => a.metric === 'redis_hit_rate')?.severity === 'warn' ? 'text-amber-400' : 'text-foreground'}`}>
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
          <div className="text-[10px] text-muted-foreground/60">
            Warn ≤{thresholds.redisHitRateDrop.warn}% · Critical ≤{thresholds.redisHitRateDrop.critical}%
          </div>
        </div>

        {/* Concurrent Sessions */}
        <div className={`bg-card border rounded-xl p-5 space-y-3 transition-colors ${activeAlerts.find(a => a.metric === 'session_overload')?.severity === 'critical' ? 'border-red-400/40' : activeAlerts.find(a => a.metric === 'session_overload')?.severity === 'warn' ? 'border-amber-400/40' : 'border-border'}`}>
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
            <span className={`text-3xl font-800 tabular-nums ${activeAlerts.find(a => a.metric === 'session_overload')?.severity === 'critical' ? 'text-red-400' : activeAlerts.find(a => a.metric === 'session_overload')?.severity === 'warn' ? 'text-amber-400' : 'text-foreground'}`}>
              {loading ? '—' : (metrics?.sessions.activeInterviews ?? 0)}
            </span>
            <span className="text-xs text-muted-foreground mb-1">interviews</span>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-muted-foreground">{metrics?.sessions.activeSessions ?? 0} user sessions</span>
          </div>
          <LiveSparkline data={sessionHistory} color="#60a5fa" />
          <div className="text-[10px] text-muted-foreground/60">
            Warn ≥{thresholds.sessionOverload.warn} · Critical ≥{thresholds.sessionOverload.critical}
          </div>
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
          {activeAlerts.find(a => a.metric === 'ai_latency_spike') && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-600 ${activeAlerts.find(a => a.metric === 'ai_latency_spike')?.severity === 'critical' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-amber-400 bg-amber-400/10 border-amber-400/20'}`}>
              {activeAlerts.find(a => a.metric === 'ai_latency_spike')?.severity?.toUpperCase()} ALERT
            </span>
          )}
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
        <div className="text-[10px] text-muted-foreground/60">
          Threshold: Warn ≥{thresholds.aiLatencySpike.warn}ms · Critical ≥{thresholds.aiLatencySpike.critical}ms (highest p50 across providers)
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

      {/* ── Threshold Settings Panel ── */}
      {showThresholdPanel && (
        <ThresholdPanel
          thresholds={thresholds}
          notif={notifConfig}
          onSave={handleSaveThresholds}
          onClose={() => setShowThresholdPanel(false)}
        />
      )}
    </div>
  );
}
