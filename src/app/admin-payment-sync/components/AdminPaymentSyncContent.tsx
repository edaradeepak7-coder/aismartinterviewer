'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Clock, RefreshCw, Download, Search, XCircle, RotateCcw, FileText, ChevronLeft, ChevronRight, Loader2, CreditCard, BarChart2, AlertOctagon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type TxStatus = 'confirmed' | 'pending' | 'failed' | 'refunded';
type TabId = 'overview' | 'confirmed' | 'pending' | 'refunds' | 'settlement';

interface Transaction {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  amount_inr: number;
  status: TxStatus;
  payment_method: string;
  plan_name: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  created_at: string;
  settled_at: string | null;
  refund_reason: string | null;
  retry_attempt: number;
}

interface SettlementReport {
  period: string;
  gross_inr: number;
  refunds_inr: number;
  net_inr: number;
  tx_count: number;
  refund_count: number;
}

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<TxStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  confirmed: { label: 'Confirmed', color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: <CheckCircle2 size={13} className="text-emerald-600" /> },
  pending:   { label: 'Pending',   color: 'text-amber-700',   bg: 'bg-amber-50 dark:bg-amber-900/20',   icon: <Clock size={13} className="text-amber-600" /> },
  failed:    { label: 'Failed',    color: 'text-red-700',     bg: 'bg-red-50 dark:bg-red-900/20',       icon: <XCircle size={13} className="text-red-600" /> },
  refunded:  { label: 'Refunded',  color: 'text-violet-700',  bg: 'bg-violet-50 dark:bg-violet-900/20', icon: <RotateCcw size={13} className="text-violet-600" /> },
};

// Mock settlement data (derived from real invoices in production)
const MOCK_SETTLEMENT: SettlementReport[] = [
  { period: 'Sep 2026', gross_inr: 142800, refunds_inr: 4990, net_inr: 137810, tx_count: 89, refund_count: 3 },
  { period: 'Aug 2026', gross_inr: 118500, refunds_inr: 2990, net_inr: 115510, tx_count: 74, refund_count: 2 },
  { period: 'Jul 2026', gross_inr: 97200,  refunds_inr: 1499, net_inr: 95701,  tx_count: 61, refund_count: 1 },
  { period: 'Jun 2026', gross_inr: 84600,  refunds_inr: 3498, net_inr: 81102,  tx_count: 53, refund_count: 2 },
  { period: 'May 2026', gross_inr: 71400,  refunds_inr: 0,    net_inr: 71400,  tx_count: 45, refund_count: 0 },
  { period: 'Apr 2026', gross_inr: 58800,  refunds_inr: 1499, net_inr: 57301,  tx_count: 37, refund_count: 1 },
];

const PAGE_SIZE = 15;

