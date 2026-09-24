'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, Filter, Loader2, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type SegmentFilter = 'all' | 'candidate' | 'recruiter' | 'institution';

function KPICard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-800 text-[#0D1B3E]">{value}</p>
      <p className="text-xs font-600 text-[#6B7A99] mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-[#6B7A99] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CohortAnalyticsContent() {
  const [segment, setSegment] = useState<SegmentFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState({ totalSignups: 0, paid: 0, conversionPct: 0, cohortsTracked: 0 });
  const [cohorts, setCohorts] = useState<{ cohort: string; size: number; w0: number }[]>([]);
  const [funnel, setFunnel] = useState<{ name: string; value: number; color: string; pct: number }[]>([]);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cohort-analytics?segment=${segment}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setKpis(json.kpis || { totalSignups: 0, paid: 0, conversionPct: 0, cohortsTracked: 0 });
      setCohorts(json.cohorts || []);
      setFunnel(json.funnel || []);
      setNote(json.note || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [segment]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 fade-in p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-800 text-[#0D1B3E]">Cohort Analytics</h1>
          <p className="text-sm text-[#6B7A99] mt-0.5">Signup cohorts from user_profiles.created_at</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[#6B7A99]" />
          {(['all', 'candidate', 'recruiter', 'institution'] as SegmentFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSegment(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-600 border ${
                segment === s ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'bg-white text-[#6B7A99] border-[#E8ECF4]'
              }`}
            >
              {s}
            </button>
          ))}
          <button onClick={load} className="p-2 border border-[#E8ECF4] rounded-lg"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
      {note && <p className="text-xs text-[#6B7A99] bg-[#F8FAFC] border border-[#E8ECF4] rounded-lg px-3 py-2">{note}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#6B7A99]" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Signups" value={String(kpis.totalSignups)} icon={<Users size={18} className="text-blue-600" />} color="bg-blue-50" />
            <KPICard label="Paid / Upgraded" value={String(kpis.paid)} icon={<TrendingUp size={18} className="text-emerald-600" />} color="bg-emerald-50" />
            <KPICard label="Conversion" value={`${kpis.conversionPct}%`} icon={<TrendingUp size={18} className="text-amber-600" />} color="bg-amber-50" />
            <KPICard label="Cohorts Tracked" value={String(kpis.cohortsTracked)} sub="Last 8 months" icon={<Users size={18} className="text-violet-600" />} color="bg-violet-50" />
          </div>

          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-800 text-[#0D1B3E] mb-4">Signup Cohorts by Month</h2>
            {cohorts.every((c) => c.size === 0) ? (
              <p className="text-sm text-[#6B7A99] text-center py-8">No signup data in the selected window.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={cohorts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                  <XAxis dataKey="cohort" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="size" name="Signups" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-800 text-[#0D1B3E] mb-4">Signup → Paid Funnel</h2>
            <div className="space-y-3">
              {funnel.map((stage) => (
                <div key={stage.name} className="flex items-center gap-4">
                  <span className="text-xs font-600 text-[#6B7A99] w-36">{stage.name}</span>
                  <div className="flex-1 h-7 bg-[#F4F6FA] rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg flex items-center px-3" style={{ width: `${Math.max(8, stage.pct)}%`, backgroundColor: stage.color }}>
                      <span className="text-[11px] font-700 text-white">{stage.value}</span>
                    </div>
                  </div>
                  <span className="text-xs font-700 w-12 text-right">{stage.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
