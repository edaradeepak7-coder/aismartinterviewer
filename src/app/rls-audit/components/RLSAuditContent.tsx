'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertTriangle, Eye, Database, Search, RefreshCw, Download,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, Lock, Flag, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { csrfHeaders } from '@/lib/api/apiClient';

type EventType = 'policy_violation' | 'unauthorized_access' | 'data_exposure_risk' | 'suspicious_query';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface RLSAuditEvent {
  id: string;
  event_type: EventType;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  table_name: string;
  operation: string;
  policy_name?: string;
  resource_id?: string;
  ip_address?: string;
  risk_level: RiskLevel;
  resolved: boolean;
  resolved_by?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

interface Kpis {
  total: number;
  critical: number;
  open: number;
  violations: number;
}

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; icon: React.ReactNode }> = {
  policy_violation: {
    label: 'Policy Violation',
    color: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    icon: <Lock size={12} />,
  },
  unauthorized_access: {
    label: 'Unauthorized Access',
    color: 'text-red-400 bg-red-400/10 border-red-400/20',
    icon: <XCircle size={12} />,
  },
  data_exposure_risk: {
    label: 'Data Exposure Risk',
    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    icon: <Eye size={12} />,
  },
  suspicious_query: {
    label: 'Suspicious Query',
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    icon: <AlertTriangle size={12} />,
  },
};

