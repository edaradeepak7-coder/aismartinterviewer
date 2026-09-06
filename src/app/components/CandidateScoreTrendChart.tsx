'use client';
import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ScoreTrendPoint {
  date: string;
  overall: number;
  technical: number;
  communication: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-600 text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={`tp-${p.name}`} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-600 text-foreground tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function CandidateScoreTrendChart() {
  const { user } = useAuth();
  const [trendData, setTrendData] = useState<ScoreTrendPoint[]>([]);
  const [latestDelta, setLatestDelta] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const supabase = createClient();

    const fetchTrend = async () => {
      try {
        const { data } = await supabase
          .from('interviews')
          .select('overall_score, technical_score, communication_score, completed_at')
          .eq('status', 'evaluated')
          .order('completed_at', { ascending: true })
          .limit(8);

        if (data && data.length > 0) {
          const points: ScoreTrendPoint[] = data.map((iv: any) => ({
            date: new Date(iv.completed_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
            overall: iv.overall_score || 0,
            technical: iv.technical_score || 0,
            communication: iv.communication_score || 0,
          }));
          setTrendData(points);
          if (points.length >= 2) {
            setLatestDelta(points[points.length - 1].overall - points[points.length - 2].overall);
          }
        }
      } catch (err) {
        console.error('Score trend error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrend();

    const channel = supabase
      .channel('score-trend')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'interviews' }, () => fetchTrend())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="skeleton h-5 w-32 rounded mb-4" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (trendData.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 flex items-center justify-center h-48">
        <p className="text-sm text-muted-foreground">Complete interviews to see your score trend</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-600 text-foreground">Score Trend</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Performance across recent interviews</p>
        </div>
        {latestDelta !== 0 && (
          <span className={`text-[11px] font-500 px-2 py-0.5 rounded-full border ${latestDelta > 0 ? 'bg-success-bg text-success border-success-border' : 'bg-red-50 text-red-600 border-red-200'}`}>
            {latestDelta > 0 ? '+' : ''}{latestDelta} pts last interview
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="gradOverall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradTechnical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--success)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradComm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          <Area type="monotone" dataKey="overall" name="Overall" stroke="var(--primary)" strokeWidth={2} fill="url(#gradOverall)" dot={{ r: 3, fill: 'var(--primary)' }} />
          <Area type="monotone" dataKey="technical" name="Technical" stroke="var(--success)" strokeWidth={2} fill="url(#gradTechnical)" dot={{ r: 3, fill: 'var(--success)' }} />
          <Area type="monotone" dataKey="communication" name="Communication" stroke="var(--accent)" strokeWidth={2} fill="url(#gradComm)" dot={{ r: 3, fill: 'var(--accent)' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}