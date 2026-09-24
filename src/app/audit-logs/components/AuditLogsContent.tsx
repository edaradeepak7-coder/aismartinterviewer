'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight, Shield, LogIn, LogOut, AlertTriangle, UserCog, Database, Eye, CheckCircle2, XCircle, Ban, Clock, ChevronDown, X, Plus, Edit2, Trash2, Upload, BookOpen, Mic, Key, Users, GitBranch, ArrowRight, ChevronUp } from 'lucide-react';

type AuditAction =
  | 'login' | 'logout' | 'login_failed' | 'login_locked' | 'mfa_verified'
  | 'mfa_failed'| 'mfa_enrolled' | 'mfa_unenrolled' | 'session_revoked' | 'role_changed' |'data_accessed' | 'data_created' | 'data_updated' | 'data_deleted' | 'api_call'
  | 'export' | 'suspicious_activity' | 'password_reset' | 'email_verified'
  | 'content_uploaded'| 'course_published' | 'course_unpublished' | 'user_edited' |'interview_scheduled'| 'credentials_changed' | 'question_created' | 'question_updated' |'question_deleted' | 'bulk_import' | 'bulk_delete' | 'permission_changed';

type Outcome = 'success' | 'failure' | 'blocked';

interface ChangeDiff {
  field: string;
  before: string;
  after: string;
}

interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  action: AuditAction;
  resource?: string;
  resource_id?: string;
  resource_label?: string;
  ip_address?: string;
  user_agent?: string;
  outcome: Outcome;
  details?: Record<string, unknown>;
  change_diffs?: ChangeDiff[];
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn size={13} className="text-success" />,
  logout: <LogOut size={13} className="text-muted-foreground" />,
  login_failed: <XCircle size={13} className="text-danger" />,
  login_locked: <Ban size={13} className="text-danger" />,
  mfa_verified: <Shield size={13} className="text-primary" />,
  mfa_failed: <AlertTriangle size={13} className="text-warning" />,
  mfa_enrolled: <Shield size={13} className="text-success" />,
  mfa_unenrolled: <Shield size={13} className="text-warning" />,
  session_revoked: <Ban size={13} className="text-danger" />,
  role_changed: <UserCog size={13} className="text-warning" />,
  data_accessed: <Eye size={13} className="text-primary" />,
  data_created: <Database size={13} className="text-success" />,
  data_updated: <Database size={13} className="text-warning" />,
  data_deleted: <Database size={13} className="text-danger" />,
  suspicious_activity: <AlertTriangle size={13} className="text-danger" />,
  export: <Download size={13} className="text-primary" />,
  content_uploaded: <Upload size={13} className="text-blue-500" />,
  course_published: <BookOpen size={13} className="text-emerald-500" />,
  course_unpublished: <BookOpen size={13} className="text-amber-500" />,
  user_edited: <Users size={13} className="text-violet-500" />,
  interview_scheduled: <Mic size={13} className="text-teal-500" />,
  credentials_changed: <Key size={13} className="text-red-500" />,
  question_created: <Plus size={13} className="text-emerald-500" />,
  question_updated: <Edit2 size={13} className="text-amber-500" />,
  question_deleted: <Trash2 size={13} className="text-red-500" />,
  bulk_import: <Upload size={13} className="text-blue-500" />,
  bulk_delete: <Trash2 size={13} className="text-red-500" />,
  permission_changed: <Shield size={13} className="text-violet-500" />,
};

const ACTION_CATEGORIES: Record<string, string[]> = {
  'Authentication': ['login', 'logout', 'login_failed', 'login_locked', 'mfa_verified', 'mfa_failed', 'mfa_enrolled', 'mfa_unenrolled', 'session_revoked', 'password_reset', 'email_verified'],
  'User Management': ['role_changed', 'user_edited', 'permission_changed', 'credentials_changed'],
  'Content': ['content_uploaded', 'course_published', 'course_unpublished', 'data_created', 'data_updated', 'data_deleted'],
  'Questions': ['question_created', 'question_updated', 'question_deleted', 'bulk_import', 'bulk_delete'],
  'Interviews': ['interview_scheduled'],
  'Data Access': ['data_accessed', 'api_call', 'export'],
  'Security': ['suspicious_activity'],
};

const OUTCOME_STYLES: Record<Outcome, string> = {
  success: 'bg-success/10 text-success border-success/20',
  failure: 'bg-danger/10 text-danger border-danger/20',
  blocked: 'bg-warning/10 text-warning border-warning/20',
};