const RISK_CONFIG: Record<RiskLevel, { color: string; dot: string }> = {
  low: { color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', dot: 'bg-emerald-400' },
  medium: { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', dot: 'bg-yellow-400' },
  high: { color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', dot: 'bg-orange-400' },
  critical: { color: 'text-red-400 bg-red-400/10 border-red-400/20', dot: 'bg-red-400' },
};

const TRACKED_TABLES = [
  'user_profiles',
  'candidates',
  'interviews',
  'questions',
  'responses',
  'job_offers',
  'audit_logs',
  'api_keys',
  'notifications',
  'rls_audit_events',
  'blocked_ips',
  'security_events',
];

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function RLSAuditContent() {
  const [events, setEvents] = useState<RLSAuditEvent[]>([]);
  const [kpis, setKpis] = useState<Kpis>({ total: 0, critical: 0, open: 0, violations: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterResolved, setFilterResolved] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ limit: '150' });
      if (filterType !== 'all') params.set('event_type', filterType);
      if (filterRisk !== 'all') params.set('risk_level', filterRisk);
      if (filterResolved !== 'all') params.set('resolved', filterResolved);
      if (search.trim()) params.set('q', search.trim());

      const res = await fetch(`/api/rls-audit?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to load RLS audit events');
      setEvents((json.data || []) as RLSAuditEvent[]);
      setKpis(json.kpis || { total: 0, critical: 0, open: 0, violations: 0 });
      setLastRefreshed(new Date());
    } catch (err: unknown) {
      setEvents([]);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterRisk, filterResolved, search]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  const patchEvent = async (id: string, action: 'resolve' | 'escalate') => {
    setActingId(id);
    try {
      const res = await fetch('/api/rls-audit', {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed to ${action}`);
      toast.success(action === 'resolve' ? 'Marked resolved' : 'Escalated to critical');
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActingId(null);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['ID', 'Type', 'User', 'Role', 'Table', 'Operation', 'Risk', 'IP', 'Resolved', 'Timestamp'],
      ...events.map((e) => [
        e.id,
        e.event_type,
        e.user_email ?? '',
        e.user_role ?? '',
        e.table_name,
        e.operation,
        e.risk_level,
        e.ip_address ?? '',
        String(e.resolved),
        e.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rls_audit.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-700 text-foreground flex items-center gap-2">
            <Shield size={20} className="text-teal-500" /> RLS Policy Audit Trail
          </h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Row-level security violations, unauthorized access attempts, and data exposure risks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-500 border transition-colors ${
              autoRefresh
                ? 'bg-teal-500/20 text-teal-600 border-teal-500/30'
                : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <RefreshCw size={13} className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? 'Live' : 'Auto-refresh'}
          </button>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground border border-border transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={exportCSV}
            disabled={events.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground border border-border text-[12px] font-500 transition-colors disabled:opacity-40"
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Events',
            value: kpis.total,
            icon: <Database size={16} />,
            color: 'text-teal-500',
            bg: 'bg-teal-500/10',
          },
          {
            label: 'Critical Risk',
            value: kpis.critical,
            icon: <AlertTriangle size={16} />,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
          },
          {
            label: 'Open / Unresolved',
            value: kpis.open,
            icon: <Flag size={16} />,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
          },
          {
            label: 'Policy Violations',
            value: kpis.violations,
            icon: <Lock size={16} />,
            color: 'text-yellow-600',
            bg: 'bg-yellow-500/10',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
          >
            <div
              className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center ${s.color} shrink-0`}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-[22px] font-700 text-foreground leading-none">
                {loading ? '—' : s.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, table, IP..."
            className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-[12px] text-foreground focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="policy_violation">Policy Violation</option>
          <option value="unauthorized_access">Unauthorized Access</option>
          <option value="data_exposure_risk">Data Exposure Risk</option>
          <option value="suspicious_query">Suspicious Query</option>
        </select>
        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-[12px] text-foreground focus:outline-none"
        >
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filterResolved}
          onChange={(e) => setFilterResolved(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-[12px] text-foreground focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
        <span className="text-[11px] text-muted-foreground ml-auto">
          {events.length} events · refreshed {lastRefreshed.toLocaleTimeString()}
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  'S.No',
                  'Event Type',
                  'User / Role',
                  'Table · Operation',
                  'Risk',
                  'IP Address',
                  'Time',
                  'Status',
                  '',
                ].map((h) => (
                  <th
                    key={h || 'expand'}
                    className="px-4 py-3 text-left text-[10px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2 text-[13px]">
                      <Loader2 size={16} className="animate-spin" /> Loading events…
                    </span>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-[13px]">
                    No RLS audit events yet. Violations appear here when reported via the API.
                  </td>
                </tr>
              ) : (
                events.map((event, idx) => {
                  const typeConf =
                    EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.suspicious_query;
                  const riskConf = RISK_CONFIG[event.risk_level] || RISK_CONFIG.medium;
                  const isExpanded = expandedId === event.id;
                  return (
                    <React.Fragment key={event.id}>
                      <tr
                        className={`border-b border-border hover:bg-muted/30 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-muted/20' : ''
                        }`}
                        onClick={() => setExpandedId(isExpanded ? null : event.id)}
                      >
                        <td className="px-4 py-3 text-muted-foreground font-600">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-500 ${typeConf.color}`}
                          >
                            {typeConf.icon} {typeConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground font-500">{event.user_email ?? 'anonymous'}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {event.user_role ?? 'anon'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground/80 font-500">{event.table_name}</p>
                          <p className="text-muted-foreground text-[10px]">{event.operation}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-600 uppercase ${riskConf.color}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${riskConf.dot}`} />
                            {event.risk_level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                          {event.ip_address ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatWhen(event.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {event.resolved ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500 text-[11px]">
                              <CheckCircle2 size={12} /> Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-orange-500 text-[11px]">
                              <Clock size={12} /> Open
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isExpanded ? (
                            <ChevronUp size={14} className="text-muted-foreground" />
                          ) : (
                            <ChevronDown size={14} className="text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-border bg-muted/10">
                          <td colSpan={9} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] font-600 text-muted-foreground uppercase tracking-wider mb-2">
                                  Event Details
                                </p>
                                <div className="space-y-1.5">
                                  {event.policy_name && (
                                    <div className="flex gap-2">
                                      <span className="text-muted-foreground text-[11px] w-28 shrink-0">
                                        Policy:
                                      </span>
                                      <span className="text-foreground/80 text-[11px] font-mono">
                                        {event.policy_name}
                                      </span>
                                    </div>
                                  )}
                                  {event.resource_id && (
                                    <div className="flex gap-2">
                                      <span className="text-muted-foreground text-[11px] w-28 shrink-0">
                                        Resource ID:
                                      </span>
                                      <span className="text-foreground/80 text-[11px] font-mono">
                                        {event.resource_id}
                                      </span>
                                    </div>
                                  )}
                                  {event.resolved_by && (
                                    <div className="flex gap-2">
                                      <span className="text-muted-foreground text-[11px] w-28 shrink-0">
                                        Resolved by:
                                      </span>
                                      <span className="text-foreground/80 text-[11px]">
                                        {event.resolved_by}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {event.details && Object.keys(event.details).length > 0 && (
                                <div>
                                  <p className="text-[10px] font-600 text-muted-foreground uppercase tracking-wider mb-2">
                                    Context Data
                                  </p>
                                  <div className="bg-muted/40 rounded-lg p-3 font-mono text-[11px] text-foreground/70 space-y-1">
                                    {Object.entries(event.details).map(([k, v]) => (
                                      <div key={k} className="flex gap-2">
                                        <span className="text-teal-600">{k}:</span>
                                        <span>{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            {!event.resolved && (
                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  disabled={actingId === event.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    patchEvent(event.id, 'resolve');
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 text-[12px] font-500 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                                >
                                  {actingId === event.id ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={13} />
                                  )}
                                  Mark Resolved
                                </button>
                                <button
                                  type="button"
                                  disabled={actingId === event.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    patchEvent(event.id, 'escalate');
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-600 border border-red-500/30 text-[12px] font-500 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                >
                                  <Flag size={13} /> Escalate
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-[13px] font-600 text-foreground mb-2 flex items-center gap-2">
          <Shield size={14} className="text-teal-500" /> Tracked tables
        </h2>
        <p className="text-[11px] text-muted-foreground mb-4">
          Tables commonly covered by RLS. Event counts come from live audit data, not this list.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {TRACKED_TABLES.map((table) => (
            <div
              key={table}
              className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-2"
            >
              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
              <p className="text-[11px] text-foreground/80 font-mono truncate">{table}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
