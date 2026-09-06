'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Mail, Brain, Bell, ChevronDown, ChevronUp } from 'lucide-react';

type CheckStatus = 'pass' | 'fail' | 'warning' | 'checking';

interface HealthCheck {
  id: string;
  provider: string;
  service: string;
  icon: React.ReactNode;
  status: CheckStatus;
  latencyMs: number | null;
  threshold: number;
  warningThreshold: number;
  lastChecked: string;
  message: string;
  history: { time: string; latencyMs: number; status: CheckStatus }[];
}

interface AlertThreshold {
  provider: string;
  warnMs: number;
  failMs: number;
  enabled: boolean;
}

const initialChecks: HealthCheck[] = [
  {
    id: 'supabase-auth',
    provider: 'Supabase',
    service: 'Auth',
    icon: <Database size={18} />,
    status: 'pass',
    latencyMs: 84,
    threshold: 500,
    warningThreshold: 250,
    lastChecked: '10s ago',
    message: 'Auth endpoint responding normally',
    history: [
      { time: '14:00', latencyMs: 91, status: 'pass' },
      { time: '14:05', latencyMs: 88, status: 'pass' },
      { time: '14:10', latencyMs: 102, status: 'pass' },
      { time: '14:15', latencyMs: 79, status: 'pass' },
      { time: '14:20', latencyMs: 84, status: 'pass' },
    ],
  },
  {
    id: 'supabase-db',
    provider: 'Supabase',
    service: 'Database',
    icon: <Database size={18} />,
    status: 'pass',
    latencyMs: 42,
    threshold: 500,
    warningThreshold: 200,
    lastChecked: '10s ago',
    message: 'DB query round-trip healthy',
    history: [
      { time: '14:00', latencyMs: 48, status: 'pass' },
      { time: '14:05', latencyMs: 45, status: 'pass' },
      { time: '14:10', latencyMs: 39, status: 'pass' },
      { time: '14:15', latencyMs: 51, status: 'pass' },
      { time: '14:20', latencyMs: 42, status: 'pass' },
    ],
  },
  {
    id: 'resend-email',
    provider: 'Resend',
    service: 'Email Delivery',
    icon: <Mail size={18} />,
    status: 'warning',
    latencyMs: 312,
    threshold: 2000,
    warningThreshold: 300,
    lastChecked: '10s ago',
    message: 'Slightly elevated delivery latency',
    history: [
      { time: '14:00', latencyMs: 210, status: 'pass' },
      { time: '14:05', latencyMs: 245, status: 'pass' },
      { time: '14:10', latencyMs: 289, status: 'pass' },
      { time: '14:15', latencyMs: 305, status: 'warning' },
      { time: '14:20', latencyMs: 312, status: 'warning' },
    ],
  },
  {
    id: 'openai-api',
    provider: 'OpenAI',
    service: 'API Availability',
    icon: <Brain size={18} />,
    status: 'pass',
    latencyMs: 620,
    threshold: 3000,
    warningThreshold: 1500,
    lastChecked: '10s ago',
    message: 'Chat completion endpoint reachable',
    history: [
      { time: '14:00', latencyMs: 590, status: 'pass' },
      { time: '14:05', latencyMs: 640, status: 'pass' },
      { time: '14:10', latencyMs: 580, status: 'pass' },
      { time: '14:15', latencyMs: 610, status: 'pass' },
      { time: '14:20', latencyMs: 620, status: 'pass' },
    ],
  },
];

const defaultThresholds: AlertThreshold[] = [
  { provider: 'Supabase Auth', warnMs: 250, failMs: 500, enabled: true },
  { provider: 'Supabase DB', warnMs: 200, failMs: 500, enabled: true },
  { provider: 'Resend', warnMs: 300, failMs: 2000, enabled: true },
  { provider: 'OpenAI', warnMs: 1500, failMs: 3000, enabled: true },
];

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'checking') return <RefreshCw size={16} className="text-blue-400 animate-spin" />;
  if (status === 'pass') return <CheckCircle size={16} className="text-emerald-400" />;
  if (status === 'warning') return <AlertTriangle size={16} className="text-amber-400" />;
  return <XCircle size={16} className="text-red-400" />;
}

