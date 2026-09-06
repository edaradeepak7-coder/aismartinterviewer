'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { Shield, AlertTriangle, Eye, Database, Search, RefreshCw, Download, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, User, Activity, Lock, Flag } from 'lucide-react';

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

const MOCK_EVENTS: RLSAuditEvent[] = [
  { id: 'e1', event_type: 'policy_violation', user_email: 'candidate@iitb.ac.in', user_role: 'candidate', table_name: 'interviews', operation: 'SELECT', policy_name: 'candidates_own_interviews', resource_id: 'int-892', ip_address: '103.21.58.12', risk_level: 'high', resolved: false, created_at: '2026-09-06 08:45:12', details: { attempted_rows: 47, allowed_rows: 3, blocked_rows: 44 } },
  { id: 'e2', event_type: 'unauthorized_access', user_email: 'recruiter@infosys.com', user_role: 'recruiter', table_name: 'user_profiles', operation: 'UPDATE', policy_name: 'users_manage_own_user_profiles', resource_id: 'usr-221', ip_address: '49.207.192.44', risk_level: 'critical', resolved: false, created_at: '2026-09-06 08:30:05', details: { target_user: 'admin@triveda.ai', attempted_field: 'role' } },
  { id: 'e3', event_type: 'data_exposure_risk', user_email: 'org_admin@wipro.com', user_role: 'org_admin', table_name: 'candidates', operation: 'SELECT', policy_name: 'org_scoped_candidates', resource_id: null, ip_address: '182.74.18.200', risk_level: 'medium', resolved: true, resolved_by: 'admin@triveda.ai', created_at: '2026-09-06 07:15:44', details: { rows_returned: 1240, expected_max: 200 } },
  { id: 'e4', event_type: 'suspicious_query', user_email: 'unknown@external.io', user_role: 'anon', table_name: 'api_keys', operation: 'SELECT', policy_name: 'admin_only_api_keys', resource_id: null, ip_address: '185.220.101.45', risk_level: 'critical', resolved: false, created_at: '2026-09-06 06:58:33', details: { query_pattern: 'bulk_dump', attempts: 12 } },
  { id: 'e5', event_type: 'policy_violation', user_email: 'faculty@nit.ac.in', user_role: 'faculty', table_name: 'questions', operation: 'DELETE', policy_name: 'admin_manage_questions', resource_id: 'q-445', ip_address: '59.144.22.88', risk_level: 'high', resolved: true, resolved_by: 'admin@triveda.ai', created_at: '2026-09-06 05:22:18', details: { question_type: 'coding', subject: 'Java' } },
  { id: 'e6', event_type: 'unauthorized_access', user_email: 'candidate@bits.ac.in', user_role: 'candidate', table_name: 'job_offers', operation: 'INSERT', policy_name: 'recruiter_manage_offers', resource_id: null, ip_address: '220.158.44.12', risk_level: 'medium', resolved: false, created_at: '2026-09-06 04:10:55', details: { attempted_salary: 2500000 } },
  { id: 'e7', event_type: 'data_exposure_risk', user_email: 'recruiter@tcs.com', user_role: 'recruiter', table_name: 'responses', operation: 'SELECT', policy_name: 'recruiter_view_responses', resource_id: null, ip_address: '203.88.142.9', risk_level: 'low', resolved: true, resolved_by: 'admin@triveda.ai', created_at: '2026-09-05 22:44:30', details: { cross_org_rows: 8 } },
  { id: 'e8', event_type: 'suspicious_query', user_email: 'placement@iimb.ac.in', user_role: 'placement_officer', table_name: 'audit_logs', operation: 'SELECT', policy_name: 'admin_only_audit_logs', resource_id: null, ip_address: '117.55.241.8', risk_level: 'high', resolved: false, created_at: '2026-09-05 21:30:00', details: { filter_bypass_attempt: true } },
];

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; icon: React.ReactNode }> = {
  policy_violation: { label: 'Policy Violation', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: <Lock size={12} /> },
  unauthorized_access: { label: 'Unauthorized Access', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: <XCircle size={12} /> },
  data_exposure_risk: { label: 'Data Exposure Risk', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: <Eye size={12} /> },
  suspicious_query: { label: 'Suspicious Query', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', icon: <AlertTriangle size={12} /> },
};

const RISK_CONFIG: Record<RiskLevel, { color: string; dot: string }> = {
  low: { color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', dot: 'bg-emerald-400' },
  medium: { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', dot: 'bg-yellow-400' },
  high: { color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', dot: 'bg-orange-400' },
  critical: { color: 'text-red-400 bg-red-400/10 border-red-400/20', dot: 'bg-red-400' },
};

export default function RLSAuditContent() {
  const [events, setEvents] = useState<RLSAuditEvent[]>(MOCK_EVENTS);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterResolved, setFilterResolved] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const refresh = useCallback(() => {
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [autoRefresh, refresh]);

  const filtered = events.filter(e => {
    const matchSearch = !search || e.user_email?.includes(search) || e.table_name.includes(search) || e.ip_address?.includes(search);
    const matchType = filterType === 'all' || e.event_type === filterType;
    const matchRisk = filterRisk === 'all' || e.risk_level === filterRisk;
    const matchResolved = filterResolved === 'all' || (filterResolved === 'open' ? !e.resolved : e.resolved);
    return matchSearch && matchType && matchRisk && matchResolved;
  });

  const stats = {
    total: events.length,
    critical: events.filter(e => e.risk_level === 'critical').length,
    open: events.filter(e => !e.resolved).length,
    violations: events.filter(e => e.event_type === 'policy_violation').length,
  };

  const handleResolve = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, resolved: true, resolved_by: 'admin@triveda.ai' } : e));
  };

  const exportCSV = () => {
    const rows = [
      ['ID', 'Type', 'User', 'Role', 'Table', 'Operation', 'Risk', 'IP', 'Resolved', 'Timestamp'],
      ...filtered.map(e => [e.id, e.event_type, e.user_email ?? '', e.user_role ?? '', e.table_name, e.operation, e.risk_level, e.ip_address ?? '', String(e.resolved), e.created_at]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rls_audit.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-700 text-white flex items-center gap-2">
              <Shield size={20} className="text-teal-400" /> RLS Policy Audit Trail
            </h1>
            <p className="text-[12px] text-white/40 mt-0.5">Row-level security violations, unauthorized access attempts, and data exposure risks</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-500 border transition-colors ${autoRefresh ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' : 'bg-white/5 text-white/50 border-white/10 hover:text-white/80'}`}
            >
              <Activity size={13} className={autoRefresh ? 'animate-pulse' : ''} />
              {autoRefresh ? 'Live' : 'Auto-refresh'}
            </button>
            <button onClick={refresh} className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white border border-white/10 transition-colors">
              <RefreshCw size={14} />
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white border border-white/10 text-[12px] font-500 transition-colors">
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Events', value: stats.total, icon: <Database size={16} />, color: 'text-teal-400', bg: 'bg-teal-400/10' },
            { label: 'Critical Risk', value: stats.critical, icon: <AlertTriangle size={16} />, color: 'text-red-400', bg: 'bg-red-400/10' },
            { label: 'Open / Unresolved', value: stats.open, icon: <Flag size={16} />, color: 'text-orange-400', bg: 'bg-orange-400/10' },
            { label: 'Policy Violations', value: stats.violations, icon: <Lock size={16} />, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center ${s.color} shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-[22px] font-700 text-white leading-none">{s.value}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by user, table, IP..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-[12px] text-white placeholder-white/25 focus:outline-none focus:border-teal-500/50"
            />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 focus:outline-none focus:border-teal-500/50">
            <option value="all">All Types</option>
            <option value="policy_violation">Policy Violation</option>
            <option value="unauthorized_access">Unauthorized Access</option>
            <option value="data_exposure_risk">Data Exposure Risk</option>
            <option value="suspicious_query">Suspicious Query</option>
          </select>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 focus:outline-none focus:border-teal-500/50">
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filterResolved} onChange={e => setFilterResolved(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 focus:outline-none focus:border-teal-500/50">
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
          <span className="text-[11px] text-white/30 ml-auto">{filtered.length} events · refreshed {lastRefreshed.toLocaleTimeString()}</span>
        </div>

        {/* Events Table */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['S.No', 'Event Type', 'User / Role', 'Table · Operation', 'Risk', 'IP Address', 'Time', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-600 text-white/30 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((event, idx) => {
                  const typeConf = EVENT_TYPE_CONFIG[event.event_type];
                  const riskConf = RISK_CONFIG[event.risk_level];
                  const isExpanded = expandedId === event.id;
                  return (
                    <React.Fragment key={event.id}>
                      <tr
                        className={`border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors ${isExpanded ? 'bg-white/[0.03]' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : event.id)}
                      >
                        <td className="px-4 py-3 text-white/30 font-600">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-500 ${typeConf.color}`}>
                            {typeConf.icon} {typeConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white/80 font-500">{event.user_email ?? 'anonymous'}</p>
                          <p className="text-white/30 text-[10px]">{event.user_role ?? 'anon'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white/70 font-500">{event.table_name}</p>
                          <p className="text-white/30 text-[10px]">{event.operation}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-600 uppercase ${riskConf.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${riskConf.dot}`} />
                            {event.risk_level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/40 font-mono text-[11px]">{event.ip_address ?? '—'}</td>
                        <td className="px-4 py-3 text-white/40 whitespace-nowrap">{event.created_at}</td>
                        <td className="px-4 py-3">
                          {event.resolved ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]"><CheckCircle2 size={12} /> Resolved</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-orange-400 text-[11px]"><Clock size={12} /> Open</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isExpanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-white/[0.04] bg-white/[0.02]">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] font-600 text-white/30 uppercase tracking-wider mb-2">Event Details</p>
                                <div className="space-y-1.5">
                                  {event.policy_name && (
                                    <div className="flex gap-2"><span className="text-white/30 text-[11px] w-28 shrink-0">Policy:</span><span className="text-white/70 text-[11px] font-mono">{event.policy_name}</span></div>
                                  )}
                                  {event.resource_id && (
                                    <div className="flex gap-2"><span className="text-white/30 text-[11px] w-28 shrink-0">Resource ID:</span><span className="text-white/70 text-[11px] font-mono">{event.resource_id}</span></div>
                                  )}
                                  {event.resolved_by && (
                                    <div className="flex gap-2"><span className="text-white/30 text-[11px] w-28 shrink-0">Resolved by:</span><span className="text-white/70 text-[11px]">{event.resolved_by}</span></div>
                                  )}
                                </div>
                              </div>
                              {event.details && (
                                <div>
                                  <p className="text-[10px] font-600 text-white/30 uppercase tracking-wider mb-2">Context Data</p>
                                  <div className="bg-black/20 rounded-lg p-3 font-mono text-[11px] text-white/60 space-y-1">
                                    {Object.entries(event.details).map(([k, v]) => (
                                      <div key={k} className="flex gap-2">
                                        <span className="text-teal-400/70">{k}:</span>
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
                                  onClick={e => { e.stopPropagation(); handleResolve(event.id); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[12px] font-500 hover:bg-emerald-500/30 transition-colors"
                                >
                                  <CheckCircle2 size={13} /> Mark Resolved
                                </button>
                                <button
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-[12px] font-500 hover:bg-red-500/30 transition-colors"
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
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-white/30 text-[13px]">No events match the current filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RLS Policy Coverage */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-[13px] font-600 text-white/80 mb-4 flex items-center gap-2"><Shield size={14} className="text-teal-400" /> RLS Policy Coverage by Table</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {[
              { table: 'user_profiles', policies: 3, status: 'protected' },
              { table: 'candidates', policies: 4, status: 'protected' },
              { table: 'interviews', policies: 5, status: 'protected' },
              { table: 'questions', policies: 3, status: 'protected' },
              { table: 'responses', policies: 4, status: 'protected' },
              { table: 'job_offers', policies: 3, status: 'protected' },
              { table: 'audit_logs', policies: 2, status: 'protected' },
              { table: 'api_keys', policies: 2, status: 'protected' },
              { table: 'notifications', policies: 3, status: 'protected' },
              { table: 'recruiter_feedback', policies: 3, status: 'protected' },
              { table: 'rls_audit_events', policies: 1, status: 'protected' },
              { table: 'alert_thresholds', policies: 1, status: 'protected' },
            ].map(t => (
              <div key={t.table} className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-white/70 font-mono truncate">{t.table}</p>
                  <p className="text-[10px] text-white/30">{t.policies} policies</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
