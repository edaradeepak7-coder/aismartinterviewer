'use client';
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { createClient } from '@/lib/supabase/client';

interface CompetencyData {
  competency: string;
  avgScore: number;
  candidateCount: number;
}

const getColor = (score: number) => {
  if (score >= 80) return '#22c55e';
  if (score >= 70) return 'var(--primary)';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
};

const COMPETENCY_FIELDS = [
  { key: 'technical_score', label: 'Technical Skills' },
  { key: 'communication_score', label: 'Communication' },
  { key: 'role_alignment_score', label: 'Role Alignment' },
  { key: 'overall_score', label: 'Overall Performance' },
];

export default function CompetencyBreakdownChart() {
  const [data, setData] = useState<CompetencyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchCompetency = async () => {
      try {
        const { data: interviews } = await supabase
          .from('interviews')
          .select('technical_score, communication_score, role_alignment_score, overall_score')
          .eq('status', 'evaluated')
          .not('overall_score', 'is', null);

        if (interviews && interviews.length > 0) {
          const competencies: CompetencyData[] = COMPETENCY_FIELDS.map(({ key, label }) => {
            const valid = interviews.filter((iv: any) => iv[key] != null);
            const avg = valid.length > 0
              ? Math.round(valid.reduce((s: number, iv: any) => s + (iv[key] || 0), 0) / valid.length)
              : 0;
            return { competency: label, avgScore: avg, candidateCount: valid.length };
          });
          setData(competencies);
        } else {
          setData(COMPETENCY_FIELDS.map(({ label }) => ({ competency: label, avgScore: 0, candidateCount: 0 })));
        }
      } catch (err) {
        console.error('Competency breakdown error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetency();

    const channel = supabase
      .channel('competency-breakdown')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => fetchCompetency())
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
          <h3 className="text-sm font-600 text-foreground">Competency Breakdown</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Average score per competency area</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          <span>Avg score</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barSize={16}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="competency" tick={{ fontSize: 11, fill: 'var(--foreground)' }} axisLine={false} tickLine={false} width={130} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const entry = data.find(d => d.competency === label);
              return (
                <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-600 text-foreground">{label}</p>
                  <p className="text-muted-foreground mt-1">Avg score: <span className="font-600 text-foreground tabular-nums">{payload[0].value}</span></p>
                  {entry && <p className="text-muted-foreground mt-0.5">Assessed in: <span className="font-600 text-foreground">{entry.candidateCount}</span> interviews</p>}
                </div>
              );
            }}
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          />
          <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={`comp-cell-${entry.competency}`} fill={getColor(entry.avgScore)} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