function mapApiLog(row: Record<string, unknown>): AuditLog {
  const details = (row.details && typeof row.details === 'object' ? row.details : {}) as Record<string, unknown>;
  const resourceLabel =
    (typeof row.resource_label === 'string' && row.resource_label) ||
    (typeof details.resource_label === 'string' && details.resource_label) ||
    (typeof details.label === 'string' && details.label) ||
    (typeof details.title === 'string' && details.title) ||
    undefined;
  const changeDiffsRaw = row.change_diffs ?? details.change_diffs ?? details.diffs;
  const change_diffs = Array.isArray(changeDiffsRaw) ? (changeDiffsRaw as ChangeDiff[]) : undefined;

  return {
    id: String(row.id ?? ''),
    user_id: typeof row.user_id === 'string' ? row.user_id : undefined,
    user_email: typeof row.user_email === 'string' ? row.user_email : undefined,
    user_role: typeof row.user_role === 'string' ? row.user_role : undefined,
    action: row.action as AuditAction,
    resource: typeof row.resource === 'string' ? row.resource : undefined,
    resource_id: typeof row.resource_id === 'string' ? row.resource_id : undefined,
    resource_label: resourceLabel,
    ip_address: typeof row.ip_address === 'string' ? row.ip_address : undefined,
    user_agent: typeof row.user_agent === 'string' ? row.user_agent : undefined,
    outcome: (row.outcome as Outcome) || 'success',
    details,
    change_diffs,
    created_at: String(row.created_at ?? ''),
  };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function ActionLabel({ action }: { action: AuditAction }) {
  const label = action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className="flex items-center gap-1.5">
      {ACTION_ICONS[action] ?? <Shield size={13} className="text-muted-foreground" />}
      <span className="text-xs font-medium text-foreground">{label}</span>
    </span>
  );
}

