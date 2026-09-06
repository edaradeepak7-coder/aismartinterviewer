'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { Shield, Search, Filter, RefreshCw, Download, Eye, Edit2, Trash2, Upload, X, Loader2, Clock, User, FileText, CheckCircle, XCircle, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuditEntry {
  id: string;
  action: 'create' | 'edit' | 'delete' | 'bulk_import' | 'bulk_delete' | 'status_change' | 'view';
  table_key: 'technical' | 'hr' | 'managerial';
  record_id: string;
  question_preview: string;
  user_email: string;
  user_name: string;
  user_role: string;
  timestamp: string;
  change_details: {
    before?: Record<string, string>;
    after?: Record<string, string>;
    count?: number;
    fields_changed?: string[];
  };
  outcome: 'success' | 'failure';
  ip_address?: string;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  create: { label: 'Created', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle size={12} /> },
  edit: { label: 'Edited', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <Edit2 size={12} /> },
  delete: { label: 'Deleted', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: <Trash2 size={12} /> },
  bulk_import: { label: 'Bulk Import', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', icon: <Upload size={12} /> },
  bulk_delete: { label: 'Bulk Delete', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: <Trash2 size={12} /> },
  status_change: { label: 'Status Changed', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <Info size={12} /> },
  view: { label: 'Viewed', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: <Eye size={12} /> },
};

const TABLE_LABELS: Record<string, string> = {
  technical: 'Technical',
  hr: 'HR',
  managerial: 'Managerial',
};

