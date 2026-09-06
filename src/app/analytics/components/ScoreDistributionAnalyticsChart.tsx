'use client';
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { trackChartInteraction } from '@/lib/analytics';

interface ScoreBucket {
  range: string;
  count: number;
}

const BUCKETS = ['0–20', '21–40', '41–60', '61–70', '71–80', '81–90', '91–100'];

const getBarColor = (range: string) => {
  if (range.startsWith('0') || range.startsWith('21')) return '#ef4444';
  if (range.startsWith('41') || range.startsWith('61')) return '#f59e0b';
  if (range.startsWith('71') || range.startsWith('81')) return 'var(--primary)';
  return '#10b981';
};

export default function ScoreDistributionAnalyticsChart() {
  const [data, setData] = useState<ScoreBucket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchDistribution = async () => {
      try {
        const { data: interviews } = await supabase
          .from('interviews')
          .select('overall_score')
          .not('overall_score', 'is', null);

        if (interviews) {
          const buckets: Record<string, number> = {};
          BUCKETS.forEach(b => { buckets[b] = 0; });

          interviews.forEach((iv: any) => {
            const score = iv.overall_score;
            if (score <= 20) buckets['0–20']++;
            else if (score <= 40) buckets['21–40']++;
            else if (score <= 60) buckets['41–60']++;
            else if (score <= 70) buckets['61–70']++;
            else if (score <= 80) buckets['71–80']++;
            else if (score <= 90) buckets['81–90']++;
            else buckets['91–100']++;
          });

          const points = BUCKETS.map(range => ({ range, count: buckets[range] }));
          setData(points);
          setTotal(interviews.length);
        }
      } catch (err) {
        console.error('Score distribution analytics error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDistribution();

    const channel = supabase
      .channel('score-dist-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => fetchDistribution())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="skeleton h-5 w-48 rounded mb-4" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-600 text-foreground">Score Distribution</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Overall score spread across all candidates</p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />Low</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />Mid</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" />High</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barSize={26} onClick={(d) => { if (d?.activeLabel) trackChartInteraction('score_distribution_analytics', 'bar_click', { range: d.activeLabel }); }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const pct = total > 0 ? Math.round(((payload[0].value as number) / total) * 100) : 0;
              return (
                <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-600 text-foreground">Score {label}</p>
                  <p className="text-muted-foreground mt-1">
                    <span className="font-600 text-foreground tabular-nums">{payload[0].value}</span> candidates
                    <span className="ml-2 text-[11px]">({pct}%)</span>
                  </p>
                </div>
              );
            }}
            cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={`score-cell-${entry.range}`} fill={getBarColor(entry.range)} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
