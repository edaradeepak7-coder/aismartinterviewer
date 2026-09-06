'use client';
import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Lock, Unlock, ChevronDown, ChevronUp, Clock, Search, RotateCcw, X, CheckCircle, XCircle } from 'lucide-react';

type DLQStatus = 'failed' | 'quarantined' | 'retrying' | 'resolved';

interface DLQItem {
  id: string;
  workflowName: string;
  type: string;
  status: DLQStatus;
  errorCode: string;
  errorMessage: string;
  failedAt: string;
  retryCount: number;
  maxRetries: number;
  triggeredBy: string;
  context: Record<string, string>;
  canRollback: boolean;
  rollbackDescription?: string;
}

const mockDLQ: DLQItem[] = [
  {
    id: 'dlq-001',
    workflowName: 'Weekly Digest Email',
    type: 'email',
    status: 'failed',
    errorCode: 'RESEND_RATE_LIMIT',
    errorMessage: 'Resend API rate limit exceeded: 429 Too Many Requests. Batch 7/12 failed after 3 retries.',
    failedAt: '08:14:32',
    retryCount: 3,
    maxRetries: 5,
    triggeredBy: 'Cron: 0 8 * * 1',
    context: { batchNumber: '7', totalBatches: '12', recipientsAffected: '312', lastAttempt: '08:14:30' },
    canRollback: false,
  },
  {
    id: 'dlq-002',
    workflowName: 'Monthly Certificate Issuance',
    type: 'certificate',
    status: 'quarantined',
    errorCode: 'DB_CONSTRAINT_VIOLATION',
    errorMessage: 'Duplicate certificate detected for user_id=usr_4821. Unique constraint violation on certificates table.',
    failedAt: '09:02:15',
    retryCount: 1,
    maxRetries: 3,
    triggeredBy: 'Cron: 0 9 1 * *',
    context: { userId: 'usr_4821', courseId: 'crs_react_101', certificateType: 'completion', attemptedAt: '09:02:14' },
    canRollback: true,
    rollbackDescription: 'Remove duplicate certificate entry and reset issuance flag for this candidate.',
  },
  {
    id: 'dlq-003',
    workflowName: 'Interview Scheduling',
    type: 'scheduling',
    status: 'failed',
    errorCode: 'SLOT_CONFLICT',
    errorMessage: 'Candidate already has a confirmed interview at the requested time slot. Auto-resolution failed: no adjacent slots available within 2h window.',
    failedAt: '11:45:08',
    retryCount: 2,
    maxRetries: 3,
    triggeredBy: 'Recruiter: Sarah Reeves (manual trigger)',
    context: { candidateId: 'usr_2291', requestedSlot: '15:00', conflictingBookingId: 'bk_8821', recruiterEmail: 'sarah@acme.com' },
    canRollback: false,
  },
  {
    id: 'dlq-004',
    workflowName: 'Achievement Trigger',
    type: 'achievement',
    status: 'quarantined',
    errorCode: 'SUSPICIOUS_SCORE_SPIKE',
    errorMessage: 'Score jumped from 42% to 98% in under 3 minutes. Flagged for manual review before badge issuance.',
    failedAt: '13:22:44',
    retryCount: 0,
    maxRetries: 0,
    triggeredBy: 'System: Score evaluation for usr_9912',
    context: { userId: 'usr_9912', previousScore: '42%', newScore: '98%', assessmentId: 'asmt_7721', flagReason: 'anomalous_velocity' },
    canRollback: false,
  },
  {
    id: 'dlq-005',
    workflowName: 'Enrollment Automation',
    type: 'enrollment',
    status: 'resolved',
    errorCode: 'EMAIL_DELIVERY_FAILED',
    errorMessage: 'Enrollment confirmation email bounced: invalid email address format.',
    failedAt: '10:30:00',
    retryCount: 2,
    maxRetries: 3,
    triggeredBy: 'Candidate: Jordan Callaway enrolled in Python Basics',
    context: { userId: 'usr_1102', email: 'jordan@invalid..com', courseId: 'crs_python_101', resolvedBy: 'admin@platform.com' },
    canRollback: false,
  },
];

const statusColors: Record<DLQStatus, string> = {
  failed: 'bg-red-400/10 text-red-400 border-red-400/20',
  quarantined: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  retrying: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  resolved: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
};

const statusIcons: Record<DLQStatus, React.ReactNode> = {
  failed: <XCircle size={14} className="text-red-400" />,
  quarantined: <Lock size={14} className="text-amber-400" />,
  retrying: <RefreshCw size={14} className="text-blue-400 animate-spin" />,
  resolved: <CheckCircle size={14} className="text-emerald-400" />,
};

interface RetryModalProps {
  item: DLQItem;
  onClose: () => void;
  onConfirm: () => void;
}