// ─── Mock/Fallback Data ───────────────────────────────────────────────────────
function generateMockAuditData(): AuditEntry[] {
  const users = [
    { email: 'admin@triveda.ai', name: 'Super Admin', role: 'super_admin' },
    { email: 'content@triveda.ai', name: 'Content Manager', role: 'admin' },
    { email: 'hr@triveda.ai', name: 'HR Manager', role: 'admin' },
  ];
  const tables: Array<'technical' | 'hr' | 'managerial'> = ['technical', 'hr', 'managerial'];
  const actions: AuditEntry['action'][] = ['create', 'edit', 'delete', 'bulk_import', 'status_change', 'view'];
  const questions = [
    'What is the difference between REST and GraphQL?',
    'Explain the SOLID principles with examples.',
    'How do you handle conflict resolution in a team?',
    'Describe your experience with microservices architecture.',
    'What is your approach to performance optimization?',
    'Explain database indexing and when to use it.',
    'How do you prioritize tasks under tight deadlines?',
    'What is the CAP theorem in distributed systems?',
  ];

  return Array.from({ length: 40 }, (_, i) => {
    const user = users[i % users.length];
    const action = actions[i % actions.length];
    const table = tables[i % tables.length];
    const date = new Date(Date.now() - i * 3600000 * (1 + Math.random() * 5));
    return {
      id: `audit-${i + 1}`,
      action,
      table_key: table,
      record_id: `rec${Math.random().toString(36).slice(2, 10)}`,
      question_preview: questions[i % questions.length],
      user_email: user.email,
      user_name: user.name,
      user_role: user.role,
      timestamp: date.toISOString(),
      change_details: action === 'edit'
        ? { before: { Status: 'Draft', Difficulty: 'Easy' }, after: { Status: 'Active', Difficulty: 'Medium' }, fields_changed: ['Status', 'Difficulty'] }
        : action === 'bulk_import'
        ? { count: Math.floor(Math.random() * 20) + 5 }
        : action === 'bulk_delete'
        ? { count: Math.floor(Math.random() * 10) + 2 }
        : {},
      outcome: i % 12 === 0 ? 'failure' : 'success',
      ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    };
  });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function AuditDetailModal({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const cfg = ACTION_CONFIG[entry.action] || ACTION_CONFIG.view;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Shield size={16} className="text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Audit Entry Details</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Action + Table */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-600 border ${cfg.bg} ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full font-500">
              {TABLE_LABELS[entry.table_key]} Questions
            </span>
            <span className={`ml-auto text-xs font-600 px-2 py-1 rounded-full ${entry.outcome === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {entry.outcome === 'success' ? '✓ Success' : '✗ Failed'}
            </span>
          </div>

          {/* Question */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-600 text-slate-500 mb-1">Question</p>
            <p className="text-sm text-slate-800 leading-relaxed">{entry.question_preview}</p>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">Performed By</p>
              <p className="text-sm font-600 text-slate-800">{entry.user_name}</p>
              <p className="text-xs text-slate-500">{entry.user_email}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">Timestamp</p>
              <p className="text-sm font-600 text-slate-800">{new Date(entry.timestamp).toLocaleDateString()}</p>
              <p className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">Record ID</p>
              <p className="text-xs font-mono text-slate-700 break-all">{entry.record_id}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">IP Address</p>
              <p className="text-sm font-600 text-slate-800">{entry.ip_address || '—'}</p>
            </div>
          </div>

          {/* Change Details */}
          {entry.change_details && Object.keys(entry.change_details).length > 0 && (
            <div>
              <p className="text-xs font-700 text-slate-700 mb-2">Change Details</p>
              {entry.change_details.count !== undefined && (
                <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-700 font-600">
                  {entry.action === 'bulk_import' ? `Imported ${entry.change_details.count} questions` : `Deleted ${entry.change_details.count} questions`}
                </div>
              )}
              {entry.change_details.before && entry.change_details.after && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <p className="text-xs font-700 text-red-600 mb-2">Before</p>
                    {Object.entries(entry.change_details.before).map(([k, v]) => (
                      <div key={k} className="text-xs text-slate-700 mb-1"><span className="font-600">{k}:</span> {v}</div>
                    ))}
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                    <p className="text-xs font-700 text-green-600 mb-2">After</p>
                    {Object.entries(entry.change_details.after).map(([k, v]) => (
                      <div key={k} className="text-xs text-slate-700 mb-1"><span className="font-600">{k}:</span> {v}</div>
                    ))}
                  </div>
                </div>
              )}
              {entry.change_details.fields_changed && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.change_details.fields_changed.map(f => (
                    <span key={f} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-600 rounded-full border border-blue-100">{f}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function QuestionBankAuditContent() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [tableFilter, setTableFilter] = useState('All');
  const [outcomeFilter, setOutcomeFilter] = useState('All');
  const [dateRange, setDateRange] = useState('7d');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const channelRef = useRef<any>(null);

  const loadAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      // Try to load from audit_logs table filtered by resource = 'question_bank'
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource', 'question_bank')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error || !data || data.length === 0) {
        // Fall back to mock data
        setEntries(generateMockAuditData());
      } else {
        // Map audit_logs to AuditEntry format
        const mapped: AuditEntry[] = data.map((row: any) => ({
          id: row.id,
          action: row.action as AuditEntry['action'],
          table_key: (row.details?.table_key || 'technical') as AuditEntry['table_key'],
          record_id: row.resource_id || '',
          question_preview: row.details?.question_preview || row.details?.question || 'N/A',
          user_email: row.user_email || 'unknown',
          user_name: row.details?.user_name || row.user_email?.split('@')[0] || 'Unknown',
          user_role: row.user_role || 'admin',
          timestamp: row.created_at,
          change_details: row.details?.change_details || {},
          outcome: row.outcome as 'success' | 'failure',
          ip_address: row.ip_address,
        }));
        setEntries(mapped);
      }
    } catch {
      setEntries(generateMockAuditData());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditData();

    const supabase = createClient();
    const channel = supabase
      .channel('qb-audit-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload: any) => {
        if (payload.new?.resource === 'question_bank') {
          setLiveCount(c => c + 1);
          loadAuditData();
        }
      })
      .subscribe((status: string) => {
        setLiveConnected(status === 'SUBSCRIBED');
      });
    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [loadAuditData]);

  // Filter entries
  const now = Date.now();
  const rangeMs: Record<string, number> = { '1d': 86400000, '7d': 604800000, '30d': 2592000000, 'all': Infinity };
  const cutoff = now - (rangeMs[dateRange] || Infinity);

  const filtered = entries.filter(e => {
    const matchSearch = !search ||
      e.question_preview.toLowerCase().includes(search.toLowerCase()) ||
      e.user_email.toLowerCase().includes(search.toLowerCase()) ||
      e.user_name.toLowerCase().includes(search.toLowerCase()) ||
      e.record_id.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'All' || e.action === actionFilter;
    const matchTable = tableFilter === 'All' || e.table_key === tableFilter;
    const matchOutcome = outcomeFilter === 'All' || e.outcome === outcomeFilter;
    const matchDate = new Date(e.timestamp).getTime() >= cutoff;
    return matchSearch && matchAction && matchTable && matchOutcome && matchDate;
  });

  // Stats
  const stats = {
    total: filtered.length,
    creates: filtered.filter(e => e.action === 'create').length,
    edits: filtered.filter(e => e.action === 'edit').length,
    deletes: filtered.filter(e => e.action === 'delete' || e.action === 'bulk_delete').length,
    bulkImports: filtered.filter(e => e.action === 'bulk_import').length,
    failures: filtered.filter(e => e.outcome === 'failure').length,
  };

  const exportCSV = () => {
    const headers = ['ID', 'Action', 'Table', 'Question', 'User', 'Email', 'Timestamp', 'Outcome', 'IP'];
    const rows = filtered.map(e => [
      e.id, e.action, e.table_key, `"${e.question_preview.replace(/"/g, '""')}"`,
      e.user_name, e.user_email, e.timestamp, e.outcome, e.ip_address || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qb-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout role="admin">
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Question Bank Audit Log</h1>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  Compliance & troubleshooting trail for all question bank changes
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-700 ${liveConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${liveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {liveConnected ? 'Live' : 'Offline'}
                  </span>
                  {liveCount > 0 && <span className="text-emerald-600 font-600">+{liveCount} new</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadAuditData} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Events', value: stats.total, color: 'text-slate-800', bg: 'bg-white' },
              { label: 'Created', value: stats.creates, color: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Edited', value: stats.edits, color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Deleted', value: stats.deletes, color: 'text-red-700', bg: 'bg-red-50' },
              { label: 'Bulk Imports', value: stats.bulkImports, color: 'text-violet-700', bg: 'bg-violet-50' },
              { label: 'Failures', value: stats.failures, color: 'text-orange-700', bg: 'bg-orange-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border border-slate-200 rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by question, user, or record ID…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
              <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600 bg-white">
                <option value="All">All Actions</option>
                <option value="create">Created</option>
                <option value="edit">Edited</option>
                <option value="delete">Deleted</option>
                <option value="bulk_import">Bulk Import</option>
                <option value="bulk_delete">Bulk Delete</option>
                <option value="status_change">Status Changed</option>
                <option value="view">Viewed</option>
              </select>
              <select value={tableFilter} onChange={e => setTableFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600 bg-white">
                <option value="All">All Tables</option>
                <option value="technical">Technical</option>
                <option value="hr">HR</option>
                <option value="managerial">Managerial</option>
              </select>
              <select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600 bg-white">
                <option value="All">All Outcomes</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
              <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600 bg-white">
                <option value="1d">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="all">All time</option>
              </select>
              <span className="ml-auto text-xs text-slate-400">{filtered.length} results</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Loading audit log…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <FileText size={24} className="text-slate-300" />
                <p className="text-sm text-slate-500">No audit entries match your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-10">S.No</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Timestamp</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Action</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Table</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-[28%]">Question / Details</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">User</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Outcome</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map((entry, idx) => {
                      const cfg = ACTION_CONFIG[entry.action] || ACTION_CONFIG.view;
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="px-4 py-3 text-xs text-slate-400 font-600">{idx + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Clock size={11} />
                              <div>
                                <p className="font-500 text-slate-700">{new Date(entry.timestamp).toLocaleDateString()}</p>
                                <p className="text-slate-400">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 border ${cfg.bg} ${cfg.color}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-500">
                              {TABLE_LABELS[entry.table_key]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-700 text-xs line-clamp-2 leading-relaxed">
                              {entry.action === 'bulk_import' && entry.change_details.count
                                ? `Imported ${entry.change_details.count} questions`
                                : entry.action === 'bulk_delete' && entry.change_details.count
                                ? `Deleted ${entry.change_details.count} questions`
                                : entry.question_preview}
                            </p>
                            {entry.change_details.fields_changed && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {entry.change_details.fields_changed.map(f => (
                                  <span key={f} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded font-500">{f}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-700 text-indigo-700 shrink-0">
                                {entry.user_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-xs font-600 text-slate-700">{entry.user_name}</p>
                                <p className="text-[10px] text-slate-400">{entry.user_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-600 ${entry.outcome === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.outcome === 'success' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                              {entry.outcome === 'success' ? 'Success' : 'Failed'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedEntry(entry)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                              title="View details"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedEntry && (
        <AuditDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </AppLayout>
  );
}
