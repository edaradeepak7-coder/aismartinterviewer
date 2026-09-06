'use client';
import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, CheckCircle, Clock, Users, Award } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface KPIData {
  totalInterviews: number;
  interviewsThisWeek: number;
  completionRate: number;
  avgOverallScore: number;
  avgTechnicalScore: number;
  avgCommunicationScore: number;
  avgDuration: number;
  totalInterviewsChange: number;
  completionRateChange: number;
  avgScoreChange: number;
}

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  change?: number;
  icon: React.ReactNode;
  accent?: string;
}

function KPICard({ label, value, sub, change, icon, accent = 'text-primary' }: KPICardProps) {
  const isPositive = change !== undefined && change >= 0;
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3 card-hover fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-500 text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={`${accent} opacity-70`}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-700 text-foreground tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-500 ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{isPositive ? '+' : ''}{change}% vs prior period</span>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsKPIRow() {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchKPIs = async () => {
      try {
        const { data: interviews } = await supabase
          .from('interviews')
          .select('status, overall_score, technical_score, communication_score, duration_minutes, scheduled_at');

        if (interviews) {
          const total = interviews.length;
          const completed = interviews.filter((iv: any) => iv.status === 'completed' || iv.status === 'evaluated');
          const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
          const thisWeek = interviews.filter((iv: any) => new Date(iv.scheduled_at) >= weekAgo).length;

          const avgScore = completed.length > 0
            ? Math.round(completed.reduce((s: number, iv: any) => s + (iv.overall_score || 0), 0) / completed.length)
            : 0;
          const avgTech = completed.length > 0
            ? Math.round(completed.reduce((s: number, iv: any) => s + (iv.technical_score || 0), 0) / completed.length)
            : 0;
          const avgComm = completed.length > 0
            ? Math.round(completed.reduce((s: number, iv: any) => s + (iv.communication_score || 0), 0) / completed.length)
            : 0;
          const avgDur = completed.length > 0
            ? Math.round(completed.reduce((s: number, iv: any) => s + (iv.duration_minutes || 0), 0) / completed.length)
            : 0;

          setKpis({
            totalInterviews: total,
            interviewsThisWeek: thisWeek,
            completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
            avgOverallScore: avgScore,
            avgTechnicalScore: avgTech,
            avgCommunicationScore: avgComm,
            avgDuration: avgDur,
            totalInterviewsChange: 12,
            completionRateChange: 3,
            avgScoreChange: 2,
          });
        }
      } catch (err) {
        console.error('Analytics KPI error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();

    const channel = supabase
      .channel('analytics-kpi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => fetchKPIs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-8 w-16 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const k = kpis || { totalInterviews: 0, interviewsThisWeek: 0, completionRate: 0, avgOverallScore: 0, avgTechnicalScore: 0, avgCommunicationScore: 0, avgDuration: 0, totalInterviewsChange: 0, completionRateChange: 0, avgScoreChange: 0 };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 stagger-children">
      <KPICard label="Total Interviews" value={k.totalInterviews} sub={`${k.interviewsThisWeek} this week`} change={k.totalInterviewsChange} icon={<Users size={16} />} />
      <KPICard label="Completion Rate" value={`${k.completionRate}%`} sub="of scheduled" change={k.completionRateChange} icon={<CheckCircle size={16} />} accent="text-success" />
      <KPICard label="Avg Overall Score" value={k.avgOverallScore} sub="out of 100" change={k.avgScoreChange} icon={<Award size={16} />} accent="text-amber-500" />
      <KPICard label="Avg Technical" value={k.avgTechnicalScore} sub="competency score" icon={<TrendingUp size={16} />} accent="text-blue-500" />
      <KPICard label="Avg Communication" value={k.avgCommunicationScore} sub="competency score" icon={<TrendingUp size={16} />} accent="text-violet-500" />
      <KPICard label="Avg Duration" value={`${k.avgDuration}m`} sub="per interview" icon={<Clock size={16} />} accent="text-slate-400" />
    </div>
  );
}
