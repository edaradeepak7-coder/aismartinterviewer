'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, LogOut, Trash2, Search, AlertTriangle, CheckCircle2, History,
  RefreshCw, Users, ShieldCheck, Loader2, Clock,
} from 'lucide-react';
import MFASetupPanel from '@/components/MFASetupPanel';
import { useAuth } from '@/contexts/AuthContext';
import { csrfHeaders } from '@/lib/api/apiClient';
import { toast } from 'sonner';

type TabId = 'sessions' | 'history' | 'mfa';

interface ProfileSession {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  tenant_id: string | null;
  updated_at: string | null;
  created_at: string | null;
}

interface AuditEvent {
  id: string;
  action: string;
  user_email?: string | null;
  user_role?: string | null;
  resource_id?: string | null;
  ip_address?: string | null;
  outcome?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'sessions', label: 'Active Users', icon: <Shield size={15} /> },
  { id: 'history', label: 'Revocation History', icon: <History size={15} /> },
  { id: 'mfa', label: 'Two-Factor Auth', icon: <ShieldCheck size={15} /> },
];

function fmtRelative(iso: string | null) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '—';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function roleLabel(role: string | null) {
  if (!role) return '—';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SessionManagementContent() {
  const [activeTab, setActiveTab] = useState<TabId>('sessions');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [profiles, setProfiles] = useState<ProfileSession[]>([]);
  const [history, setHistory] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [revokeAllConfirm, setRevokeAllConfirm] = useState(false);
  const { user } = useAuth();

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/sessions');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Failed to load (${res.status})`);
      setProfiles(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      setProfiles([]);
      setLoadError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/audit-logs?action=session_revoked&limit=50');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setHistory([]);
        return;
      }
      setHistory(Array.isArray(json.logs) ? json.logs : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory]);

  const roles = Array.from(new Set(profiles.map((p) => p.role).filter(Boolean))) as string[];

  const filtered = profiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    const name = (p.full_name || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    const matchSearch = !q || name.includes(q) || email.includes(q) || (p.role || '').includes(q);
    const matchRole = roleFilter === 'all' || p.role === roleFilter;
    return matchSearch && matchRole;
  });

  const filteredHistory = history.filter((h) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const email = String(h.details?.revoked_user_email || h.user_email || '').toLowerCase();
    return email.includes(q) || (h.ip_address || '').includes(q) || h.action.includes(q);
  });

  const handleRevoke = async (userId: string) => {
    if (userId === user?.id) {
      toast.error('Cannot revoke your own session from this list');
      return;
    }
    if (!confirm('Sign this user out of all sessions?')) return;
    setActionLoading(userId);
    try {
      const res = await fetch('/api/sessions', {
        method: 'DELETE',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Revoke failed');
      toast.success('User sessions revoked');
      await fetchSessions();
      if (activeTab === 'history') await fetchHistory();
    } catch (err: any) {
      toast.error(err?.message || 'Revoke failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!revokeAllConfirm) {
      setRevokeAllConfirm(true);
      return;
    }
    const targets = filtered.filter((p) => p.id !== user?.id);
    if (targets.length === 0) {
      toast.message('No other users to revoke');
      setRevokeAllConfirm(false);
      return;
    }
    setActionLoading('all');
    let ok = 0;
    let fail = 0;
    for (const p of targets) {
      try {
        const res = await fetch('/api/sessions', {
          method: 'DELETE',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ userId: p.id }),
        });
        if (res.ok) ok += 1;
        else fail += 1;
      } catch {
        fail += 1;
      }
    }
    setRevokeAllConfirm(false);
    setActionLoading(null);
    if (ok) toast.success(`Revoked ${ok} user session${ok === 1 ? '' : 's'}`);
    if (fail) toast.error(`${fail} revoke${fail === 1 ? '' : 's'} failed`);
    await fetchSessions();
  };

  const exportCsv = () => {
    const rows = [
      'Name,Email,Role,Last Profile Activity,Created',
      ...filtered.map((p) =>
        `"${p.full_name || ''}","${p.email || ''}","${p.role || ''}","${p.updated_at || ''}","${p.created_at || ''}"`
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Shield size={20} className="text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-700 text-slate-900">Session Management</h1>
            <p className="text-sm text-slate-500">
              Review recently active users and revoke auth sessions. Device/IP detail requires a dedicated session store.
            </p>
          </div>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          Export User List
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Users Listed', value: filtered.length, icon: <Users size={16} />, color: 'bg-teal-50 text-teal-600' },
          { label: 'Roles', value: new Set(filtered.map((p) => p.role).filter(Boolean)).size, icon: <Shield size={16} />, color: 'bg-violet-50 text-violet-600' },
          { label: 'Revocations Logged', value: history.length, icon: <LogOut size={16} />, color: 'bg-amber-50 text-amber-600' },
          { label: 'You', value: user?.email ? 'Online' : '—', icon: <CheckCircle2 size={16} />, color: 'bg-emerald-50 text-emerald-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>{stat.icon}</div>
            <div>
              <p className="text-xl font-700 text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-600 text-amber-800">Could not load users</p>
            <p className="text-xs text-amber-700 mt-0.5">{loadError}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-2 px-5 py-3.5 text-sm font-600 border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600 bg-teal-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'history' ? 'Search email or IP…' : 'Search name, email, role…'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
            />
          </div>
          {activeTab === 'sessions' && (
            <>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="all">All Roles</option>
                {roles.map((r) => (
                  <option key={r} value={r}>{roleLabel(r)}</option>
                ))}
              </select>
              <button
                onClick={fetchSessions}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={handleRevokeAll}
                disabled={actionLoading === 'all'}
                className={[
                  'ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-600 transition-colors disabled:opacity-50',
                  revokeAllConfirm
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'border border-red-200 text-red-600 hover:bg-red-50',
                ].join(' ')}
              >
                <Trash2 size={13} />
                {revokeAllConfirm ? 'Confirm Revoke All?' : 'Revoke All Others'}
              </button>
            </>
          )}
          {activeTab === 'history' && (
            <button
              onClick={fetchHistory}
              className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={13} className={historyLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
        </div>

        {activeTab === 'sessions' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-500 text-sm">
                <Loader2 size={18} className="animate-spin" /> Loading users…
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['S.No', 'User', 'Role', 'Last Profile Activity', 'Joined', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-700 text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((p, idx) => {
                    const isCurrent = p.id === user?.id;
                    const initials = (p.full_name || p.email || '?')
                      .split(/[\s@]/)
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <tr key={p.id} className={['hover:bg-slate-50/50 transition-colors', isCurrent ? 'bg-teal-50/20' : ''].join(' ')}>
                        <td className="px-5 py-3.5 text-xs text-slate-400 font-600">{idx + 1}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-700 text-slate-600 shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-600 text-slate-900">{p.full_name || 'Unnamed'}</span>
                                {isCurrent && (
                                  <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-600">You</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">{p.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700">{roleLabel(p.role)}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Clock size={12} className="text-slate-400" />
                            <div>
                              <div className="font-500">{fmtRelative(p.updated_at)}</div>
                              <div className="text-xs text-slate-400">{fmt(p.updated_at)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">{fmt(p.created_at)}</td>
                        <td className="px-5 py-3.5">
                          {isCurrent ? (
                            <span className="text-xs text-slate-400 italic">Current user</span>
                          ) : (
                            <button
                              onClick={() => handleRevoke(p.id)}
                              disabled={actionLoading === p.id || actionLoading === 'all'}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-600 text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === p.id ? <Loader2 size={11} className="animate-spin" /> : <LogOut size={11} />}
                              Revoke Sessions
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-500 text-sm">
                <Loader2 size={18} className="animate-spin" /> Loading history…
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="px-5 py-12 text-center text-slate-400 text-sm">
                No session revocation events logged yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['S.No', 'Revoked User', 'By', 'IP', 'When', 'Outcome'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-700 text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.map((ev, idx) => (
                    <tr key={ev.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-600">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-600 text-slate-900">
                          {String(ev.details?.revoked_user_email || '—')}
                        </div>
                        <div className="text-xs text-slate-500">
                          {roleLabel(String(ev.details?.revoked_user_role || ''))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">{ev.user_email || '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{ev.ip_address || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">{fmt(ev.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-600 px-2 py-0.5 rounded-full border ${
                          ev.outcome === 'success'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {ev.outcome || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'mfa' && (
          <div className="p-6">
            <div className="max-w-lg">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-slate-900 mb-1">Two-Factor Authentication</h2>
                <p className="text-sm text-slate-500">
                  Protect your account with an authenticator app (TOTP). Required for Super Admin and Institution Admin roles.
                </p>
              </div>
              <MFASetupPanel
                userRole={user?.user_metadata?.role ?? 'candidate'}
                userId={user?.id ?? ''}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
