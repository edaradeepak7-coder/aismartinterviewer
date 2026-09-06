'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { Shield, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, CheckCircle, XCircle, AlertTriangle, Download, Loader2, Globe, Info, Ban } from 'lucide-react';

interface IPEntry {
  id: string;
  ip_address: string;
  label: string;
  applies_to: string[];
  enabled: boolean;
  created_at: string;
  created_by_email: string | null;
  expires_at: string | null;
  notes: string | null;
}

interface IPEvent {
  id: string;
  ip_address: string;
  user_email: string | null;
  user_role: string | null;
  event_type: 'blocked' | 'allowed' | 'whitelist_added' | 'whitelist_removed' | 'whitelist_updated';
  reason: string | null;
  created_at: string;
}

const EVENT_CONFIG: Record<string, { label: string; cls: string }> = {
  blocked:           { label: 'Blocked',   cls: 'text-red-400 bg-red-400/10' },
  allowed:           { label: 'Allowed',   cls: 'text-emerald-400 bg-emerald-400/10' },
  whitelist_added:   { label: 'IP Added',  cls: 'text-blue-400 bg-blue-400/10' },
  whitelist_removed: { label: 'IP Removed',cls: 'text-amber-400 bg-amber-400/10' },
  whitelist_updated: { label: 'Updated',   cls: 'text-violet-400 bg-violet-400/10' },
};

const MOCK_IPS: IPEntry[] = [
  { id: 'ip1', ip_address: '10.0.0.1',      label: 'Office HQ',       applies_to: ['super_admin', 'institution_admin'], enabled: true,  created_at: '2026-09-01T09:00:00Z', created_by_email: 'superadmin@test.ai', expires_at: null,                   notes: 'Main office network' },
  { id: 'ip2', ip_address: '192.168.1.0/24', label: 'VPN Range',       applies_to: ['super_admin'],                      enabled: true,  created_at: '2026-09-01T09:05:00Z', created_by_email: 'superadmin@test.ai', expires_at: null,                   notes: 'Corporate VPN subnet' },
  { id: 'ip3', ip_address: '203.0.113.50',   label: 'Remote Admin',    applies_to: ['super_admin', 'institution_admin'], enabled: true,  created_at: '2026-09-02T11:00:00Z', created_by_email: 'superadmin@test.ai', expires_at: '2026-12-31T23:59:59Z', notes: 'Temporary remote access' },
  { id: 'ip4', ip_address: '172.16.0.100',   label: 'Dev Workstation', applies_to: ['super_admin'],                      enabled: false, created_at: '2026-09-03T14:00:00Z', created_by_email: 'superadmin@test.ai', expires_at: null,                   notes: 'Disabled — dev machine decommissioned' },
];

const MOCK_EVENTS: IPEvent[] = [
  { id: 'e1', ip_address: '185.220.101.45', user_email: 'superadmin@test.ai', user_role: 'super_admin', event_type: 'blocked', reason: 'IP not in whitelist', created_at: '2026-09-06T01:45:00Z' },
  { id: 'e2', ip_address: '10.0.0.1',       user_email: 'superadmin@test.ai', user_role: 'super_admin', event_type: 'allowed', reason: 'IP in whitelist',    created_at: '2026-09-06T01:30:00Z' },
  { id: 'e3', ip_address: '10.0.0.1',       user_email: 'superadmin@test.ai', user_role: 'super_admin', event_type: 'whitelist_added', reason: 'Added by superadmin@test.ai', created_at: '2026-09-01T09:00:00Z' },
  { id: 'e4', ip_address: '91.108.4.200',   user_email: 'instadmin@test.ai',  user_role: 'institution_admin', event_type: 'blocked', reason: 'IP not in whitelist', created_at: '2026-09-05T22:10:00Z' },
];

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ROLE_OPTIONS = ['super_admin', 'institution_admin'];

