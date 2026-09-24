'use client';
import React, { useEffect, useState } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { trackChartInteraction } from '@/lib/analytics';
import { createClient } from '@/lib/supabase/client';

interface VolumePoint {
  date: string;
  scheduled: number;
  completed: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-600 text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}</span>
          </div>
          <span className="font-600 text-foreground tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function VolumeChart() {
  const [data, setData] = useState<VolumePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchVolume = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: interviews } = await supabase
          .from('interviews')
          .select('status, scheduled_at, completed_at')
          .gte('scheduled_at', thirtyDaysAgo.toISOString());

        if (interviews) {
          const byDate: Record<string, { scheduled: number; completed: number }> = {};

          interviews.forEach((iv: any) => {
            const dateKey = new Date(iv.scheduled_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            if (!byDate[dateKey]) byDate[dateKey] = { scheduled: 0, completed: 0 };
            byDate[dateKey].scheduled++;
            if (iv.status === 'completed' || iv.status === 'evaluated') {
              byDate[dateKey].completed++;
            }
          });

          const points = Object.entries(byDate)
            .map(([date, counts]) => ({ date, ...counts }))
            .slice(-14);

          setData(points);
        }
      } catch (err) {
        console.error('Volume chart error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVolume();

    const channel = supabase
      .channel('volume-chart')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => fetchVolume())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="skeleton h-5 w-48 rounded mb-4" />
        <div className="skeleton h-52 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-600 text-foreground">Interview Volume Trends</h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block rounded" />Completed</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded" />Scheduled</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} onClick={(d) => { if (d?.activeLabel) trackChartInteraction('volume_trends', 'bar_click', { date: d.activeLabel }); }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval={2} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
          <Bar dataKey="scheduled" fill="var(--border)" radius={[3, 3, 0, 0]} name="scheduled" opacity={0.6} barSize={12} />
          <Bar dataKey="completed" fill="var(--primary)" radius={[3, 3, 0, 0]} name="completed" barSize={12} />
          <Line type="monotone" dataKey="completed" stroke="var(--primary)" strokeWidth={2} dot={false} name="trend" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
