'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { Shield, AlertTriangle, Ban, Activity, RefreshCw, TrendingUp, Globe, Clock, Zap, Eye, XCircle, Wifi, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BlockedIP {
  ip: string;
  reason: string;
  attempts: number;
  blockedAt: string;
  country: string;
  lockedFor: number; // seconds
}

interface FailedLoginUser {
  email: string;
  role: string;
  attempts: number;
  lastAttempt: string;
  ip: string;
  locked: boolean;
}

interface RateLimitViolation {
  ip: string;
  endpoint: string;
  requests: number;
  limit: number;
  windowSecs: number;
  blockedUntil: string;
}

interface SuspiciousPattern {
  id: string;
  type: string;
  description: string;
  ip: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  count: number;
}

interface ThreatHeatmapCell {
  hour: number;
  day: string;
  value: number;
}

const MOCK_BLOCKED_IPS: BlockedIP[] = [
  { ip: '185.220.101.45', reason: 'Brute force login (15+ attempts)', attempts: 18, blockedAt: '2026-09-06T01:45:00Z', country: 'DE', lockedFor: 3420 },
  { ip: '45.33.32.156', reason: 'SQL injection attempt', attempts: 7, blockedAt: '2026-09-06T01:30:00Z', country: 'US', lockedFor: 2100 },
  { ip: '220.158.44.12', reason: 'Scanner user-agent detected', attempts: 34, blockedAt: '2026-09-06T01:00:00Z', country: 'CN', lockedFor: 900 },
  { ip: '91.108.4.200', reason: 'Path traversal attempt', attempts: 5, blockedAt: '2026-09-06T00:45:00Z', country: 'RU', lockedFor: 600 },
  { ip: '103.77.192.219', reason: 'Rate limit exceeded (API)', attempts: 120, blockedAt: '2026-09-06T00:30:00Z', country: 'IN', lockedFor: 300 },
];

const MOCK_FAILED_LOGINS: FailedLoginUser[] = [
  { email: 'attacker@evil.com', role: '—', attempts: 15, lastAttempt: '2026-09-06T01:58:00Z', ip: '185.220.101.45', locked: true },
  { email: 'unknown@external.com', role: '—', attempts: 8, lastAttempt: '2026-09-06T01:30:00Z', ip: '220.158.44.12', locked: true },
  { email: 'candidate@test.ai', role: 'candidate', attempts: 3, lastAttempt: '2026-09-06T01:15:00Z', ip: '117.55.241.8', locked: false },
  { email: 'recruiter@test.ai', role: 'recruiter', attempts: 2, lastAttempt: '2026-09-06T00:55:00Z', ip: '49.207.192.44', locked: false },
];

const MOCK_RATE_VIOLATIONS: RateLimitViolation[] = [
  { ip: '103.77.192.219', endpoint: '/api/candidates', requests: 120, limit: 60, windowSecs: 60, blockedUntil: '2026-09-06T02:05:00Z' },
  { ip: '45.33.32.156', endpoint: '/api/ai/chat-completion', requests: 22, limit: 15, windowSecs: 60, blockedUntil: '2026-09-06T02:10:00Z' },
  { ip: '182.74.18.200', endpoint: '/api/interviews', requests: 75, limit: 60, windowSecs: 60, blockedUntil: '2026-09-06T02:03:00Z' },
];

