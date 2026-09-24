'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Database, Plus, RefreshCw, Search, Edit2, Trash2, Eye, X, Check, AlertCircle, Loader2, Code2, Users, Briefcase, Filter, BookOpen } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { csrfHeaders } from '@/lib/api/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────
type TableKey = 'technical' | 'hr' | 'managerial';

interface QuestionRecord {
  id: string;
  text: string;
  category: string;
  difficulty: string;
  technology: string | null;
  is_active: boolean;
  usage_count?: number;
  created_at?: string;
}

interface TableData {
  records: QuestionRecord[];
  loading: boolean;
  error: string | null;
}

interface FormState {
  Question: string;
  Category: string;
  Difficulty: string;
  'Job Role': string;
  Status: string;
}

const TABLE_CONFIG: Record<TableKey, { label: string; category: string; color: string; bg: string; border: string; icon: React.ReactNode; accent: string }> = {
  technical: {
    label: 'Technical Questions',
    category: 'Technical',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    accent: 'bg-blue-600',
    icon: <Code2 size={16} />,
  },
  hr: {
    label: 'HR Questions',
    category: 'HR',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    accent: 'bg-violet-600',
    icon: <Users size={16} />,
  },
  managerial: {
    label: 'Managerial Questions',
    category: 'Managerial',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    accent: 'bg-amber-600',
    icon: <Briefcase size={16} />,
  },
};

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  Hard: 'bg-red-50 text-red-700 border border-red-200',
};

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-green-50 text-green-700 border border-green-200',
  Draft: 'bg-slate-100 text-slate-600 border border-slate-200',
  Archived: 'bg-rose-50 text-rose-600 border border-rose-200',
};

const EMPTY_FORM: FormState = {
  Question: '',
  Category: '',
  Difficulty: 'Medium',
  'Job Role': '',
  Status: 'Active',
};

