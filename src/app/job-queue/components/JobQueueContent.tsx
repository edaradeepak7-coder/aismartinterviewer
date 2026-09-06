'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Play, RefreshCw, XCircle, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Zap, FileDown, BarChart2, Bell, CreditCard,
  Search, Filter, Loader2, Ban
} from 'lucide-react';

type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
type JobType = 'ai_evaluation' | 'bulk_export' | 'report_generation' | 'renewal_reminder' | 'overage_check' | 'payment_retry';

interface BackgroundJob {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: Record<string, any>;
  result: Record<string, any> | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  priority: number;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
  execution_log?: Array<{
    attempt: number;
    status: string;
    started_at: string;
    finished_at: string | null;
    duration_ms: number | null;
    error_message: string | null;
  }>;
}

const JOB_TYPE_META: Record<JobType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  ai_evaluation:     { label: 'AI Evaluation',      icon: <Zap size={14} />,       color: 'text-violet-400', bg: 'bg-violet-500/10' },
  bulk_export:       { label: 'Bulk Export',         icon: <FileDown size={14} />,  color: 'text-teal-400',   bg: 'bg-teal-500/10' },
  report_generation: { label: 'Report Generation',   icon: <BarChart2 size={14} />, color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  renewal_reminder:  { label: 'Renewal Reminder',    icon: <Bell size={14} />,      color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  overage_check:     { label: 'Overage Check',       icon: <AlertTriangle size={14} />, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  payment_retry:     { label: 'Payment Retry',       icon: <CreditCard size={14} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const STATUS_META: Record<JobStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'text-slate-400',   bg: 'bg-slate-400/10',   icon: <Clock size={12} /> },
  running:   { label: 'Running',   color: 'text-blue-400',    bg: 'bg-blue-400/10',    icon: <Loader2 size={12} className="animate-spin" /> },
  completed: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: <CheckCircle2 size={12} /> },
  failed:    { label: 'Failed',    color: 'text-red-400',     bg: 'bg-red-400/10',     icon: <XCircle size={12} /> },
  cancelled: { label: 'Cancelled', color: 'text-slate-500',   bg: 'bg-slate-500/10',   icon: <Ban size={12} /> },
  retrying:  { label: 'Retrying',  color: 'text-amber-400',   bg: 'bg-amber-400/10',   icon: <RefreshCw size={12} className="animate-spin" /> },
};

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  if (abs < 60000) return diff > 0 ? 'just now' : 'in a moment';
  if (abs < 3600000) return `${Math.round(abs / 60000)}m ${diff > 0 ? 'ago' : ''}`.trim();
  if (abs < 86400000) return `${Math.round(abs / 3600000)}h ${diff > 0 ? 'ago' : ''}`.trim();
  return `${Math.round(abs / 86400000)}d ${diff > 0 ? 'ago' : ''}`.trim();
}

