'use client';
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { trackChartInteraction } from '@/lib/analytics';

interface FunnelStage {
  stage: string;
  count: number;
}

const barColors = ['var(--primary)', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

const CustomTooltip = ({ active, payload, label, total }: any) => {
  if (!active || !payload?.length) return null;
  const pct = total > 0 ? Math.round((payload[0].value / total) * 100) : 0;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-600 text-foreground">{label}</p>
      <p className="text-muted-foreground mt-1">
        <span className="tabular-nums font-600 text-foreground">{payload[0].value}</span> candidates
        <span className="ml-2 text-[12px]">({pct}% of invited)</span>
      </p>
    </div>
  );
};

export default function InterviewFunnelChart() {
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchFunnel = async () => {
      try {
        const { data } = await supabase
          .from('interviews')
          .select('status');

        if (data) {
          const counts: Record<string, number> = {
            scheduled: 0, in_progress: 0, completed: 0, evaluated: 0, archived: 0,
          };
          data.forEach((iv: any) => {
            if (counts[iv.status] !== undefined) counts[iv.status]++;
          });

          const stages: FunnelStage[] = [
            { stage: 'Invited', count: Object.values(counts).reduce((a, b) => a + b, 0) },
            { stage: 'Scheduled', count: counts.scheduled + counts.in_progress + counts.completed + counts.evaluated },
            { stage: 'Completed', count: counts.completed + counts.evaluated },
            { stage: 'Evaluated', count: counts.evaluated },
          ].filter(s => s.count > 0);

          setFunnelData(stages.length > 0 ? stages : [
            { stage: 'Invited', count: 0 },
            { stage: 'Scheduled', count: 0 },
            { stage: 'Completed', count: 0 },
            { stage: 'Evaluated', count: 0 },
          ]);
        }
      } catch (err) {
        console.error('Funnel chart error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFunnel();

    const channel = supabase
      .channel('funnel-chart')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => fetchFunnel())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const total = funnelData[0]?.count || 1;

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="skeleton h-5 w-32 rounded mb-4" />
        <div className="skeleton h-52 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-600 text-foreground">Interview Funnel</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">From interview statuses</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={funnelData}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
          barSize={18}
          onClick={(data) => {
            if (data?.activeLabel) {
              trackChartInteraction('interview_funnel', 'bar_click', { stage: data.activeLabel });
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="stage" tick={{ fontSize: 12, fill: 'var(--foreground)' }} axisLine={false} tickLine={false} width={72} />
          <Tooltip content={<CustomTooltip total={total} />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {funnelData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={barColors[index] ?? 'var(--primary)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}