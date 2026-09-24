'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Play, Pause, Plus, Trash2, ChevronDown, ChevronUp, Shield, Users, GraduationCap, Briefcase, CheckCircle, AlertCircle, RefreshCw, X, Loader2 } from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

type WorkflowStatus = 'active' | 'paused' | 'error';
type ExecutionRole = 'admin' | 'institution_admin' | 'recruiter' | 'candidate';

interface WorkflowHook {
  role: ExecutionRole;
  action: string;
  enabled: boolean;
}

interface WorkflowJob {
  id: string;
  name: string;
  description: string;
  cron: string;
  cronLabel: string;
  status: WorkflowStatus;
  lastRun: string;
  nextRun: string;
  runCount: number;
  failCount: number;
  avgDurationMs: number;
  hooks: WorkflowHook[];
  category: string;
}

const roleIcons: Record<ExecutionRole, React.ReactNode> = {
  admin: <Shield size={12} />,
  institution_admin: <GraduationCap size={12} />,
  recruiter: <Briefcase size={12} />,
  candidate: <Users size={12} />,
};

const roleColors: Record<ExecutionRole, string> = {
  admin: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
  institution_admin: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
  recruiter: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  candidate: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
};

function StatusDot({ status }: { status: WorkflowStatus }) {
  const map = { active: 'bg-emerald-400', paused: 'bg-amber-400', error: 'bg-red-400' };
  return <span className={`w-2 h-2 rounded-full ${map[status]} ${status === 'active' ? 'animate-pulse' : ''}`} />;
}

function CreateModal({ onClose, onSave, busy }: { onClose: () => void; onSave: (p: { name: string; description: string; cron: string; cronLabel: string }) => void; busy: boolean }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [cron, setCron] = useState('0 0 * * *');
  const [cronLabel, setCronLabel] = useState('Every day at midnight');

  const presets = [
    { cron: '0 0 * * *', label: 'Every day at midnight' },
    { cron: '0 8 * * 1', label: 'Every Monday at 8:00 AM' },
    { cron: '0 9 1 * *', label: '1st of every month at 9:00 AM' },
    { cron: '0 7 * * 5', label: 'Every Friday at 7:00 AM' },
    { cron: '0 */6 * * *', label: 'Every 6 hours' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D1B3E] border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-600 text-foreground">Create Scheduled Workflow</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Workflow Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Score Sync" className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="What does this workflow do?" className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Schedule Preset</label>
            <div className="grid grid-cols-1 gap-1.5">
              {presets.map(p => (
                <button key={p.cron} onClick={() => { setCron(p.cron); setCronLabel(p.label); }} className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${cron === p.cron ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-white/[0.02] text-muted-foreground hover:text-foreground'}`}>
                  <span className="font-500">{p.label}</span>
                  <span className="ml-2 font-mono opacity-60">{p.cron}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button
            disabled={busy || !name.trim()}
            onClick={() => onSave({ name, description: desc, cron, cronLabel })}
            className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-500 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create Workflow'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowSchedulerContent() {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | WorkflowStatus>('all');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/workflow-scheduler');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setJobs(json.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  const toggleStatus = async (id: string, current: WorkflowStatus) => {
    setBusy(true);
    try {
      const res = await fetch('/api/workflow-scheduler', {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id, action: current === 'active' ? 'pause' : 'resume' }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Update failed');
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteJob = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/workflow-scheduler?id=${id}`, {
        method: 'DELETE',
        headers: csrfHeaders(),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Delete failed');
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const createJob = async (p: { name: string; description: string; cron: string; cronLabel: string }) => {
    setBusy(true);
    try {
      const res = await fetch('/api/workflow-scheduler', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(p),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Create failed');
      setShowCreate(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const toggleHook = async (jobId: string, hookIdx: number) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const hooks = job.hooks.map((h, i) => i === hookIdx ? { ...h, enabled: !h.enabled } : h);
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, hooks } : j));
    try {
      await fetch('/api/workflow-scheduler', {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: jobId, action: 'update', hooks }),
      });
    } catch {
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-700 text-foreground">Workflow Scheduler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Scheduled background jobs with cron metadata</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-sm border border-border px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            <Plus size={15} /> New Workflow
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active', count: jobs.filter(j => j.status === 'active').length, color: 'text-emerald-400' },
          { label: 'Paused', count: jobs.filter(j => j.status === 'paused').length, color: 'text-amber-400' },
          { label: 'Total Runs', count: jobs.reduce((s, j) => s + j.runCount, 0), color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`text-2xl font-700 ${s.color}`}>{loading ? '—' : s.count}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        {(['all', 'active', 'paused', 'error'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors capitalize ${filter === f ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/[0.03] border-border text-muted-foreground hover:text-foreground'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
          No scheduled workflows yet. Create one to enqueue a background job with a future scheduled_at.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => (
            <div key={job.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 flex items-start gap-3">
                <div className="mt-0.5"><StatusDot status={job.status} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-600 text-foreground">{job.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-600 capitalize bg-white/5 text-muted-foreground">{job.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{job.description || '—'}</p>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock size={11} /> {job.cronLabel}</span>
                    <span className="flex items-center gap-1"><RefreshCw size={11} /> Last: {job.lastRun}</span>
                    <span className="flex items-center gap-1"><Calendar size={11} /> Next: {job.nextRun}</span>
                    <span className="flex items-center gap-1"><CheckCircle size={11} className="text-emerald-400" /> {job.runCount} runs</span>
                    {job.failCount > 0 && (
                      <span className="flex items-center gap-1 text-red-400"><AlertCircle size={11} /> {job.failCount} fails</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button disabled={busy} onClick={() => toggleStatus(job.id, job.status)} className={`p-1.5 rounded-lg border transition-colors ${job.status === 'active' ? 'border-amber-400/20 text-amber-400 hover:bg-amber-400/10' : 'border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/10'}`}>
                    {job.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  <button disabled={busy} onClick={() => deleteJob(job.id)} className="p-1.5 rounded-lg border border-red-400/20 text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 size={13} />
                  </button>
                  <button onClick={() => setExpandedId(expandedId === job.id ? null : job.id)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                    {expandedId === job.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>

              {expandedId === job.id && (
                <div className="border-t border-border px-4 py-4 bg-white/[0.01]">
                  <div className="mb-3">
                    <div className="text-xs font-600 text-foreground mb-1">Cron Expression</div>
                    <code className="text-xs bg-white/5 border border-border rounded px-2 py-1 text-primary font-mono">{job.cron}</code>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs font-600 text-foreground mb-2">Role-Scoped Execution Hooks</div>
                    <div className="space-y-2">
                      {(job.hooks || []).map((hook, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white/[0.02] border border-border/50 rounded-lg px-3 py-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-600 ${roleColors[hook.role] || roleColors.admin}`}>
                            {roleIcons[hook.role] || <Shield size={12} />} {String(hook.role).replace('_', ' ')}
                          </span>
                          <span className="flex-1 text-xs text-muted-foreground">{hook.action}</span>
                          <button
                            onClick={() => toggleHook(job.id, idx)}
                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${hook.enabled ? 'bg-primary' : 'bg-white/10'}`}
                          >
                            <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${hook.enabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      ))}
                      {(!job.hooks || job.hooks.length === 0) && (
                        <div className="text-xs text-muted-foreground text-center py-3">No hooks configured</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSave={createJob} busy={busy} />}
    </div>
  );
}
