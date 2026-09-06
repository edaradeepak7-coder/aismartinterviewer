'use client';
import React, { useState } from 'react';
import { Calendar, Clock, Play, Pause, Plus, Trash2, ChevronDown, ChevronUp, Shield, Users, GraduationCap, Briefcase, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react';

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
  category: 'leaderboard' | 'digest' | 'certificate' | 'cleanup' | 'report';
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

const categoryColors: Record<WorkflowJob['category'], string> = {
  leaderboard: 'bg-amber-400/10 text-amber-400',
  digest: 'bg-blue-400/10 text-blue-400',
  certificate: 'bg-emerald-400/10 text-emerald-400',
  cleanup: 'bg-slate-400/10 text-slate-400',
  report: 'bg-purple-400/10 text-purple-400',
};

const initialJobs: WorkflowJob[] = [
  {
    id: 'daily-leaderboard',
    name: 'Daily Leaderboard Update',
    description: 'Recalculates all candidate scores, updates rankings, dispatches leaderboard milestone notifications, and refreshes achievement badges.',
    cron: '0 0 * * *',
    cronLabel: 'Every day at midnight',
    status: 'active',
    lastRun: '2h ago',
    nextRun: 'in 22h',
    runCount: 142,
    failCount: 1,
    avgDurationMs: 3200,
    category: 'leaderboard',
    hooks: [
      { role: 'admin', action: 'Trigger score recalculation for all candidates', enabled: true },
      { role: 'candidate', action: 'Send milestone notification if rank improved', enabled: true },
      { role: 'institution_admin', action: 'Update institution-level leaderboard view', enabled: true },
    ],
  },
  {
    id: 'weekly-digest',
    name: 'Weekly Digest Emails',
    description: 'Sends personalized weekly progress digests to all active candidates and summary reports to institution admins and recruiters.',
    cron: '0 8 * * 1',
    cronLabel: 'Every Monday at 8:00 AM',
    status: 'active',
    lastRun: '3 days ago',
    nextRun: 'in 4 days',
    runCount: 28,
    failCount: 0,
    avgDurationMs: 8400,
    category: 'digest',
    hooks: [
      { role: 'admin', action: 'Generate platform-wide digest report', enabled: true },
      { role: 'institution_admin', action: 'Send institution performance summary', enabled: true },
      { role: 'recruiter', action: 'Send candidate pipeline weekly update', enabled: true },
      { role: 'candidate', action: 'Send personal progress digest email', enabled: true },
    ],
  },
  {
    id: 'monthly-certificates',
    name: 'Monthly Certificate Issuance',
    description: 'Evaluates all candidates who completed required courses and assessments, issues certificates, and notifies institutions of new completions.',
    cron: '0 9 1 * *',
    cronLabel: '1st of every month at 9:00 AM',
    status: 'active',
    lastRun: '6 days ago',
    nextRun: 'in 24 days',
    runCount: 8,
    failCount: 0,
    avgDurationMs: 12600,
    category: 'certificate',
    hooks: [
      { role: 'admin', action: 'Evaluate eligibility for all pending candidates', enabled: true },
      { role: 'institution_admin', action: 'Notify institution of new certificates issued', enabled: true },
      { role: 'candidate', action: 'Send certificate with download link', enabled: true },
    ],
  },
  {
    id: 'weekly-report',
    name: 'Weekly Analytics Report',
    description: 'Compiles platform KPIs, interview success rates, and assessment completion trends into a weekly report for super admins.',
    cron: '0 7 * * 5',
    cronLabel: 'Every Friday at 7:00 AM',
    status: 'paused',
    lastRun: '10 days ago',
    nextRun: 'Paused',
    runCount: 15,
    failCount: 2,
    avgDurationMs: 5800,
    category: 'report',
    hooks: [
      { role: 'admin', action: 'Generate and email weekly KPI report', enabled: true },
    ],
  },
  {
    id: 'daily-cleanup',
    name: 'Daily Session Cleanup',
    description: 'Purges expired sessions, clears stale draft interviews, and archives completed workflow logs older than 30 days.',
    cron: '0 3 * * *',
    cronLabel: 'Every day at 3:00 AM',
    status: 'active',
    lastRun: '5h ago',
    nextRun: 'in 19h',
    runCount: 98,
    failCount: 0,
    avgDurationMs: 1100,
    category: 'cleanup',
    hooks: [
      { role: 'admin', action: 'Purge expired sessions and stale data', enabled: true },
    ],
  },
];

function StatusDot({ status }: { status: WorkflowStatus }) {
  const map = { active: 'bg-emerald-400', paused: 'bg-amber-400', error: 'bg-red-400' };
  return <span className={`w-2 h-2 rounded-full ${map[status]} ${status === 'active' ? 'animate-pulse' : ''}`} />;
}

interface CreateModalProps {
  onClose: () => void;
  onSave: (job: WorkflowJob) => void;
}

function CreateModal({ onClose, onSave }: CreateModalProps) {
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
          <h3 className="text-sm font-600 text-foreground">Create Workflow</h3>
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
            onClick={() => {
              if (!name.trim()) return;
              onSave({ id: `job-${Date.now()}`, name, description: desc, cron, cronLabel, status: 'active', lastRun: 'Never', nextRun: 'Scheduled', runCount: 0, failCount: 0, avgDurationMs: 0, category: 'report', hooks: [] });
              onClose();
            }}
            className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-500 hover:bg-primary/90 transition-colors"
          >
            Create Workflow
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowSchedulerContent() {
  const [jobs, setJobs] = useState<WorkflowJob[]>(initialJobs);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | WorkflowStatus>('all');

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  const toggleStatus = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: j.status === 'active' ? 'paused' : 'active' } : j));
  };

  const deleteJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const toggleHook = (jobId: string, hookIdx: number) => {
    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      hooks: j.hooks.map((h, i) => i === hookIdx ? { ...h, enabled: !h.enabled } : h),
    } : j));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-700 text-foreground">Workflow Scheduler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Recurring workflows with cron-like triggers and role-scoped execution hooks</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          <Plus size={15} /> New Workflow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active', count: jobs.filter(j => j.status === 'active').length, color: 'text-emerald-400' },
          { label: 'Paused', count: jobs.filter(j => j.status === 'paused').length, color: 'text-amber-400' },
          { label: 'Total Runs', count: jobs.reduce((s, j) => s + j.runCount, 0), color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`text-2xl font-700 ${s.color}`}>{s.count}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        {(['all', 'active', 'paused', 'error'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors capitalize ${filter === f ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/[0.03] border-border text-muted-foreground hover:text-foreground'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {filtered.map(job => (
          <div key={job.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5">
                <StatusDot status={job.status} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-600 text-foreground">{job.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-600 capitalize ${categoryColors[job.category]}`}>{job.category}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{job.description}</p>
                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock size={11} /> {job.cronLabel}</span>
                  <span className="flex items-center gap-1"><RefreshCw size={11} /> Last: {job.lastRun}</span>
                  <span className="flex items-center gap-1"><Calendar size={11} /> Next: {job.nextRun}</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle size={11} className="text-emerald-400" /> {job.runCount} runs
                  </span>
                  {job.failCount > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertCircle size={11} /> {job.failCount} fails
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggleStatus(job.id)} className={`p-1.5 rounded-lg border transition-colors ${job.status === 'active' ? 'border-amber-400/20 text-amber-400 hover:bg-amber-400/10' : 'border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/10'}`}>
                  {job.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button onClick={() => deleteJob(job.id)} className="p-1.5 rounded-lg border border-red-400/20 text-red-400 hover:bg-red-400/10 transition-colors">
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
                  <span className="text-xs text-muted-foreground ml-2">{job.cronLabel}</span>
                </div>
                <div className="mb-3">
                  <div className="text-xs font-600 text-foreground mb-2">Role-Scoped Execution Hooks</div>
                  <div className="space-y-2">
                    {job.hooks.map((hook, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white/[0.02] border border-border/50 rounded-lg px-3 py-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-600 ${roleColors[hook.role]}`}>
                          {roleIcons[hook.role]} {hook.role.replace('_', ' ')}
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
                    {job.hooks.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-3">No hooks configured</div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Avg Duration</div>
                    <div className="text-sm font-600 text-foreground">{(job.avgDurationMs / 1000).toFixed(1)}s</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                    <div className="text-sm font-600 text-emerald-400">
                      {job.runCount > 0 ? (((job.runCount - job.failCount) / job.runCount) * 100).toFixed(1) : 100}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSave={job => setJobs(prev => [...prev, job])} />}
    </div>
  );
}
