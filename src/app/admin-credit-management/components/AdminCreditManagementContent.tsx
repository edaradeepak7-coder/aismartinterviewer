'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Download, RefreshCw, Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, AlertTriangle, Plus, Trash2, FileText, Users, Zap, BarChart2, ChevronDown, ChevronUp, Loader2, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
type AdjType = 'grant' | 'revoke' | 'adjust';
type BatchStatus = 'pending' | 'applied' | 'failed' | 'rolled_back';

interface CsvRow {
  email: string;
  credits: number;
  reason?: string;
  valid: boolean;
  error?: string;
}

interface Batch {
  id: string;
  batch_name: string;
  adjustment_type: AdjType;
  reason: string;
  promotion_code: string | null;
  total_subscriptions: number;
  applied_count: number;
  failed_count: number;
  csv_filename: string | null;
  csv_row_count: number | null;
  status: BatchStatus;
  notes: string | null;
  created_at: string;
  applied_at: string | null;
  created_by: string | null;
}

interface AdjustmentLine {
  id: string;
  user_email: string;
  adjustment_type: AdjType;
  credits_delta: number;
  credits_before: number | null;
  credits_after: number | null;
  reason: string;
  status: string;
  error_message: string | null;
  applied_at: string | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ADJ_CONFIG: Record<AdjType, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  grant:  { label: 'Grant',  color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: <Plus size={12} className="text-emerald-600" /> },
  revoke: { label: 'Revoke', color: 'text-red-700',     bg: 'bg-red-50 dark:bg-red-900/20',         icon: <Trash2 size={12} className="text-red-600" /> },
  adjust: { label: 'Adjust', color: 'text-blue-700',    bg: 'bg-blue-50 dark:bg-blue-900/20',       icon: <BarChart2 size={12} className="text-blue-600" /> },
};

const STATUS_CONFIG: Record<BatchStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:     { label: 'Pending',     color: 'text-amber-700',  bg: 'bg-amber-50 dark:bg-amber-900/20',   icon: <Clock size={12} className="text-amber-500" /> },
  applied:     { label: 'Applied',     color: 'text-emerald-700',bg: 'bg-emerald-50 dark:bg-emerald-900/20',icon: <CheckCircle2 size={12} className="text-emerald-500" /> },
  failed:      { label: 'Failed',      color: 'text-red-700',    bg: 'bg-red-50 dark:bg-red-900/20',       icon: <XCircle size={12} className="text-red-500" /> },
  rolled_back: { label: 'Rolled Back', color: 'text-slate-600',  bg: 'bg-slate-100 dark:bg-slate-800',     icon: <RefreshCw size={12} className="text-slate-500" /> },
};

