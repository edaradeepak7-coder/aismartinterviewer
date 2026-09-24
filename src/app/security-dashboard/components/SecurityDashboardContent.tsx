'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertTriangle, Ban, Activity, RefreshCw, TrendingUp, Globe, Clock,
  Zap, Eye, XCircle, Wifi, Lock, Loader2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Link from 'next/link';

interface BlockedIP {
  ip: string;
  reason: string;
  attempts: number;
  blockedAt: string;
  country: string;
  lockedFor: number;
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

interface ChartPoint {
  hour: string;
  count: number;
}

interface Kpis {
  blockedIps: number;
  failedLoginAttempts: number;
  rateViolations: number;
  totalThreats: number;
  criticalCount: number;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SEVERITY_STYLES = {
  critical: 'bg-danger/10 text-danger border-danger/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-muted text-muted-foreground border-border',
};

function HeatmapCell({ value }: { value: number }) {
  const intensity = Math.min(value / 8, 1);
  const bg =
    intensity === 0
      ? 'bg-muted/30'
      : intensity < 0.25
        ? 'bg-warning/20'
        : intensity < 0.5
          ? 'bg-warning/50'
          : intensity < 0.75
            ? 'bg-danger/50'
            : 'bg-danger';
  return (
    <div className={`w-5 h-5 rounded-sm ${bg} transition-colors`} title={`${value} threats`} />
  );
}

function formatCountdown(seconds: number) {
  if (seconds >= 999999) return 'permanent';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-4 py-8 text-center text-xs text-muted-foreground">{message}</div>
  );
}

export default function SecurityDashboardContent() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [blockedIps, setBlockedIps] = useState<BlockedIP[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLoginUser[]>([]);
  const [rateViolations, setRateViolations] = useState<RateLimitViolation[]>([]);
  const [suspicious, setSuspicious] = useState<SuspiciousPattern[]>([]);
  const [failedLoginChart, setFailedLoginChart] = useState<ChartPoint[]>([]);
  const [heatmap, setHeatmap] = useState<ThreatHeatmapCell[]>([]);
  const [kpis, setKpis] = useState<Kpis>({
    blockedIps: 0,
    failedLoginAttempts: 0,
    rateViolations: 0,
    totalThreats: 0,
    criticalCount: 0,
  });

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/security-dashboard');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to load security dashboard');
      const d = json.data || {};
      setBlockedIps(d.blockedIps || []);
      setFailedLogins(d.failedLogins || []);
      setRateViolations(d.rateViolations || []);
      setSuspicious(d.suspicious || []);
      setFailedLoginChart(d.failedLoginChart || []);
      setHeatmap(d.heatmap || []);
      setKpis(
        d.kpis || {
          blockedIps: 0,
          failedLoginAttempts: 0,
          rateViolations: 0,
          totalThreats: 0,
          criticalCount: 0,
        },
      );
      setLastRefresh(new Date());
      setCountdown(30);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          load();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  const chartData =
    failedLoginChart.length > 0
      ? failedLoginChart
      : Array.from({ length: 24 }, (_, i) => ({
          hour: String(i).padStart(2, '0'),
          count: 0,
        }));

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-700 text-foreground flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            Security Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Threat monitoring from blocked IPs, audit logs, and security events
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <div
              className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`}
            />
            {autoRefresh ? `Auto-refresh in ${countdown}s` : 'Auto-refresh off'}
          </div>
          <button
            type="button"
            onClick={() => setAutoRefresh((a) => !a)}
            className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Blocked IPs',
            value: kpis.blockedIps,
            icon: <Ban size={16} className="text-danger" />,
            bg: 'bg-danger/10',
            trend: 'Active',
          },
          {
            label: 'Failed Logins',
            value: kpis.failedLoginAttempts,
            icon: <XCircle size={16} className="text-warning" />,
            bg: 'bg-warning/10',
            trend: 'Last 24h',
          },
          {
            label: 'Rate Violations',
            value: kpis.rateViolations,
            icon: <Zap size={16} className="text-orange-500" />,
            bg: 'bg-orange-500/10',
            trend: 'Unresolved',
          },
          {
            label: 'Threat Events',
            value: kpis.totalThreats,
            icon: <AlertTriangle size={16} className="text-primary" />,
            bg: 'bg-primary/10',
            trend: `${kpis.criticalCount} critical`,
          },
        ].map((k) => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                {k.icon}
              </div>
              <span className="text-xs text-muted-foreground">{k.trend}</span>
            </div>
            <p className="text-2xl font-700 text-foreground">{loading ? '—' : k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Ban size={15} className="text-danger" />
              <h2 className="text-sm font-600 text-foreground">Blocked IPs</h2>
              <span className="text-xs px-1.5 py-0.5 bg-danger/10 text-danger rounded-full">
                {blockedIps.length} active
              </span>
            </div>
            <Link href="/ip-whitelist" className="text-xs text-primary hover:underline">
              IP whitelist
            </Link>
          </div>
          <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
            {loading && blockedIps.length === 0 ? (
              <EmptyRow message="Loading…" />
            ) : blockedIps.length === 0 ? (
              <EmptyRow message="No active IP blocks" />
            ) : (
              blockedIps.map((ip) => (
                <div
                  key={`${ip.ip}-${ip.blockedAt}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                      <Globe size={14} className="text-danger" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-600 text-foreground">{ip.ip}</code>
                        <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                          {ip.country}
                        </span>
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
              ))
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <XCircle size={15} className="text-warning" />
              <h2 className="text-sm font-600 text-foreground">Failed Logins</h2>
            </div>
            <Link href="/audit-logs" className="text-xs text-primary hover:underline">
              Audit trail
            </Link>
          </div>
          <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
            {loading && failedLogins.length === 0 ? (
              <EmptyRow message="Loading…" />
            ) : failedLogins.length === 0 ? (
              <EmptyRow message="No failed logins in the last 24h" />
            ) : (
              failedLogins.map((u) => (
                <div key={u.email} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
                      {u.email}
                    </span>
                    {u.locked ? (
                      <span className="text-xs px-1.5 py-0.5 bg-danger/10 text-danger rounded-full flex items-center gap-1">
                        <Lock size={9} /> Locked
                      </span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 bg-warning/10 text-warning rounded-full">
                        {u.attempts}x
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-mono text-muted-foreground">{u.ip}</code>
                    <span className="text-xs text-muted-foreground">{formatTime(u.lastAttempt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-primary" />
            <h2 className="text-sm font-600 text-foreground">Failed Login Attempts (24h)</h2>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [v, 'Failed Logins']}
                labelFormatter={(l: string) => `${l}:00`}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.count >= 10
                        ? 'var(--danger, #ef4444)'
                        : entry.count >= 6
                          ? '#f97316'
                          : 'var(--primary)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Zap size={15} className="text-orange-500" />
            <h2 className="text-sm font-600 text-foreground">Active Rate-Limit Violations</h2>
          </div>
          <div className="divide-y divide-border max-h-[220px] overflow-y-auto">
            {rateViolations.length === 0 ? (
              <EmptyRow message="No unresolved rate-limit events" />
            ) : (
              rateViolations.map((v, i) => (
                <div key={`${v.ip}-${v.endpoint}-${i}`} className="px-4 py-3 hover:bg-muted/20 transition-colors">
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
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${Math.min((v.requests / Math.max(v.limit, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Eye size={15} className="text-primary" />
            <h2 className="text-sm font-600 text-foreground">Suspicious Patterns</h2>
          </div>
          <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
            {suspicious.length === 0 ? (
              <EmptyRow message="No unresolved suspicious events" />
            ) : (
              suspicious.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      s.severity === 'critical'
                        ? 'bg-danger'
                        : s.severity === 'high'
                          ? 'bg-orange-500'
                          : s.severity === 'medium'
                            ? 'bg-warning'
                            : 'bg-muted-foreground'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-600 text-foreground">{s.type}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full border capitalize ${SEVERITY_STYLES[s.severity]}`}
                      >
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
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-primary" />
            <h2 className="text-sm font-600 text-foreground">Threat Heatmap</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Threat events by day × hour (this week)</p>
          <div className="flex gap-0.5 mb-1 ml-8">
            {[0, 4, 8, 12, 16, 20].map((h) => (
              <div
                key={h}
                className="w-5 text-[9px] text-muted-foreground"
                style={{ marginLeft: h === 0 ? 0 : `${(4 - 1) * 21}px` }}
              >
                {h}h
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground w-7 shrink-0">{day}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 24 }, (_, h) => {
                    const cell = heatmap.find((c) => c.day === day && c.hour === h);
                    return <HeatmapCell key={h} value={cell?.value ?? 0} />;
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] text-muted-foreground">Low</span>
            <div className="flex gap-0.5">
              {['bg-muted/30', 'bg-warning/20', 'bg-warning/50', 'bg-danger/50', 'bg-danger'].map(
                (c, i) => (
                  <div key={i} className={`w-4 h-4 rounded-sm ${c}`} />
                ),
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">High</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Wifi size={12} />
        Last refreshed: {lastRefresh.toLocaleTimeString('en-IN')}
        {autoRefresh && <span className="text-success">· Live</span>}
      </div>
    </div>
  );
}
