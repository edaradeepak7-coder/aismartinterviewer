'use client';
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { trackChartInteraction } from '@/lib/analytics';

interface ScoreBucket {
  range: string;
  count: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-600 text-foreground">Score range: {label}</p>
      <p className="text-muted-foreground mt-1">
        <span className="tabular-nums font-600 text-foreground">{payload[0].value}</span> candidates
      </p>
    </div>
  );
};

const BUCKETS = ['0–30', '31–50', '51–60', '61–70', '71–80', '81–90', '91–100'];

export default function ScoreDistributionChart() {
  const [data, setData] = useState<ScoreBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [peakRange, setPeakRange] = useState('71–80');

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
            if (score <= 30) buckets['0–30']++;
            else if (score <= 50) buckets['31–50']++;
            else if (score <= 60) buckets['51–60']++;
            else if (score <= 70) buckets['61–70']++;
            else if (score <= 80) buckets['71–80']++;
            else if (score <= 90) buckets['81–90']++;
            else buckets['91–100']++;
          });

          const points = BUCKETS.map(range => ({ range, count: buckets[range] }));
          setData(points);

          const peak = points.reduce((max, p) => p.count > max.count ? p : max, points[0]);
          if (peak) setPeakRange(peak.range);
        }
      } catch (err) {
        console.error('Score distribution error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDistribution();

    const channel = supabase
      .channel('score-dist')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => fetchDistribution())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="skeleton h-5 w-40 rounded mb-4" />
        <div className="skeleton h-52 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-600 text-foreground">Score Distribution</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          <span>Candidates</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
          barSize={24}
          onClick={(data) => {
            if (data?.activeLabel) {
              trackChartInteraction('score_distribution', 'bar_click', { range: data.activeLabel });
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
          {data.some(d => d.count > 0) && (
            <ReferenceLine x={peakRange} stroke="var(--success)" strokeDasharray="4 2" label={{ value: 'Peak', position: 'top', fontSize: 10, fill: 'var(--success)' }} />
          )}
          <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}