export default function AdminPaymentSyncContent() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>(new Date().toISOString());

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch invoices joined with user profiles
      const { data: invoices } = await supabase
        .from('billing_invoices')
        .select('*, subscriptions:subscription_id(plan_name, plan_id), user_profiles:user_id(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (invoices) {
        const mapped: Transaction[] = invoices.map((inv: any) => {
          let status: TxStatus = 'pending';
          if (inv.status === 'paid') status = 'confirmed';
          else if (inv.status === 'refunded') status = 'refunded';
          else if (inv.status === 'failed') status = 'failed';
          else if (inv.status === 'void') status = 'failed';

          return {
            id: inv.id,
            user_id: inv.user_id,
            user_email: inv.user_profiles?.email || '—',
            user_name: inv.user_profiles?.full_name || '—',
            amount_inr: inv.total_amount_inr || inv.amount_inr || 0,
            status,
            payment_method: inv.razorpay_payment_id ? 'Card/UPI' : 'Manual',
            plan_name: inv.subscriptions?.plan_name || inv.subscriptions?.plan_id || '—',
            razorpay_payment_id: inv.razorpay_payment_id,
            razorpay_order_id: inv.razorpay_order_id,
            created_at: inv.created_at,
            settled_at: inv.paid_at,
            refund_reason: null,
            retry_attempt: 0,
          };
        });
        setTransactions(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleSync = async () => {
    setSyncing(true);
    await fetchTransactions();
    setLastSync(new Date().toISOString());
    setSyncing(false);
  };

  // Filtered by tab + search
  const filtered = transactions.filter(tx => {
    const matchSearch = !search ||
      tx.user_email.toLowerCase().includes(search.toLowerCase()) ||
      tx.user_name.toLowerCase().includes(search.toLowerCase()) ||
      (tx.razorpay_payment_id || '').toLowerCase().includes(search.toLowerCase());

    if (activeTab === 'confirmed') return matchSearch && tx.status === 'confirmed';
    if (activeTab === 'pending')   return matchSearch && tx.status === 'pending';
    if (activeTab === 'refunds')   return matchSearch && tx.status === 'refunded';
    return matchSearch;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // KPIs
  const confirmed = transactions.filter(t => t.status === 'confirmed');
  const pending    = transactions.filter(t => t.status === 'pending');
  const refunded   = transactions.filter(t => t.status === 'refunded');
  const failed     = transactions.filter(t => t.status === 'failed');
  const totalConfirmedINR = confirmed.reduce((s, t) => s + t.amount_inr, 0);
  const totalPendingINR   = pending.reduce((s, t) => s + t.amount_inr, 0);
  const totalRefundedINR  = refunded.reduce((s, t) => s + t.amount_inr, 0);

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'confirmed',  label: 'Confirmed',  count: confirmed.length },
    { id: 'pending',    label: 'Pending',    count: pending.length },
    { id: 'refunds',    label: 'Refunds',    count: refunded.length },
    { id: 'settlement', label: 'Settlement Reports' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard size={24} className="text-primary" />
            Payment Status Sync
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time view of confirmed, pending, refunded transactions and settlement reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Last sync: {fmtDate(lastSync)}
          </span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Confirmed Revenue',
            value: fmtINR(totalConfirmedINR),
            sub: `${confirmed.length} transactions`,
            icon: <CheckCircle2 size={20} className="text-emerald-600" />,
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            border: 'border-emerald-200 dark:border-emerald-800',
          },
          {
            label: 'Pending Collection',
            value: fmtINR(totalPendingINR),
            sub: `${pending.length} awaiting`,
            icon: <Clock size={20} className="text-amber-600" />,
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-amber-200 dark:border-amber-800',
          },
          {
            label: 'Total Refunds',
            value: fmtINR(totalRefundedINR),
            sub: `${refunded.length} refund requests`,
            icon: <RotateCcw size={20} className="text-violet-600" />,
            bg: 'bg-violet-50 dark:bg-violet-900/20',
            border: 'border-violet-200 dark:border-violet-800',
          },
          {
            label: 'Failed Payments',
            value: failed.length,
            sub: 'requiring attention',
            icon: <AlertOctagon size={20} className="text-red-600" />,
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-800',
          },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border ${kpi.border} ${kpi.bg} p-4 flex items-start gap-3`}>
            <div className="mt-0.5">{kpi.icon}</div>
            <div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(0); }}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Settlement Reports Tab */}
      {activeTab === 'settlement' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <BarChart2 size={16} className="text-primary" />
              Monthly Settlement Reports
            </h2>
            <button className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Download size={12} /> Download All
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Period</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gross Revenue</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Refunds</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net Revenue</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transactions</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Refund Rate</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_SETTLEMENT.map(row => (
                  <tr key={row.period} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{row.period}</td>
                    <td className="px-4 py-3 text-right text-foreground">{fmtINR(row.gross_inr)}</td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {row.refunds_inr > 0 ? `−${fmtINR(row.refunds_inr)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmtINR(row.net_inr)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{row.tx_count}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-medium ${row.refund_count === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {row.tx_count > 0 ? ((row.refund_count / row.tx_count) * 100).toFixed(1) : 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs text-primary hover:underline flex items-center gap-1 ml-auto">
                        <FileText size={11} /> Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Status breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(['confirmed', 'pending', 'refunded', 'failed'] as TxStatus[]).map(s => {
              const cfg = STATUS_CONFIG[s];
              const count = transactions.filter(t => t.status === s).length;
              const pct = transactions.length > 0 ? ((count / transactions.length) * 100).toFixed(1) : '0';
              return (
                <div key={s} className={`rounded-xl border border-border ${cfg.bg} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    {cfg.icon}
                    <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pct}% of total</p>
                  {/* Mini bar */}
                  <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-current rounded-full transition-all" style={{ width: `${pct}%`, color: 'inherit' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent transactions preview */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent Transactions</h3>
            <TransactionTable rows={transactions.slice(0, 8)} />
          </div>
        </div>
      )}

      {/* Transaction list tabs */}
      {(activeTab === 'confirmed' || activeTab === 'pending' || activeTab === 'refunds') && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by email, name, or payment ID…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <span className="text-xs text-muted-foreground">{filtered.length} results</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TransactionTable rows={paginated} />
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Page {page + 1} of {totalPages}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TransactionTable({ rows }: { rows: Transaction[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm border border-border rounded-xl">
        No transactions found.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Method</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(tx => {
            const cfg = STATUS_CONFIG[tx.status];
            return (
              <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground text-xs">{tx.user_name}</p>
                  <p className="text-xs text-muted-foreground">{tx.user_email}</p>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{tx.plan_name}</td>
                <td className="px-4 py-3 text-right font-semibold text-foreground">
                  {'₹' + tx.amount_inr.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{tx.payment_method}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  {tx.razorpay_payment_id ? (
                    <span className="font-mono text-xs text-muted-foreground">{tx.razorpay_payment_id.slice(0, 16)}…</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