function StatusBadge({ status }: { status: CheckStatus }) {
  const map: Record<CheckStatus, string> = {
    pass: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    warning: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    fail: 'bg-red-400/10 text-red-400 border-red-400/20',
    checking: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  };
  const labels: Record<CheckStatus, string> = { pass: 'PASS', warning: 'WARN', fail: 'FAIL', checking: 'CHECKING' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-700 border ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

function LatencyBar({ value, warn, fail }: { value: number; warn: number; fail: number }) {
  const pct = Math.min((value / fail) * 100, 100);
  const color = value >= fail ? 'bg-red-400' : value >= warn ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-14 text-right">{value}ms</span>
    </div>
  );
}

function HistorySparkline({ history }: { history: HealthCheck['history'] }) {
  return (
    <div className="flex items-end gap-0.5 h-6">
      {history.map((h, i) => {
        const color = h.status === 'pass' ? 'bg-emerald-400' : h.status === 'warning' ? 'bg-amber-400' : 'bg-red-400';
        const height = Math.max(20, Math.min(100, 100 - (h.latencyMs / 500) * 80));
        return <div key={i} className={`w-2 rounded-sm ${color} opacity-80`} style={{ height: `${height}%` }} title={`${h.time}: ${h.latencyMs}ms`} />;
      })}
    </div>
  );
}

export default function ConnectivityHealthContent() {
  const [checks, setChecks] = useState<HealthCheck[]>(initialChecks);
  const [thresholds, setThresholds] = useState<AlertThreshold[]>(defaultThresholds);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState('2 min ago');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'thresholds'>('status');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const runChecks = useCallback(() => {
    setIsRunning(true);
    setChecks(prev => prev.map(c => ({ ...c, status: 'checking' as CheckStatus })));
    setTimeout(() => {
      setChecks(prev => prev.map(c => {
        const jitter = Math.floor(Math.random() * 40) - 20;
        const newLatency = Math.max(10, (c.latencyMs ?? 100) + jitter);
        const newStatus: CheckStatus = newLatency >= c.threshold ? 'fail' : newLatency >= c.warningThreshold ? 'warning' : 'pass';
        const now = new Date();
        const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
        return {
          ...c,
          latencyMs: newLatency,
          status: newStatus,
          lastChecked: 'just now',
          message: newStatus === 'pass' ? `${c.service} responding normally` : newStatus === 'warning' ? `Elevated latency detected` : `${c.service} unreachable`,
          history: [...c.history.slice(-4), { time: timeStr, latencyMs: newLatency, status: newStatus }],
        };
      }));
      setIsRunning(false);
      setLastRun('just now');
    }, 1200);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(runChecks, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, runChecks]);

  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warning').length;
  const failCount = checks.filter(c => c.status === 'fail').length;

  const overallStatus = failCount > 0 ? 'fail' : warnCount > 0 ? 'warning' : 'pass';
  const overallLabel = failCount > 0 ? 'Degraded' : warnCount > 0 ? 'Partial Issues' : 'All Systems Operational';
  const overallColor = failCount > 0 ? 'text-red-400 bg-red-400/10 border-red-400/20' : warnCount > 0 ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';

  const groupedChecks: Record<string, HealthCheck[]> = {};
  checks.forEach(c => {
    if (!groupedChecks[c.provider]) groupedChecks[c.provider] = [];
    groupedChecks[c.provider].push(c);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-700 text-foreground">Connectivity Health</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Periodic connectivity tests for Supabase, Resend, and OpenAI</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-3 py-1 ${overallColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {overallLabel}
          </span>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${autoRefresh ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-muted-foreground'}`}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={runChecks}
            disabled={isRunning}
            className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} className={isRunning ? 'animate-spin' : ''} />
            Run Checks
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Passing', count: passCount, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
          { label: 'Warnings', count: warnCount, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
          { label: 'Failing', count: failCount, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <div className={`text-2xl font-700 ${s.color}`}>{s.count}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['status', 'thresholds'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-500 border-b-2 transition-colors -mb-px capitalize ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {tab === 'status' ? 'Live Status' : 'Alert Thresholds'}
          </button>
        ))}
      </div>

      {/* Status Tab */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          {Object.entries(groupedChecks).map(([provider, provChecks]) => (
            <div key={provider} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-white/[0.02] flex items-center gap-2">
                <span className="text-sm font-600 text-foreground">{provider}</span>
                <span className="text-xs text-muted-foreground">({provChecks.length} checks)</span>
              </div>
              <div className="divide-y divide-border">
                {provChecks.map(check => (
                  <div key={check.id}>
                    <div
                      className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => setExpandedId(expandedId === check.id ? null : check.id)}
                    >
                      <div className="text-muted-foreground">{check.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-500 text-foreground">{check.service}</span>
                          <StatusBadge status={check.status} />
                        </div>
                        <LatencyBar value={check.latencyMs ?? 0} warn={check.warningThreshold} fail={check.threshold} />
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusIcon status={check.status} />
                        <HistorySparkline history={check.history} />
                        {expandedId === check.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                      </div>
                    </div>
                    {expandedId === check.id && (
                      <div className="px-4 pb-4 bg-white/[0.01] border-t border-border/50">
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-white/[0.03] rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">Current Latency</div>
                            <div className="text-sm font-600 text-foreground">{check.latencyMs}ms</div>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">Warn Threshold</div>
                            <div className="text-sm font-600 text-amber-400">{check.warningThreshold}ms</div>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">Fail Threshold</div>
                            <div className="text-sm font-600 text-red-400">{check.threshold}ms</div>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">Last Checked</div>
                            <div className="text-sm font-600 text-foreground">{check.lastChecked}</div>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground bg-white/[0.03] rounded-lg px-3 py-2">
                          <span className="text-foreground font-500">Status: </span>{check.message}
                        </div>
                        <div className="mt-3">
                          <div className="text-xs text-muted-foreground mb-2">Latency History (last 5 checks)</div>
                          <div className="flex items-end gap-1 h-12">
                            {check.history.map((h, i) => {
                              const pct = Math.max(10, Math.min(100, (h.latencyMs / check.threshold) * 100));
                              const color = h.status === 'pass' ? 'bg-emerald-400' : h.status === 'warning' ? 'bg-amber-400' : 'bg-red-400';
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                  <div className="w-full flex items-end justify-center" style={{ height: '36px' }}>
                                    <div className={`w-full rounded-sm ${color} opacity-70`} style={{ height: `${pct}%` }} />
                                  </div>
                                  <span className="text-[9px] text-muted-foreground">{h.time}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="text-xs text-muted-foreground text-right">Last run: {lastRun}</div>
        </div>
      )}

      {/* Thresholds Tab */}
      {activeTab === 'thresholds' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Configure warning and failure thresholds for each provider. Checks exceeding these values will trigger alerts.</p>
          {thresholds.map((t, idx) => (
            <div key={t.provider} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-muted-foreground" />
                  <span className="text-sm font-600 text-foreground">{t.provider}</span>
                </div>
                <button
                  onClick={() => setThresholds(prev => prev.map((th, i) => i === idx ? { ...th, enabled: !th.enabled } : th))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${t.enabled ? 'bg-primary' : 'bg-white/10'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${t.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Warning threshold (ms)</label>
                  <input
                    type="number"
                    value={t.warnMs}
                    onChange={e => setThresholds(prev => prev.map((th, i) => i === idx ? { ...th, warnMs: Number(e.target.value) } : th))}
                    disabled={!t.enabled}
                    className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground disabled:opacity-40 focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Failure threshold (ms)</label>
                  <input
                    type="number"
                    value={t.failMs}
                    onChange={e => setThresholds(prev => prev.map((th, i) => i === idx ? { ...th, failMs: Number(e.target.value) } : th))}
                    disabled={!t.enabled}
                    className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground disabled:opacity-40 focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                  <div className="absolute h-full bg-emerald-400/40 rounded-full" style={{ width: `${(t.warnMs / t.failMs) * 100}%` }} />
                  <div className="absolute h-full bg-amber-400/40 rounded-full" style={{ left: `${(t.warnMs / t.failMs) * 100}%`, width: `${((t.failMs - t.warnMs) / t.failMs) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">0 → {t.failMs}ms</span>
              </div>
            </div>
          ))}
          <button className="w-full py-2.5 bg-primary text-white text-sm font-500 rounded-xl hover:bg-primary/90 transition-colors">
            Save Thresholds
          </button>
        </div>
      )}
    </div>
  );
}