function RetryModal({ item, onClose, onConfirm }: RetryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D1B3E] border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-600 text-foreground">Retry Workflow</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg px-4 py-3">
            <div className="text-xs font-600 text-amber-400 mb-1">Retry Context</div>
            <div className="text-xs text-muted-foreground">Retrying <span className="text-foreground font-500">{item.workflowName}</span> — attempt {item.retryCount + 1} of {item.maxRetries}.</div>
          </div>
          <div className="space-y-2">
            {Object.entries(item.context).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="text-foreground font-500 font-mono">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-white/[0.03] border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground">
            <span className="text-foreground font-500">Error: </span>{item.errorCode} — {item.errorMessage}
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-500 hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
            <RefreshCw size={13} /> Retry Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeadLetterQueueContent() {
  const [items, setItems] = useState<DLQItem[]>(mockDLQ);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryTarget, setRetryTarget] = useState<DLQItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | DLQStatus>('all');
  const [search, setSearch] = useState('');

  const filtered = items.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (search && !i.workflowName.toLowerCase().includes(search.toLowerCase()) && !i.errorCode.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleRetry = (item: DLQItem) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'retrying', retryCount: i.retryCount + 1 } : i));
    setRetryTarget(null);
    setTimeout(() => {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'resolved' } : i));
    }, 2000);
  };

  const handleQuarantine = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'quarantined' } : i));
  };

  const handleUnquarantine = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'failed' } : i));
  };

  const handleRollback = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'resolved' } : i));
  };

  const handleDiscard = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const failCount = items.filter(i => i.status === 'failed').length;
  const quarantineCount = items.filter(i => i.status === 'quarantined').length;
  const resolvedCount = items.filter(i => i.status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-700 text-foreground">Dead-Letter Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Failed workflow runs — retry, rollback, or quarantine suspect executions</p>
        </div>
        <div className="flex items-center gap-2">
          {failCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-3 py-1">
              <AlertTriangle size={11} /> {failCount} failed
            </span>
          )}
          {quarantineCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1">
              <Lock size={11} /> {quarantineCount} quarantined
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Failed', count: failCount, color: 'text-red-400' },
          { label: 'Quarantined', count: quarantineCount, color: 'text-amber-400' },
          { label: 'Retrying', count: items.filter(i => i.status === 'retrying').length, color: 'text-blue-400' },
          { label: 'Resolved', count: resolvedCount, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`text-2xl font-700 ${s.color}`}>{s.count}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by workflow or error code..." className="w-full bg-white/5 border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'failed', 'quarantined', 'retrying', 'resolved'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors capitalize ${statusFilter === s ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/[0.03] border-border text-muted-foreground hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* DLQ Items */}
      <div className="space-y-3">
        {filtered.map(item => (
          <div key={item.id} className={`bg-card border rounded-xl overflow-hidden ${item.status === 'quarantined' ? 'border-amber-400/30' : item.status === 'failed' ? 'border-red-400/20' : 'border-border'}`}>
            <div className="px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5">{statusIcons[item.status]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-600 text-foreground">{item.workflowName}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-700 border ${statusColors[item.status]}`}>{item.status.toUpperCase()}</span>
                  <span className="text-[10px] font-mono bg-white/5 border border-border rounded px-1.5 py-0.5 text-muted-foreground">{item.errorCode}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{item.errorMessage}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Clock size={11} /> {item.failedAt}</span>
                  <span>Retries: {item.retryCount}/{item.maxRetries}</span>
                  <span className="text-xs">{item.triggeredBy}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                {item.status === 'failed' && item.retryCount < item.maxRetries && (
                  <button onClick={() => setRetryTarget(item)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                    <RefreshCw size={11} /> Retry
                  </button>
                )}
                {item.canRollback && item.status !== 'resolved' && (
                  <button onClick={() => handleRollback(item.id)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-violet-400/10 border border-violet-400/20 text-violet-400 rounded-lg hover:bg-violet-400/20 transition-colors">
                    <RotateCcw size={11} /> Rollback
                  </button>
                )}
                {item.status === 'failed' && (
                  <button onClick={() => handleQuarantine(item.id)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-lg hover:bg-amber-400/20 transition-colors">
                    <Lock size={11} /> Quarantine
                  </button>
                )}
                {item.status === 'quarantined' && (
                  <button onClick={() => handleUnquarantine(item.id)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white/5 border border-border text-muted-foreground rounded-lg hover:text-foreground transition-colors">
                    <Unlock size={11} /> Release
                  </button>
                )}
                {item.status !== 'resolved' && (
                  <button onClick={() => handleDiscard(item.id)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-400/10 border border-red-400/20 text-red-400 rounded-lg hover:bg-red-400/20 transition-colors">
                    <Trash2 size={11} /> Discard
                  </button>
                )}
                <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                  {expandedId === item.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
            </div>

            {expandedId === item.id && (
              <div className="border-t border-border px-4 py-4 bg-white/[0.01]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-600 text-foreground mb-2">Error Details</div>
                    <div className="bg-red-400/5 border border-red-400/10 rounded-lg px-3 py-3">
                      <div className="text-xs font-mono text-red-400 mb-1">{item.errorCode}</div>
                      <div className="text-xs text-muted-foreground">{item.errorMessage}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-600 text-foreground mb-2">Execution Context</div>
                    <div className="bg-white/[0.03] border border-border rounded-lg px-3 py-3 space-y-1.5">
                      {Object.entries(item.context).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                          <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-foreground font-mono font-500">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {item.canRollback && item.rollbackDescription && (
                  <div className="mt-3 bg-violet-400/5 border border-violet-400/20 rounded-lg px-3 py-2">
                    <div className="text-xs font-600 text-violet-400 mb-1">Rollback Available</div>
                    <div className="text-xs text-muted-foreground">{item.rollbackDescription}</div>
                  </div>
                )}
                {item.status === 'quarantined' && (
                  <div className="mt-3 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
                    <div className="text-xs font-600 text-amber-400 mb-1">Quarantine Notice</div>
                    <div className="text-xs text-muted-foreground">This run is quarantined pending manual investigation. No automatic retries will occur. Review the context above before releasing or discarding.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No items in the dead-letter queue</div>
        )}
      </div>

      {retryTarget && (
        <RetryModal item={retryTarget} onClose={() => setRetryTarget(null)} onConfirm={() => handleRetry(retryTarget)} />
      )}
    </div>
  );
}
