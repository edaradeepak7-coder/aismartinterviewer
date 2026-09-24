'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { Terminal, Users, Activity, Database, RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react';

type TabId = 'logs' | 'jobs' | 'users';

export default function AdminDiagnosticContent() {
  const [tab, setTab] = useState<TabId>('logs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    auditLogs: { id: string; action: string; outcome: string; created_at: string; user_id?: string; ip_address?: string }[];
    profiles: { total: number; byRole: Record<string, number>; recent: { id: string; email?: string; role: string; created_at: string }[] };
    backgroundJobs: { recent: { id: string; type: string; status: string; created_at: string; error_message?: string }[]; byStatus: Record<string, number> };
    counts: { interviews: number; users: number; auditLogs: number; jobs: number };
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin-diagnostic');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout role="admin">
      <div className="space-y-6 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-700 flex items-center gap-2 text-[#0D1B3E]">
              <Terminal size={20} className="text-teal-600" /> Admin Diagnostic
            </h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">audit_logs · user_profiles · background_jobs</p>
          </div>
          <button onClick={load} className="p-2 border border-[#E8ECF4] rounded-lg text-[#6B7A99]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Users', value: data.counts.users, icon: <Users size={14} /> },
              { label: 'Interviews', value: data.counts.interviews, icon: <Activity size={14} /> },
              { label: 'Audit (recent)', value: data.counts.auditLogs, icon: <Terminal size={14} /> },
              { label: 'Jobs (recent)', value: data.counts.jobs, icon: <Database size={14} /> },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-[#E8ECF4] bg-white p-4">
                <div className="flex items-center gap-2 text-[#6B7A99] text-xs mb-1">{k.icon}{k.label}</div>
                <p className="text-2xl font-700 text-[#0D1B3E]">{k.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 bg-[#F4F6FA] rounded-xl p-1 border border-[#E8ECF4] w-fit">
          {([
            { id: 'logs' as TabId, label: 'Audit Logs' },
            { id: 'jobs' as TabId, label: 'Background Jobs' },
            { id: 'users' as TabId, label: 'Users' },
          ]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-xs font-600 ${tab === t.id ? 'bg-white text-[#0D9488] shadow-sm' : 'text-[#6B7A99]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#6B7A99]" /></div>
        ) : (
          <>
            {tab === 'logs' && (
              <div className="space-y-2">
                {!data?.auditLogs?.length ? (
                  <p className="text-sm text-[#6B7A99] text-center py-12 bg-white border border-[#E8ECF4] rounded-xl">No audit logs yet.</p>
                ) : (
                  data.auditLogs.map((l) => (
                    <div key={l.id} className="rounded-xl border border-[#E8ECF4] bg-white p-4 flex items-start gap-3">
                      {l.outcome === 'success' || l.outcome === 'allowed' ? <CheckCircle2 size={14} className="text-emerald-500 mt-0.5" /> : <XCircle size={14} className="text-red-500 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-600 text-[#0D1B3E]">{l.action}</p>
                        <p className="text-xs text-[#6B7A99]">{l.outcome} · {l.ip_address || '—'} · {new Date(l.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'jobs' && (
              <div className="space-y-2">
                {!data?.backgroundJobs?.recent?.length ? (
                  <p className="text-sm text-[#6B7A99] text-center py-12 bg-white border border-[#E8ECF4] rounded-xl">No background jobs yet.</p>
                ) : (
                  data.backgroundJobs.recent.map((j) => (
                    <div key={j.id} className="rounded-xl border border-[#E8ECF4] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-600 text-[#0D1B3E]">{j.type}</p>
                        <span className="text-[10px] font-700 uppercase text-[#0D9488]">{j.status}</span>
                      </div>
                      <p className="text-xs text-[#6B7A99] mt-1">{new Date(j.created_at).toLocaleString()}</p>
                      {j.error_message && <p className="text-xs text-red-500 mt-1">{j.error_message}</p>}
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'users' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data?.profiles?.byRole || {}).map(([role, count]) => (
                    <span key={role} className="px-3 py-1.5 rounded-full bg-[#F4F6FA] border border-[#E8ECF4] text-xs text-[#6B7A99]">
                      {role}: <strong className="text-[#0D1B3E]">{count}</strong>
                    </span>
                  ))}
                </div>
                <div className="space-y-2">
                  {(data?.profiles?.recent || []).map((u) => (
                    <div key={u.id} className="rounded-xl border border-[#E8ECF4] bg-white p-3 flex items-center gap-3">
                      <Users size={14} className="text-[#6B7A99]" />
                      <div className="flex-1">
                        <p className="text-sm text-[#0D1B3E]">{u.email || u.id}</p>
                        <p className="text-xs text-[#6B7A99]">{u.role} · {new Date(u.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
