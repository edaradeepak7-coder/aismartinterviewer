'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, RefreshCw, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FunnelData { stage: string; value: number; fill: string }
interface CompletionMetric { label: string; value: number; total: number; pct: number; color: string }
interface FeatureAdoption { feature: string; uses: number; pct: number }

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 shadow-sm">
      <p className="text-2xl font-800" style={{ color: color ?? '#0D1B3E' }}>{value}</p>
      <p className="text-xs font-600 text-[#0D1B3E] mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-[#6B7A99] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ConversionFunnelContent() {
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [completionMetrics, setCompletionMetrics] = useState<CompletionMetric[]>([]);
  const [featureAdoption, setFeatureAdoption] = useState<FeatureAdoption[]>([]);
  const [planUpgradeData, setPlanUpgradeData] = useState<{ plan: string; count: number }[]>([]);
  const [kpis, setKpis] = useState({ totalInterviews: 0, completionRate: 0, hireRate: 0, avgScore: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/platform-analytics');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setKpis(json.kpis || { totalInterviews: 0, completionRate: 0, hireRate: 0, avgScore: 0 });
      setFunnelData(json.funnel || []);
      setCompletionMetrics(json.completionMetrics || []);
      setPlanUpgradeData(json.planDistribution || []);
      setFeatureAdoption(json.featureAdoption || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Platform Analytics</h1>
            <p className="text-sm text-[#6B7A99]">Real aggregates from interviews and user profiles</p>
          </div>
        </div>
        <button onClick={fetchMetrics} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-xl hover:bg-[#F4F6FA] bg-white">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#6B7A99]"><Loader2 size={18} className="animate-spin" /> Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Interviews" value={kpis.totalInterviews} sub="All time" color="#0D9488" />
            <MetricCard label="Completion Rate" value={`${kpis.completionRate}%`} sub="Scheduled → Completed" color="#3B82F6" />
            <MetricCard label="Hire Rate" value={`${kpis.hireRate}%`} sub="Completed → Hired" color="#10B981" />
            <MetricCard label="Avg Score" value={kpis.avgScore || '—'} sub="Across completed interviews" color="#F59E0B" />
          </div>

          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-800 text-[#0D1B3E] mb-5">Recruiter Conversion Funnel</h2>
            {funnelData.length === 0 ? (
              <p className="text-sm text-[#6B7A99] text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {funnelData.map((stage, i) => {
                  const maxVal = funnelData[0]?.value || 1;
                  const pct = maxVal > 0 ? Math.round((stage.value / maxVal) * 100) : 0;
                  const dropPct = i > 0 && funnelData[i - 1].value > 0
                    ? Math.round(((funnelData[i - 1].value - stage.value) / funnelData[i - 1].value) * 100)
                    : null;
                  return (
                    <div key={stage.stage} className="flex items-center gap-4">
                      <span className="text-xs font-600 text-[#6B7A99] w-36 shrink-0">{stage.stage}</span>
                      <div className="flex-1 h-7 bg-[#F4F6FA] rounded-lg overflow-hidden">
                        <div className="h-full rounded-lg flex items-center px-3" style={{ width: `${Math.max(8, pct)}%`, backgroundColor: stage.fill }}>
                          <span className="text-[11px] font-700 text-white">{stage.value}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-24 justify-end shrink-0">
                        <span className="text-xs font-700 text-[#0D1B3E]">{pct}%</span>
                        {dropPct !== null && <span className="text-[10px] text-red-400 font-600">-{dropPct}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-800 text-[#0D1B3E] mb-4">Interview Completion Rates</h2>
              <div className="space-y-4">
                {completionMetrics.map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-600 text-[#0D1B3E]">{m.label}</span>
                      <span className="text-xs font-700" style={{ color: m.color }}>{m.pct}%</span>
                    </div>
                    <div className="h-2.5 bg-[#F4F6FA] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
                    </div>
                    <p className="text-[10px] text-[#6B7A99] mt-1">{m.value} of {m.total}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-800 text-[#0D1B3E] mb-4">Plan Distribution</h2>
              {planUpgradeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={planUpgradeData} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                    <XAxis dataKey="plan" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Users" radius={[4, 4, 0, 0]} fill="#0D9488" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-[#6B7A99]">No plan data yet</div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-800 text-[#0D1B3E] mb-4">Feature Adoption</h2>
            {featureAdoption.length > 0 ? (
              <div className="space-y-3">
                {featureAdoption.map((f) => (
                  <div key={f.feature} className="flex items-center gap-4">
                    <span className="text-xs font-600 text-[#0D1B3E] w-48 shrink-0 truncate">{f.feature}</span>
                    <div className="flex-1 h-5 bg-[#F4F6FA] rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg flex items-center px-2 bg-[#0D9488]" style={{ width: `${Math.max(4, f.pct)}%` }}>
                        <span className="text-[10px] font-700 text-white">{f.uses}</span>
                      </div>
                    </div>
                    <span className="text-xs font-700 text-[#0D1B3E] w-10 text-right">{f.pct}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6B7A99] text-center py-8">No feature adoption events recorded yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