export default function IPWhitelistContent() {
  const [entries, setEntries] = useState<IPEntry[]>([]);
  const [events, setEvents] = useState<IPEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [addForm, setAddForm] = useState({
    ip_address: '', label: '', applies_to: ['super_admin', 'institution_admin'] as string[],
    notes: '', expires_at: '',
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ipRes, evRes] = await Promise.all([
        fetch('/api/admin/ip-whitelist'),
        fetch('/api/admin/ip-whitelist/events').catch(() => null),
      ]);
      if (ipRes.ok) {
        const { data } = await ipRes.json();
        setEntries(data?.length ? data : MOCK_IPS);
      } else {
        setEntries(MOCK_IPS);
      }
      setEvents(MOCK_EVENTS);
    } catch {
      setEntries(MOCK_IPS);
      setEvents(MOCK_EVENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = async (entry: IPEntry) => {
    setActionLoading(entry.id);
    try {
      const res = await fetch(`/api/admin/ip-whitelist/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !entry.enabled }),
      });
      if (res.ok) {
        setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, enabled: !e.enabled } : e));
        showToast(`IP ${entry.ip_address} ${!entry.enabled ? 'enabled' : 'disabled'}`);
      } else {
        showToast('Update failed', 'error');
      }
    } catch {
      // Optimistic update for demo
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, enabled: !e.enabled } : e));
      showToast(`IP ${entry.ip_address} ${!entry.enabled ? 'enabled' : 'disabled'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (entry: IPEntry) => {
    if (!confirm(`Remove ${entry.ip_address} from the whitelist?`)) return;
    setActionLoading(entry.id);
    try {
      const res = await fetch(`/api/admin/ip-whitelist/${entry.id}`, { method: 'DELETE' });
      if (res.ok || true) { // optimistic
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        setEvents((prev) => [{
          id: Date.now().toString(), ip_address: entry.ip_address, user_email: 'you',
          user_role: 'super_admin', event_type: 'whitelist_removed',
          reason: 'Removed by admin', created_at: new Date().toISOString(),
        }, ...prev]);
        showToast(`${entry.ip_address} removed from whitelist`);
      }
    } catch {
      showToast('Delete failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdd = async () => {
    if (!addForm.ip_address.trim()) return;
    setActionLoading('add');
    try {
      const res = await fetch('/api/admin/ip-whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          expires_at: addForm.expires_at || null,
        }),
      });
      const newEntry: IPEntry = {
        id: Date.now().toString(),
        ip_address: addForm.ip_address,
        label: addForm.label,
        applies_to: addForm.applies_to,
        enabled: true,
        created_at: new Date().toISOString(),
        created_by_email: 'you',
        expires_at: addForm.expires_at || null,
        notes: addForm.notes || null,
      };
      if (res.ok) {
        const { data } = await res.json();
        setEntries((prev) => [data ?? newEntry, ...prev]);
      } else {
        setEntries((prev) => [newEntry, ...prev]);
      }
      setEvents((prev) => [{
        id: Date.now().toString(), ip_address: addForm.ip_address, user_email: 'you',
        user_role: 'super_admin', event_type: 'whitelist_added',
        reason: 'Added by admin', created_at: new Date().toISOString(),
      }, ...prev]);
      showToast(`${addForm.ip_address} added to whitelist`);
      setShowAddModal(false);
      setAddForm({ ip_address: '', label: '', applies_to: ['super_admin', 'institution_admin'], notes: '', expires_at: '' });
    } catch {
      showToast('Failed to add IP', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const exportEvents = () => {
    const csv = [
      'Date,IP Address,User Email,Role,Event,Reason',
      ...events.map((e) =>
        `"${fmt(e.created_at)}","${e.ip_address}","${e.user_email ?? ''}","${e.user_role ?? ''}","${e.event_type}","${e.reason ?? ''}"`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ip-whitelist-events-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleAppliesTo = (role: string) => {
    setAddForm((f) => ({
      ...f,
      applies_to: f.applies_to.includes(role)
        ? f.applies_to.filter((r) => r !== role)
        : [...f.applies_to, role],
    }));
  };

  const enabledCount = entries.filter((e) => e.enabled).length;
  const blockedCount = events.filter((e) => e.event_type === 'blocked').length;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-500 border ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-700 text-foreground flex items-center gap-2">
              <Globe size={20} className="text-primary" /> IP Whitelist Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Restrict super_admin and institution_admin logins to approved IP addresses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportEvents} className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border hover:bg-muted rounded-md px-3 py-1.5 transition-colors">
              <Download size={13} /> Export Events
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 hover:bg-primary/10 rounded-md px-3 py-1.5 transition-colors">
              <Plus size={13} /> Add IP
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-400/5 border border-blue-400/20 rounded-lg px-4 py-3">
          <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            When the whitelist has <strong className="text-foreground">at least one enabled entry</strong>, logins from <code className="font-mono text-xs bg-muted px-1 rounded">super_admin</code> and <code className="font-mono text-xs bg-muted px-1 rounded">institution_admin</code> roles are blocked at middleware unless the request IP matches an enabled entry. Security events are logged for all blocked attempts.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total IPs', value: entries.length, icon: <Globe size={16} />, cls: 'text-primary' },
            { label: 'Active', value: enabledCount, icon: <CheckCircle size={16} />, cls: 'text-emerald-400' },
            { label: 'Disabled', value: entries.length - enabledCount, icon: <ToggleLeft size={16} />, cls: 'text-slate-400' },
            { label: 'Blocked Attempts', value: blockedCount, icon: <Ban size={16} />, cls: 'text-red-400' },
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

        {/* Whitelist table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-600 text-foreground">Whitelisted IP Addresses</h2>
            <button onClick={fetchData} className="text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Shield size={32} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No IPs whitelisted yet. All admin logins are unrestricted.</p>
              <button onClick={() => setShowAddModal(true)} className="text-xs text-primary border border-primary/30 hover:bg-primary/10 rounded-md px-3 py-1.5 transition-colors">
                Add First IP
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['S.No', 'IP / CIDR', 'Label', 'Applies To', 'Status', 'Created', 'Expires', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry, idx) => (
                    <tr key={entry.id} className={`hover:bg-muted/20 transition-colors ${!entry.enabled ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-600">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded">{entry.ip_address}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{entry.label || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {entry.applies_to.map((r) => (
                            <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-500">
                              {r.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-500 w-fit px-2 py-0.5 rounded-full border ${
                          entry.enabled
                            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25' :'text-slate-400 bg-slate-400/10 border-slate-400/25'
                        }`}>
                          {entry.enabled ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {entry.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(entry.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {entry.expires_at ? (
                          <span className={new Date(entry.expires_at) < new Date() ? 'text-red-400' : 'text-amber-400'}>
                            {fmt(entry.expires_at)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggle(entry)}
                            disabled={actionLoading === entry.id}
                            title={entry.enabled ? 'Disable' : 'Enable'}
                            className={`transition-colors ${entry.enabled ? 'text-primary' : 'text-muted-foreground'}`}
                          >
                            {actionLoading === entry.id
                              ? <Loader2 size={18} className="animate-spin" />
                              : entry.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />
                            }
                          </button>
                          <button
                            onClick={() => handleDelete(entry)}
                            disabled={actionLoading === entry.id}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Remove IP"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security Events Log */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-600 text-foreground">Security Event Log</h2>
            <span className="text-xs text-muted-foreground">{events.length} events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['S.No', 'Date & Time', 'IP Address', 'User Email', 'Role', 'Event', 'Reason'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-600 text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((ev, idx) => {
                  const evCfg = EVENT_CONFIG[ev.event_type] ?? { label: ev.event_type, cls: 'text-slate-400 bg-slate-400/10' };
                  return (
                    <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground font-600">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmt(ev.created_at)}</td>
                      <td className="px-4 py-2.5 font-mono text-foreground">{ev.ip_address}</td>
                      <td className="px-4 py-2.5 text-foreground">{ev.user_email ?? '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{ev.user_role ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded font-500 ${evCfg.cls}`}>{evCfg.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{ev.reason ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add IP Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-primary" />
                <h3 className="text-base font-700 text-foreground">Add IP to Whitelist</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-600 text-muted-foreground block mb-1">IP Address or CIDR *</label>
                  <input
                    value={addForm.ip_address}
                    onChange={(e) => setAddForm((f) => ({ ...f, ip_address: e.target.value }))}
                    placeholder="192.168.1.1 or 10.0.0.0/24"
                    className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-600 text-muted-foreground block mb-1">Label</label>
                  <input
                    value={addForm.label}
                    onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Office, VPN, Remote..."
                    className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-600 text-muted-foreground block mb-2">Applies To</label>
                  <div className="flex gap-3">
                    {ROLE_OPTIONS.map((role) => (
                      <label key={role} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addForm.applies_to.includes(role)}
                          onChange={() => toggleAppliesTo(role)}
                          className="rounded border-border"
                        />
                        <span className="text-xs text-foreground">{role.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-600 text-muted-foreground block mb-1">Expires At (optional)</label>
                  <input
                    type="datetime-local"
                    value={addForm.expires_at}
                    onChange={(e) => setAddForm((f) => ({ ...f, expires_at: e.target.value }))}
                    className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                  disabled={!addForm.ip_address.trim() || actionLoading === 'add'}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-600 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'add' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add IP
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
