'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { Zap, DollarSign, Activity, RefreshCw, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AIUsagePage() {
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [note, setNote] = useState<string | undefined>();
  const [kpis, setKpis] = useState({ totalCalls: 0, tokensUsed: 0, estimatedCost: 0, tokensIn: 0, tokensOut: 0 });
  const [byProvider, setByProvider] = useState<{ provider: string; calls: number; tokensIn: number; tokensOut: number; cost: number }[]>([]);
  const [daily, setDaily] = useState<{ day: string; calls: number; cost: number }[]>([]);
  const [recent, setRecent] = useState<{ id: string; provider: string; model: string; tokens_in: number; tokens_out: number; cost_usd: number; created_at: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai-usage?period=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setKpis(json.kpis || { totalCalls: 0, tokensUsed: 0, estimatedCost: 0 });
      setByProvider(json.byProvider || []);
      setDaily(json.daily || []);
      setRecent(json.recent || []);
      setEmpty(Boolean(json.empty));
      setNote(json.note);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout role="admin">
      <div className="space-y-6 fade-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">AI Usage Analytics</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">From ai_usage_logs — no interview-based estimates</p>
          </div>
          <div className="flex items-center gap-2">
            {(['7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-600 rounded-lg border ${period === p ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'bg-white text-[#6B7A99] border-[#E8ECF4]'}`}
              >
                {p === '7d' ? 'Last 7 days' : 'Last 30 days'}
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total API Calls', value: kpis.totalCalls.toLocaleString(), icon: <Activity size={18} className="text-teal-600" />, color: 'bg-teal-50' },
                { label: 'Tokens Used', value: kpis.tokensUsed.toLocaleString(), icon: <Zap size={18} className="text-violet-600" />, color: 'bg-violet-50' },
                { label: 'Tokens In / Out', value: `${kpis.tokensIn || 0} / ${kpis.tokensOut || 0}`, icon: <Zap size={18} className="text-blue-600" />, color: 'bg-blue-50' },
                { label: 'Cost (USD)', value: `$${Number(kpis.estimatedCost).toFixed(4)}`, icon: <DollarSign size={18} className="text-amber-600" />, color: 'bg-amber-50' },
              ].map((card) => (
                <div key={card.label} className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${card.color} flex items-center justify-center mb-3`}>{card.icon}</div>
                  <p className="text-2xl font-800 text-[#0D1B3E]">{card.value}</p>
                  <p className="text-xs font-600 text-[#6B7A99] mt-0.5">{card.label}</p>
                </div>
              ))}
            </div>

            {empty ? (
              <p className="text-sm text-[#6B7A99] text-center py-12 bg-white border border-[#E8ECF4] rounded-xl">No AI usage logs in this period.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-800 text-[#0D1B3E] mb-4">Daily Calls</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={daily} barSize={16}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="calls" name="Calls" fill="#0D9488" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-800 text-[#0D1B3E] mb-4">By Provider</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={byProvider} barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                        <XAxis dataKey="provider" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="calls" name="Calls" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#E8ECF4]">
                    <h3 className="text-sm font-800 text-[#0D1B3E]">Recent Usage Logs</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E8ECF4] bg-[#F8FAFC]">
                        <th className="text-left px-5 py-3 text-xs font-600 text-[#6B7A99]">Provider</th>
                        <th className="text-left px-5 py-3 text-xs font-600 text-[#6B7A99]">Model</th>
                        <th className="text-left px-5 py-3 text-xs font-600 text-[#6B7A99]">Tokens</th>
                        <th className="text-left px-5 py-3 text-xs font-600 text-[#6B7A99]">Cost</th>
                        <th className="text-left px-5 py-3 text-xs font-600 text-[#6B7A99]">When</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F6FA]">
                      {recent.map((r) => (
                        <tr key={r.id}>
                          <td className="px-5 py-3 font-600 text-[#0D1B3E] text-xs">{r.provider}</td>
                          <td className="px-5 py-3 text-[#6B7A99] text-xs">{r.model}</td>
                          <td className="px-5 py-3 text-[#6B7A99] text-xs">{r.tokens_in} / {r.tokens_out}</td>
                          <td className="px-5 py-3 text-xs">${Number(r.cost_usd).toFixed(6)}</td>
                          <td className="px-5 py-3 text-[#6B7A99] text-xs">{new Date(r.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