const MOCK_SUSPICIOUS: SuspiciousPattern[] = [
  { id: 'sp1', type: 'SQL Injection', description: "Payload detected: ' OR 1=1 --", ip: '45.33.32.156', severity: 'critical', detectedAt: '2026-09-06T01:30:00Z', count: 7 },
  { id: 'sp2', type: 'Scanner Bot', description: 'User-Agent: sqlmap/1.7.8', ip: '220.158.44.12', severity: 'high', detectedAt: '2026-09-06T01:00:00Z', count: 34 },
  { id: 'sp3', type: 'Path Traversal', description: 'Request: /../../../etc/passwd', ip: '91.108.4.200', severity: 'high', detectedAt: '2026-09-06T00:45:00Z', count: 5 },
  { id: 'sp4', type: 'XSS Attempt', description: 'Payload: <script>alert(1)</script>', ip: '103.21.58.99', severity: 'medium', detectedAt: '2026-09-06T00:20:00Z', count: 3 },
  { id: 'sp5', type: 'Unusual Access Pattern', description: 'Rapid sequential API calls from single IP', ip: '103.77.192.219', severity: 'low', detectedAt: '2026-09-06T00:10:00Z', count: 120 },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MOCK_HEATMAP: ThreatHeatmapCell[] = DAYS.flatMap((day, di) =>
  Array.from({ length: 24 }, (_, hour) => ({
    day,
    hour,
    value: Math.floor(Math.random() * (di === 5 || di === 6 ? 3 : 8) + (hour >= 0 && hour <= 5 ? 2 : 0)),
  }))
);

const FAILED_LOGIN_CHART = [
  { hour: '00', count: 3 }, { hour: '01', count: 8 }, { hour: '02', count: 5 },
  { hour: '03', count: 2 }, { hour: '04', count: 1 }, { hour: '05', count: 4 },
  { hour: '06', count: 6 }, { hour: '07', count: 9 }, { hour: '08', count: 12 },
  { hour: '09', count: 7 }, { hour: '10', count: 5 }, { hour: '11', count: 3 },
  { hour: '12', count: 4 }, { hour: '13', count: 6 }, { hour: '14', count: 8 },
  { hour: '15', count: 11 }, { hour: '16', count: 15 }, { hour: '17', count: 9 },
  { hour: '18', count: 7 }, { hour: '19', count: 5 }, { hour: '20', count: 4 },
  { hour: '21', count: 6 }, { hour: '22', count: 10 }, { hour: '23', count: 18 },
];

const SEVERITY_STYLES = {
  critical: 'bg-danger/10 text-danger border-danger/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-muted text-muted-foreground border-border',
};

function HeatmapCell({ value }: { value: number }) {
  const intensity = Math.min(value / 8, 1);
  const bg = intensity === 0
    ? 'bg-muted/30'
    : intensity < 0.25
    ? 'bg-warning/20'
    : intensity < 0.5
    ? 'bg-warning/50'
    : intensity < 0.75
    ? 'bg-danger/50' :'bg-danger';
  return (
    <div
      className={`w-5 h-5 rounded-sm ${bg} transition-colors`}
      title={`${value} threats`}
    />
  );
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function SecurityDashboardContent() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);

  const refresh = useCallback(() => {
    setLastRefresh(new Date());
    setCountdown(30);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { refresh(); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  const totalThreats = MOCK_BLOCKED_IPS.length + MOCK_SUSPICIOUS.length;
  const criticalCount = MOCK_SUSPICIOUS.filter(s => s.severity === 'critical').length;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-700 text-foreground flex items-center gap-2">
              <Shield size={20} className="text-primary" />
              Security Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Real-time threat monitoring and incident response
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
              {autoRefresh ? `Auto-refresh in ${countdown}s` : 'Auto-refresh off'}
            </div>
            <button
              onClick={() => setAutoRefresh(a => !a)}
              className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {autoRefresh ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Blocked IPs', value: MOCK_BLOCKED_IPS.length, icon: <Ban size={16} className="text-danger" />, bg: 'bg-danger/10', trend: '+2 today' },
            { label: 'Failed Logins', value: MOCK_FAILED_LOGINS.reduce((s, l) => s + l.attempts, 0), icon: <XCircle size={16} className="text-warning" />, bg: 'bg-warning/10', trend: 'Last 24h' },
            { label: 'Rate Violations', value: MOCK_RATE_VIOLATIONS.length, icon: <Zap size={16} className="text-orange-500" />, bg: 'bg-orange-500/10', trend: 'Active now' },
            { label: 'Threat Events', value: totalThreats, icon: <AlertTriangle size={16} className="text-primary" />, bg: 'bg-primary/10', trend: `${criticalCount} critical` },
          ].map(k => (
            <div key={k.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center`}>{k.icon}</div>
                <span className="text-xs text-muted-foreground">{k.trend}</span>
              </div>
              <p className="text-2xl font-700 text-foreground">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Blocked IPs */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Ban size={15} className="text-danger" />
                <h2 className="text-sm font-600 text-foreground">Blocked IPs</h2>
                <span className="text-xs px-1.5 py-0.5 bg-danger/10 text-danger rounded-full">{MOCK_BLOCKED_IPS.length} active</span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {MOCK_BLOCKED_IPS.map(ip => (
                <div key={ip.ip} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                      <Globe size={14} className="text-danger" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-600 text-foreground">{ip.ip}</code>
                        <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{ip.country}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{ip.reason}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-600 text-danger">{ip.attempts} attempts</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock size={10} />
                      {formatCountdown(ip.lockedFor)} left
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Failed Logins per User */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <XCircle size={15} className="text-warning" />
              <h2 className="text-sm font-600 text-foreground">Failed Logins</h2>
            </div>
            <div className="divide-y divide-border">
              {MOCK_FAILED_LOGINS.map(u => (
                <div key={u.email} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground truncate max-w-[140px]">{u.email}</span>
                    {u.locked ? (
                      <span className="text-xs px-1.5 py-0.5 bg-danger/10 text-danger rounded-full flex items-center gap-1">
                        <Lock size={9} /> Locked
                      </span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 bg-warning/10 text-warning rounded-full">{u.attempts}x</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-mono text-muted-foreground">{u.ip}</code>
                    <span className="text-xs text-muted-foreground">{formatTime(u.lastAttempt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Failed Login Chart */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-primary" />
              <h2 className="text-sm font-600 text-foreground">Failed Login Attempts (24h)</h2>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={FAILED_LOGIN_CHART} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [v, 'Failed Logins']}
                  labelFormatter={(l: string) => `${l}:00`}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {FAILED_LOGIN_CHART.map((entry, i) => (
                    <Cell key={i} fill={entry.count >= 10 ? 'var(--danger, #ef4444)' : entry.count >= 6 ? '#f97316' : 'var(--primary)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rate Limit Violations */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Zap size={15} className="text-orange-500" />
              <h2 className="text-sm font-600 text-foreground">Active Rate-Limit Violations</h2>
            </div>
            <div className="divide-y divide-border">
              {MOCK_RATE_VIOLATIONS.map((v, i) => (
                <div key={i} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <code className="text-xs font-mono font-600 text-foreground">{v.ip}</code>
                    <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20">
                      {v.requests}/{v.limit} req/min
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">{v.endpoint}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={10} />
                      Until {formatTime(v.blockedUntil)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${Math.min((v.requests / v.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Suspicious Patterns + Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Suspicious Patterns */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Eye size={15} className="text-primary" />
              <h2 className="text-sm font-600 text-foreground">Suspicious Patterns</h2>
            </div>
            <div className="divide-y divide-border">
              {MOCK_SUSPICIOUS.map(s => (
                <div key={s.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${s.severity === 'critical' ? 'bg-danger' : s.severity === 'high' ? 'bg-orange-500' : s.severity === 'medium' ? 'bg-warning' : 'bg-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-600 text-foreground">{s.type}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border capitalize ${SEVERITY_STYLES[s.severity]}`}>
                        {s.severity}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">{s.count}x</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">{s.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <code className="text-xs font-mono text-muted-foreground">{s.ip}</code>
                      <span className="text-xs text-muted-foreground">{formatTime(s.detectedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Threat Heatmap */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={15} className="text-primary" />
              <h2 className="text-sm font-600 text-foreground">Threat Heatmap</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Threat events by day × hour (this week)</p>
            {/* Hour labels */}
            <div className="flex gap-0.5 mb-1 ml-8">
              {[0, 4, 8, 12, 16, 20].map(h => (
                <div key={h} className="w-5 text-[9px] text-muted-foreground" style={{ marginLeft: h === 0 ? 0 : `${(4 - 1) * 21}px` }}>
                  {h}h
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {DAYS.map(day => (
                <div key={day} className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground w-7 shrink-0">{day}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 24 }, (_, h) => {
                      const cell = MOCK_HEATMAP.find(c => c.day === day && c.hour === h);
                      return <HeatmapCell key={h} value={cell?.value ?? 0} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] text-muted-foreground">Low</span>
              <div className="flex gap-0.5">
                {['bg-muted/30', 'bg-warning/20', 'bg-warning/50', 'bg-danger/50', 'bg-danger'].map((c, i) => (
                  <div key={i} className={`w-4 h-4 rounded-sm ${c}`} />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">High</span>
            </div>
          </div>
        </div>

        {/* Last refresh */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wifi size={12} />
          Last refreshed: {lastRefresh.toLocaleTimeString('en-IN')}
          {autoRefresh && <span className="text-success">· Live</span>}
        </div>
      </div>
    </AppLayout>
  );
}