function statusFromRecord(r: QuestionRecord): string {
  return r.is_active ? 'Active' : 'Archived';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminQuestionBankContent() {
  const [activeTab, setActiveTab] = useState<TableKey>('technical');
  const [tables, setTables] = useState<Record<TableKey, TableData>>({
    technical: { records: [], loading: false, error: null },
    hr: { records: [], loading: false, error: null },
    managerial: { records: [], loading: false, error: null },
  });
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const [modal, setModal] = useState<{ mode: 'create' | 'edit' | 'preview'; record?: QuestionRecord } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; tableKey: TableKey } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTable = useCallback(async (tableKey: TableKey) => {
    setTables(prev => ({ ...prev, [tableKey]: { ...prev[tableKey], loading: true, error: null } }));
    try {
      const category = TABLE_CONFIG[tableKey].category;
      const res = await fetch(`/api/questions?active=false&limit=200&category=${encodeURIComponent(category)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      const records: QuestionRecord[] = Array.isArray(data.data) ? data.data : [];
      setTables(prev => ({ ...prev, [tableKey]: { records, loading: false, error: null } }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch';
      setTables(prev => ({ ...prev, [tableKey]: { ...prev[tableKey], loading: false, error: message } }));
    }
  }, []);

  const syncAll = useCallback(async () => {
    setSyncing(true);
    await Promise.all((['technical', 'hr', 'managerial'] as TableKey[]).map(fetchTable));
    setSyncing(false);
    setLastSynced(new Date());
  }, [fetchTable]);

  useEffect(() => {
    syncAll();
  }, [syncAll]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, Category: TABLE_CONFIG[activeTab].category });
    setSaveError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (record: QuestionRecord) => {
    setForm({
      Question: record.text || '',
      Category: record.category || '',
      Difficulty: record.difficulty || 'Medium',
      'Job Role': record.technology || '',
      Status: statusFromRecord(record),
    });
    setSaveError(null);
    setModal({ mode: 'edit', record });
  };

  const openPreview = (record: QuestionRecord) => {
    setModal({ mode: 'preview', record });
  };

  const handleSave = async () => {
    if (!form.Question.trim()) {
      setSaveError('Question text is required');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const category = form.Category.trim() || TABLE_CONFIG[activeTab].category;
    const payload = {
      text: form.Question.trim(),
      category,
      difficulty: form.Difficulty || 'Medium',
      technology: form['Job Role'].trim() || null,
      is_active: form.Status !== 'Archived',
    };
    try {
      if (modal?.mode === 'create') {
        const res = await fetch('/api/questions', {
          method: 'POST',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create');
        const created = data.data as QuestionRecord;
        const targetKey = (Object.keys(TABLE_CONFIG) as TableKey[]).find(
          (k) => TABLE_CONFIG[k].category.toLowerCase() === (created.category || category).toLowerCase()
        ) || activeTab;
        setTables(prev => ({
          ...prev,
          [targetKey]: {
            ...prev[targetKey],
            records: [created, ...prev[targetKey].records],
          },
        }));
      } else if (modal?.mode === 'edit' && modal.record) {
        const res = await fetch(`/api/questions/${modal.record.id}`, {
          method: 'PATCH',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update');
        const updated = (data.data || { ...modal.record, ...payload }) as QuestionRecord;
        setTables(prev => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            records: prev[activeTab].records.map(r =>
              r.id === modal.record!.id ? updated : r
            ),
          },
        }));
      }
      setModal(null);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/questions/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: csrfHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setTables(prev => ({
        ...prev,
        [deleteConfirm.tableKey]: {
          ...prev[deleteConfirm.tableKey],
          records: prev[deleteConfirm.tableKey].records.filter(r => r.id !== deleteConfirm.id),
        },
      }));
      setDeleteConfirm(null);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const currentTable = tables[activeTab];
  const config = TABLE_CONFIG[activeTab];

  const filteredRecords = currentTable.records.filter(r => {
    const q = r.text?.toLowerCase() || '';
    const cat = r.category?.toLowerCase() || '';
    const role = r.technology?.toLowerCase() || '';
    const status = statusFromRecord(r);
    const matchSearch = !search || q.includes(search.toLowerCase()) || cat.includes(search.toLowerCase()) || role.includes(search.toLowerCase());
    const matchDiff = difficultyFilter === 'All' || r.difficulty === difficultyFilter;
    const matchStatus = statusFilter === 'All' || status === statusFilter;
    return matchSearch && matchDiff && matchStatus;
  });

  const totalAll = Object.values(tables).reduce((sum, t) => sum + t.records.length, 0);

  return (
    <AppLayout role="admin">
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Database size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Question Bank</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live Supabase questions · {totalAll} total
                  {lastSynced && (
                    <span className="ml-2 text-slate-400">
                      Last synced {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={syncAll}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Refresh'}
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={14} />
                Add Question
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="px-6 py-4 grid grid-cols-3 gap-4">
          {(Object.keys(TABLE_CONFIG) as TableKey[]).map(key => {
            const cfg = TABLE_CONFIG[key];
            const count = tables[key].records.length;
            const active = tables[key].records.filter(r => r.is_active).length;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  activeTab === key
                    ? `${cfg.bg} ${cfg.border} shadow-sm`
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${activeTab === key ? cfg.color : 'text-slate-500'}`}>
                    {cfg.icon}
                    {cfg.label}
                  </div>
                  {tables[key].loading && <Loader2 size={12} className="animate-spin text-slate-400" />}
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-2xl font-bold ${activeTab === key ? cfg.color : 'text-slate-800'}`}>{count}</span>
                  <span className="text-xs text-slate-500 mb-0.5">{active} active</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Table Section */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search questions…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={13} className="text-slate-400" />
                <select
                  value={difficultyFilter}
                  onChange={e => setDifficultyFilter(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600"
                >
                  <option>All</option>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600"
                >
                  <option>All</option>
                  <option>Active</option>
                  <option>Archived</option>
                </select>
              </div>
              <span className="ml-auto text-xs text-slate-400">{filteredRecords.length} results</span>
            </div>

            {/* Table */}
            {currentTable.loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Loading questions…</span>
              </div>
            ) : currentTable.error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle size={24} className="text-red-400" />
                <p className="text-sm text-red-600">{currentTable.error}</p>
                <button
                  onClick={() => fetchTable(activeTab)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <BookOpen size={24} className="text-slate-300" />
                <p className="text-sm text-slate-500">
                  {currentTable.records.length === 0 ? 'No questions yet. Add your first question.' : 'No questions match your filters.'}
                </p>
                {currentTable.records.length === 0 && (
                  <button onClick={openCreate} className="text-xs text-indigo-600 hover:underline">
                    Add Question
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-10">S.No</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-[38%]">Question</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Category</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Difficulty</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Technology</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Status</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredRecords.map((record, idx) => {
                      const status = statusFromRecord(record);
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="px-4 py-3 text-xs text-slate-400 font-600">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <p className="text-slate-800 font-medium line-clamp-2 leading-snug">
                              {record.text || <span className="text-slate-400 italic">No question text</span>}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-600 text-xs">{record.category || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {record.difficulty ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_STYLES[record.difficulty] || 'bg-slate-100 text-slate-600'}`}>
                                {record.difficulty}
                              </span>
                            ) : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-600 text-xs">{record.technology || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openPreview(record)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                                title="Preview"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => openEdit(record)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ id: record.id, tableKey: activeTab })}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
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

      {/* Create / Edit Modal */}
      {modal && (modal.mode === 'create' || modal.mode === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ${config.accent} flex items-center justify-center text-white`}>
                  {config.icon}
                </div>
                <h2 className="font-semibold text-slate-900">
                  {modal.mode === 'create' ? `Add to ${config.label}` : 'Edit Question'}
                </h2>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Question <span className="text-red-500">*</span></label>
                <textarea
                  value={form.Question}
                  onChange={e => setForm(f => ({ ...f, Question: e.target.value }))}
                  rows={3}
                  placeholder="Enter the interview question…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Category</label>
                  <input
                    type="text"
                    value={form.Category}
                    onChange={e => setForm(f => ({ ...f, Category: e.target.value }))}
                    placeholder="e.g. Technical"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Technology</label>
                  <input
                    type="text"
                    value={form['Job Role']}
                    onChange={e => setForm(f => ({ ...f, 'Job Role': e.target.value }))}
                    placeholder="e.g. React"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Difficulty</label>
                  <select
                    value={form.Difficulty}
                    onChange={e => setForm(f => ({ ...f, Difficulty: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Status</label>
                  <select
                    value={form.Status}
                    onChange={e => setForm(f => ({ ...f, Status: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  >
                    <option>Active</option>
                    <option>Archived</option>
                  </select>
                </div>
              </div>
              {saveError && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={13} />
                  {saveError}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {modal.mode === 'create' ? 'Create Question' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {modal?.mode === 'preview' && modal.record && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-slate-500" />
                <h2 className="font-semibold text-slate-900">Question Preview</h2>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className={`p-4 rounded-xl ${config.bg} ${config.border} border`}>
                <p className="text-sm font-medium text-slate-800 leading-relaxed">
                  {modal.record.text || 'No question text'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Tab', value: config.label },
                  { label: 'Category', value: modal.record.category },
                  { label: 'Difficulty', value: modal.record.difficulty },
                  { label: 'Technology', value: modal.record.technology },
                  { label: 'Status', value: statusFromRecord(modal.record) },
                  { label: 'ID', value: modal.record.id },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-800 break-all">{value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => { setModal(null); openEdit(modal.record!); }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <Edit2 size={13} />
                Edit
              </button>
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Delete Question</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Are you sure you want to permanently delete this question?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
