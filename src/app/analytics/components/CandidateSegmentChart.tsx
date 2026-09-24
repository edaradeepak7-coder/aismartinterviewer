'use client';
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';

interface SegmentData {
  segment: string;
  avgScore: number;
  completionRate: number;
}

const SEGMENTS = ['Junior', 'Mid', 'Senior', 'Lead', 'Staff'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-600 text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-muted-foreground capitalize text-[11px]">{p.name}</span>
          </div>
          <span className="font-600 text-foreground tabular-nums">{p.value}{p.name === 'completion rate' ? '%' : ''}</span>
        </div>
      ))}
    </div>
  );
};

export default function CandidateSegmentChart() {
  const [data, setData] = useState<SegmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchSegments = async () => {
      try {
        const { data: candidates } = await supabase
          .from('candidates')
          .select('experience_level');

        const { data: interviews } = await supabase
          .from('interviews')
          .select('overall_score, status, candidates(experience_level)');

        if (interviews) {
          const segmentMap: Record<string, { scores: number[]; total: number; completed: number }> = {};
          SEGMENTS.forEach(s => { segmentMap[s] = { scores: [], total: 0, completed: 0 }; });

          interviews.forEach((iv: any) => {
            const level = iv.candidates?.experience_level || 'Mid';
            const seg = SEGMENTS.find(s => level.toLowerCase().includes(s.toLowerCase())) || 'Mid';
            if (segmentMap[seg]) {
              segmentMap[seg].total++;
              if (iv.status === 'completed' || iv.status === 'evaluated') {
                segmentMap[seg].completed++;
                if (iv.overall_score) segmentMap[seg].scores.push(iv.overall_score);
              }
            }
          });

          const points = SEGMENTS
            .filter(s => segmentMap[s].total > 0)
            .map(segment => ({
              segment,
              avgScore: segmentMap[segment].scores.length > 0
                ? Math.round(segmentMap[segment].scores.reduce((a, b) => a + b, 0) / segmentMap[segment].scores.length)
                : 0,
              completionRate: segmentMap[segment].total > 0
                ? Math.round((segmentMap[segment].completed / segmentMap[segment].total) * 100)
                : 0,
            }));

          setData(points.length > 0 ? points : SEGMENTS.map(s => ({ segment: s, avgScore: 0, completionRate: 0 })));
        }
      } catch (err) {
        console.error('Segment chart error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSegments();
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
          <h3 className="text-sm font-600 text-foreground">Candidate Segments</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Score and completion rate by experience level</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" />Avg Score</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Completion %</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barCategoryGap="30%" barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="segment" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
          <Bar dataKey="avgScore" name="avg score" fill="var(--primary)" radius={[3, 3, 0, 0]} opacity={0.85} barSize={18} />
          <Bar dataKey="completionRate" name="completion rate" fill="#10b981" radius={[3, 3, 0, 0]} opacity={0.85} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
