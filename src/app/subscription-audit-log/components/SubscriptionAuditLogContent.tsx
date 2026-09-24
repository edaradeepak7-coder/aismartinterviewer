'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Download, RefreshCw, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, PlusCircle, Receipt, CreditCard, Loader2, Clock, User, Globe, ChevronDown, ChevronUp, Shield, X } from 'lucide-react';

type EventType = 'upgrade' | 'downgrade' | 'credit_added' | 'invoice_generated' | 'payment' | 'cancellation' | 'renewal' | 'trial_started';

interface AuditEntry {
  id: string;
  occurred_at: string;
  event_type: EventType;
  actor_email: string;
  actor_role: string;
  target_user_email: string;
  target_user_id: string;
  ip_address: string | null;
  reason: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  amount_inr: number | null;
  plan_from: string | null;
  plan_to: string | null;
  credits_delta: number | null;
  invoice_number: string | null;
  payment_id: string | null;
  metadata: Record<string, unknown> | null;
}

const EVENT_CONFIG: Record<EventType, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  upgrade:           { label: 'Upgrade',           color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: <ArrowUpCircle size={13} className="text-emerald-600" /> },
  downgrade:         { label: 'Downgrade',         color: 'text-amber-700',   bg: 'bg-amber-50 dark:bg-amber-900/20',     icon: <ArrowDownCircle size={13} className="text-amber-600" /> },
  credit_added:      { label: 'Credits Added',     color: 'text-blue-700',    bg: 'bg-blue-50 dark:bg-blue-900/20',       icon: <PlusCircle size={13} className="text-blue-600" /> },
  invoice_generated: { label: 'Invoice Generated', color: 'text-violet-700',  bg: 'bg-violet-50 dark:bg-violet-900/20',   icon: <Receipt size={13} className="text-violet-600" /> },
  payment:           { label: 'Payment',           color: 'text-teal-700',    bg: 'bg-teal-50 dark:bg-teal-900/20',       icon: <CreditCard size={13} className="text-teal-600" /> },
  cancellation:      { label: 'Cancellation',      color: 'text-red-700',     bg: 'bg-red-50 dark:bg-red-900/20',         icon: <X size={13} className="text-red-600" /> },
  renewal:           { label: 'Renewal',           color: 'text-sky-700',     bg: 'bg-sky-50 dark:bg-sky-900/20',         icon: <RefreshCw size={13} className="text-sky-600" /> },
  trial_started:     { label: 'Trial Started',     color: 'text-indigo-700',  bg: 'bg-indigo-50 dark:bg-indigo-900/20',   icon: <Shield size={13} className="text-indigo-600" /> },
};