function JobRow({ job, onCancel, onRetry }: {
  job: BackgroundJob;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeMeta = JOB_TYPE_META[job.type];
  const statusMeta = STATUS_META[job.status];

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-colors ${
      job.status === 'failed' ? 'border-red-400/20' :
      job.status === 'running'? 'border-blue-400/20' : 'border-border'
    }`}>
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Type icon */}
        <div className={`w-8 h-8 rounded-lg ${typeMeta.bg} flex items-center justify-center shrink-0 ${typeMeta.color}`}>
          {typeMeta.icon}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-600 text-foreground">{typeMeta.label}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-600 px-2 py-0.5 rounded-full border ${statusMeta.bg} ${statusMeta.color} border-current/20`}>
              {statusMeta.icon} {statusMeta.label}
            </span>
            {job.retry_count > 0 && (
              <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                Attempt {job.retry_count}/{job.max_retries}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Created {formatRelative(job.created_at)}</span>
            {job.started_at && (
              <span className="text-xs text-muted-foreground">Started {formatRelative(job.started_at)}</span>
            )}
            {job.completed_at && (
              <span className="text-xs text-emerald-400">Completed {formatRelative(job.completed_at)}</span>
            )}
            {job.next_retry_at && job.status === 'retrying' && (
              <span className="text-xs text-amber-400">Next retry {formatRelative(job.next_retry_at)}</span>
            )}
          </div>
        </div>

        {/* Priority badge */}
        <div className="text-[10px] text-muted-foreground bg-white/5 border border-border rounded px-2 py-0.5 shrink-0">
          P{job.priority}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(job.status === 'failed') && (
            <button
              onClick={() => onRetry(job.id)}
              className="text-xs text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
            >
              <RefreshCw size={11} /> Retry
            </button>
          )}
          {['pending', 'retrying'].includes(job.status) && (
            <button
              onClick={() => onCancel(job.id)}
              className="text-xs text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
            >
              <Ban size={11} /> Cancel
            </button>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {/* Payload */}
          <div>
            <div className="text-[10px] font-600 text-muted-foreground uppercase tracking-wider mb-1.5">Payload</div>
            <pre className="text-[11px] text-foreground/80 bg-white/[0.03] border border-border rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {job.result && (
            <div>
              <div className="text-[10px] font-600 text-emerald-400 uppercase tracking-wider mb-1.5">Result</div>
              <pre className="text-[11px] text-foreground/80 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(job.result, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {job.error_message && (
            <div>
              <div className="text-[10px] font-600 text-red-400 uppercase tracking-wider mb-1.5">Error</div>
              <div className="text-xs text-red-300 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                {job.error_message}
              </div>
            </div>
          )}

          {/* Execution log */}
          {job.execution_log && job.execution_log.length > 0 && (
            <div>
              <div className="text-[10px] font-600 text-muted-foreground uppercase tracking-wider mb-1.5">Execution Log</div>
              <div className="space-y-1.5">
                {job.execution_log.map((log, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs bg-white/[0.02] border border-border rounded-lg px-3 py-2">
                    <span className="text-muted-foreground">Attempt {log.attempt}</span>
                    <span className={STATUS_META[log.status as JobStatus]?.color || 'text-muted-foreground'}>
                      {log.status}
                    </span>
                    {log.duration_ms && <span className="text-muted-foreground">{log.duration_ms}ms</span>}
                    {log.error_message && <span className="text-red-400 truncate">{log.error_message}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job ID */}
          <div className="text-[10px] text-muted-foreground font-mono">ID: {job.id}</div>
        </div>
      )}
    </div>
  );
}

export default function JobQueueContent() {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | JobType>('all');
  const [search, setSearch] = useState('');
  const [enqueueType, setEnqueueType] = useState<JobType>('ai_evaluation');
  const [enqueuePayload, setEnqueuePayload] = useState('{\n  "interview_id": ""\n}');
  const [enqueueing, setEnqueueing] = useState(false);
  const [enqueueError, setEnqueueError] = useState<string | null>(null);
  const [enqueueSuccess, setEnqueueSuccess] = useState(false);

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await fetch(`/api/jobs/enqueue?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setJobs(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-refresh every 10s if any jobs are running/retrying
  useEffect(() => {
    const hasActive = jobs.some(j => ['running', 'retrying', 'pending'].includes(j.status));
    if (!hasActive) return;
    const interval = setInterval(() => fetchJobs(true), 10000);
    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

  const handleCancel = async (id: string) => {
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'cancelled' } : j));
  };

  const handleRetry = async (id: string) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    // Re-enqueue with same payload
    const res = await fetch('/api/jobs/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: job.type, payload: job.payload }),
    });
    if (res.ok) {
      const json = await res.json();
      setJobs(prev => [json.data, ...prev]);
    }
  };

  const handleEnqueue = async () => {
    setEnqueueing(true);
    setEnqueueError(null);
    setEnqueueSuccess(false);
    try {
      let payload: Record<string, any>;
      try {
        payload = JSON.parse(enqueuePayload);
      } catch {
        setEnqueueError('Invalid JSON payload');
        return;
      }
      const res = await fetch('/api/jobs/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: enqueueType, payload }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEnqueueError(json.error || 'Failed to enqueue job');
      } else {
        setEnqueueSuccess(true);
        setJobs(prev => [json.data, ...prev]);
        setTimeout(() => setEnqueueSuccess(false), 3000);
      }
    } finally {
      setEnqueueing(false);
    }
  };

  const filtered = jobs.filter(j => {
    if (search) {
      const q = search.toLowerCase();
      if (!j.type.includes(q) && !j.id.includes(q) && !JSON.stringify(j.payload).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    pending: jobs.filter(j => j.status === 'pending').length,
    running: jobs.filter(j => j.status === 'running').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    retrying: jobs.filter(j => j.status === 'retrying').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
  };

  const PAYLOAD_TEMPLATES: Record<JobType, string> = {
    ai_evaluation:     '{\n  "interview_id": ""\n}',
    bulk_export:       '{\n  "export_type": "candidates",\n  "format": "csv",\n  "filters": {}\n}',
    report_generation: '{\n  "report_type": "platform_summary",\n  "date_from": "",\n  "date_to": ""\n}',
    renewal_reminder:  '{\n  "subscription_id": "",\n  "days_until_renewal": 7\n}',
    overage_check:     '{\n  "tenant_id": ""\n}',
    payment_retry:     '{\n  "subscription_id": "",\n  "original_order_id": "",\n  "attempt": 1\n}',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-700 text-foreground">Background Job Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Long-running tasks — AI evaluations, bulk exports, reports, reminders, overage checks, payment retries
          </p>
        </div>
        <button
          onClick={() => fetchJobs(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm bg-white/5 border border-border text-foreground px-4 py-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {(Object.entries(counts) as [JobStatus, number][]).map(([status, count]) => {
          const meta = STATUS_META[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`bg-card border rounded-xl p-3 text-center transition-colors ${statusFilter === status ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-border/80'}`}
            >
              <div className={`text-xl font-700 ${meta.color}`}>{count}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 capitalize">{status}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Job List */}
        <div className="xl:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by type, ID, or payload..."
                className="w-full bg-white/5 border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-muted-foreground shrink-0" />
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="bg-white/5 border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Types</option>
                {Object.entries(JOB_TYPE_META).map(([type, meta]) => (
                  <option key={type} value={type}>{meta.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Jobs */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Play size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-600 text-foreground mb-1">No jobs found</p>
              <p className="text-xs text-muted-foreground">Enqueue a job using the panel on the right</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(job => (
                <JobRow key={job.id} job={job} onCancel={handleCancel} onRetry={handleRetry} />
              ))}
            </div>
          )}
        </div>

        {/* Enqueue Panel */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-700 text-foreground">Enqueue Job</h2>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Job Type</label>
              <select
                value={enqueueType}
                onChange={e => {
                  const t = e.target.value as JobType;
                  setEnqueueType(t);
                  setEnqueuePayload(PAYLOAD_TEMPLATES[t]);
                }}
                className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                {Object.entries(JOB_TYPE_META).map(([type, meta]) => (
                  <option key={type} value={type}>{meta.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Payload (JSON)</label>
              <textarea
                value={enqueuePayload}
                onChange={e => setEnqueuePayload(e.target.value)}
                rows={6}
                className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>

            {enqueueError && (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {enqueueError}
              </div>
            )}
            {enqueueSuccess && (
              <div className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Job enqueued successfully
              </div>
            )}

            <button
              onClick={handleEnqueue}
              disabled={enqueueing}
              className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-600 hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {enqueueing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {enqueueing ? 'Enqueueing…' : 'Enqueue Job'}
            </button>
          </div>

          {/* Job type guide */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-700 text-foreground">Job Types</h3>
            {Object.entries(JOB_TYPE_META).map(([type, meta]) => (
              <div key={type} className="flex items-start gap-2.5">
                <div className={`w-6 h-6 rounded-md ${meta.bg} flex items-center justify-center shrink-0 ${meta.color} mt-0.5`}>
                  {meta.icon}
                </div>
                <div>
                  <div className="text-xs font-600 text-foreground">{meta.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {type === 'ai_evaluation' && 'Runs OpenAI evaluation on completed interviews'}
                    {type === 'bulk_export' && 'Exports large datasets without timeout risk'}
                    {type === 'report_generation' && 'Compiles platform analytics reports'}
                    {type === 'renewal_reminder' && 'Sends subscription renewal reminder emails'}
                    {type === 'overage_check' && 'Checks credit balance and flags overages'}
                    {type === 'payment_retry' && 'Retries failed payments with exponential backoff'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
