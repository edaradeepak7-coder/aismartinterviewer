'use client';
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { trackChartInteraction } from '@/lib/analytics';
import { createClient } from '@/lib/supabase/client';

interface RatePoint {
  week: string;
  rate: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-600 text-foreground">{label}</p>
      <p className="text-muted-foreground mt-1">
        Completion rate: <span className="font-600 text-foreground tabular-nums">{payload[0].value}%</span>
      </p>
    </div>
  );
};

export default function CompletionRateChart() {
  const [data, setData] = useState<RatePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchRates = async () => {
      try {
        const { data: interviews } = await supabase
          .from('interviews')
          .select('status, scheduled_at')
          .order('scheduled_at', { ascending: true });

        if (interviews) {
          const byWeek: Record<string, { total: number; completed: number }> = {};

          interviews.forEach((iv: any) => {
            const d = new Date(iv.scheduled_at);
            const weekNum = Math.ceil(d.getDate() / 7);
            const key = `${d.toLocaleDateString('en-IN', { month: 'short' })} W${weekNum}`;
            if (!byWeek[key]) byWeek[key] = { total: 0, completed: 0 };
            byWeek[key].total++;
            if (iv.status === 'completed' || iv.status === 'evaluated') byWeek[key].completed++;
          });

          const points = Object.entries(byWeek)
            .map(([week, vals]) => ({
              week,
              rate: vals.total > 0 ? Math.round((vals.completed / vals.total) * 100) : 0,
            }))
            .slice(-8);

          setData(points);
        }
      } catch (err) {
        console.error('Completion rate error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();

    const channel = supabase
      .channel('completion-rate')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => fetchRates())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="skeleton h-5 w-40 rounded mb-4" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-600 text-foreground">Completion Rate</h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-success inline-block rounded" />Actual</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t border-dashed border-muted-foreground inline-block" />Target</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} onClick={(d) => { if (d?.activeLabel) trackChartInteraction('completion_rate', 'point_click', { week: d.activeLabel }); }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={80} stroke="var(--muted-foreground)" strokeDasharray="4 3" label={{ value: '80% target', position: 'insideTopRight', fontSize: 10, fill: 'var(--muted-foreground)' }} />
          <Line type="monotone" dataKey="rate" stroke="var(--success)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--success)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
