'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { Key, RefreshCw, XCircle, Eye, EyeOff, Plus, Clock, CheckCircle, AlertCircle, Shield, ChevronDown, ChevronUp, Download, Loader2, RotateCcw, Info } from 'lucide-react';

interface APIKey {
  id: string;
  provider: string;
  label: string;
  masked_key: string;
  status: 'active' | 'revoked' | 'rotating';
  created_at: string;
  last_rotated_at: string | null;
  revoked_at: string | null;
  notes: string | null;
}

interface AuditEntry {
  id: string;
  provider: string;
  operation: 'created' | 'rotated' | 'revoked' | 'viewed' | 'validated';
  performed_by_email: string | null;
  performed_by_role: string | null;
  ip_address: string | null;
  outcome: 'success' | 'failure';
  details: Record<string, unknown> | null;
  created_at: string;
}

const PROVIDER_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  openai:     { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/25', label: 'OpenAI' },
  anthropic:  { color: 'text-violet-400',  bg: 'bg-violet-400/10',  border: 'border-violet-400/25',  label: 'Anthropic' },
  gemini:     { color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/25',    label: 'Gemini' },
  perplexity: { color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/25',   label: 'Perplexity' },
  groq:       { color: 'text-pink-400',    bg: 'bg-pink-400/10',    border: 'border-pink-400/25',    label: 'Groq' },
};

const STATUS_CONFIG = {
  active:   { label: 'Active',    cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25', icon: <CheckCircle size={11} /> },
  revoked:  { label: 'Revoked',   cls: 'text-red-400 bg-red-400/10 border-red-400/25',             icon: <XCircle size={11} /> },
  rotating: { label: 'Rotating',  cls: 'text-amber-400 bg-amber-400/10 border-amber-400/25',       icon: <RefreshCw size={11} /> },
};

const OP_CONFIG: Record<string, { label: string; cls: string }> = {
  created:   { label: 'Created',   cls: 'text-emerald-400 bg-emerald-400/10' },
  rotated:   { label: 'Rotated',   cls: 'text-blue-400 bg-blue-400/10' },
  revoked:   { label: 'Revoked',   cls: 'text-red-400 bg-red-400/10' },
  viewed:    { label: 'Viewed',    cls: 'text-slate-400 bg-slate-400/10' },
  validated: { label: 'Validated', cls: 'text-violet-400 bg-violet-400/10' },
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function APIKeyManagementContent() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState<APIKey | null>(null);
  const [newMaskedKey, setNewMaskedKey] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [addForm, setAddForm] = useState({ provider: 'openai', label: 'Production', masked_key: '', notes: '' });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const keysRes = await fetch('/api/admin/api-keys');
      if (!keysRes.ok) {
        const err = await keysRes.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load API keys (${keysRes.status})`);
      }
      const { data: keyData } = await keysRes.json();
      const list: APIKey[] = Array.isArray(keyData) ? keyData : [];
      setKeys(list);

      if (list.length === 0) {
        setAudit([]);
        return;
      }

      const auditResults = await Promise.all(
        list.map(async (k) => {
          try {
            const res = await fetch(`/api/admin/api-keys/${k.id}/audit`);
            if (!res.ok) return [] as AuditEntry[];
            const json = await res.json();
            return (Array.isArray(json.data) ? json.data : []) as AuditEntry[];
          } catch {
            return [] as AuditEntry[];
          }
        })
      );
      const merged = auditResults
        .flat()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAudit(merged);
    } catch (err: any) {
      setKeys([]);
      setAudit([]);
      setLoadError(err?.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRotate = async () => {
    if (!showRotateModal || !newMaskedKey.trim()) return;
    setActionLoading(showRotateModal.id);
    try {
      const res = await fetch(`/api/admin/api-keys/${showRotateModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'rotate', masked_key: newMaskedKey, notes: newNotes }),
      });
      if (res.ok) {
        showToast(`${PROVIDER_META[showRotateModal.provider]?.label} key rotated successfully`);
        setKeys((prev) => prev.map((k) => k.id === showRotateModal.id
          ? { ...k, masked_key: newMaskedKey, last_rotated_at: new Date().toISOString(), status: 'active' }
          : k));
        setAudit((prev) => [{
          id: Date.now().toString(), provider: showRotateModal.provider, operation: 'rotated',
          performed_by_email: 'you', performed_by_role: 'super_admin', ip_address: 'current',
          outcome: 'success', details: null, created_at: new Date().toISOString(),
        }, ...prev]);
      } else {
        showToast('Rotation failed', 'error');
      }
    } catch {
      showToast('Rotation failed', 'error');
    } finally {
      setActionLoading(null);
      setShowRotateModal(null);
      setNewMaskedKey('');
      setNewNotes('');
    }
  };

  const handleRevoke = async (key: APIKey) => {
    if (!confirm(`Revoke the ${PROVIDER_META[key.provider]?.label} key? This cannot be undone.`)) return;
    setActionLoading(key.id);
    try {
      const res = await fetch(`/api/admin/api-keys/${key.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'revoke' }),
      });
      if (res.ok) {
        showToast(`${PROVIDER_META[key.provider]?.label} key revoked`);
        setKeys((prev) => prev.map((k) => k.id === key.id ? { ...k, status: 'revoked', revoked_at: new Date().toISOString() } : k));
        setAudit((prev) => [{
          id: Date.now().toString(), provider: key.provider, operation: 'revoked',
          performed_by_email: 'you', performed_by_role: 'super_admin', ip_address: 'current',
          outcome: 'success', details: null, created_at: new Date().toISOString(),
        }, ...prev]);
      } else {
        showToast('Revoke failed', 'error');
      }
    } catch {
      showToast('Revoke failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdd = async () => {
    if (!addForm.masked_key.trim()) return;
    setActionLoading('add');
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        const { data } = await res.json();
        showToast(`${PROVIDER_META[addForm.provider]?.label} key added`);
        setKeys((prev) => [...prev, data]);
        setAudit((prev) => [{
          id: Date.now().toString(), provider: addForm.provider, operation: 'created',
          performed_by_email: 'you', performed_by_role: 'super_admin', ip_address: 'current',
          outcome: 'success', details: null, created_at: new Date().toISOString(),
        }, ...prev]);
      } else {
        showToast('Failed to add key', 'error');
      }
    } catch {
      showToast('Failed to add key', 'error');
    } finally {
      setActionLoading(null);
      setShowAddModal(false);
      setAddForm({ provider: 'openai', label: 'Production', masked_key: '', notes: '' });
    }
  };

  const exportAudit = () => {
    const csv = [
      'Date,Provider,Operation,Performed By,Role,IP,Outcome',
      ...audit.map((a) =>
        `"${fmt(a.created_at)}","${a.provider}","${a.operation}","${a.performed_by_email ?? ''}","${a.performed_by_role ?? ''}","${a.ip_address ?? ''}","${a.outcome}"`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-key-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeCount = keys.filter((k) => k.status === 'active').length;
  const revokedCount = keys.filter((k) => k.status === 'revoked').length;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-500 border ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-700 text-foreground flex items-center gap-2">
              <Key size={20} className="text-primary" /> API Key Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage, rotate, and revoke API keys for all AI providers. Full audit trail included.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportAudit} className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border hover:bg-muted rounded-md px-3 py-1.5 transition-colors">
              <Download size={13} /> Export Audit
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 hover:bg-primary/10 rounded-md px-3 py-1.5 transition-colors">
              <Plus size={13} /> Add Key
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Keys', value: keys.length, icon: <Key size={16} />, cls: 'text-primary' },
            { label: 'Active', value: activeCount, icon: <CheckCircle size={16} />, cls: 'text-emerald-400' },
            { label: 'Revoked', value: revokedCount, icon: <XCircle size={16} />, cls: 'text-red-400' },
            { label: 'Audit Events', value: audit.length, icon: <Clock size={16} />, cls: 'text-amber-400' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
              <span className={kpi.cls}>{kpi.icon}</span>
              <div>
                <p className="text-lg font-700 text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {loadError && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-600 text-amber-300">Could not load keys</p>
              <p className="text-xs text-amber-400/90 mt-0.5">{loadError}</p>
            </div>
          </div>
        )}

        {/* Keys table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-600 text-foreground">Provider API Keys</h2>
            <button onClick={fetchData} className="text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Key size={32} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No API keys registered yet.</p>
              <button onClick={() => setShowAddModal(true)} className="text-xs text-primary border border-primary/30 hover:bg-primary/10 rounded-md px-3 py-1.5 transition-colors">
                Add First Key
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {keys.map((key) => {
                const meta = PROVIDER_META[key.provider] ?? { color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/25', label: key.provider };
                const statusCfg = STATUS_CONFIG[key.status];
                const isExpanded = expandedKey === key.id;
                const isRevealed = revealedKeys.has(key.id);
                const keyAudit = audit.filter((a) => a.provider === key.provider);

                return (
                  <div key={key.id}>
                    <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Provider badge */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${meta.bg} ${meta.border} min-w-[130px]`}>
                        <Shield size={14} className={meta.color} />
                        <span className={`text-sm font-600 ${meta.color}`}>{meta.label}</span>
                      </div>

                      {/* Key info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-foreground bg-muted px-2 py-0.5 rounded">
                            {isRevealed ? key.masked_key : key.masked_key.replace(/[^•]/g, '•').slice(0, 24) + '••••'}
                          </span>
                          <button onClick={() => toggleReveal(key.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                            {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <span className={`flex items-center gap-1 text-xs font-500 px-2 py-0.5 rounded-full border ${statusCfg.cls}`}>
                            {statusCfg.icon} {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={11} /> Created {fmt(key.created_at)}
                          </span>
                          {key.last_rotated_at && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <RotateCcw size={11} /> Rotated {fmt(key.last_rotated_at)}
                            </span>
                          )}
                          {key.revoked_at && (
                            <span className="text-xs text-red-400 flex items-center gap-1">
                              <XCircle size={11} /> Revoked {fmt(key.revoked_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {key.status !== 'revoked' && (
                          <>
                            <button
                              onClick={() => { setShowRotateModal(key); setNewMaskedKey(''); setNewNotes(''); }}
                              disabled={actionLoading === key.id}
                              className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === key.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                              Rotate
                            </button>
                            <button
                              onClick={() => handleRevoke(key)}
                              disabled={actionLoading === key.id}
                              className="flex items-center gap-1.5 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
                            >
                              <XCircle size={12} /> Revoke
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setExpandedKey(isExpanded ? null : key.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded audit trail for this provider */}
                    {isExpanded && (
                      <div className="bg-muted/30 border-t border-border px-5 py-4">
                        <p className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">
                          Audit Trail — {meta.label}
                        </p>
                        {keyAudit.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No audit events yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {keyAudit.slice(0, 10).map((entry) => {
                              const opCfg = OP_CONFIG[entry.operation] ?? { label: entry.operation, cls: 'text-slate-400 bg-slate-400/10' };
                              return (
                                <div key={entry.id} className="flex items-start gap-3 text-xs">
                                  <span className={`px-2 py-0.5 rounded text-xs font-500 shrink-0 ${opCfg.cls}`}>{opCfg.label}</span>
                                  <span className="text-muted-foreground">{fmt(entry.created_at)}</span>
                                  <span className="text-foreground">{entry.performed_by_email ?? 'system'}</span>
                                  {entry.ip_address && <span className="text-muted-foreground font-mono">{entry.ip_address}</span>}
                                  <span className={entry.outcome === 'success' ? 'text-emerald-400' : 'text-red-400'}>{entry.outcome}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Full audit trail */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-600 text-foreground">Full Audit Trail</h2>
            <span className="text-xs text-muted-foreground">{audit.length} events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['S.No', 'Date & Time', 'Provider', 'Operation', 'Performed By', 'IP Address', 'Outcome'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-600 text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {audit.map((entry, idx) => {
                  const meta = PROVIDER_META[entry.provider];
                  const opCfg = OP_CONFIG[entry.operation] ?? { label: entry.operation, cls: 'text-slate-400 bg-slate-400/10' };
                  return (
                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground font-600">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmt(entry.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`font-600 ${meta?.color ?? 'text-foreground'}`}>{meta?.label ?? entry.provider}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded font-500 ${opCfg.cls}`}>{opCfg.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-foreground">{entry.performed_by_email ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{entry.ip_address ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={entry.outcome === 'success' ? 'text-emerald-400' : 'text-red-400'}>{entry.outcome}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rotate Modal */}
        {showRotateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-2">
                <RotateCcw size={18} className="text-blue-400" />
                <h3 className="text-base font-700 text-foreground">
                  Rotate {PROVIDER_META[showRotateModal.provider]?.label} Key
                </h3>
              </div>
              <div className="flex items-start gap-2 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2.5">
                <Info size={13} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">Enter the masked representation of the new key (e.g. <code className="font-mono">sk-••••••••1234</code>). The actual key value is never stored here.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-600 text-muted-foreground block mb-1">New Masked Key *</label>
                  <input
                    value={newMaskedKey}
                    onChange={(e) => setNewMaskedKey(e.target.value)}
                    placeholder="sk-••••••••••••••••xxxx"
                    className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-600 text-muted-foreground block mb-1">Notes (optional)</label>
                  <input
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Reason for rotation..."
                    className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setShowRotateModal(null)} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors">Cancel</button>
                <button
                  onClick={handleRotate}
                  disabled={!newMaskedKey.trim() || actionLoading === showRotateModal.id}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-600 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {actionLoading === showRotateModal.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Rotate Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Key Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-primary" />
                <h3 className="text-base font-700 text-foreground">Add API Key</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-600 text-muted-foreground block mb-1">Provider *</label>
                  <select
                    value={addForm.provider}
                    onChange={(e) => setAddForm((f) => ({ ...f, provider: e.target.value }))}
                    className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {Object.entries(PROVIDER_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-600 text-muted-foreground block mb-1">Label</label>
                  <input
                    value={addForm.label}
                    onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Production"
                    className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-600 text-muted-foreground block mb-1">Masked Key *</label>
                  <input
                    value={addForm.masked_key}
                    onChange={(e) => setAddForm((f) => ({ ...f, masked_key: e.target.value }))}
                    placeholder="sk-••••••••••••••••xxxx"
                    className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-600 text-muted-foreground block mb-1">Notes</label>
                  <input
                    value={addForm.notes}
                    onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes..."
                    className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors">Cancel</button>
                <button
                  onClick={handleAdd}
                  disabled={!addForm.masked_key.trim() || actionLoading === 'add'}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-600 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'add' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add Key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