function ChangeDiffPanel({ diffs }: { diffs: ChangeDiff[] }) {
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">Change Diff</p>
      {diffs.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs bg-muted/40 rounded-lg px-3 py-2">
          <span className="font-600 text-foreground min-w-[120px]">{d.field}</span>
          <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded font-mono truncate max-w-[120px]">{d.before}</span>
          <ArrowRight size={11} className="text-muted-foreground shrink-0" />
          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono truncate max-w-[120px]">{d.after}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuditLogsContent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const LIMIT = 10;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: '1', limit: '200' });
      if (actionFilter) params.set('action', actionFilter);
      if (outcomeFilter) params.set('outcome', outcomeFilter);
      if (fromDate) params.set('from', new Date(fromDate).toISOString());
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        params.set('to', end.toISOString());
      }
      const res = await fetch(`/api/audit-logs?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to load audit logs');
      }
      const rows = Array.isArray(data.logs) ? data.logs : [];
      setLogs(rows.map((r: Record<string, unknown>) => mapApiLog(r)));
    } catch (err: unknown) {
      setLogs([]);
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, outcomeFilter, fromDate, toDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const categoryActions = categoryFilter ? ACTION_CATEGORIES[categoryFilter] ?? [] : [];

  const filtered = logs.filter(l => {
    if (search) {
      const q = search.toLowerCase();
      if (!(l.user_email?.toLowerCase().includes(q) || l.ip_address?.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.resource?.toLowerCase().includes(q) || l.user_role?.toLowerCase().includes(q) || l.resource_label?.toLowerCase().includes(q))) return false;
    }
    if (categoryFilter && !categoryActions.includes(l.action)) return false;
    if (actionFilter && l.action !== actionFilter) return false;
    if (outcomeFilter && l.outcome !== outcomeFilter) return false;
    if (roleFilter && l.user_role !== roleFilter) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);
  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));

  function exportCSV() {
    const headers = ['Timestamp', 'User Email', 'Role', 'Action', 'Resource', 'Resource Label', 'IP Address', 'Outcome', 'Change Diffs', 'Details'];
    const rows = filtered.map(l => [
      formatDate(l.created_at), l.user_email ?? '', l.user_role ?? '', l.action,
      l.resource ?? '', l.resource_label ?? '', l.ip_address ?? '', l.outcome,
      l.change_diffs ? l.change_diffs.map(d => `${d.field}: ${d.before} → ${d.after}`).join(' | ') : '',
      JSON.stringify(l.details ?? {}),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setCategoryFilter(''); setActionFilter(''); setOutcomeFilter('');
    setRoleFilter(''); setFromDate(''); setToDate(''); setSearch(''); setPage(1);
  }

  const hasActiveFilters = categoryFilter || actionFilter || outcomeFilter || roleFilter || fromDate || toDate;

  const crudStats = {
    creates: filtered.filter(l => ['data_created', 'content_uploaded', 'course_published', 'question_created', 'bulk_import'].includes(l.action)).length,
    updates: filtered.filter(l => ['data_updated', 'user_edited', 'question_updated', 'permission_changed', 'credentials_changed', 'role_changed'].includes(l.action)).length,
    deletes: filtered.filter(l => ['data_deleted', 'question_deleted', 'bulk_delete', 'course_unpublished'].includes(l.action)).length,
    reads: filtered.filter(l => ['data_accessed', 'api_call', 'export'].includes(l.action)).length,
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-700 text-foreground">Security Audit Trail</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete CRUD operation trail — content uploads, user edits, course publishes, interview scheduling, credential changes — with role, timestamp, and change diffs
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button onClick={fetchLogs} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Total', value: filtered.length, icon: <Shield size={14} />, bg: 'bg-primary/10', color: 'text-primary' },
            { label: 'Success', value: filtered.filter(l => l.outcome === 'success').length, icon: <CheckCircle2 size={14} />, bg: 'bg-success/10', color: 'text-success' },
            { label: 'Failures', value: filtered.filter(l => l.outcome === 'failure').length, icon: <XCircle size={14} />, bg: 'bg-danger/10', color: 'text-danger' },
            { label: 'Blocked', value: filtered.filter(l => l.outcome === 'blocked').length, icon: <Ban size={14} />, bg: 'bg-warning/10', color: 'text-warning' },
            { label: 'Creates', value: crudStats.creates, icon: <Plus size={14} />, bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { label: 'Updates', value: crudStats.updates, icon: <Edit2 size={14} />, bg: 'bg-amber-50', color: 'text-amber-600' },
            { label: 'Deletes', value: crudStats.deletes, icon: <Trash2 size={14} />, bg: 'bg-red-50', color: 'text-red-600' },
            { label: 'Reads', value: crudStats.reads, icon: <Eye size={14} />, bg: 'bg-blue-50', color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center ${s.color} shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-base font-700 text-foreground leading-tight">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-600">Failed to load audit logs</p>
              <p className="text-danger/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Search + Filter Bar */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search by email, IP, action, resource, role..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2.5 border rounded-lg text-sm transition-colors ${showFilters || hasActiveFilters ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
              <Filter size={14} /> Filters {hasActiveFilters && <span className="w-4 h-4 bg-primary text-primary-foreground rounded-full text-[9px] flex items-center justify-center font-700">!</span>}
              <ChevronDown size={12} className={showFilters ? 'rotate-180' : ''} />
            </button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <X size={12} /> Clear
              </button>
            )}
          </div>
          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-border">
              <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setActionFilter(''); setPage(1); }}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">All Categories</option>
                {Object.keys(ACTION_CATEGORIES).map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">All Actions</option>
                {(categoryFilter ? ACTION_CATEGORIES[categoryFilter] : Object.values(ACTION_CATEGORIES).flat()).map(a => (
                  <option key={a} value={a}>{a.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
              <select value={outcomeFilter} onChange={e => { setOutcomeFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">All Outcomes</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="blocked">Blocked</option>
              </select>
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="institution_admin">Institution Admin</option>
                <option value="org_admin">Org Admin</option>
                <option value="recruiter">Recruiter</option>
                <option value="candidate">Candidate</option>
                <option value="faculty">Faculty</option>
              </select>
              <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide w-10">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">User / Role</th>
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Outcome</th>
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Diffs</th>
                  <th className="px-4 py-3 text-right text-xs font-600 text-muted-foreground uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((log, idx) => (
                  <React.Fragment key={log.id}>
                    <tr className={`border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer ${expandedRow === log.id ? 'bg-muted/20' : ''}`}
                      onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-600">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                          <Clock size={11} /> {formatDate(log.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-500 text-foreground">{log.user_email ?? 'Unknown'}</p>
                        {log.user_role && <p className="text-[10px] text-muted-foreground capitalize">{log.user_role.replace(/_/g, ' ')}</p>}
                      </td>
                      <td className="px-4 py-3"><ActionLabel action={log.action} /></td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-foreground">{log.resource_label ?? log.resource ?? '—'}</p>
                        {log.resource_id && <p className="text-[10px] text-muted-foreground font-mono">{log.resource_id.slice(0, 12)}…</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.ip_address ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-600 border capitalize ${OUTCOME_STYLES[log.outcome]}`}>{log.outcome}</span>
                      </td>
                      <td className="px-4 py-3">
                        {log.change_diffs?.length ? (
                          <span className="flex items-center gap-1 text-xs text-primary font-500">
                            <GitBranch size={11} /> {log.change_diffs.length} field{log.change_diffs.length > 1 ? 's' : ''}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          {expandedRow === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                    {expandedRow === log.id && (
                      <tr className="border-b border-border/50 bg-muted/10">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div>
                                <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">Event Details</p>
                                <div className="space-y-1">
                                  {Object.entries(log.details).map(([k, v]) => (
                                    <div key={k} className="flex items-start gap-2 text-xs">
                                      <span className="font-600 text-foreground min-w-[120px] shrink-0">{k.replace(/_/g, ' ')}</span>
                                      <span className="text-muted-foreground font-mono">{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {log.change_diffs?.length ? (
                              <div><ChangeDiffPanel diffs={log.change_diffs} /></div>
                            ) : null}
                            {log.user_agent && (
                              <div className="md:col-span-2">
                                <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1">User Agent</p>
                                <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-3 py-2 rounded-lg">{log.user_agent}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">No audit logs match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min((page - 1) * LIMIT + 1, filtered.length)}–{Math.min(page * LIMIT, filtered.length)} of {filtered.length} events
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-muted-foreground px-2">Page {page} of {Math.max(1, totalPages)}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