const ALL_EVENT_TYPES = Object.keys(EVENT_CONFIG) as EventType[];
const PAGE_SIZE = 20;

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function SubscriptionAuditLogContent() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<EventType | 'all'>('all');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('q', search);
      const res = await fetch(`/api/subscription-audit-log?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setEntries((json.data as AuditEntry[]) || []);
    } catch (e: unknown) {
      setEntries([]);
      setLoadError(e instanceof Error ? e.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const filtered = entries.filter(e => {
    const matchEvent = eventFilter === 'all' || e.event_type === eventFilter;
    const matchSearch = !search ||
      e.target_user_email.toLowerCase().includes(search.toLowerCase()) ||
      e.actor_email.toLowerCase().includes(search.toLowerCase()) ||
      (e.invoice_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.payment_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.reason || '').toLowerCase().includes(search.toLowerCase());
    return matchEvent && matchSearch;
  });

  const handleExportCsv = () => {
    const headers = [
      'id', 'occurred_at', 'event_type', 'actor_email', 'actor_role',
      'target_user_email', 'amount_inr', 'plan_from', 'plan_to', 'credits_delta',
      'invoice_number', 'payment_id', 'reason', 'ip_address',
    ];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      headers.join(','),
      ...filtered.map(e => headers.map(h => escape((e as Record<string, unknown>)[h])).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscription-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Event type counts
  const eventCounts = ALL_EVENT_TYPES.reduce<Record<string, number>>((acc, t) => {
    acc[t] = entries.filter(e => e.event_type === t).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText size={24} className="text-primary" />
            Subscription Audit Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable timestamped record of all subscription changes — for compliance and dispute resolution
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchEntries}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-muted-foreground'} />
            Refresh
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {loadError}
        </div>
      )}

      {/* Event type summary chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setEventFilter('all'); setPage(0); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            eventFilter === 'all' ?'bg-primary text-primary-foreground border-primary' :'border-border text-muted-foreground hover:bg-accent'
          }`}
        >
          All Events ({entries.length})
        </button>
        {ALL_EVENT_TYPES.map(t => {
          const cfg = EVENT_CONFIG[t];
          const count = eventCounts[t] || 0;
          if (count === 0) return null;
          return (
            <button
              key={t}
              onClick={() => { setEventFilter(t); setPage(0); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                eventFilter === t
                  ? `${cfg.bg} ${cfg.color} border-current`
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              {cfg.icon} {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by user, actor, invoice, payment ID, or reason…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{filtered.length} records</span>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-border rounded-xl">
          No audit entries match your filters.
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map(entry => {
            const cfg = EVENT_CONFIG[entry.event_type] || EVENT_CONFIG['payment'];
            const isExpanded = expandedId === entry.id;
            return (
              <div
                key={entry.id}
                className="border border-border rounded-xl overflow-hidden bg-card hover:border-primary/30 transition-colors"
              >
                {/* Main row */}
                <div
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  {/* Event badge */}
                  <div className={`mt-0.5 shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                    {cfg.icon}
                    <span className="hidden sm:inline">{cfg.label}</span>
                  </div>

                  {/* Core info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-sm font-medium text-foreground truncate">{entry.target_user_email}</span>
                      {entry.plan_from && entry.plan_to && (
                        <span className="text-xs text-muted-foreground">
                          <span className="capitalize">{entry.plan_from}</span>
                          {' → '}
                          <span className="capitalize font-medium text-foreground">{entry.plan_to}</span>
                        </span>
                      )}
                      {entry.amount_inr != null && (
                        <span className="text-xs font-semibold text-emerald-700">
                          ₹{entry.amount_inr.toLocaleString('en-IN')}
                        </span>
                      )}
                      {entry.credits_delta != null && (
                        <span className="text-xs font-semibold text-blue-700">
                          +{entry.credits_delta} credits
                        </span>
                      )}
                      {entry.invoice_number && (
                        <span className="text-xs text-muted-foreground font-mono">{entry.invoice_number}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={10} /> {fmtDate(entry.occurred_at)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User size={10} /> {entry.actor_email}
                        <span className="text-xs px-1 py-0 rounded bg-muted capitalize">{entry.actor_role}</span>
                      </span>
                      {entry.ip_address && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe size={10} /> {entry.ip_address}
                        </span>
                      )}
                    </div>
                    {entry.reason && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{entry.reason}</p>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <div className="shrink-0 text-muted-foreground mt-1">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground font-medium uppercase tracking-wide mb-1">Event Details</p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Entry ID</span>
                            <span className="font-mono text-foreground">{entry.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Event Type</span>
                            <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          {entry.invoice_number && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Invoice</span>
                              <span className="font-mono text-foreground">{entry.invoice_number}</span>
                            </div>
                          )}
                          {entry.payment_id && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Payment ID</span>
                              <span className="font-mono text-foreground">{entry.payment_id}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium uppercase tracking-wide mb-1">Actor & Target</p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Actor</span>
                            <span className="text-foreground">{entry.actor_email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Role</span>
                            <span className="capitalize text-foreground">{entry.actor_role}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Target User</span>
                            <span className="text-foreground">{entry.target_user_email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">IP Address</span>
                            <span className="font-mono text-foreground">{entry.ip_address || '—'}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium uppercase tracking-wide mb-1">State Change</p>
                        <div className="space-y-1">
                          {entry.plan_from && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">From Plan</span>
                              <span className="capitalize text-foreground">{entry.plan_from}</span>
                            </div>
                          )}
                          {entry.plan_to && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">To Plan</span>
                              <span className="capitalize font-medium text-foreground">{entry.plan_to}</span>
                            </div>
                          )}
                          {entry.credits_delta != null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Credits Δ</span>
                              <span className="text-blue-700 font-medium">+{entry.credits_delta}</span>
                            </div>
                          )}
                          {entry.amount_inr != null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Amount</span>
                              <span className="text-emerald-700 font-medium">₹{entry.amount_inr.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {entry.reason && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Reason / Notes</p>
                        <p className="text-xs text-foreground bg-background border border-border rounded-lg px-3 py-2">{entry.reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded border border-border hover:bg-accent disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded border border-border hover:bg-accent disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