const PAGE_SIZE = 15;

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Mock batches for empty state ─────────────────────────────────────────────
function buildMockBatches(): Batch[] {
  return [
    { id: 'b1', batch_name: 'Diwali Promo 2026', adjustment_type: 'grant', reason: 'Festive season promotional credits', promotion_code: 'DIWALI26', total_subscriptions: 342, applied_count: 342, failed_count: 0, csv_filename: 'diwali_users.csv', csv_row_count: 342, status: 'applied', notes: null, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), applied_at: new Date(Date.now() - 86400000 * 3 + 3600000).toISOString(), created_by: null },
    { id: 'b2', batch_name: 'Dispute Resolution Batch #12', adjustment_type: 'grant', reason: 'Credits refunded due to platform outage on 2026-09-01', promotion_code: null, total_subscriptions: 58, applied_count: 55, failed_count: 3, csv_filename: 'dispute_batch_12.csv', csv_row_count: 58, status: 'applied', notes: 'Outage window 02:00–04:30 IST', created_at: new Date(Date.now() - 86400000 * 1).toISOString(), applied_at: new Date(Date.now() - 86400000 + 1800000).toISOString(), created_by: null },
    { id: 'b3', batch_name: 'Expired Trial Revoke', adjustment_type: 'revoke', reason: 'Revoking unused trial credits post-expiry', promotion_code: null, total_subscriptions: 120, applied_count: 0, failed_count: 0, csv_filename: null, csv_row_count: null, status: 'pending', notes: null, created_at: new Date(Date.now() - 3600000).toISOString(), applied_at: null, created_by: null },
    { id: 'b4', batch_name: 'Q3 Loyalty Bonus', adjustment_type: 'grant', reason: 'Loyalty reward for 6+ month subscribers', promotion_code: 'LOYAL_Q3', total_subscriptions: 890, applied_count: 890, failed_count: 0, csv_filename: 'loyalty_q3.csv', csv_row_count: 890, status: 'applied', notes: null, created_at: new Date(Date.now() - 86400000 * 10).toISOString(), applied_at: new Date(Date.now() - 86400000 * 10 + 7200000).toISOString(), created_by: null },
  ];
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const emailIdx = headers.findIndex(h => h.includes('email'));
  const creditsIdx = headers.findIndex(h => h.includes('credit'));
  const reasonIdx = headers.findIndex(h => h.includes('reason'));

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const email = emailIdx >= 0 ? cols[emailIdx] : '';
    const creditsRaw = creditsIdx >= 0 ? cols[creditsIdx] : '';
    const reason = reasonIdx >= 0 ? cols[reasonIdx] : undefined;
    const credits = parseInt(creditsRaw, 10);
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const creditsValid = !isNaN(credits) && credits > 0;
    return {
      email,
      credits: creditsValid ? credits : 0,
      reason,
      valid: emailValid && creditsValid,
      error: !emailValid ? 'Invalid email' : !creditsValid ? 'Invalid credits value' : undefined,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminCreditManagementContent() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  // Tabs
  const [tab, setTab] = useState<'batches' | 'new'>('batches');

  // Batches list
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AdjType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<BatchStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [batchLines, setBatchLines] = useState<Record<string, AdjustmentLine[]>>({});
  const [linesLoading, setLinesLoading] = useState<string | null>(null);

  // New batch form
  const [form, setForm] = useState({ batchName: '', adjType: 'grant' as AdjType, credits: '', reason: '', promoCode: '', notes: '' });
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFilename, setCsvFilename] = useState('');
  const [manualEmails, setManualEmails] = useState('');
  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('csv');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Load batches ─────────────────────────────────────────────────────────
  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('credit_adjustment_batches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data || data.length === 0) {
        setBatches(buildMockBatches());
      } else {
        setBatches(data as Batch[]);
      }
    } catch {
      setBatches(buildMockBatches());
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  // ─── Load batch lines ─────────────────────────────────────────────────────
  const loadBatchLines = async (batchId: string) => {
    if (batchLines[batchId]) return;
    setLinesLoading(batchId);
    try {
      const { data } = await supabase
        .from('credit_adjustments')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });
      setBatchLines(prev => ({ ...prev, [batchId]: (data as AdjustmentLine[]) || [] }));
    } catch {
      setBatchLines(prev => ({ ...prev, [batchId]: [] }));
    } finally {
      setLinesLoading(null);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedBatch === id) {
      setExpandedBatch(null);
    } else {
      setExpandedBatch(id);
      loadBatchLines(id);
    }
  };

  // ─── CSV upload ───────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvRows(parseCsv(text));
    };
    reader.readAsText(file);
  };

  // ─── Submit batch ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.batchName.trim() || !form.reason.trim()) {
      setSubmitMsg({ type: 'error', text: 'Batch name and reason are required.' });
      return;
    }

    let rows: CsvRow[] = [];
    if (inputMode === 'csv') {
      rows = csvRows.filter(r => r.valid);
      if (rows.length === 0) {
        setSubmitMsg({ type: 'error', text: 'No valid rows in CSV. Ensure email and credits columns exist.' });
        return;
      }
    } else {
      const emails = manualEmails.split('\n').map(e => e.trim()).filter(Boolean);
      const credits = parseInt(form.credits, 10);
      if (emails.length === 0 || isNaN(credits) || credits <= 0) {
        setSubmitMsg({ type: 'error', text: 'Enter valid emails and a positive credit amount.' });
        return;
      }
      rows = emails.map(email => ({ email, credits, reason: form.reason, valid: true }));
    }

    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const { data: batchData, error: batchErr } = await supabase
        .from('credit_adjustment_batches')
        .insert({
          batch_name: form.batchName,
          adjustment_type: form.adjType,
          reason: form.reason,
          promotion_code: form.promoCode || null,
          notes: form.notes || null,
          total_subscriptions: rows.length,
          csv_filename: inputMode === 'csv' ? csvFilename : null,
          csv_row_count: inputMode === 'csv' ? csvRows.length : null,
          status: 'pending',
        })
        .select()
        .single();

      if (batchErr || !batchData) throw new Error(batchErr?.message || 'Failed to create batch');

      // Insert line items
      const lineItems = rows.map(r => ({
        batch_id: batchData.id,
        user_email: r.email,
        adjustment_type: form.adjType,
        credits_delta: form.adjType === 'revoke' ? -Math.abs(r.credits) : Math.abs(r.credits),
        reason: r.reason || form.reason,
        status: 'pending',
      }));

      const { error: linesErr } = await supabase.from('credit_adjustments').insert(lineItems);
      if (linesErr) throw new Error(linesErr.message);

      setSubmitMsg({ type: 'success', text: `Batch "${form.batchName}" created with ${rows.length} adjustments. Status: Pending.` });
      setForm({ batchName: '', adjType: 'grant', credits: '', reason: '', promoCode: '', notes: '' });
      setCsvRows([]);
      setCsvFilename('');
      setManualEmails('');
      loadBatches();
      setTimeout(() => setTab('batches'), 1500);
    } catch (err: unknown) {
      setSubmitMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create batch.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── CSV template download ────────────────────────────────────────────────
  const downloadTemplate = () => {
    const csv = 'email,credits,reason\nuser@example.com,50,Promotional grant\nother@example.com,25,Dispute resolution';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'credit_adjustment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Filtered batches ─────────────────────────────────────────────────────
  const filtered = batches.filter(b => {
    const matchSearch = !search || b.batch_name.toLowerCase().includes(search.toLowerCase()) || (b.promotion_code || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || b.adjustment_type === filterType;
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: batches.length,
    applied: batches.filter(b => b.status === 'applied').length,
    pending: batches.filter(b => b.status === 'pending').length,
    totalAdjusted: batches.reduce((s, b) => s + b.applied_count, 0),
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-700 text-white leading-tight">Credit Management</h1>
            <p className="text-[12px] text-white/40">Bulk grant, revoke, or adjust credits across subscriptions</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Batches', value: stats.total, icon: <FileText size={14} />, color: 'text-violet-400' },
          { label: 'Applied', value: stats.applied, icon: <CheckCircle2 size={14} />, color: 'text-emerald-400' },
          { label: 'Pending', value: stats.pending, icon: <Clock size={14} />, color: 'text-amber-400' },
          { label: 'Subscriptions Adjusted', value: stats.totalAdjusted.toLocaleString(), icon: <Users size={14} />, color: 'text-teal-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4">
            <div className={`flex items-center gap-1.5 mb-1.5 ${s.color}`}>{s.icon}<span className="text-[11px] font-600 text-white/50">{s.label}</span></div>
            <p className="text-2xl font-700 text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white/[0.04] border border-white/[0.07] rounded-xl p-1 w-fit">
        {(['batches', 'new'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-[12.5px] font-600 transition-all ${tab === t ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-white/50 hover:text-white/80'}`}
          >
            {t === 'batches' ? 'Audit Trail' : '+ New Batch'}
          </button>
        ))}
      </div>

      {/* ── Batches Tab ── */}
      {tab === 'batches' && (
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-white/[0.06] flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search batches…"
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-[12.5px] text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value as AdjType | 'all'); setPage(1); }}
              className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-[12.5px] text-white/70 focus:outline-none focus:border-violet-500/50"
            >
              <option value="all">All Types</option>
              <option value="grant">Grant</option>
              <option value="revoke">Revoke</option>
              <option value="adjust">Adjust</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value as BatchStatus | 'all'); setPage(1); }}
              className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-[12.5px] text-white/70 focus:outline-none focus:border-violet-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="applied">Applied</option>
              <option value="failed">Failed</option>
              <option value="rolled_back">Rolled Back</option>
            </select>
            <button onClick={loadBatches} className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/50 hover:text-white transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-white/40">
              <Loader2 size={18} className="animate-spin" /><span className="text-[13px]">Loading batches…</span>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-white/30">
              <FileText size={32} />
              <p className="text-[13px]">No batches found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Batch Name', 'Type', 'Subscriptions', 'Applied / Failed', 'Status', 'Created', 'Promo Code', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-600 text-white/30 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(b => {
                    const sc = STATUS_CONFIG[b.status];
                    const ac = ADJ_CONFIG[b.adjustment_type];
                    const isExpanded = expandedBatch === b.id;
                    return (
                      <React.Fragment key={b.id}>
                        <tr className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-600 text-white/90">{b.batch_name}</p>
                            <p className="text-[11px] text-white/35 mt-0.5 line-clamp-1">{b.reason}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-600 ${ac.bg} ${ac.color}`}>
                              {ac.icon}{ac.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/70 font-600">{b.total_subscriptions.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className="text-emerald-400 font-600">{b.applied_count}</span>
                            <span className="text-white/30 mx-1">/</span>
                            <span className={b.failed_count > 0 ? 'text-red-400 font-600' : 'text-white/30'}>{b.failed_count}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-600 ${sc.bg} ${sc.color}`}>
                              {sc.icon}{sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/40 whitespace-nowrap">{fmtDate(b.created_at)}</td>
                          <td className="px-4 py-3">
                            {b.promotion_code ? (
                              <span className="bg-violet-500/15 text-violet-300 text-[11px] font-600 px-2 py-0.5 rounded-full">{b.promotion_code}</span>
                            ) : <span className="text-white/20">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleExpand(b.id)}
                              className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-white/[0.04]">
                            <td colSpan={8} className="px-4 py-4 bg-white/[0.02]">
                              <div className="mb-3 flex flex-wrap gap-4 text-[12px]">
                                {b.notes && <span className="text-white/50"><span className="text-white/30">Notes: </span>{b.notes}</span>}
                                {b.csv_filename && <span className="text-white/50"><span className="text-white/30">CSV: </span>{b.csv_filename} ({b.csv_row_count} rows)</span>}
                                {b.applied_at && <span className="text-white/50"><span className="text-white/30">Applied: </span>{fmtDate(b.applied_at)}</span>}
                              </div>
                              {linesLoading === b.id ? (
                                <div className="flex items-center gap-2 text-white/30 py-4"><Loader2 size={14} className="animate-spin" /><span className="text-[12px]">Loading line items…</span></div>
                              ) : (batchLines[b.id] || []).length === 0 ? (
                                <p className="text-[12px] text-white/25 py-2">No line items recorded.</p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                                  <table className="w-full text-[11.5px]">
                                    <thead>
                                      <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                                        {['Email', 'Delta', 'Before', 'After', 'Status', 'Applied At'].map(h => (
                                          <th key={h} className="px-3 py-2 text-left text-[10px] font-600 text-white/25 uppercase tracking-wide">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {batchLines[b.id].map(line => (
                                        <tr key={line.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                          <td className="px-3 py-2 text-white/70">{line.user_email}</td>
                                          <td className="px-3 py-2">
                                            <span className={line.credits_delta >= 0 ? 'text-emerald-400 font-600' : 'text-red-400 font-600'}>
                                              {line.credits_delta >= 0 ? '+' : ''}{line.credits_delta}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-white/40">{line.credits_before ?? '—'}</td>
                                          <td className="px-3 py-2 text-white/40">{line.credits_after ?? '—'}</td>
                                          <td className="px-3 py-2">
                                            <span className={`text-[10px] font-600 px-1.5 py-0.5 rounded-full ${line.status === 'applied' ? 'bg-emerald-500/15 text-emerald-400' : line.status === 'failed' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                              {line.status}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-white/30">{fmtDate(line.applied_at)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <span className="text-[12px] text-white/30">{filtered.length} batches</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-white/40 hover:text-white disabled:opacity-30 hover:bg-white/[0.06] transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[12px] text-white/50">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg text-white/40 hover:text-white disabled:opacity-30 hover:bg-white/[0.06] transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── New Batch Tab ── */}
      {tab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
              <h2 className="text-[14px] font-700 text-white mb-4">Batch Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-600 text-white/40 mb-1.5 uppercase tracking-wide">Batch Name *</label>
                  <input
                    value={form.batchName}
                    onChange={e => setForm(f => ({ ...f, batchName: e.target.value }))}
                    placeholder="e.g. Diwali Promo 2026"
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-600 text-white/40 mb-1.5 uppercase tracking-wide">Adjustment Type *</label>
                  <select
                    value={form.adjType}
                    onChange={e => setForm(f => ({ ...f, adjType: e.target.value as AdjType }))}
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="grant">Grant — Add credits</option>
                    <option value="revoke">Revoke — Remove credits</option>
                    <option value="adjust">Adjust — Set to specific value</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-600 text-white/40 mb-1.5 uppercase tracking-wide">Reason / Justification *</label>
                  <textarea
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Describe why these credits are being adjusted (logged in audit trail)"
                    rows={2}
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-600 text-white/40 mb-1.5 uppercase tracking-wide">Promotion Code</label>
                  <input
                    value={form.promoCode}
                    onChange={e => setForm(f => ({ ...f, promoCode: e.target.value }))}
                    placeholder="e.g. DIWALI26 (optional)"
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-600 text-white/40 mb-1.5 uppercase tracking-wide">Internal Notes</label>
                  <input
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional internal notes"
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Target subscriptions */}
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[14px] font-700 text-white">Target Subscriptions</h2>
                <div className="flex gap-1 bg-white/[0.04] rounded-lg p-0.5">
                  {(['csv', 'manual'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setInputMode(m)}
                      className={`px-3 py-1.5 rounded-md text-[11.5px] font-600 transition-all ${inputMode === m ? 'bg-violet-600 text-white' : 'text-white/40 hover:text-white/70'}`}
                    >
                      {m === 'csv' ? 'CSV Upload' : 'Manual Entry'}
                    </button>
                  ))}
                </div>
              </div>

              {inputMode === 'csv' ? (
                <div>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-white/[0.1] rounded-xl p-8 text-center cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
                  >
                    <Upload size={24} className="mx-auto mb-2 text-white/25" />
                    <p className="text-[13px] text-white/50 mb-1">{csvFilename || 'Click to upload CSV'}</p>
                    <p className="text-[11px] text-white/25">Required columns: email, credits — Optional: reason</p>
                    <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                  </div>
                  <button onClick={downloadTemplate} className="mt-2 flex items-center gap-1.5 text-[11.5px] text-violet-400 hover:text-violet-300 transition-colors">
                    <Download size={12} />Download CSV template
                  </button>
                  {csvRows.length > 0 && (
                    <div className="mt-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                      <div className="flex items-center gap-3 text-[12px] mb-2">
                        <span className="text-emerald-400 font-600">{csvRows.filter(r => r.valid).length} valid</span>
                        <span className="text-red-400 font-600">{csvRows.filter(r => !r.valid).length} invalid</span>
                        <span className="text-white/30">{csvRows.length} total rows</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {csvRows.slice(0, 20).map((r, i) => (
                          <div key={i} className={`flex items-center gap-2 text-[11.5px] px-2 py-1 rounded ${r.valid ? 'text-white/60' : 'text-red-400 bg-red-500/5'}`}>
                            {r.valid ? <CheckCircle2 size={11} className="text-emerald-500 shrink-0" /> : <XCircle size={11} className="shrink-0" />}
                            <span className="flex-1 truncate">{r.email}</span>
                            <span className="font-600">{r.valid ? `+${r.credits}` : r.error}</span>
                          </div>
                        ))}
                        {csvRows.length > 20 && <p className="text-[11px] text-white/25 px-2">…and {csvRows.length - 20} more rows</p>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-600 text-white/40 mb-1.5 uppercase tracking-wide">Credits per User *</label>
                    <input
                      type="number"
                      value={form.credits}
                      onChange={e => setForm(f => ({ ...f, credits: e.target.value }))}
                      placeholder="e.g. 50"
                      min="1"
                      className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-600 text-white/40 mb-1.5 uppercase tracking-wide">Email Addresses (one per line) *</label>
                    <textarea
                      value={manualEmails}
                      onChange={e => setManualEmails(e.target.value)}
                      placeholder={'user1@example.com\nuser2@example.com\nuser3@example.com'}
                      rows={6}
                      className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 resize-none font-mono"
                    />
                    <p className="text-[11px] text-white/25 mt-1">{manualEmails.split('\n').filter(e => e.trim()).length} emails entered</p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            {submitMsg && (
              <div className={`flex items-start gap-2 p-3 rounded-xl text-[12.5px] ${submitMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                {submitMsg.type === 'success' ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
                {submitMsg.text}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-700 text-[13.5px] hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
            >
              {submitting ? <><Loader2 size={15} className="animate-spin" />Creating Batch…</> : <><Zap size={15} />Create Adjustment Batch</>}
            </button>
          </div>

          {/* Info panel */}
          <div className="space-y-4">
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} className="text-violet-400" />
                <h3 className="text-[13px] font-700 text-white">How It Works</h3>
              </div>
              <div className="space-y-3 text-[12px] text-white/50">
                <div className="flex gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-700 flex items-center justify-center shrink-0">1</span><span>Upload a CSV or enter emails manually with credit amounts</span></div>
                <div className="flex gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-700 flex items-center justify-center shrink-0">2</span><span>Provide a reason — this is logged in the audit trail for compliance</span></div>
                <div className="flex gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-700 flex items-center justify-center shrink-0">3</span><span>Batch is created with status Pending and queued for processing</span></div>
                <div className="flex gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-700 flex items-center justify-center shrink-0">4</span><span>Each line item records before/after credit balance for full traceability</span></div>
              </div>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={13} className="text-amber-400" />
                <h3 className="text-[12.5px] font-700 text-amber-300">CSV Format</h3>
              </div>
              <p className="text-[11.5px] text-amber-200/60 mb-2">Required columns:</p>
              <code className="block text-[11px] bg-black/20 rounded-lg p-2 text-amber-200/80 font-mono">email,credits,reason</code>
              <p className="text-[11px] text-amber-200/40 mt-2">The <code className="text-amber-200/60">reason</code> column overrides the batch reason per row.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
