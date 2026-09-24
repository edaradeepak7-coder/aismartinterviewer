'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Lock, Unlock, ChevronDown, ChevronUp, Clock, Search, X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

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

function RetryModal({ item, onClose, onConfirm, busy }: { item: DLQItem; onClose: () => void; onConfirm: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D1B3E] border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-600 text-foreground">Retry Job</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg px-4 py-3">
            <div className="text-xs font-600 text-amber-400 mb-1">Retry Context</div>
            <div className="text-xs text-muted-foreground">Re-enqueue <span className="text-foreground font-500">{item.workflowName}</span> as a new background job.</div>
          </div>
          <div className="bg-white/[0.03] border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground">
            <span className="text-foreground font-500">Error: </span>{item.errorCode} — {item.errorMessage}
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button disabled={busy} onClick={onConfirm} className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-500 hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Retry Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeadLetterQueueContent() {
  const [items, setItems] = useState<DLQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryTarget, setRetryTarget] = useState<DLQItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | DLQStatus>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dead-letter-queue');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load DLQ');
      setItems(json.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const postAction = async (id: string, action: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/dead-letter-queue', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Action failed');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
      setRetryTarget(null);
    }
  };

  const filtered = items.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (search && !i.workflowName.toLowerCase().includes(search.toLowerCase()) && !i.errorCode.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const failCount = items.filter(i => i.status === 'failed').length;
  const quarantineCount = items.filter(i => i.status === 'quarantined').length;
  const resolvedCount = items.filter(i => i.status === 'resolved').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-700 text-foreground">Dead-Letter Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Failed background jobs — retry, quarantine, or purge</p>
        </div>
        <div className="flex items-center gap-2">
          {failCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-3 py-1">
              <AlertTriangle size={11} /> {failCount} failed
            </span>
          )}
          <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Failed', count: failCount, color: 'text-red-400' },
          { label: 'Quarantined', count: quarantineCount, color: 'text-amber-400' },
          { label: 'Retrying', count: items.filter(i => i.status === 'retrying').length, color: 'text-blue-400' },
          { label: 'Resolved', count: resolvedCount, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`text-2xl font-700 ${s.color}`}>{loading ? '—' : s.count}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by job type or error code..." className="w-full bg-white/5 border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'failed', 'quarantined', 'retrying', 'resolved'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors capitalize ${statusFilter === s ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/[0.03] border-border text-muted-foreground hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
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
                    <span className="text-xs">{item.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {item.status === 'failed' && (
                    <button onClick={() => setRetryTarget(item)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                      <RefreshCw size={11} /> Retry
                    </button>
                  )}
                  {item.status === 'failed' && (
                    <button onClick={() => postAction(item.id, 'quarantine')} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-lg hover:bg-amber-400/20 transition-colors">
                      <Lock size={11} /> Quarantine
                    </button>
                  )}
                  {item.status === 'quarantined' && (
                    <button onClick={() => postAction(item.id, 'release')} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white/5 border border-border text-muted-foreground rounded-lg hover:text-foreground transition-colors">
                      <Unlock size={11} /> Release
                    </button>
                  )}
                  {item.status !== 'resolved' && (
                    <button onClick={() => postAction(item.id, 'purge')} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-400/10 border border-red-400/20 text-red-400 rounded-lg hover:bg-red-400/20 transition-colors">
                      <Trash2 size={11} /> Purge
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
                      <div className="text-xs font-600 text-foreground mb-2">Payload Context</div>
                      <div className="bg-white/[0.03] border border-border rounded-lg px-3 py-3 space-y-1.5">
                        {Object.keys(item.context).length === 0 ? (
                          <div className="text-xs text-muted-foreground">No payload fields</div>
                        ) : (
                          Object.entries(item.context).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs gap-2">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="text-foreground font-mono font-500 truncate max-w-[200px]">{v}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              No items in the dead-letter queue
            </div>
          )}
        </div>
      )}

      {retryTarget && (
        <RetryModal item={retryTarget} onClose={() => setRetryTarget(null)} onConfirm={() => postAction(retryTarget.id, 'retry')} busy={busy} />
      )}
    </div>
  );
}
